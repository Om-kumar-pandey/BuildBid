package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * BUILDBID - QUOTATION SERVICE
 * 
 * Core business service implementing persistent quotations for:
 * 1. MATERIAL_REQUIREMENT (broadcast to multiple eligible Material Sellers)
 * 2. DIRECT_HIRE (targeted to specific Professional)
 * 
 * STRICT ARCHITECTURAL CONSTRAINTS:
 * - DIRECT_BUY is fixed catalog purchase snapshot and MUST NEVER accept quotations.
 * - Construction Projects and Contractor Bids remain completely separate.
 * - Collision-Safe: material_request_id and service_request_id are distinct foreign keys.
 *   Exactly one must be populated.
 * - Provider identity is strictly derived from authenticated JWT (never payload).
 * - Duplicate active quotations from the same provider on the same request are prevented.
 */
@Service
public class QuotationService {

    private static final Set<String> ACTIVE_STATUSES = Set.of("SUBMITTED", "UNDER_REVIEW", "ACCEPTED");

    private final QuotationRepository quotationRepository;
    private final MaterialRequestRepository materialRequestRepository;
    private final ClientServiceRequestRepository clientServiceRequestRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final GeoLocationService geoLocationService;
    private final MaterialOrderService materialOrderService;
    private final MaterialRepository materialRepository;
    private final MaterialRequestItemRepository materialRequestItemRepository;
    private final QuotationItemRepository quotationItemRepository;

    @Autowired
    public QuotationService(
            QuotationRepository quotationRepository,
            MaterialRequestRepository materialRequestRepository,
            ClientServiceRequestRepository clientServiceRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService,
            MaterialOrderService materialOrderService,
            MaterialRepository materialRepository,
            MaterialRequestItemRepository materialRequestItemRepository,
            QuotationItemRepository quotationItemRepository
    ) {
        this.quotationRepository = quotationRepository;
        this.materialRequestRepository = materialRequestRepository;
        this.clientServiceRequestRepository = clientServiceRequestRepository;
        this.userRepository = userRepository;
        this.geoLocationService = geoLocationService;
        this.materialOrderService = materialOrderService;
        this.materialRepository = materialRepository;
        this.materialRequestItemRepository = materialRequestItemRepository;
        this.quotationItemRepository = quotationItemRepository;
    }

    public QuotationService(
            QuotationRepository quotationRepository,
            MaterialRequestRepository materialRequestRepository,
            ClientServiceRequestRepository clientServiceRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService,
            MaterialOrderService materialOrderService
    ) {
        this(quotationRepository, materialRequestRepository, clientServiceRequestRepository, userRepository, geoLocationService, materialOrderService, null, null, null);
    }

    public QuotationService(
            QuotationRepository quotationRepository,
            MaterialRequestRepository materialRequestRepository,
            ClientServiceRequestRepository clientServiceRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService
    ) {
        this(quotationRepository, materialRequestRepository, clientServiceRequestRepository, userRepository, geoLocationService, null, null, null, null);
    }

