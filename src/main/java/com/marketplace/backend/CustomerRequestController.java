package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Controller strictly dedicated to the Customer "My Requests" module.
 * 
 * STRICT ARCHITECTURAL RULE:
 * This controller aggregates ONLY genuine customer request submissions:
 * 1. material_requests (Direct Buy & Material Post Requirement)
 * 2. client_service_requests (Direct Hire & Service Requests)
 * 
 * EXPLICITLY EXCLUDED:
 * Projects created via 'My Projects -> Post New Project' (projects table)
 * MUST NEVER appear in My Requests.
 */
@RestController
@RequestMapping("/api/customer")
public class CustomerRequestController {

    private final MaterialRequestRepository materialRequestRepository;
    private final ClientServiceRequestRepository clientServiceRequestRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    @Autowired
    public CustomerRequestController(
            MaterialRequestRepository materialRequestRepository,
            ClientServiceRequestRepository clientServiceRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.materialRequestRepository = materialRequestRepository;
        this.clientServiceRequestRepository = clientServiceRequestRepository;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/customer/my-requests
     * Aggregates only genuine customer request submissions belonging to the logged-in customer.
     * ZERO queries to ProjectRepository / projects table.
     */
    @GetMapping({"/my-requests", "/requests"})
    public ResponseEntity<?> getCustomerMyRequests(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login to view your requests."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Customer account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser customer = userOpt.get();
        List<Map<String, Object>> aggregatedRequests = new ArrayList<>();

        // 1. Material Requests (Direct Material Purchase & Material Requirements)
        List<MaterialRequest> materialRequests = materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customer);
        if (materialRequests != null) {
            for (MaterialRequest mr : materialRequests) {
                aggregatedRequests.add(mapMaterialRequestToCard(mr));
            }
        }

        // 2. Direct Hire Service Requests
        List<ClientServiceRequest> hireRequests = clientServiceRequestRepository.findByClient_IdOrderByCreatedAtDesc(customer.getId());
        if (hireRequests != null) {
            for (ClientServiceRequest csr : hireRequests) {
                aggregatedRequests.add(mapClientServiceRequestToCard(csr));
            }
        }

        // Sort unified requests by submittedTimestamp descending (newest first)
        aggregatedRequests.sort((a, b) -> {
            long tsA = a.get("submittedTimestamp") instanceof Number ? ((Number) a.get("submittedTimestamp")).longValue() : 0L;
            long tsB = b.get("submittedTimestamp") instanceof Number ? ((Number) b.get("submittedTimestamp")).longValue() : 0L;
            return Long.compare(tsB, tsA);
        });

        return ResponseEntity.ok(aggregatedRequests);
    }

    /**
     * Maps a MaterialRequest entity to the My Requests card contract.
     * Accurately distinguishes between Direct Material Purchase and Material Requirement.
     */
    private Map<String, Object> mapMaterialRequestToCard(MaterialRequest mr) {
        Map<String, Object> card = new LinkedHashMap<>();
        boolean isDirectBuy = "DIRECT_MATERIAL".equalsIgnoreCase(mr.getRequestType());

        String reqId = mr.getRequestId() != null && !mr.getRequestId().isBlank()
                ? mr.getRequestId()
                : (isDirectBuy ? ("DMR-" + mr.getId()) : ("MR-" + mr.getId()));

        card.put("id", reqId);
        card.put("backendId", mr.getId());

        LocalDateTime createdAt = mr.getCreatedAt() != null ? mr.getCreatedAt() : LocalDateTime.now();
        long timestampMs = createdAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        card.put("submittedTimestamp", timestampMs);
        card.put("submittedDate", createdAt.format(DISPLAY_DATE_FORMATTER));

        String loc = "";
        if (mr.getCity() != null && !mr.getCity().isBlank()) loc += mr.getCity();
        if (mr.getState() != null && !mr.getState().isBlank()) {
            loc += (loc.isEmpty() ? "" : ", ") + mr.getState();
        }
        if (mr.getPinCode() != null && !mr.getPinCode().isBlank()) {
            loc += " - " + mr.getPinCode();
        }
        card.put("location", loc.isEmpty() ? "Site Location" : loc);
        card.put("deliverySite", mr.getDeliveryAddress() != null && !mr.getDeliveryAddress().isBlank() ? mr.getDeliveryAddress() : card.get("location"));

        // Status normalization
        String rawStatus = mr.getStatus() != null ? mr.getStatus().trim() : "NEW";
        String displayStatus = "Active";
        if ("NEW".equalsIgnoreCase(rawStatus)) {
            displayStatus = isDirectBuy ? "Pending" : "Active";
        } else if ("ACCEPTED".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Accepted";
        } else if ("DECLINED".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Rejected";
        } else if ("CLOSED".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Completed";
        } else if ("CANCELLED".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Cancelled";
        } else {
            displayStatus = rawStatus.substring(0, 1).toUpperCase() + rawStatus.substring(1).toLowerCase();
        }
        card.put("status", displayStatus);

        // Child Items summary
        List<MaterialRequestItem> items = mr.getItems();
        MaterialRequestItem firstItem = (items != null && !items.isEmpty()) ? items.get(0) : null;

        if (isDirectBuy) {
            card.put("type", "DIRECT_BUY");
            card.put("typeLabel", "Direct Material Purchase");

            String matName = firstItem != null && firstItem.getMaterialName() != null ? firstItem.getMaterialName() : "Material Direct Purchase";
            card.put("title", matName);
            card.put("category", firstItem != null && firstItem.getCategory() != null ? firstItem.getCategory() : "Building Material");

            String fullMat = matName;
            if (firstItem != null && firstItem.getBrand() != null && !firstItem.getBrand().isBlank()) {
                fullMat += " (" + firstItem.getBrand() + ")";
            }
            card.put("material", fullMat);

            double qty = firstItem != null && firstItem.getQuantity() != null ? firstItem.getQuantity() : 1.0;
            String unit = firstItem != null && firstItem.getUnit() != null ? firstItem.getUnit() : "Units";
            card.put("quantity", formatQuantity(qty) + " " + unit);

            String sellerName = mr.getTargetSeller() != null ? mr.getTargetSeller().getName() : "Verified Material Seller";
            card.put("targetProvider", sellerName);

            String notes = mr.getSpecialNotes() != null && !mr.getSpecialNotes().isBlank()
                    ? mr.getSpecialNotes()
                    : ("Direct Material Purchase order for " + matName + ". Sent to " + sellerName + ".");
            card.put("description", notes);

            // Commercial snapshot fields (informative, not quotations)
            card.put("materialPrice", mr.getMaterialPrice());
            card.put("transportationCost", mr.getTransportationCost());
            card.put("materialAmount", mr.getMaterialAmount());
            card.put("estimatedTotal", mr.getEstimatedTotal());
            card.put("verificationCode", mr.getVerificationCode());
        } else {
            card.put("type", "MATERIAL_REQUIREMENT");
            card.put("typeLabel", "Material Requirement");

            StringBuilder itemsSummary = new StringBuilder();
            double totalQty = 0;
            String primaryUnit = "Units";
            String cat = "Building Material";

            if (items != null && !items.isEmpty()) {
                cat = firstItem != null && firstItem.getCategory() != null ? firstItem.getCategory() : "Building Material";
                primaryUnit = firstItem != null && firstItem.getUnit() != null ? firstItem.getUnit() : "Units";

                for (MaterialRequestItem it : items) {
                    if (itemsSummary.length() > 0) itemsSummary.append(", ");
                    itemsSummary.append(it.getMaterialName());
                    if (it.getQuantity() != null) totalQty += it.getQuantity();
                }
            }

            String summaryStr = itemsSummary.length() > 0 ? itemsSummary.toString() : "Required Construction Materials";
            card.put("title", summaryStr);
            card.put("category", cat);
            card.put("material", summaryStr);
            card.put("quantity", formatQuantity(totalQty) + " " + primaryUnit);
            card.put("targetProvider", "Broadcast to Verified Sellers");

            String notes = mr.getSpecialNotes() != null && !mr.getSpecialNotes().isBlank()
                    ? mr.getSpecialNotes()
                    : ("Material requirement broadcast for " + summaryStr + ".");
            card.put("description", notes);

            card.put("requestScope", mr.getRequestScope() != null ? mr.getRequestScope() : "STATE");
            card.put("localRadius", mr.getLocalRadius());
        }

        // Live requests have zero quotations currently
        card.put("quotations", new ArrayList<>());

        return card;
    }

