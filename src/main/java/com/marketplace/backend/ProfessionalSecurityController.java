package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * BUILDBID — PHASE 6 & 7: PROFESSIONAL ACCOUNT SETTINGS
 * Security & Login, and Account Activity Controller for Authenticated Professionals
 *
 * Provides:
 * 1. Change Password with server-side BCrypt verification, policy validation, and session invalidation
 * 2. Real-time Security & Login Status (last password update, verified status, session model)
 * 3. Cross-device session invalidation via server-side security timestamp
 * 4. Account Activity & History derived strictly from genuine authenticated database records
 *
 * Strict IDOR and Role Protection enforced via SecurityContextHolder principal and role checks.
 * Never trusts user-supplied identifiers.
 */
@RestController
@RequestMapping({"/api/professional/security", "/api/professional"})
public class ProfessionalSecurityController {

    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProfessionalProfilePhotoRepository professionalProfilePhotoRepository;
    private final UserVerificationRepository userVerificationRepository;
    private final ProjectProfessionalApplicationRepository projectProfessionalApplicationRepository;
    private final ClientServiceRequestRepository clientServiceRequestRepository;

    public ProfessionalSecurityController(
            MarketplaceBackendApplication.UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this(userRepository, passwordEncoder, null, null, null, null);
    }

    @Autowired
    public ProfessionalSecurityController(
            MarketplaceBackendApplication.UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ProfessionalProfilePhotoRepository professionalProfilePhotoRepository,
            UserVerificationRepository userVerificationRepository,
            ProjectProfessionalApplicationRepository projectProfessionalApplicationRepository,
            ClientServiceRequestRepository clientServiceRequestRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.professionalProfilePhotoRepository = professionalProfilePhotoRepository;
        this.userVerificationRepository = userVerificationRepository;
        this.projectProfessionalApplicationRepository = projectProfessionalApplicationRepository;
        this.clientServiceRequestRepository = clientServiceRequestRepository;
    }

    /**
     * Strictly resolves the authenticated Professional from the SecurityContext principal.
     * Prevents IDOR by never accepting a customerId, userId, or profileId from the request.
     * Verifies that the principal holds the PROFESSIONAL or legacy SERVICE_PROVIDER role.
     */
    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedProfessional(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        String principal = authentication.getName();
        if (principal == null || principal.isBlank() || "anonymousUser".equalsIgnoreCase(principal)) {
            return null;
        }

        MarketplaceBackendApplication.MarketplaceUser user = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .or(() -> userRepository.findByEmailIgnoreCase(principal))
                .orElse(null);

        if (user == null || user.getRoles() == null) {
            return null;
        }

        boolean isPro = user.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER);

        if (!isPro) {
            return null;
        }

        return user;
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

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedProfessional(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can access this resource."));
        }

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("email", user.getEmail() != null ? user.getEmail() : "");
        status.put("emailVerified", user.isEmailVerified());
        status.put("emailVerifiedAt", user.getEmailVerifiedAt() != null ? user.getEmailVerifiedAt().toString() : null);
        status.put("phone", user.getPhone() != null ? user.getPhone() : "");
        status.put("phoneVerified", user.isPhoneVerified());
        status.put("phoneVerifiedAt", user.getPhoneVerifiedAt() != null ? user.getPhoneVerifiedAt().toString() : null);
        status.put("passwordUpdatedAt", user.getPasswordUpdatedAt() != null ? user.getPasswordUpdatedAt().toString() : null);
        status.put("hasPassword", user.getPasswordHash() != null && !user.getPasswordHash().isBlank());
        status.put("sessionSecurityModel", "STATELESS_JWT_WITH_TIMESTAMP_INVALIDATION");