    /**
     * Submit a persistent quotation.
     * Identity derived strictly from authenticated user.
     */
    @Transactional
    public Quotation submitQuotation(Map<String, Object> payload, MarketplaceBackendApplication.MarketplaceUser provider) {
        if (provider == null) {
            throw new IllegalArgumentException("Provider authentication required.");
        }

        // 1. Role validation
        boolean isMaterialSeller = hasAnyRole(provider, MarketplaceBackendApplication.Role.MATERIAL_SELLER, MarketplaceBackendApplication.Role.SELLER);
        boolean isProfessional = hasAnyRole(provider, MarketplaceBackendApplication.Role.PROFESSIONAL, MarketplaceBackendApplication.Role.SERVICE_PROVIDER);

        if (!isMaterialSeller && !isProfessional) {
            throw new SecurityException("Unauthorized role. Customers and Contractors cannot submit quotations.");
        }

        // 2. Request Type validation
        String rawRequestType = getString(payload, "requestType");
        if (rawRequestType == null || rawRequestType.isBlank()) {
            throw new IllegalArgumentException("requestType is required (MATERIAL_REQUIREMENT or DIRECT_HIRE).");
        }
        String requestType = rawRequestType.trim().toUpperCase();

        if ("DIRECT_BUY".equals(requestType) || "DIRECT_MATERIAL".equals(requestType)) {
            throw new IllegalArgumentException("Direct Buy is a fixed-price catalog purchase and does not accept quotations.");
        }
        if ("PROJECT".equals(requestType) || "CONSTRUCTION_PROJECT".equals(requestType) || "PROJECT_BID".equals(requestType)) {
            throw new IllegalArgumentException("Project bidding is managed separately through the contractor bidding subsystem and does not accept quotations.");
        }
        if (!"MATERIAL_REQUIREMENT".equals(requestType) && !"DIRECT_HIRE".equals(requestType)) {
            throw new IllegalArgumentException("Invalid requestType. Allowed values: MATERIAL_REQUIREMENT, DIRECT_HIRE.");
        }

        // 3. Collision-Safe Request Reference Extraction
        Long materialRequestId = getLongSafe(payload.get("materialRequestId"));
        Long serviceRequestId = getLongSafe(payload.get("serviceRequestId"));
        String requestIdStr = getString(payload, "requestId");

        // If generic requestId string is provided without explicit numeric ID, try resolving
        if (materialRequestId == null && serviceRequestId == null && requestIdStr != null && !requestIdStr.isBlank()) {
            if ("MATERIAL_REQUIREMENT".equals(requestType)) {
                Optional<MaterialRequest> mrOpt = materialRequestRepository.findByRequestId(requestIdStr);
                if (mrOpt.isPresent()) {
                    materialRequestId = mrOpt.get().getId();
                } else {
                    Long parsed = parseLongSafe(requestIdStr);
                    if (parsed != null && materialRequestRepository.existsById(parsed)) {
                        materialRequestId = parsed;
                    }
                }
            } else if ("DIRECT_HIRE".equals(requestType)) {
                Optional<ClientServiceRequest> csrOpt = clientServiceRequestRepository.findByRequestId(requestIdStr);
                if (csrOpt.isPresent()) {
                    serviceRequestId = csrOpt.get().getId();
                } else {
                    Long parsed = parseLongSafe(requestIdStr);
                    if (parsed != null && clientServiceRequestRepository.existsById(parsed)) {
                        serviceRequestId = parsed;
                    }
                }
            }
        }

        // 4. Strict Collision-Safe Verification: Exactly one foreign key must be populated
        if (materialRequestId != null && serviceRequestId != null) {
            throw new IllegalArgumentException("Collision safety violation: Both materialRequestId and serviceRequestId are populated. Quotation must link to exactly one request.");
        }
        if (materialRequestId == null && serviceRequestId == null) {
            throw new IllegalArgumentException("Missing request reference: Either materialRequestId or serviceRequestId must be provided.");
        }

        Quotation quotation = new Quotation();
        quotation.setRequestType(requestType);

        // 5. Handling MATERIAL_REQUIREMENT
        if ("MATERIAL_REQUIREMENT".equals(requestType)) {
            if (materialRequestId == null) {
                throw new IllegalArgumentException("materialRequestId is required for MATERIAL_REQUIREMENT quotations.");
            }
            if (!isMaterialSeller) {
                throw new SecurityException("Only Material Sellers can quote on Material Requirements.");
            }

            final Long targetMaterialReqId = materialRequestId;
            MaterialRequest matReq = materialRequestRepository.findById(targetMaterialReqId)
                    .orElseThrow(() -> new NoSuchElementException("Material Request not found with ID: " + targetMaterialReqId));

            // Strictly reject Direct Buy material requests
            if ("DIRECT_MATERIAL".equalsIgnoreCase(matReq.getRequestType())) {
                throw new IllegalArgumentException("Direct Buy requests are fixed-price purchases and do not accept quotations.");
            }

            // Check request lifecycle
            String status = matReq.getStatus() != null ? matReq.getStatus().toUpperCase() : "NEW";
            if ("CLOSED".equals(status) || "DECLINED".equals(status) || "CANCELLED".equals(status)) {
                throw new IllegalStateException("Material Request is " + status + " and cannot accept new quotations.");
            }

            // Verify Seller Eligibility (reuses existing routing rules)
            if (!isSellerEligible(matReq, provider)) {
                throw new SecurityException("You are not within the eligible service area for this material requirement.");
            }

            // Duplicate active quotation check
            List<Quotation> existingActive = quotationRepository.findByMaterialRequestIdAndProviderIdAndStatusIn(
                    matReq.getId(), provider.getId(), ACTIVE_STATUSES
            );
            if (!existingActive.isEmpty()) {
                throw new IllegalStateException("An active quotation (" + existingActive.get(0).getQuotationId() + 
                        ") already exists for this material request from your account. Resubmission is not permitted while an active quotation is pending.");
            }

            quotation.setMaterialRequest(matReq);
            quotation.setServiceRequest(null);
            quotation.setProviderRole("MATERIAL_SELLER");

            // Phase 4C: Process structured QuotationItems for MATERIAL_REQUIREMENT
            Object itemsObj = payload.get("items");
            if (itemsObj instanceof List<?>) {
                List<?> rawList = (List<?>) itemsObj;
                Set<Long> seenRequestItemIds = new HashSet<>();

                for (Object itemRaw : rawList) {
                    if (!(itemRaw instanceof Map<?, ?>)) continue;
                    @SuppressWarnings("unchecked")
                    Map<String, Object> itemMap = (Map<String, Object>) itemRaw;

                    // 1. Material ID validation
                    Long materialId = getLongSafe(itemMap.get("materialId") != null ? itemMap.get("materialId") : itemMap.get("catalogMaterialId"));
                    if (materialId == null || materialId <= 0) {
                        throw new IllegalArgumentException("Valid catalog materialId is required for each quotation item.");
                    }

                    // Load catalog Material
                    Material catalogMaterial = null;
                    if (materialRepository != null) {
                        catalogMaterial = materialRepository.findById(materialId).orElse(null);
                    }
                    if (catalogMaterial == null) {
                        throw new IllegalArgumentException("Material catalog item not found with ID: " + materialId);
                    }

                    // 2. Seller Ownership Validation (Section 7)
                    if (catalogMaterial.getSeller() == null || !catalogMaterial.getSeller().getId().equals(provider.getId())) {
                        throw new SecurityException("Unauthorized. Material " + materialId + " does not belong to your catalog.");
                    }

                    // 3. MaterialRequestItem validation (Section 8)
                    Long reqItemId = getLongSafe(itemMap.get("materialRequestItemId") != null ? itemMap.get("materialRequestItemId") : itemMap.get("requestItemId"));
                    MaterialRequestItem reqItem = null;
                    if (reqItemId != null) {
                        // Duplicate check (Section 17)
                        if (!seenRequestItemIds.add(reqItemId)) {
                            throw new IllegalArgumentException("Duplicate quotation item mapping for material request item ID: " + reqItemId);
                        }

                        if (materialRequestItemRepository != null) {
                            reqItem = materialRequestItemRepository.findById(reqItemId).orElse(null);
                        }
                        if (reqItem == null && matReq.getItems() != null) {
                            reqItem = matReq.getItems().stream()
                                    .filter(i -> reqItemId.equals(i.getId()))
                                    .findFirst()
                                    .orElse(null);
                        }
                        if (reqItem == null) {
                            throw new IllegalArgumentException("Material request item not found with ID: " + reqItemId);
                        }
                        if (reqItem.getMaterialRequest() == null || !reqItem.getMaterialRequest().getId().equals(matReq.getId())) {
                            throw new IllegalArgumentException("Material request item " + reqItemId + " does not belong to material request " + matReq.getId());
                        }
                    }

                    // 4. Quantity and Unit (Section 10)
                    Double qty = getDoubleSafe(itemMap.get("quantity") != null ? itemMap.get("quantity") : itemMap.get("quotedQuantity"));
                    if (qty == null || qty <= 0) {
                        throw new IllegalArgumentException("Quoted quantity must be greater than zero.");
                    }

                    Double unitPrice = getDoubleSafe(itemMap.get("unitPrice") != null ? itemMap.get("unitPrice") : itemMap.get("price"));
                    if (unitPrice == null || unitPrice < 0) {
                        throw new IllegalArgumentException("Quoted unit price must be non-negative.");
                    }

                    String unit = getString(itemMap, "unit");
                    if (unit == null || unit.isBlank()) unit = getString(itemMap, "quotedUnit");
                    if (unit == null || unit.isBlank() && reqItem != null) unit = reqItem.getUnit();
                    if (unit == null || unit.isBlank()) unit = catalogMaterial.getUnit();
                    if (unit == null || unit.isBlank()) unit = "Unit";

                    // 5. Authoritative Line Total (Section 11)
                    double lineTotal = Math.round(qty * unitPrice * 100.0) / 100.0;

                    QuotationItem qi = new QuotationItem();
                    qi.setQuotation(quotation);
                    qi.setMaterialRequestItem(reqItem);
                    qi.setMaterial(catalogMaterial);
                    qi.setMaterialName(catalogMaterial.getMaterialName());
                    qi.setQuotedQuantity(qty);
                    qi.setQuotedUnit(unit);
                    qi.setUnitPrice(unitPrice);
                    qi.setLineTotal(lineTotal);
                    quotation.addItem(qi);
                }
            }
        }

        // 6. Handling DIRECT_HIRE
        if ("DIRECT_HIRE".equals(requestType)) {
            if (serviceRequestId == null) {
                throw new IllegalArgumentException("serviceRequestId is required for DIRECT_HIRE quotations.");
            }
            if (!isProfessional) {
                throw new SecurityException("Only Professionals can quote on Direct Hire requests.");
            }

            final Long targetServiceReqId = serviceRequestId;
            ClientServiceRequest csr = clientServiceRequestRepository.findById(targetServiceReqId)
                    .orElseThrow(() -> new NoSuchElementException("Client Service Request not found with ID: " + targetServiceReqId));

            // Check lifecycle
            String status = csr.getStatus() != null ? csr.getStatus().trim() : "New";
            if ("Declined".equalsIgnoreCase(status) || "Cancelled".equalsIgnoreCase(status) || "Completed".equalsIgnoreCase(status)) {
                throw new IllegalStateException("Service Request is " + status + " and cannot accept new quotations.");
            }

            // Verify targeted professional
            if (csr.getProfessional() == null || !csr.getProfessional().getId().equals(provider.getId())) {
                throw new SecurityException("Unauthorized. This Direct Hire request was targeted to a different professional.");
            }

            // Duplicate active quotation check
            List<Quotation> existingActive = quotationRepository.findByServiceRequestIdAndProviderIdAndStatusIn(
                    csr.getId(), provider.getId(), ACTIVE_STATUSES
            );
            if (!existingActive.isEmpty()) {
                throw new IllegalStateException("An active quotation (" + existingActive.get(0).getQuotationId() + 
                        ") already exists for this service request from your account.");
            }

            quotation.setServiceRequest(csr);
            quotation.setMaterialRequest(null);
            quotation.setProviderRole("PROFESSIONAL");
        }

        // 7. Commercial Breakdown Validation & Mapping
        double itemsSum = 0.0;
        if (!quotation.getItems().isEmpty()) {
            for (QuotationItem qi : quotation.getItems()) {
                itemsSum += qi.getLineTotal() != null ? qi.getLineTotal() : 0.0;
            }
            itemsSum = Math.round(itemsSum * 100.0) / 100.0;
        }

        Double materialCost = getDoubleSafe(payload.get("materialCost"));
        if (materialCost == null) materialCost = getDoubleSafe(payload.get("materialAmount"));
        if (!quotation.getItems().isEmpty() && (materialCost == null || materialCost == 0.0)) {
            materialCost = itemsSum;
        }
        quotation.setMaterialCost(materialCost != null ? materialCost : 0.0);

        Double labourCost = getDoubleSafe(payload.get("labourCost"));
        if (labourCost == null) labourCost = getDoubleSafe(payload.get("labourAmount"));
        quotation.setLabourCost(labourCost != null ? labourCost : 0.0);

        Double transportationCost = getDoubleSafe(payload.get("transportationCost"));
        if (transportationCost == null) transportationCost = getDoubleSafe(payload.get("transportation"));
        if (transportationCost == null) transportationCost = getDoubleSafe(payload.get("freight"));
        quotation.setTransportationCost(transportationCost != null ? transportationCost : 0.0);

        Double taxGst = getDoubleSafe(payload.get("taxGst"));
        if (taxGst == null) taxGst = getDoubleSafe(payload.get("taxes"));
        quotation.setTaxGst(taxGst != null ? taxGst : 0.0);

        Double quotedAmount = getDoubleSafe(payload.get("quotedAmount"));
        if (quotedAmount == null || quotedAmount <= 0) {
            // Check fallback for totalAmount
            quotedAmount = getDoubleSafe(payload.get("totalAmount"));
        }
        if ((quotedAmount == null || quotedAmount <= 0) && !quotation.getItems().isEmpty()) {
            quotedAmount = Math.round((quotation.getMaterialCost() + quotation.getLabourCost() + quotation.getTransportationCost() + quotation.getTaxGst()) * 100.0) / 100.0;
        }
        if (quotedAmount == null || quotedAmount <= 0) {
            throw new IllegalArgumentException("Valid quotedAmount (> 0) is required.");
        }
        quotation.setQuotedAmount(quotedAmount);

        // 8. Terms & Content Mapping
        quotation.setTimeline(getString(payload, "timeline"));
        quotation.setValidity(getString(payload, "validity"));
        quotation.setWarranty(getString(payload, "warranty"));
        quotation.setPaymentTerms(getString(payload, "paymentTerms"));

        quotation.setIncludedItems(getString(payload, "includedItems"));
        quotation.setExcludedItems(getString(payload, "excludedItems"));
        quotation.setMessage(getString(payload, "message"));

        // 9. Provider & Lifecycle
        quotation.setProvider(provider);
        quotation.setStatus("SUBMITTED");
        quotation.setQuotationId(generateQuotationId());

        Quotation saved = quotationRepository.save(quotation);
        if (quotationItemRepository != null && saved.getItems() != null && !saved.getItems().isEmpty()) {
            for (QuotationItem qi : saved.getItems()) {
                quotationItemRepository.save(qi);
            }
        }
        return saved;
    }

