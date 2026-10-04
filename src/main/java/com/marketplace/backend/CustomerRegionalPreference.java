package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Dedicated Customer Regional Preferences Entity.
 * Stores customer regional display preferences: Time Zone, Currency, Area Unit, Date Format, Number Format.
 * Note: Preferred Language is authoritatively stored in CustomerProfile.preferredLanguage to preserve
 * single-source-of-truth across BuildBid and prevent conflicting duplicate language fields.
 * One-to-one relationship with the authenticated MarketplaceUser.
 */
@Entity
@Table(name = "customer_regional_preferences")
public class CustomerRegionalPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser user;

    @Column(name = "time_zone", length = 100)
    private String timeZone;

    @Column(name = "currency", length = 50)
    private String currency;

    @Column(name = "area_unit", length = 50)
    private String areaUnit;

    @Column(name = "date_format", length = 50)
    private String dateFormat;

    @Column(name = "number_format", length = 50)
    private String numberFormat;

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

    public CustomerRegionalPreference() {}

    public CustomerRegionalPreference(MarketplaceBackendApplication.MarketplaceUser user) {
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

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getAreaUnit() {
        return areaUnit;
    }

    public void setAreaUnit(String areaUnit) {
        this.areaUnit = areaUnit;
    }

    public String getDateFormat() {
        return dateFormat;
    }

    public void setDateFormat(String dateFormat) {
        this.dateFormat = dateFormat;
    }

    public String getNumberFormat() {
        return numberFormat;
    }

    public void setNumberFormat(String numberFormat) {
        this.numberFormat = numberFormat;
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
     * Resets regional preference fields to canonical defaults.
     */
    public void reset() {
        this.timeZone = "Asia/Kolkata";
        this.currency = "INR";
        this.areaUnit = "sq ft";
        this.dateFormat = "DD/MM/YYYY";
        this.numberFormat = "Indian";
        this.updatedAt = LocalDateTime.now();
    }
}
