package com.marketplace.backend;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * BUILDBID COST ESTIMATOR - REQUEST DTO (Step 3 & Phase 2)
 *
 * Encapsulates client inputs for project cost estimation.
 *
 * Area Semantics (Phase 2 Upgrade):
 * totalBuildUpAreaSqFt = overall project above-ground construction envelope / budget (sq.ft).
 * floors = floor-wise declared areas, copy modes, and room programs.
 * basementAreaSqFt = area of the basement (sq.ft), separate from above-ground floors.
 * hasBasement = whether a basement is requested (requires basementAreaSqFt > 0).
 * numberOfFloors = number of above-ground constructed floors (1 = Ground only, 2 = Ground + First, etc.).
 * builtUpAreaSqFt = legacy compatibility field, mapped to totalBuildUpAreaSqFt.
 */
public class CostEstimationRequestDto {

    @NotBlank(message = "Project type is required")
    private String projectType;

    @NotBlank(message = "State is required")
    private String state;

    private String city;
    private String district;
    private String pincode;

    /**
     * Overall declared above-ground built-up area envelope (sq.ft).
     */
    @DecimalMin(value = "1.0", message = "Total build-up area must be greater than zero")
    private BigDecimal totalBuildUpAreaSqFt;

    /**
     * Legacy compatibility field.
     */
    private BigDecimal builtUpAreaSqFt;

    private Boolean hasBasement;

    @DecimalMin(value = "0.0", message = "Basement area cannot be negative")
    private BigDecimal basementAreaSqFt = BigDecimal.ZERO;

    @NotNull(message = "Number of floors is required")
    @Min(value = 1, message = "Number of floors must be at least 1")
    @Max(value = 100, message = "Number of floors cannot exceed 100")
    private Integer numberOfFloors = 1;

    private String qualityTier = "STANDARD";

    /**
     * Floor-by-floor specifications, copy modes, and room programs.
     */
    private List<FloorRequirementDto> floors = new ArrayList<>();

    /**
     * Optional custom planning allowance ratio (defaults to 0.20 / 20%).
     */
    private BigDecimal planningAllowanceRatio;

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
        this.totalBuildUpAreaSqFt = builtUpAreaSqFt;
        this.basementAreaSqFt = basementAreaSqFt != null ? basementAreaSqFt : BigDecimal.ZERO;
        this.numberOfFloors = numberOfFloors != null ? numberOfFloors : 1;
        this.qualityTier = (qualityTier != null && !qualityTier.trim().isEmpty()) ? qualityTier : "STANDARD";
    }

    public CostEstimationRequestDto(
            String projectType,
            String state,
            String city,
            String district,
            String pincode,
            BigDecimal totalBuildUpAreaSqFt,
            Boolean hasBasement,
            BigDecimal basementAreaSqFt,
            Integer numberOfFloors,
            String qualityTier,
            List<FloorRequirementDto> floors) {
        this.projectType = projectType;
        this.state = state;
        this.city = city;
        this.district = district;
        this.pincode = pincode;
        this.totalBuildUpAreaSqFt = totalBuildUpAreaSqFt;
        this.builtUpAreaSqFt = totalBuildUpAreaSqFt;
        this.hasBasement = hasBasement;
        this.basementAreaSqFt = basementAreaSqFt != null ? basementAreaSqFt : BigDecimal.ZERO;
        this.numberOfFloors = numberOfFloors != null ? numberOfFloors : 1;
        this.qualityTier = (qualityTier != null && !qualityTier.trim().isEmpty()) ? qualityTier : "STANDARD";
        this.floors = floors != null ? floors : new ArrayList<>();
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

    public BigDecimal getTotalBuildUpAreaSqFt() {
        if (totalBuildUpAreaSqFt != null) {
            return totalBuildUpAreaSqFt;
        }
        return builtUpAreaSqFt;
    }

    public void setTotalBuildUpAreaSqFt(BigDecimal totalBuildUpAreaSqFt) {
        this.totalBuildUpAreaSqFt = totalBuildUpAreaSqFt;
        if (this.builtUpAreaSqFt == null) {
            this.builtUpAreaSqFt = totalBuildUpAreaSqFt;
        }
    }

    public BigDecimal getBuiltUpAreaSqFt() {
        if (builtUpAreaSqFt != null) {
            return builtUpAreaSqFt;
        }
        return totalBuildUpAreaSqFt;
    }

    public void setBuiltUpAreaSqFt(BigDecimal builtUpAreaSqFt) {
        this.builtUpAreaSqFt = builtUpAreaSqFt;
        if (this.totalBuildUpAreaSqFt == null) {
            this.totalBuildUpAreaSqFt = builtUpAreaSqFt;
        }
    }

    public Boolean getHasBasement() {
        return hasBasement;
    }

    public void setHasBasement(Boolean hasBasement) {
        this.hasBasement = hasBasement;
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

    public List<FloorRequirementDto> getFloors() {
        return floors;
    }

    public void setFloors(List<FloorRequirementDto> floors) {
        this.floors = floors;
    }

    public BigDecimal getPlanningAllowanceRatio() {
        return planningAllowanceRatio;
    }

    public void setPlanningAllowanceRatio(BigDecimal planningAllowanceRatio) {
        this.planningAllowanceRatio = planningAllowanceRatio;
    }
}
