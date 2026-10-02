package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * BUILDBID - QUOTATION ITEM ENTITY (Phase 4C)
 * 
 * Represents a concrete commercial line item within a persistent Quotation,
 * linking a consumer requirement item (MaterialRequestItem) to an authoritative
 * seller warehouse catalog SKU (Material).
 */
@Entity
@Table(name = "quotation_items")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QuotationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    @JsonIgnore
    private Quotation quotation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_request_item_id")
    @JsonIgnore
    private MaterialRequestItem materialRequestItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    @JsonIgnore
    private Material material;

    @Column(name = "material_name", nullable = false, length = 200)
    private String materialName;

    @Column(name = "quoted_quantity", nullable = false)
    private Double quotedQuantity;

    @Column(name = "quoted_unit", nullable = false, length = 50)
    private String quotedUnit;

    @Column(name = "unit_price", nullable = false)
    private Double unitPrice;

    @Column(name = "line_total", nullable = false)
    private Double lineTotal;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public QuotationItem() {}

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Quotation getQuotation() {
        return quotation;
    }

    public void setQuotation(Quotation quotation) {
        this.quotation = quotation;
    }

    public MaterialRequestItem getMaterialRequestItem() {
        return materialRequestItem;
    }

    public void setMaterialRequestItem(MaterialRequestItem materialRequestItem) {
        this.materialRequestItem = materialRequestItem;
    }

    public Material getMaterial() {
        return material;
    }

    public void setMaterial(Material material) {
        this.material = material;
    }

    public String getMaterialName() {
        return materialName;
    }

    public void setMaterialName(String materialName) {
        this.materialName = materialName;
    }

    public Double getQuotedQuantity() {
        return quotedQuantity;
    }

    public void setQuotedQuantity(Double quotedQuantity) {
        this.quotedQuantity = quotedQuantity;
    }

    public String getQuotedUnit() {
        return quotedUnit;
    }

    public void setQuotedUnit(String quotedUnit) {
        this.quotedUnit = quotedUnit;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Double getLineTotal() {
        return lineTotal;
    }

    public void setLineTotal(Double lineTotal) {
        this.lineTotal = lineTotal;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
