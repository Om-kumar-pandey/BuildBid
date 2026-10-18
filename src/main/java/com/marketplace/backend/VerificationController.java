package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/verification")
public class VerificationController {

    private final VerificationService verificationService;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final MarketplaceBackendApplication.JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Autowired
    public VerificationController(
            VerificationService verificationService,
            MarketplaceBackendApplication.UserRepository userRepository,
            @Autowired(required = false) MarketplaceBackendApplication.JwtService jwtService,
            @Autowired(required = false) UserDetailsService userDetailsService
    ) {
        this.verificationService = verificationService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    public VerificationController(
            VerificationService verificationService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this(verificationService, userRepository, null, null);
    }

    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String principal = authentication.getName();
        if (principal == null || principal.isBlank() || "anonymousUser".equalsIgnoreCase(principal)) {
            return null;
        }
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

        VerificationService.RateLimitStatus rateLimit = verificationService.getEmailChangeRateLimitStatus(user.getId());
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("email", user.getEmail() != null ? user.getEmail() : "");
        status.put("emailVerified", user.isEmailVerified());
        status.put("emailVerifiedAt", user.getEmailVerifiedAt() != null ? user.getEmailVerifiedAt().toString() : "");
        status.put("phone", user.getPhone() != null ? user.getPhone() : "");
        status.put("phoneVerified", user.isPhoneVerified());
        status.put("phoneVerifiedAt", user.getPhoneVerifiedAt() != null ? user.getPhoneVerifiedAt().toString() : "");
        status.put("maxAttempts", rateLimit.maxAttempts());
        status.put("attemptsUsed", rateLimit.attemptsUsed());
        status.put("attemptsRemaining", rateLimit.attemptsRemaining());
        status.put("windowExpiresAt", rateLimit.windowExpiresAt() != null ? rateLimit.windowExpiresAt().toString() : null);
        status.put("allowed", rateLimit.allowed());

        return ResponseEntity.ok(status);
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
    @GetMapping({"/email/attempt-status", "/email/change-status"})
    public ResponseEntity<?> getEmailChangeAttemptStatus(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        VerificationService.RateLimitStatus status = verificationService.getEmailChangeRateLimitStatus(user.getId());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("maxAttempts", status.maxAttempts());
        body.put("attemptsUsed", status.attemptsUsed());
        body.put("attemptsRemaining", status.attemptsRemaining());
        body.put("windowExpiresAt", status.windowExpiresAt() != null ? status.windowExpiresAt().toString() : null);
        body.put("allowed", status.allowed());
        body.put("cooldownSeconds", 60);
        return ResponseEntity.ok(body);
    }

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

        if (request == null || request.newEmail() == null || request.newEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "New email address is required."));
        }

        try {
            VerificationService.RateLimitStatus status = verificationService.requestEmailChange(user, request.newEmail());
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("message", "Verification code sent to " + maskEmail(request.newEmail()));
            body.put("targetEmail", request.newEmail().trim().toLowerCase());
            body.put("cooldownSeconds", 60);
            body.put("maxAttempts", status.maxAttempts());
            body.put("attemptsUsed", status.attemptsUsed());
            body.put("attemptsRemaining", status.attemptsRemaining());
            body.put("windowExpiresAt", status.windowExpiresAt() != null ? status.windowExpiresAt().toString() : null);
            body.put("allowed", status.allowed());
            body.put("deliveryStatus", "QUEUED");
            return ResponseEntity.ok(body);
        } catch (IllegalStateException ex) {
            VerificationService.RateLimitStatus status = verificationService.getEmailChangeRateLimitStatus(user.getId());
            Map<String, Object> errBody = new LinkedHashMap<>();
            errBody.put("error", ex.getMessage());
            errBody.put("maxAttempts", status.maxAttempts());
            errBody.put("attemptsUsed", status.attemptsUsed());
            errBody.put("attemptsRemaining", status.attemptsRemaining());
            errBody.put("windowExpiresAt", status.windowExpiresAt() != null ? status.windowExpiresAt().toString() : null);
            errBody.put("allowed", status.allowed());
            if (ex.getMessage() != null && ex.getMessage().contains("Failed to deliver")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errBody);
            }
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(errBody);
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
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Email updated and verified successfully.");
            response.put("email", user.getEmail());
            response.put("emailVerified", true);

            if (jwtService != null && userDetailsService != null) {
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
                    String newToken = jwtService.createToken(userDetails);
                    response.put("token", newToken);
                } catch (Exception ex) {
                    // Refreshed token generation is an optional enhancement; do not fail the request
                }
            }

            return ResponseEntity.ok(response);
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
