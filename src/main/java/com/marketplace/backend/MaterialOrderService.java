package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BUILDBID - MATERIAL ORDER SERVICE (Phase 4A)
 * 
 * Manages the atomic creation, snapshotting, and secure retrieval of Material Orders.
 */
@Service
public class MaterialOrderService {

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final MaterialOrderRepository materialOrderRepository;
    private final MaterialOrderItemRepository materialOrderItemRepository;
    private final QuotationItemRepository quotationItemRepository;
    private final MaterialRepository materialRepository;
    private final MaterialRequestRepository materialRequestRepository;
    private final QuotationRepository quotationRepository;
    private final NotificationService notificationService;

    @Autowired
    public MaterialOrderService(
            MaterialOrderRepository materialOrderRepository,
            MaterialOrderItemRepository materialOrderItemRepository,
            QuotationItemRepository quotationItemRepository,
            MaterialRepository materialRepository,
            MaterialRequestRepository materialRequestRepository,
            QuotationRepository quotationRepository,
            NotificationService notificationService
    ) {
        this.materialOrderRepository = materialOrderRepository;
        this.materialOrderItemRepository = materialOrderItemRepository;
        this.quotationItemRepository = quotationItemRepository;
        this.materialRepository = materialRepository;
        this.materialRequestRepository = materialRequestRepository;
        this.quotationRepository = quotationRepository;
        this.notificationService = notificationService;
    }

    public MaterialOrderService(
            MaterialOrderRepository materialOrderRepository,
            MaterialOrderItemRepository materialOrderItemRepository,
            QuotationItemRepository quotationItemRepository,
            MaterialRepository materialRepository
    ) {
        this(materialOrderRepository, materialOrderItemRepository, quotationItemRepository, materialRepository, null, null, null);
    }

    public MaterialOrderService(
            MaterialOrderRepository materialOrderRepository,
            MaterialOrderItemRepository materialOrderItemRepository,
            QuotationItemRepository quotationItemRepository
    ) {
        this(materialOrderRepository, materialOrderItemRepository, quotationItemRepository, null, null, null, null);
    }

    public MaterialOrderService(MaterialOrderRepository materialOrderRepository) {
        this(materialOrderRepository, null, null, null, null, null, null);
    }

