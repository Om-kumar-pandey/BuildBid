package com.marketplace.backend;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * BUILDBID COST ESTIMATOR - SINGLE MASTER RATE TABLE
 *
 * Represents all rate benchmark data and calculation factors in a single unified table.
 * Supports hierarchical lookup:
 * City -> District -> State Default -> National Default.
 */
@Entity
@Table(
    name = "cost_estimator_rates",
    indexes = {
        @Index(name = "idx_cer_state_city_proj", columnList = "state, city, project_type, is_active"),
        @Index(name = "idx_cer_state_dist_proj", columnList = "state, district, project_type, is_active"),
        @Index(name = "idx_cer_proj_cat_active", columnList = "project_type, component_category, is_active"),
        @Index(name = "idx_cer_date", columnList = "rate_date")
    }
)
public class CostEstimatorRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "state", nullable = false, length = 100)
    private String state;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "district", length = 100)
    private String district;

    @Column(name = "project_type", nullable = false, length = 50)
    private String projectType;

    @Column(name = "component_category", nullable = false, length = 50)
    private String componentCategory;

    @Column(name = "component_name", nullable = false, length = 150)
    private String componentName;

    @Column(name = "material_name", length = 100)
    private String materialName;

    @Column(name = "specification", length = 255)
    private String specification;

    @Column(name = "rate_type", nullable = false, length = 50)
    private String rateType;

    @Column(name = "floor_level", nullable = false, length = 50)
    private String floorLevel;

    @Column(name = "factor_type", length = 100)
    private String factorType;

    @Column(name = "unit", nullable = false, length = 50)
    private String unit;

    @Column(name = "min_rate", precision = 12, scale = 2)
    private BigDecimal minRate;

    @Column(name = "max_rate", precision = 12, scale = 2)
    private BigDecimal maxRate;

    @Column(name = "average_rate", precision = 12, scale = 2)
    private BigDecimal averageRate;

    @Column(name = "factor_value", precision = 8, scale = 4)
    private BigDecimal factorValue;

    @Column(name = "rate_source", nullable = false, length = 255)
    private String rateSource;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "rate_date", nullable = false)
    private LocalDate rateDate;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CostEstimatorRate() {
    }

    @PrePersist
    protected void onCreate() {
        if (this.isActive == null) {
            this.isActive = true;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ========================================================
    // VALIDATION HELPER
    // ========================================================

    public boolean isValid() {
        if ("UNIT_RATE".equalsIgnoreCase(rateType) || "AREA_RATE".equalsIgnoreCase(rateType)) {
            if (minRate == null || averageRate == null || maxRate == null) {
                return false;
            }
            if (minRate.compareTo(BigDecimal.ZERO) <= 0) {
                return false;
            }
            if (minRate.compareTo(averageRate) > 0 || averageRate.compareTo(maxRate) > 0) {
                return false;
            }
        } else if ("MULTIPLIER".equalsIgnoreCase(rateType) || "PERCENTAGE".equalsIgnoreCase(rateType)) {
            if (factorValue == null || factorValue.compareTo(BigDecimal.ZERO) < 0) {
                return false;
            }
        }
        return true;
    }

    // ========================================================
    // GETTERS & SETTERS
    // ========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getProjectType() {
        return projectType;
    }

    public void setProjectType(String projectType) {
        this.projectType = projectType;
    }

    public String getComponentCategory() {
        return componentCategory;
    }

    public void setComponentCategory(String componentCategory) {
        this.componentCategory = componentCategory;
    }

    public String getComponentName() {
        return componentName;
    }

    public void setComponentName(String componentName) {
        this.componentName = componentName;
    }

    public String getMaterialName() {
        return materialName;
    }

    public void setMaterialName(String materialName) {
        this.materialName = materialName;
    }

    public String getSpecification() {
        return specification;
    }

    public void setSpecification(String specification) {
        this.specification = specification;
    }

    public String getRateType() {
        return rateType;
    }

    public void setRateType(String rateType) {
        this.rateType = rateType;
    }

    public String getFloorLevel() {
        return floorLevel;
    }

    public void setFloorLevel(String floorLevel) {
        this.floorLevel = floorLevel;
    }

    public String getFactorType() {
        return factorType;
    }

    public void setFactorType(String factorType) {
        this.factorType = factorType;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getMinRate() {
        return minRate;
    }

    public void setMinRate(BigDecimal minRate) {
        this.minRate = minRate;
    }

    public BigDecimal getMaxRate() {
        return maxRate;
    }

    public void setMaxRate(BigDecimal maxRate) {
        this.maxRate = maxRate;
    }

    public BigDecimal getAverageRate() {
        return averageRate;
    }

    public void setAverageRate(BigDecimal averageRate) {
        this.averageRate = averageRate;
    }

    public BigDecimal getFactorValue() {
        return factorValue;
    }

    public void setFactorValue(BigDecimal factorValue) {
        this.factorValue = factorValue;
    }

    public String getRateSource() {
        return rateSource;
    }

    public void setRateSource(String rateSource) {
        this.rateSource = rateSource;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public LocalDate getRateDate() {
        return rateDate;
    }

    public void setRateDate(LocalDate rateDate) {
        this.rateDate = rateDate;
    }

    public LocalDate getEffectiveFrom() {
        return effectiveFrom;
    }

    public void setEffectiveFrom(LocalDate effectiveFrom) {
        this.effectiveFrom = effectiveFrom;
    }

    public LocalDate getEffectiveTo() {
        return effectiveTo;
    }

    public void setEffectiveTo(LocalDate effectiveTo) {
        this.effectiveTo = effectiveTo;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean active) {
        isActive = active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
