package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * BUILDBID — HIRED PROFESSIONAL SERVICE
 * 
 * Manages queries for hired professionals strictly scoped to the authenticated requester.
 * Unifies TWO distinct hiring sources at presentation layer:
 * 1. Source A: Accepted Direct Hire (ClientServiceRequest where request.client.id == user.id and status == 'Accepted')
 *    Hired Via: DIRECT_HIRE
 * 2. Source B: Accepted Post Requirement (ProjectProfessionalApplication where project.customer.id == user.id and status == 'ACCEPTED')
 *    Hired Via: POST_REQUIREMENT
 */
@Service
public class HiredProfessionalService {

    private final ClientServiceRequestRepository requestRepository;
    private final ProjectProfessionalApplicationRepository applicationRepository;

    @Autowired
    public HiredProfessionalService(
            ClientServiceRequestRepository requestRepository,
            ProjectProfessionalApplicationRepository applicationRepository
    ) {
        this.requestRepository = requestRepository;
        this.applicationRepository = applicationRepository;
    }

    public HiredProfessionalService(ClientServiceRequestRepository requestRepository) {
        this(requestRepository, null);
    }

    /**
     * Retrieves all accepted hired professionals (Direct Hire + Post Requirement)
     * strictly scoped to the authenticated requester.
     */
    @Transactional(readOnly = true)
    public List<HiredProfessionalDto> getHiredProfessionalsForUser(MarketplaceBackendApplication.MarketplaceUser clientUser) {
        if (clientUser == null || clientUser.getId() == null) {
            return Collections.emptyList();
        }

        List<HiredProfessionalDto> dtoList = new ArrayList<>();

        // 1. Source A: Direct Hire accepted requests
        List<ClientServiceRequest> acceptedRequests =
                requestRepository.findByClient_IdAndStatusIgnoreCaseOrderByCreatedAtDesc(clientUser.getId(), "Accepted");

        if (acceptedRequests != null && !acceptedRequests.isEmpty()) {
            for (ClientServiceRequest csr : acceptedRequests) {
                dtoList.add(mapToDto(csr));
            }
        }

        // 2. Source B: Post Requirement accepted applications
        if (applicationRepository != null) {
            List<ProjectProfessionalApplication> acceptedApps =
                    applicationRepository.findByProjectCustomerIdAndStatusOrderByHiredAtDesc(
                            clientUser.getId(),
                            ProjectProfessionalApplication.Status.ACCEPTED
                    );

            if (acceptedApps != null && !acceptedApps.isEmpty()) {
                for (ProjectProfessionalApplication app : acceptedApps) {
                    dtoList.add(mapToDto(app));
                }
            }
        }

        // Sort descending by hiring date (newest first)
        dtoList.sort((a, b) -> {
            if (a.getHiringDate() == null && b.getHiringDate() == null) return 0;
            if (a.getHiringDate() == null) return 1;
            if (b.getHiringDate() == null) return -1;
            return b.getHiringDate().compareTo(a.getHiringDate());
        });

        return dtoList;
    }

    /**
     * Maps an accepted Direct Hire ClientServiceRequest to HiredProfessionalDto.
     * Preserves exact existing behavior.
     */
    private HiredProfessionalDto mapToDto(ClientServiceRequest csr) {
        HiredProfessionalDto dto = new HiredProfessionalDto();
        dto.setHiringId(csr.getRequestId() != null ? csr.getRequestId() : ("HIRE-" + csr.getId()));
        dto.setRequestId(csr.getRequestId());

        MarketplaceBackendApplication.MarketplaceUser pro = csr.getProfessional();
        if (pro != null) {
            dto.setProfessionalUserId(pro.getId());
            dto.setProfessionalName(pro.getName());
            dto.setProfilePhotoUrl(pro.getProfilePhotoUrl());
            dto.setProfessionalRole("PROFESSIONAL");
            dto.setPhone(pro.getPhone());
            dto.setEmail(pro.getEmail());
            dto.setLocation(pro.getLocation() != null && !pro.getLocation().isBlank()
                    ? pro.getLocation()
                    : (csr.getLocation() != null ? csr.getLocation() : ""));
        } else {
            dto.setLocation(csr.getLocation() != null ? csr.getLocation() : "");
        }

        dto.setServiceType(csr.getRequestedService());
        dto.setService(csr.getRequestedService());
        dto.setHiringDate(csr.getUpdatedAt() != null ? csr.getUpdatedAt() : csr.getCreatedAt());
        dto.setStatus("ACTIVE");
        dto.setHiredVia("DIRECT_HIRE");
        dto.setAgreedBudget(csr.getClientBudget());
        dto.setProjectScope(csr.getProjectScope() != null ? csr.getProjectScope() : "");

        return dto;
    }

