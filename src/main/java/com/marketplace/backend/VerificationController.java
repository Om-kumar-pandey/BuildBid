package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/verification")
public class VerificationController {

    private final VerificationService verificationService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public VerificationController(
            VerificationService verificationService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.verificationService = verificationService;
        this.userRepository = userRepository;
    }

    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String principal = authentication.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .or(() -> userRepository.findByEmailIgnoreCase(principal))
                .orElse(null);
    }

    // ============================================================
    // 1. GET VERIFICATION STATUS (AUTHENTICATED)
    // ============================================================
    @GetMapping("/status")
    public ResponseEntity<?> getVerificationStatus(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        return ResponseEntity.ok(Map.of(
                "email", user.getEmail() != null ? user.getEmail() : "",
                "emailVerified", user.isEmailVerified(),
                "emailVerifiedAt", user.getEmailVerifiedAt() != null ? user.getEmailVerifiedAt().toString() : "",
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "phoneVerified", user.isPhoneVerified(),
                "phoneVerifiedAt", user.getPhoneVerifiedAt() != null ? user.getPhoneVerifiedAt().toString() : ""
        ));
    }

    // ============================================================
    // 2. EMAIL VERIFICATION (SEND & VERIFY)
    // ============================================================
    @PostMapping("/email/send-otp")
    public ResponseEntity<?> sendEmailOtp(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        try {
            verificationService.sendEmailVerification(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Verification code sent to " + maskEmail(user.getEmail()),
                    "cooldownSeconds", 60
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/email/verify-otp")
    public ResponseEntity<?> verifyEmailOtp(
            @RequestBody VerifyOtpRequest request,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        try {
            verificationService.verifyEmailOtp(user, request.otp());
            return ResponseEntity.ok(Map.of(
                    "message", "Email verified successfully.",
                    "emailVerified", true,
                    "emailVerifiedAt", user.getEmailVerifiedAt() != null ? user.getEmailVerifiedAt().toString() : ""
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ============================================================
    // 3. EMAIL CHANGE (REQUEST & VERIFY)
    // ============================================================
    @PostMapping("/email/request-change")
    public ResponseEntity<?> requestEmailChange(
            @RequestBody EmailChangeRequest request,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        try {
            verificationService.requestEmailChange(user, request.newEmail());
            return ResponseEntity.ok(Map.of(
                    "message", "Verification code sent to " + maskEmail(request.newEmail()),
                    "targetEmail", request.newEmail().trim().toLowerCase(),
                    "cooldownSeconds", 60
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/email/verify-change")
    public ResponseEntity<?> verifyEmailChange(
            @RequestBody VerifyEmailChangeRequest request,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        try {
            verificationService.verifyEmailChange(user, request.newEmail(), request.otp());
            return ResponseEntity.ok(Map.of(
                    "message", "Email updated and verified successfully.",
                    "email", user.getEmail(),
                    "emailVerified", true
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ============================================================
    // 4. PHONE VERIFICATION (SEND & VERIFY)
    // ============================================================
    @PostMapping("/phone/send-otp")
    public ResponseEntity<?> sendPhoneOtp(
            @RequestBody(required = false) PhoneOtpRequest request,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        String phone = (request != null && request.phone() != null && !request.phone().isBlank())
                ? request.phone()
                : user.getPhone();

        try {
            verificationService.sendPhoneVerification(user, phone);
            return ResponseEntity.ok(Map.of(
                    "message", "Verification code sent to mobile number.",
                    "cooldownSeconds", 60
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/phone/verify-otp")
    public ResponseEntity<?> verifyPhoneOtp(
            @RequestBody VerifyPhoneOtpRequest request,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        String phone = (request.phone() != null && !request.phone().isBlank()) ? request.phone() : user.getPhone();

        try {
            verificationService.verifyPhoneOtp(user, phone, request.otp());
            return ResponseEntity.ok(Map.of(
                    "message", "Mobile number verified successfully.",
                    "phoneVerified", true,
                    "phone", user.getPhone() != null ? user.getPhone() : ""
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ============================================================
    // 5. PUBLIC / PRE-LOGIN VERIFICATION ENDPOINTS
    // ============================================================
    @PostMapping("/public/verify-email")
    public ResponseEntity<?> verifyEmailPreLogin(@RequestBody PublicVerifyEmailRequest request) {
        try {
            verificationService.verifyEmailPreLogin(request.email(), request.otp());
            return ResponseEntity.ok(Map.of(
                    "message", "Email verified successfully. You may now login to BuildBid.",
                    "emailVerified", true
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/public/resend-email")
    public ResponseEntity<?> resendEmailPreLogin(@RequestBody PublicResendEmailRequest request) {
        try {
            verificationService.resendEmailPreLogin(request.email());
            return ResponseEntity.ok(Map.of(
                    "message", "Verification code resent to your email.",
                    "cooldownSeconds", 60
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // Request DTOs
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VerifyOtpRequest(String otp) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EmailChangeRequest(String newEmail) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VerifyEmailChangeRequest(String newEmail, String otp) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PhoneOtpRequest(String phone) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VerifyPhoneOtpRequest(String phone, String otp) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PublicVerifyEmailRequest(String email, String otp) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PublicResendEmailRequest(String email) {}

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String name = parts[0];
        if (name.length() <= 2) return "**@" + parts[1];
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + parts[1];
    }
}
