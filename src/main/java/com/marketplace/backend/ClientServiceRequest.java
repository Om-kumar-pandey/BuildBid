package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "client_service_requests")
public class ClientServiceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", unique = true, length = 50)
    private String requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "professional_id", nullable = false)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser professional;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser client;

    @Column(name = "client_name", nullable = false, length = 100)
    private String clientName;

    @Column(name = "client_email", length = 150)
    @JsonIgnore
    private String clientEmail;

    @Column(name = "client_phone", length = 20)
    @JsonIgnore
    private String clientPhone;

    @Column(name = "requester_type", length = 50)
    private String requesterType = "CUSTOMER";

    @Column(name = "project_name", nullable = false, length = 200)
    private String projectName;

    @Column(name = "requested_service", nullable = false, length = 150)
    private String requestedService;

    @Column(name = "professional_service_id")
    private Long professionalServiceId;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "distance", length = 50)
    private String distance;

    @Column(name = "target_date", length = 100)
    private String targetDate;

    @Column(name = "client_budget")
    private Double clientBudget; // Nullable - if null, displayed as "--"

    @Column(name = "status", nullable = false, length = 50)
    private String status = "New";

    @Column(name = "project_scope", columnDefinition = "TEXT")
    private String projectScope;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ClientServiceRequest() {}

    public ClientServiceRequest(
            MarketplaceBackendApplication.MarketplaceUser professional,
            MarketplaceBackendApplication.MarketplaceUser client,
            String clientName,
            String requesterType,
            String projectName,
            String requestedService,
            String location,
            String distance,
            String targetDate,
            Double clientBudget,
            String status,
            String projectScope
    ) {
        this.professional = professional;
        this.client = client;
        this.clientName = clientName;
        this.requesterType = requesterType != null ? requesterType : "CUSTOMER";
        this.projectName = projectName;
        this.requestedService = requestedService;
        this.location = location;
        this.distance = distance;
        this.targetDate = targetDate;
        this.clientBudget = clientBudget;
        this.status = status != null ? status : "New";
        this.projectScope = projectScope;
    }

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.requestId == null || this.requestId.trim().isEmpty()) {
            this.requestId = "REQ-" + (1000 + (System.currentTimeMillis() % 9000));
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public MarketplaceBackendApplication.MarketplaceUser getProfessional() { return professional; }
    public void setProfessional(MarketplaceBackendApplication.MarketplaceUser professional) { this.professional = professional; }

    public MarketplaceBackendApplication.MarketplaceUser getClient() { return client; }
    public void setClient(MarketplaceBackendApplication.MarketplaceUser client) { this.client = client; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public String getClientEmail() { return clientEmail; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }

    public String getClientPhone() { return clientPhone; }
    public void setClientPhone(String clientPhone) { this.clientPhone = clientPhone; }

    public String getRequesterType() { return requesterType; }
    public void setRequesterType(String requesterType) { this.requesterType = requesterType; }

    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }

    public String getRequestedService() { return requestedService; }
    public void setRequestedService(String requestedService) { this.requestedService = requestedService; }

    public Long getProfessionalServiceId() { return professionalServiceId; }
    public void setProfessionalServiceId(Long professionalServiceId) { this.professionalServiceId = professionalServiceId; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getDistance() { return distance; }
    public void setDistance(String distance) { this.distance = distance; }

    public String getTargetDate() { return targetDate; }
    public void setTargetDate(String targetDate) { this.targetDate = targetDate; }

    public Double getClientBudget() { return clientBudget; }
    public void setClientBudget(Double clientBudget) { this.clientBudget = clientBudget; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProjectScope() { return projectScope; }
    public void setProjectScope(String projectScope) { this.projectScope = projectScope; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
