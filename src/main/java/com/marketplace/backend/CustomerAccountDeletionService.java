package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 8
 * Final Secure Implementation: Customer Account Deactivation & Permanent Deletion Service.
 *
 * Enforces the complete security chain:
 * Authenticated Customer
 * -> Explicit DELETE confirmation
 * -> Current password verification (BCrypt)
 * -> Verified email + Verified mobile prerequisite
 * -> ONE cryptographically secure OTP generated
 * -> SAME OTP delivered to BOTH verified email & verified mobile
 * -> Strict delivery failure enforcement
 * -> Purpose isolation (PERMANENT_ACCOUNT_DELETION)
 * -> One-time OTP verification & server-side authorization ticket
 * -> Transactional deletion/anonymization preserving shared business records
 * -> Cross-device session & JWT invalidation
 * -> Official bilingual email notifications (English + Hindi)
 */
@Service
public class CustomerAccountDeletionService {

    private static final Logger log = LoggerFactory.getLogger(CustomerAccountDeletionService.class);

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int DELETION_TICKET_VALIDITY_MINUTES = 5;

    private final SecureRandom secureRandom = new SecureRandom();

    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final UserVerificationRepository verificationRepository;
    private final CustomerProfileRepository profileRepository;
    private final CustomerConstructionPreferenceRepository constructionPreferenceRepository;
    private final CustomerSavedLocationRepository savedLocationRepository;
    private final CustomerRegionalPreferenceRepository regionalPreferenceRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    private final SmsService smsService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public CustomerAccountDeletionService(
            MarketplaceBackendApplication.UserRepository userRepository,
            UserVerificationRepository verificationRepository,
            CustomerProfileRepository profileRepository,
            CustomerConstructionPreferenceRepository constructionPreferenceRepository,
            CustomerSavedLocationRepository savedLocationRepository,
            CustomerRegionalPreferenceRepository regionalPreferenceRepository,
            NotificationRepository notificationRepository,
            EmailService emailService,
            SmsService smsService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.profileRepository = profileRepository;
        this.constructionPreferenceRepository = constructionPreferenceRepository;
        this.savedLocationRepository = savedLocationRepository;
        this.regionalPreferenceRepository = regionalPreferenceRepository;
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
        this.smsService = smsService;
        this.passwordEncoder = passwordEncoder;
    }

    // ============================================================
    // 1. ACCOUNT DELETION & DEACTIVATION STATUS
    // ============================================================
    @Transactional(readOnly = true)
    public CustomerAccountDeletionDto.AccountDeletionStatusResponse getStatus(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }

        boolean canDeactivate = user.isEnabled() && !user.isDeleted();
        boolean canDelete = user.isEnabled() && !user.isDeleted() && user.isEmailVerified() && user.isPhoneVerified();

        String verifMessage = null;
        if (!user.isEmailVerified() && !user.isPhoneVerified()) {
            verifMessage = "Both your email address and mobile number must be verified before requesting permanent account deletion.";
        } else if (!user.isEmailVerified()) {
            verifMessage = "Your email address must be verified before requesting permanent account deletion.";
        } else if (!user.isPhoneVerified()) {
            verifMessage = "Your mobile number must be verified before requesting permanent account deletion.";
        }

