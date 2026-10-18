package com.marketplace.backend;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {

    Optional<EmailOutbox> findByEventId(String eventId);

    List<EmailOutbox> findByUserIdAndStatus(Long userId, OutboxStatus status);

    List<EmailOutbox> findByUserIdAndTemplateTypeAndStatusIn(Long userId, String templateType, Collection<OutboxStatus> statuses);

    /**
     * Query claimable events: either QUEUED and ready for attempt, or PROCESSING whose lease has expired.
     */
    @Query("SELECT o FROM EmailOutbox o WHERE (o.status = com.marketplace.backend.OutboxStatus.QUEUED AND o.nextAttemptAt <= :now) " +
           "OR (o.status = com.marketplace.backend.OutboxStatus.PROCESSING AND o.leaseExpiresAt < :now) " +
           "ORDER BY o.createdAt ASC")
    List<EmailOutbox> findClaimableEvents(@Param("now") LocalDateTime now, Pageable pageable);

    /**
     * Atomic conditional worker claim. Guarantees that only one worker succeeds in transitioning
     * an event to PROCESSING state, recovering crashed worker leases if expired.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailOutbox o SET o.status = com.marketplace.backend.OutboxStatus.PROCESSING, " +
           "o.leaseOwner = :workerId, o.leaseExpiresAt = :leaseExpiresAt, o.updatedAt = :now " +
           "WHERE o.id = :id AND (o.status = com.marketplace.backend.OutboxStatus.QUEUED " +
           "OR (o.status = com.marketplace.backend.OutboxStatus.PROCESSING AND o.leaseExpiresAt < :now))")
    int claimEvent(
            @Param("id") Long id,
            @Param("workerId") String workerId,
            @Param("leaseExpiresAt") LocalDateTime leaseExpiresAt,
            @Param("now") LocalDateTime now
    );

    /**
     * Conditional status update on delivery success. Ensures a stale worker whose lease expired
     * cannot overwrite newer state. Clears payload immediately.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailOutbox o SET o.status = com.marketplace.backend.OutboxStatus.SENT, " +
           "o.sentAt = :sentAt, o.providerMessageId = :providerMessageId, " +
           "o.encryptedOtp = null, o.payloadClearedAt = :now, " +
           "o.leaseOwner = null, o.leaseExpiresAt = null, o.updatedAt = :now " +
           "WHERE o.id = :id AND o.status = com.marketplace.backend.OutboxStatus.PROCESSING AND o.leaseOwner = :workerId")
    int markSentSuccess(
            @Param("id") Long id,
            @Param("workerId") String workerId,
            @Param("sentAt") LocalDateTime sentAt,
            @Param("providerMessageId") String providerMessageId,
            @Param("now") LocalDateTime now
    );

    /**
     * Conditional status update on retryable delivery failure. Schedules next retry with backoff.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailOutbox o SET o.status = com.marketplace.backend.OutboxStatus.QUEUED, " +
           "o.attemptCount = :attemptCount, o.nextAttemptAt = :nextAttemptAt, " +
           "o.lastError = :lastError, o.leaseOwner = null, o.leaseExpiresAt = null, o.updatedAt = :now " +
           "WHERE o.id = :id AND o.status = com.marketplace.backend.OutboxStatus.PROCESSING AND o.leaseOwner = :workerId")
    int markRetry(
            @Param("id") Long id,
            @Param("workerId") String workerId,
            @Param("attemptCount") int attemptCount,
            @Param("nextAttemptAt") LocalDateTime nextAttemptAt,
            @Param("lastError") String lastError,
            @Param("now") LocalDateTime now
    );

    /**
     * Conditional status update on terminal failure (max attempts or non-retryable rejection). Clears payload.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailOutbox o SET o.status = com.marketplace.backend.OutboxStatus.FAILED_PERMANENT, " +
           "o.attemptCount = :attemptCount, o.lastError = :lastError, " +
           "o.encryptedOtp = null, o.payloadClearedAt = :now, " +
           "o.leaseOwner = null, o.leaseExpiresAt = null, o.updatedAt = :now " +
           "WHERE o.id = :id AND o.status = com.marketplace.backend.OutboxStatus.PROCESSING AND o.leaseOwner = :workerId")
    int markFailedPermanent(
            @Param("id") Long id,
            @Param("workerId") String workerId,
            @Param("attemptCount") int attemptCount,
            @Param("lastError") String lastError,
            @Param("now") LocalDateTime now
    );

    /**
     * Transition event to terminal state (e.g. SUPERSEDED or EXPIRED) by the lease owner. Clears payload.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailOutbox o SET o.status = :terminalStatus, " +
           "o.encryptedOtp = null, o.payloadClearedAt = :now, " +
           "o.lastError = :reason, o.leaseOwner = null, o.leaseExpiresAt = null, o.updatedAt = :now " +
           "WHERE o.id = :id AND o.status = com.marketplace.backend.OutboxStatus.PROCESSING AND o.leaseOwner = :workerId")
    int markTerminalByWorker(
            @Param("id") Long id,
            @Param("workerId") String workerId,
            @Param("terminalStatus") OutboxStatus terminalStatus,
            @Param("reason") String reason,
            @Param("now") LocalDateTime now
    );

    /**
     * Atomically supersede pending outbox events for a user and template type, clearing payload immediately.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailOutbox o SET o.status = com.marketplace.backend.OutboxStatus.SUPERSEDED, " +
           "o.encryptedOtp = null, o.payloadClearedAt = :now, " +
           "o.leaseOwner = null, o.leaseExpiresAt = null, o.updatedAt = :now " +
           "WHERE o.userId = :userId AND o.templateType = :templateType AND o.status IN (:activeStatuses)")
    int supersedeActiveEvents(
            @Param("userId") Long userId,
            @Param("templateType") String templateType,
            @Param("activeStatuses") Collection<OutboxStatus> activeStatuses,
            @Param("now") LocalDateTime now
    );
}
