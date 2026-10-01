package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller exposing REST endpoints for:
 * 
 * 1. Professional Service Operations (Authenticated Professional only):
 *    - GET    /api/professional/services
 *    - POST   /api/professional/services
 *    - PATCH  /api/professional/services/{id}/toggle
 *    - DELETE /api/professional/services/{id}
 * 
 * 2. Public Service Catalog & Direct Hire endpoints (Public):
 *    - GET    /api/public/professionals/{id}/services
 *    - GET    /api/public/master-catalog
 *    - GET    /api/public/master-catalog/categories
 *    - GET    /api/public/master-catalog/services
 * 
 * 3. Administrative Verification Foundation (Admin only):
 *    - PATCH  /api/admin/services/{id}/verify
 */
@RestController
public class ProfessionalServiceController {

    private final ProfessionalServiceService professionalServiceService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public ProfessionalServiceController(
            ProfessionalServiceService professionalServiceService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.professionalServiceService = professionalServiceService;
        this.userRepository = userRepository;
    }

    // ========================================================
    // 1. AUTHENTICATED PROFESSIONAL SERVICE ENDPOINTS
    // ========================================================

    /**
     * Get all services published by the authenticated professional.
     */
    @GetMapping("/api/professional/services")
    public ResponseEntity<?> getMyServices(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can view this catalog."));
        }

