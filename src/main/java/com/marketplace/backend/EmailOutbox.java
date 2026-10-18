package com.marketplace.backend;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * BUILDBID SECURE TRANSACTIONAL EMAIL OUTBOX ENTITY
 *
 * Persisted atomically alongside domain entities (e.g. UserVerification) in the same database
 * transaction. Guarantees durable recording of pending email dispatches before any external
 * network call to an email provider is attempted.
 */
@Entity
@Table(name = "email_outbox", indexes = {
        @Index(name = "idx_email_outbox_poll", columnList = "status, next_attempt_at, lease_expires_at"),
        @Index(name = "idx_email_outbox_user_status", columnList = "user_id, status"),
        @Index(name = "idx_email_outbox_recipient", columnList = "recipient_email")
})
public class EmailOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, length = 64, unique = true)
    private String eventId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "verification_id")
    private Long verificationId;

    @Column(name = "recipient_email", nullable = false, length = 150)
    private String recipientEmail;

    @Column(name = "recipient_name", length = 150)
    private String recipientName;

    @Column(name = "subject", nullable = false, length = 255)
    private String subject;

    @Column(name = "template_type", nullable = false, length = 50)
    private String templateType;

    @Column(name = "encrypted_otp", columnDefinition = "TEXT")
    private String encryptedOtp;

    @Column(name = "encryption_key_version", nullable = false)
    private int encryptionKeyVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OutboxStatus status = OutboxStatus.QUEUED;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts = 3;

    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt;

    @Column(name = "lease_owner", length = 100)
    private String leaseOwner;

    @Column(name = "lease_expires_at")
    private LocalDateTime leaseExpiresAt;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "provider_message_id", length = 150)
    private String providerMessageId;

    @Column(name = "payload_cleared_at")
    private LocalDateTime payloadClearedAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.nextAttemptAt == null) {
            this.nextAttemptAt = now;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public EmailOutbox() {}

    public EmailOutbox(
            String eventId,
            Long userId,
            Long verificationId,
            String recipientEmail,
            String recipientName,
            String subject,
            String templateType,
            String encryptedOtp,
            int encryptionKeyVersion,
            int maxAttempts
    ) {
        this.eventId = eventId;
        this.userId = userId;
        this.verificationId = verificationId;
        this.recipientEmail = recipientEmail;
        this.recipientName = recipientName;
        this.subject = subject;
        this.templateType = templateType;
        this.encryptedOtp = encryptedOtp;
        this.encryptionKeyVersion = encryptionKeyVersion;
        this.status = OutboxStatus.QUEUED;
        this.attemptCount = 0;
        this.maxAttempts = maxAttempts > 0 ? maxAttempts : 3;
        LocalDateTime now = LocalDateTime.now();
        this.nextAttemptAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void clearPayload() {
        this.encryptedOtp = null;
        this.payloadClearedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getVerificationId() { return verificationId; }
    public void setVerificationId(Long verificationId) { this.verificationId = verificationId; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getTemplateType() { return templateType; }
    public void setTemplateType(String templateType) { this.templateType = templateType; }

    public String getEncryptedOtp() { return encryptedOtp; }
    public void setEncryptedOtp(String encryptedOtp) { this.encryptedOtp = encryptedOtp; }

    public int getEncryptionKeyVersion() { return encryptionKeyVersion; }
    public void setEncryptionKeyVersion(int encryptionKeyVersion) { this.encryptionKeyVersion = encryptionKeyVersion; }

    public OutboxStatus getStatus() { return status; }
    public void setStatus(OutboxStatus status) { this.status = status; }

    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }

    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }

    public LocalDateTime getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(LocalDateTime nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; }

    public String getLeaseOwner() { return leaseOwner; }
    public void setLeaseOwner(String leaseOwner) { this.leaseOwner = leaseOwner; }

    public LocalDateTime getLeaseExpiresAt() { return leaseExpiresAt; }
    public void setLeaseExpiresAt(LocalDateTime leaseExpiresAt) { this.leaseExpiresAt = leaseExpiresAt; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public String getProviderMessageId() { return providerMessageId; }
    public void setProviderMessageId(String providerMessageId) { this.providerMessageId = providerMessageId; }

    public LocalDateTime getPayloadClearedAt() { return payloadClearedAt; }
    public void setPayloadClearedAt(LocalDateTime payloadClearedAt) { this.payloadClearedAt = payloadClearedAt; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
