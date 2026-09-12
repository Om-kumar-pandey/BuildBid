package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private String projectId; // Unique Project ID (e.g. PRJ-...)

    @Column(name = "project_title", nullable = false)
    private String projectTitle;

    @Column(name = "project_type", nullable = false)
    private String projectType;

    @Column(name = "title")
    private String title;

    @Column(name = "type")
    private String type;

    @Column(name = "city")
    private String city;

    @Column(name = "state")
    private String state;

    @Column(name = "pincode")
    private String pincode;

    @Column(name = "address")
    private String address;

    @Column(name = "location", columnDefinition = "TEXT")
    private String location;

    @Column(name = "plot_area")
    private Double plotArea;

    @Column(name = "built_up_area")
    private Double builtUpArea;

    @Column(name = "total_area")
    private Double totalArea;

    @Column(name = "floors", columnDefinition = "TEXT")
    private String floors;

    @Column(name = "quality_tier")
    private String qualityTier;

    @Column(name = "estimated_cost")
    private String estimatedCost;
    
    @Column(name = "budget", columnDefinition = "TEXT")
    private String budget;

    @Column(name = "budget_min")
    private Double budgetMin;

    @Column(name = "budget_max")
    private Double budgetMax;

    @Column(name = "timeline", columnDefinition = "TEXT")
    private String timeline;

    @Column(name = "target_start_date")
    private String targetStartDate;

    @Column(name = "payment_preference")
    private String paymentPreference;

    @Column(name = "privacy_preference")
    private String privacyPreference;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "scope_of_work", columnDefinition = "TEXT")
    private String scopeOfWork;

    @Column(name = "renovation_areas", columnDefinition = "TEXT")
    private String renovationAreas;

    @Column(name = "renov_scope", columnDefinition = "TEXT")
    private String renovScope;

    @Column(name = "extension_details", columnDefinition = "TEXT")
    private String extensionDetails;

    @Column(name = "interior_rooms", columnDefinition = "TEXT")
    private String interiorRooms;

    @Column(name = "interior_scope", columnDefinition = "TEXT")
    private String interiorScope;

    @Column(name = "interior_preferences", columnDefinition = "TEXT")
    private String interiorPreferences;

    @Column(name = "commercial", columnDefinition = "TEXT")
    private String commercial;

    @Column(name = "industrial", columnDefinition = "TEXT")
    private String industrial;

    @Column(name = "custom_details", columnDefinition = "TEXT")
    private String customDetails;

    @ElementCollection
    @CollectionTable(name = "project_requirements", joinColumns = @JoinColumn(name = "project_id"))
    @MapKeyColumn(name = "requirement_name")
    @Column(name = "is_required")
    private Map<String, Boolean> requirements;

    @Column(name = "status")
    private String status = "OPEN";

    // पूरा डायनेमिक JSON डेटा सेव करने के लिए
    @Column(name = "complete_data_json", columnDefinition = "TEXT")
    private String completeDataJson;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private MarketplaceBackendApplication.MarketplaceUser customer;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Project() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getProjectTitle() { return projectTitle; }
    public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }

    public String getProjectType() { return projectType; }
    public void setProjectType(String projectType) { this.projectType = projectType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getPlotArea() { return plotArea; }
    public void setPlotArea(Double plotArea) { this.plotArea = plotArea; }

    public Double getBuiltUpArea() { return builtUpArea; }
    public void setBuiltUpArea(Double builtUpArea) { this.builtUpArea = builtUpArea; }

    public Double getTotalArea() { return totalArea; }
    public void setTotalArea(Double totalArea) { this.totalArea = totalArea; }

    public String getFloors() { return floors; }
    public void setFloors(String floors) { this.floors = floors; }

    public String getQualityTier() { return qualityTier; }
    public void setQualityTier(String qualityTier) { this.qualityTier = qualityTier; }

    public String getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(String estimatedCost) { this.estimatedCost = estimatedCost; }

    public String getBudget() { return budget; }
    public void setBudget(String budget) { this.budget = budget; }

    public Double getBudgetMin() { return budgetMin; }
    public void setBudgetMin(Double budgetMin) { this.budgetMin = budgetMin; }

    public Double getBudgetMax() { return budgetMax; }
    public void setBudgetMax(Double budgetMax) { this.budgetMax = budgetMax; }

    public String getTimeline() { return timeline; }
    public void setTimeline(String timeline) { this.timeline = timeline; }

    public String getTargetStartDate() { return targetStartDate; }
    public void setTargetStartDate(String targetStartDate) { this.targetStartDate = targetStartDate; }

    public String getPaymentPreference() { return paymentPreference; }
    public void setPaymentPreference(String paymentPreference) { this.paymentPreference = paymentPreference; }

    public String getPrivacyPreference() { return privacyPreference; }
    public void setPrivacyPreference(String privacyPreference) { this.privacyPreference = privacyPreference; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getScopeOfWork() { return scopeOfWork; }
    public void setScopeOfWork(String scopeOfWork) { this.scopeOfWork = scopeOfWork; }

    public String getRenovationAreas() { return renovationAreas; }
    public void setRenovationAreas(String renovationAreas) { this.renovationAreas = renovationAreas; }

    public String getRenovScope() { return renovScope; }
    public void setRenovScope(String renovScope) { this.renovScope = renovScope; }

    public String getExtensionDetails() { return extensionDetails; }
    public void setExtensionDetails(String extensionDetails) { this.extensionDetails = extensionDetails; }

    public String getInteriorRooms() { return interiorRooms; }
    public void setInteriorRooms(String interiorRooms) { this.interiorRooms = interiorRooms; }

    public String getInteriorScope() { return interiorScope; }
    public void setInteriorScope(String interiorScope) { this.interiorScope = interiorScope; }

    public String getInteriorPreferences() { return interiorPreferences; }
    public void setInteriorPreferences(String interiorPreferences) { this.interiorPreferences = interiorPreferences; }

    public String getCommercial() { return commercial; }
    public void setCommercial(String commercial) { this.commercial = commercial; }

    public String getIndustrial() { return industrial; }
    public void setIndustrial(String industrial) { this.industrial = industrial; }

    public String getCustomDetails() { return customDetails; }
    public void setCustomDetails(String customDetails) { this.customDetails = customDetails; }

    public Map<String, Boolean> getRequirements() { return requirements; }
    public void setRequirements(Map<String, Boolean> requirements) { this.requirements = requirements; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getCompleteDataJson() { return completeDataJson; }
    public void setCompleteDataJson(String completeDataJson) { this.completeDataJson = completeDataJson; }

    public MarketplaceBackendApplication.MarketplaceUser getCustomer() { return customer; }
    public void setCustomer(MarketplaceBackendApplication.MarketplaceUser customer) { this.customer = customer; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
