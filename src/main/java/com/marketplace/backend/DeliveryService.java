package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * BUILDBID - CANONICAL DELIVERY SERVICE (Phase 2)
 *
 * Implements authoritative delivery lifecycle management, state transitions,
 * server-enforced state machine, append-only history, and security isolation.
 */
@Service
public class DeliveryService {

    private static final Logger log = LoggerFactory.getLogger(DeliveryService.class);
    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final DeliveryRepository deliveryRepository;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final MaterialOrderRepository materialOrderRepository;
    private final NotificationService notificationService;
    private MaterialOrderService materialOrderService;

    @Autowired
    public DeliveryService(
            DeliveryRepository deliveryRepository,
            DeliveryStatusHistoryRepository deliveryStatusHistoryRepository,
            MaterialOrderRepository materialOrderRepository,
            NotificationService notificationService
    ) {
        this.deliveryRepository = deliveryRepository;
        this.deliveryStatusHistoryRepository = deliveryStatusHistoryRepository;
        this.materialOrderRepository = materialOrderRepository;
        this.notificationService = notificationService;
    }

    @Autowired(required = false)
    public void setMaterialOrderService(@org.springframework.context.annotation.Lazy MaterialOrderService materialOrderService) {
        this.materialOrderService = materialOrderService;
    }

