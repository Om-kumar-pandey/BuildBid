package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 3
 * Security & Login Controller
 *
 * Provides:
 * 1. Change Password with server-side BCrypt verification, policy validation, and session invalidation
 * 2. Current Login & Security Status information
 * 3. Cross-device session invalidation via server-side security timestamp
 *
 * Strict IDOR and Customer Role Protection enforced via SecurityContextHolder.
 */
@RestController
@RequestMapping({"/api/customer/security", "/api/security"})
public class CustomerSecurityController {

    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public CustomerSecurityController(
            MarketplaceBackendApplication.UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Strictly resolves the authenticated customer from SecurityContextHolder.
     * Prevents IDOR by never accepting a customerId, userId, or profileId from the request.
     */
    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedCustomer(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        boolean isCustomer = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER") || a.getAuthority().equals("CUSTOMER"));
        if (!isCustomer) {
            return null;
        }

        String principal = authentication.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .or(() -> userRepository.findByEmailIgnoreCase(principal))
                .orElse(null);
    }

    // ============================================================
    // 1. GET SECURITY & LOGIN STATUS
    // ============================================================
    @GetMapping("/status")
    public ResponseEntity<?> getSecurityStatus(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        Map<String, Object> status = new HashMap<>();
        status.put("email", user.getEmail() != null ? user.getEmail() : "");
        status.put("emailVerified", user.isEmailVerified());
        status.put("emailVerifiedAt", user.getEmailVerifiedAt() != null ? user.getEmailVerifiedAt().toString() : null);
        status.put("phone", user.getPhone() != null ? user.getPhone() : "");
        status.put("phoneVerified", user.isPhoneVerified());
        status.put("phoneVerifiedAt", user.getPhoneVerifiedAt() != null ? user.getPhoneVerifiedAt().toString() : null);
        status.put("passwordUpdatedAt", user.getPasswordUpdatedAt() != null ? user.getPasswordUpdatedAt().toString() : null);
        status.put("hasPassword", user.getPasswordHash() != null && !user.getPasswordHash().isBlank());
        status.put("memberSince", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        status.put("sessionSecurityModel", "STATELESS_JWT_WITH_TIMESTAMP_INVALIDATION");

        return ResponseEntity.ok(status);
    }

    // ============================================================
    // 2. CHANGE PASSWORD (AUTHENTICATED CUSTOMER)
    // ============================================================
    @PutMapping("/password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        // 1. Required field validations
        if (request == null || request.currentPassword() == null || request.currentPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Current password is required.",
                    "message", "Current password is required."
            ));
        }

        if (request.newPassword() == null || request.newPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "New password is required.",
                    "message", "New password is required."
            ));
        }

        // 2. Confirmation match validation
        if (request.confirmPassword() != null && !request.confirmPassword().equals(request.newPassword())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "New password and confirmation do not match.",
                    "message", "New password and confirmation do not match."
            ));
        }

        // 3. Password policy enforcement
        String newPassword = request.newPassword();
        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "New password must be at least 8 characters in length.",
                    "message", "New password must be at least 8 characters in length."
            ));
        }

        if (newPassword.length() > 100) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "New password must not exceed 100 characters.",
                    "message", "New password must not exceed 100 characters."
            ));
        }

        // 4. Verify current password server-side against BCrypt hash
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Current password is incorrect.",
                    "message", "Current password is incorrect."
            ));
        }

        // 5. Prevent password reuse (new password cannot equal current password)
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "New password cannot be the same as your current password.",
                    "message", "New password cannot be the same as your current password."
            ));
        }

        // 6. Generate new BCrypt hash and update security timestamp
        String newHash = passwordEncoder.encode(newPassword);
        LocalDateTime now = LocalDateTime.now();

        user.setPasswordHash(newHash);
        user.setPasswordUpdatedAt(now);
        userRepository.save(user);

        // 7. Safe success response (never expose passwords, hashes, or secrets)
        return ResponseEntity.ok(Map.of(
                "message", "Password changed successfully. All previous sessions have been invalidated.",
                "passwordUpdatedAt", now.toString(),
                "sessionsInvalidated", true
        ));
    }

    // ============================================================
    // 3. LOGOUT ALL SESSIONS / REVOKE TOKENS
    // ============================================================
    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAllSessions(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        LocalDateTime now = LocalDateTime.now();
        user.setPasswordUpdatedAt(now);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "All sessions have been revoked. Please log in again.",
                "revokedAt", now.toString(),
                "sessionsInvalidated", true
        ));
    }

    // DTO for Change Password
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChangePasswordRequest(
            String currentPassword,
            String newPassword,
            String confirmPassword
    ) {}
}
