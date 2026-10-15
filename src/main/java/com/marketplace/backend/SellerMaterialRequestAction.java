package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * BUILDBID - SELLER MATERIAL REQUEST ACTION ENTITY
 *
 * Persists isolated, seller-specific action states (ACCEPTED, DECLINED)
 * and 24-hour decline expiry timestamps for material requests.
 *
 * Guarantees:
 * 1. Independent seller isolation: one seller's decline or acceptance does not mutate
 *    another seller's view or the buyer's material request record.
 * 2. 24-hour decline countdown persistence based on server-side timestamps.
 * 3. Idempotent acceptance and connection to material orders.
 */
@Entity
@Table(
        name = "seller_material_request_actions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_smra_seller_request", columnNames = {"seller_id", "material_request_id"})
        },
        indexes = {
                @Index(name = "idx_smra_seller", columnList = "seller_id"),
                @Index(name = "idx_smra_request", columnList = "material_request_id"),
                @Index(name = "idx_smra_status_expiry", columnList = "seller_id, status, expiry_at")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SellerMaterialRequestAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private MarketplaceBackendApplication.MarketplaceUser seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_request_id", nullable = false)
    private MaterialRequest materialRequest;

    @Column(name = "status", nullable = false, length = 50)
    private String status; // ACCEPTED or DECLINED

    @Column(name = "action_at", nullable = false)
    private LocalDateTime actionAt;

    @Column(name = "declined_at")
    private LocalDateTime declinedAt;

    @Column(name = "expiry_at")
    private LocalDateTime expiryAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_order_id")
    private MaterialOrder materialOrder;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public SellerMaterialRequestAction() {}

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.actionAt == null) {
            this.actionAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MarketplaceBackendApplication.MarketplaceUser getSeller() { return seller; }
    public void setSeller(MarketplaceBackendApplication.MarketplaceUser seller) { this.seller = seller; }

    public MaterialRequest getMaterialRequest() { return materialRequest; }
    public void setMaterialRequest(MaterialRequest materialRequest) { this.materialRequest = materialRequest; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getActionAt() { return actionAt; }
    public void setActionAt(LocalDateTime actionAt) { this.actionAt = actionAt; }

    public LocalDateTime getDeclinedAt() { return declinedAt; }
    public void setDeclinedAt(LocalDateTime declinedAt) { this.declinedAt = declinedAt; }

    public LocalDateTime getExpiryAt() { return expiryAt; }
    public void setExpiryAt(LocalDateTime expiryAt) { this.expiryAt = expiryAt; }

    public MaterialOrder getMaterialOrder() { return materialOrder; }
    public void setMaterialOrder(MaterialOrder materialOrder) { this.materialOrder = materialOrder; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
