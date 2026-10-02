package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * BUILDBID - MY BID ASSIGNMENT ENTITY (Phase 1)
 *
 * Represents an isolated assignment of ONE contractor to a customer's project.
 * STRICT ARCHITECTURAL RULE:
 * - A project can have many MyBid records, but ONLY ONE current active assignment at a time.
 * - Old bids are NEVER deleted when assignment state transitions.
 * - Does NOT alter Project.status in the Project entity.
 */
@Entity
@Table(
        name = "my_bid_assignments",
        indexes = {
                @Index(name = "idx_mba_project", columnList = "project_id"),
                @Index(name = "idx_mba_customer", columnList = "customer_id"),
                @Index(name = "idx_mba_contractor", columnList = "contractor_id"),
                @Index(name = "idx_mba_project_current", columnList = "project_id, is_current")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MyBidAssignment {

    /**
     * Isolated assignment lifecycle status.
     */
    public enum Status {
        ACTIVE,
        DECLINED,
        REVOKED,
        COMPLETED
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_bid_id", nullable = false)
    private MyBid acceptedBid;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", nullable = false, length = 50)
    private Status assignmentStatus = Status.ACTIVE;

    @Column(name = "is_current", nullable = false)
    private boolean isCurrent = true;

    @Column(name = "accepted_at", nullable = false)
    private LocalDateTime acceptedAt;

    @Column(name = "declined_at")
    private LocalDateTime declinedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public MyBidAssignment() {}

    @PrePersist
    public void onCreate() {
        if (this.acceptedAt == null) {
            this.acceptedAt = LocalDateTime.now();
        }
        if (this.assignmentStatus == null) {
            this.assignmentStatus = Status.ACTIVE;
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

    public MyBid getAcceptedBid() { return acceptedBid; }
    public void setAcceptedBid(MyBid acceptedBid) { this.acceptedBid = acceptedBid; }

    public Status getAssignmentStatus() { return assignmentStatus; }
    public void setAssignmentStatus(Status assignmentStatus) { this.assignmentStatus = assignmentStatus; }

    public boolean isCurrent() { return isCurrent; }
    public void setCurrent(boolean current) { isCurrent = current; }

    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }

    public LocalDateTime getDeclinedAt() { return declinedAt; }
    public void setDeclinedAt(LocalDateTime declinedAt) { this.declinedAt = declinedAt; }

    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
