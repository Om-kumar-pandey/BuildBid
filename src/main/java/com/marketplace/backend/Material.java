package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "materials")
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser seller;

    @Column(name = "category", nullable = false, length = 150)
    private String category;

    @Column(name = "material_name", nullable = false, length = 200)
    private String materialName;

    @Column(name = "brand", length = 150)
    private String brand;

    @Column(name = "specifications", length = 250)
    private String specifications;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "current_stock", nullable = false)
    private Double currentStock;

    @Column(name = "reserved_stock", nullable = false)
    private Double reservedStock = 0.0;

    @Column(name = "available_stock", nullable = false)
    private Double availableStock;

    @Column(name = "unit", nullable = false, length = 100)
    private String unit;

    @Column(name = "unit_price", nullable = false)
    private Double unitPrice;

    @Column(name = "stock_status", nullable = false, length = 50)
    private String stockStatus;

    @Column(name = "delivery_location", length = 200)
    private String deliveryLocation;

    @Column(name = "delivery_radius_km")
    private Double deliveryRadiusKm;

    @Column(name = "transportation_charge_basis", length = 100)
    private String transportationChargeBasis;

    @Column(name = "transportation_rate")
    private Double transportationRate;

    @Column(name = "beyond_radius_policy", columnDefinition = "TEXT")
    private String beyondRadiusPolicy = "Fair transportation amount will be charged.";

    @Column(name = "transportation_policy_enabled")
    private Boolean transportationPolicyEnabled = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Material() {}

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (reservedStock == null) {
            reservedStock = 0.0;
        }
        if (availableStock == null && currentStock != null) {
            availableStock = currentStock - reservedStock;
        }
    }

    @PreUpdate
    public void onUpdate() {
        if (reservedStock == null) {
            reservedStock = 0.0;
        }
        if (currentStock != null) {
            availableStock = currentStock - reservedStock;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MarketplaceBackendApplication.MarketplaceUser getSeller() { return seller; }
    public void setSeller(MarketplaceBackendApplication.MarketplaceUser seller) { this.seller = seller; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getSpecifications() { return specifications; }
    public void setSpecifications(String specifications) { this.specifications = specifications; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getCurrentStock() { return currentStock; }
    public void setCurrentStock(Double currentStock) { this.currentStock = currentStock; }

    public Double getReservedStock() { return reservedStock; }
    public void setReservedStock(Double reservedStock) { this.reservedStock = reservedStock; }

    public Double getAvailableStock() { return availableStock; }
    public void setAvailableStock(Double availableStock) { this.availableStock = availableStock; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }

    public String getStockStatus() { return stockStatus; }
    public void setStockStatus(String stockStatus) { this.stockStatus = stockStatus; }

    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }

    public Double getDeliveryRadiusKm() { return deliveryRadiusKm; }
    public void setDeliveryRadiusKm(Double deliveryRadiusKm) { this.deliveryRadiusKm = deliveryRadiusKm; }

    public String getTransportationChargeBasis() { return transportationChargeBasis; }
    public void setTransportationChargeBasis(String transportationChargeBasis) { this.transportationChargeBasis = transportationChargeBasis; }

    public Double getTransportationRate() { return transportationRate; }
    public void setTransportationRate(Double transportationRate) { this.transportationRate = transportationRate; }

    public String getBeyondRadiusPolicy() { return beyondRadiusPolicy; }
    public void setBeyondRadiusPolicy(String beyondRadiusPolicy) { this.beyondRadiusPolicy = beyondRadiusPolicy; }

    public Boolean getTransportationPolicyEnabled() { return transportationPolicyEnabled; }
    public void setTransportationPolicyEnabled(Boolean transportationPolicyEnabled) { this.transportationPolicyEnabled = transportationPolicyEnabled; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
