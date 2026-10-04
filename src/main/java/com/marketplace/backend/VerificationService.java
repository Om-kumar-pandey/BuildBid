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

@Service
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

    private static final int OTP_LENGTH = 6;
    private static final int EXPIRY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserVerificationRepository verificationRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final CustomerProfileRepository profileRepository;
    private final EmailService emailService;
    private final SmsService smsService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public VerificationService(
            UserVerificationRepository verificationRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            CustomerProfileRepository profileRepository,
            EmailService emailService,
            SmsService smsService,
            PasswordEncoder passwordEncoder
    ) {
        this.verificationRepository = verificationRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.emailService = emailService;
        this.smsService = smsService;
        this.passwordEncoder = passwordEncoder;
    }

    private String generateSecureNumericOtp() {
        int number = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(number);
    }

    private void invalidatePreviousOtps(Long userId, UserVerification.VerificationType type) {
        List<UserVerification> activeOtps = verificationRepository.findByUserIdAndVerificationTypeAndUsedFalse(userId, type);
        for (UserVerification uv : activeOtps) {
            uv.setUsed(true);
        }
        verificationRepository.saveAll(activeOtps);
    }

    private void invalidatePreviousOtpsByTarget(String targetValue, UserVerification.VerificationType type) {
        List<UserVerification> activeOtps = verificationRepository.findByTargetValueAndVerificationTypeAndUsedFalse(targetValue, type);
        for (UserVerification uv : activeOtps) {
            uv.setUsed(true);
        }
        verificationRepository.saveAll(activeOtps);
    }

    // ============================================================
    // 1. EMAIL VERIFICATION (REGISTRATION & EXISTING ACCOUNTS)
    // ============================================================
    @Transactional
    public void sendEmailVerification(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            throw new IllegalArgumentException("User or user email cannot be empty.");
        }

        String normalizedEmail = user.getEmail().trim().toLowerCase();

        // Check if there is an active OTP in cooldown
        Optional<UserVerification> latestOpt = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(user.getId(), UserVerification.VerificationType.EMAIL_VERIFICATION);

        if (latestOpt.isPresent()) {
            UserVerification latest = latestOpt.get();
            if (!latest.canResend() && !latest.isExpired()) {
                throw new IllegalStateException("Please wait " + latest.getRemainingCooldownSeconds() + " seconds before requesting a new OTP.");
            }
        }

        invalidatePreviousOtps(user.getId(), UserVerification.VerificationType.EMAIL_VERIFICATION);

        String otp = generateSecureNumericOtp();
        String hashedOtp = passwordEncoder.encode(otp);
        LocalDateTime now = LocalDateTime.now();

        UserVerification verification = new UserVerification(
                user.getId(),
                UserVerification.VerificationType.EMAIL_VERIFICATION,
                normalizedEmail,
                hashedOtp,
                now.plusMinutes(EXPIRY_MINUTES),
                now.plusSeconds(RESEND_COOLDOWN_SECONDS)
        );

        verificationRepository.save(verification);

        // Send via EmailService
        emailService.sendVerificationOtpEmail(
                normalizedEmail,
                user.getName() != null ? user.getName() : user.getUsername(),
                otp,
                "Email Verification"
        );
    }

    @Transactional
    public boolean verifyEmailOtp(MarketplaceBackendApplication.MarketplaceUser user, String enteredOtp) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }
        if (enteredOtp == null || enteredOtp.trim().length() != OTP_LENGTH || !enteredOtp.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("Invalid OTP format. Please enter a valid 6-digit numeric code.");
        }

        UserVerification record = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(user.getId(), UserVerification.VerificationType.EMAIL_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException("No active verification code found. Please request a new OTP."));

        validateOtpRecord(record, enteredOtp.trim());

        // Mark OTP as used
        record.setUsed(true);
        verificationRepository.save(record);

        // Mark user email verified
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        return true;
    }

    // ============================================================
    // 2. MOBILE / PHONE VERIFICATION
    // ============================================================
    @Transactional
    public void sendPhoneVerification(MarketplaceBackendApplication.MarketplaceUser user, String phoneNumber) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }

        String targetPhone = (phoneNumber != null && !phoneNumber.isBlank())
                ? phoneNumber.trim()
                : (user.getPhone() != null ? user.getPhone().trim() : null);

        if (targetPhone == null || targetPhone.isBlank()) {
            throw new IllegalArgumentException("Mobile number is required to send verification code.");
        }

        // Validate basic numeric phone length (India standard: 10 digits or 10-15 digits international)
        String digitsOnly = targetPhone.replaceAll("[^0-9]", "");
        if (digitsOnly.length() < 10 || digitsOnly.length() > 15) {
            throw new IllegalArgumentException("Please enter a valid 10-digit mobile number.");
        }

        Optional<UserVerification> latestOpt = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(user.getId(), UserVerification.VerificationType.PHONE_VERIFICATION);

        if (latestOpt.isPresent()) {
            UserVerification latest = latestOpt.get();
            if (!latest.canResend() && !latest.isExpired()) {
                throw new IllegalStateException("Please wait " + latest.getRemainingCooldownSeconds() + " seconds before requesting a new OTP.");
            }
        }

        invalidatePreviousOtps(user.getId(), UserVerification.VerificationType.PHONE_VERIFICATION);

        String otp = generateSecureNumericOtp();
        String hashedOtp = passwordEncoder.encode(otp);
        LocalDateTime now = LocalDateTime.now();

        UserVerification verification = new UserVerification(
                user.getId(),
                UserVerification.VerificationType.PHONE_VERIFICATION,
                targetPhone,
                hashedOtp,
                now.plusMinutes(EXPIRY_MINUTES),
                now.plusSeconds(RESEND_COOLDOWN_SECONDS)
        );

        verificationRepository.save(verification);

        // Send SMS
        smsService.sendVerificationOtpSms(targetPhone, otp);
    }

    @Transactional
    public boolean verifyPhoneOtp(MarketplaceBackendApplication.MarketplaceUser user, String phoneNumber, String enteredOtp) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }
        if (enteredOtp == null || enteredOtp.trim().length() != OTP_LENGTH || !enteredOtp.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("Invalid OTP format. Please enter a valid 6-digit numeric code.");
        }

        UserVerification record = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(user.getId(), UserVerification.VerificationType.PHONE_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException("No active phone verification code found. Please request a new OTP."));

        validateOtpRecord(record, enteredOtp.trim());

        record.setUsed(true);
        verificationRepository.save(record);

        String verifiedPhone = record.getTargetValue();
        user.setPhone(verifiedPhone);
        user.setPhoneVerified(true);
        user.setPhoneVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        // Synchronize customer profile if present
        profileRepository.findByUser(user).ifPresent(profile -> {
            profile.setPhone(verifiedPhone);
            profileRepository.save(profile);
        });

        return true;
    }

    // ============================================================
    // 3. EMAIL CHANGE FLOW (STRICT GLOBAL UNIQUENESS & VERIFICATION)
    // ============================================================
    @Transactional
    public void requestEmailChange(MarketplaceBackendApplication.MarketplaceUser user, String newEmail) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }
        if (newEmail == null || newEmail.isBlank()) {
            throw new IllegalArgumentException("New email address is required.");
        }

        String normalizedNewEmail = newEmail.trim().toLowerCase();

        // Valid email format check
        if (!normalizedNewEmail.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Invalid email format.");
        }

        if (normalizedNewEmail.equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException("New email cannot be the same as your current email.");
        }

        // STRICT GLOBAL ONE-EMAIL-ONE-ACCOUNT CHECK ACROSS ALL ROLES
        if (userRepository.existsByEmail(normalizedNewEmail) || userRepository.existsByEmailIgnoreCase(normalizedNewEmail)) {
            throw new IllegalArgumentException("This email already exists. Try another email.");
        }

        Optional<UserVerification> latestOpt = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(user.getId(), UserVerification.VerificationType.EMAIL_CHANGE);

        if (latestOpt.isPresent()) {
            UserVerification latest = latestOpt.get();
            if (!latest.canResend() && !latest.isExpired()) {
                throw new IllegalStateException("Please wait " + latest.getRemainingCooldownSeconds() + " seconds before requesting a new OTP.");
            }
        }

        invalidatePreviousOtps(user.getId(), UserVerification.VerificationType.EMAIL_CHANGE);

        String otp = generateSecureNumericOtp();
        String hashedOtp = passwordEncoder.encode(otp);
        LocalDateTime now = LocalDateTime.now();

        UserVerification verification = new UserVerification(
                user.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                normalizedNewEmail,
                hashedOtp,
                now.plusMinutes(EXPIRY_MINUTES),
                now.plusSeconds(RESEND_COOLDOWN_SECONDS)
        );

        verificationRepository.save(verification);

        // Send OTP to the NEW email address to prove ownership
        emailService.sendVerificationOtpEmail(
                normalizedNewEmail,
                user.getName() != null ? user.getName() : user.getUsername(),
                otp,
                "Email Change Verification"
        );
    }

    @Transactional
    public boolean verifyEmailChange(MarketplaceBackendApplication.MarketplaceUser user, String newEmail, String enteredOtp) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }
        if (newEmail == null || newEmail.isBlank()) {
            throw new IllegalArgumentException("New email address is required.");
        }
        if (enteredOtp == null || enteredOtp.trim().length() != OTP_LENGTH || !enteredOtp.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("Invalid OTP format. Please enter a valid 6-digit numeric code.");
        }

        String normalizedNewEmail = newEmail.trim().toLowerCase();

        UserVerification record = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(user.getId(), UserVerification.VerificationType.EMAIL_CHANGE)
                .orElseThrow(() -> new IllegalArgumentException("No pending email change request found. Please request a new verification code."));

        if (!record.getTargetValue().equalsIgnoreCase(normalizedNewEmail)) {
            throw new IllegalArgumentException("Verification code does not match the requested new email address.");
        }

        validateOtpRecord(record, enteredOtp.trim());

        // Re-verify global uniqueness to eliminate race condition
        Optional<MarketplaceBackendApplication.MarketplaceUser> existingWithEmail = userRepository.findByEmail(normalizedNewEmail)
                .or(() -> userRepository.findByEmailIgnoreCase(normalizedNewEmail));
        if (existingWithEmail.isPresent() && !existingWithEmail.get().getId().equals(user.getId())) {
            throw new IllegalArgumentException("This email already exists. Try another email.");
        }

        record.setUsed(true);
        verificationRepository.save(record);

        // Commit email change
        user.setEmail(normalizedNewEmail);
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        // Synchronize customer profile if exists
        profileRepository.findByUser(user).ifPresent(profile -> {
            profile.setEmail(normalizedNewEmail);
            profileRepository.save(profile);
        });

        return true;
    }

    // ============================================================
    // 4. PHONE CHANGE FLOW (UNVERIFIED UNTIL OTP VERIFIED)
    // ============================================================
    @Transactional
    public void requestPhoneChange(MarketplaceBackendApplication.MarketplaceUser user, String newPhone) {
        if (user == null) {
            throw new IllegalArgumentException("User not found.");
        }
        if (newPhone == null || newPhone.isBlank()) {
            throw new IllegalArgumentException("New mobile number is required.");
        }

        String cleanedPhone = newPhone.trim();
        String digitsOnly = cleanedPhone.replaceAll("[^0-9]", "");
        if (digitsOnly.length() < 10 || digitsOnly.length() > 15) {
            throw new IllegalArgumentException("Please enter a valid 10-digit mobile number.");
        }

        // When changing phone, mark current phone unverified until verified
        user.setPhone(cleanedPhone);
        user.setPhoneVerified(false);
        user.setPhoneVerifiedAt(null);
        userRepository.save(user);

        profileRepository.findByUser(user).ifPresent(profile -> {
            profile.setPhone(cleanedPhone);
            profileRepository.save(profile);
        });

        // Trigger phone OTP
        sendPhoneVerification(user, cleanedPhone);
    }

    // ============================================================
    // 5. PRE-LOGIN REGISTRATION EMAIL VERIFICATION
    // ============================================================
    @Transactional
    public boolean verifyEmailPreLogin(String email, String enteredOtp) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }
        if (enteredOtp == null || enteredOtp.trim().length() != OTP_LENGTH || !enteredOtp.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("Invalid OTP format. Please enter a valid 6-digit numeric code.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        MarketplaceBackendApplication.MarketplaceUser user = userRepository.findByEmail(normalizedEmail)
                .or(() -> userRepository.findByEmailIgnoreCase(normalizedEmail))
                .orElseThrow(() -> new IllegalArgumentException("No account registered with this email address."));

        UserVerification record = verificationRepository
                .findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(user.getId(), UserVerification.VerificationType.EMAIL_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException("No active verification code found. Please request a new OTP."));

        validateOtpRecord(record, enteredOtp.trim());

        record.setUsed(true);
        verificationRepository.save(record);

        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        return true;
    }

    @Transactional
    public void resendEmailPreLogin(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        MarketplaceBackendApplication.MarketplaceUser user = userRepository.findByEmail(normalizedEmail)
                .or(() -> userRepository.findByEmailIgnoreCase(normalizedEmail))
                .orElseThrow(() -> new IllegalArgumentException("No account registered with this email address."));

        if (user.isEmailVerified()) {
            throw new IllegalStateException("This email account is already verified.");
        }

        sendEmailVerification(user);
    }

    // ============================================================
    // 6. COMMON OTP VALIDATION HELPER
    // ============================================================
    private void validateOtpRecord(UserVerification record, String enteredOtp) {
        if (record.isUsed()) {
            throw new IllegalArgumentException("This verification code has already been used. Please request a new OTP.");
        }

        if (record.isExpired()) {
            record.setUsed(true);
            verificationRepository.save(record);
            throw new IllegalArgumentException("This verification code has expired. Please request a new OTP.");
        }

        if (record.isMaxAttemptsReached()) {
            record.setUsed(true);
            verificationRepository.save(record);
            throw new IllegalArgumentException("Maximum verification attempts exceeded (5). Please request a new OTP.");
        }

        boolean matches = passwordEncoder.matches(enteredOtp, record.getOtpHash());
        if (!matches) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            verificationRepository.save(record);

            int remaining = MAX_ATTEMPTS - record.getAttemptCount();
            if (remaining <= 0) {
                record.setUsed(true);
                verificationRepository.save(record);
                throw new IllegalArgumentException("Invalid verification code. Maximum attempts exceeded. Please request a new OTP.");
            }
            throw new IllegalArgumentException("Invalid verification code. " + remaining + " attempts remaining.");
        }
    }
}
