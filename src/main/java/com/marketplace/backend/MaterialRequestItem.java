package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "material_request_items")
public class MaterialRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    @JsonIgnore
    private MaterialRequest materialRequest;

    @Column(name = "category", nullable = false, length = 150)
    private String category;

    @Column(name = "material_name", nullable = false, length = 200)
    private String materialName;

    @Column(name = "quantity", nullable = false)
    private Double quantity;

    @Column(name = "unit", nullable = false, length = 100)
    private String unit;

    @Column(name = "brand", length = 150)
    private String brand;

    @Column(name = "specification", length = 250)
    private String specification;

    @Column(name = "is_custom_material")
    private Boolean isCustomMaterial = false;

    @Column(name = "custom_material_name", length = 200)
    private String customMaterialName;

    @Column(name = "custom_brand", length = 150)
    private String customBrand;

    @Column(name = "custom_specification", length = 250)
    private String customSpecification;

    @Column(name = "custom_unit", length = 100)
    private String customUnit;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public MaterialRequestItem() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MaterialRequest getMaterialRequest() { return materialRequest; }
    public void setMaterialRequest(MaterialRequest materialRequest) { this.materialRequest = materialRequest; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }

    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getSpecification() { return specification; }
    public void setSpecification(String specification) { this.specification = specification; }

    public Boolean getIsCustomMaterial() { return isCustomMaterial; }
    public void setIsCustomMaterial(Boolean isCustomMaterial) { this.isCustomMaterial = isCustomMaterial; }

    public String getCustomMaterialName() { return customMaterialName; }
    public void setCustomMaterialName(String customMaterialName) { this.customMaterialName = customMaterialName; }

    public String getCustomBrand() { return customBrand; }
    public void setCustomBrand(String customBrand) { this.customBrand = customBrand; }

    public String getCustomSpecification() { return customSpecification; }
    public void setCustomSpecification(String customSpecification) { this.customSpecification = customSpecification; }

    public String getCustomUnit() { return customUnit; }
    public void setCustomUnit(String customUnit) { this.customUnit = customUnit; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
