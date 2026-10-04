package com.marketplace.backend;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for updating an application's status (e.g. ACCEPTED, REJECTED, SHORTLISTED).
 */
public class ApplicationStatusUpdateDto {

    @NotBlank(message = "Status is required")
    private String status;

    public ApplicationStatusUpdateDto() {}

    public ApplicationStatusUpdateDto(String status) {
        this.status = status;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
