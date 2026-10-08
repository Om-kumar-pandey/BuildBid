package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * BUILDBID - MY BID AUDIT HISTORY ENTITY (Phase 1)
 *
 * Append-only immutable audit trail for the My Bid lifecycle.
 * STRICT ARCHITECTURAL RULE:
 * - History records are NEVER deleted or overwritten.
 * - Captures lifecycle events across projects, bids, and assignments.
 */
@Entity
@Table(
        name = "my_bid_audit_history",
        indexes = {
                @Index(name = "idx_mbah_project", columnList = "project_id"),
                @Index(name = "idx_mbah_bid", columnList = "bid_id"),
                @Index(name = "idx_mbah_actor", columnList = "actor_id"),
                @Index(name = "idx_mbah_event_type", columnList = "event_type"),
                @Index(name = "idx_mbah_created_at", columnList = "created_at")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MyBidAuditHistory {

    /**
     * Isolated lifecycle event types.
     */
    public enum EventType {
        BID_SUBMITTED,
        BID_ACCEPTED,
        ASSIGNMENT_CREATED,
        BID_NOT_SELECTED,
        ASSIGNMENT_DECLINED,
        ACCEPTANCE_WITHDRAWN,
        PROJECT_REOPENED,
        CONTRACTOR_REASSIGNED,
        BID_UPDATED,
        BID_WITHDRAWN,
        BID_REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bid_id")
    private MyBid bid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private MarketplaceBackendApplication.MarketplaceUser actor;

    @Column(name = "actor_role", length = 50)
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Column(name = "event_description", columnDefinition = "TEXT")
    private String eventDescription;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public MyBidAuditHistory() {}

    public MyBidAuditHistory(Project project, MyBid bid, MarketplaceBackendApplication.MarketplaceUser actor,
                             String actorRole, EventType eventType, String eventDescription) {
        this.project = project;
        this.bid = bid;
        this.actor = actor;
        this.actorRole = actorRole;
        this.eventType = eventType;
        this.eventDescription = eventDescription;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    public MyBid getBid() { return bid; }
    public void setBid(MyBid bid) { this.bid = bid; }

    public MarketplaceBackendApplication.MarketplaceUser getActor() { return actor; }
    public void setActor(MarketplaceBackendApplication.MarketplaceUser actor) { this.actor = actor; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }

    public String getEventDescription() { return eventDescription; }
    public void setEventDescription(String eventDescription) { this.eventDescription = eventDescription; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
