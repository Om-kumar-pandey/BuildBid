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
    private final QuotationRepository quotationRepository;
    private final MaterialOrderRepository materialOrderRepository;

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    @Autowired
    public CustomerRequestController(
            MaterialRequestRepository materialRequestRepository,
            ClientServiceRequestRepository clientServiceRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            @Autowired(required = false) QuotationRepository quotationRepository,
            @Autowired(required = false) MaterialOrderRepository materialOrderRepository
    ) {
        this.materialRequestRepository = materialRequestRepository;
        this.clientServiceRequestRepository = clientServiceRequestRepository;
        this.userRepository = userRepository;
        this.quotationRepository = quotationRepository;
        this.materialOrderRepository = materialOrderRepository;
    }

    public CustomerRequestController(
            MaterialRequestRepository materialRequestRepository,
            ClientServiceRequestRepository clientServiceRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this(materialRequestRepository, clientServiceRequestRepository, userRepository, null, null);
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

        LocalDateTime createdAt = mr.getCreatedAt() != null ? mr.getCreatedAt() : LocalDateTime.now(IST_ZONE);
        long timestampMs = createdAt.atZone(IST_ZONE).toInstant().toEpochMilli();
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
        String rawStatus = mr.getStatus() != null ? mr.getStatus().trim().toUpperCase() : "NEW";
        String displayStatus = "Active";
        String statusEn = "Active";
        String statusHi = "सक्रिय";

        if (isDirectBuy) {
            if ("WAITING_FOR_ACCEPTANCE".equals(rawStatus) || "NEW".equals(rawStatus) || "PENDING".equals(rawStatus)) {
                displayStatus = "Waiting for Acceptance";
                statusEn = "Waiting for Acceptance";
                statusHi = "स्वीकृति की प्रतीक्षा";
            } else if ("ORDER_ACCEPTED".equals(rawStatus) || "ACCEPTED".equals(rawStatus)) {
                displayStatus = "Order Accepted";
                statusEn = "Order Accepted";
                statusHi = "ऑर्डर स्वीकार किया गया";
            } else if ("PROCESSING".equals(rawStatus)) {
                displayStatus = "Processing";
                statusEn = "Processing";
                statusHi = "प्रक्रिया में";
            } else if ("READY_FOR_DISPATCH".equals(rawStatus) || "DISPATCHED".equals(rawStatus)) {
                displayStatus = "Ready for Dispatch";
                statusEn = "Ready for Dispatch";
                statusHi = "भेजने के लिए तैयार";
            } else if ("OUT_FOR_DELIVERY".equals(rawStatus)) {
                displayStatus = "Out for Delivery";
                statusEn = "Out for Delivery";
                statusHi = "डिलीवरी के लिए रवाना";
            } else if ("DELIVERED".equals(rawStatus) || "COMPLETED".equals(rawStatus)) {
                displayStatus = "Delivered";
                statusEn = "Delivered";
                statusHi = "डिलीवर किया गया";
            } else if ("DECLINED".equals(rawStatus) || "REJECTED".equals(rawStatus)) {
                displayStatus = "Declined";
                statusEn = "Declined";
                statusHi = "अस्वीकृत";
            } else if ("CANCELLED".equals(rawStatus)) {
                displayStatus = "Cancelled";
                statusEn = "Cancelled";
                statusHi = "रद्द";
            } else {
                displayStatus = rawStatus;
                statusEn = rawStatus;
                statusHi = rawStatus;
            }
        } else {
            if ("ALLOCATED".equals(rawStatus)) {
                displayStatus = "Purchase Plan Confirmed";
                statusEn = "Purchase Plan Confirmed";
                statusHi = "खरीद योजना की पुष्टि";
            } else if ("CLOSED".equals(rawStatus)) {
                displayStatus = "Completed";
                statusEn = "Completed";
                statusHi = "पूर्ण";
            } else if ("CANCELLED".equals(rawStatus)) {
                displayStatus = "Cancelled";
                statusEn = "Cancelled";
                statusHi = "रद्द";
            } else {
                displayStatus = "Active";
                statusEn = "Active";
                statusHi = "सक्रिय";
            }
        }

        card.put("status", displayStatus);
        card.put("statusEn", statusEn);
        card.put("statusHi", statusHi);
        card.put("rawStatus", rawStatus);

        // Child Items summary
        List<MaterialRequestItem> items = mr.getItems();
        MaterialRequestItem firstItem = (items != null && !items.isEmpty()) ? items.get(0) : null;

        if (isDirectBuy) {
            card.put("type", "DIRECT_BUY");
            card.put("typeLabel", "Direct Material Purchase");
            card.put("isDirectBuy", true);
            card.put("noQuotationsAllowed", true);

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
            if (mr.getTargetSeller() != null) {
                card.put("sellerId", mr.getTargetSeller().getId());
                card.put("sellerName", mr.getTargetSeller().getName());
                // Scoped contact security: reveal full seller contact details only after seller acceptance
                boolean isAccepted = "ORDER_ACCEPTED".equals(rawStatus) || "ACCEPTED".equals(rawStatus)
                        || "PROCESSING".equals(rawStatus) || "READY_FOR_DISPATCH".equals(rawStatus)
                        || "DISPATCHED".equals(rawStatus) || "OUT_FOR_DELIVERY".equals(rawStatus)
                        || "DELIVERED".equals(rawStatus) || "COMPLETED".equals(rawStatus);
                if (isAccepted) {
                    card.put("sellerBusinessName", mr.getTargetSeller().getName());
                    card.put("sellerPhone", mr.getTargetSeller().getPhone());
                    card.put("sellerEmail", mr.getTargetSeller().getEmail());
                    card.put("sellerLocation", mr.getTargetSeller().getLocation());
                    card.put("sellerAddress", mr.getTargetSeller().getLocation());
                }
            }

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
            card.put("expectedDeliveryDate", mr.getExpectedDeliveryDate());
            card.put("quotations", Collections.emptyList());
        } else {
            card.put("type", "MATERIAL_REQUIREMENT");
            card.put("typeLabel", "Material Requirement");
            card.put("isDirectBuy", false);

            StringBuilder itemsSummary = new StringBuilder();
            double totalQty = 0;
            String primaryUnit = "Units";
            String cat = "Building Material";
            List<Map<String, Object>> requirementItemsList = new ArrayList<>();

            if (items != null && !items.isEmpty()) {
                cat = firstItem != null && firstItem.getCategory() != null ? firstItem.getCategory() : "Building Material";
                primaryUnit = firstItem != null && firstItem.getUnit() != null ? firstItem.getUnit() : "Units";

                for (MaterialRequestItem it : items) {
                    if (itemsSummary.length() > 0) itemsSummary.append(", ");
                    itemsSummary.append(it.getMaterialName());
                    double itemQty = it.getQuantity() != null ? it.getQuantity() : 0.0;
                    totalQty += itemQty;

                    Map<String, Object> reqItemMap = new LinkedHashMap<>();
                    reqItemMap.put("id", it.getId());
                    reqItemMap.put("materialName", it.getMaterialName());
                    reqItemMap.put("category", it.getCategory());
                    reqItemMap.put("quantity", itemQty);
                    reqItemMap.put("unit", it.getUnit());
                    reqItemMap.put("brand", it.getBrand());
                    reqItemMap.put("specification", it.getSpecification());
                    requirementItemsList.add(reqItemMap);
                }
            }

            String summaryStr = itemsSummary.length() > 0 ? itemsSummary.toString() : "Required Construction Materials";
            card.put("title", summaryStr);
            card.put("category", cat);
            card.put("material", summaryStr);
            card.put("quantity", formatQuantity(totalQty) + " " + primaryUnit);
            card.put("targetProvider", "Broadcast to Verified Sellers");
            card.put("items", requirementItemsList);

            String notes = mr.getSpecialNotes() != null && !mr.getSpecialNotes().isBlank()
                    ? mr.getSpecialNotes()
                    : ("Material requirement broadcast for " + summaryStr + ".");
            card.put("description", notes);

            card.put("requestScope", mr.getRequestScope() != null ? mr.getRequestScope() : "STATE");
            card.put("localRadius", mr.getLocalRadius());

            // Fetch live quotations for Post Material Requirement
            List<Map<String, Object>> quotationCards = new ArrayList<>();
            if (quotationRepository != null) {
                List<Quotation> quotes = quotationRepository.findByMaterialRequestIdOrderByCreatedAtDesc(mr.getId());
                if (quotes != null) {
                    for (Quotation q : quotes) {
                        Map<String, Object> qMap = new LinkedHashMap<>();
                        qMap.put("id", q.getQuotationId() != null ? q.getQuotationId() : ("QT-" + q.getId()));
                        qMap.put("backendId", q.getId());
                        qMap.put("providerId", q.getProvider() != null ? q.getProvider().getId() : null);
                        qMap.put("providerName", q.getProvider() != null ? q.getProvider().getName() : "Verified Seller");
                        qMap.put("providerRole", q.getProviderRole());
                        qMap.put("status", q.getStatus());
                        qMap.put("quotedAmount", q.getQuotedAmount());
                        qMap.put("materialCost", q.getMaterialCost());
                        qMap.put("transportationCost", q.getTransportationCost());
                        qMap.put("taxGst", q.getTaxGst());
                        qMap.put("timeline", q.getTimeline() != null ? q.getTimeline() : "2-3 Days");
                        qMap.put("validity", q.getValidity() != null ? q.getValidity() : "7 Days");
                        qMap.put("warranty", q.getWarranty());
                        qMap.put("paymentTerms", q.getPaymentTerms());

                        List<Map<String, Object>> quotedItems = new ArrayList<>();
                        if (q.getItems() != null) {
                            for (QuotationItem qi : q.getItems()) {
                                Map<String, Object> qiMap = new LinkedHashMap<>();
                                qiMap.put("id", qi.getId());
                                qiMap.put("materialRequestItemId", qi.getMaterialRequestItem() != null ? qi.getMaterialRequestItem().getId() : null);
                                qiMap.put("materialId", qi.getMaterial() != null ? qi.getMaterial().getId() : null);
                                qiMap.put("materialName", qi.getMaterialName());
                                qiMap.put("quotedQuantity", qi.getQuotedQuantity());
                                qiMap.put("unit", qi.getQuotedUnit());
                                qiMap.put("unitPrice", qi.getUnitPrice());
                                qiMap.put("lineTotal", qi.getLineTotal());
                                quotedItems.add(qiMap);
                            }
                        }
                        qMap.put("items", quotedItems);
                        quotationCards.add(qMap);
                    }
                }
            }
            card.put("quotations", quotationCards);

            // If ALLOCATED, fetch generated seller orders
            if ("ALLOCATED".equals(rawStatus) && materialOrderRepository != null) {
                List<MaterialOrder> orders = materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(mr.getId());
                List<Map<String, Object>> orderSummaries = new ArrayList<>();
                if (orders != null) {
                    for (MaterialOrder mo : orders) {
                        Map<String, Object> moMap = new LinkedHashMap<>();
                        moMap.put("id", mo.getId());
                        moMap.put("orderId", mo.getOrderCode());
                        moMap.put("orderCode", mo.getOrderCode());
                        moMap.put("sellerName", mo.getSeller() != null ? mo.getSeller().getName() : "Seller");
                        moMap.put("sellerPhone", mo.getSeller() != null ? mo.getSeller().getPhone() : "");
                        moMap.put("sellerLocation", mo.getSeller() != null ? mo.getSeller().getLocation() : "");
                        moMap.put("totalAmount", mo.getTotalAmount());
                        moMap.put("status", mo.getOrderStatus());
                        moMap.put("expectedDeliveryDate", mo.getExpectedDeliveryDate());

                        List<Map<String, Object>> orderItems = new ArrayList<>();
                        if (mo.getItems() != null) {
                            for (MaterialOrderItem oi : mo.getItems()) {
                                Map<String, Object> oiMap = new LinkedHashMap<>();
                                oiMap.put("materialName", oi.getMaterialName());
                                oiMap.put("allocatedQuantity", oi.getQuantity());
                                oiMap.put("unit", oi.getUnit());
                                oiMap.put("agreedRate", oi.getUnitPrice());
                                oiMap.put("lineTotal", oi.getSubtotal());
                                orderItems.add(oiMap);
                            }
                        }
                        moMap.put("items", orderItems);
                        orderSummaries.add(moMap);
                    }
                }
                card.put("sellerOrders", orderSummaries);
            }
        }

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

        LocalDateTime createdAt = csr.getCreatedAt() != null ? csr.getCreatedAt() : LocalDateTime.now(IST_ZONE);
        long timestampMs = createdAt.atZone(IST_ZONE).toInstant().toEpochMilli();
        card.put("submittedTimestamp", timestampMs);
        card.put("submittedDate", createdAt.format(DISPLAY_DATE_FORMATTER));

        // Status normalization
        String rawStatus = csr.getStatus() != null ? csr.getStatus().trim() : "New";
        String displayStatus = "Waiting for Acceptance";
        String statusEn = "Waiting for Acceptance";
        String statusHi = "स्वीकृति की प्रतीक्षा";

        if ("Accepted".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Accepted";
            statusEn = "Accepted";
            statusHi = "स्वीकार किया गया";
        } else if ("Declined".equalsIgnoreCase(rawStatus) || "Rejected".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Declined";
            statusEn = "Declined";
            statusHi = "अस्वीकृत";
        } else if ("Cancelled".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Cancelled";
            statusEn = "Cancelled";
            statusHi = "रद्द";
        } else if ("Contacted".equalsIgnoreCase(rawStatus) || "In Progress".equalsIgnoreCase(rawStatus)) {
            displayStatus = "Active";
            statusEn = "Active";
            statusHi = "सक्रिय";
        } else {
            // "New", "Pending", "WAITING_FOR_ACCEPTANCE"
            displayStatus = "Waiting for Acceptance";
            statusEn = "Waiting for Acceptance";
            statusHi = "स्वीकृति की प्रतीक्षा";
        }
        card.put("status", displayStatus);
        card.put("statusEn", statusEn);
        card.put("statusHi", statusHi);
        card.put("rawStatus", rawStatus.toUpperCase());

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
