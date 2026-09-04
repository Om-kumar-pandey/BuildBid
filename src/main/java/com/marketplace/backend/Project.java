package com.marketplace.backend;

import jakarta.persistence.*;
import java.util.Date;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "built_up_area")
    private Double builtUpArea;

    @Column(name = "city")
    private String city;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at")
    private Date createdAt = new Date();

    @Column(name = "estimated_cost")
    private String estimatedCost;

    @Column(name = "floors", columnDefinition = "TEXT")
    private String floors;

    @Column(name = "pincode")
    private String pincode;

    @Column(name = "plot_area")
    private Double plotArea;

    @Column(name = "quality_tier")
    private String qualityTier;

    @Column(name = "state")
    private String state;

    @Column(name = "status")
    private String status = "OPEN FOR BIDS";

    @Column(name = "title")
    private String title;

    @Column(name = "type")
    private String type;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "budget", columnDefinition = "TEXT")
    private String budget;

    @Column(name = "commercial", columnDefinition = "TEXT")
    private String commercial;

    @Column(name = "custom_details", columnDefinition = "TEXT")
    private String customDetails;

    @Column(name = "extension_details", columnDefinition = "TEXT")
    private String extensionDetails;

    @Column(name = "industrial", columnDefinition = "TEXT")
    private String industrial;

    @Column(name = "interior_preferences", columnDefinition = "TEXT")
    private String interiorPreferences;

    @Column(name = "interior_rooms", columnDefinition = "TEXT")
    private String interiorRooms;

    @Column(name = "interior_scope", columnDefinition = "TEXT")
    private String interiorScope;

    @Column(name = "location", columnDefinition = "TEXT")
    private String location;

    @Column(name = "project_title")
    private String projectTitle;

    @Column(name = "project_type")
    private String projectType;

    @Column(name = "renov_scope", columnDefinition = "TEXT")
    private String renovScope;

    @Column(name = "renovation_areas", columnDefinition = "TEXT")
    private String renovationAreas;

    @Column(name = "scope_of_work", columnDefinition = "TEXT")
    private String scopeOfWork;

    @Column(name = "timeline", columnDefinition = "TEXT")
    private String timeline;

    @Column(name = "total_area")
    private Double totalArea;

    // ==========================================
    // GETTERS AND SETTERS FOR ALL COLUMNS
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getBuiltUpArea() { return builtUpArea; }
    public void setBuiltUpArea(Double builtUpArea) { this.builtUpArea = builtUpArea; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

    public String getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(String estimatedCost) { this.estimatedCost = estimatedCost; }

    public String getFloors() { return floors; }
    public void setFloors(String floors) { this.floors = floors; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public Double getPlotArea() { return plotArea; }
    public void setPlotArea(Double plotArea) { this.plotArea = plotArea; }

    public String getQualityTier() { return qualityTier; }
    public void setQualityTier(String qualityTier) { this.qualityTier = qualityTier; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getBudget() { return budget; }
    public void setBudget(String budget) { this.budget = budget; }

    public String getCommercial() { return commercial; }
    public void setCommercial(String commercial) { this.commercial = commercial; }

    public String getCustomDetails() { return customDetails; }
    public void setCustomDetails(String customDetails) { this.customDetails = customDetails; }

    public String getExtensionDetails() { return extensionDetails; }
    public void setExtensionDetails(String extensionDetails) { this.extensionDetails = extensionDetails; }

    public String getIndustrial() { return industrial; }
    public void setIndustrial(String industrial) { this.industrial = industrial; }

    public String getInteriorPreferences() { return interiorPreferences; }
    public void setInteriorPreferences(String interiorPreferences) { this.interiorPreferences = interiorPreferences; }

    public String getInteriorRooms() { return interiorRooms; }
    public void setInteriorRooms(String interiorRooms) { this.interiorRooms = interiorRooms; }

    public String getInteriorScope() { return interiorScope; }
    public void setInteriorScope(String interiorScope) { this.interiorScope = interiorScope; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getProjectTitle() { return projectTitle; }
    public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }

    public String getProjectType() { return projectType; }
    public void setProjectType(String projectType) { this.projectType = projectType; }

    public String getRenovScope() { return renovScope; }
    public void setRenovScope(String renovScope) { this.renovScope = renovScope; }

    public String getRenovationAreas() { return renovationAreas; }
    public void setRenovationAreas(String renovationAreas) { this.renovationAreas = renovationAreas; }

    public String getScopeOfWork() { return scopeOfWork; }
    public void setScopeOfWork(String scopeOfWork) { this.scopeOfWork = scopeOfWork; }

    public String getTimeline() { return timeline; }
    public void setTimeline(String timeline) { this.timeline = timeline; }

    public Double getTotalArea() { return totalArea; }
    public void setTotalArea(Double totalArea) { this.totalArea = totalArea; }
}