    /**
     * Atomically and idempotently retrieves or creates a canonical Delivery record for a MaterialOrder.
     */
    @Transactional
    public Delivery getOrCreateDeliveryForOrder(MaterialOrder order) {
        if (order == null || order.getId() == null) {
            throw new IllegalArgumentException("Valid MaterialOrder is required to create a delivery.");
        }

        Optional<Delivery> existing = deliveryRepository.findByMaterialOrderId(order.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Delivery delivery = new Delivery();
        delivery.setMaterialOrder(order);
        delivery.setTrackingNumber(generateTrackingNumber());

        // Derive initial delivery status from order
        DeliveryStatus initialStatus = DeliveryStatus.fromString(order.getDeliveryStatus());
        if (initialStatus == null) {
            initialStatus = DeliveryStatus.fromString(order.getOrderStatus());
        }
        if (initialStatus == null) {
            initialStatus = DeliveryStatus.PROCESSING;
        }
        delivery.setStatus(initialStatus);

        delivery.setEstimatedDeliveryDate(order.getExpectedDeliveryDate());
        delivery.setVerificationCode(order.getVerificationCode());

        LocalDateTime now = LocalDateTime.now(IST_ZONE);
        delivery.setCreatedAt(now);
        delivery.setUpdatedAt(now);

        // Initial status history entry
        DeliveryStatusHistory initialHistory = new DeliveryStatusHistory(
                delivery,
                null,
                initialStatus,
                order.getSeller(),
                "SELLER",
                "Delivery order initiated",
                "Delivery initialized for order " + order.getOrderCode()
        );
        initialHistory.setChangedAt(now);
        delivery.addStatusHistory(initialHistory);

        try {
            return deliveryRepository.save(delivery);
        } catch (DataIntegrityViolationException dive) {
            // Concurrent race condition protected by DB unique constraint
            return deliveryRepository.findByMaterialOrderId(order.getId())
                    .orElseThrow(() -> dive);
        }
    }

    /**
     * Authorized delivery status transition.
     * Enforces server-side state machine, ownership verification, and delivery confirmation code validation.
     */
    @Transactional
    public Delivery updateDeliveryStatus(
            Long deliveryId,
            DeliveryStatus targetStatus,
            String verificationCode,
            String notes,
            String reason,
            MarketplaceBackendApplication.MarketplaceUser caller
    ) {
        return updateDeliveryStatus(
                deliveryId,
                targetStatus != null ? targetStatus.name() : null,
                verificationCode,
                notes,
                reason,
                caller
        );
    }

    @Transactional
    public Delivery updateDeliveryStatus(
            Long deliveryId,
            String targetStatusStr,
            String verificationCode,
            String notes,
            String reason,
            MarketplaceBackendApplication.MarketplaceUser caller
    ) {
        if (caller == null || caller.getId() == null) {
            throw new SecurityException("Authentication required.");
        }

        DeliveryStatus targetStatus = DeliveryStatus.fromString(targetStatusStr);
        if (targetStatus == null) {
            throw new IllegalArgumentException("Invalid delivery status: " + targetStatusStr);
        }

        Delivery delivery = deliveryRepository.findByIdForUpdate(deliveryId)
                .orElseThrow(() -> new NoSuchElementException("Delivery not found with ID: " + deliveryId));

        MaterialOrder order = delivery.getMaterialOrder();
        if (order == null) {
            throw new IllegalStateException("Delivery is not linked to a valid MaterialOrder.");
        }

        // Ownership and Role Validation
        boolean isSeller = order.getSeller() != null && order.getSeller().getId().equals(caller.getId());
        boolean isBuyer = order.getBuyer() != null && order.getBuyer().getId().equals(caller.getId());

        if (!isSeller && !isBuyer) {
            throw new SecurityException("Access denied. You are not authorized to update this delivery.");
        }

        // Seller-only transitions vs Buyer transitions
        if (!isSeller) {
            throw new SecurityException("Access denied. Only the fulfilling seller can update delivery lifecycle status.");
        }

        DeliveryStatus currentStatus = delivery.getStatus();

        // Idempotent retry: if already at target status, return delivery without error
        if (currentStatus == targetStatus) {
            return delivery;
        }

        // Validate state transition server-side
        if (!DeliveryStatus.isValidTransition(currentStatus, targetStatus)) {
            throw new IllegalStateException(String.format(
                    "Invalid delivery transition: Cannot transition from %s to %s.",
                    currentStatus.name(), targetStatus.name()
            ));
        }

        LocalDateTime now = LocalDateTime.now(IST_ZONE);

        // Verification code enforcement for physical delivery
        if (targetStatus == DeliveryStatus.DELIVERED) {
            validateDeliveryConfirmationCode(delivery, order, verificationCode);
            delivery.setActualDeliveryDate(now);
        }

        // Dispatch stock deduction synchronization
        if (targetStatus == DeliveryStatus.DISPATCHED && currentStatus != DeliveryStatus.DISPATCHED) {
            if (materialOrderService != null && !"DISPATCHED".equalsIgnoreCase(order.getOrderStatus())) {
                materialOrderService.updateOrderStatus(order.getId(), "DISPATCHED", caller);
            }
        }

        // Update Delivery
        delivery.setStatus(targetStatus);
        if (notes != null && !notes.isBlank()) {
            delivery.setCurrentNotes(notes.trim());
        }
        delivery.setUpdatedAt(now);

        // Append-only history record
        String actorRole = isSeller ? "SELLER" : "BUYER";
        DeliveryStatusHistory history = new DeliveryStatusHistory(
                delivery,
                currentStatus,
                targetStatus,
                caller,
                actorRole,
                reason,
                notes
        );
        history.setChangedAt(now);
        delivery.addStatusHistory(history);

        Delivery savedDelivery = deliveryRepository.save(delivery);

        // Synchronize canonical MaterialOrder statuses
        order.setDeliveryStatus(targetStatus.name());
        syncMaterialOrderStatusFromDelivery(order, targetStatus, now);
        materialOrderRepository.save(order);

        // Send recipient-scoped bilingual notification to Buyer
        sendDeliveryStatusNotification(order, currentStatus, targetStatus, reason);

        return savedDelivery;
    }

    /**
     * Validates confirmation code server-side inside the transaction.
     */
    private void validateDeliveryConfirmationCode(Delivery delivery, MaterialOrder order, String providedCode) {
        String expectedCode = null;
        if (delivery.getVerificationCode() != null && !delivery.getVerificationCode().isBlank()) {
            expectedCode = delivery.getVerificationCode();
        } else if (order.getVerificationCode() != null && !order.getVerificationCode().isBlank()) {
            expectedCode = order.getVerificationCode();
        } else if (order.getMaterialRequest() != null && order.getMaterialRequest().getVerificationCode() != null) {
            expectedCode = order.getMaterialRequest().getVerificationCode();
        }

        if (expectedCode == null || expectedCode.isBlank()) {
            throw new IllegalStateException("Order lacks a configured delivery verification code for confirmation.");
        }

        if (providedCode == null || providedCode.trim().isBlank()) {
            throw new IllegalArgumentException("Delivery verification code is required to confirm delivery. / डिलीवरी सत्यापन कोड आवश्यक है।");
        }

        String cleanProvided = providedCode.trim();
        String cleanExpected = expectedCode.trim();

        if (!cleanProvided.equalsIgnoreCase(cleanExpected)) {
            log.warn("Delivery confirmation code mismatch for Delivery [id={}], Order [code={}].", delivery.getId(), order.getOrderCode());
            throw new IllegalArgumentException("Invalid delivery verification code. / अमान्य डिलीवरी सत्यापन कोड।");
        }
    }

    /**
     * Synchronizes MaterialOrder status when delivery progresses.
     */
    private void syncMaterialOrderStatusFromDelivery(MaterialOrder order, DeliveryStatus deliveryStatus, LocalDateTime now) {
        switch (deliveryStatus) {
            case PROCESSING -> {
                order.setOrderStatus("PROCESSING");
                if (order.getProcessedAt() == null) {
                    order.setProcessedAt(now);
                }
            }
            case READY_TO_DISPATCH -> {
                order.setOrderStatus("READY_FOR_DISPATCH");
            }
            case DISPATCHED, IN_TRANSIT -> {
                order.setOrderStatus("DISPATCHED");
                if (order.getDispatchedAt() == null) {
                    order.setDispatchedAt(now);
                }
            }
            case OUT_FOR_DELIVERY -> {
                order.setOrderStatus("OUT_FOR_DELIVERY");
            }
            case DELIVERED -> {
                order.setOrderStatus("DELIVERED");
                if (order.getDeliveredAt() == null) {
                    order.setDeliveredAt(now);
                }
            }
            case DELAYED -> {
                // Keep order status at DISPATCHED or OUT_FOR_DELIVERY, delivery_status indicates DELAYED
            }
            case DELIVERY_FAILED -> {
                // Keep current order status, delivery_status tracks failure
            }
            case RETURNED -> {
                order.setOrderStatus("RETURNED");
            }
        }
        order.setUpdatedAt(now);
    }

    /**
     * Updates transport and carrier details (carrier, driver, vehicle, ETA).
     */
    @Transactional
    public Delivery updateDeliveryDetails(
            Long deliveryId,
            Map<String, Object> details,
            MarketplaceBackendApplication.MarketplaceUser seller
    ) {
        if (seller == null || seller.getId() == null) {
            throw new SecurityException("Authentication required.");
        }

        Delivery delivery = deliveryRepository.findByIdForUpdate(deliveryId)
                .orElseThrow(() -> new NoSuchElementException("Delivery not found with ID: " + deliveryId));

        MaterialOrder order = delivery.getMaterialOrder();
        if (order == null || order.getSeller() == null || !order.getSeller().getId().equals(seller.getId())) {
            throw new SecurityException("Forbidden: You are not authorized to update this delivery.");
        }

        if (details.containsKey("carrierName")) {
            String carrier = details.get("carrierName") != null ? details.get("carrierName").toString().trim() : null;
            delivery.setCarrierName(carrier);
        }
        if (details.containsKey("trackingUrl")) {
            String url = details.get("trackingUrl") != null ? details.get("trackingUrl").toString().trim() : null;
            delivery.setTrackingUrl(url);
        }
        if (details.containsKey("vehicleNumber")) {
            String veh = details.get("vehicleNumber") != null ? details.get("vehicleNumber").toString().trim() : null;
            delivery.setVehicleNumber(veh);
        }
        if (details.containsKey("driverName")) {
            String driver = details.get("driverName") != null ? details.get("driverName").toString().trim() : null;
            delivery.setDriverName(driver);
        }
        if (details.containsKey("driverPhone")) {
            String phone = details.get("driverPhone") != null ? details.get("driverPhone").toString().trim() : null;
            delivery.setDriverPhone(phone);
        } else if (details.containsKey("driverContact")) {
            String phone = details.get("driverContact") != null ? details.get("driverContact").toString().trim() : null;
            delivery.setDriverPhone(phone);
        }
        if (details.containsKey("currentNotes")) {
            String notes = details.get("currentNotes") != null ? details.get("currentNotes").toString().trim() : null;
            delivery.setCurrentNotes(notes);
        } else if (details.containsKey("notes")) {
            String notes = details.get("notes") != null ? details.get("notes").toString().trim() : null;
            delivery.setCurrentNotes(notes);
        }
        if (details.containsKey("estimatedDeliveryDate")) {
            String etaStr = details.get("estimatedDeliveryDate") != null ? details.get("estimatedDeliveryDate").toString().trim() : "";
            if (!etaStr.isBlank()) {
                String validated = DeliveryDateValidator.validateAndNormalize(etaStr);
                delivery.setEstimatedDeliveryDate(validated);
                order.setExpectedDeliveryDate(validated);
                materialOrderRepository.save(order);
            }
        }

        delivery.setUpdatedAt(LocalDateTime.now(IST_ZONE));
        return deliveryRepository.save(delivery);
    }

    /**
     * Retrieves deliveries for authenticated seller.
     */
    @Transactional
    public List<Map<String, Object>> getDeliveriesForSeller(MarketplaceBackendApplication.MarketplaceUser seller) {
        if (seller == null || seller.getId() == null) {
            throw new SecurityException("Authentication required.");
        }
        if (materialOrderRepository != null) {
            try {
                List<MaterialOrder> orders = materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId());
                if (orders != null) {
                    for (MaterialOrder order : orders) {
                        if (order != null && order.getId() != null && !deliveryRepository.existsByMaterialOrderId(order.getId())) {
                            try {
                                getOrCreateDeliveryForOrder(order);
                            } catch (Exception e) {
                                log.warn("Auto-provision delivery failed for order {}: {}", order.getId(), e.getMessage());
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Auto-sync deliveries for seller failed: {}", e.getMessage());
            }
        }
        List<Delivery> list = deliveryRepository.findBySellerId(seller.getId());
        return list.stream().map(this::toResponseMap).collect(Collectors.toList());
    }

    /**
     * Retrieves deliveries for authenticated buyer (Customer, Contractor, Professional).
     */
    @Transactional
    public List<Map<String, Object>> getDeliveriesForBuyer(MarketplaceBackendApplication.MarketplaceUser buyer) {
        if (buyer == null || buyer.getId() == null) {
            throw new SecurityException("Authentication required.");
        }
        if (materialOrderRepository != null) {
            try {
                List<MaterialOrder> orders = materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId());
                if (orders != null) {
                    for (MaterialOrder order : orders) {
                        if (order != null && order.getId() != null && !deliveryRepository.existsByMaterialOrderId(order.getId())) {
                            try {
                                getOrCreateDeliveryForOrder(order);
                            } catch (Exception e) {
                                log.warn("Auto-provision delivery failed for buyer order {}: {}", order.getId(), e.getMessage());
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Auto-sync deliveries for buyer failed: {}", e.getMessage());
            }
        }
        List<Delivery> list = deliveryRepository.findByBuyerId(buyer.getId());
        return list.stream().map(this::toResponseMap).collect(Collectors.toList());
    }

    /**
     * Retrieves delivery by ID with strict buyer/seller ownership check.
     */
    @Transactional(readOnly = true)
    public Delivery getDeliveryById(Long deliveryId, MarketplaceBackendApplication.MarketplaceUser caller) {
        if (caller == null || caller.getId() == null) {
            throw new SecurityException("Authentication required.");
        }
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new NoSuchElementException("Delivery not found with ID: " + deliveryId));

        MaterialOrder order = delivery.getMaterialOrder();
        boolean isSeller = order.getSeller() != null && order.getSeller().getId().equals(caller.getId());
        boolean isBuyer = order.getBuyer() != null && order.getBuyer().getId().equals(caller.getId());

        if (!isSeller && !isBuyer) {
            throw new SecurityException("Forbidden: You do not have permission to view this delivery.");
        }

        return delivery;
    }

    /**
     * Retrieves delivery by MaterialOrder ID with strict ownership check.
     */
    @Transactional
    public Delivery getDeliveryByOrderId(Long orderId, MarketplaceBackendApplication.MarketplaceUser caller) {
        if (caller == null || caller.getId() == null) {
            throw new SecurityException("Authentication required.");
        }
        MaterialOrder order = materialOrderRepository.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Material Order not found with ID: " + orderId));

        boolean isSeller = order.getSeller() != null && order.getSeller().getId().equals(caller.getId());
        boolean isBuyer = order.getBuyer() != null && order.getBuyer().getId().equals(caller.getId());

        if (!isSeller && !isBuyer) {
            throw new SecurityException("Forbidden: You do not have permission to view this delivery.");
        }

        return getOrCreateDeliveryForOrder(order);
    }

    /**
     * Retrieves status history for delivery with strict ownership check.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDeliveryHistory(Long deliveryId, MarketplaceBackendApplication.MarketplaceUser caller) {
        Delivery delivery = getDeliveryById(deliveryId, caller);
        List<DeliveryStatusHistory> histories = deliveryStatusHistoryRepository.findByDeliveryIdOrderByChangedAtAsc(delivery.getId());
        return histories.stream().map(this::historyToResponseMap).collect(Collectors.toList());
    }

    private void sendDeliveryStatusNotification(
            MaterialOrder order,
            DeliveryStatus previousStatus,
            DeliveryStatus newStatus,
            String reason
    ) {
        if (notificationService == null || order.getBuyer() == null) {
            return;
        }

        String orderCode = order.getOrderCode();
        String notifType = "DELIVERY_" + newStatus.name();

        // Prevent duplicate notification on retries
        if (notificationService.existsNotification(order.getBuyer().getId(), notifType, orderCode)) {
            return;
        }

        String titleEn = "Delivery Update";
        String titleHi = "डिलीवरी अपडेट";
        String msgEn = "Your material order " + orderCode + " status is now " + newStatus.getLabelEn() + ".";
        String msgHi = "आपका सामग्री ऑर्डर " + orderCode + " अब " + newStatus.getLabelHi() + " है।";

        switch (newStatus) {
            case READY_TO_DISPATCH -> {
                titleEn = "Ready for Dispatch";
                titleHi = "भेजने के लिए तैयार";
                msgEn = "Your material order " + orderCode + " is packed and ready for dispatch.";
                msgHi = "आपका सामग्री ऑर्डर " + orderCode + " पैक हो चुका है और भेजने के लिए तैयार है।";
            }
            case DISPATCHED -> {
                titleEn = "Order Dispatched";
                titleHi = "ऑर्डर रवाना किया गया";
                msgEn = "Your material order " + orderCode + " has been dispatched.";
                msgHi = "आपका सामग्री ऑर्डर " + orderCode + " रवाना कर दिया गया है।";
            }
            case IN_TRANSIT -> {
                titleEn = "In Transit";
                titleHi = "रास्ते में";
                msgEn = "Your material order " + orderCode + " is in transit to the delivery site.";
                msgHi = "आपका सामग्री ऑर्डर " + orderCode + " डिलीवरी स्थल के लिए रास्ते में है।";
            }
            case OUT_FOR_DELIVERY -> {
                titleEn = "Out for Delivery";
                titleHi = "डिलीवरी के लिए रवाना";
                msgEn = "Your material order " + orderCode + " is out for delivery today.";
                msgHi = "आपका सामग्री ऑर्डर " + orderCode + " आज डिलीवरी के लिए रवाना हो चुका है।";
            }
            case DELIVERED -> {
                titleEn = "Order Delivered";
                titleHi = "डिलीवर हो गया";
                msgEn = "Your material order " + orderCode + " has been successfully delivered.";
                msgHi = "आपका सामग्री ऑर्डर " + orderCode + " सफलतापूर्वक डिलीवर हो गया है।";
            }
            case DELAYED -> {
                titleEn = "Delivery Delayed";
                titleHi = "डिलीवरी में देरी";
                msgEn = "Your material order " + orderCode + " delivery is delayed" + (reason != null ? ": " + reason : ".");
                msgHi = "आपके सामग्री ऑर्डर " + orderCode + " की डिलीवरी में देरी हुई है" + (reason != null ? ": " + reason : "।");
            }
            case DELIVERY_FAILED -> {
                titleEn = "Delivery Attempt Failed";
                titleHi = "डिलीवरी का प्रयास विफल";
                msgEn = "A delivery attempt for order " + orderCode + " could not be completed.";
                msgHi = "ऑर्डर " + orderCode + " के लिए डिलीवरी का प्रयास पूरा नहीं हो सका।";
            }
            default -> {}
        }

        try {
            notificationService.createNotification(
                    order.getBuyer(),
                    titleEn,
                    titleHi,
                    msgEn,
                    msgHi,
                    notifType,
                    orderCode
            );
        } catch (Exception e) {
            log.warn("Failed to dispatch delivery status notification: {}", e.getMessage());
        }
    }

    public synchronized String generateTrackingNumber() {
        int year = LocalDate.now().getYear();
        Long maxId = deliveryRepository.findMaxId();
        long next = (maxId != null ? maxId : 0L) + 1L;
        String candidate = String.format("TRK-%d-%05d", year, next);

        int attempts = 0;
        while (deliveryRepository.findByTrackingNumber(candidate).isPresent() && attempts < 100) {
            next++;
            candidate = String.format("TRK-%d-%05d", year, next);
            attempts++;
        }
        if (deliveryRepository.findByTrackingNumber(candidate).isPresent()) {
            candidate = String.format("TRK-%d-%s", year, UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        return candidate;
    }

    public Map<String, Object> toResponseMap(Delivery delivery) {
        if (delivery == null) return Collections.emptyMap();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", delivery.getId());
        map.put("trackingNumber", delivery.getTrackingNumber());
        map.put("status", delivery.getStatus() != null ? delivery.getStatus().name() : "PROCESSING");
        map.put("statusLabelEn", delivery.getStatus() != null ? delivery.getStatus().getLabelEn() : "Processing");
        map.put("statusLabelHi", delivery.getStatus() != null ? delivery.getStatus().getLabelHi() : "प्रक्रिया में");
        map.put("stageNumber", delivery.getStatus() != null ? delivery.getStatus().getStageNumber() : 1);

        map.put("carrierName", delivery.getCarrierName());
        map.put("trackingUrl", delivery.getTrackingUrl());
        map.put("vehicleNumber", delivery.getVehicleNumber());
        map.put("driverName", delivery.getDriverName());
        map.put("driverPhone", delivery.getDriverPhone());
        map.put("estimatedDeliveryDate", delivery.getEstimatedDeliveryDate());
        map.put("actualDeliveryDate", delivery.getActualDeliveryDate() != null ? delivery.getActualDeliveryDate().toString() : null);
        map.put("currentNotes", delivery.getCurrentNotes());

        MaterialOrder order = delivery.getMaterialOrder();
        if (order != null) {
            map.put("materialOrderId", order.getId());
            map.put("orderCode", order.getOrderCode());
            map.put("deliveryAddress", order.getDeliveryAddress());
            map.put("contactNumber", order.getContactNumber());
            map.put("totalAmount", order.getTotalAmount());
            if (order.getBuyer() != null) {
                map.put("buyerId", order.getBuyer().getId());
                map.put("buyerName", order.getBuyer().getName());
                map.put("buyerRole", order.getBuyerRole());
            }
            if (order.getSeller() != null) {
                map.put("sellerId", order.getSeller().getId());
                map.put("sellerName", order.getSeller().getName());
            }
            if (order.getVerificationCode() != null) {
                map.put("verificationCode", order.getVerificationCode());
            }

            try {
                if (order.getMaterialRequest() != null) {
                    map.put("projectName", order.getMaterialRequest().getProjectName());
                    map.put("city", order.getMaterialRequest().getCity());
                    map.put("state", order.getMaterialRequest().getState());
                    map.put("pinCode", order.getMaterialRequest().getPinCode());
                }
            } catch (Exception ignored) {}

            try {
                List<MaterialOrderItem> items = order.getItems();
                if (items != null && !items.isEmpty()) {
                    List<Map<String, Object>> itemsList = new ArrayList<>();
                    for (MaterialOrderItem item : items) {
                        Map<String, Object> im = new LinkedHashMap<>();
                        im.put("id", item.getId());
                        im.put("materialName", item.getMaterialName());
                        im.put("quantity", item.getQuantity());
                        im.put("unit", item.getUnit());
                        im.put("unitPrice", item.getUnitPrice());
                        im.put("subtotal", item.getSubtotal());
                        im.put("itemStatus", item.getItemStatus());
                        itemsList.add(im);
                    }
                    map.put("items", itemsList);
                }
            } catch (Exception ignored) {}
        }

        map.put("createdAt", delivery.getCreatedAt() != null ? delivery.getCreatedAt().toString() : null);
        map.put("createdAtFormatted", delivery.getCreatedAt() != null ? delivery.getCreatedAt().format(DISPLAY_DATE_FORMATTER) : null);
        map.put("updatedAt", delivery.getUpdatedAt() != null ? delivery.getUpdatedAt().toString() : null);
        map.put("updatedAtFormatted", delivery.getUpdatedAt() != null ? delivery.getUpdatedAt().format(DISPLAY_DATE_FORMATTER) : null);

        return map;
    }

    public Map<String, Object> historyToResponseMap(DeliveryStatusHistory h) {
        if (h == null) return Collections.emptyMap();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", h.getId());
        map.put("deliveryId", h.getDelivery() != null ? h.getDelivery().getId() : null);
        map.put("previousStatus", h.getPreviousStatus() != null ? h.getPreviousStatus().name() : null);
        map.put("newStatus", h.getNewStatus() != null ? h.getNewStatus().name() : null);
        map.put("changedAt", h.getChangedAt() != null ? h.getChangedAt().toString() : null);
        map.put("changedDateFormatted", h.getChangedAt() != null ? h.getChangedAt().format(DISPLAY_DATE_FORMATTER) : null);
        map.put("actorId", h.getActorId());
        map.put("actorRole", h.getActorRole());
        map.put("reason", h.getReason());
        map.put("notes", h.getNotes());
        return map;
    }
}
