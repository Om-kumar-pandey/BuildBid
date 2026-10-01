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
    private final ProfessionalServiceRepository professionalServiceRepository;

    @Autowired
    public ClientServiceRequestController(
            ClientServiceRequestService requestService,
            MarketplaceBackendApplication.UserRepository userRepository,
            ProfessionalServiceRepository professionalServiceRepository
    ) {
        this.requestService = requestService;
        this.userRepository = userRepository;
        this.professionalServiceRepository = professionalServiceRepository;
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

    /**
     * POST /api/professional/requests
     * Create a new ClientServiceRequest from an authenticated user (Customer, Contractor, Material Seller).
     */
    @PostMapping
    public ResponseEntity<?> createRequest(
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser clientUser = getAuthenticatedUser(authentication);
        if (clientUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to send a service request."));
        }

        // Determine requester type from authenticated user's roles
        String requesterType = "CUSTOMER";
        Set<MarketplaceBackendApplication.Role> roles = clientUser.getRoles();
        if (roles != null) {
            if (roles.contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER)
                    || roles.contains(MarketplaceBackendApplication.Role.SELLER)) {
                requesterType = "MATERIAL_SELLER";
            } else if (roles.contains(MarketplaceBackendApplication.Role.CONTRACTOR)) {
                requesterType = "CONTRACTOR";
            } else if (roles.contains(MarketplaceBackendApplication.Role.CUSTOMER)) {
                requesterType = "CUSTOMER";
            } else if (roles.contains(MarketplaceBackendApplication.Role.PROFESSIONAL)
                    || roles.contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER)) {
                requesterType = "PROFESSIONAL";
            }
        }
        // If payload explicitly specifies role and user has it, respect it
        if (payload != null && payload.get("requesterType") != null) {
            String specified = payload.get("requesterType").toString().trim().toUpperCase();
            if ((specified.equals("MATERIAL_SELLER") || specified.equals("SELLER"))
                    && roles != null && (roles.contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER) || roles.contains(MarketplaceBackendApplication.Role.SELLER))) {
                requesterType = "MATERIAL_SELLER";
            } else if (specified.equals("CONTRACTOR") && roles != null && roles.contains(MarketplaceBackendApplication.Role.CONTRACTOR)) {
                requesterType = "CONTRACTOR";
            } else if (specified.equals("CUSTOMER") && roles != null && roles.contains(MarketplaceBackendApplication.Role.CUSTOMER)) {
                requesterType = "CUSTOMER";
            }
        }

        // Identify receiver professional and professionalServiceId
        MarketplaceBackendApplication.MarketplaceUser professional = null;
        Long professionalServiceId = null;
        String requestedService = null;

        Object serviceIdObj = payload != null ? (payload.get("professionalServiceId") != null ? payload.get("professionalServiceId") : payload.get("serviceId")) : null;
        if (serviceIdObj != null) {
            try {
                professionalServiceId = Long.parseLong(serviceIdObj.toString().trim());
                Optional<ProfessionalService> srvOpt = professionalServiceRepository.findById(professionalServiceId);
                if (srvOpt.isPresent()) {
                    ProfessionalService srv = srvOpt.get();
                    professional = srv.getProfessional();
                    if (requestedService == null && srv.getServiceTitleEn() != null) {
                        requestedService = srv.getServiceTitleEn();
                    }
                }
            } catch (NumberFormatException ignored) {}
        }

        if (professional == null && payload != null && payload.get("professionalId") != null) {
            try {
                Long proId = Long.parseLong(payload.get("professionalId").toString().trim());
                professional = userRepository.findById(proId).orElse(null);
            } catch (NumberFormatException ignored) {}
        }

        if (professional == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid professional or serviceId is required."));
        }

        if (payload != null) {
            if (payload.get("requestedService") != null && !payload.get("requestedService").toString().trim().isEmpty()) {
                requestedService = payload.get("requestedService").toString().trim();
            } else if (payload.get("serviceTitle") != null && !payload.get("serviceTitle").toString().trim().isEmpty()) {
                requestedService = payload.get("serviceTitle").toString().trim();
            } else if (payload.get("service") != null && !payload.get("service").toString().trim().isEmpty()) {
                requestedService = payload.get("service").toString().trim();
            }
        }
        if (requestedService == null || requestedService.trim().isEmpty()) {
            requestedService = "Direct Hire Service";
        }

        String clientName = clientUser.getName() != null && !clientUser.getName().trim().isEmpty()
                ? clientUser.getName()
                : (clientUser.getUsername() != null ? clientUser.getUsername() : "Client");
        if (payload != null && payload.get("clientName") != null && !payload.get("clientName").toString().trim().isEmpty()) {
            clientName = payload.get("clientName").toString().trim();
        }

        String clientEmail = clientUser.getEmail();
        if (payload != null && payload.get("clientEmail") != null && !payload.get("clientEmail").toString().trim().isEmpty()) {
            clientEmail = payload.get("clientEmail").toString().trim();
        }

        String clientPhone = clientUser.getPhone();
        if (payload != null && payload.get("clientPhone") != null && !payload.get("clientPhone").toString().trim().isEmpty()) {
            clientPhone = payload.get("clientPhone").toString().trim();
        }

        String projectName = requestedService + " Request";
        if (payload != null) {
            if (payload.get("projectName") != null && !payload.get("projectName").toString().trim().isEmpty()) {
                projectName = payload.get("projectName").toString().trim();
            } else if (payload.get("project") != null && !payload.get("project").toString().trim().isEmpty()) {
                projectName = payload.get("project").toString().trim();
            }
        }

        String projectScope = null;
        if (payload != null) {
            if (payload.get("projectScope") != null) {
                projectScope = payload.get("projectScope").toString().trim();
            } else if (payload.get("description") != null) {
                projectScope = payload.get("description").toString().trim();
            } else if (payload.get("desc") != null) {
                projectScope = payload.get("desc").toString().trim();
            }
        }

        String location = clientUser.getLocation() != null ? clientUser.getLocation() : "";
        if (payload != null && payload.get("location") != null && !payload.get("location").toString().trim().isEmpty()) {
            location = payload.get("location").toString().trim();
        }

        String distance = null;
        if (payload != null && payload.get("distance") != null) {
            distance = payload.get("distance").toString().trim();
        }

        String targetDate = null;
        if (payload != null) {
            if (payload.get("targetDate") != null) {
                targetDate = payload.get("targetDate").toString().trim();
            } else if (payload.get("date") != null) {
                targetDate = payload.get("date").toString().trim();
            } else if (payload.get("turnaround") != null) {
                targetDate = payload.get("turnaround").toString().trim();
            }
        }

        Double clientBudget = null;
        if (payload != null) {
            Object budgetObj = payload.get("clientBudget") != null ? payload.get("clientBudget") : payload.get("budget");
            if (budgetObj != null) {
                try {
                    String bStr = budgetObj.toString().replaceAll("[^0-9.]", "").trim();
                    if (!bStr.isEmpty()) {
                        clientBudget = Double.parseDouble(bStr);
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        ClientServiceRequest request = new ClientServiceRequest();
        request.setProfessional(professional);
        request.setClient(clientUser);
        request.setClientName(clientName);
        request.setClientEmail(clientEmail);
        request.setClientPhone(clientPhone);
        request.setRequesterType(requesterType);
        request.setProjectName(projectName);
        request.setRequestedService(requestedService);
        request.setProfessionalServiceId(professionalServiceId);
        request.setLocation(location);
        request.setDistance(distance);
        request.setTargetDate(targetDate);
        request.setClientBudget(clientBudget);
        request.setStatus("New");
        request.setProjectScope(projectScope);

        ClientServiceRequest created = requestService.createRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toRequestMap(created));
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