    /**
     * Maps a ClientServiceRequest entity to the My Requests card contract.
     */
    private Map<String, Object> mapClientServiceRequestToCard(ClientServiceRequest csr) {
        Map<String, Object> card = new LinkedHashMap<>();

        String reqId = csr.getRequestId() != null && !csr.getRequestId().isBlank()
                ? csr.getRequestId()
                : ("CSR-" + csr.getId());

        card.put("id", reqId);
        card.put("backendId", csr.getId());
        card.put("type", "DIRECT_HIRE");
        card.put("typeLabel", "Direct Hire Request");

        String serviceName = csr.getRequestedService() != null && !csr.getRequestedService().isBlank()
                ? csr.getRequestedService()
                : (csr.getProjectName() != null ? csr.getProjectName() : "Professional Trade Service");

        card.put("title", serviceName);
        card.put("category", "Professional Services");
        card.put("service", serviceName);

        String scopeOrDate = csr.getTargetDate() != null && !csr.getTargetDate().isBlank()
                ? ("Target Date: " + csr.getTargetDate())
                : "Direct Trade Engagement";
        card.put("quantity", scopeOrDate);

        String proName = csr.getProfessional() != null && csr.getProfessional().getName() != null
                ? csr.getProfessional().getName()
                : "Verified Professional";
        card.put("targetProvider", proName);

        String loc = csr.getLocation() != null && !csr.getLocation().isBlank() ? csr.getLocation() : "Service Location";
        card.put("location", loc);
        card.put("deliverySite", loc);

        LocalDateTime createdAt = csr.getCreatedAt() != null ? csr.getCreatedAt() : LocalDateTime.now();
        long timestampMs = createdAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        card.put("submittedTimestamp", timestampMs);
        card.put("submittedDate", createdAt.format(DISPLAY_DATE_FORMATTER));

        // Status normalization
        String rawStatus = csr.getStatus() != null ? csr.getStatus().trim() : "New";
        String displayStatus = "Pending";
        if ("New".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Pending";
        } else if ("Contacted".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Active";
        } else if ("Accepted".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Accepted";
        } else if ("Declined".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Cancelled";
        } else {
            displayStatus = rawStatus.substring(0, 1).toUpperCase() + rawStatus.substring(1).toLowerCase();
        }
        card.put("status", displayStatus);

        String desc = csr.getProjectScope() != null && !csr.getProjectScope().isBlank()
                ? csr.getProjectScope()
                : ("Direct hire service request sent to " + proName + " for " + serviceName + ".");
        card.put("description", desc);

        if (csr.getClientBudget() != null && csr.getClientBudget() > 0) {
            card.put("budget", csr.getClientBudget());
        }

        // Live requests have zero quotations currently
        card.put("quotations", new ArrayList<>());

        return card;
    }

    private String formatQuantity(double qty) {
        if (qty == (long) qty) {
            return String.format(Locale.US, "%d", (long) qty);
        }
        return String.format(Locale.US, "%.1f", qty);
    }
}
