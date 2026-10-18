package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executor;

/**
 * BUILDBID DURABLE OUTBOX DISPATCHER & RECOVERY POLLER
 *
 * Implements bounded asynchronous dispatch and scheduled recovery for the transactional email outbox:
 * 1. Fast-Path: Submits newly committed outbox events immediately to the background executor.
 * 2. Background Poller: Periodically scans for QUEUED events and recovers expired PROCESSING leases.
 * 3. Mutual Exclusion: Uses atomic conditional database updates to ensure only one worker claims an event.
 * 4. Stale-Worker Protection: Uses conditional updates on lease_owner to ensure expired workers cannot
 *    overwrite newer terminal states.
 * 5. Pre-Dispatch Verification: Validates that the underlying OTP record has not expired or been superseded.
 * 6. Provider Isolation: Performs all external email-provider network calls OUTSIDE database transactions.
 * 7. Terminal Sanitization: Automatically clears encrypted_otp payload when delivery reaches terminal state.
 *
 * AT-LEAST-ONCE PROCESSING NOTICE:
 * This dispatcher guarantees at-least-once delivery. In rare situations where an email provider accepts
 * a message, but the worker process crashes before committing the SENT status to the database, the lease
 * will eventually expire and a subsequent worker may re-dispatch the email.
 */
