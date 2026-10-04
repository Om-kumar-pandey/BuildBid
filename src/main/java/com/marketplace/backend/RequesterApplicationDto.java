package com.marketplace.backend;

/**
 * Dedicated DTO for requester reviews of candidate applications.
 */
public class RequesterApplicationDto extends ProjectProfessionalApplicationDto {

    public RequesterApplicationDto() {
        super();
    }

    public static RequesterApplicationDto fromEntity(ProjectProfessionalApplication app) {
        if (app == null) return null;
        RequesterApplicationDto dto = new RequesterApplicationDto();
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
}