    /**
     * Atomically creates a MaterialOrder from an accepted MATERIAL_REQUIREMENT quotation.
     * Snapshotting:
     * - materialAmount, transportationAmount, taxGst, totalAmount, currency
     * - deliveryAddress, contactNumber, paymentTerms
     * - buyer, buyerRole, seller
     * Idempotency & Duplicate Protection:
     * - Checks existsByQuotationId
     * - Database UNIQUE(quotation_id)
     */
    @Transactional
    public MaterialOrder createOrderFromAcceptedQuotation(
            Quotation quotation,
            MaterialRequest materialRequest,
            MarketplaceBackendApplication.MarketplaceUser buyer
    ) {
        if (quotation == null || quotation.getId() == null) {
            throw new IllegalArgumentException("Valid persisted quotation is required to create an order.");
        }

        // Only MATERIAL_REQUIREMENT quotations create a MaterialOrder in Phase 4A
        if (!"MATERIAL_REQUIREMENT".equalsIgnoreCase(quotation.getRequestType())) {
            return null;
        }

        // Idempotency: If an order already exists for this quotation, return existing order
        if (materialOrderRepository.existsByQuotationId(quotation.getId())) {
            return materialOrderRepository.findByQuotationId(quotation.getId()).orElse(null);
        }

        if (materialRequest == null) {
            materialRequest = quotation.getMaterialRequest();
        }
        if (materialRequest == null) {
            throw new IllegalStateException("Material Request is required to create a MaterialOrder.");
        }

        MarketplaceBackendApplication.MarketplaceUser seller = quotation.getProvider();
        if (seller == null) {
            throw new IllegalStateException("Quotation provider (seller) is missing.");
        }

        // Determine buyer
        MarketplaceBackendApplication.MarketplaceUser effectiveBuyer = buyer != null ? buyer : materialRequest.getBuyer();
        if (effectiveBuyer == null) {
            throw new IllegalStateException("Material request buyer is missing.");
        }

        // Determine buyer role snapshot (Universal Buyer: CUSTOMER, CONTRACTOR, PROFESSIONAL)
        String buyerRole = "CUSTOMER";
        if (effectiveBuyer.getRoles() != null && !effectiveBuyer.getRoles().isEmpty()) {
            if (effectiveBuyer.getRoles().contains(MarketplaceBackendApplication.Role.CONTRACTOR)) {
                buyerRole = "CONTRACTOR";
            } else if (effectiveBuyer.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL) ||
                       effectiveBuyer.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER)) {
                buyerRole = "PROFESSIONAL";
            } else if (effectiveBuyer.getRoles().contains(MarketplaceBackendApplication.Role.CUSTOMER)) {
                buyerRole = "CUSTOMER";
            } else if (materialRequest.getBuyerRole() != null && !materialRequest.getBuyerRole().isBlank()) {
                buyerRole = materialRequest.getBuyerRole().trim().toUpperCase();
            }
        } else if (materialRequest.getBuyerRole() != null && !materialRequest.getBuyerRole().isBlank()) {
            buyerRole = materialRequest.getBuyerRole().trim().toUpperCase();
        }

        LocalDateTime now = LocalDateTime.now();

        MaterialOrder order = new MaterialOrder();
        order.setOrderCode(generateOrderCode());
        order.setQuotation(quotation);
        order.setMaterialRequest(materialRequest);
        order.setBuyer(effectiveBuyer);
        order.setBuyerRole(buyerRole);
        order.setSeller(seller);

        // Financial snapshot
        Double materialAmount = quotation.getMaterialCost() != null ? quotation.getMaterialCost() : 0.0;
        Double transportationAmount = quotation.getTransportationCost() != null ? quotation.getTransportationCost() : 0.0;
        Double taxGst = quotation.getTaxGst() != null ? quotation.getTaxGst() : 0.0;
        Double totalAmount = quotation.getQuotedAmount() != null ? quotation.getQuotedAmount() : 0.0;

        order.setMaterialAmount(materialAmount);
        order.setTransportationAmount(transportationAmount);
        order.setTaxGst(taxGst);
        order.setTotalAmount(totalAmount);
        order.setCurrency("INR");

        // Delivery snapshot
        order.setDeliveryAddress(materialRequest.getDeliveryAddress() != null ? materialRequest.getDeliveryAddress() : "");
        String contact = materialRequest.getContactPhone() != null ? materialRequest.getContactPhone() : "";
        if (contact.isBlank() && effectiveBuyer.getPhone() != null) {
            contact = effectiveBuyer.getPhone();
        }
        order.setContactNumber(contact);

        // Commercial terms snapshot
        order.setPaymentTerms(quotation.getPaymentTerms() != null ? quotation.getPaymentTerms() : "");

        // Initial statuses
        order.setOrderStatus("CONFIRMED");
        order.setPaymentStatus("PENDING");
        order.setDeliveryStatus("PENDING");

        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        order.setConfirmedAt(now);

        // Snapshot QuotationItems into MaterialOrderItems (Phase 4C)
        List<QuotationItem> qItems = quotation.getItems();
        if ((qItems == null || qItems.isEmpty()) && quotationItemRepository != null && quotation.getId() != null) {
            qItems = quotationItemRepository.findByQuotationId(quotation.getId());
        }

        if (qItems != null && !qItems.isEmpty()) {
            for (QuotationItem qi : qItems) {
                MaterialOrderItem moi = new MaterialOrderItem();
                moi.setMaterialOrder(order);
                moi.setQuotationItem(qi);
                moi.setMaterial(qi.getMaterial());

                String matName = qi.getMaterialName();
                if ((matName == null || matName.isBlank()) && qi.getMaterial() != null) {
                    matName = qi.getMaterial().getMaterialName();
                }
                moi.setMaterialName(matName != null ? matName : "Material Item");
                moi.setQuantity(qi.getQuotedQuantity() != null ? qi.getQuotedQuantity() : 0.0);
                moi.setUnit(qi.getQuotedUnit() != null ? qi.getQuotedUnit() : "");
                moi.setUnitPrice(qi.getUnitPrice() != null ? qi.getUnitPrice() : 0.0);
                double subtotal = qi.getLineTotal() != null ? qi.getLineTotal()
                        : Math.round(moi.getQuantity() * moi.getUnitPrice() * 100.0) / 100.0;
                moi.setSubtotal(subtotal);
                moi.setItemStatus("CONFIRMED");
                moi.setCreatedAt(now);
                order.addItem(moi);
            }
        }

        try {
            return materialOrderRepository.save(order);
        } catch (DataIntegrityViolationException dive) {
            // Concurrent race condition protected by DB unique constraint
            Optional<MaterialOrder> existing = materialOrderRepository.findByQuotationId(quotation.getId());
            if (existing.isPresent()) {
                return existing.get();
            }
            throw dive;
        }
    }

    public static boolean isAcceptedOrderStatus(String status) {
        if (status == null || status.isBlank()) return false;
        String s = status.trim().toUpperCase();
        if ("WAITING_FOR_ACCEPTANCE".equals(s) || 
            "CANCELLED".equals(s) || 
            "REJECTED".equals(s) || 
            "DECLINED".equals(s) || 
            "EXPIRED".equals(s) || 
            "DRAFT".equals(s) || 
            "UNACCEPTED".equals(s) ||
            "NEW".equals(s)) {
            return false;
        }
        return true;
    }

    @Transactional(readOnly = true)
    public List<MaterialOrder> getOrdersForBuyer(MarketplaceBackendApplication.MarketplaceUser buyer) {
        if (buyer == null || buyer.getId() == null) {
            throw new IllegalArgumentException("Valid buyer authentication required.");
        }
        List<MaterialOrder> orders = materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId());
        if (orders == null) return Collections.emptyList();
        return orders.stream()
                .filter(o -> isAcceptedOrderStatus(o.getOrderStatus()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAcceptedOrdersForCustomer(MarketplaceBackendApplication.MarketplaceUser customer) {
        if (customer == null || customer.getId() == null) {
            throw new IllegalArgumentException("Valid customer authentication required.");
        }
        List<Map<String, Object>> result = new ArrayList<>();

        // 1. Material Orders (Quotation & Multi-Seller accepted orders)
        List<MaterialOrder> orders = materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(customer.getId());
        if (orders != null) {
            for (MaterialOrder o : orders) {
                if (isAcceptedOrderStatus(o.getOrderStatus())) {
                    Map<String, Object> map = toResponseMap(o);
                    map.put("type", o.getMaterialRequest() != null && o.getMaterialRequest().getRequestId() != null ? "MULTI_SELLER" : "STANDARD_ORDER");
                    map.put("typeLabel", "Multi-Seller Allocation / मल्टी-विक्रेता ऑर्डर");
                    result.add(map);
                }
            }
        }

        // 2. Direct Buy Orders (stored in MaterialRequest with requestType='DIRECT_MATERIAL')
        if (materialRequestRepository != null) {
            List<MaterialRequest> directBuyRequests = materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customer);
            if (directBuyRequests != null) {
                for (MaterialRequest mr : directBuyRequests) {
                    if ("DIRECT_MATERIAL".equalsIgnoreCase(mr.getRequestType()) && isAcceptedOrderStatus(mr.getStatus())) {
                        result.add(mapDirectBuyRequestToOrderCard(mr));
                    }
                }
            }
        }

        // Sort unified orders by submittedTimestamp descending
        result.sort((a, b) -> {
            long tsA = a.get("submittedTimestamp") instanceof Number ? ((Number) a.get("submittedTimestamp")).longValue() : 0L;
            long tsB = b.get("submittedTimestamp") instanceof Number ? ((Number) b.get("submittedTimestamp")).longValue() : 0L;
            return Long.compare(tsB, tsA);
        });

        return result;
    }

    private Map<String, Object> mapDirectBuyRequestToOrderCard(MaterialRequest mr) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", mr.getId());
        String orderCode = mr.getRequestId() != null && !mr.getRequestId().isBlank() ? mr.getRequestId() : ("DMR-" + mr.getId());
        map.put("orderId", orderCode);
        map.put("orderCode", orderCode);
        map.put("backendId", mr.getId());
        map.put("type", "DIRECT_BUY");
        map.put("typeLabel", "Direct Buy Order / सीधा खरीद ऑर्डर");
        map.put("buyerId", mr.getBuyer() != null ? mr.getBuyer().getId() : null);
        map.put("buyerRole", "CUSTOMER");
        map.put("materialRequestId", mr.getId());
        map.put("businessRequestId", mr.getRequestId());

        if (mr.getTargetSeller() != null) {
            map.put("sellerId", mr.getTargetSeller().getId());
            map.put("sellerName", mr.getTargetSeller().getName());
            map.put("sellerBusinessName", mr.getTargetSeller().getName());
            map.put("sellerPhone", mr.getTargetSeller().getPhone() != null ? mr.getTargetSeller().getPhone() : "");
            map.put("sellerEmail", mr.getTargetSeller().getEmail() != null ? mr.getTargetSeller().getEmail() : "");
            map.put("sellerLocation", mr.getTargetSeller().getLocation() != null ? mr.getTargetSeller().getLocation() : "");
            map.put("sellerAddress", mr.getTargetSeller().getLocation() != null ? mr.getTargetSeller().getLocation() : "");
        }

        // Material / Items
        List<Map<String, Object>> itemsList = new ArrayList<>();
        List<MaterialRequestItem> reqItems = mr.getItems();
        double itemsSubtotal = 0.0;
        String materialTitle = "Direct Material Purchase";
        if (reqItems != null && !reqItems.isEmpty()) {
            materialTitle = reqItems.get(0).getMaterialName();
            for (MaterialRequestItem item : reqItems) {
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("materialName", item.getMaterialName());
                itemMap.put("quantity", item.getQuantity() != null ? item.getQuantity() : 1.0);
                itemMap.put("unit", item.getUnit() != null ? item.getUnit() : "Units");
                double unitPrice = mr.getMaterialPrice() != null ? mr.getMaterialPrice() : (mr.getMaterialAmount() != null ? mr.getMaterialAmount() : 0.0);
                itemMap.put("unitPrice", unitPrice);
                double lineTotal = (itemMap.get("quantity") != null ? ((Number) itemMap.get("quantity")).doubleValue() : 1.0) * unitPrice;
                itemMap.put("subtotal", lineTotal);
                itemsSubtotal += lineTotal;
                itemsList.add(itemMap);
            }
        }
        map.put("materialTitle", materialTitle);
        map.put("items", itemsList);

        double matAmount = mr.getMaterialAmount() != null ? mr.getMaterialAmount() : (mr.getMaterialPrice() != null ? mr.getMaterialPrice() : itemsSubtotal);
        double freight = mr.getTransportationCost() != null ? mr.getTransportationCost() : 0.0;
        double tax = 0.0;
        double total = mr.getEstimatedTotal() != null ? mr.getEstimatedTotal() : (matAmount + freight + tax);

        map.put("materialAmount", matAmount);
        map.put("transportationAmount", freight);
        map.put("deliveryCharges", freight);
        map.put("taxAmount", tax);
        map.put("taxGst", tax);
        map.put("totalAmount", total);
        map.put("currency", "INR");

        map.put("deliveryAddress", mr.getDeliveryAddress() != null ? mr.getDeliveryAddress() : (mr.getCity() != null ? mr.getCity() : "Site Location"));
        map.put("contactNumber", mr.getContactPhone() != null ? mr.getContactPhone() : "");
        map.put("expectedDeliveryDate", mr.getExpectedDeliveryDate() != null ? mr.getExpectedDeliveryDate() : "Pending confirmation");

        // Status normalization
        String rawStatus = mr.getStatus() != null ? mr.getStatus().trim().toUpperCase() : "ACCEPTED";
        map.put("orderStatus", rawStatus);
        map.put("rawStatus", rawStatus);

        LocalDateTime createdAt = mr.getCreatedAt() != null ? mr.getCreatedAt() : LocalDateTime.now(IST_ZONE);
        map.put("createdAt", mr.getCreatedAt() != null ? mr.getCreatedAt().toString() : null);
        map.put("submittedDate", createdAt.format(DISPLAY_DATE_FORMATTER));
        map.put("submittedTimestamp", createdAt.atZone(IST_ZONE).toInstant().toEpochMilli());

        return map;
    }

    @Transactional(readOnly = true)
    public List<MaterialOrder> getOrdersForSeller(MarketplaceBackendApplication.MarketplaceUser seller) {
        if (seller == null || seller.getId() == null) {
            throw new IllegalArgumentException("Valid seller authentication required.");
        }
        return materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId());
    }

    @Transactional(readOnly = true)
    public MaterialOrder getOrderById(Long id, MarketplaceBackendApplication.MarketplaceUser caller) {
        if (caller == null || caller.getId() == null) {
            throw new SecurityException("Authentication required.");
        }
        MaterialOrder order = materialOrderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Material Order not found with ID: " + id));

        boolean isBuyer = order.getBuyer() != null && order.getBuyer().getId().equals(caller.getId());
        boolean isSeller = order.getSeller() != null && order.getSeller().getId().equals(caller.getId());

        if (!isBuyer && !isSeller) {
            throw new SecurityException("Unauthorized. You are not allowed to view this order.");
        }

        // If caller is buyer, order must be in an accepted state to be viewable in Customer My Orders
        if (isBuyer && !isAcceptedOrderStatus(order.getOrderStatus())) {
            throw new SecurityException("Order is awaiting seller acceptance and cannot be accessed.");
        }

        return order;
    }

    /**
     * MULTI-SELLER PROCUREMENT: Confirms Purchase Plan & allocates seller-specific orders (Flow B)
     */
    @Transactional
    public Map<String, Object> allocatePurchase(
            Long materialRequestId,
            Map<String, Object> allocationPayload,
            MarketplaceBackendApplication.MarketplaceUser caller
    ) {
        if (caller == null || caller.getId() == null) {
            throw new SecurityException("Authentication required.");
        }
        if (materialRequestId == null) {
            throw new IllegalArgumentException("Material request ID is required.");
        }
        if (allocationPayload == null || !allocationPayload.containsKey("allocations")) {
            throw new IllegalArgumentException("Valid allocations payload is required.");
        }

        if (materialRequestRepository == null || quotationRepository == null) {
            throw new IllegalStateException("Repositories are required for purchase allocation.");
        }

        MaterialRequest mr = materialRequestRepository.findByIdForUpdate(materialRequestId)
                .orElseGet(() -> materialRequestRepository.findById(materialRequestId)
                        .orElseThrow(() -> new NoSuchElementException("Material Request not found with ID: " + materialRequestId)));

        // Strict Ownership Validation
        if (mr.getBuyer() == null || !mr.getBuyer().getId().equals(caller.getId())) {
            throw new SecurityException("Unauthorized. You do not own this material request.");
        }

        String reqStatus = mr.getStatus() != null ? mr.getStatus().toUpperCase() : "NEW";
        if ("ALLOCATED".equals(reqStatus) || "ACCEPTED".equals(reqStatus) || "ORDER_ACCEPTED".equals(reqStatus)) {
            throw new IllegalStateException("This material requirement has already been allocated.");
        }
        if ("CLOSED".equals(reqStatus) || "CANCELLED".equals(reqStatus) || "DECLINED".equals(reqStatus)) {
            throw new IllegalStateException("Material Request is " + reqStatus + " and cannot be allocated.");
        }

        Object allocObj = allocationPayload.get("allocations");
        if (!(allocObj instanceof List<?>) || ((List<?>) allocObj).isEmpty()) {
            throw new IllegalArgumentException("Please select at least one seller allocation.");
        }

        List<?> rawAllocations = (List<?>) allocObj;

        // Build requirements map
        Map<Long, MaterialRequestItem> reqItemsMap = new HashMap<>();
        if (mr.getItems() != null) {
            for (MaterialRequestItem item : mr.getItems()) {
                reqItemsMap.put(item.getId(), item);
            }
        }

        // 1. QUANTITY SECURITY VALIDATION (Section 38): Validate allocations before creating orders
        Map<Long, Double> totalAllocatedPerReqItem = new HashMap<>();
        Set<Long> involvedQuotationIds = new HashSet<>();

        for (Object allocRaw : rawAllocations) {
            if (!(allocRaw instanceof Map<?, ?>)) continue;
            @SuppressWarnings("unchecked")
            Map<String, Object> allocMap = (Map<String, Object>) allocRaw;

            Long quotationId = parseLongSafe(allocMap.get("quotationId") != null ? allocMap.get("quotationId") : allocMap.get("id"));
            if (quotationId == null) {
                throw new IllegalArgumentException("Valid quotationId is required for each seller allocation.");
            }
            involvedQuotationIds.add(quotationId);

            Quotation quotation = quotationRepository.findById(quotationId)
                    .orElseThrow(() -> new NoSuchElementException("Quotation not found with ID: " + quotationId));

            if (quotation.getMaterialRequest() == null || !quotation.getMaterialRequest().getId().equals(mr.getId())) {
                throw new SecurityException("Quotation " + quotationId + " does not belong to Material Request " + mr.getId());
            }

            Object itemsObj = allocMap.get("items");
            if (!(itemsObj instanceof List<?>) || ((List<?>) itemsObj).isEmpty()) {
                throw new IllegalArgumentException("Each seller allocation must include at least one material item.");
            }

            // Map quotation items by ID
            Map<Long, QuotationItem> quoteItemsById = new HashMap<>();
            if (quotation.getItems() != null) {
                for (QuotationItem qi : quotation.getItems()) {
                    quoteItemsById.put(qi.getId(), qi);
                }
            }

            for (Object itRaw : (List<?>) itemsObj) {
                if (!(itRaw instanceof Map<?, ?>)) continue;
                @SuppressWarnings("unchecked")
                Map<String, Object> itMap = (Map<String, Object>) itRaw;

                Long qItemId = parseLongSafe(itMap.get("quotationItemId") != null ? itMap.get("quotationItemId") : itMap.get("id"));
                QuotationItem qi = quoteItemsById.get(qItemId);
                if (qi == null && quotation.getItems() != null && !quotation.getItems().isEmpty()) {
                    String itMatName = itMap.get("materialName") != null ? itMap.get("materialName").toString().trim() : "";
                    qi = quotation.getItems().stream()
                            .filter(i -> i.getMaterialName() != null && i.getMaterialName().equalsIgnoreCase(itMatName))
                            .findFirst().orElse(null);
                }
                if (qi == null) {
                    throw new IllegalArgumentException("Quotation item not found on quotation " + quotation.getQuotationId());
                }

                Double allocatedQty = parseDoubleSafe(itMap.get("allocatedQuantity") != null ? itMap.get("allocatedQuantity") : itMap.get("quantity"));
                if (allocatedQty == null || allocatedQty <= 0 || Double.isNaN(allocatedQty) || Double.isInfinite(allocatedQty)) {
                    throw new IllegalArgumentException("Allocated quantity must be a positive number.");
                }

                // Check seller's quoted quantity capacity
                if (qi.getQuotedQuantity() != null && allocatedQty > qi.getQuotedQuantity()) {
                    throw new IllegalArgumentException("Allocated quantity (" + allocatedQty + ") exceeds quoted quantity (" +
                            qi.getQuotedQuantity() + ") for " + qi.getMaterialName() + " from seller " + quotation.getProvider().getName());
                }

                // Match MaterialRequestItem
                MaterialRequestItem reqItem = qi.getMaterialRequestItem();
                if (reqItem == null && itMap.get("materialRequestItemId") != null) {
                    Long mriId = parseLongSafe(itMap.get("materialRequestItemId"));
                    reqItem = reqItemsMap.get(mriId);
                }
                if (reqItem == null && mr.getItems() != null) {
                    String matName = qi.getMaterialName();
                    reqItem = mr.getItems().stream()
                            .filter(i -> i.getMaterialName() != null && (i.getMaterialName().equalsIgnoreCase(matName) || matName.toLowerCase().contains(i.getMaterialName().toLowerCase())))
                            .findFirst().orElse(null);
                }

                if (reqItem != null) {
                    double currentAlloc = totalAllocatedPerReqItem.getOrDefault(reqItem.getId(), 0.0);
                    double updatedAlloc = Math.round((currentAlloc + allocatedQty) * 100.0) / 100.0;
                    if (reqItem.getQuantity() != null && updatedAlloc > reqItem.getQuantity()) {
                        throw new IllegalArgumentException("Allocation exceeds required quantity for " + reqItem.getMaterialName() +
                                ". Required: " + reqItem.getQuantity() + ", Total Allocated: " + updatedAlloc);
                    }
                    totalAllocatedPerReqItem.put(reqItem.getId(), updatedAlloc);
                }
            }
        }

        // 2. GENERATE SELLER-SPECIFIC ORDERS ATOMICALLY
        LocalDateTime now = LocalDateTime.now();
        List<MaterialOrder> createdOrders = new ArrayList<>();

        for (Object allocRaw : rawAllocations) {
            @SuppressWarnings("unchecked")
            Map<String, Object> allocMap = (Map<String, Object>) allocRaw;
            Long quotationId = parseLongSafe(allocMap.get("quotationId") != null ? allocMap.get("quotationId") : allocMap.get("id"));
            Quotation quotation = quotationRepository.findById(quotationId).get();
            MarketplaceBackendApplication.MarketplaceUser seller = quotation.getProvider();

            // Check if order already exists for this quotation
            MaterialOrder order = materialOrderRepository.findByQuotationId(quotationId).orElse(null);
            if (order == null) {
                order = new MaterialOrder();
                order.setOrderCode(generateOrderCode());
                order.setQuotation(quotation);
                order.setMaterialRequest(mr);
                order.setBuyer(caller);
                order.setBuyerRole(mr.getBuyerRole() != null ? mr.getBuyerRole() : "CUSTOMER");
                order.setSeller(seller);
                order.setOrderStatus("WAITING_FOR_ACCEPTANCE");
                order.setPaymentStatus("PENDING");
                order.setDeliveryStatus("PENDING");
                order.setCreatedAt(now);
                order.setConfirmedAt(now);
                order.setCurrency("INR");
                order.setDeliveryAddress(mr.getDeliveryAddress() != null ? mr.getDeliveryAddress() : "");
                String contact = mr.getContactPhone() != null && !mr.getContactPhone().isBlank() ? mr.getContactPhone() : caller.getPhone();
                order.setContactNumber(contact != null ? contact : "");
                order.setPaymentTerms(quotation.getPaymentTerms() != null ? quotation.getPaymentTerms() : "100% on Site Delivery");
            }

            order.setUpdatedAt(now);

            // Populate selected items
            Map<Long, QuotationItem> quoteItemsById = new HashMap<>();
            if (quotation.getItems() != null) {
                for (QuotationItem qi : quotation.getItems()) {
                    quoteItemsById.put(qi.getId(), qi);
                }
            }

            List<?> itemsObj = (List<?>) allocMap.get("items");
            double sellerMaterialAmount = 0.0;
            order.getItems().clear();

            for (Object itRaw : itemsObj) {
                @SuppressWarnings("unchecked")
                Map<String, Object> itMap = (Map<String, Object>) itRaw;
                Long qItemId = parseLongSafe(itMap.get("quotationItemId") != null ? itMap.get("quotationItemId") : itMap.get("id"));
                QuotationItem qi = quoteItemsById.get(qItemId);
                if (qi == null && quotation.getItems() != null) {
                    String itMatName = itMap.get("materialName") != null ? itMap.get("materialName").toString().trim() : "";
                    qi = quotation.getItems().stream()
                            .filter(i -> i.getMaterialName() != null && i.getMaterialName().equalsIgnoreCase(itMatName))
                            .findFirst().orElse(null);
                }
                if (qi == null) continue;

                Double allocatedQty = parseDoubleSafe(itMap.get("allocatedQuantity") != null ? itMap.get("allocatedQuantity") : itMap.get("quantity"));
                double unitPrice = qi.getUnitPrice() != null ? qi.getUnitPrice() : 0.0;
                double lineTotal = Math.round(allocatedQty * unitPrice * 100.0) / 100.0;
                sellerMaterialAmount += lineTotal;

                MaterialOrderItem moi = new MaterialOrderItem();
                moi.setMaterialOrder(order);
                moi.setQuotationItem(qi);
                moi.setMaterial(qi.getMaterial());
                moi.setMaterialName(qi.getMaterialName());
                moi.setQuantity(allocatedQty);
                moi.setUnit(qi.getQuotedUnit() != null ? qi.getQuotedUnit() : "Units");
                moi.setUnitPrice(unitPrice);
                moi.setSubtotal(lineTotal);
                moi.setItemStatus("WAITING_FOR_ACCEPTANCE");
                moi.setCreatedAt(now);
                order.addItem(moi);
            }

            double transport = quotation.getTransportationCost() != null ? quotation.getTransportationCost() : 0.0;
            double taxGst = Math.round(sellerMaterialAmount * 0.18 * 100.0) / 100.0;
            double grandTotal = Math.round((sellerMaterialAmount + transport + taxGst) * 100.0) / 100.0;

            order.setMaterialAmount(sellerMaterialAmount);
            order.setTransportationAmount(transport);
            order.setTaxGst(taxGst);
            order.setTotalAmount(grandTotal);

            MaterialOrder savedOrder = materialOrderRepository.save(order);
            createdOrders.add(savedOrder);

            // Mark this seller's quotation as ACCEPTED
            quotation.setStatus("ACCEPTED");
            quotation.setUpdatedAt(now);
            quotationRepository.save(quotation);

            // Notify Seller
            if (notificationService != null && seller != null) {
                notificationService.createNotification(
                        seller,
                        "Material Order Selected",
                        "सामग्री ऑर्डर चुना गया",
                        caller.getName() + " has selected " + savedOrder.getItems().size() + " materials from your quotation (" + savedOrder.getOrderCode() + ").",
                        caller.getName() + " ने आपके कोटेशन में से " + savedOrder.getItems().size() + " सामग्री खरीदने के लिए चुनी हैं (" + savedOrder.getOrderCode() + ")।",
                        "ORDER_SELECTED",
                        savedOrder.getOrderCode()
                );
            }
        }

        // 3. Mark unselected competing quotations as REJECTED
        List<Quotation> allQuotes = quotationRepository.findByMaterialRequestIdOrderByCreatedAtDesc(mr.getId());
        if (allQuotes != null) {
            for (Quotation q : allQuotes) {
                if (!involvedQuotationIds.contains(q.getId()) &&
                        ("SUBMITTED".equalsIgnoreCase(q.getStatus()) || "UNDER_REVIEW".equalsIgnoreCase(q.getStatus()))) {
                    q.setStatus("REJECTED");
                    q.setUpdatedAt(now);
                    quotationRepository.save(q);
                }
            }
        }

        // 4. Update parent MaterialRequest status
        mr.setStatus("ALLOCATED");
        mr.setUpdatedAt(now);
        materialRequestRepository.save(mr);

        // Notify Buyer
        if (notificationService != null) {
            notificationService.createNotification(
                    caller,
                    "Purchase Plan Confirmed",
                    "खरीद योजना की पुष्टि",
                    "Your purchase plan for " + mr.getRequestId() + " is confirmed across " + createdOrders.size() + " sellers.",
                    mr.getRequestId() + " के लिए आपकी खरीद योजना " + createdOrders.size() + " विक्रेताओं के साथ स्वीकृत हो गई है।",
                    "ORDER_CONFIRMED",
                    mr.getRequestId()
            );
        }

        // 5. Build purchase decision breakdown & response
        List<Map<String, Object>> ordersResponse = createdOrders.stream()
                .map(this::toResponseMap)
                .toList();

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("requestId", mr.getRequestId());
        resp.put("status", "ALLOCATED");
        resp.put("message", "Purchase plan confirmed successfully with " + createdOrders.size() + " seller orders generated. — खरीद योजना की पुष्टि सफलतापूर्वक हो गई।");
        resp.put("orders", ordersResponse);

        // Purchase decision item breakdown (Section 19)
        List<Map<String, Object>> decisionList = new ArrayList<>();
        if (mr.getItems() != null) {
            for (MaterialRequestItem item : mr.getItems()) {
                Map<String, Object> dec = new LinkedHashMap<>();
                dec.put("materialName", item.getMaterialName());
                dec.put("requiredQuantity", item.getQuantity());
                dec.put("unit", item.getUnit());
                dec.put("allocatedQuantity", totalAllocatedPerReqItem.getOrDefault(item.getId(), 0.0));
                decisionList.add(dec);
            }
        }
        resp.put("purchaseDecision", decisionList);

        return resp;
    }

    @Transactional
    public MaterialOrder acceptSellerOrder(Long orderId, MarketplaceBackendApplication.MarketplaceUser seller) {
        return updateOrderStatus(orderId, "ORDER_ACCEPTED", seller);
    }

    @Transactional
    public MaterialOrder updateExpectedDelivery(Long orderId, String expectedDeliveryDate, MarketplaceBackendApplication.MarketplaceUser caller) {
        if (orderId == null) throw new IllegalArgumentException("Valid order ID is required.");
        if (expectedDeliveryDate == null || expectedDeliveryDate.isBlank()) throw new IllegalArgumentException("Expected delivery date is required.");
        if (caller == null) throw new SecurityException("Authentication required.");

        MaterialOrder order = materialOrderRepository.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Order not found with ID: " + orderId));

        boolean isSeller = order.getSeller() != null && order.getSeller().getId().equals(caller.getId());
        if (!isSeller) {
            throw new SecurityException("Only fulfilling seller can update expected delivery date.");
        }

        order.setExpectedDeliveryDate(expectedDeliveryDate.trim());
        order.setUpdatedAt(LocalDateTime.now());
        MaterialOrder saved = materialOrderRepository.save(order);

        // Notify Buyer
        if (notificationService != null && order.getBuyer() != null) {
            notificationService.createNotification(
                    order.getBuyer(),
                    "Delivery Date Updated",
                    "डिलीवरी की तारीख अपडेट की गई",
                    "Seller " + caller.getName() + " updated expected delivery to " + expectedDeliveryDate + " for order " + order.getOrderCode() + ".",
                    "विक्रेता " + caller.getName() + " ने ऑर्डर " + order.getOrderCode() + " के लिए डिलीवरी की तारीख " + expectedDeliveryDate + " अपडेट की है।",
                    "DELIVERY_DATE",
                    order.getOrderCode()
            );
        }

        return saved;
    }

    private Long parseLongSafe(Object obj) {
        if (obj == null) return null;
        try {
            if (obj instanceof Number) return ((Number) obj).longValue();
            String clean = obj.toString().trim();
            if (clean.isEmpty()) return null;
            return Long.parseLong(clean);
        } catch (Exception e) {
            return null;
        }
    }

    private Double parseDoubleSafe(Object obj) {
        if (obj == null) return null;
        try {
            if (obj instanceof Number) return ((Number) obj).doubleValue();
            String clean = obj.toString().replace(",", "").replace("₹", "").trim();
            if (clean.isEmpty()) return null;
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Updates material order status through controlled lifecycle transitions (Phase 4E).
     *
     * Valid state flow:
     * CONFIRMED -> PROCESSING -> DISPATCHED -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED
     *
     * Cancellation:
     * CONFIRMED -> CANCELLED (releases reservation)
     * PROCESSING -> CANCELLED (releases reservation)
     * Post-dispatch cancellation rejected.
     *
     * Dispatch:
     * Atomically consumes physical stock (currentStock -= quantity) and releases reserved stock (reservedStock -= quantity).
     * Row locks materials in deterministic ascending order.
     * Enforces invariants: currentStock >= 0, reservedStock >= 0, availableStock >= 0, reservedStock <= currentStock.
     */
    @Transactional
    public MaterialOrder updateOrderStatus(Long orderId, String targetStatus, MarketplaceBackendApplication.MarketplaceUser caller) {
        if (orderId == null) {
            throw new IllegalArgumentException("Valid order ID is required.");
        }
        if (targetStatus == null || targetStatus.isBlank()) {
            throw new IllegalArgumentException("Valid target status is required.");
        }
        if (caller == null || caller.getId() == null) {
            throw new IllegalArgumentException("Authenticated user is required.");
        }

        // 1. Lock the order row (pessimistic lock)
        MaterialOrder order = materialOrderRepository.findByIdForUpdate(orderId)
                .orElseGet(() -> materialOrderRepository.findById(orderId)
                        .orElseThrow(() -> new NoSuchElementException("Material Order not found with ID: " + orderId)));

        // 2. Verify caller relationship
        boolean isSeller = order.getSeller() != null && order.getSeller().getId().equals(caller.getId());
        boolean isBuyer = order.getBuyer() != null && order.getBuyer().getId().equals(caller.getId());

        if (!isSeller && !isBuyer) {
            throw new SecurityException("Unauthorized. You are not allowed to update this order.");
        }

        String currentStatus = order.getOrderStatus() != null ? order.getOrderStatus().trim().toUpperCase() : "CONFIRMED";
        String normalizedTarget = targetStatus.trim().toUpperCase();

        // Check if already in terminal state or already in requested state
        if ("COMPLETED".equals(currentStatus)) {
            throw new IllegalStateException("Order is already completed and cannot change status.");
        }
        if ("CANCELLED".equals(currentStatus)) {
            throw new IllegalStateException("Order is already cancelled and cannot change status.");
        }
        if (currentStatus.equals(normalizedTarget)) {
            if ("DISPATCHED".equals(normalizedTarget)) {
                throw new IllegalStateException("Order has already been dispatched.");
            }
            if ("CANCELLED".equals(normalizedTarget)) {
                throw new IllegalStateException("Order has already been cancelled.");
            }
            return order;
        }

        LocalDateTime now = LocalDateTime.now();

        // 3. Process status transitions
        switch (normalizedTarget) {
            case "ORDER_ACCEPTED":
            case "ACCEPTED":
                if (!"WAITING_FOR_ACCEPTANCE".equals(currentStatus) && !"CONFIRMED".equals(currentStatus)) {
                    throw new IllegalStateException("Order cannot be accepted from status: " + currentStatus);
                }
                if (!isSeller) {
                    throw new SecurityException("Only fulfilling seller can accept order.");
                }
                order.setOrderStatus("ORDER_ACCEPTED");
                order.setUpdatedAt(now);
                updateItemStatuses(order, "ORDER_ACCEPTED");
                MaterialOrder acceptedOrder = materialOrderRepository.save(order);
                if (notificationService != null && order.getBuyer() != null) {
                    notificationService.createNotification(
                            order.getBuyer(),
                            "Order Accepted",
                            "ऑर्डर स्वीकार किया गया",
                            "Seller " + (order.getSeller() != null ? order.getSeller().getName() : "Supplier") + " has accepted your material order " + order.getOrderCode() + ".",
                            "विक्रेता " + (order.getSeller() != null ? order.getSeller().getName() : "आपूर्तिकर्ता") + " ने आपका सामग्री ऑर्डर " + order.getOrderCode() + " स्वीकार कर लिया है।",
                            "ORDER_ACCEPTED",
                            order.getOrderCode()
                    );
                }
                return acceptedOrder;

            case "PROCESSING":
                if (!"WAITING_FOR_ACCEPTANCE".equals(currentStatus) && !"CONFIRMED".equals(currentStatus) && !"ORDER_ACCEPTED".equals(currentStatus) && !"ACCEPTED".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Cannot transition from " + currentStatus + " to PROCESSING.");
                }
                if (!isSeller) {
                    throw new SecurityException("Access denied. Only the fulfilling seller can transition order to PROCESSING.");
                }
                order.setOrderStatus("PROCESSING");
                order.setProcessedAt(now);
                order.setUpdatedAt(now);
                updateItemStatuses(order, "PROCESSING");
                MaterialOrder processingOrder = materialOrderRepository.save(order);
                if (notificationService != null && order.getBuyer() != null) {
                    notificationService.createNotification(
                            order.getBuyer(),
                            "Order Processing",
                            "ऑर्डर प्रक्रिया में",
                            "Seller " + (order.getSeller() != null ? order.getSeller().getName() : "Supplier") + " has started processing your order " + order.getOrderCode() + ".",
                            "विक्रेता " + (order.getSeller() != null ? order.getSeller().getName() : "आपूर्तिकर्ता") + " ने आपका ऑर्डर " + order.getOrderCode() + " प्रोसेस करना शुरू कर दिया है।",
                            "ORDER_PROCESSING",
                            order.getOrderCode()
                    );
                }
                return processingOrder;

            case "READY_FOR_DISPATCH":
                if (!"PROCESSING".equals(currentStatus)) {
                    throw new IllegalStateException("Order must be in PROCESSING before READY_FOR_DISPATCH.");
                }
                if (!isSeller) {
                    throw new SecurityException("Only fulfilling seller can mark order as READY_FOR_DISPATCH.");
                }
                order.setOrderStatus("READY_FOR_DISPATCH");
                order.setDeliveryStatus("READY_FOR_DISPATCH");
                order.setUpdatedAt(now);
                updateItemStatuses(order, "READY_FOR_DISPATCH");
                MaterialOrder readyOrder = materialOrderRepository.save(order);
                if (notificationService != null && order.getBuyer() != null) {
                    notificationService.createNotification(
                            order.getBuyer(),
                            "Ready for Dispatch",
                            "भेजने के लिए तैयार",
                            "Your material order " + order.getOrderCode() + " is ready for dispatch.",
                            "आपका सामग्री ऑर्डर " + order.getOrderCode() + " भेजने के लिए तैयार है।",
                            "READY_FOR_DISPATCH",
                            order.getOrderCode()
                    );
                }
                return readyOrder;

            case "DISPATCHED":
                if (!"PROCESSING".equals(currentStatus) && !"READY_FOR_DISPATCH".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Order must be in PROCESSING before DISPATCHED (or in READY_FOR_DISPATCH, current: " + currentStatus + ").");
                }
                if (!isSeller) {
                    throw new SecurityException("Access denied. Only the fulfilling seller can dispatch an order.");
                }
                MaterialOrder dispatchedOrder = executeDispatch(order, now);
                if (notificationService != null && order.getBuyer() != null) {
                    notificationService.createNotification(
                            order.getBuyer(),
                            "Order Dispatched",
                            "ऑर्डर रवाना किया गया",
                            "Your material order " + order.getOrderCode() + " has been dispatched.",
                            "आपका सामग्री ऑर्डर " + order.getOrderCode() + " रवाना कर दिया गया है।",
                            "DISPATCHED",
                            order.getOrderCode()
                    );
                }
                return dispatchedOrder;

            case "OUT_FOR_DELIVERY":
                if (!"DISPATCHED".equals(currentStatus) && !"READY_FOR_DISPATCH".equals(currentStatus) && !"PROCESSING".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Order must be DISPATCHED or READY_FOR_DISPATCH before OUT_FOR_DELIVERY (current: " + currentStatus + ").");
                }
                if (!isSeller) {
                    throw new SecurityException("Access denied. Only the fulfilling seller can mark order as OUT_FOR_DELIVERY.");
                }
                order.setOrderStatus("OUT_FOR_DELIVERY");
                order.setDeliveryStatus("OUT_FOR_DELIVERY");
                order.setUpdatedAt(now);
                updateItemStatuses(order, "OUT_FOR_DELIVERY");
                MaterialOrder outOrder = materialOrderRepository.save(order);
                if (notificationService != null && order.getBuyer() != null) {
                    notificationService.createNotification(
                            order.getBuyer(),
                            "Out for Delivery",
                            "डिलीवरी के लिए रवाना",
                            "Your material order " + order.getOrderCode() + " is out for delivery.",
                            "आपका सामग्री ऑर्डर " + order.getOrderCode() + " डिलीवरी के लिए रवाना हो चुका है।",
                            "OUT_FOR_DELIVERY",
                            order.getOrderCode()
                    );
                }
                return outOrder;

            case "DELIVERED":
                if (!"OUT_FOR_DELIVERY".equals(currentStatus) && !"DISPATCHED".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Order must be OUT_FOR_DELIVERY before DELIVERED (current: " + currentStatus + ").");
                }
                if (!isSeller) {
                    throw new SecurityException("Access denied. Only the fulfilling seller can mark order as DELIVERED.");
                }
                order.setOrderStatus("DELIVERED");
                order.setDeliveryStatus("DELIVERED");
                order.setDeliveredAt(now);
                order.setUpdatedAt(now);
                updateItemStatuses(order, "DELIVERED");
                MaterialOrder deliveredOrder = materialOrderRepository.save(order);
                if (notificationService != null && order.getBuyer() != null) {
                    notificationService.createNotification(
                            order.getBuyer(),
                            "Order Delivered",
                            "डिलीवर हो गया",
                            "Your material order " + order.getOrderCode() + " has been delivered successfully.",
                            "आपका सामग्री ऑर्डर " + order.getOrderCode() + " सफलतापूर्वक डिलीवर हो गया है।",
                            "DELIVERED",
                            order.getOrderCode()
                    );
                }
                return deliveredOrder;

            case "COMPLETED":
                if (!"DELIVERED".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Order must be DELIVERED before COMPLETED (current: " + currentStatus + ").");
                }
                // Buyer or Seller can complete
                order.setOrderStatus("COMPLETED");
                order.setCompletedAt(now);
                order.setUpdatedAt(now);
                updateItemStatuses(order, "COMPLETED");
                return materialOrderRepository.save(order);

            case "CANCELLED":
                if ("DISPATCHED".equals(currentStatus) || "OUT_FOR_DELIVERY".equals(currentStatus) || "DELIVERED".equals(currentStatus)) {
                    throw new IllegalStateException("Cannot cancel an order that has already been dispatched.");
                }
                if (!"CONFIRMED".equals(currentStatus) && !"PROCESSING".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Cannot cancel order in status " + currentStatus + ". Orders can only be cancelled before dispatch.");
                }
                // Buyer or Seller can cancel before dispatch
                return executeCancellation(order, now);

            default:
                throw new IllegalArgumentException("Unsupported order status: " + normalizedTarget);
        }
    }

    private MaterialOrder executeDispatch(MaterialOrder order, LocalDateTime now) {
        List<MaterialOrderItem> items = order.getItems();
        if ((items == null || items.isEmpty()) && materialOrderItemRepository != null && order.getId() != null) {
            items = materialOrderItemRepository.findByMaterialOrderId(order.getId());
        }

        // Section 31: Legacy aggregate orders without itemized line items cannot trigger fabricated deduction
        if (items == null || items.isEmpty()) {
            throw new IllegalStateException("Order lacks itemized inventory line items for dispatch stock deduction.");
        }

        if (materialRepository == null) {
            throw new IllegalStateException("Material repository is required for inventory dispatch deduction.");
        }

        // 1. Aggregate required quantities per material ID
        Map<Long, Double> dispatchQuantities = new HashMap<>();
        for (MaterialOrderItem item : items) {
            if (item == null || item.getMaterial() == null || item.getMaterial().getId() == null) {
                throw new IllegalStateException("Order line item is missing catalog material reference.");
            }
            Double qty = item.getQuantity();
            if (qty == null || Double.isNaN(qty) || Double.isInfinite(qty) || qty <= 0) {
                throw new IllegalArgumentException("Invalid quantity for order item: " + item.getMaterialName());
            }
            dispatchQuantities.merge(item.getMaterial().getId(), qty, Double::sum);
        }

        // 2. Deterministic lock order: Sort unique material IDs in ascending order (deadlock prevention)
        List<Long> sortedMaterialIds = new ArrayList<>(dispatchQuantities.keySet());
        Collections.sort(sortedMaterialIds);

        // 3. Pessimistically lock every referenced Material row in deterministic ascending order
        Map<Long, Material> lockedMaterials = new LinkedHashMap<>();
        for (Long matId : sortedMaterialIds) {
            Material mat = materialRepository.findByIdForUpdate(matId)
                    .orElseGet(() -> materialRepository.findById(matId).orElse(null));
            if (mat == null) {
                throw new NoSuchElementException("Material catalog item not found for ID: " + matId);
            }
            // Re-validate seller ownership
            if (mat.getSeller() == null || order.getSeller() == null ||
                    !mat.getSeller().getId().equals(order.getSeller().getId())) {
                throw new SecurityException("Unauthorized dispatch: Material '" + mat.getMaterialName() +
                        "' does not belong to fulfilling seller.");
            }
            lockedMaterials.put(matId, mat);
        }

        // 4. Multi-material stock validation: Check reservedStock and currentStock for ALL materials BEFORE deducting any
        for (Long matId : sortedMaterialIds) {
            Material mat = lockedMaterials.get(matId);
            double reqQty = dispatchQuantities.get(matId);
            double currentStock = mat.getCurrentStock() != null ? mat.getCurrentStock() : 0.0;
            double reservedStock = mat.getReservedStock() != null ? mat.getReservedStock() : 0.0;

            if (reservedStock < reqQty) {
                throw new IllegalStateException("Insufficient reserved stock for material: " + mat.getMaterialName() +
                        ". Required: " + reqQty + ", Reserved: " + reservedStock);
            }
            if (currentStock < reqQty) {
                throw new IllegalStateException("Insufficient physical stock for material: " + mat.getMaterialName() +
                        ". Required: " + reqQty + ", Current: " + currentStock);
            }
        }

        // 5. Atomically deduct physical stock and release corresponding reserved stock
        for (Long matId : sortedMaterialIds) {
            Material mat = lockedMaterials.get(matId);
            double reqQty = dispatchQuantities.get(matId);
            double currentStock = mat.getCurrentStock() != null ? mat.getCurrentStock() : 0.0;
            double reservedStock = mat.getReservedStock() != null ? mat.getReservedStock() : 0.0;

            double newCurrent = currentStock - reqQty;
            double newReserved = reservedStock - reqQty;
            double newAvailable = newCurrent - newReserved;

            // Invariant enforcement (Section 14):
            if (newCurrent < 0 || newReserved < 0 || newAvailable < 0 || newReserved > newCurrent) {
                throw new IllegalStateException("Stock invariant violation during dispatch for material: " + mat.getMaterialName() +
                        ": currentStock=" + newCurrent + ", reservedStock=" + newReserved + ", availableStock=" + newAvailable);
            }

            mat.setCurrentStock(newCurrent);
            mat.setReservedStock(newReserved);
            mat.setAvailableStock(newAvailable);
            if (newAvailable <= 0) {
                mat.setStockStatus("OUT_OF_STOCK");
            } else if (newAvailable <= 10) {
                mat.setStockStatus("LOW_STOCK");
            } else {
                mat.setStockStatus("IN_STOCK");
            }
            materialRepository.save(mat);
        }

        // 6. Update Order and Items
        order.setOrderStatus("DISPATCHED");
        order.setDeliveryStatus("IN_TRANSIT");
        order.setDispatchedAt(now);
        order.setUpdatedAt(now);

        for (MaterialOrderItem item : items) {
            item.setItemStatus("DISPATCHED");
            if (materialOrderItemRepository != null) {
                materialOrderItemRepository.save(item);
            }
        }

        return materialOrderRepository.save(order);
    }

    private MaterialOrder executeCancellation(MaterialOrder order, LocalDateTime now) {
        List<MaterialOrderItem> items = order.getItems();
        if ((items == null || items.isEmpty()) && materialOrderItemRepository != null && order.getId() != null) {
            items = materialOrderItemRepository.findByMaterialOrderId(order.getId());
        }

        // If order has items and material repository is available, release reserved stock
        if (items != null && !items.isEmpty() && materialRepository != null) {
            Map<Long, Double> cancelQuantities = new HashMap<>();
            for (MaterialOrderItem item : items) {
                if (item != null && item.getMaterial() != null && item.getMaterial().getId() != null) {
                    Double qty = item.getQuantity();
                    if (qty != null && !Double.isNaN(qty) && !Double.isInfinite(qty) && qty > 0) {
                        cancelQuantities.merge(item.getMaterial().getId(), qty, Double::sum);
                    }
                }
            }

            List<Long> sortedMaterialIds = new ArrayList<>(cancelQuantities.keySet());
            Collections.sort(sortedMaterialIds);

            for (Long matId : sortedMaterialIds) {
                Material mat = materialRepository.findByIdForUpdate(matId)
                        .orElseGet(() -> materialRepository.findById(matId).orElse(null));
                if (mat != null) {
                    double reqQty = cancelQuantities.get(matId);
                    double currentStock = mat.getCurrentStock() != null ? mat.getCurrentStock() : 0.0;
                    double reservedStock = mat.getReservedStock() != null ? mat.getReservedStock() : 0.0;

                    double newReserved = Math.max(0.0, reservedStock - reqQty);
                    double newAvailable = currentStock - newReserved;

                    // Invariant checks
                    if (newReserved < 0 || newAvailable < 0 || newReserved > currentStock) {
                        throw new IllegalStateException("Stock invariant violation during cancellation for material: " + mat.getMaterialName());
                    }

                    // currentStock remains UNCHANGED!
                    mat.setReservedStock(newReserved);
                    mat.setAvailableStock(newAvailable);
                    if (newAvailable <= 0) {
                        mat.setStockStatus("OUT_OF_STOCK");
                    } else if (newAvailable <= 10) {
                        mat.setStockStatus("LOW_STOCK");
                    } else {
                        mat.setStockStatus("IN_STOCK");
                    }
                    materialRepository.save(mat);
                }
            }
        }

        order.setOrderStatus("CANCELLED");
        order.setDeliveryStatus("CANCELLED");
        order.setCancelledAt(now);
        order.setUpdatedAt(now);

        if (items != null) {
            for (MaterialOrderItem item : items) {
                item.setItemStatus("CANCELLED");
                if (materialOrderItemRepository != null) {
                    materialOrderItemRepository.save(item);
                }
            }
        }

        return materialOrderRepository.save(order);
    }

    private void updateItemStatuses(MaterialOrder order, String status) {
        List<MaterialOrderItem> items = order.getItems();
        if ((items == null || items.isEmpty()) && materialOrderItemRepository != null && order.getId() != null) {
            items = materialOrderItemRepository.findByMaterialOrderId(order.getId());
        }
        if (items != null) {
            for (MaterialOrderItem item : items) {
                item.setItemStatus(status);
                if (materialOrderItemRepository != null) {
                    materialOrderItemRepository.save(item);
                }
            }
        }
    }

    public synchronized String generateOrderCode() {
        int currentYear = LocalDate.now().getYear();
        Long maxId = materialOrderRepository.findMaxId();
        long nextNum = (maxId != null ? maxId : 0L) + 1L;
        String candidate = String.format("ORD-%d-%05d", currentYear, nextNum);

        int attempts = 0;
        while (materialOrderRepository.findByOrderCode(candidate).isPresent() && attempts < 100) {
            nextNum++;
            candidate = String.format("ORD-%d-%05d", currentYear, nextNum);
            attempts++;
        }
        if (materialOrderRepository.findByOrderCode(candidate).isPresent()) {
            candidate = String.format("ORD-%d-%s", currentYear, UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        return candidate;
    }

    public Map<String, Object> toResponseMap(MaterialOrder order) {
        if (order == null) return Collections.emptyMap();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", order.getId());
        map.put("orderCode", order.getOrderCode());
        map.put("quotationId", order.getQuotation() != null ? order.getQuotation().getId() : null);
        map.put("quotationCode", order.getQuotation() != null ? order.getQuotation().getQuotationId() : null);
        map.put("materialRequestId", order.getMaterialRequest() != null ? order.getMaterialRequest().getId() : null);
        map.put("businessRequestId", order.getMaterialRequest() != null ? order.getMaterialRequest().getRequestId() : null);
        map.put("buyerId", order.getBuyer() != null ? order.getBuyer().getId() : null);
        map.put("buyerRole", order.getBuyerRole());
        map.put("sellerId", order.getSeller() != null ? order.getSeller().getId() : null);
        map.put("sellerName", order.getSeller() != null ? order.getSeller().getName() : null);
        map.put("materialAmount", order.getMaterialAmount());
        map.put("transportationAmount", order.getTransportationAmount());
        map.put("taxGst", order.getTaxGst());
        map.put("totalAmount", order.getTotalAmount());
        map.put("currency", order.getCurrency());
        map.put("deliveryAddress", order.getDeliveryAddress());
        map.put("contactNumber", order.getContactNumber());
        map.put("paymentTerms", order.getPaymentTerms());
        map.put("orderStatus", order.getOrderStatus());
        map.put("paymentStatus", order.getPaymentStatus());
        map.put("deliveryStatus", order.getDeliveryStatus());
        LocalDateTime createdAt = order.getCreatedAt() != null ? order.getCreatedAt() : LocalDateTime.now(IST_ZONE);
        map.put("createdAt", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
        map.put("submittedDate", createdAt.format(DISPLAY_DATE_FORMATTER));
        map.put("submittedTimestamp", createdAt.atZone(IST_ZONE).toInstant().toEpochMilli());
        map.put("confirmedAt", order.getConfirmedAt() != null ? order.getConfirmedAt().toString() : null);
        map.put("processedAt", order.getProcessedAt() != null ? order.getProcessedAt().toString() : null);
        map.put("dispatchedAt", order.getDispatchedAt() != null ? order.getDispatchedAt().toString() : null);
        map.put("deliveredAt", order.getDeliveredAt() != null ? order.getDeliveredAt().toString() : null);
        map.put("completedAt", order.getCompletedAt() != null ? order.getCompletedAt().toString() : null);
        map.put("cancelledAt", order.getCancelledAt() != null ? order.getCancelledAt().toString() : null);
        map.put("updatedAt", order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null);
        map.put("expectedDeliveryDate", order.getExpectedDeliveryDate() != null ? order.getExpectedDeliveryDate() : "");

        if (order.getBuyer() != null) {
            map.put("buyerName", order.getBuyer().getName());
            map.put("buyerPhone", order.getBuyer().getPhone() != null ? order.getBuyer().getPhone() : "");
            map.put("buyerEmail", order.getBuyer().getEmail() != null ? order.getBuyer().getEmail() : "");
            map.put("buyerLocation", order.getBuyer().getLocation() != null ? order.getBuyer().getLocation() : "");
        }
        if (order.getSeller() != null) {
            map.put("sellerPhone", order.getSeller().getPhone() != null ? order.getSeller().getPhone() : "");
            map.put("sellerEmail", order.getSeller().getEmail() != null ? order.getSeller().getEmail() : "");
            map.put("sellerLocation", order.getSeller().getLocation() != null ? order.getSeller().getLocation() : "");
            map.put("sellerAddress", order.getSeller().getLocation() != null ? order.getSeller().getLocation() : "");
            map.put("sellerBusinessName", order.getSeller().getName());
        }

        // Expose itemized line items (Phase 4C)
        List<Map<String, Object>> itemsList = new ArrayList<>();
        List<MaterialOrderItem> orderItems = order.getItems();
        if ((orderItems == null || orderItems.isEmpty()) && materialOrderItemRepository != null && order.getId() != null) {
            orderItems = materialOrderItemRepository.findByMaterialOrderId(order.getId());
        }
        Set<Long> selectedQuotationItemIds = new HashSet<>();
        if (orderItems != null) {
            for (MaterialOrderItem item : orderItems) {
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("materialId", item.getMaterial() != null ? item.getMaterial().getId() : null);
                itemMap.put("quotationItemId", item.getQuotationItem() != null ? item.getQuotationItem().getId() : null);
                if (item.getQuotationItem() != null) {
                    selectedQuotationItemIds.add(item.getQuotationItem().getId());
                }
                itemMap.put("materialName", item.getMaterialName());
                itemMap.put("quantity", item.getQuantity());
                itemMap.put("unit", item.getUnit());
                itemMap.put("unitPrice", item.getUnitPrice());
                itemMap.put("subtotal", item.getSubtotal());
                itemMap.put("itemStatus", item.getItemStatus());
                itemsList.add(itemMap);
            }
        }
        map.put("items", itemsList);

        // Distinguish unselected quotation items (Section 15)
        List<Map<String, Object>> unselectedItemsList = new ArrayList<>();
        if (order.getQuotation() != null && order.getQuotation().getItems() != null) {
            for (QuotationItem qi : order.getQuotation().getItems()) {
                if (!selectedQuotationItemIds.contains(qi.getId())) {
                    Map<String, Object> uMap = new LinkedHashMap<>();
                    uMap.put("id", qi.getId());
                    uMap.put("materialName", qi.getMaterialName());
                    uMap.put("quotedQuantity", qi.getQuotedQuantity());
                    uMap.put("unit", qi.getQuotedUnit());
                    uMap.put("unitPrice", qi.getUnitPrice());
                    unselectedItemsList.add(uMap);
                }
            }
        }
        map.put("unselectedItems", unselectedItemsList);

        return map;
    }
}
