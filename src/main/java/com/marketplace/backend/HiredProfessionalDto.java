package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;

/**
 * BUILDBID — HIRED PROFESSIONAL DTO
 * 
 * Dedicated response DTO exposing accepted professional hiring relationships.
 * Strictly avoids exposing passwords, tokens, or unrelated entity fields.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class HiredProfessionalDto {

    private String hiringId;
    private String requestId;
    private Long professionalUserId;
    private String professionalName;
    private String profilePhotoUrl;
    private String professionalRole;
    private String serviceType;
    private String service;
    private String location;
    private String phone;
    private String email;
    private LocalDateTime hiringDate;
    private String status;
    private String hiredVia;
    private Double agreedBudget;
    private String projectScope;
    private String projectId;
    private String projectTitle;
    private String tradeRole;
    private String rateType;
    private Integer teamSize;
    private String estimatedDuration;

    public HiredProfessionalDto() {}

    public String getHiringId() {
        return hiringId;
    }

    public void setHiringId(String hiringId) {
        this.hiringId = hiringId;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public Long getProfessionalUserId() {
        return professionalUserId;
    }

    public void setProfessionalUserId(Long professionalUserId) {
        this.professionalUserId = professionalUserId;
    }

    public String getProfessionalName() {
        return professionalName;
    }

    public void setProfessionalName(String professionalName) {
        this.professionalName = professionalName;
    }

    public String getProfilePhotoUrl() {
        return profilePhotoUrl;
    }

    public void setProfilePhotoUrl(String profilePhotoUrl) {
        this.profilePhotoUrl = profilePhotoUrl;
    }

    public String getProfessionalRole() {
        return professionalRole;
    }

    public void setProfessionalRole(String professionalRole) {
        this.professionalRole = professionalRole;
    }

    public String getServiceType() {
        return serviceType;
    }

    public void setServiceType(String serviceType) {
        this.serviceType = serviceType;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDateTime getHiringDate() {
        return hiringDate;
    }

    public void setHiringDate(LocalDateTime hiringDate) {
        this.hiringDate = hiringDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getHiredVia() {
        return hiredVia;
    }

    public void setHiredVia(String hiredVia) {
        this.hiredVia = hiredVia;
    }

    public Double getAgreedBudget() {
        return agreedBudget;
    }

    public void setAgreedBudget(Double agreedBudget) {
        this.agreedBudget = agreedBudget;
    }

    public String getProjectScope() {
        return projectScope;
    }

    public void setProjectScope(String projectScope) {
        this.projectScope = projectScope;
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

    public String getTradeRole() {
        return tradeRole;
    }

    public void setTradeRole(String tradeRole) {
        this.tradeRole = tradeRole;
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
}
