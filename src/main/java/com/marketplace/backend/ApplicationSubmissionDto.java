package com.marketplace.backend;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for submitting a trade-specific application/quotation to a Post Requirement.
 */
public class ApplicationSubmissionDto {

    @NotBlank(message = "Trade role is required")
    @Size(max = 100, message = "Trade role must not exceed 100 characters")
    private String tradeRole;

    @NotNull(message = "Proposed rate is required")
    @DecimalMin(value = "0.01", message = "Proposed rate must be greater than zero")
    private Double proposedRate;

    @NotBlank(message = "Rate type is required")
    @Size(max = 50, message = "Rate type must not exceed 50 characters")
    private String rateType = "PER_DAY";

    @Min(value = 1, message = "Team size must be at least 1")
    private Integer teamSize = 1;

    @Size(max = 100, message = "Estimated duration must not exceed 100 characters")
    private String estimatedDuration;

    @Size(max = 2000, message = "Cover message must not exceed 2000 characters")
    private String coverMessage;

    public ApplicationSubmissionDto() {}

    public ApplicationSubmissionDto(String tradeRole, Double proposedRate, String rateType, Integer teamSize, String estimatedDuration, String coverMessage) {
        this.tradeRole = tradeRole;
        this.proposedRate = proposedRate;
        this.rateType = rateType;
        this.teamSize = teamSize;
        this.estimatedDuration = estimatedDuration;
        this.coverMessage = coverMessage;
    }

    public String getTradeRole() {
        return tradeRole;
    }

    public void setTradeRole(String tradeRole) {
        this.tradeRole = tradeRole;
    }

    public Double getProposedRate() {
        return proposedRate;
    }

    public void setProposedRate(Double proposedRate) {
        this.proposedRate = proposedRate;
    }

    public String getRateType() {
        return rateType;
    }

    public void setRateType(String rateType) {
        this.rateType = rateType;
    }

    public Integer getTeamSize() {
        return teamSize;
    }

    public void setTeamSize(Integer teamSize) {
        this.teamSize = teamSize;
    }

    public String getEstimatedDuration() {
        return estimatedDuration;
    }

    public void setEstimatedDuration(String estimatedDuration) {
        this.estimatedDuration = estimatedDuration;
    }

    public String getCoverMessage() {
        return coverMessage;
    }

    public void setCoverMessage(String coverMessage) {
        this.coverMessage = coverMessage;
    }
}
