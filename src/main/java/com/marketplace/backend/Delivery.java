package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * BUILDBID - CANONICAL DELIVERY ENTITY (Phase 2)
 *
 * One canonical delivery domain entity linked strictly 1-to-1 with MaterialOrder.
 * Guarantees idempotency, auditability, and role-scoped access control.
 */
@Entity
@Table(
        name = "deliveries",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_delivery_order", columnNames = {"material_order_id"}),
                @UniqueConstraint(name = "uk_delivery_tracking", columnNames = {"tracking_number"})
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_order_id", nullable = false, unique = true)
    @JsonIgnore
    private MaterialOrder materialOrder;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 50)
    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private DeliveryStatus status = DeliveryStatus.PROCESSING;

    @Column(name = "carrier_name", length = 100)
    private String carrierName;

    @Column(name = "tracking_url", length = 500)
    private String trackingUrl;

    @Column(name = "vehicle_number", length = 50)
    private String vehicleNumber;

    @Column(name = "driver_name", length = 100)
    private String driverName;

    @Column(name = "driver_phone", length = 30)
    private String driverPhone;

    @Column(name = "estimated_delivery_date", length = 100)
    private String estimatedDeliveryDate;

    @Column(name = "actual_delivery_date")
    private LocalDateTime actualDeliveryDate;

    @Column(name = "current_notes", columnDefinition = "TEXT")
    private String currentNotes;

    @Column(name = "verification_code", length = 50)
    private String verificationCode;

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("changedAt ASC")
    @JsonIgnore
    private List<DeliveryStatusHistory> statusHistory = new ArrayList<>();

    public Delivery() {}

    public Delivery(MaterialOrder materialOrder) {
        this.materialOrder = materialOrder;
        this.status = DeliveryStatus.PROCESSING;
        this.trackingNumber = "TRK-" + System.currentTimeMillis() + "-" + String.format("%04d", new java.util.Random().nextInt(10000));
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.status == null) {
            this.status = DeliveryStatus.PROCESSING;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Status history helper
    public void addStatusHistory(DeliveryStatusHistory history) {
        if (this.statusHistory == null) {
            this.statusHistory = new ArrayList<>();
        }
        this.statusHistory.add(history);
        history.setDelivery(this);
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MaterialOrder getMaterialOrder() {
        return materialOrder;
    }

    public void setMaterialOrder(MaterialOrder materialOrder) {
        this.materialOrder = materialOrder;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public DeliveryStatus getStatus() {
        return status;
    }

    public void setStatus(DeliveryStatus status) {
        this.status = status;
    }

    public String getCarrierName() {
        return carrierName;
    }

    public void setCarrierName(String carrierName) {
        this.carrierName = carrierName;
    }

    public String getTrackingUrl() {
        return trackingUrl;
    }

    public void setTrackingUrl(String trackingUrl) {
        this.trackingUrl = trackingUrl;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }

    public String getDriverName() {
        return driverName;
    }

    public void setDriverName(String driverName) {
        this.driverName = driverName;
    }

    public String getDriverPhone() {
        return driverPhone;
    }

    public void setDriverPhone(String driverPhone) {
        this.driverPhone = driverPhone;
    }

    public String getEstimatedDeliveryDate() {
        return estimatedDeliveryDate;
    }

    public void setEstimatedDeliveryDate(String estimatedDeliveryDate) {
        this.estimatedDeliveryDate = estimatedDeliveryDate;
    }

    public LocalDateTime getActualDeliveryDate() {
        return actualDeliveryDate;
    }

    public void setActualDeliveryDate(LocalDateTime actualDeliveryDate) {
        this.actualDeliveryDate = actualDeliveryDate;
    }

    public String getCurrentNotes() {
        return currentNotes;
    }

    public void setCurrentNotes(String currentNotes) {
        this.currentNotes = currentNotes;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
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

    public List<DeliveryStatusHistory> getStatusHistory() {
        return statusHistory != null ? statusHistory : new ArrayList<>();
    }

    public List<DeliveryStatusHistory> getStatusHistories() {
        return getStatusHistory();
    }

    public void setStatusHistory(List<DeliveryStatusHistory> statusHistory) {
        this.statusHistory = statusHistory;
    }
}
