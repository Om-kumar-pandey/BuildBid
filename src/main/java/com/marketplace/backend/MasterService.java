package com.marketplace.backend;

import jakarta.persistence.*;

/**
 * Entity representing a standardized master construction service in BuildBid.
 * Serves as the source of truth for bilingual service titles, verification mandates, and default pricing units.
 */
@Entity
@Table(name = "master_services")
public class MasterService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private ServiceCategory category;

    @Column(name = "title_en", nullable = false, length = 200)
    private String titleEn;

    @Column(name = "title_hi", nullable = false, length = 200)
    private String titleHi;

    @Column(name = "verification_required", nullable = false)
    private boolean verificationRequired = false;

    @Column(name = "default_pricing_unit", length = 100)
    private String defaultPricingUnit;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public MasterService() {}

    public MasterService(ServiceCategory category, String titleEn, String titleHi,
                         boolean verificationRequired, String defaultPricingUnit, boolean active) {
        this.category = category;
        this.titleEn = titleEn;
        this.titleHi = titleHi;
        this.verificationRequired = verificationRequired;
        this.defaultPricingUnit = defaultPricingUnit;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ServiceCategory getCategory() {
        return category;
    }

    public void setCategory(ServiceCategory category) {
        this.category = category;
    }

    public String getTitleEn() {
        return titleEn;
    }

    public void setTitleEn(String titleEn) {
        this.titleEn = titleEn;
    }

    public String getTitleHi() {
        return titleHi;
    }

    public void setTitleHi(String titleHi) {
        this.titleHi = titleHi;
    }

    public boolean isVerificationRequired() {
        return verificationRequired;
    }

    public void setVerificationRequired(boolean verificationRequired) {
        this.verificationRequired = verificationRequired;
    }

    public String getDefaultPricingUnit() {
        return defaultPricingUnit;
    }

    public void setDefaultPricingUnit(String defaultPricingUnit) {
        this.defaultPricingUnit = defaultPricingUnit;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
