package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BUILDBID - MY BID CONTROLLER (Phase 3)
 *
 * Dedicated REST API controller for the isolated My Bid subsystem.
 * Exposes customer-facing (/api/customer/my-bids) and contractor-facing (/api/contractor/my-bids) endpoints.
 *
 * STRICT ARCHITECTURAL RULES:
 * - Controller remains thin; delegates all state transitions to MyBidService.
 * - Dedicated request/response DTOs: entity serialization is forbidden.
 * - Authenticated user identity and roles are strictly enforced from Spring Security context.
 * - Private contact information is masked prior to assignment establishment.
 * - ZERO modifications or dependencies on Quotation, Contractor Bid Builder, or Project.java lifecycle.
 */
@RestController
public class MyBidController {

    private final MyBidService myBidService;
    private final ProjectRepository projectRepository;
    private final MyBidRepository myBidRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public MyBidController(
            MyBidService myBidService,
            ProjectRepository projectRepository,
            MyBidRepository myBidRepository,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.myBidService = myBidService;
        this.projectRepository = projectRepository;
        this.myBidRepository = myBidRepository;
        this.userRepository = userRepository;
    }

    // =========================================================================
    // DTO DEFINITIONS
    // =========================================================================

    public static class CustomerSummaryResponse {
        private final long totalProjects;
        private final long totalBids;

        public CustomerSummaryResponse(long totalProjects, long totalBids) {
            this.totalProjects = totalProjects;
            this.totalBids = totalBids;
        }

        public long getTotalProjects() { return totalProjects; }
        public long getTotalBids() { return totalBids; }
    }

    public static class CustomerProjectSummaryDto {
        private Long id;
        private String projectId;
        private String projectTitle;
        private String projectType;
        private String location;
        private Double totalArea;
        private String projectStatus;
        private String description;
        private long totalBids;
        private boolean hasActiveAssignment;

