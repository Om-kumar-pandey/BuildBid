package com.marketplace.backend;

/**
 * BUILDBID - CANONICAL DELIVERY STATUS ENUM (Phase 2)
 *
 * Defines the authoritative lifecycle states for delivery fulfillment:
 * PROCESSING -> READY_TO_DISPATCH -> DISPATCHED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
 *
 * Exception & Recovery states:
 * - DELAYED (recoverable to IN_TRANSIT, OUT_FOR_DELIVERY, or DISPATCHED)
 * - DELIVERY_FAILED (recoverable to OUT_FOR_DELIVERY, IN_TRANSIT, or RETURNED)
 * - RETURNED (terminal return outcome)
 */
public enum DeliveryStatus {
    PROCESSING("Processing", "प्रक्रिया में", 1),
    READY_TO_DISPATCH("Ready for Dispatch", "भेजने के लिए तैयार", 2),
    DISPATCHED("Order Dispatched", "ऑर्डर भेजा गया", 2),
    IN_TRANSIT("In Transit", "रास्ते में", 2),
    OUT_FOR_DELIVERY("Out for Delivery", "डिलीवरी के लिए रवाना", 3),
    DELIVERED("Delivered", "डिलीवर हो गया", 4),
    DELAYED("Delayed", "विलंबित", 2),
    DELIVERY_FAILED("Delivery Failed", "डिलीवरी विफल", 3),
    RETURNED("Returned", "वापस किया गया", 4);

    private final String labelEn;
    private final String labelHi;
    private final int stageNumber;

    DeliveryStatus(String labelEn, String labelHi, int stageNumber) {
        this.labelEn = labelEn;
        this.labelHi = labelHi;
        this.stageNumber = stageNumber;
    }

    public String getLabelEn() {
        return labelEn;
    }

    public String getEnglishLabel() {
        return labelEn;
    }

    public String getLabelHi() {
        return labelHi;
    }

    public String getHindiLabel() {
        return labelHi;
    }

    public int getStageNumber() {
        return stageNumber;
    }

    /**
     * Server-enforced state machine transition validator.
     * Idempotent: transitioning from S to S is permitted and considered a no-op.
     */
    public static boolean isValidTransition(DeliveryStatus current, DeliveryStatus target) {
        if (current == null || target == null) {
            return false;
        }
        if (current == target) {
            return true; // Idempotent
        }

        return switch (current) {
            case PROCESSING -> target == READY_TO_DISPATCH || target == DISPATCHED;
            case READY_TO_DISPATCH -> target == DISPATCHED;
            case DISPATCHED -> target == IN_TRANSIT || target == OUT_FOR_DELIVERY || target == DELAYED;
            case IN_TRANSIT -> target == OUT_FOR_DELIVERY || target == DELAYED || target == DELIVERED;
            case OUT_FOR_DELIVERY -> target == DELIVERED || target == DELAYED || target == DELIVERY_FAILED;
            case DELAYED -> target == IN_TRANSIT || target == OUT_FOR_DELIVERY || target == DISPATCHED || target == DELIVERY_FAILED;
            case DELIVERY_FAILED -> target == OUT_FOR_DELIVERY || target == IN_TRANSIT || target == RETURNED;
            case DELIVERED, RETURNED -> false; // Terminal delivery states
        };
    }

    public static DeliveryStatus fromString(String statusStr) {
        if (statusStr == null || statusStr.isBlank()) {
            return null;
        }
        String clean = statusStr.trim().toUpperCase().replace(" ", "_").replace("-", "_");
        if ("READY_FOR_DISPATCH".equals(clean)) {
            return READY_TO_DISPATCH;
        }
        if ("ORDER_DISPATCHED".equals(clean)) {
            return DISPATCHED;
        }
        if ("ORDER_ACCEPTED".equals(clean) || "ACCEPTED".equals(clean) || "CONFIRMED".equals(clean)) {
            return PROCESSING;
        }
        if ("COMPLETED".equals(clean)) {
            return DELIVERED;
        }
        for (DeliveryStatus s : values()) {
            if (s.name().equalsIgnoreCase(clean)) {
                return s;
            }
        }
        return null;
    }
}
