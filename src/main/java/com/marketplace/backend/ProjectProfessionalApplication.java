package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * BUILDBID — PROJECT PROFESSIONAL APPLICATION ENTITY
 * 
 * Represents an individual trade-wise application/quotation from a Professional
 * against a Post Requirement (Project).
 * 
 * ARCHITECTURAL BOUNDARIES:
 * - Decoupled from ClientServiceRequest (Direct Hire).
 * - Decoupled from MyBid (Contractor Project Bidding).
 * - Decoupled from Quotation (Material Requests).
 * - Supports 1 Requirement -> Multiple Trades -> Multiple Professional Applicants -> Multiple Hired Professionals.
 * - Enforces uniqueness: A professional can submit maximum ONE application per Project.
 */
@Entity
@Table(
        name = "project_professional_applications",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_ppa_project_professional",
                        columnNames = {"project_id", "professional_id"}
                )
        },
        indexes = {
                @Index(name = "idx_ppa_project_status", columnList = "project_id, status"),
                @Index(name = "idx_ppa_professional_status", columnList = "professional_id, status"),
                @Index(name = "idx_ppa_application_id", columnList = "application_id"),
                @Index(name = "idx_ppa_trade_role", columnList = "trade_role")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProjectProfessionalApplication {

    public enum Status {
        APPLIED,
        SHORTLISTED,
        ACCEPTED,
        REJECTED,
        WITHDRAWN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", unique = true, nullable = false, length = 50)
    private String applicationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "professional_id", nullable = false)
    private MarketplaceBackendApplication.MarketplaceUser professional;

    @Column(name = "trade_role", nullable = false, length = 100)
    private String tradeRole;

    @Column(name = "proposed_rate", nullable = false)
    private Double proposedRate;

    @Column(name = "rate_type", nullable = false, length = 50)
    private String rateType = "PER_DAY";

    @Column(name = "team_size")
    private Integer teamSize = 1;

    @Column(name = "estimated_duration", length = 100)
    private String estimatedDuration;

    @Column(name = "cover_message", columnDefinition = "TEXT")
    private String coverMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status = Status.APPLIED;

    @Column(name = "hired_at")
    private LocalDateTime hiredAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ProjectProfessionalApplication() {}

    public ProjectProfessionalApplication(
            Project project,
            MarketplaceBackendApplication.MarketplaceUser professional,
            String tradeRole,
            Double proposedRate,
            String rateType,
            Integer teamSize,
            String estimatedDuration,
            String coverMessage
    ) {
        this.project = project;
        this.professional = professional;
        this.tradeRole = tradeRole;
        this.proposedRate = proposedRate;
        this.rateType = rateType != null ? rateType : "PER_DAY";
        this.teamSize = teamSize != null && teamSize > 0 ? teamSize : 1;
        this.estimatedDuration = estimatedDuration;
        this.coverMessage = coverMessage;
        this.status = Status.APPLIED;
    }

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = Status.APPLIED;
        }
        if (this.rateType == null || this.rateType.isBlank()) {
            this.rateType = "PER_DAY";
        }
        if (this.teamSize == null || this.teamSize < 1) {
            this.teamSize = 1;
        }
        if (this.applicationId == null || this.applicationId.isBlank()) {
            this.applicationId = "APP-" + System.currentTimeMillis() + "-" + (int) (Math.random() * 900 + 100);
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

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public MarketplaceBackendApplication.MarketplaceUser getProfessional() {
        return professional;
    }

    public void setProfessional(MarketplaceBackendApplication.MarketplaceUser professional) {
        this.professional = professional;
    }

    public String getTradeRole() {
        return tradeRole;
    }

    public void setTradeRole(String tradeRole) {
        this.tradeRole = tradeRole;
    }

    public Double getProposedRate() {
        return proposedRate;
    }

    public void setProposedRate(Double proposedRate) {
        this.proposedRate = proposedRate;
    }

    public String getRateType() {
        return rateType;
    }

    public void setRateType(String rateType) {
        this.rateType = rateType;
    }

    public Integer getTeamSize() {
        return teamSize;
    }

    public void setTeamSize(Integer teamSize) {
        this.teamSize = teamSize;
    }

    public String getEstimatedDuration() {
        return estimatedDuration;
    }

    public void setEstimatedDuration(String estimatedDuration) {
        this.estimatedDuration = estimatedDuration;
    }

    public String getCoverMessage() {
        return coverMessage;
    }

    public void setCoverMessage(String coverMessage) {
        this.coverMessage = coverMessage;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
        if (status == Status.ACCEPTED && this.hiredAt == null) {
            this.hiredAt = LocalDateTime.now();
        }
    }

    public LocalDateTime getHiredAt() {
        return hiredAt;
    }

    public void setHiredAt(LocalDateTime hiredAt) {
        this.hiredAt = hiredAt;
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
}
