package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Dedicated Customer Construction Preferences Entity.
 * Stores general default preferences for future project creation & recommendations.
 * One-to-one relationship with the authenticated MarketplaceUser.
 */
@Entity
@Table(name = "customer_construction_preferences")
public class CustomerConstructionPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser user;

    @Column(name = "preferred_project_type", length = 100)
    private String preferredProjectType;

    @Column(name = "preferred_property_type", length = 100)
    private String preferredPropertyType;

    @Column(name = "preferred_built_up_area")
    private Double preferredBuiltUpArea;

    @Column(name = "preferred_number_of_floors", length = 50)
    private String preferredNumberOfFloors;

    @Column(name = "preferred_construction_quality", length = 50)
    private String preferredConstructionQuality;

    @Column(name = "preferred_budget_range", length = 100)
    private String preferredBudgetRange;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public CustomerConstructionPreference() {}

    public CustomerConstructionPreference(MarketplaceBackendApplication.MarketplaceUser user) {
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MarketplaceBackendApplication.MarketplaceUser getUser() {
        return user;
    }

    public void setUser(MarketplaceBackendApplication.MarketplaceUser user) {
        this.user = user;
    }

    public String getPreferredProjectType() {
        return preferredProjectType;
    }

    public void setPreferredProjectType(String preferredProjectType) {
        this.preferredProjectType = preferredProjectType;
    }

    public String getPreferredPropertyType() {
        return preferredPropertyType;
    }

    public void setPreferredPropertyType(String preferredPropertyType) {
        this.preferredPropertyType = preferredPropertyType;
    }

    public Double getPreferredBuiltUpArea() {
        return preferredBuiltUpArea;
    }

    public void setPreferredBuiltUpArea(Double preferredBuiltUpArea) {
        this.preferredBuiltUpArea = preferredBuiltUpArea;
    }

    public String getPreferredNumberOfFloors() {
        return preferredNumberOfFloors;
    }

    public void setPreferredNumberOfFloors(String preferredNumberOfFloors) {
        this.preferredNumberOfFloors = preferredNumberOfFloors;
    }

    public String getPreferredConstructionQuality() {
        return preferredConstructionQuality;
    }

    public void setPreferredConstructionQuality(String preferredConstructionQuality) {
        this.preferredConstructionQuality = preferredConstructionQuality;
    }

    public String getPreferredBudgetRange() {
        return preferredBudgetRange;
    }

    public void setPreferredBudgetRange(String preferredBudgetRange) {
        this.preferredBudgetRange = preferredBudgetRange;
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

    /**
     * Resets all six preference fields to null.
     */
    public void reset() {
        this.preferredProjectType = null;
        this.preferredPropertyType = null;
        this.preferredBuiltUpArea = null;
        this.preferredNumberOfFloors = null;
        this.preferredConstructionQuality = null;
        this.preferredBudgetRange = null;
        this.updatedAt = LocalDateTime.now();
    }
}
