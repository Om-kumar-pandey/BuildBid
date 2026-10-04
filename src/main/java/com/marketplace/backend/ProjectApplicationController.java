package com.marketplace.backend;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * BUILDBID — PROJECT PROFESSIONAL APPLICATION CONTROLLER
 * 
 * Exposes REST APIs for Post Requirement Multi-Professional Application and Hiring:
 * 
 * PROFESSIONAL APIS:
 * - GET   /api/professional/requirements
 * - GET   /api/professional/requirements/{projectId}
 * - POST  /api/professional/requirements/{projectId}/apply
 * - POST  /api/professional/applications/{applicationId}/withdraw (optional)
 * 
 * REQUESTER APIS:
 * - GET   /api/requester/requirements/{projectId}/applications
 * - PATCH /api/requester/applications/{applicationId}/status
 */
@RestController
public class ProjectApplicationController {

    private final ProjectApplicationService applicationService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public ProjectApplicationController(
            ProjectApplicationService applicationService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.applicationService = applicationService;
        this.userRepository = userRepository;
    }

    // ========================================================
    // 1. PROFESSIONAL DISCOVERY API
    // ========================================================

    /**
     * GET /api/professional/requirements
     * Fetch eligible OPEN Post Requirements for authenticated professional.
     */
    @GetMapping("/api/professional/requirements")
    public ResponseEntity<?> getEligibleRequirements(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }
        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can view requirement opportunities."));
        }

        try {
            List<ProfessionalRequirementDto> requirements = applicationService.getEligibleRequirementsForProfessional(user);
            return ResponseEntity.ok(requirements);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve requirements: " + e.getMessage()));
        }
    }

    // ========================================================
    // 2. PROFESSIONAL REQUIREMENT DETAILS API
    // ========================================================

    /**
     * GET /api/professional/requirements/{projectId}
     * Fetch requirement details and trade quotas for authenticated professional.
     */
    @GetMapping("/api/professional/requirements/{projectId}")
    public ResponseEntity<?> getRequirementDetails(
            @PathVariable("projectId") String projectId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }
        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can view requirement details."));
        }

        try {
            ProfessionalRequirementDetailDto details = applicationService.getRequirementDetailsForProfessional(projectId, user);
            return ResponseEntity.ok(details);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve requirement details: " + e.getMessage()));
        }
    }

    // ========================================================
    // 3. APPLY / SUBMIT QUOTATION API
    // ========================================================

    /**
     * POST /api/professional/requirements/{projectId}/apply
     * Authenticated professional submits a trade-specific application.
     */
    @PostMapping("/api/professional/requirements/{projectId}/apply")
    public ResponseEntity<?> applyToRequirement(
            @PathVariable("projectId") String projectId,
            @Valid @RequestBody ApplicationSubmissionDto submission,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }
        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can apply to requirements."));
        }

        try {
            ProjectProfessionalApplicationDto app = applicationService.applyToRequirement(projectId, submission, user);
            return ResponseEntity.status(HttpStatus.CREATED).body(app);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to submit application: " + e.getMessage()));
        }
    }

    // ========================================================
    // 4. REQUESTER APPLICATIONS LIST API
    // ========================================================

    /**
     * GET /api/requester/requirements/{projectId}/applications
     * Requester reviews candidate applications for their owned Project.
     */
    @GetMapping("/api/requester/requirements/{projectId}/applications")
    public ResponseEntity<?> getApplicationsForRequester(
            @PathVariable("projectId") String projectId,
            @RequestParam(value = "tradeRole", required = false) String tradeRole,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRequesterRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only customers, contractors, or material sellers can manage requirement applications."));
        }

        try {
            List<RequesterApplicationDto> applications = applicationService.getApplicationsForRequester(projectId, tradeRole, user);
            return ResponseEntity.ok(applications);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve applications: " + e.getMessage()));
        }
    }

    // ========================================================
    // 5. ACCEPT / REJECT APPLICATION API
    // ========================================================

    /**
     * PATCH /api/requester/applications/{applicationId}/status
     * Requester updates application status (ACCEPTED, REJECTED, SHORTLISTED).
     */
    @PatchMapping("/api/requester/applications/{applicationId}/status")
    public ResponseEntity<?> updateApplicationStatus(
            @PathVariable("applicationId") String applicationId,
            @Valid @RequestBody ApplicationStatusUpdateDto updateDto,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRequesterRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only customers, contractors, or material sellers can manage requirement applications."));
        }

        try {
            RequesterApplicationDto updated = applicationService.updateApplicationStatus(applicationId, updateDto, user);
            return ResponseEntity.ok(updated);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update application status: " + e.getMessage()));
        }
    }

    // ========================================================
    // 6. PROFESSIONAL WITHDRAWAL API (OPTIONAL)
    // ========================================================

    @PostMapping("/api/professional/applications/{applicationId}/withdraw")
    public ResponseEntity<?> withdrawApplication(
            @PathVariable("applicationId") String applicationId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }
        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can withdraw their application."));
        }

        try {
            ProjectProfessionalApplicationDto withdrawn = applicationService.withdrawApplication(applicationId, user);
            return ResponseEntity.ok(withdrawn);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to withdraw application: " + e.getMessage()));
        }
    }

    // ========================================================
    // HELPER METHODS
    // ========================================================

    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        String principal = authentication.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElse(null);
    }

    private boolean hasProfessionalRole(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER);
    }

    private boolean hasRequesterRole(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().contains(MarketplaceBackendApplication.Role.CUSTOMER)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.CONTRACTOR)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER);
    }
}