        public CustomerProjectSummaryDto() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getProjectId() { return projectId; }
        public void setProjectId(String projectId) { this.projectId = projectId; }
        public String getProjectTitle() { return projectTitle; }
        public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }
        public String getProjectType() { return projectType; }
        public void setProjectType(String projectType) { this.projectType = projectType; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public Double getTotalArea() { return totalArea; }
        public void setTotalArea(Double totalArea) { this.totalArea = totalArea; }
        public String getProjectStatus() { return projectStatus; }
        public void setProjectStatus(String projectStatus) { this.projectStatus = projectStatus; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public long getTotalBids() { return totalBids; }
        public void setTotalBids(long totalBids) { this.totalBids = totalBids; }
        public boolean isHasActiveAssignment() { return hasActiveAssignment; }
        public void setHasActiveAssignment(boolean hasActiveAssignment) { this.hasActiveAssignment = hasActiveAssignment; }
    }

    public static class ContactInfoDto {
        private Long userId;
        private String name;
        private String email;
        private String phone;
        private String location;

        public ContactInfoDto(Long userId, String name, String email, String phone, String location) {
            this.userId = userId;
            this.name = name;
            this.email = email;
            this.phone = phone;
            this.location = location;
        }

        public Long getUserId() { return userId; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public String getPhone() { return phone; }
        public String getLocation() { return location; }
    }

    public static class BidResponseDto {
        private Long id;
        private Long projectId;
        private String projectTitle;
        private Long contractorId;
        private String contractorName;
        private Double bidAmount;
        private Double materialCost;
        private Double labourCost;
        private Double equipmentCost;
        private Double transportCost;
        private Double otherCharges;
        private String estimatedDuration;
        private String proposedTimeline;
        private Integer workersCount;
        private String scopeOfWork;
        private String includedWork;
        private String excludedWork;
        private String paymentTerms;
        private String warranty;
        private String remarks;
        private String status;
        private LocalDateTime submittedAt;
        private LocalDateTime updatedAt;
        private LocalDateTime rejectedAt;
        private LocalDateTime visibleUntil;
        private String projectCustomId;
        private String projectType;
        private String projectLocation;
        private String projectArea;
        private String projectFloors;
        private ContactInfoDto contractorContact; // Populated ONLY after assignment is established
        private ContactInfoDto customerContact;   // Populated ONLY for accepted contractor

        public BidResponseDto() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getProjectTitle() { return projectTitle; }
        public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }
        public Long getContractorId() { return contractorId; }
        public void setContractorId(Long contractorId) { this.contractorId = contractorId; }
        public String getContractorName() { return contractorName; }
        public void setContractorName(String contractorName) { this.contractorName = contractorName; }
        public Double getBidAmount() { return bidAmount; }
        public void setBidAmount(Double bidAmount) { this.bidAmount = bidAmount; }
        public Double getMaterialCost() { return materialCost; }
        public void setMaterialCost(Double materialCost) { this.materialCost = materialCost; }
        public Double getLabourCost() { return labourCost; }
        public void setLabourCost(Double labourCost) { this.labourCost = labourCost; }
        public Double getEquipmentCost() { return equipmentCost; }
        public void setEquipmentCost(Double equipmentCost) { this.equipmentCost = equipmentCost; }
        public Double getTransportCost() { return transportCost; }
        public void setTransportCost(Double transportCost) { this.transportCost = transportCost; }
        public Double getOtherCharges() { return otherCharges; }
        public void setOtherCharges(Double otherCharges) { this.otherCharges = otherCharges; }
        public String getEstimatedDuration() { return estimatedDuration; }
        public void setEstimatedDuration(String estimatedDuration) { this.estimatedDuration = estimatedDuration; }
        public String getProposedTimeline() { return proposedTimeline; }
        public void setProposedTimeline(String proposedTimeline) { this.proposedTimeline = proposedTimeline; }
        public Integer getWorkersCount() { return workersCount; }
        public void setWorkersCount(Integer workersCount) { this.workersCount = workersCount; }
        public String getScopeOfWork() { return scopeOfWork; }
        public void setScopeOfWork(String scopeOfWork) { this.scopeOfWork = scopeOfWork; }
        public String getIncludedWork() { return includedWork; }
        public void setIncludedWork(String includedWork) { this.includedWork = includedWork; }
        public String getExcludedWork() { return excludedWork; }
        public void setExcludedWork(String excludedWork) { this.excludedWork = excludedWork; }
        public String getPaymentTerms() { return paymentTerms; }
        public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }
        public String getWarranty() { return warranty; }
        public void setWarranty(String warranty) { this.warranty = warranty; }
        public String getRemarks() { return remarks; }
        public void setRemarks(String remarks) { this.remarks = remarks; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public LocalDateTime getSubmittedAt() { return submittedAt; }
        public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
        public LocalDateTime getRejectedAt() { return rejectedAt; }
        public void setRejectedAt(LocalDateTime rejectedAt) { this.rejectedAt = rejectedAt; }
        public LocalDateTime getVisibleUntil() { return visibleUntil; }
        public void setVisibleUntil(LocalDateTime visibleUntil) { this.visibleUntil = visibleUntil; }
        public ContactInfoDto getContractorContact() { return contractorContact; }
        public void setContractorContact(ContactInfoDto contractorContact) { this.contractorContact = contractorContact; }
        public ContactInfoDto getCustomerContact() { return customerContact; }
        public void setCustomerContact(ContactInfoDto customerContact) { this.customerContact = customerContact; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

        public String getProjectCustomId() { return projectCustomId; }
        public void setProjectCustomId(String projectCustomId) { this.projectCustomId = projectCustomId; }

        public String getProjectType() { return projectType; }
        public void setProjectType(String projectType) { this.projectType = projectType; }

        public String getProjectLocation() { return projectLocation; }
        public void setProjectLocation(String projectLocation) { this.projectLocation = projectLocation; }

        public String getProjectArea() { return projectArea; }
        public void setProjectArea(String projectArea) { this.projectArea = projectArea; }

        public String getProjectFloors() { return projectFloors; }
        public void setProjectFloors(String projectFloors) { this.projectFloors = projectFloors; }
    }

    public static class AssignmentResponseDto {
        private Long id;
        private Long projectId;
        private String projectTitle;
        private Long bidId;
        private Double bidAmount;
        private String assignmentStatus;
        private boolean isCurrent;
        private LocalDateTime acceptedAt;
        private LocalDateTime declinedAt;
        private LocalDateTime revokedAt;
        private ContactInfoDto contractor;
        private ContactInfoDto customer;

        public AssignmentResponseDto() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getProjectTitle() { return projectTitle; }
        public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }
        public Long getBidId() { return bidId; }
        public void setBidId(Long bidId) { this.bidId = bidId; }
        public Double getBidAmount() { return bidAmount; }
        public void setBidAmount(Double bidAmount) { this.bidAmount = bidAmount; }
        public String getAssignmentStatus() { return assignmentStatus; }
        public void setAssignmentStatus(String assignmentStatus) { this.assignmentStatus = assignmentStatus; }
        public boolean isCurrent() { return isCurrent; }
        public void setCurrent(boolean current) { isCurrent = current; }
        public LocalDateTime getAcceptedAt() { return acceptedAt; }
        public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }
        public LocalDateTime getDeclinedAt() { return declinedAt; }
        public void setDeclinedAt(LocalDateTime declinedAt) { this.declinedAt = declinedAt; }
        public LocalDateTime getRevokedAt() { return revokedAt; }
        public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }
        public ContactInfoDto getContractor() { return contractor; }
        public void setContractor(ContactInfoDto contractor) { this.contractor = contractor; }
        public ContactInfoDto getCustomer() { return customer; }
        public void setCustomer(ContactInfoDto customer) { this.customer = customer; }
    }

    public static class AuditHistoryDto {
        private Long id;
        private Long projectId;
        private Long bidId;
        private String actorRole;
        private String eventType;
        private String eventDescription;
        private LocalDateTime createdAt;

        public AuditHistoryDto(Long id, Long projectId, Long bidId, String actorRole, String eventType, String eventDescription, LocalDateTime createdAt) {
            this.id = id;
            this.projectId = projectId;
            this.bidId = bidId;
            this.actorRole = actorRole;
            this.eventType = eventType;
            this.eventDescription = eventDescription;
            this.createdAt = createdAt;
        }

        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public Long getBidId() { return bidId; }
        public String getActorRole() { return actorRole; }
        public String getEventType() { return eventType; }
        public String getEventDescription() { return eventDescription; }
        public LocalDateTime getCreatedAt() { return createdAt; }
    }

    // =========================================================================
    // CUSTOMER ENDPOINTS (/api/customer/my-bids/**)
    // =========================================================================

    /**
     * GET /api/customer/my-bids/summary
     */
    @GetMapping("/api/customer/my-bids/summary")
    public ResponseEntity<?> getCustomerSummary(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        MyBidService.CustomerDashboardSummary summary = myBidService.getCustomerDashboardSummary(customer);
        return ResponseEntity.ok(new CustomerSummaryResponse(summary.getTotalProjects(), summary.getTotalBids()));
    }

    /**
     * GET /api/customer/my-bids/projects
     */
    @GetMapping("/api/customer/my-bids/projects")
    public ResponseEntity<?> getCustomerProjects(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            List<Project> projects = projectRepository.findByCustomer(customer);
            List<CustomerProjectSummaryDto> dtoList = projects.stream().map(p -> {
                CustomerProjectSummaryDto dto = new CustomerProjectSummaryDto();
                dto.setId(p.getId());
                dto.setProjectId(p.getProjectId());
                dto.setProjectTitle(p.getProjectTitle() != null ? p.getProjectTitle() : p.getTitle());
                dto.setProjectType(p.getProjectType() != null ? p.getProjectType() : p.getType());
                dto.setLocation(p.getCity() != null ? p.getCity() : p.getLocation());
                dto.setTotalArea(p.getTotalArea());
                dto.setProjectStatus(p.getStatus());
                dto.setDescription(p.getDescription());
                dto.setTotalBids(myBidRepository.countByProjectId(p.getId()));

                boolean hasAssignment = myBidService.hasActiveAssignment(p.getId());
                dto.setHasActiveAssignment(hasAssignment);
                return dto;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(dtoList);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve projects: " + e.getMessage()));
        }
    }

    /**
     * GET /api/customer/my-bids/projects/{projectId}/bids
     */
    @GetMapping("/api/customer/my-bids/projects/{projectId}/bids")
    public ResponseEntity<?> getCustomerProjectBids(
            @PathVariable("projectId") Long projectId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            List<MyBid> bids = myBidService.getCustomerProjectBids(customer, projectId);
            List<BidResponseDto> responseDtos = bids.stream()
                    .map(b -> toCustomerBidDto(b, customer))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseDtos);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/customer/my-bids/bids/{bidId}
     */
    @GetMapping("/api/customer/my-bids/bids/{bidId}")
    public ResponseEntity<?> getBidDetails(
            @PathVariable("bidId") Long bidId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        Optional<MyBid> bidOpt = myBidService.getBidById(bidId);
        if (bidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Bid not found with ID: " + bidId));
        }

        MyBid bid = bidOpt.get();
        if (bid.getCustomer() == null || !bid.getCustomer().getId().equals(customer.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. You do not own this project bid."));
        }

        return ResponseEntity.ok(toCustomerBidDto(bid, customer));
    }

    /**
     * POST /api/customer/my-bids/bids/{bidId}/accept
     */
    @PostMapping("/api/customer/my-bids/bids/{bidId}/accept")
    public ResponseEntity<?> acceptBid(
            @PathVariable("bidId") Long bidId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            MyBidAssignment assignment = myBidService.acceptBid(customer, bidId);
            return ResponseEntity.ok(toAssignmentDto(assignment));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/customer/my-bids/bids/{bidId}/reject
     * Explains the isolated state machine lifecycle: bids are not manually deleted or standalone-rejected;
     * they transition to NOT_SELECTED when another bid is accepted.
     */
    @PostMapping("/api/customer/my-bids/bids/{bidId}/reject")
    public ResponseEntity<?> rejectBid(
            @PathVariable("bidId") Long bidId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            MyBid rejectedBid = myBidService.rejectBid(customer, bidId);
            return ResponseEntity.ok(toCustomerBidDto(rejectedBid, customer));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/customer/my-bids/projects/{projectId}/assignment
     */
    @GetMapping("/api/customer/my-bids/projects/{projectId}/assignment")
    public ResponseEntity<?> getCustomerProjectAssignment(
            @PathVariable("projectId") Long projectId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            Optional<MyBidAssignment> assignmentOpt = myBidService.getCustomerProjectAssignment(customer, projectId);
            if (assignmentOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of("hasAssignment", false, "message", "No active assignment for this project."));
            }
            return ResponseEntity.ok(toAssignmentDto(assignmentOpt.get()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/customer/my-bids/assignments/{assignmentId}/revoke
     */
    @PostMapping("/api/customer/my-bids/assignments/{assignmentId}/revoke")
    public ResponseEntity<?> revokeAcceptance(
            @PathVariable("assignmentId") Long assignmentId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            MyBidAssignment updatedAssignment = myBidService.revokeAcceptance(customer, assignmentId);
            return ResponseEntity.ok(toAssignmentDto(updatedAssignment));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/customer/my-bids/bids/{bidId}/reassign
     */
    @PostMapping("/api/customer/my-bids/bids/{bidId}/reassign")
    public ResponseEntity<?> reassignContractor(
            @PathVariable("bidId") Long bidId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            MyBidAssignment newAssignment = myBidService.reassignContractor(customer, bidId);
            return ResponseEntity.ok(toAssignmentDto(newAssignment));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/customer/my-bids/projects/{projectId}/history
     */
    @GetMapping("/api/customer/my-bids/projects/{projectId}/history")
    public ResponseEntity<?> getCustomerProjectHistory(
            @PathVariable("projectId") Long projectId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser customer = resolveUser(authentication);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(customer, MarketplaceBackendApplication.Role.CUSTOMER)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Customer access only."));
        }

        try {
            List<MyBidAuditHistory> history = myBidService.getProjectAuditHistory(customer, projectId);
            List<AuditHistoryDto> dtoList = history.stream().map(h -> new AuditHistoryDto(
                    h.getId(),
                    h.getProject() != null ? h.getProject().getId() : null,
                    h.getBid() != null ? h.getBid().getId() : null,
                    h.getActorRole(),
                    h.getEventType() != null ? h.getEventType().name() : null,
                    h.getEventDescription(),
                    h.getCreatedAt()
            )).collect(Collectors.toList());
            return ResponseEntity.ok(dtoList);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // CONTRACTOR ENDPOINTS (/api/contractor/my-bids/**)
    // =========================================================================

    /**
     * GET /api/contractor/my-bids
     * Default active contractor view (7-day visibility rule applied for NOT_SELECTED bids).
     */
    @GetMapping({"/api/contractor/my-bids", "/api/contractor/bids"})
    public ResponseEntity<?> getContractorBids(
            @RequestParam(value = "history", required = false, defaultValue = "false") boolean history,
            Authentication authentication
    ) {
        return getContractorBidsInternal(authentication, history);
    }

    public ResponseEntity<?> getContractorBids(Authentication authentication) {
        return getContractorBidsInternal(authentication, false);
    }

    private ResponseEntity<?> getContractorBidsInternal(Authentication authentication, boolean history) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        List<MyBid> bids = myBidService.getContractorBids(contractor, history);
        List<BidResponseDto> dtoList = bids.stream()
                .map(b -> toContractorBidDto(b, contractor))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    /**
     * GET /api/contractor/my-bids/{bidId}
     */
    @GetMapping({"/api/contractor/my-bids/{bidId}", "/api/contractor/bids/{bidId}"})
    public ResponseEntity<?> getContractorBidDetails(
            @PathVariable("bidId") Long bidId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        Optional<MyBid> bidOpt = myBidService.getBidById(bidId);
        if (bidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Bid not found with ID: " + bidId));
        }

        MyBid bid = bidOpt.get();
        if (bid.getContractor() == null || !bid.getContractor().getId().equals(contractor.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. You do not own this bid."));
        }

        return ResponseEntity.ok(toContractorBidDto(bid, contractor));
    }

    /**
     * PUT /api/contractor/my-bids/{bidId}
     * Contractor updates their pending bid.
     */
    @PutMapping({"/api/contractor/my-bids/{bidId}", "/api/contractor/bids/{bidId}"})
    public ResponseEntity<?> updateContractorBid(
            @PathVariable("bidId") Long bidId,
            @RequestBody MyBidService.UpdateBidRequest request,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        try {
            MyBid updatedBid = myBidService.updateBid(contractor, bidId, request);
            return ResponseEntity.ok(toContractorBidDto(updatedBid, contractor));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/contractor/my-bids/{bidId}
     * Contractor withdraws/deletes their bid.
     */
    @DeleteMapping({"/api/contractor/my-bids/{bidId}", "/api/contractor/bids/{bidId}"})
    public ResponseEntity<?> withdrawContractorBid(
            @PathVariable("bidId") Long bidId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        try {
            MyBid withdrawnBid = myBidService.withdrawBid(contractor, bidId);
            return ResponseEntity.ok(Map.of(
                    "message", "Bid withdrawn successfully.",
                    "bidId", bidId,
                    "status", withdrawnBid.getStatus().name()
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/bids OR /api/contractor/my-bids OR /api/contractor/projects/{projectId}/bid
     * Contractor submits a new bid on a project.
     */
    @PostMapping({"/api/bids", "/api/contractor/my-bids", "/api/contractor/projects/{projectId}/bid"})
    public ResponseEntity<?> submitContractorBid(
            @PathVariable(value = "projectId", required = false) String pathProjectId,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        try {
            Object rawProjId = pathProjectId != null ? pathProjectId : (payload.get("projectId") != null ? payload.get("projectId") : payload.get("id"));
            if (rawProjId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Project ID is required."));
            }

            Long targetProjectId = null;
            String projIdStr = rawProjId.toString().trim();
            if (projIdStr.matches("^\\d+$")) {
                targetProjectId = Long.parseLong(projIdStr);
            } else {
                Optional<Project> projOpt = projectRepository.findByProjectId(projIdStr);
                if (projOpt.isPresent()) {
                    targetProjectId = projOpt.get().getId();
                } else if (projIdStr.startsWith("PRJ-") && projIdStr.substring(4).matches("^\\d+$")) {
                    targetProjectId = Long.parseLong(projIdStr.substring(4));
                }
            }

            if (targetProjectId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Project not found for identifier: " + projIdStr));
            }

            MyBidService.SubmitBidRequest request = new MyBidService.SubmitBidRequest();
            Double amount = parseDoubleSafe(payload.get("bidAmount") != null ? payload.get("bidAmount") : payload.get("finalAmount"));
            if (amount == null || amount <= 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "A valid positive bid amount is required."));
            }
            request.setBidAmount(amount);

            if (payload.get("materialCost") != null) request.setMaterialCost(parseDoubleSafe(payload.get("materialCost")));
            if (payload.get("labourCost") != null) request.setLabourCost(parseDoubleSafe(payload.get("labourCost")));
            if (payload.get("equipmentCost") != null) request.setEquipmentCost(parseDoubleSafe(payload.get("equipmentCost")));
            if (payload.get("transportCost") != null) request.setTransportCost(parseDoubleSafe(payload.get("transportCost")));
            if (payload.get("otherCharges") != null) request.setOtherCharges(parseDoubleSafe(payload.get("otherCharges")));

            if (payload.get("estimatedDuration") != null) request.setEstimatedDuration(payload.get("estimatedDuration").toString());
            else if (payload.get("duration") != null) request.setEstimatedDuration(payload.get("duration").toString());
            else if (payload.get("durationDays") != null) request.setEstimatedDuration(payload.get("durationDays") + " Days");

            if (payload.get("proposedTimeline") != null) request.setProposedTimeline(payload.get("proposedTimeline").toString());
            if (payload.get("workersCount") != null) {
                try { request.setWorkersCount(Integer.parseInt(payload.get("workersCount").toString())); } catch (Exception ignored) {}
            }

            if (payload.get("scopeOfWork") != null) request.setScopeOfWork(payload.get("scopeOfWork").toString());
            else if (payload.get("proposal") != null) request.setScopeOfWork(payload.get("proposal").toString());

            if (payload.get("includedWork") != null) {
                request.setIncludedWork(formatListOrString(payload.get("includedWork")));
            } else if (payload.get("includedScope") != null) {
                request.setIncludedWork(formatListOrString(payload.get("includedScope")));
            }

            if (payload.get("excludedWork") != null) {
                request.setExcludedWork(formatListOrString(payload.get("excludedWork")));
            } else if (payload.get("excludedScope") != null) {
                request.setExcludedWork(formatListOrString(payload.get("excludedScope")));
            }

            if (payload.get("paymentTerms") != null) request.setPaymentTerms(payload.get("paymentTerms").toString());
            if (payload.get("warranty") != null) request.setWarranty(payload.get("warranty").toString());
            if (payload.get("remarks") != null) request.setRemarks(payload.get("remarks").toString());

            MyBid submittedBid = myBidService.submitBid(contractor, targetProjectId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(toContractorBidDto(submittedBid, contractor));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/contractor/my-bids/history
     * Contractor full history (including expired NOT_SELECTED bids; no deletion).
     */
    @GetMapping("/api/contractor/my-bids/history")
    public ResponseEntity<?> getContractorBidHistory(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        List<MyBid> bids = myBidService.getContractorBids(contractor, true);
        List<BidResponseDto> dtoList = bids.stream()
                .map(b -> toContractorBidDto(b, contractor))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    /**
     * GET /api/contractor/my-bids/contracts
     * Active assignments only for "My Contracts" view.
     */
    @GetMapping("/api/contractor/my-bids/contracts")
    public ResponseEntity<?> getContractorContracts(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        List<MyBidAssignment> contracts = myBidService.getMyContracts(contractor);
        List<AssignmentResponseDto> dtoList = contracts.stream()
                .map(this::toAssignmentDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    /**
     * GET /api/contractor/my-bids/assignments/{assignmentId}
     */
    @GetMapping("/api/contractor/my-bids/assignments/{assignmentId}")
    public ResponseEntity<?> getContractorAssignment(
            @PathVariable("assignmentId") Long assignmentId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        Optional<MyBidAssignment> assignmentOpt = myBidService.getAssignmentById(assignmentId);
        if (assignmentOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Assignment not found with ID: " + assignmentId));
        }

        MyBidAssignment assignment = assignmentOpt.get();
        if (assignment.getContractor() == null || !assignment.getContractor().getId().equals(contractor.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. You do not own this assignment."));
        }

        return ResponseEntity.ok(toAssignmentDto(assignment));
    }

    /**
     * POST /api/contractor/my-bids/assignments/{assignmentId}/decline
     */
    @PostMapping("/api/contractor/my-bids/assignments/{assignmentId}/decline")
    public ResponseEntity<?> declineAssignment(
            @PathVariable("assignmentId") Long assignmentId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        try {
            MyBidAssignment updatedAssignment = myBidService.declineAssignment(contractor, assignmentId);
            return ResponseEntity.ok(toAssignmentDto(updatedAssignment));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/contractor/my-bids/projects/{projectId}/history
     */
    @GetMapping("/api/contractor/my-bids/projects/{projectId}/history")
    public ResponseEntity<?> getContractorProjectHistory(
            @PathVariable("projectId") Long projectId,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser contractor = resolveUser(authentication);
        if (contractor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please log in."));
        }
        if (!hasRole(contractor, MarketplaceBackendApplication.Role.CONTRACTOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden. Contractor access only."));
        }

        try {
            List<MyBidAuditHistory> history = myBidService.getProjectAuditHistory(contractor, projectId);
            List<AuditHistoryDto> dtoList = history.stream().map(h -> new AuditHistoryDto(
                    h.getId(),
                    h.getProject() != null ? h.getProject().getId() : null,
                    h.getBid() != null ? h.getBid().getId() : null,
                    h.getActorRole(),
                    h.getEventType() != null ? h.getEventType().name() : null,
                    h.getEventDescription(),
                    h.getCreatedAt()
            )).collect(Collectors.toList());
            return ResponseEntity.ok(dtoList);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // DTO MAPPERS & PRIVATE HELPERS
    // =========================================================================

    private BidResponseDto toCustomerBidDto(MyBid b, MarketplaceBackendApplication.MarketplaceUser customer) {
        BidResponseDto dto = mapBaseBidDto(b);

        // Contractor contact information exposed ONLY after acceptance
        if (b.getStatus() == MyBid.Status.ACCEPTED && b.getContractor() != null) {
            MarketplaceBackendApplication.MarketplaceUser c = b.getContractor();
            dto.setContractorContact(new ContactInfoDto(c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getLocation()));
        }
        return dto;
    }

    private BidResponseDto toContractorBidDto(MyBid b, MarketplaceBackendApplication.MarketplaceUser contractor) {
        BidResponseDto dto = mapBaseBidDto(b);

        // Customer contact information exposed ONLY after acceptance / active assignment
        if (b.getStatus() == MyBid.Status.ACCEPTED && b.getCustomer() != null) {
            MarketplaceBackendApplication.MarketplaceUser cust = b.getCustomer();
            dto.setCustomerContact(new ContactInfoDto(cust.getId(), cust.getName(), cust.getEmail(), cust.getPhone(), cust.getLocation()));
        }
        return dto;
    }

    private BidResponseDto mapBaseBidDto(MyBid b) {
        BidResponseDto dto = new BidResponseDto();
        dto.setId(b.getId());
        if (b.getProject() != null) {
            Project p = b.getProject();
            dto.setProjectId(p.getId());
            dto.setProjectCustomId(p.getProjectId());
            dto.setProjectTitle(p.getProjectTitle() != null ? p.getProjectTitle() : p.getTitle());
            dto.setProjectType(p.getProjectType() != null ? p.getProjectType() : p.getType());
            String loc = p.getCity() != null ? (p.getState() != null ? p.getCity() + ", " + p.getState() : p.getCity()) : p.getLocation();
            dto.setProjectLocation(loc);
            Double areaVal = p.getTotalArea() != null ? p.getTotalArea() : (p.getBuiltUpArea() != null ? p.getBuiltUpArea() : p.getPlotArea());
            dto.setProjectArea(areaVal != null ? areaVal + " sq.ft." : null);
            dto.setProjectFloors(p.getFloors());
        }
        if (b.getContractor() != null) {
            dto.setContractorId(b.getContractor().getId());
            dto.setContractorName(b.getContractor().getName());
        }
        dto.setBidAmount(b.getBidAmount());
        dto.setMaterialCost(b.getMaterialCost());
        dto.setLabourCost(b.getLabourCost());
        dto.setEquipmentCost(b.getEquipmentCost());
        dto.setTransportCost(b.getTransportCost());
        dto.setOtherCharges(b.getOtherCharges());
        dto.setEstimatedDuration(b.getEstimatedDuration());
        dto.setProposedTimeline(b.getProposedTimeline());
        dto.setWorkersCount(b.getWorkersCount());
        dto.setScopeOfWork(b.getScopeOfWork());
        dto.setIncludedWork(b.getIncludedWork());
        dto.setExcludedWork(b.getExcludedWork());
        dto.setPaymentTerms(b.getPaymentTerms());
        dto.setWarranty(b.getWarranty());
        dto.setRemarks(b.getRemarks());
        dto.setStatus(b.getStatus() != null ? b.getStatus().name() : null);
        dto.setSubmittedAt(b.getSubmittedAt());
        dto.setUpdatedAt(b.getUpdatedAt());
        dto.setRejectedAt(b.getRejectedAt());
        dto.setVisibleUntil(myBidService.getVisibleUntil(b));
        return dto;
    }

    private AssignmentResponseDto toAssignmentDto(MyBidAssignment a) {
        AssignmentResponseDto dto = new AssignmentResponseDto();
        dto.setId(a.getId());
        if (a.getProject() != null) {
            dto.setProjectId(a.getProject().getId());
            dto.setProjectTitle(a.getProject().getProjectTitle() != null ? a.getProject().getProjectTitle() : a.getProject().getTitle());
        }
        if (a.getAcceptedBid() != null) {
            dto.setBidId(a.getAcceptedBid().getId());
            dto.setBidAmount(a.getAcceptedBid().getBidAmount());
        }
        dto.setAssignmentStatus(a.getAssignmentStatus() != null ? a.getAssignmentStatus().name() : null);
        dto.setCurrent(a.isCurrent());
        dto.setAcceptedAt(a.getAcceptedAt());
        dto.setDeclinedAt(a.getDeclinedAt());
        dto.setRevokedAt(a.getRevokedAt());

        // Contact info is authorized once assignment is established
        if (a.getContractor() != null) {
            MarketplaceBackendApplication.MarketplaceUser c = a.getContractor();
            dto.setContractor(new ContactInfoDto(c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getLocation()));
        }
        if (a.getCustomer() != null) {
            MarketplaceBackendApplication.MarketplaceUser cust = a.getCustomer();
            dto.setCustomer(new ContactInfoDto(cust.getId(), cust.getName(), cust.getEmail(), cust.getPhone(), cust.getLocation()));
        }
        return dto;
    }

    private MarketplaceBackendApplication.MarketplaceUser resolveUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        String principal = authentication.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElse(null);
    }

    private boolean hasRole(MarketplaceBackendApplication.MarketplaceUser user, MarketplaceBackendApplication.Role role) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().contains(role);
    }

    private Double parseDoubleSafe(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        String str = obj.toString().replaceAll("[^0-9.]", "").trim();
        if (str.isEmpty()) return null;
        try {
            return Double.parseDouble(str);
        } catch (Exception e) {
            return null;
        }
    }

    private String formatListOrString(Object obj) {
        if (obj == null) return null;
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            return list.stream().map(Object::toString).collect(Collectors.joining("\n"));
        }
        return obj.toString();
    }
}
