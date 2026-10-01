package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/professional/requests")
public class ClientServiceRequestController {

    private final ClientServiceRequestService requestService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public ClientServiceRequestController(
            ClientServiceRequestService requestService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.requestService = requestService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/professional/requests
     * Fetch all client service requests for the authenticated professional.
     */
    @GetMapping
    public ResponseEntity<?> getMyRequests(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can view service requests."));
        }

        List<ClientServiceRequest> requests = requestService.getRequestsForProfessional(user);
        List<Map<String, Object>> response = new ArrayList<>();
        for (ClientServiceRequest req : requests) {
            response.add(toRequestMap(req));
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/professional/requests/count
     * Dynamic counter endpoint for the sidebar badge and dashboard stat cards.
     */
    @GetMapping("/count")
    public ResponseEntity<?> getRequestCount(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized."));
        }

        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied."));
        }

        long totalCount = requestService.getRequestCount(user);
        long newCount = requestService.getNewRequestCount(user);

        return ResponseEntity.ok(Map.of(
                "total", totalCount,
                "count", totalCount,
                "new", newCount
        ));
    }

    /**
     * PATCH /api/professional/requests/{id}/status
     * Update request status (e.g. Accept or Decline).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable("id") String id,
            @RequestBody Map<String, String> payload,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized."));
        }

        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied."));
        }

        String status = payload.get("status");
        if (status == null || status.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required."));
        }

        try {
            ClientServiceRequest updated = requestService.updateStatus(id, status, user);
            return ResponseEntity.ok(toRequestMap(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/professional/requests/demo-seed
     * Seeds initial demo requests for testing if the professional has no requests.
     */
    @PostMapping("/demo-seed")
    public ResponseEntity<?> seedDemo(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized."));
        }

        if (!hasProfessionalRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied."));
        }

        List<ClientServiceRequest> list = requestService.seedDemoRequestsIfEmpty(user);
        List<Map<String, Object>> response = new ArrayList<>();
        for (ClientServiceRequest req : list) {
            response.add(toRequestMap(req));
        }
        return ResponseEntity.ok(response);
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

    /**
     * Maps ClientServiceRequest to a clean, privacy-respecting response.
     * Strictly avoids exposing passwords, tokens, private phone/email, or documents.
     */
    private Map<String, Object> toRequestMap(ClientServiceRequest req) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", req.getRequestId() != null ? req.getRequestId() : ("REQ-" + req.getId()));
        map.put("numericId", req.getId());
        map.put("requestId", req.getRequestId());
        map.put("project", req.getProjectName());
        map.put("customer", req.getClientName());
        map.put("service", req.getRequestedService());
        map.put("location", req.getLocation() != null ? req.getLocation() : "");
        map.put("distance", req.getDistance() != null ? req.getDistance() : "");
        map.put("date", req.getTargetDate() != null ? req.getTargetDate() : "");

        // Client Budget: if unavailable, return null so frontend displays "--"
        if (req.getClientBudget() != null && req.getClientBudget() > 0) {
            map.put("budget", "₹" + String.format(Locale.ENGLISH, "%,.0f", req.getClientBudget()));
            map.put("rawBudget", req.getClientBudget());
        } else {
            map.put("budget", null);
            map.put("rawBudget", null);
        }

        map.put("status", req.getStatus() != null ? req.getStatus() : "New");
        map.put("desc", req.getProjectScope() != null ? req.getProjectScope() : "");
        map.put("time", calculateTimeAgo(req.getCreatedAt()));
        map.put("requesterType", req.getRequesterType() != null ? req.getRequesterType() : "CUSTOMER");
        map.put("createdAt", req.getCreatedAt());

        return map;
    }

    private String calculateTimeAgo(LocalDateTime dt) {
        if (dt == null) return "Recently";
        java.time.Duration diff = java.time.Duration.between(dt, LocalDateTime.now());
        long minutes = diff.toMinutes();
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + " mins ago";
        long hours = diff.toHours();
        if (hours < 24) return hours + " hrs ago";
        long days = diff.toDays();
        if (days < 30) return days + (days == 1 ? " day ago" : " days ago");
        return dt.toLocalDate().toString();
    }
}
