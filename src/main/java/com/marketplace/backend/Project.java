package com.marketplace.backend;

import jakarta.persistence.*;
import java.util.Date;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String projectTitle;

    @Column(nullable = false)
    private String projectType;

    private Double totalArea;
    private String qualityTier;
    private String status = "OPEN FOR BIDS";

    @Column(columnDefinition = "TEXT")
    private String location; 

    @Column(columnDefinition = "TEXT")
    private String budget; 

    @Column(columnDefinition = "TEXT")
    private String timeline; 

    @Column(columnDefinition = "TEXT")
    private String floors; 

    @Column(columnDefinition = "TEXT")
    private String scopeOfWork; 

    @Column(columnDefinition = "TEXT")
    private String renovationAreas; 

    @Column(columnDefinition = "TEXT")
    private String renovScope; 

    @Column(columnDefinition = "TEXT")
    private String extensionDetails; 

    @Column(columnDefinition = "TEXT")
    private String interiorRooms; 

    @Column(columnDefinition = "TEXT")
    private String interiorScope; 

    @Column(columnDefinition = "TEXT")
    private String interiorPreferences; 

    @Column(columnDefinition = "TEXT")
    private String commercial; 

    @Column(columnDefinition = "TEXT")
    private String industrial; 

    @Column(columnDefinition = "TEXT")
    private String customDetails; 

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    // Foolproof Getters and Setters (No Lombok needed)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProjectTitle() { return projectTitle; }
    public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }

    public String getProjectType() { return projectType; }
    public void setProjectType(String projectType) { this.projectType = projectType; }

    public Double getTotalArea() { return totalArea; }
    public void setTotalArea(Double totalArea) { this.totalArea = totalArea; }

    public String getQualityTier() { return qualityTier; }
    public void setQualityTier(String qualityTier) { this.qualityTier = qualityTier; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getBudget() { return budget; }
    public void setBudget(String budget) { this.budget = budget; }

    public String getTimeline() { return timeline; }
    public void setTimeline(String timeline) { this.timeline = timeline; }

    public String getFloors() { return floors; }
    public void setFloors(String floors) { this.floors = floors; }

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

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}