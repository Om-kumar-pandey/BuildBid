package com.marketplace.backend;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Detailed DTO for one Post Requirement viewed by an authenticated professional.
 */
public class ProfessionalRequirementDetailDto {

    private String projectId;
    private String projectTitle;
    private String projectType;
    private String location;
    private String startDate;
    private String description;
    private String status;
    private List<TradeRequirementSummaryDto> tradeRequirements = new ArrayList<>();
    private boolean hasApplied;
    private ProjectProfessionalApplicationDto myApplication;
    private LocalDateTime createdAt;

    public ProfessionalRequirementDetailDto() {}

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getProjectTitle() {
        return projectTitle;
    }

    public void setProjectTitle(String projectTitle) {
        this.projectTitle = projectTitle;
    }

    public String getProjectType() {
        return projectType;
    }

    public void setProjectType(String projectType) {
        this.projectType = projectType;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<TradeRequirementSummaryDto> getTradeRequirements() {
        return tradeRequirements;
    }

    public void setTradeRequirements(List<TradeRequirementSummaryDto> tradeRequirements) {
        this.tradeRequirements = tradeRequirements;
    }

    public boolean isHasApplied() {
        return hasApplied;
    }

    public void setHasApplied(boolean hasApplied) {
        this.hasApplied = hasApplied;
    }

    public ProjectProfessionalApplicationDto getMyApplication() {
        return myApplication;
    }

    public void setMyApplication(ProjectProfessionalApplicationDto myApplication) {
        this.myApplication = myApplication;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