    /**
     * Maps an accepted Post Requirement ProjectProfessionalApplication to HiredProfessionalDto.
     * Populates authoritative hiredAt date, trade role, rate, and project context.
     */
    private HiredProfessionalDto mapToDto(ProjectProfessionalApplication app) {
        HiredProfessionalDto dto = new HiredProfessionalDto();
        dto.setHiringId(app.getApplicationId() != null ? app.getApplicationId() : ("APP-" + app.getId()));

        Project project = app.getProject();
        String projId = project != null && project.getProjectId() != null ? project.getProjectId() : null;
        dto.setRequestId(projId != null ? projId : (app.getApplicationId() != null ? app.getApplicationId() : ("APP-" + app.getId())));

        MarketplaceBackendApplication.MarketplaceUser pro = app.getProfessional();
        if (pro != null) {
            dto.setProfessionalUserId(pro.getId());
            dto.setProfessionalName(pro.getName());
            dto.setProfilePhotoUrl(pro.getProfilePhotoUrl());
            dto.setProfessionalRole("PROFESSIONAL");
            dto.setPhone(pro.getPhone());
            dto.setEmail(pro.getEmail());
            dto.setLocation(pro.getLocation() != null && !pro.getLocation().isBlank()
                    ? pro.getLocation()
                    : (project != null && project.getLocation() != null && !project.getLocation().isBlank()
                            ? project.getLocation()
                            : (project != null && project.getCity() != null ? project.getCity() : "")));
        } else {
            dto.setLocation(project != null && project.getLocation() != null ? project.getLocation() : "");
        }

        dto.setServiceType(app.getTradeRole());
        dto.setService(app.getTradeRole());
        dto.setHiringDate(app.getHiredAt() != null ? app.getHiredAt() : app.getCreatedAt());
        dto.setStatus("ACTIVE");
        dto.setHiredVia("POST_REQUIREMENT");
        dto.setAgreedBudget(app.getProposedRate());

        // Contextual project scope preview
        StringBuilder scope = new StringBuilder();
        if (project != null) {
            String pTitle = project.getProjectTitle() != null && !project.getProjectTitle().isBlank()
                    ? project.getProjectTitle()
                    : project.getTitle();
            if (pTitle != null && !pTitle.isBlank()) {
                scope.append("Project: ").append(pTitle);
            }
        }
        if (app.getCoverMessage() != null && !app.getCoverMessage().isBlank()) {
            if (scope.length() > 0) {
                scope.append(" — ");
            }
            scope.append(app.getCoverMessage().trim());
        } else if (project != null && project.getDescription() != null && !project.getDescription().isBlank()) {
            if (scope.length() > 0) {
                scope.append(" — ");
            }
            scope.append(project.getDescription().trim());
        }
        if (scope.length() == 0) {
            scope.append("Post requirement engagement for ").append(app.getTradeRole()).append(".");
        }
        dto.setProjectScope(scope.toString());

        // Context enrichment fields
        if (project != null) {
            dto.setProjectId(projId);
            dto.setProjectTitle(project.getProjectTitle() != null && !project.getProjectTitle().isBlank()
                    ? project.getProjectTitle()
                    : project.getTitle());
        }
        dto.setTradeRole(app.getTradeRole());
        dto.setRateType(app.getRateType());
        dto.setTeamSize(app.getTeamSize());
        dto.setEstimatedDuration(app.getEstimatedDuration());

        return dto;
    }
}