        return new CustomerAccountDeletionDto.AccountDeletionStatusResponse(
                user.getEmail(),
                user.isEmailVerified(),
                user.getPhone(),
                user.isPhoneVerified(),
                canDeactivate,
                canDelete,
                verifMessage
        );
    }

    // ============================================================
    // 2. REVERSIBLE ACCOUNT DEACTIVATION
    // ============================================================
    @Transactional
    public CustomerAccountDeletionDto.OperationResponse deactivateAccount(
            MarketplaceBackendApplication.MarketplaceUser user,
            String currentPassword,
            String confirmation
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }

        if (user.isDeleted()) {
            throw new IllegalStateException("This account is permanently deleted.");
        }

        if (!user.isEnabled()) {
            throw new IllegalStateException("This account is already deactivated.");
        }

        // 1. Explicit confirmation validation
        if (confirmation == null || !confirmation.trim().equalsIgnoreCase("DEACTIVATE")) {
            throw new IllegalArgumentException("Confirmation must be 'DEACTIVATE' to deactivate your account.");
        }

        // 2. Current password verification
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new IllegalArgumentException("Current password is required.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        // 3. Reversible deactivation: Disable login and invalidate existing tokens
        LocalDateTime now = LocalDateTime.now();
        user.setEnabled(false);
        user.setDeactivatedAt(now);
        user.setPasswordUpdatedAt(now); // Immediately invalidates active JWTs cross-device
        userRepository.save(user);

        log.info("[Deactivation] Account deactivated for user: {}", maskEmail(user.getEmail()));

        // 4. Send bilingual deactivation notification email
        try {
            emailService.sendAccountDeactivatedEmail(user.getEmail(), user.getName());
        } catch (Exception ex) {
            log.warn("[Deactivation] Failed to deliver deactivation email: {}", ex.getMessage());
        }

        return new CustomerAccountDeletionDto.OperationResponse(
                "Your BuildBid account has been deactivated successfully. All active sessions have been signed out.",
                true,
                true
        );
    }

    // ============================================================
    // 3. PERMANENT DELETION: PHASE 1 & 4 — INITIATE & SEND SAME OTP
    // ============================================================
    @Transactional
    public CustomerAccountDeletionDto.DeletionInitiationResponse initiatePermanentDeletion(
            MarketplaceBackendApplication.MarketplaceUser user,
            String currentPassword,
            String confirmation
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }

        if (user.isDeleted()) {
            throw new IllegalStateException("This account is already permanently deleted.");
        }

        // 1. Explicit DELETE confirmation check (Case-sensitive exact "DELETE")
        if (confirmation == null || !confirmation.equals("DELETE")) {
            throw new IllegalArgumentException("Confirmation must be exactly 'DELETE' to proceed with permanent deletion.");
        }

        // 2. Current password verification
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new IllegalArgumentException("Current password is required.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        // 3. Verified email and mobile prerequisites check
        if (!user.isEmailVerified()) {
            throw new IllegalStateException("Permanent deletion requires a verified email address. Please verify your email in Account Settings first.");
        }

        if (!user.isPhoneVerified() || user.getPhone() == null || user.getPhone().isBlank()) {
            throw new IllegalStateException("Permanent deletion requires a verified mobile number. Please verify your mobile number in Account Settings first.");
        }

        // 4. Enforce Resend Cooldown
        Optional<UserVerification> latestOpt = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                        user.getId(),
                        UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION
                );

        if (latestOpt.isPresent()) {
            UserVerification latest = latestOpt.get();
            if (!latest.canResend() && !latest.isExpired()) {
                throw new IllegalStateException("Please wait " + latest.getRemainingCooldownSeconds() + " seconds before requesting a new deletion code.");
            }
        }

        // Invalidate previous deletion OTPs for this user
        invalidatePreviousDeletionOtps(user.getId());

        // 5. Generate exactly ONE cryptographically secure 6-digit numeric OTP
        String otp = generateSecureNumericOtp();
        String hashedOtp = passwordEncoder.encode(otp);
        LocalDateTime now = LocalDateTime.now();

        // 6. Persist OTP hash with strict purpose isolation
        UserVerification verification = new UserVerification(
                user.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                user.getEmail(),
                hashedOtp,
                now.plusMinutes(OTP_EXPIRY_MINUTES),
                now.plusSeconds(RESEND_COOLDOWN_SECONDS)
        );
        verificationRepository.save(verification);

        // 7. Dispatch SAME OTP to BOTH verified channels
        boolean emailSent = false;
        boolean smsSent = false;

        try {
            emailSent = emailService.sendDeletionOtpEmail(user.getEmail(), user.getName(), otp);
        } catch (Exception ex) {
            log.error("[Deletion] Email OTP transmission exception: {}", ex.getMessage());
        }

        try {
            smsSent = smsService.sendDeletionOtpSms(user.getPhone(), otp);
        } catch (Exception ex) {
            log.error("[Deletion] SMS OTP transmission exception: {}", ex.getMessage());
        }

        // 8. Strict delivery failure check: BOTH must succeed
        if (!emailSent || !smsSent) {
            // Invalidate the generated OTP record so it can never be used
            verification.setUsed(true);
            verificationRepository.save(verification);

            String failedChannel = (!emailSent && !smsSent)
                    ? "both email and SMS channels"
                    : (!emailSent ? "email channel" : "mobile SMS channel");

            log.warn("[Deletion] Delivery failed on {}. Permanent deletion aborted for security.", failedChannel);

            throw new IllegalStateException("Verification code delivery failed on " + failedChannel +
                    ". Both delivery channels must be active to authorize permanent account deletion.");
        }

        // 9. Send bilingual deletion initiated notification email
        try {
            emailService.sendDeletionInitiatedEmail(user.getEmail(), user.getName());
        } catch (Exception ex) {
            log.warn("[Deletion] Failed to send deletion initiation notice: {}", ex.getMessage());
        }

        return new CustomerAccountDeletionDto.DeletionInitiationResponse(
                "A 6-digit verification code has been sent to your verified email and mobile number.",
                RESEND_COOLDOWN_SECONDS,
                OTP_EXPIRY_MINUTES,
                maskEmail(user.getEmail()),
                maskPhoneNumber(user.getPhone())
        );
    }

    // ============================================================
    // 4. RESEND DELETION OTP (SAME CODE TO BOTH CHANNELS)
    // ============================================================
    @Transactional
    public CustomerAccountDeletionDto.DeletionInitiationResponse resendDeletionOtp(
            MarketplaceBackendApplication.MarketplaceUser user
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }

        if (user.isDeleted() || !user.isEnabled()) {
            throw new IllegalStateException("Account is not active.");
        }

        if (!user.isEmailVerified() || !user.isPhoneVerified() || user.getPhone() == null) {
            throw new IllegalStateException("Verified email and mobile are required.");
        }

        Optional<UserVerification> latestOpt = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                        user.getId(),
                        UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION
                );

        if (latestOpt.isPresent()) {
            UserVerification latest = latestOpt.get();
            if (!latest.canResend() && !latest.isExpired()) {
                throw new IllegalStateException("Please wait " + latest.getRemainingCooldownSeconds() + " seconds before requesting a new deletion code.");
            }
        }

        invalidatePreviousDeletionOtps(user.getId());

        String otp = generateSecureNumericOtp();
        String hashedOtp = passwordEncoder.encode(otp);
        LocalDateTime now = LocalDateTime.now();

        UserVerification verification = new UserVerification(
                user.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                user.getEmail(),
                hashedOtp,
                now.plusMinutes(OTP_EXPIRY_MINUTES),
                now.plusSeconds(RESEND_COOLDOWN_SECONDS)
        );
        verificationRepository.save(verification);

        boolean emailSent = false;
        boolean smsSent = false;

        try {
            emailSent = emailService.sendDeletionOtpEmail(user.getEmail(), user.getName(), otp);
        } catch (Exception ex) {
            log.error("[Deletion Resend] Email dispatch exception: {}", ex.getMessage());
        }

        try {
            smsSent = smsService.sendDeletionOtpSms(user.getPhone(), otp);
        } catch (Exception ex) {
            log.error("[Deletion Resend] SMS dispatch exception: {}", ex.getMessage());
        }

        if (!emailSent || !smsSent) {
            verification.setUsed(true);
            verificationRepository.save(verification);
            throw new IllegalStateException("Verification code resend failed on one or both delivery channels.");
        }

        return new CustomerAccountDeletionDto.DeletionInitiationResponse(
                "A new 6-digit verification code has been sent to your verified email and mobile number.",
                RESEND_COOLDOWN_SECONDS,
                OTP_EXPIRY_MINUTES,
                maskEmail(user.getEmail()),
                maskPhoneNumber(user.getPhone())
        );
    }

    // ============================================================
    // 5. PHASE 5 — VERIFY DELETION OTP & ISSUE AUTHORIZATION TICKET
    // ============================================================
    @Transactional
    public CustomerAccountDeletionDto.DeletionOtpVerificationResponse verifyDeletionOtp(
            MarketplaceBackendApplication.MarketplaceUser user,
            String enteredOtp
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }

        if (enteredOtp == null || enteredOtp.trim().length() != OTP_LENGTH || !enteredOtp.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("Invalid OTP format. Please enter a valid 6-digit numeric code.");
        }

        UserVerification record = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                        user.getId(),
                        UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION
                )
                .orElseThrow(() -> new IllegalArgumentException("No active account deletion verification code found. Please initiate deletion again."));

        if (record.isUsed()) {
            throw new IllegalArgumentException("This verification code has already been used. Please request a new code.");
        }

        if (record.isExpired()) {
            record.setUsed(true);
            verificationRepository.save(record);
            emailService.sendDeletionSecurityAlertEmail(user.getEmail(), user.getName(), "Expired verification code attempt.");
            throw new IllegalArgumentException("This verification code has expired. Please request a new code.");
        }

        if (record.isMaxAttemptsReached()) {
            record.setUsed(true);
            verificationRepository.save(record);
            emailService.sendDeletionSecurityAlertEmail(user.getEmail(), user.getName(), "Maximum verification attempts exceeded.");
            throw new IllegalArgumentException("Maximum verification attempts exceeded (5). For your security, this code has been invalidated. Please request a new code.");
        }

        // Verify cryptographic hash
        boolean matches = passwordEncoder.matches(enteredOtp.trim(), record.getOtpHash());
        if (!matches) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            verificationRepository.save(record);

            int remaining = MAX_FAILED_ATTEMPTS - record.getAttemptCount();
            if (remaining <= 0) {
                record.setUsed(true);
                verificationRepository.save(record);
                emailService.sendDeletionSecurityAlertEmail(user.getEmail(), user.getName(), "Maximum verification attempts exceeded.");
                throw new IllegalArgumentException("Invalid verification code. Maximum attempts exceeded. Please initiate a new request.");
            }
            throw new IllegalArgumentException("Invalid verification code. " + remaining + " attempts remaining.");
        }

        // Mark OTP as used (strictly one-time use)
        record.setUsed(true);
        verificationRepository.save(record);

        // Generate short-lived server-side deletion authorization ticket
        String deletionTicket = "bb_del_" + UUID.randomUUID().toString().replace("-", "");
        LocalDateTime ticketExpiry = LocalDateTime.now().plusMinutes(DELETION_TICKET_VALIDITY_MINUTES);

        user.setDeletionAuthToken(deletionTicket);
        user.setDeletionAuthExpiry(ticketExpiry);
        userRepository.save(user);

        log.info("[Deletion] Deletion OTP verified successfully for user: {}", maskEmail(user.getEmail()));

        // Send bilingual verification success notification
        try {
            emailService.sendDeletionOtpVerifiedEmail(user.getEmail(), user.getName());
        } catch (Exception ex) {
            log.warn("[Deletion] Failed to send OTP verified email: {}", ex.getMessage());
        }

        return new CustomerAccountDeletionDto.DeletionOtpVerificationResponse(
                "Verification successful. Permanent deletion is authorized for " + DELETION_TICKET_VALIDITY_MINUTES + " minutes.",
                deletionTicket,
                DELETION_TICKET_VALIDITY_MINUTES
        );
    }

    // ============================================================
    // 6. PHASE 6 — FINAL DELETION & ANONYMIZATION TRANSACTION
    // ============================================================
    @Transactional
    public CustomerAccountDeletionDto.OperationResponse confirmPermanentDeletion(
            MarketplaceBackendApplication.MarketplaceUser user,
            String deletionTicket,
            String confirmation
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }

        // 1. Explicit DELETE confirmation check
        if (confirmation == null || !confirmation.equals("DELETE")) {
            throw new IllegalArgumentException("Confirmation must be exactly 'DELETE' to finalize permanent deletion.");
        }

        // 2. Validate deletion authorization ticket
        if (deletionTicket == null || deletionTicket.isBlank()
                || user.getDeletionAuthToken() == null
                || !user.getDeletionAuthToken().equals(deletionTicket)) {
            throw new IllegalArgumentException("Invalid or missing deletion authorization ticket. Deletion cannot proceed.");
        }

        if (user.getDeletionAuthExpiry() == null || LocalDateTime.now().isAfter(user.getDeletionAuthExpiry())) {
            user.setDeletionAuthToken(null);
            user.setDeletionAuthExpiry(null);
            userRepository.save(user);
            throw new IllegalArgumentException("Deletion authorization has expired. Please initiate a new deletion request.");
        }

        // 3. Capture contact details for final notification before anonymization
        String finalEmail = user.getEmail();
        String finalName = user.getName();

        // 4. ATOMIC TRANSACTION: Delete customer-owned data (Category A)
        // Clean up customer profile
        profileRepository.deleteByUser(user);

        // Clean up construction preferences
        constructionPreferenceRepository.deleteByUser(user);

        // Clean up saved locations
        savedLocationRepository.deleteByUser(user);

        // Clean up regional preferences
        regionalPreferenceRepository.deleteByUser(user);

        // Clean up notifications for this recipient
        notificationRepository.deleteByRecipient(user);

        // Clean up verification records for this user
        verificationRepository.deleteByUserId(user.getId());

        // Note: Category B shared business records (Projects, Bids, Orders, Quotations, Requests)
        // are strictly preserved to protect contractor, seller, and platform integrity!

        // 5. ATOMIC TRANSACTION: Invalidate credentials & anonymize user record (Category C)
        LocalDateTime now = LocalDateTime.now();
        user.setEnabled(false);
        user.setDeleted(true);
        user.setDeletedAt(now);
        user.setPasswordHash("[DELETED_" + UUID.randomUUID() + "]");
        user.setPasswordUpdatedAt(now); // Invalidates all JWTs cross-device
        user.setDeletionAuthToken(null);
        user.setDeletionAuthExpiry(null);

        user.setName("Deleted Customer");
        user.setPhone(null);
        user.setLocation(null);
        user.setProfilePhotoUrl(null);
        user.getRoles().clear();

        userRepository.saveAndFlush(user);

        log.info("[Permanent Deletion] Successfully deleted and anonymized customer account: {}", maskEmail(finalEmail));

        // 6. Send official final bilingual deletion email
        // Note: Email delivery failure AFTER successful deletion commit must NOT rollback deletion.
        try {
            emailService.sendPermanentDeletionSuccessEmail(finalEmail, finalName);
        } catch (Exception ex) {
            log.warn("[Permanent Deletion] Failed to deliver final deletion email to {}: {}", maskEmail(finalEmail), ex.getMessage());
        }

        return new CustomerAccountDeletionDto.OperationResponse(
                "Your BuildBid account has been permanently deleted. All personal data and active sessions have been terminated.",
                true,
                true
        );
    }

    // ============================================================
    // 7. HELPER UTILITIES
    // ============================================================
    private String generateSecureNumericOtp() {
        int number = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(number);
    }

    private void invalidatePreviousDeletionOtps(Long userId) {
        List<UserVerification> activeOtps = verificationRepository.findByUserIdAndVerificationTypeAndUsedFalse(
                userId,
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION
        );
        for (UserVerification uv : activeOtps) {
            uv.setUsed(true);
        }
        verificationRepository.saveAll(activeOtps);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String name = parts[0];
        if (name.length() <= 2) return "**@" + parts[1];
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + parts[1];
    }

    private String maskPhoneNumber(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        int len = phone.length();
        return phone.substring(0, 2) + "******" + phone.substring(len - 2);
    }
}