    /**
     * Customer retrieval of quotations for their own request.
     * Strictly verifies customer ownership.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuotationsForCustomerRequest(
            String requestType,
            String requestId,
            MarketplaceBackendApplication.MarketplaceUser customer
    ) {
        if (customer == null) {
            throw new IllegalArgumentException("Customer authentication required.");
        }

        String normType = requestType != null ? requestType.trim().toUpperCase() : "";

        if ("MATERIAL_REQUIREMENT".equals(normType) || "MATERIAL".equals(normType) || "MATERIAL_REQUEST".equals(normType)) {
            MaterialRequest matReq = resolveMaterialRequest(requestId);
            if (matReq == null) {
                throw new NoSuchElementException("Material request not found for ID: " + requestId);
            }
            if (matReq.getBuyer() == null || !matReq.getBuyer().getId().equals(customer.getId())) {
                throw new SecurityException("Unauthorized. You do not own this material request.");
            }
            return getQuotationsForMaterialRequest(matReq.getId());
        } else if ("DIRECT_HIRE".equals(normType) || "SERVICE".equals(normType) || "DIRECT_HIRE_REQUEST".equals(normType)) {
            ClientServiceRequest csr = resolveServiceRequest(requestId);
            if (csr == null) {
                throw new NoSuchElementException("Service request not found for ID: " + requestId);
            }
            if (csr.getClient() == null || !csr.getClient().getId().equals(customer.getId())) {
                throw new SecurityException("Unauthorized. You do not own this service request.");
            }
            return getQuotationsForServiceRequest(csr.getId());
        } else {
            // Try resolving by ID pattern (e.g. MR-xxx vs CSR-xxx)
            MaterialRequest mr = resolveMaterialRequest(requestId);
            if (mr != null) {
                if (mr.getBuyer() == null || !mr.getBuyer().getId().equals(customer.getId())) {
                    throw new SecurityException("Unauthorized. You do not own this material request.");
                }
                return getQuotationsForMaterialRequest(mr.getId());
            }

            ClientServiceRequest csr = resolveServiceRequest(requestId);
            if (csr != null) {
                if (csr.getClient() == null || !csr.getClient().getId().equals(customer.getId())) {
                    throw new SecurityException("Unauthorized. You do not own this service request.");
                }
                return getQuotationsForServiceRequest(csr.getId());
            }

            throw new NoSuchElementException("Request not found for ID: " + requestId);
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuotationsForMaterialRequest(Long materialRequestId) {
        List<Quotation> list = quotationRepository.findByMaterialRequestIdOrderByCreatedAtDesc(materialRequestId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Quotation q : list) {
            result.add(toResponseMap(q));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuotationsForServiceRequest(Long serviceRequestId) {
        List<Quotation> list = quotationRepository.findByServiceRequestIdOrderByCreatedAtDesc(serviceRequestId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Quotation q : list) {
            result.add(toResponseMap(q));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuotationsByProvider(MarketplaceBackendApplication.MarketplaceUser provider) {
        if (provider == null) return Collections.emptyList();
        List<Quotation> list = quotationRepository.findByProviderIdOrderByCreatedAtDesc(provider.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Quotation q : list) {
            result.add(toResponseMap(q));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getQuotationById(String idOrCode, MarketplaceBackendApplication.MarketplaceUser requester) {
        Quotation found = findQuotationByIdOrCode(idOrCode);
        if (found == null) {
            throw new NoSuchElementException("Quotation not found with ID: " + idOrCode);
        }

        // Security: Caller must be the provider or the owning customer of the linked request
        boolean isProvider = found.getProvider() != null && requester != null && found.getProvider().getId().equals(requester.getId());
        boolean isOwner = false;
        if (found.getMaterialRequest() != null && found.getMaterialRequest().getBuyer() != null && requester != null) {
            isOwner = found.getMaterialRequest().getBuyer().getId().equals(requester.getId());
        } else if (found.getServiceRequest() != null && found.getServiceRequest().getClient() != null && requester != null) {
            isOwner = found.getServiceRequest().getClient().getId().equals(requester.getId());
        }

        if (!isProvider && !isOwner) {
            throw new SecurityException("Unauthorized to access this quotation.");
        }

        return toResponseMap(found);
    }

    /**
     * Customer accepts a persistent quotation.
     * Transactional and atomic:
     * - Validates customer ownership through the parent request (buyer_id or client_id).
     * - Verifies quotation status is active (SUBMITTED or UNDER_REVIEW).
     * - Prevents duplicate or concurrent acceptance (checks request state and existing ACCEPTED quote).
     * - Marks selected quotation as ACCEPTED.
     * - Updates parent request status to ACCEPTED / Accepted.
     * - Atomically marks all other active competing quotations for the same request as REJECTED.
     * - Already REJECTED, EXPIRED, or WITHDRAWN quotations remain unchanged.
     */
    @Transactional
    public Map<String, Object> acceptQuotation(String idOrCode, MarketplaceBackendApplication.MarketplaceUser customer) {
        if (customer == null) {
            throw new IllegalArgumentException("Customer authentication required.");
        }

        Quotation quotation = findQuotationByIdOrCode(idOrCode);
        if (quotation == null) {
            throw new NoSuchElementException("Quotation not found with ID: " + idOrCode);
        }

        // Only customers can accept quotations
        if (!hasAnyRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            throw new SecurityException("Access denied. Only customers can accept quotations.");
        }

        String reqType = quotation.getRequestType();
        LocalDateTime now = LocalDateTime.now();

        if ("MATERIAL_REQUIREMENT".equalsIgnoreCase(reqType)) {
            MaterialRequest mr = quotation.getMaterialRequest();
            if (mr == null) {
                throw new IllegalStateException("Quotation is not properly linked to a Material Request.");
            }

            // Customer ownership check
            if (mr.getBuyer() == null || !mr.getBuyer().getId().equals(customer.getId())) {
                throw new SecurityException("Unauthorized. You do not own this material request.");
            }

            // Pessimistic lock / re-read parent request to prevent concurrent double-acceptance
            MaterialRequest lockedMr = materialRequestRepository.findByIdForUpdate(mr.getId())
                    .orElseGet(() -> materialRequestRepository.findById(mr.getId()).orElse(mr));

            // Verify no other quotation has already been accepted and request is not already accepted
            if ("ACCEPTED".equalsIgnoreCase(lockedMr.getStatus()) ||
                    quotationRepository.existsByMaterialRequestIdAndStatus(lockedMr.getId(), "ACCEPTED")) {
                throw new IllegalStateException("Another quotation has already been accepted for this material request.");
            }

            // Status check on the selected quotation
            validateQuotationCanBeAccepted(quotation);

            // -------------------------------------------------------------
            // Phase 4D: INVENTORY RESERVATION & STOCK SAFETY
            // -------------------------------------------------------------
            List<QuotationItem> qItems = quotation.getItems();
            if ((qItems == null || qItems.isEmpty()) && quotationItemRepository != null && quotation.getId() != null) {
                qItems = quotationItemRepository.findByQuotationId(quotation.getId());
            }

            // Only itemized quotations undergo inventory reservation (Phase 4D)
            // Legacy aggregate-only quotations preserve Phase 4A behavior without inventory mutations
            if (qItems != null && !qItems.isEmpty()) {
                if (materialRepository == null) {
                    throw new IllegalStateException("Material repository is required for inventory reservation.");
                }

                // 1. Validate quotation items & aggregate quantities per material ID
                Map<Long, Double> requiredQuantities = new HashMap<>();
                Map<Long, String> itemUnits = new HashMap<>();

                for (QuotationItem qi : qItems) {
                    if (qi == null) {
                        throw new IllegalStateException("Quotation contains an invalid null line item.");
                    }
                    if (qi.getMaterial() == null || qi.getMaterial().getId() == null) {
                        throw new IllegalStateException("Quotation line item is missing catalog material reference.");
                    }
                    Double qty = qi.getQuotedQuantity();
                    if (qty == null || Double.isNaN(qty) || Double.isInfinite(qty) || qty <= 0) {
                        throw new IllegalArgumentException("Invalid quantity for quotation item: " +
                                (qi.getMaterialName() != null ? qi.getMaterialName() : "Material") +
                                ". Quantity must be a positive finite number.");
                    }
                    Long matId = qi.getMaterial().getId();
                    requiredQuantities.merge(matId, qty, Double::sum);
                    if (!itemUnits.containsKey(matId) && qi.getQuotedUnit() != null) {
                        itemUnits.put(matId, qi.getQuotedUnit());
                    }
                }

                // 2. Deterministic lock order: Sort unique material IDs in ascending order to prevent deadlocks
                List<Long> sortedMaterialIds = new ArrayList<>(requiredQuantities.keySet());
                Collections.sort(sortedMaterialIds);

                // 3. Pessimistically lock every referenced Material row in deterministic order
                Map<Long, Material> lockedMaterials = new LinkedHashMap<>();
                for (Long matId : sortedMaterialIds) {
                    Material lockedMat = materialRepository.findByIdForUpdate(matId)
                            .orElseGet(() -> materialRepository.findById(matId).orElse(null));

                    if (lockedMat == null) {
                        throw new NoSuchElementException("Material catalog item not found for ID: " + matId);
                    }

                    // 4. Re-validate seller ownership: Quotation provider must strictly own the material
                    if (lockedMat.getSeller() == null || quotation.getProvider() == null ||
                            !lockedMat.getSeller().getId().equals(quotation.getProvider().getId())) {
                        throw new SecurityException("Unauthorized inventory reservation: Material '" +
                                lockedMat.getMaterialName() + "' (ID: " + lockedMat.getId() +
                                ") does not belong to quotation provider.");
                    }

                    lockedMaterials.put(matId, lockedMat);
                }

                // 5. Multi-material stock validation: Check available stock for ALL materials BEFORE reserving any
                for (Long matId : sortedMaterialIds) {
                    Material mat = lockedMaterials.get(matId);
                    double currentStock = mat.getCurrentStock() != null ? mat.getCurrentStock() : 0.0;
                    double reservedStock = mat.getReservedStock() != null ? mat.getReservedStock() : 0.0;
                    double availableStock = mat.getAvailableStock() != null ? mat.getAvailableStock() : (currentStock - reservedStock);
                    double reqQty = requiredQuantities.get(matId);

                    // If stock is insufficient or OUT_OF_STOCK
                    if (availableStock < reqQty || (availableStock <= 0 && reqQty > 0)) {
                        String unit = mat.getUnit() != null && !mat.getUnit().isBlank() ? mat.getUnit() : itemUnits.getOrDefault(matId, "Units");
                        String reqFormatted = (reqQty == Math.floor(reqQty)) ? String.valueOf((long) reqQty) : String.valueOf(reqQty);
                        String availFormatted = (availableStock == Math.floor(availableStock)) ? String.valueOf((long) availableStock) : String.valueOf(availableStock);
                        throw new IllegalStateException("Insufficient stock for material: " + mat.getMaterialName() +
                                ". Requested: " + reqFormatted + " " + unit + ". Available: " + availFormatted + " " + unit + ".");
                    }
                }

                // 6. Atomically reserve inventory and verify invariants
                for (Long matId : sortedMaterialIds) {
                    Material mat = lockedMaterials.get(matId);
                    double currentStock = mat.getCurrentStock() != null ? mat.getCurrentStock() : 0.0;
                    double reservedStock = mat.getReservedStock() != null ? mat.getReservedStock() : 0.0;
                    double reqQty = requiredQuantities.get(matId);

                    double newReserved = reservedStock + reqQty;
                    double newAvailable = currentStock - newReserved;

                    // Invariant checks:
                    // 1. reservedStock >= 0
                    // 2. availableStock >= 0
                    // 3. reservedStock <= currentStock
                    if (newReserved < 0 || newAvailable < 0 || newReserved > currentStock) {
                        throw new IllegalStateException("Stock invariant violation for material: " + mat.getMaterialName() +
                                ". currentStock=" + currentStock + ", reservedStock=" + newReserved + ", availableStock=" + newAvailable);
                    }

                    // currentStock remains completely UNCHANGED!
                    mat.setReservedStock(newReserved);
                    mat.setAvailableStock(newAvailable);
                    if (newAvailable <= 0) {
                        mat.setStockStatus("OUT_OF_STOCK");
                    } else if (newAvailable <= 10) {
                        mat.setStockStatus("LOW_STOCK");
                    }
                    materialRepository.save(mat);
                }
            }

            // 1. Mark selected quotation as ACCEPTED
            quotation.setStatus("ACCEPTED");
            quotation.setUpdatedAt(now);
            quotationRepository.save(quotation);

            // 2. Mark parent MaterialRequest as ACCEPTED
            lockedMr.setStatus("ACCEPTED");
            lockedMr.setUpdatedAt(now);
            materialRequestRepository.save(lockedMr);

            // 3. Mark all other active competing quotations as REJECTED
            List<Quotation> activeComp = quotationRepository.findByMaterialRequestIdAndStatusIn(
                    lockedMr.getId(),
                    List.of("SUBMITTED", "UNDER_REVIEW")
            );
            for (Quotation comp : activeComp) {
                if (!comp.getId().equals(quotation.getId())) {
                    comp.setStatus("REJECTED");
                    comp.setUpdatedAt(now);
                    quotationRepository.save(comp);
                }
            }

            // 4. Create MaterialOrder atomically (Phase 4A)
            MaterialOrder order = null;
            if (materialOrderService != null) {
                order = materialOrderService.createOrderFromAcceptedQuotation(quotation, lockedMr, customer);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("message", "Quotation accepted successfully");
            resp.put("quotationId", quotation.getQuotationId());
            resp.put("status", "ACCEPTED");
            resp.put("requestType", "MATERIAL_REQUIREMENT");
            resp.put("requestId", lockedMr.getId());
            resp.put("businessRequestId", lockedMr.getRequestId());
            resp.put("requestStatus", lockedMr.getStatus());
            if (order != null) {
                resp.put("orderId", order.getId());
                resp.put("orderCode", order.getOrderCode());
            }
            return resp;

        } else if ("DIRECT_HIRE".equalsIgnoreCase(reqType)) {
            ClientServiceRequest csr = quotation.getServiceRequest();
            if (csr == null) {
                throw new IllegalStateException("Quotation is not properly linked to a Service Request.");
            }

            // Customer ownership check
            if (csr.getClient() == null || !csr.getClient().getId().equals(customer.getId())) {
                throw new SecurityException("Unauthorized. You do not own this service request.");
            }

            // Pessimistic lock / re-read parent request to prevent concurrent double-acceptance
            ClientServiceRequest lockedCsr = clientServiceRequestRepository.findByIdForUpdate(csr.getId())
                    .orElseGet(() -> clientServiceRequestRepository.findById(csr.getId()).orElse(csr));

            // Verify no other quotation has already been accepted and request is not already accepted
            if ("Accepted".equalsIgnoreCase(lockedCsr.getStatus()) ||
                    quotationRepository.existsByServiceRequestIdAndStatus(lockedCsr.getId(), "ACCEPTED")) {
                throw new IllegalStateException("Another quotation has already been accepted for this service request.");
            }

            // Status check on the selected quotation
            validateQuotationCanBeAccepted(quotation);

            // 1. Mark selected quotation as ACCEPTED
            quotation.setStatus("ACCEPTED");
            quotation.setUpdatedAt(now);
            quotationRepository.save(quotation);

            // 2. Mark parent ClientServiceRequest as Accepted
            lockedCsr.setStatus("Accepted");
            lockedCsr.setUpdatedAt(now);
            clientServiceRequestRepository.save(lockedCsr);

            // 3. Mark all other active competing quotations as REJECTED
            List<Quotation> activeComp = quotationRepository.findByServiceRequestIdAndStatusIn(
                    lockedCsr.getId(),
                    List.of("SUBMITTED", "UNDER_REVIEW")
            );
            for (Quotation comp : activeComp) {
                if (!comp.getId().equals(quotation.getId())) {
                    comp.setStatus("REJECTED");
                    comp.setUpdatedAt(now);
                    quotationRepository.save(comp);
                }
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("message", "Quotation accepted successfully");
            resp.put("quotationId", quotation.getQuotationId());
            resp.put("status", "ACCEPTED");
            resp.put("requestType", "DIRECT_HIRE");
            resp.put("requestId", lockedCsr.getId());
            resp.put("businessRequestId", lockedCsr.getRequestId());
            resp.put("requestStatus", lockedCsr.getStatus());
            return resp;

        } else {
            throw new IllegalArgumentException("Unsupported quotation request type: " + reqType);
        }
    }

    /**
     * Customer rejects a persistent quotation.
     * - Validates customer ownership of the linked request.
     * - Verifies quotation is in an active state (SUBMITTED or UNDER_REVIEW).
     * - Transitions quotation status to REJECTED.
     * - Does NOT modify other quotations.
     * - Does NOT modify the parent request status.
     */
    @Transactional
    public Map<String, Object> rejectQuotation(String idOrCode, MarketplaceBackendApplication.MarketplaceUser customer) {
        if (customer == null) {
            throw new IllegalArgumentException("Customer authentication required.");
        }

        Quotation quotation = findQuotationByIdOrCode(idOrCode);
        if (quotation == null) {
            throw new NoSuchElementException("Quotation not found with ID: " + idOrCode);
        }

        // Only customers can reject quotations
        if (!hasAnyRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            throw new SecurityException("Access denied. Only customers can reject quotations.");
        }

        String reqType = quotation.getRequestType();

        if ("MATERIAL_REQUIREMENT".equalsIgnoreCase(reqType)) {
            MaterialRequest mr = quotation.getMaterialRequest();
            if (mr == null || mr.getBuyer() == null || !mr.getBuyer().getId().equals(customer.getId())) {
                throw new SecurityException("Unauthorized. You do not own this material request.");
            }
        } else if ("DIRECT_HIRE".equalsIgnoreCase(reqType)) {
            ClientServiceRequest csr = quotation.getServiceRequest();
            if (csr == null || csr.getClient() == null || !csr.getClient().getId().equals(customer.getId())) {
                throw new SecurityException("Unauthorized. You do not own this service request.");
            }
        } else {
            throw new IllegalArgumentException("Unsupported quotation request type: " + reqType);
        }

        validateQuotationCanBeRejected(quotation);

        quotation.setStatus("REJECTED");
        quotation.setUpdatedAt(LocalDateTime.now());
        quotationRepository.save(quotation);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("message", "Quotation rejected successfully");
        resp.put("quotationId", quotation.getQuotationId());
        resp.put("status", "REJECTED");
        resp.put("requestType", quotation.getRequestType());
        if (quotation.getMaterialRequest() != null) {
            resp.put("requestId", quotation.getMaterialRequest().getId());
            resp.put("businessRequestId", quotation.getMaterialRequest().getRequestId());
            resp.put("requestStatus", quotation.getMaterialRequest().getStatus());
        } else if (quotation.getServiceRequest() != null) {
            resp.put("requestId", quotation.getServiceRequest().getId());
            resp.put("businessRequestId", quotation.getServiceRequest().getRequestId());
            resp.put("requestStatus", quotation.getServiceRequest().getStatus());
        }
        return resp;
    }

    /**
     * Isolated inventory reservation release primitive for future cancellation lifecycle (Phase 4D).
     * Does NOT modify order status or expose a public customer/seller cancellation endpoint.
     */
    @Transactional
    public void releaseReservation(Quotation quotation) {
        if (quotation == null || !"MATERIAL_REQUIREMENT".equalsIgnoreCase(quotation.getRequestType())) {
            return;
        }
        List<QuotationItem> qItems = quotation.getItems();
        if ((qItems == null || qItems.isEmpty()) && quotationItemRepository != null && quotation.getId() != null) {
            qItems = quotationItemRepository.findByQuotationId(quotation.getId());
        }
        if (qItems == null || qItems.isEmpty() || materialRepository == null) {
            return;
        }

        Map<Long, Double> requiredQuantities = new HashMap<>();
        for (QuotationItem qi : qItems) {
            if (qi != null && qi.getMaterial() != null && qi.getMaterial().getId() != null && qi.getQuotedQuantity() != null) {
                requiredQuantities.merge(qi.getMaterial().getId(), qi.getQuotedQuantity(), Double::sum);
            }
        }

        List<Long> sortedMaterialIds = new ArrayList<>(requiredQuantities.keySet());
        Collections.sort(sortedMaterialIds);

        for (Long matId : sortedMaterialIds) {
            Material lockedMat = materialRepository.findByIdForUpdate(matId)
                    .orElseGet(() -> materialRepository.findById(matId).orElse(null));
            if (lockedMat != null) {
                double reqQty = requiredQuantities.get(matId);
                double currentStock = lockedMat.getCurrentStock() != null ? lockedMat.getCurrentStock() : 0.0;
                double reservedStock = lockedMat.getReservedStock() != null ? lockedMat.getReservedStock() : 0.0;

                double newReserved = Math.max(0.0, reservedStock - reqQty);
                double newAvailable = currentStock - newReserved;

                lockedMat.setReservedStock(newReserved);
                lockedMat.setAvailableStock(newAvailable);
                if (newAvailable <= 0) {
                    lockedMat.setStockStatus("OUT_OF_STOCK");
                } else if (newAvailable <= 10) {
                    lockedMat.setStockStatus("LOW_STOCK");
                } else {
                    lockedMat.setStockStatus("IN_STOCK");
                }
                materialRepository.save(lockedMat);
            }
        }
    }

    private void validateQuotationCanBeAccepted(Quotation quotation) {
        String status = quotation.getStatus() != null ? quotation.getStatus().toUpperCase() : "SUBMITTED";
        if ("ACCEPTED".equals(status)) {
            throw new IllegalStateException("Quotation is already accepted.");
        }
        if ("REJECTED".equals(status)) {
            throw new IllegalStateException("Cannot accept a rejected quotation.");
        }
        if ("EXPIRED".equals(status)) {
            throw new IllegalStateException("Cannot accept an expired quotation.");
        }
        if ("WITHDRAWN".equals(status)) {
            throw new IllegalStateException("Cannot accept a withdrawn quotation.");
        }
        if (!"SUBMITTED".equals(status) && !"UNDER_REVIEW".equals(status)) {
            throw new IllegalStateException("Quotation cannot be accepted from status: " + status);
        }
    }

    private void validateQuotationCanBeRejected(Quotation quotation) {
        String status = quotation.getStatus() != null ? quotation.getStatus().toUpperCase() : "SUBMITTED";
        if ("ACCEPTED".equals(status)) {
            throw new IllegalStateException("Cannot reject an already accepted quotation.");
        }
        if ("REJECTED".equals(status)) {
            throw new IllegalStateException("Quotation is already rejected.");
        }
        if ("EXPIRED".equals(status)) {
            throw new IllegalStateException("Cannot reject an expired quotation.");
        }
        if ("WITHDRAWN".equals(status)) {
            throw new IllegalStateException("Cannot reject a withdrawn quotation.");
        }
        if (!"SUBMITTED".equals(status) && !"UNDER_REVIEW".equals(status)) {
            throw new IllegalStateException("Quotation cannot be rejected from status: " + status);
        }
    }

    private Quotation findQuotationByIdOrCode(String idOrCode) {
        if (idOrCode == null || idOrCode.isBlank()) return null;
        Long numId = parseLongSafe(idOrCode);
        if (numId != null) {
            Optional<Quotation> opt = quotationRepository.findById(numId);
            if (opt.isPresent()) return opt.get();
        }
        return quotationRepository.findByQuotationId(idOrCode).orElse(null);
    }

    /**
     * Seller eligibility check mirroring GET /api/material-requests/seller.
     */
    public boolean isSellerEligible(MaterialRequest req, MarketplaceBackendApplication.MarketplaceUser seller) {
        if (req == null || seller == null) return false;
        if ("DIRECT_MATERIAL".equalsIgnoreCase(req.getRequestType())) {
            return false;
        }

        String sellerLocation = seller.getLocation() != null ? seller.getLocation().trim() : "";
        GeoLocationService.GeoLocation sellerGeo = geoLocationService.resolveLocation(sellerLocation);
        String sellerState = "";
        Double sellerLat = null;
        Double sellerLon = null;

        if (sellerGeo != null) {
            if (sellerGeo.state() != null && !sellerGeo.state().isBlank()) {
                sellerState = sellerGeo.state();
            }
            if (sellerGeo.hasCoordinates()) {
                sellerLat = sellerGeo.latitude();
                sellerLon = sellerGeo.longitude();
            }
        }
        if (sellerState.isEmpty()) {
            sellerState = geoLocationService.normalizeStateName(sellerLocation);
        }

        String scope = req.getRequestScope() != null ? req.getRequestScope().toUpperCase() : "STATE";

        if ("ALL_INDIA".equalsIgnoreCase(scope)) {
            return true;
        } else if ("STATE".equalsIgnoreCase(scope)) {
            String reqState = req.getState() != null ? req.getState().trim() : "";
            return matchesState(sellerState, sellerLocation, reqState);
        } else if ("LOCAL".equalsIgnoreCase(scope)) {
            int radius = req.getLocalRadius() != null ? req.getLocalRadius() : 25;
            if (sellerLat != null && sellerLon != null && req.getLatitude() != null && req.getLongitude() != null) {
                double distKm = geoLocationService.calculateHaversineDistanceKm(
                        sellerLat, sellerLon, req.getLatitude(), req.getLongitude()
                );
                return distKm <= radius;
            } else {
                String reqCombined = (req.getCity() + " " + req.getPinCode() + " " + req.getState()).trim();
                if (geoLocationService.areLocationsEquivalent(sellerLocation, reqCombined)) {
                    return true;
                } else if (sellerGeo != null && sellerGeo.pincode() != null && sellerGeo.pincode().equals(req.getPinCode())) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean matchesState(String sellerState, String sellerLocation, String reqState) {
        if (reqState == null || reqState.isBlank()) return true;
        if (sellerState != null && !sellerState.isBlank()) {
            if (sellerState.equalsIgnoreCase(reqState)) return true;
            String normSeller = sellerState.toLowerCase().replace(" ", "");
            String normReq = reqState.toLowerCase().replace(" ", "");
            if (normSeller.contains(normReq) || normReq.contains(normSeller)) return true;
        }
        if (sellerLocation != null && !sellerLocation.isBlank()) {
            String lowerLoc = sellerLocation.toLowerCase();
            String lowerReq = reqState.toLowerCase();
            if (lowerLoc.contains(lowerReq)) return true;
        }
        return false;
    }

    /**
     * Map Quotation entity to comprehensive response matching UI expectations.
     */
    public Map<String, Object> toResponseMap(Quotation q) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", q.getQuotationId());
        map.put("quotationId", q.getQuotationId());
        map.put("backendId", q.getId());
        map.put("requestType", q.getRequestType());

        if (q.getMaterialRequest() != null) {
            map.put("materialRequestId", q.getMaterialRequest().getId());
            map.put("businessRequestId", q.getMaterialRequest().getRequestId());
        } else if (q.getServiceRequest() != null) {
            map.put("serviceRequestId", q.getServiceRequest().getId());
            map.put("businessRequestId", q.getServiceRequest().getRequestId());
        }

        // Provider Details
        if (q.getProvider() != null) {
            map.put("providerId", q.getProvider().getId());
            map.put("providerName", q.getProvider().getName() != null ? q.getProvider().getName() : "Verified Provider");
            map.put("providerEmail", q.getProvider().getEmail() != null ? q.getProvider().getEmail() : "");
            map.put("providerPhone", q.getProvider().getPhone() != null ? q.getProvider().getPhone() : "");
            map.put("providerLocation", q.getProvider().getLocation() != null ? q.getProvider().getLocation() : "");
        } else {
            map.put("providerId", null);
            map.put("providerName", "Verified Provider");
        }

        map.put("providerType", q.getProviderRole());
        map.put("providerTypeLabel", "MATERIAL_SELLER".equalsIgnoreCase(q.getProviderRole()) ? "Material Seller" : "Professional");

        // Commercial breakdown
        map.put("quotedAmount", q.getQuotedAmount());
        map.put("materialAmount", q.getMaterialCost() != null ? q.getMaterialCost() : 0.0);
        map.put("materialCost", q.getMaterialCost() != null ? q.getMaterialCost() : 0.0);
        map.put("labourAmount", q.getLabourCost() != null ? q.getLabourCost() : 0.0);
        map.put("labourCost", q.getLabourCost() != null ? q.getLabourCost() : 0.0);
        map.put("transportation", q.getTransportationCost() != null ? q.getTransportationCost() : 0.0);
        map.put("transportationCost", q.getTransportationCost() != null ? q.getTransportationCost() : 0.0);
        map.put("taxes", q.getTaxGst() != null ? q.getTaxGst() : 0.0);
        map.put("taxGst", q.getTaxGst() != null ? q.getTaxGst() : 0.0);
        map.put("totalAmount", q.getQuotedAmount());

        // Terms
        map.put("timeline", q.getTimeline() != null ? q.getTimeline() : "");
        map.put("validity", q.getValidity() != null ? q.getValidity() : "");
        map.put("warranty", q.getWarranty() != null ? q.getWarranty() : "");
        map.put("paymentTerms", q.getPaymentTerms() != null ? q.getPaymentTerms() : "");

        // Content
        map.put("includedItems", q.getIncludedItems() != null ? q.getIncludedItems() : "");
        map.put("excludedItems", q.getExcludedItems() != null ? q.getExcludedItems() : "");
        map.put("message", q.getMessage() != null ? q.getMessage() : "");

        // Lifecycle & Timestamps
        map.put("status", q.getStatus() != null ? q.getStatus() : "SUBMITTED");
        map.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : "");
        map.put("updatedAt", q.getUpdatedAt() != null ? q.getUpdatedAt().toString() : "");

        // Expose itemized line items (Phase 4C)
        List<Map<String, Object>> itemsList = new ArrayList<>();
        List<QuotationItem> qItems = q.getItems();
        if ((qItems == null || qItems.isEmpty()) && quotationItemRepository != null && q.getId() != null) {
            qItems = quotationItemRepository.findByQuotationId(q.getId());
        }
        if (qItems != null) {
            for (QuotationItem item : qItems) {
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("materialRequestItemId", item.getMaterialRequestItem() != null ? item.getMaterialRequestItem().getId() : null);
                itemMap.put("materialId", item.getMaterial() != null ? item.getMaterial().getId() : null);
                itemMap.put("materialName", item.getMaterialName());
                itemMap.put("quotedQuantity", item.getQuotedQuantity());
                itemMap.put("quantity", item.getQuotedQuantity());
                itemMap.put("quotedUnit", item.getQuotedUnit());
                itemMap.put("unit", item.getQuotedUnit());
                itemMap.put("unitPrice", item.getUnitPrice());
                itemMap.put("lineTotal", item.getLineTotal());
                itemsList.add(itemMap);
            }
        }
        map.put("items", itemsList);

        // Nested helper structures for UI compatibility
        Map<String, Object> costBreakdown = new LinkedHashMap<>();
        costBreakdown.put("material", map.get("materialAmount"));
        costBreakdown.put("labour", map.get("labourAmount"));
        costBreakdown.put("freight", map.get("transportation"));
        costBreakdown.put("taxes", map.get("taxes"));
        costBreakdown.put("total", map.get("totalAmount"));
        costBreakdown.put("items", itemsList);
        map.put("costBreakdown", costBreakdown);

        Map<String, Object> terms = new LinkedHashMap<>();
        terms.put("payment", q.getPaymentTerms() != null ? q.getPaymentTerms() : "");
        terms.put("warranty", q.getWarranty() != null ? q.getWarranty() : "");
        terms.put("timeline", q.getTimeline() != null ? q.getTimeline() : "");
        terms.put("validity", q.getValidity() != null ? q.getValidity() : "");
        map.put("terms", terms);

        return map;
    }

    private synchronized String generateQuotationId() {
        Long maxId = quotationRepository.findMaxId();
        long nextNum = (maxId != null ? maxId : 0L) + 1L;
        String candidate = "QT-" + (1000L + nextNum);

        int attempts = 0;
        while (quotationRepository.findByQuotationId(candidate).isPresent() && attempts < 100) {
            nextNum++;
            candidate = "QT-" + (1000L + nextNum);
            attempts++;
        }
        return candidate;
    }

    private MaterialRequest resolveMaterialRequest(String idOrRequestId) {
        if (idOrRequestId == null || idOrRequestId.isBlank()) return null;
        Long id = parseLongSafe(idOrRequestId);
        if (id != null) {
            Optional<MaterialRequest> byId = materialRequestRepository.findById(id);
            if (byId.isPresent()) return byId.get();
        }
        return materialRequestRepository.findByRequestId(idOrRequestId).orElse(null);
    }

    private ClientServiceRequest resolveServiceRequest(String idOrRequestId) {
        if (idOrRequestId == null || idOrRequestId.isBlank()) return null;
        Long id = parseLongSafe(idOrRequestId);
        if (id != null) {
            Optional<ClientServiceRequest> byId = clientServiceRequestRepository.findById(id);
            if (byId.isPresent()) return byId.get();
        }
        return clientServiceRequestRepository.findByRequestId(idOrRequestId).orElse(null);
    }

    private boolean hasAnyRole(MarketplaceBackendApplication.MarketplaceUser user, MarketplaceBackendApplication.Role... targets) {
        if (user == null || user.getRoles() == null) return false;
        for (MarketplaceBackendApplication.Role target : targets) {
            if (user.getRoles().contains(target)) return true;
        }
        return false;
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString().trim() : null;
    }

    private Long getLongSafe(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        return parseLongSafe(val.toString());
    }

    private Long parseLongSafe(String s) {
        if (s == null) return null;
        try {
            return Long.parseLong(s.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return null;
        }
    }

    private Double getDoubleSafe(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            String clean = val.toString().replace(",", "").replace("₹", "").trim();
            if (clean.isEmpty()) return null;
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return null;
        }
    }
}
