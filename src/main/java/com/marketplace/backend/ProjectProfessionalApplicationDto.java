package com.marketplace.backend;

import java.time.LocalDateTime;

/**
 * DTO representing a Project Professional Application for both professionals and requesters.
 */
public class ProjectProfessionalApplicationDto {

    private String applicationId;
    private String projectId;
    private String projectTitle;
    private Long professionalId;
    private String professionalName;
    private String professionalLocation;
    private String profilePhotoUrl;
    private String tradeRole;
    private Double proposedRate;
    private String rateType;
    private Integer teamSize;
    private String estimatedDuration;
    private String coverMessage;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime hiredAt;

    public ProjectProfessionalApplicationDto() {}

    public static ProjectProfessionalApplicationDto fromEntity(ProjectProfessionalApplication app) {
        if (app == null) return null;
        ProjectProfessionalApplicationDto dto = new ProjectProfessionalApplicationDto();
        dto.setApplicationId(app.getApplicationId());
        if (app.getProject() != null) {
            dto.setProjectId(app.getProject().getProjectId() != null ? app.getProject().getProjectId() : ("PRJ-" + app.getProject().getId()));
            dto.setProjectTitle(app.getProject().getProjectTitle() != null ? app.getProject().getProjectTitle() : app.getProject().getTitle());
        }
        if (app.getProfessional() != null) {
            dto.setProfessionalId(app.getProfessional().getId());
            dto.setProfessionalName(app.getProfessional().getName() != null ? app.getProfessional().getName() : app.getProfessional().getUsername());
            dto.setProfessionalLocation(app.getProfessional().getLocation());
            dto.setProfilePhotoUrl(app.getProfessional().getProfilePhotoUrl());
        }
        dto.setTradeRole(app.getTradeRole());
        dto.setProposedRate(app.getProposedRate());
        dto.setRateType(app.getRateType());
        dto.setTeamSize(app.getTeamSize());
        dto.setEstimatedDuration(app.getEstimatedDuration());
        dto.setCoverMessage(app.getCoverMessage());
        dto.setStatus(app.getStatus() != null ? app.getStatus().name() : null);
        dto.setCreatedAt(app.getCreatedAt());
        dto.setHiredAt(app.getHiredAt());
        return dto;
    }

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

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

    public Long getProfessionalId() {
        return professionalId;
    }

    public void setProfessionalId(Long professionalId) {
        this.professionalId = professionalId;
    }

    public String getProfessionalName() {
        return professionalName;
    }

    public void setProfessionalName(String professionalName) {
        this.professionalName = professionalName;
    }

    public String getProfessionalLocation() {
        return professionalLocation;
    }

    public void setProfessionalLocation(String professionalLocation) {
        this.professionalLocation = professionalLocation;
    }

    public String getProfilePhotoUrl() {
        return profilePhotoUrl;
    }

    public void setProfilePhotoUrl(String profilePhotoUrl) {
        this.profilePhotoUrl = profilePhotoUrl;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getHiredAt() {
        return hiredAt;
    }

    public void setHiredAt(LocalDateTime hiredAt) {
        this.hiredAt = hiredAt;
    }
}
