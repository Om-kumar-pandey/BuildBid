package com.marketplace.backend;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Summary DTO of an OPEN Post Requirement for discovery by authenticated professionals.
 */
public class ProfessionalRequirementDto {

    private String projectId;
    private String projectTitle;
    private String projectType;
    private String location;
    private String startDate;
    private String description;
    private String status;
    private List<TradeRequirementSummaryDto> tradeRequirements = new ArrayList<>();
    private boolean hasApplied;
    private String appliedTradeRole;
    private String applicationStatus;
    private String applicationId;
    private LocalDateTime createdAt;

    public ProfessionalRequirementDto() {}

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

    public String getAppliedTradeRole() {
        return appliedTradeRole;
    }

    public void setAppliedTradeRole(String appliedTradeRole) {
        this.appliedTradeRole = appliedTradeRole;
    }

    public String getApplicationStatus() {
        return applicationStatus;
    }

    public void setApplicationStatus(String applicationStatus) {
        this.applicationStatus = applicationStatus;
    }

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
