package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * BUILDBID - MY BID PROJECT LOCK ENTITY (Phase 2.1)
 *
 * Dedicated database-level concurrency synchronization lock for the My Bid subsystem.
 * Strictly guarantees that at most ONE transaction can modify a project's My Bid assignment
 * state at any given moment.
 *
 * STRICT ARCHITECTURAL RULE:
 * - Exactly one lock row per project (enforced by UNIQUE constraint on project_id).
 * - Completely isolated from Project.java and Project.status.
 * - Used exclusively for pessimistic row-level locking (SELECT ... FOR UPDATE).
 */
@Entity
@Table(
        name = "my_bid_project_locks",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_mbpl_project", columnNames = {"project_id"})
        },
        indexes = {
                @Index(name = "idx_mbpl_project_id", columnList = "project_id")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MyBidProjectLock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false, unique = true)
    private Long projectId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public MyBidProjectLock() {}

    public MyBidProjectLock(Long projectId) {
        this.projectId = projectId;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