@Service
public class EmailOutboxDispatcher {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxDispatcher.class);

    private final EmailOutboxRepository outboxRepository;
    private final UserVerificationRepository verificationRepository;
    private final EmailService emailService;
    private final OutboxEncryptionService encryptionService;
    private final Executor taskExecutor;

    private final String workerId;
    private final int leaseDurationSeconds;
    private final int batchSize;

    @Autowired
    public EmailOutboxDispatcher(
            EmailOutboxRepository outboxRepository,
            UserVerificationRepository verificationRepository,
            EmailService emailService,
            OutboxEncryptionService encryptionService,
            @Qualifier("outboxTaskExecutor") Executor taskExecutor,
            @Value("${app.outbox.lease-duration-seconds:60}") int leaseDurationSeconds,
            @Value("${app.outbox.batch-size:20}") int batchSize
    ) {
        this.outboxRepository = outboxRepository;
        this.verificationRepository = verificationRepository;
        this.emailService = emailService;
        this.encryptionService = encryptionService;
        this.taskExecutor = taskExecutor;
        this.leaseDurationSeconds = Math.max(15, leaseDurationSeconds);
        this.batchSize = Math.max(1, batchSize);
        this.workerId = "worker-" + UUID.randomUUID().toString().substring(0, 8);
        log.info("[EmailOutboxDispatcher] Initialized workerId={} (leaseDuration={}s, batchSize={})",
                this.workerId, this.leaseDurationSeconds, this.batchSize);
    }

    public String getWorkerId() {
        return workerId;
    }

    /**
     * Trigger fast-path background execution for a newly committed event.
     */
    public void triggerFastPath(String eventId) {
        if (eventId == null || eventId.isBlank()) return;
        taskExecutor.execute(() -> {
            try {
                Optional<EmailOutbox> outboxOpt = outboxRepository.findByEventId(eventId);
                if (outboxOpt.isPresent()) {
                    EmailOutbox outbox = outboxOpt.get();
                    if (outbox.getStatus() == OutboxStatus.QUEUED) {
                        processEvent(outbox.getId());
                    }
                }
            } catch (Exception ex) {
                log.warn("[EmailOutboxDispatcher] Fast-path delivery attempt for eventId={} caught: {}. Scheduled poller will handle.",
                        eventId, ex.getMessage());
            }
        });
    }

    /**
     * Scheduled poller: scans for claimable events (QUEUED and expired PROCESSING leases) and dispatches them.
     */
    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:5000}", initialDelay = 3000)
    public void pollAndDispatch() {
        try {
            dispatchPendingEvents();
        } catch (Exception ex) {
            log.error("[EmailOutboxDispatcher] Error during scheduled outbox polling: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Finds claimable events and processes them. Returns the number of events processed.
     */
    public int dispatchPendingEvents() {
        LocalDateTime now = LocalDateTime.now();
        List<EmailOutbox> claimable = outboxRepository.findClaimableEvents(now, PageRequest.of(0, batchSize));
        if (claimable.isEmpty()) {
            return 0;
        }

        int processed = 0;
        for (EmailOutbox item : claimable) {
            boolean handled = processEvent(item.getId());
            if (handled) {
                processed++;
            }
        }
        return processed;
    }

    /**
     * Attempts to claim and deliver a specific outbox event.
     * The network provider call is strictly performed OUTSIDE any open database transaction.
     */
    public boolean processEvent(Long outboxId) {
        if (outboxId == null) return false;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime leaseExpiresAt = now.plusSeconds(leaseDurationSeconds);

        // 1. Atomic claim: transition to PROCESSING with workerId and lease expiration
        int claimed = outboxRepository.claimEvent(outboxId, workerId, leaseExpiresAt, now);
        if (claimed != 1) {
            // Event was claimed by another worker or is no longer in a claimable state
            return false;
        }

        // 2. Reload entity
        EmailOutbox outbox = outboxRepository.findById(outboxId).orElse(null);
        if (outbox == null) {
            return false;
        }

        // 3. Pre-dispatch validation: check underlying UserVerification state
        if (outbox.getVerificationId() != null) {
            Optional<UserVerification> uvOpt = verificationRepository.findById(outbox.getVerificationId());
            if (uvOpt.isPresent()) {
                UserVerification uv = uvOpt.get();
                if (uv.isUsed()) {
                    log.info("[EmailOutboxDispatcher] Verification #{} is already used; cancelling outbox event {}",
                            uv.getId(), outbox.getEventId());
                    outboxRepository.markTerminalByWorker(
                            outboxId, workerId, OutboxStatus.SUPERSEDED,
                            "Verification code was already used or superseded.", now);
                    return false;
                }
                if (uv.isExpired()) {
                    log.info("[EmailOutboxDispatcher] Verification #{} expired; cancelling outbox event {}",
                            uv.getId(), outbox.getEventId());
                    outboxRepository.markTerminalByWorker(
                            outboxId, workerId, OutboxStatus.EXPIRED,
                            "Verification code expired before dispatch.", now);
                    return false;
                }
            }
        }

        // 4. Decrypt payload
        String plainOtp;
        try {
            plainOtp = encryptionService.decrypt(
                    outbox.getEncryptedOtp(),
                    outbox.getEventId(),
                    outbox.getUserId(),
                    outbox.getEncryptionKeyVersion()
            );
        } catch (Exception e) {
            log.error("[EmailOutboxDispatcher] Decryption failed for outbox event {}: {}", outbox.getEventId(), e.getMessage());
            outboxRepository.markFailedPermanent(
                    outboxId, workerId, outbox.getAttemptCount() + 1,
                    "Decryption error: " + sanitizeError(e.getMessage()), now);
            return false;
        }

        // 5. External Email Provider Call (OUTSIDE database transactions)
        boolean deliverySuccess = false;
        String errorMessage = null;
        boolean isPermanentFailure = false;

        try {
            deliverySuccess = emailService.sendVerificationOtpEmail(
                    outbox.getRecipientEmail(),
                    outbox.getRecipientName(),
                    plainOtp,
                    outbox.getSubject()
            );
            if (!deliverySuccess) {
                errorMessage = "Email provider reported delivery failure or rejection.";
            }
        } catch (IllegalArgumentException ex) {
            isPermanentFailure = true;
            errorMessage = "Permanent rejection: " + ex.getMessage();
            log.warn("[EmailOutboxDispatcher] Permanent failure dispatching event {}: {}", outbox.getEventId(), ex.getMessage());
        } catch (Exception ex) {
            errorMessage = "Transport error: " + ex.getMessage();
            log.warn("[EmailOutboxDispatcher] Transient error dispatching event {}: {}", outbox.getEventId(), ex.getMessage());
        }

        LocalDateTime completionTime = LocalDateTime.now();

        // 6. Conditional completion update (protects against stale lease expiration race)
        if (deliverySuccess) {
            int updated = outboxRepository.markSentSuccess(outboxId, workerId, completionTime, null, completionTime);
            if (updated == 0) {
                log.warn("[EmailOutboxDispatcher] Worker {} lease expired for event {} before success could be committed.",
                        workerId, outbox.getEventId());
            } else {
                log.info("[EmailOutboxDispatcher] Event {} successfully delivered to {}",
                        outbox.getEventId(), maskEmail(outbox.getRecipientEmail()));
            }
            return true;
        } else {
            int newAttempts = outbox.getAttemptCount() + 1;
            if (isPermanentFailure || newAttempts >= outbox.getMaxAttempts()) {
                outboxRepository.markFailedPermanent(
                        outboxId, workerId, newAttempts, sanitizeError(errorMessage), completionTime);
                log.warn("[EmailOutboxDispatcher] Event {} marked FAILED_PERMANENT after {} attempts: {}",
                        outbox.getEventId(), newAttempts, errorMessage);
            } else {
                long backoffSeconds = calculateBackoffSeconds(newAttempts);
                LocalDateTime nextAttemptAt = completionTime.plusSeconds(backoffSeconds);
                outboxRepository.markRetry(
                        outboxId, workerId, newAttempts, nextAttemptAt, sanitizeError(errorMessage), completionTime);
                log.info("[EmailOutboxDispatcher] Event {} scheduled for retry #{} at {}",
                        outbox.getEventId(), newAttempts, nextAttemptAt);
            }
            return false;
        }
    }

    public static long calculateBackoffSeconds(int attemptCount) {
        // Exponential backoff: attempt 1 -> 30s, attempt 2 -> 60s, attempt 3 -> 120s, max 300s
        long base = 30L;
        long multiplier = 1L << Math.min(attemptCount - 1, 4);
        return Math.min(base * multiplier, 300L);
    }

    private String sanitizeError(String rawError) {
        if (rawError == null) return null;
        String safe = rawError.replaceAll("(?i)(key|token|secret|password|otp)=[A-Za-z0-9+/=_-]+", "$1=***");
        if (safe.length() > 500) {
            safe = safe.substring(0, 500) + "...";
        }
        return safe;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String name = parts[0];
        if (name.length() <= 2) return "**@" + parts[1];
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + parts[1];
    }
}
