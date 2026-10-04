package com.marketplace.backend;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_verifications", indexes = {
        @Index(name = "idx_user_verif_user_type", columnList = "user_id, verification_type"),
        @Index(name = "idx_user_verif_target", columnList = "target_value, verification_type")
})
public class UserVerification {

    public enum VerificationType {
        EMAIL_VERIFICATION,
        PHONE_VERIFICATION,
        EMAIL_CHANGE,
        PHONE_CHANGE,
        PERMANENT_ACCOUNT_DELETION
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_type", nullable = false, length = 30)
    private VerificationType verificationType;

    @Column(name = "target_value", nullable = false, length = 150)
    private String targetValue;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "expiry_time", nullable = false)
    private LocalDateTime expiryTime;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "resend_available_at", nullable = false)
    private LocalDateTime resendAvailableAt;

    @Column(name = "is_used", nullable = false)
    private boolean used = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public UserVerification() {}

    public UserVerification(
            Long userId,
            VerificationType verificationType,
            String targetValue,
            String otpHash,
            LocalDateTime expiryTime,
            LocalDateTime resendAvailableAt
    ) {
        this.userId = userId;
        this.verificationType = verificationType;
        this.targetValue = targetValue;
        this.otpHash = otpHash;
        this.expiryTime = expiryTime;
        this.resendAvailableAt = resendAvailableAt;
        this.attemptCount = 0;
        this.used = false;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiryTime);
    }

    public boolean isMaxAttemptsReached() {
        return this.attemptCount >= 5;
    }

    public boolean canResend() {
        return LocalDateTime.now().isAfter(this.resendAvailableAt);
    }

    public long getRemainingCooldownSeconds() {
        if (canResend()) {
            return 0;
        }
        return Math.max(0, java.time.Duration.between(LocalDateTime.now(), this.resendAvailableAt).getSeconds());
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public VerificationType getVerificationType() { return verificationType; }
    public void setVerificationType(VerificationType verificationType) { this.verificationType = verificationType; }

    public String getTargetValue() { return targetValue; }
    public void setTargetValue(String targetValue) { this.targetValue = targetValue; }

    public String getOtpHash() { return otpHash; }
    public void setOtpHash(String otpHash) { this.otpHash = otpHash; }

    public LocalDateTime getExpiryTime() { return expiryTime; }
    public void setExpiryTime(LocalDateTime expiryTime) { this.expiryTime = expiryTime; }

    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }

    public LocalDateTime getResendAvailableAt() { return resendAvailableAt; }
    public void setResendAvailableAt(LocalDateTime resendAvailableAt) { this.resendAvailableAt = resendAvailableAt; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
