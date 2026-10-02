package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * BUILDBID - QUOTATION ENTITY
 * 
 * Persistent quotation model for provider responses to genuine customer requests:
 * 1. MATERIAL_REQUIREMENT (broadcast to multiple material sellers)
 * 2. DIRECT_HIRE (targeted to specific professional)
 * 
 * STRICT BOUNDARIES:
 * - DIRECT_BUY is fixed catalog pricing and strictly excluded.
 * - Construction Projects and Contractor Bids are completely separate.
 * - Collision-Safe: material_request_id and service_request_id are distinct foreign keys.
 *   Exactly one must be populated.
 */
@Entity
@Table(name = "quotations")
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quotation_id", unique = true, nullable = false, length = 50)
    private String quotationId; // e.g. QT-1001

    @Column(name = "request_type", nullable = false, length = 50)
    private String requestType; // MATERIAL_REQUIREMENT or DIRECT_HIRE

    // Collision-Safe Request Linking
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_request_id")
    @JsonIgnore
    private MaterialRequest materialRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_request_id")
    @JsonIgnore
    private ClientServiceRequest serviceRequest;

    // Provider Details
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser provider;

    @Column(name = "provider_role", nullable = false, length = 50)
    private String providerRole; // MATERIAL_SELLER or PROFESSIONAL

    // Commercial Breakdown
    @Column(name = "quoted_amount", nullable = false)
    private Double quotedAmount;

    @Column(name = "material_cost")
    private Double materialCost;

    @Column(name = "labour_cost")
    private Double labourCost;

    @Column(name = "transportation_cost")
    private Double transportationCost;

    @Column(name = "tax_gst")
    private Double taxGst;

    // Terms
    @Column(name = "timeline", length = 100)
    private String timeline; // e.g. "3 Days"

    @Column(name = "validity", length = 100)
    private String validity; // e.g. "7 Days" or "Valid until 2026-10-31"

    @Column(name = "warranty", length = 200)
    private String warranty;

    @Column(name = "payment_terms", length = 200)
    private String paymentTerms;

    // Content
    @Column(name = "included_items", columnDefinition = "TEXT")
    private String includedItems;

    @Column(name = "excluded_items", columnDefinition = "TEXT")
    private String excludedItems;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    // Lifecycle Status (SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, EXPIRED, WITHDRAWN)
    @Column(name = "status", nullable = false, length = 50)
    private String status = "SUBMITTED";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<QuotationItem> items = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null || this.status.isBlank()) {
            this.status = "SUBMITTED";
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Quotation() {}

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQuotationId() {
        return quotationId;
    }

    public void setQuotationId(String quotationId) {
        this.quotationId = quotationId;
    }

    public String getRequestType() {
        return requestType;
    }

    public void setRequestType(String requestType) {
        this.requestType = requestType;
    }

    public MaterialRequest getMaterialRequest() {
        return materialRequest;
    }

    public void setMaterialRequest(MaterialRequest materialRequest) {
        this.materialRequest = materialRequest;
    }

    public ClientServiceRequest getServiceRequest() {
        return serviceRequest;
    }

    public void setServiceRequest(ClientServiceRequest serviceRequest) {
        this.serviceRequest = serviceRequest;
    }

    public MarketplaceBackendApplication.MarketplaceUser getProvider() {
        return provider;
    }

    public void setProvider(MarketplaceBackendApplication.MarketplaceUser provider) {
        this.provider = provider;
    }

    public String getProviderRole() {
        return providerRole;
    }

    public void setProviderRole(String providerRole) {
        this.providerRole = providerRole;
    }

    public Double getQuotedAmount() {
        return quotedAmount;
    }

    public void setQuotedAmount(Double quotedAmount) {
        this.quotedAmount = quotedAmount;
    }

    public Double getMaterialCost() {
        return materialCost;
    }

    public void setMaterialCost(Double materialCost) {
        this.materialCost = materialCost;
    }

    public Double getLabourCost() {
        return labourCost;
    }

    public void setLabourCost(Double labourCost) {
        this.labourCost = labourCost;
    }

    public Double getTransportationCost() {
        return transportationCost;
    }

    public void setTransportationCost(Double transportationCost) {
        this.transportationCost = transportationCost;
    }

    public Double getTaxGst() {
        return taxGst;
    }

    public void setTaxGst(Double taxGst) {
        this.taxGst = taxGst;
    }

    public String getTimeline() {
        return timeline;
    }

    public void setTimeline(String timeline) {
        this.timeline = timeline;
    }

    public String getValidity() {
        return validity;
    }

    public void setValidity(String validity) {
        this.validity = validity;
    }

    public String getWarranty() {
        return warranty;
    }

    public void setWarranty(String warranty) {
        this.warranty = warranty;
    }

    public String getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public String getIncludedItems() {
        return includedItems;
    }

    public void setIncludedItems(String includedItems) {
        this.includedItems = includedItems;
    }

    public String getExcludedItems() {
        return excludedItems;
    }

    public void setExcludedItems(String excludedItems) {
        this.excludedItems = excludedItems;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public List<QuotationItem> getItems() {
        return items != null ? items : new ArrayList<>();
    }

    public void setItems(List<QuotationItem> items) {
        this.items = items;
    }

    public void addItem(QuotationItem item) {
        if (this.items == null) {
            this.items = new ArrayList<>();
        }
        this.items.add(item);
        item.setQuotation(this);
    }
}
