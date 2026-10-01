package com.marketplace.backend;

import jakarta.persistence.*;

/**
 * Entity representing a high-level construction service category in the BuildBid Master Catalog.
 * Examples: Labour & Trades, Architecture & Design, Civil Engineering, etc.
 */
@Entity
@Table(name = "service_categories")
public class ServiceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 100)
    private String code;

    @Column(name = "name_en", nullable = false, length = 150)
    private String nameEn;

    @Column(name = "name_hi", nullable = false, length = 150)
    private String nameHi;

    @Column(name = "icon", length = 100)
    private String icon;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public ServiceCategory() {}

    public ServiceCategory(String code, String nameEn, String nameHi, String icon, boolean active) {
        this.code = code;
        this.nameEn = nameEn;
        this.nameHi = nameHi;
        this.icon = icon;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public String getNameHi() {
        return nameHi;
    }

    public void setNameHi(String nameHi) {
        this.nameHi = nameHi;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
