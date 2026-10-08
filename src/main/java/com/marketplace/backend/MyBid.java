package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * BUILDBID - MY BID ENTITY (Phase 1)
 *
 * Represents an isolated contractor bid on a customer's posted project.
 * STRICT ARCHITECTURAL ISOLATION:
 * - Completely decoupled from Quotation / QuotationItem / MaterialOrder / DirectBuy.
 * - Does NOT mutate Project entity or Project.status.
 * - History preserved: bids are never deleted on assignment changes.
 */
@Entity
@Table(
        name = "my_bids",
        indexes = {
                @Index(name = "idx_my_bids_project", columnList = "project_id"),
                @Index(name = "idx_my_bids_customer", columnList = "customer_id"),
                @Index(name = "idx_my_bids_contractor", columnList = "contractor_id"),
                @Index(name = "idx_my_bids_status", columnList = "status"),
                @Index(name = "idx_my_bids_rejected_at", columnList = "rejected_at")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MyBid {

    /**
     * Dedicated isolated My Bid status lifecycle.
     */
    public enum Status {
        PENDING,
        ACCEPTED,
        REJECTED,
        NOT_SELECTED,
        ASSIGNMENT_DECLINED,
        WITHDRAWN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private MarketplaceBackendApplication.MarketplaceUser customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contractor_id", nullable = false)
    private MarketplaceBackendApplication.MarketplaceUser contractor;

    @Column(name = "bid_amount", nullable = false)
    private Double bidAmount;

    @Column(name = "material_cost")
    private Double materialCost;

    @Column(name = "labour_cost")
    private Double labourCost;

    @Column(name = "equipment_cost")
    private Double equipmentCost;

    @Column(name = "transport_cost")
    private Double transportCost;

    @Column(name = "other_charges")
    private Double otherCharges;

    @Column(name = "estimated_duration", length = 100)
    private String estimatedDuration;

    @Column(name = "proposed_timeline", length = 200)
    private String proposedTimeline;

    @Column(name = "workers_count")
    private Integer workersCount;

    @Column(name = "scope_of_work", columnDefinition = "TEXT")
    private String scopeOfWork;

    @Column(name = "included_work", columnDefinition = "TEXT")
    private String includedWork;

    @Column(name = "excluded_work", columnDefinition = "TEXT")
    private String excludedWork;

    @Column(name = "payment_terms", columnDefinition = "TEXT")
    private String paymentTerms;

    @Column(name = "warranty", columnDefinition = "TEXT")
    private String warranty;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "description_en", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(name = "description_hi", columnDefinition = "TEXT")
    private String descriptionHi;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private Status status = Status.PENDING;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    public MyBid() {}

    @PrePersist
    public void onCreate() {
        if (this.submittedAt == null) {
            this.submittedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = Status.PENDING;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    public MarketplaceBackendApplication.MarketplaceUser getCustomer() { return customer; }
    public void setCustomer(MarketplaceBackendApplication.MarketplaceUser customer) { this.customer = customer; }

    public MarketplaceBackendApplication.MarketplaceUser getContractor() { return contractor; }
    public void setContractor(MarketplaceBackendApplication.MarketplaceUser contractor) { this.contractor = contractor; }

    public Double getBidAmount() { return bidAmount; }
    public void setBidAmount(Double bidAmount) { this.bidAmount = bidAmount; }

    public Double getMaterialCost() { return materialCost; }
    public void setMaterialCost(Double materialCost) { this.materialCost = materialCost; }

    public Double getLabourCost() { return labourCost; }
    public void setLabourCost(Double labourCost) { this.labourCost = labourCost; }

    public Double getEquipmentCost() { return equipmentCost; }
    public void setEquipmentCost(Double equipmentCost) { this.equipmentCost = equipmentCost; }

    public Double getTransportCost() { return transportCost; }
    public void setTransportCost(Double transportCost) { this.transportCost = transportCost; }

    public Double getOtherCharges() { return otherCharges; }
    public void setOtherCharges(Double otherCharges) { this.otherCharges = otherCharges; }

    public String getEstimatedDuration() { return estimatedDuration; }
    public void setEstimatedDuration(String estimatedDuration) { this.estimatedDuration = estimatedDuration; }

    public String getProposedTimeline() { return proposedTimeline; }
    public void setProposedTimeline(String proposedTimeline) { this.proposedTimeline = proposedTimeline; }

    public Integer getWorkersCount() { return workersCount; }
    public void setWorkersCount(Integer workersCount) { this.workersCount = workersCount; }

    public String getScopeOfWork() { return scopeOfWork; }
    public void setScopeOfWork(String scopeOfWork) { this.scopeOfWork = scopeOfWork; }

    public String getIncludedWork() { return includedWork; }
    public void setIncludedWork(String includedWork) { this.includedWork = includedWork; }

    public String getExcludedWork() { return excludedWork; }
    public void setExcludedWork(String excludedWork) { this.excludedWork = excludedWork; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getWarranty() { return warranty; }
    public void setWarranty(String warranty) { this.warranty = warranty; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getDescriptionEn() { return descriptionEn; }
    public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }

    public String getDescriptionHi() { return descriptionHi; }
    public void setDescriptionHi(String descriptionHi) { this.descriptionHi = descriptionHi; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(LocalDateTime rejectedAt) { this.rejectedAt = rejectedAt; }
}