        List<ProfessionalService> services = professionalServiceService.getServicesForProfessional(user);
        List<Map<String, Object>> response = new ArrayList<>();
        for (ProfessionalService s : services) {
            response.add(toServiceMap(s, false));
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Publish a new service for the authenticated professional.
     */
    @PostMapping("/api/professional/services")
    public ResponseEntity<?> createService(
            @RequestBody ProfessionalServiceService.ProfessionalServiceRequest request,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can publish services."));
        }

        try {
            ProfessionalService created = professionalServiceService.createService(user, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(toServiceMap(created, false));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create service: " + e.getMessage()));
        }
    }

    /**
     * Toggle active status of a published service.
     */
    @PatchMapping("/api/professional/services/{id}/toggle")
    public ResponseEntity<?> toggleService(
            @PathVariable("id") Long id,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        try {
            ProfessionalService updated = professionalServiceService.toggleServiceStatus(user, id);
            return ResponseEntity.ok(toServiceMap(updated, false));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to toggle service status: " + e.getMessage()));
        }
    }

    /**
     * Delete a published service.
     */
    @DeleteMapping("/api/professional/services/{id}")
    public ResponseEntity<?> deleteService(
            @PathVariable("id") Long id,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        try {
            professionalServiceService.deleteService(user, id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Service deleted successfully — सेवा सफलतापूर्वक हटा दी गई"
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete service: " + e.getMessage()));
        }
    }

    // ========================================================
    // 2. PUBLIC SERVICE & DIRECT HIRE ENDPOINTS
    // ========================================================

    /**
     * Public endpoint for Customer Direct Hire:
     * Returns active services published by a professional.
     * Basic services are returned if active; credential services are returned only if VERIFIED.
     */
    @GetMapping("/api/public/professionals/{id}/services")
    public ResponseEntity<?> getPublicProfessionalServices(@PathVariable("id") Long professionalId) {
        List<ProfessionalService> services = professionalServiceService.getPublicServicesForProfessional(professionalId);
        List<Map<String, Object>> response = new ArrayList<>();
        for (ProfessionalService s : services) {
            response.add(toServiceMap(s, false));
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Public endpoint: Get full hierarchical master service catalog.
     */
    @GetMapping("/api/public/master-catalog")
    public ResponseEntity<?> getFullMasterCatalog() {
        return ResponseEntity.ok(professionalServiceService.getFullMasterCatalogHierarchy());
    }

    /**
     * Public endpoint: Get all active service categories.
     */
    @GetMapping("/api/public/master-catalog/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(professionalServiceService.getAllActiveCategories());
    }

    /**
     * Public endpoint: Get all active master services (optional category filter).
     */
    @GetMapping("/api/public/master-catalog/services")
    public ResponseEntity<?> getMasterServices(@RequestParam(value = "categoryId", required = false) Long categoryId) {
        if (categoryId != null) {
            return ResponseEntity.ok(professionalServiceService.getMasterServicesByCategory(categoryId));
        }
        return ResponseEntity.ok(professionalServiceService.getAllActiveMasterServices());
    }

    /**
     * Public search endpoint for Direct Hire (used by Customer, Contractor, Professional):
     * Searches active and eligible professional services across all registered professionals.
     * Supports optional filtering by masterServiceId, categoryId, and location.
     *
     * Privacy guarantee: phone, email, documentData, and password hashes are strictly excluded.
     */
    @GetMapping("/api/public/direct-hire/search")
    public ResponseEntity<?> searchDirectHire(
            @RequestParam(value = "masterServiceId", required = false) Long masterServiceId,
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "locationScope", required = false) String locationScope,
            @RequestParam(value = "pincode", required = false) String pincode,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude,
            @RequestParam(value = "radiusKm", required = false) Double radiusKm
    ) {
        List<ProfessionalServiceService.DirectHireSearchResult> results = professionalServiceService.searchDirectHireServicesAdvanced(
                masterServiceId,
                categoryId,
                locationScope,
                location,
                pincode,
                state,
                city,
                district,
                latitude,
                longitude,
                radiusKm
        );

        List<Map<String, Object>> response = new ArrayList<>();
        for (ProfessionalServiceService.DirectHireSearchResult r : results) {
            Map<String, Object> card = toDirectHireCardMap(r.service());
            card.put("distanceKm", r.distanceKm());
            card.put("matchPriority", r.matchPriority());
            card.put("professionalPincode", r.professionalPincode());
            card.put("professionalDistrict", r.professionalDistrict());
            card.put("professionalState", r.professionalState());
            response.add(card);
        }
        return ResponseEntity.ok(response);
    }


    // ========================================================
    // 3. ADMIN VERIFICATION FOUNDATION
    // ========================================================

    /**
     * Admin-only verification endpoint (PENDING -> VERIFIED / REJECTED).
     */
    @PatchMapping("/api/admin/services/{id}/verify")
    public ResponseEntity<?> verifyService(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser admin = getAuthenticatedUser(authentication);
        if (admin == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Administrator login required."));
        }

        // Check if user has administrative rights or is admin
        boolean isAdmin = admin.getRoles().stream()
                .anyMatch(r -> r.name().equalsIgnoreCase("ADMIN") || r.name().equalsIgnoreCase("ROLE_ADMIN"));
        
        // If system doesn't have an ADMIN role yet, disallow regular professionals from verifying services
        if (!isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only BuildBid administrators can verify credentials."));
        }

        boolean approved = Boolean.TRUE.equals(payload.get("approved"));
        String reason = payload.get("reason") != null ? payload.get("reason").toString() : "";

        try {
            ProfessionalService updated = professionalServiceService.adminVerifyService(id, approved, reason);
            return ResponseEntity.ok(toServiceMap(updated, false));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update verification status: " + e.getMessage()));
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

    private Map<String, Object> toServiceMap(ProfessionalService s, boolean includeDocument) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId());
        map.put("professionalId", s.getProfessionalId());
        map.put("professionalName", s.getProfessionalName());
        map.put("professionalLocation", s.getProfessionalLocation());

        if (s.getMasterService() != null) {
            map.put("masterServiceId", s.getMasterService().getId());
            map.put("masterServiceTitleEn", s.getMasterService().getTitleEn());
            map.put("masterServiceTitleHi", s.getMasterService().getTitleHi());
            if (s.getMasterService().getCategory() != null) {
                map.put("categoryId", s.getMasterService().getCategory().getId());
                map.put("categoryCode", s.getMasterService().getCategory().getCode());
                map.put("categoryNameEn", s.getMasterService().getCategory().getNameEn());
                map.put("categoryNameHi", s.getMasterService().getCategory().getNameHi());
                map.put("categoryIcon", s.getMasterService().getCategory().getIcon());
            }
        }

        map.put("serviceTitleEn", s.getServiceTitleEn());
        map.put("serviceTitleHi", s.getServiceTitleHi());
        map.put("shortDescription", s.getShortDescription());
        map.put("detailedDescription", s.getDetailedDescription());
        map.put("whatsIncluded", s.getWhatsIncluded());
        map.put("whatsNotIncluded", s.getWhatsNotIncluded());
        map.put("price", s.getPrice());
        map.put("pricingUnit", s.getPricingUnit());
        map.put("turnaroundTime", s.getTurnaroundTime());
        map.put("serviceAreaRadiusKm", s.getServiceAreaRadiusKm());
        map.put("serviceMode", s.getServiceMode());
        map.put("verificationRequired", s.isVerificationRequired());
        map.put("verificationStatus", s.getVerificationStatus().name());
        map.put("qualificationTitle", s.getQualificationTitle());
        map.put("licenseNumber", s.getLicenseNumber());
        map.put("issuingAuthority", s.getIssuingAuthority());
        map.put("documentName", s.getDocumentName());
        map.put("documentType", s.getDocumentType());
        map.put("hasDocument", s.hasDocument());
        if (includeDocument) {
            map.put("documentData", s.getDocumentData());
        }
        map.put("active", s.isActive());
        map.put("createdAt", s.getCreatedAt());
        map.put("updatedAt", s.getUpdatedAt());

        return map;
    }

    /**
     * Maps a ProfessionalService to a public Direct Hire result card.
     * Strictly omits private fields (phone, email, passwordHash, documentData).
     */
    private Map<String, Object> toDirectHireCardMap(ProfessionalService s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("serviceId", s.getId());
        map.put("professionalId", s.getProfessionalId());
        map.put("professionalName", s.getProfessionalName());
        map.put("professionalLocation", s.getProfessionalLocation());
        map.put("profilePhotoUrl", s.getProfessional() != null ? s.getProfessional().getProfilePhotoUrl() : null);

        if (s.getMasterService() != null) {
            map.put("masterServiceId", s.getMasterService().getId());
            map.put("serviceName", s.getMasterService().getTitleEn());
            map.put("masterServiceTitleEn", s.getMasterService().getTitleEn());
            map.put("masterServiceTitleHi", s.getMasterService().getTitleHi());
            if (s.getMasterService().getCategory() != null) {
                map.put("categoryId", s.getMasterService().getCategory().getId());
                map.put("categoryCode", s.getMasterService().getCategory().getCode());
                map.put("categoryNameEn", s.getMasterService().getCategory().getNameEn());
                map.put("categoryNameHi", s.getMasterService().getCategory().getNameHi());
                map.put("categoryIcon", s.getMasterService().getCategory().getIcon());
            }
        } else {
            map.put("serviceName", s.getServiceTitleEn());
        }

        map.put("serviceTitleEn", s.getServiceTitleEn());
        map.put("serviceTitleHi", s.getServiceTitleHi());
        map.put("shortDescription", s.getShortDescription());
        map.put("detailedDescription", s.getDetailedDescription());
        map.put("whatsIncluded", s.getWhatsIncluded());
        map.put("whatsNotIncluded", s.getWhatsNotIncluded());
        map.put("price", s.getPrice());
        map.put("pricingUnit", s.getPricingUnit());
        map.put("turnaroundTime", s.getTurnaroundTime());
        map.put("serviceAreaRadiusKm", s.getServiceAreaRadiusKm());
        map.put("serviceMode", s.getServiceMode());
        map.put("verificationRequired", s.isVerificationRequired());
        map.put("verificationStatus", s.getVerificationStatus().name());
        map.put("qualificationTitle", s.getQualificationTitle());
        map.put("licenseNumber", s.getLicenseNumber());
        map.put("issuingAuthority", s.getIssuingAuthority());
        map.put("createdAt", s.getCreatedAt());

        return map;
    }
}

