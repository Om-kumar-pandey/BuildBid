package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 8
 * Customer Account Deactivation and Permanent Deletion DTOs.
 */
public class CustomerAccountDeletionDto {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DeactivateAccountRequest(
            String currentPassword,
            String confirmation
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record InitiateDeletionRequest(
            String currentPassword,
            String confirmation
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VerifyDeletionOtpRequest(
            String otp
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ConfirmDeletionRequest(
            String deletionTicket,
            String confirmation
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AccountDeletionStatusResponse(
            String email,
            boolean emailVerified,
            String phone,
            boolean phoneVerified,
            boolean canDeactivate,
            boolean canDelete,
            String verificationRequiredMessage
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DeletionInitiationResponse(
            String message,
            long cooldownSeconds,
            int expiryMinutes,
            String maskedEmail,
            String maskedPhone
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DeletionOtpVerificationResponse(
            String message,
            String deletionTicket,
            int validityMinutes
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record OperationResponse(
            String message,
            boolean success,
            boolean sessionsInvalidated
    ) {}
}
