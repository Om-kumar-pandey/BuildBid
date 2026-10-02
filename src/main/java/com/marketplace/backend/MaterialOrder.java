package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * BUILDBID - MATERIAL ORDER ENTITY (Phase 4A)
 * 
 * Formal commercial and fulfillment order entity generated atomically when a CUSTOMER
 * accepts a MATERIAL_REQUIREMENT quotation.
 * 
 * ARCHITECTURAL CONSTRAINTS:
 * - One-to-One with Quotation: exactly ONE MaterialOrder per accepted quotation.
 *   Enforced by unique constraint on quotation_id at DB and entity level.
 * - Snapshot principle: captures agreed monetary values, delivery address, contact info,
 *   and terms at the time of acceptance.
 * - Universal Buyer: supports CUSTOMER, CONTRACTOR, and PROFESSIONAL roles via buyer_id (users.id)
 *   and persisted buyer_role.
 * - Direct Buy remains separate in this phase.
 */
@Entity
@Table(name = "material_orders")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MaterialOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", unique = true, nullable = false, length = 50)
    private String orderCode; // e.g. ORD-2026-00001

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", unique = true, nullable = false)
    @JsonIgnore
    private Quotation quotation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_request_id", nullable = false)
    @JsonIgnore
    private MaterialRequest materialRequest;

    // Universal Buyer Identity
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser buyer;

    @Column(name = "buyer_role", nullable = false, length = 50)
    private String buyerRole; // CUSTOMER, CONTRACTOR, PROFESSIONAL

    // Fulfilling Seller Identity
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser seller;

    // Financial Snapshot
    @Column(name = "material_amount")
    private Double materialAmount;

    @Column(name = "transportation_amount")
    private Double transportationAmount;

    @Column(name = "tax_gst")
    private Double taxGst;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "INR";

    // Delivery Snapshot
    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "contact_number", length = 30)
    private String contactNumber;

    // Commercial Terms Snapshot
    @Column(name = "payment_terms", length = 200)
    private String paymentTerms;

    // Status Transitions
    @Column(name = "order_status", nullable = false, length = 50)
    private String orderStatus = "CONFIRMED";

    @Column(name = "payment_status", nullable = false, length = 50)
    private String paymentStatus = "PENDING";

    @Column(name = "delivery_status", nullable = false, length = 50)
    private String deliveryStatus = "PENDING";

    // Audit Timestamps
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @OneToMany(mappedBy = "materialOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<MaterialOrderItem> items = new ArrayList<>();

    public MaterialOrder() {}

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.confirmedAt == null) {
            this.confirmedAt = now;
        }
        if (this.orderStatus == null || this.orderStatus.isBlank()) {
            this.orderStatus = "CONFIRMED";
        }
        if (this.paymentStatus == null || this.paymentStatus.isBlank()) {
            this.paymentStatus = "PENDING";
        }
        if (this.deliveryStatus == null || this.deliveryStatus.isBlank()) {
            this.deliveryStatus = "PENDING";
        }
        if (this.currency == null || this.currency.isBlank()) {
            this.currency = "INR";
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }

    public Quotation getQuotation() {
        return quotation;
    }

    public void setQuotation(Quotation quotation) {
        this.quotation = quotation;
    }

    public MaterialRequest getMaterialRequest() {
        return materialRequest;
    }

    public void setMaterialRequest(MaterialRequest materialRequest) {
        this.materialRequest = materialRequest;
    }

    public MarketplaceBackendApplication.MarketplaceUser getBuyer() {
        return buyer;
    }

    public void setBuyer(MarketplaceBackendApplication.MarketplaceUser buyer) {
        this.buyer = buyer;
    }

    public String getBuyerRole() {
        return buyerRole;
    }

    public void setBuyerRole(String buyerRole) {
        this.buyerRole = buyerRole;
    }

    public MarketplaceBackendApplication.MarketplaceUser getSeller() {
        return seller;
    }

    public void setSeller(MarketplaceBackendApplication.MarketplaceUser seller) {
        this.seller = seller;
    }

    public Double getMaterialAmount() {
        return materialAmount;
    }

    public void setMaterialAmount(Double materialAmount) {
        this.materialAmount = materialAmount;
    }

    public Double getTransportationAmount() {
        return transportationAmount;
    }

    public void setTransportationAmount(Double transportationAmount) {
        this.transportationAmount = transportationAmount;
    }

    public Double getTaxGst() {
        return taxGst;
    }

    public void setTaxGst(Double taxGst) {
        this.taxGst = taxGst;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }

    public String getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public String getOrderStatus() {
        return orderStatus;
    }

    public void setOrderStatus(String orderStatus) {
        this.orderStatus = orderStatus;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public void setDeliveryStatus(String deliveryStatus) {
        this.deliveryStatus = deliveryStatus;
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

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(LocalDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(LocalDateTime processedAt) {
        this.processedAt = processedAt;
    }

    public LocalDateTime getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(LocalDateTime dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public List<MaterialOrderItem> getItems() {
        return items != null ? items : new ArrayList<>();
    }

    public void setItems(List<MaterialOrderItem> items) {
        this.items = items;
    }

    public void addItem(MaterialOrderItem item) {
        if (this.items == null) {
            this.items = new ArrayList<>();
        }
        this.items.add(item);
        item.setMaterialOrder(this);
    }
}