        return ResponseEntity.ok(status);
    }

    // ============================================================
    // 2. CHANGE PASSWORD (AUTHENTICATED PROFESSIONAL)
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

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedProfessional(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can perform this action."));
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

        if (request.confirmPassword() == null || request.confirmPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Password confirmation is required.",
                    "message", "Password confirmation is required."
            ));
        }

        // 2. Confirmation match validation
        if (!request.confirmPassword().equals(request.newPassword())) {
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

        // 4. Verify current password server-side against stored BCrypt hash
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
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Password changed successfully. All previous sessions have been invalidated. Please log in again.");
        response.put("passwordUpdatedAt", now.toString());
        response.put("sessionsInvalidated", true);

        return ResponseEntity.ok(response);
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

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedProfessional(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can perform this action."));
        }

        LocalDateTime now = LocalDateTime.now();
        user.setPasswordUpdatedAt(now);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All active sessions have been invalidated. Please log in again.",
                "revokedAt", now.toString(),
                "sessionsInvalidated", true
        ));
    }

    // ============================================================
    // 4. GET ACCOUNT ACTIVITY & HISTORY (AUTHENTICATED PROFESSIONAL)
    // ============================================================
    @GetMapping({"/activity", "/security/activity"})
    public ResponseEntity<?> getAccountActivity(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedProfessional(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can access this resource."));
        }

        List<AccountActivityItem> activities = new ArrayList<>();

        // 1. Account Registration (Identity Creation)
        if (user.getCreatedAt() != null) {
            activities.add(new AccountActivityItem(
                    "reg-" + user.getId(),
                    "ACCOUNT_REGISTRATION",
                    "Professional Account Registered",
                    "IDENTITY",
                    user.getCreatedAt().toString(),
                    "Completed",
                    "BuildBid professional account created for " + (user.getName() != null ? user.getName() : "Professional")
            ));
        }

        // 2. Email Verification
        if (user.isEmailVerified() && user.getEmailVerifiedAt() != null) {
            activities.add(new AccountActivityItem(
                    "verif-email-" + user.getId(),
                    "EMAIL_VERIFIED",
                    "Email Address Verified",
                    "VERIFICATION",
                    user.getEmailVerifiedAt().toString(),
                    "Verified",
                    "Primary email verified: " + (user.getEmail() != null ? user.getEmail() : "")
            ));
        }

        // 3. Phone Verification
        if (user.isPhoneVerified() && user.getPhoneVerifiedAt() != null) {
            activities.add(new AccountActivityItem(
                    "verif-phone-" + user.getId(),
                    "PHONE_VERIFIED",
                    "Mobile Phone Verified",
                    "VERIFICATION",
                    user.getPhoneVerifiedAt().toString(),
                    "Verified",
                    "Primary phone verified: " + (user.getPhone() != null ? user.getPhone() : "")
            ));
        }

        // 4. Password / Session Invalidation
        if (user.getPasswordUpdatedAt() != null) {
            activities.add(new AccountActivityItem(
                    "sec-pwd-" + user.getId(),
                    "SECURITY_CREDENTIAL_UPDATE",
                    "Password Updated & Sessions Revoked",
                    "SECURITY",
                    user.getPasswordUpdatedAt().toString(),
                    "Completed",
                    "Cryptographic credentials refreshed and prior JWT sessions invalidated"
            ));
        }

        // 5. Account Deactivation (if any)
        if (user.getDeactivatedAt() != null) {
            activities.add(new AccountActivityItem(
                    "acc-deact-" + user.getId(),
                    "ACCOUNT_DEACTIVATED",
                    "Account Listing Paused",
                    "ACCOUNT",
                    user.getDeactivatedAt().toString(),
                    "Deactivated",
                    "Professional public discovery paused"
            ));
        }

        // 6. Profile Photo History
        if (professionalProfilePhotoRepository != null) {
            try {
                Optional<ProfessionalProfilePhoto> photoOpt = professionalProfilePhotoRepository.findByUserId(user.getId());
                if (photoOpt.isPresent()) {
                    ProfessionalProfilePhoto photo = photoOpt.get();
                    if (photo.getCreatedAt() != null) {
                        activities.add(new AccountActivityItem(
                                "photo-created-" + photo.getId(),
                                "PROFILE_PHOTO_UPLOADED",
                                "Profile Photo Uploaded",
                                "PROFILE",
                                photo.getCreatedAt().toString(),
                                "Active",
                                photo.getFileName() != null ? "File: " + photo.getFileName() : "New profile headshot uploaded"
                        ));
                    }
                    if (photo.getUpdatedAt() != null && !photo.getUpdatedAt().equals(photo.getCreatedAt())) {
                        activities.add(new AccountActivityItem(
                                "photo-updated-" + photo.getId(),
                                "PROFILE_PHOTO_UPDATED",
                                "Profile Photo Updated",
                                "PROFILE",
                                photo.getUpdatedAt().toString(),
                                "Active",
                                photo.getFileName() != null ? "Updated: " + photo.getFileName() : "Profile picture refreshed"
                        ));
                    }
                }
            } catch (Exception e) {
                // Continue gracefully
            }
        }

        // 7. User Verification Code Events
        if (userVerificationRepository != null) {
            try {
                List<UserVerification> verifs = userVerificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
                if (verifs != null) {
                    for (UserVerification v : verifs) {
                        String title;
                        String cat = "VERIFICATION";
                        String status = v.isUsed() ? "Verified" : (v.isExpired() ? "Expired" : "Pending");
                        String target = v.getTargetValue() != null ? v.getTargetValue() : "";
                        switch (v.getVerificationType()) {
                            case EMAIL_CHANGE -> title = "Email Change Verification Code";
                            case EMAIL_VERIFICATION -> title = "Email Verification Code";
                            case PHONE_VERIFICATION -> title = "Phone Verification Code";
                            case PHONE_CHANGE -> title = "Phone Change Verification Code";
                            case PERMANENT_ACCOUNT_DELETION -> {
                                title = "Account Deletion Code";
                                cat = "SECURITY";
                            }
                            default -> title = "Verification Code";
                        }
                        activities.add(new AccountActivityItem(
                                "verif-" + v.getId(),
                                v.getVerificationType().name(),
                                title,
                                cat,
                                v.getCreatedAt() != null ? v.getCreatedAt().toString() : null,
                                status,
                                "Target: " + (target.length() > 3 ? maskTarget(target) : target)
                        ));
                    }
                }
            } catch (Exception e) {
                // Continue gracefully
            }
        }

        // 8. Project Applications
        if (projectProfessionalApplicationRepository != null) {
            try {
                List<ProjectProfessionalApplication> apps = projectProfessionalApplicationRepository.findByProfessionalIdOrderByCreatedAtDesc(user.getId());
                if (apps != null) {
                    for (ProjectProfessionalApplication app : apps) {
                        String projTitle = (app.getProject() != null && app.getProject().getTitle() != null)
                                ? app.getProject().getTitle()
                                : "Requirement #" + (app.getProject() != null ? app.getProject().getId() : "");
                        activities.add(new AccountActivityItem(
                                "ppa-" + app.getId(),
                                "PROJECT_APPLICATION",
                                "Applied for Requirement: " + projTitle,
                                "PROJECTS",
                                app.getCreatedAt() != null ? app.getCreatedAt().toString() : null,
                                app.getStatus() != null ? app.getStatus().name() : "APPLIED",
                                "Role: " + (app.getTradeRole() != null ? app.getTradeRole() : "Professional") +
                                        (app.getProposedRate() != null ? " | Proposed Rate: ₹" + app.getProposedRate() : "")
                        ));
                    }
                }
            } catch (Exception e) {
                // Continue gracefully
            }
        }

        // 9. Client Consultation Requests
        if (clientServiceRequestRepository != null) {
            try {
                List<ClientServiceRequest> requests = clientServiceRequestRepository.findByProfessional_IdOrderByCreatedAtDesc(user.getId());
                if (requests != null) {
                    for (ClientServiceRequest r : requests) {
                        String sName = r.getRequestedService() != null ? r.getRequestedService() : (r.getProjectName() != null ? r.getProjectName() : "Direct Hire");
                        activities.add(new AccountActivityItem(
                                "csr-" + r.getId(),
                                "SERVICE_REQUEST",
                                "Consultation Request: " + sName,
                                "SERVICES",
                                r.getCreatedAt() != null ? r.getCreatedAt().toString() : null,
                                r.getStatus() != null ? r.getStatus() : "SUBMITTED",
                                "Client Request Ref: " + (r.getRequestId() != null ? r.getRequestId() : "#" + r.getId())
                        ));
                    }
                }
            } catch (Exception e) {
                // Continue gracefully
            }
        }

        // Sort descending by timestamp
        activities.sort((a, b) -> {
            if (a.timestamp() == null && b.timestamp() == null) return 0;
            if (a.timestamp() == null) return 1;
            if (b.timestamp() == null) return -1;
            return b.timestamp().compareTo(a.timestamp());
        });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", activities.size());
        result.put("activities", activities);

        return ResponseEntity.ok(result);
    }

    private String maskTarget(String target) {
        if (target == null || target.length() < 4) return "***";
        if (target.contains("@")) {
            int atIdx = target.indexOf('@');
            if (atIdx > 2) {
                return target.charAt(0) + "***" + target.charAt(atIdx - 1) + target.substring(atIdx);
            }
            return target.charAt(0) + "***" + target.substring(atIdx);
        }
        return "***" + target.substring(target.length() - 4);
    }

    // DTO for Change Password
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChangePasswordRequest(
            String currentPassword,
            String newPassword,
            String confirmPassword
    ) {}

    // DTO for Activity Item
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AccountActivityItem(
            String id,
            String eventType,
            String title,
            String category,
            String timestamp,
            String status,
            String details
    ) {}
}
