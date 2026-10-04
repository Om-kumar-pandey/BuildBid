package com.marketplace.backend;

/**
 * Summary DTO for an individual trade requirement within a Post Requirement.
 */
public class TradeRequirementSummaryDto {

    private String tradeRole;
    private int requiredQuantity;
    private long acceptedQuantity;
    private long remainingQuantity;
    private Double offerAmount;
    private String offerType;
    private boolean eligible;
    private boolean filled;

    public TradeRequirementSummaryDto() {}

    public TradeRequirementSummaryDto(
            String tradeRole,
            int requiredQuantity,
            long acceptedQuantity,
            long remainingQuantity,
            Double offerAmount,
            String offerType,
            boolean eligible,
            boolean filled
    ) {
        this.tradeRole = tradeRole;
        this.requiredQuantity = requiredQuantity;
        this.acceptedQuantity = acceptedQuantity;
        this.remainingQuantity = remainingQuantity;
        this.offerAmount = offerAmount;
        this.offerType = offerType;
        this.eligible = eligible;
        this.filled = filled;
    }

    public String getTradeRole() {
        return tradeRole;
    }

    public void setTradeRole(String tradeRole) {
        this.tradeRole = tradeRole;
    }

    public int getRequiredQuantity() {
        return requiredQuantity;
    }

    public void setRequiredQuantity(int requiredQuantity) {
        this.requiredQuantity = requiredQuantity;
    }

    public long getAcceptedQuantity() {
        return acceptedQuantity;
    }

    public void setAcceptedQuantity(long acceptedQuantity) {
        this.acceptedQuantity = acceptedQuantity;
    }

    public long getRemainingQuantity() {
        return remainingQuantity;
    }

    public void setRemainingQuantity(long remainingQuantity) {
        this.remainingQuantity = remainingQuantity;
    }

    public Double getOfferAmount() {
        return offerAmount;
    }

    public void setOfferAmount(Double offerAmount) {
        this.offerAmount = offerAmount;
    }

    public String getOfferType() {
        return offerType;
    }

    public void setOfferType(String offerType) {
        this.offerType = offerType;
    }

    public boolean isEligible() {
        return eligible;
    }

    public void setEligible(boolean eligible) {
        this.eligible = eligible;
    }

    public boolean isFilled() {
        return filled;
    }

    public void setFilled(boolean filled) {
        this.filled = filled;
    }
}
