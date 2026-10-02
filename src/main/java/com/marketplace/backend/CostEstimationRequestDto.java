package com.marketplace.backend;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/**
 * BUILDBID COST ESTIMATOR - REQUEST DTO (Step 3)
 *
 * Encapsulates client inputs for project cost estimation.
 * Area Semantics:
 * builtUpAreaSqFt = area of ONE typical constructed floor (sq.ft).
 * basementAreaSqFt = area of the basement (sq.ft), separate from above-ground floors.
 * numberOfFloors = number of above-ground constructed floors (1 = Ground only, 2 = Ground + First, etc.).
 */
public class CostEstimationRequestDto {

    @NotBlank(message = "Project type is required")
    private String projectType;

    @NotBlank(message = "State is required")
    private String state;

    private String city;
    private String district;
    private String pincode;

    @NotNull(message = "Built-up area is required")
    @DecimalMin(value = "1.0", message = "Built-up area must be greater than zero")
    private BigDecimal builtUpAreaSqFt;

    @DecimalMin(value = "0.0", message = "Basement area cannot be negative")
    private BigDecimal basementAreaSqFt = BigDecimal.ZERO;

    @NotNull(message = "Number of floors is required")
    @Min(value = 1, message = "Number of floors must be at least 1")
    @Max(value = 100, message = "Number of floors cannot exceed 100")
    private Integer numberOfFloors = 1;

    private String qualityTier = "STANDARD";

    public CostEstimationRequestDto() {
    }

    public CostEstimationRequestDto(
            String projectType,
            String state,
            String city,
            String district,
            String pincode,
            BigDecimal builtUpAreaSqFt,
            BigDecimal basementAreaSqFt,
            Integer numberOfFloors,
            String qualityTier) {
        this.projectType = projectType;
        this.state = state;
        this.city = city;
        this.district = district;
        this.pincode = pincode;
        this.builtUpAreaSqFt = builtUpAreaSqFt;
        this.basementAreaSqFt = basementAreaSqFt != null ? basementAreaSqFt : BigDecimal.ZERO;
        this.numberOfFloors = numberOfFloors != null ? numberOfFloors : 1;
        this.qualityTier = (qualityTier != null && !qualityTier.trim().isEmpty()) ? qualityTier : "STANDARD";
    }

    // ========================================================
    // GETTERS & SETTERS
    // ========================================================

    public String getProjectType() {
        return projectType;
    }

    public void setProjectType(String projectType) {
        this.projectType = projectType;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getPincode() {
        return pincode;
    }

    public void setPincode(String pincode) {
        this.pincode = pincode;
    }

    public BigDecimal getBuiltUpAreaSqFt() {
        return builtUpAreaSqFt;
    }

    public void setBuiltUpAreaSqFt(BigDecimal builtUpAreaSqFt) {
        this.builtUpAreaSqFt = builtUpAreaSqFt;
    }

    public BigDecimal getBasementAreaSqFt() {
        return basementAreaSqFt;
    }

    public void setBasementAreaSqFt(BigDecimal basementAreaSqFt) {
        this.basementAreaSqFt = basementAreaSqFt;
    }

    public Integer getNumberOfFloors() {
        return numberOfFloors;
    }

    public void setNumberOfFloors(Integer numberOfFloors) {
        this.numberOfFloors = numberOfFloors;
    }

    public String getQualityTier() {
        return qualityTier;
    }

    public void setQualityTier(String qualityTier) {
        this.qualityTier = qualityTier;
    }
}
