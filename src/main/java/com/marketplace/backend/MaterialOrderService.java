package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * BUILDBID - MATERIAL ORDER SERVICE (Phase 4A)
 * 
 * Manages the atomic creation, snapshotting, and secure retrieval of Material Orders.
 */
@Service
public class MaterialOrderService {

    private final MaterialOrderRepository materialOrderRepository;
    private final MaterialOrderItemRepository materialOrderItemRepository;
    private final QuotationItemRepository quotationItemRepository;
    private final MaterialRepository materialRepository;

    @Autowired
    public MaterialOrderService(
            MaterialOrderRepository materialOrderRepository,
            MaterialOrderItemRepository materialOrderItemRepository,
            QuotationItemRepository quotationItemRepository,
            MaterialRepository materialRepository
    ) {
        this.materialOrderRepository = materialOrderRepository;
        this.materialOrderItemRepository = materialOrderItemRepository;
        this.quotationItemRepository = quotationItemRepository;
        this.materialRepository = materialRepository;
    }

    public MaterialOrderService(
            MaterialOrderRepository materialOrderRepository,
            MaterialOrderItemRepository materialOrderItemRepository,
            QuotationItemRepository quotationItemRepository
    ) {
        this(materialOrderRepository, materialOrderItemRepository, quotationItemRepository, null);
    }

    public MaterialOrderService(MaterialOrderRepository materialOrderRepository) {
        this(materialOrderRepository, null, null, null);
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

    @Transactional(readOnly = true)
    public List<MaterialOrder> getOrdersForBuyer(MarketplaceBackendApplication.MarketplaceUser buyer) {
        if (buyer == null || buyer.getId() == null) {
            throw new IllegalArgumentException("Valid buyer authentication required.");
        }
        return materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId());
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

        return order;
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
            case "PROCESSING":
                if (!"CONFIRMED".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Cannot transition from " + currentStatus + " to PROCESSING.");
                }
                if (!isSeller) {
                    throw new SecurityException("Access denied. Only the fulfilling seller can transition order to PROCESSING.");
                }
                order.setOrderStatus("PROCESSING");
                order.setProcessedAt(now);
                order.setUpdatedAt(now);
                updateItemStatuses(order, "PROCESSING");
                return materialOrderRepository.save(order);

            case "DISPATCHED":
                if (!"PROCESSING".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Order must be in PROCESSING before DISPATCHED (current: " + currentStatus + ").");
                }
                if (!isSeller) {
                    throw new SecurityException("Access denied. Only the fulfilling seller can dispatch an order.");
                }
                // Perform critical atomic dispatch transaction with stock consumption
                return executeDispatch(order, now);

            case "OUT_FOR_DELIVERY":
                if (!"DISPATCHED".equals(currentStatus)) {
                    throw new IllegalStateException("Invalid order transition: Order must be DISPATCHED before OUT_FOR_DELIVERY (current: " + currentStatus + ").");
                }
                if (!isSeller) {
                    throw new SecurityException("Access denied. Only the fulfilling seller can mark order as OUT_FOR_DELIVERY.");
                }
                order.setOrderStatus("OUT_FOR_DELIVERY");
                order.setDeliveryStatus("OUT_FOR_DELIVERY");
                order.setUpdatedAt(now);
                updateItemStatuses(order, "OUT_FOR_DELIVERY");
                return materialOrderRepository.save(order);

            case "DELIVERED":
                if (!"OUT_FOR_DELIVERY".equals(currentStatus)) {
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
                return materialOrderRepository.save(order);

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
        map.put("createdAt", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
        map.put("confirmedAt", order.getConfirmedAt() != null ? order.getConfirmedAt().toString() : null);
        map.put("processedAt", order.getProcessedAt() != null ? order.getProcessedAt().toString() : null);
        map.put("dispatchedAt", order.getDispatchedAt() != null ? order.getDispatchedAt().toString() : null);
        map.put("deliveredAt", order.getDeliveredAt() != null ? order.getDeliveredAt().toString() : null);
        map.put("completedAt", order.getCompletedAt() != null ? order.getCompletedAt().toString() : null);
        map.put("cancelledAt", order.getCancelledAt() != null ? order.getCancelledAt().toString() : null);
        map.put("updatedAt", order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null);

        // Expose itemized line items (Phase 4C)
        List<Map<String, Object>> itemsList = new ArrayList<>();
        List<MaterialOrderItem> orderItems = order.getItems();
        if ((orderItems == null || orderItems.isEmpty()) && materialOrderItemRepository != null && order.getId() != null) {
            orderItems = materialOrderItemRepository.findByMaterialOrderId(order.getId());
        }
        if (orderItems != null) {
            for (MaterialOrderItem item : orderItems) {
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("materialId", item.getMaterial() != null ? item.getMaterial().getId() : null);
                itemMap.put("quotationItemId", item.getQuotationItem() != null ? item.getQuotationItem().getId() : null);
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

        return map;
    }
}
