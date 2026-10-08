package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * BUILDBID - MY BID SERVICE (Phase 2.1 Concurrency Hardened)
 *
 * Isolated service layer for the My Bid subsystem.
 * Encapsulates the complete bidding and assignment state machine with project-level concurrency locking:
 * - Contractor Bid Submission
 * - Customer Project Bid Retrieval & Dashboard Summaries
 * - Customer Bid Acceptance (with strict project-level database serialization)
 * - Contractor Assignment Decline (with automatic project reopening & bid preservation)
 * - Customer Acceptance Revocation / Take Back (with automatic project reopening)
 * - Reassignment from existing historical bids without requiring re-bidding
 * - 7-day visibility calculation for not-selected bids without data deletion
 * - Contractor "My Contracts" active assignment retrieval
 * - Append-only immutable audit trail recording
 *
 * STRICT ARCHITECTURAL ISOLATION & CONCURRENCY:
 * - Strictly serializes concurrent assignment-changing transactions using MyBidProjectLock.
 * - Enforces: At most ONE active assignment per project under any concurrent race condition.
 * - Does NOT alter Project.java or Project.status.
 * - Does NOT reuse Quotation or Contractor Bid Builder business logic.
 * - NEVER deletes MyBid or MyBidAssignment records.
 */
@Service
public class MyBidService {

    public static final long REJECTED_VISIBILITY_DAYS = 7L;

    private final MyBidRepository myBidRepository;
    private final MyBidAssignmentRepository myBidAssignmentRepository;
    private final MyBidAuditHistoryRepository myBidAuditHistoryRepository;
    private final ProjectRepository projectRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final MyBidProjectLockRepository myBidProjectLockRepository;

    @Autowired
    public MyBidService(
            MyBidRepository myBidRepository,
            MyBidAssignmentRepository myBidAssignmentRepository,
            MyBidAuditHistoryRepository myBidAuditHistoryRepository,
            ProjectRepository projectRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            MyBidProjectLockRepository myBidProjectLockRepository
    ) {
        this.myBidRepository = myBidRepository;
        this.myBidAssignmentRepository = myBidAssignmentRepository;
        this.myBidAuditHistoryRepository = myBidAuditHistoryRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.myBidProjectLockRepository = myBidProjectLockRepository;
    }

    public MyBidService(
            MyBidRepository myBidRepository,
            MyBidAssignmentRepository myBidAssignmentRepository,
            MyBidAuditHistoryRepository myBidAuditHistoryRepository,
            ProjectRepository projectRepository,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this(myBidRepository, myBidAssignmentRepository, myBidAuditHistoryRepository, projectRepository, userRepository, null);
    }

    // =========================================================================
    // DTO / VALUE OBJECTS
    // =========================================================================

    /**
     * Value object for customer dashboard counts.
     */
    public static class CustomerDashboardSummary {
        private final long totalProjects;
        private final long totalBids;

        public CustomerDashboardSummary(long totalProjects, long totalBids) {
            this.totalProjects = totalProjects;
            this.totalBids = totalBids;
        }

        public long getTotalProjects() { return totalProjects; }
        public long getTotalBids() { return totalBids; }
    }

    /**
     * DTO for submitting a project bid.
     */
    public static class SubmitBidRequest {
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
        private String descriptionEn;
        private String descriptionHi;

        public SubmitBidRequest() {}

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

        public String getDescriptionEn() { return descriptionEn; }
        public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }

        public String getDescriptionHi() { return descriptionHi; }
        public void setDescriptionHi(String descriptionHi) { this.descriptionHi = descriptionHi; }
    }

    /**
     * DTO for updating an existing pending project bid.
     */
    public static class UpdateBidRequest {
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
        private String descriptionEn;
        private String descriptionHi;

        public UpdateBidRequest() {}

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

        public String getDescriptionEn() { return descriptionEn; }
        public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }

        public String getDescriptionHi() { return descriptionHi; }
        public void setDescriptionHi(String descriptionHi) { this.descriptionHi = descriptionHi; }
    }

    // =========================================================================
    // PROJECT-LEVEL CONCURRENCY LOCK MANAGEMENT (Phase 2.1)
    // =========================================================================

    /**
     * Safely ensures the project-level lock row exists.
     * Guaranteed safe under concurrent initialization by relying on database UNIQUE(project_id).
     */
    public synchronized void ensureProjectLockRowExists(Long projectId) {
        if (projectId == null || myBidProjectLockRepository == null) return;
        if (!myBidProjectLockRepository.existsByProjectId(projectId)) {
            try {
                MyBidProjectLock lock = new MyBidProjectLock(projectId);
                myBidProjectLockRepository.saveAndFlush(lock);
            } catch (Exception ex) {
                // Duplicate key race: another concurrent thread already inserted this row. Safe to ignore.
            }
        }
    }

    /**
     * Acquires a pessimistic write lock (SELECT ... FOR UPDATE) on the project-level MyBid lock row.
     * Strictly serializes all My Bid assignment-changing operations for the given project.
     */
    public MyBidProjectLock acquireProjectLock(Long projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID cannot be null for project lock.");
        }
        if (myBidProjectLockRepository == null) {
            return null;
        }
        ensureProjectLockRowExists(projectId);
        return myBidProjectLockRepository.findByProjectIdForUpdate(projectId)
                .orElseGet(() -> {
                    ensureProjectLockRowExists(projectId);
                    return myBidProjectLockRepository.findByProjectIdForUpdate(projectId)
                            .orElseThrow(() -> new IllegalStateException("Failed to acquire project lock for Project ID: " + projectId));
                });
    }

    // =========================================================================
    // 1. BID SUBMISSION
    // =========================================================================

    /**
     * Submits a new contractor bid on a customer's project.
     * Stored as an independent MyBid record. Never overwrites existing bids.
     */
    @Transactional
    public MyBid submitBid(
            MarketplaceBackendApplication.MarketplaceUser contractor,
            Long projectId,
            SubmitBidRequest request
    ) {
        if (contractor == null || contractor.getId() == null) {
            throw new SecurityException("Authentication required: Valid contractor identity required.");
        }
        if (!isContractor(contractor)) {
            throw new SecurityException("Forbidden: User does not hold the CONTRACTOR role.");
        }
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID cannot be null.");
        }
        if (request == null || request.getBidAmount() == null || request.getBidAmount() <= 0) {
            throw new IllegalArgumentException("Valid positive bid amount is required.");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found with ID: " + projectId));

        // Customer must be derived from the project itself, NEVER from untrusted user input
        MarketplaceBackendApplication.MarketplaceUser customer = project.getCustomer();
        if (customer == null) {
            throw new IllegalStateException("Project is not associated with a valid customer.");
        }
        if (customer.getId().equals(contractor.getId())) {
            throw new IllegalArgumentException("Contractor cannot submit a bid on their own project.");
        }

        // Pre-initialize project lock row so it is ready for future atomic acceptance
        ensureProjectLockRowExists(projectId);

        // Build isolated MyBid entity
        MyBid bid = new MyBid();
        bid.setProject(project);
        bid.setCustomer(customer);
        bid.setContractor(contractor);
        bid.setBidAmount(request.getBidAmount());
        bid.setMaterialCost(request.getMaterialCost());
        bid.setLabourCost(request.getLabourCost());
        bid.setEquipmentCost(request.getEquipmentCost());
        bid.setTransportCost(request.getTransportCost());
        bid.setOtherCharges(request.getOtherCharges());
        bid.setEstimatedDuration(request.getEstimatedDuration());
        bid.setProposedTimeline(request.getProposedTimeline());
        bid.setWorkersCount(request.getWorkersCount());
        bid.setScopeOfWork(request.getScopeOfWork());
        bid.setIncludedWork(request.getIncludedWork());
        bid.setExcludedWork(request.getExcludedWork());
        bid.setPaymentTerms(request.getPaymentTerms());
        bid.setWarranty(request.getWarranty());
        bid.setRemarks(request.getRemarks());
        bid.setDescriptionEn(request.getDescriptionEn());
        bid.setDescriptionHi(request.getDescriptionHi());
        bid.setStatus(MyBid.Status.PENDING);
        bid.setSubmittedAt(LocalDateTime.now());

        MyBid savedBid = myBidRepository.save(bid);

        // Record immutable audit history
        recordAudit(
                project,
                savedBid,
                contractor,
                "CONTRACTOR",
                MyBidAuditHistory.EventType.BID_SUBMITTED,
                "Contractor " + contractor.getName() + " submitted a bid of ₹" + savedBid.getBidAmount()
        );

        return savedBid;
    }

    /**
     * Overload for submitting directly via an existing MyBid instance.
     */
    @Transactional
    public MyBid submitBid(
            MarketplaceBackendApplication.MarketplaceUser contractor,
            Long projectId,
            MyBid bidEntity
    ) {
        if (bidEntity == null) {
            throw new IllegalArgumentException("Bid entity cannot be null.");
        }
        SubmitBidRequest req = new SubmitBidRequest();
        req.setBidAmount(bidEntity.getBidAmount());
        req.setMaterialCost(bidEntity.getMaterialCost());
        req.setLabourCost(bidEntity.getLabourCost());
        req.setEquipmentCost(bidEntity.getEquipmentCost());
        req.setTransportCost(bidEntity.getTransportCost());
        req.setOtherCharges(bidEntity.getOtherCharges());
        req.setEstimatedDuration(bidEntity.getEstimatedDuration());
        req.setProposedTimeline(bidEntity.getProposedTimeline());
        req.setWorkersCount(bidEntity.getWorkersCount());
        req.setScopeOfWork(bidEntity.getScopeOfWork());
        req.setIncludedWork(bidEntity.getIncludedWork());
        req.setExcludedWork(bidEntity.getExcludedWork());
        req.setPaymentTerms(bidEntity.getPaymentTerms());
        req.setWarranty(bidEntity.getWarranty());
        req.setRemarks(bidEntity.getRemarks());
        req.setDescriptionEn(bidEntity.getDescriptionEn());
        req.setDescriptionHi(bidEntity.getDescriptionHi());
        return submitBid(contractor, projectId, req);
    }

    // =========================================================================
    // 2. CUSTOMER PROJECT BID RETRIEVAL & DASHBOARD SUMMARY
    // =========================================================================

    /**
     * Retrieves all MyBid records for a customer's specific project.
     * Strictly verifies customer project ownership.
     */
    public List<MyBid> getCustomerProjectBids(
            MarketplaceBackendApplication.MarketplaceUser customer,
            Long projectId
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID cannot be null.");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found with ID: " + projectId));

        verifyCustomerProjectOwnership(project, customer);

        return myBidRepository.findByProjectIdOrderBySubmittedAtDesc(projectId).stream()
                .filter(b -> b.getStatus() != MyBid.Status.WITHDRAWN)
                .toList();
    }

    /**
     * Calculates customer dashboard summary: total owned projects and total MyBid submissions.
     */
    public CustomerDashboardSummary getCustomerDashboardSummary(
            MarketplaceBackendApplication.MarketplaceUser customer
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }

        long totalProjects = projectRepository.findByCustomer(customer).size();
        long totalBids = myBidRepository.countByCustomerId(customer.getId());

        return new CustomerDashboardSummary(totalProjects, totalBids);
    }

    // =========================================================================
    // 3. CUSTOMER ACCEPTS A BID (Phase 2.1 Project-Level Serialized)
    // =========================================================================

    /**
     * Atomically accepts a contractor's bid on a customer's project.
     * Enforces:
     * - Project-level pessimistic lock acquired FIRST to eliminate concurrent races
     * - Customer ownership validation
     * - Exactly one current active assignment per project
     * - Competing bids marked NOT_SELECTED with 7-day visibility timestamp
     * - No bids are ever deleted
     */
    @Transactional
    public MyBidAssignment acceptBid(
            MarketplaceBackendApplication.MarketplaceUser customer,
            Long bidId
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }
        if (bidId == null) {
            throw new IllegalArgumentException("Bid ID cannot be null.");
        }

        // 1. Initial lookup to identify target project
        MyBid bid = myBidRepository.findById(bidId)
                .orElseThrow(() -> new NoSuchElementException("Bid not found with ID: " + bidId));

        Project project = bid.getProject();
        if (project == null) {
            throw new IllegalStateException("Bid is not linked to any project.");
        }

        // 2. CRITICAL CONCURRENCY FIX: Lock the project FIRST before checking or modifying assignment state
        acquireProjectLock(project.getId());

        // 3. Lock the specific bid row with pessimistic write lock
        bid = myBidRepository.findByIdForUpdate(bidId)
                .orElseThrow(() -> new NoSuchElementException("Bid not found with ID: " + bidId));

        // 4. Verify customer ownership
        verifyCustomerBidOwnership(bid, customer);

        // 5. Verify bid eligibility
        if (bid.getStatus() == MyBid.Status.ACCEPTED) {
            throw new IllegalStateException("Bid #" + bidId + " is already accepted.");
        }
        if (bid.getStatus() == MyBid.Status.ASSIGNMENT_DECLINED) {
            throw new IllegalStateException("Cannot accept a bid whose assignment was previously declined.");
        }
        if (bid.getStatus() == MyBid.Status.WITHDRAWN) {
            throw new IllegalStateException("Cannot accept a withdrawn bid.");
        }

        // 6. Check active assignment constraint (while holding the project-level lock)
        Optional<MyBidAssignment> activeAssignment = myBidAssignmentRepository.findCurrentAssignmentForUpdate(project.getId());
        if (activeAssignment.isPresent() && activeAssignment.get().isCurrent()) {
            throw new IllegalStateException(
                    "Project already has an active assignment (Assignment #" + activeAssignment.get().getId() + "). " +
                    "Cannot accept another bid while an assignment is active."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // 7. Mark accepted bid
        bid.setStatus(MyBid.Status.ACCEPTED);
        bid.setRejectedAt(null);
        myBidRepository.save(bid);

        // 8. Create single active assignment
        MyBidAssignment assignment = new MyBidAssignment();
        assignment.setProject(project);
        assignment.setCustomer(customer);
        assignment.setContractor(bid.getContractor());
        assignment.setAcceptedBid(bid);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);
        assignment.setAcceptedAt(now);
        MyBidAssignment savedAssignment = myBidAssignmentRepository.save(assignment);

        // 9. Mark all other competing project bids as NOT_SELECTED with rejectedAt timestamp
        List<MyBid> projectBids = myBidRepository.findByProjectIdOrderBySubmittedAtDesc(project.getId());
        for (MyBid otherBid : projectBids) {
            if (!otherBid.getId().equals(bid.getId())) {
                if (otherBid.getStatus() == MyBid.Status.PENDING || otherBid.getStatus() == MyBid.Status.NOT_SELECTED) {
                    otherBid.setStatus(MyBid.Status.NOT_SELECTED);
                    otherBid.setRejectedAt(now);
                    myBidRepository.save(otherBid);

                    recordAudit(
                            project,
                            otherBid,
                            customer,
                            "CUSTOMER",
                            MyBidAuditHistory.EventType.BID_NOT_SELECTED,
                            "Bid #" + otherBid.getId() + " marked not selected following acceptance of Bid #" + bid.getId()
                    );
                }
            }
        }

        // 10. Record audit events
        recordAudit(
                project,
                bid,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.BID_ACCEPTED,
                "Customer accepted Bid #" + bid.getId() + " submitted by Contractor " +
                (bid.getContractor() != null ? bid.getContractor().getName() : "Unknown")
        );
        recordAudit(
                project,
                bid,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.ASSIGNMENT_CREATED,
                "Active Assignment #" + savedAssignment.getId() + " created for Project #" + project.getId()
        );

        return savedAssignment;
    }

    // =========================================================================
    // 4. CONTRACTOR DECLINES ASSIGNMENT (Phase 2.1 Project-Level Serialized)
    // =========================================================================

    /**
     * Invoked when an accepted contractor declines the project assignment.
     * Strictly acquires project lock FIRST to preserve lock order hierarchy.
     */
    @Transactional
    public MyBidAssignment declineAssignment(
            MarketplaceBackendApplication.MarketplaceUser contractor,
            Long assignmentId
    ) {
        if (contractor == null || contractor.getId() == null) {
            throw new SecurityException("Authentication required: Valid contractor identity required.");
        }
        if (assignmentId == null) {
            throw new IllegalArgumentException("Assignment ID cannot be null.");
        }

        // 1. Initial lookup to identify associated project
        MyBidAssignment assignment = myBidAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new NoSuchElementException("Assignment not found with ID: " + assignmentId));

        Project project = assignment.getProject();
        if (project == null) {
            throw new IllegalStateException("Assignment is not linked to any project.");
        }

        // 2. CRITICAL CONCURRENCY FIX: Lock the project FIRST
        acquireProjectLock(project.getId());

        // 3. Lock assignment row
        assignment = myBidAssignmentRepository.findByIdForUpdate(assignmentId)
                .orElseThrow(() -> new NoSuchElementException("Assignment not found with ID: " + assignmentId));

        // Contractor authorization check
        if (assignment.getContractor() == null || !assignment.getContractor().getId().equals(contractor.getId())) {
            throw new SecurityException("Forbidden: You are not authorized to decline this assignment.");
        }

        if (!assignment.isCurrent() || assignment.getAssignmentStatus() != MyBidAssignment.Status.ACTIVE) {
            throw new IllegalStateException(
                    "Cannot decline assignment: Assignment is not currently active (Status: " +
                    assignment.getAssignmentStatus() + ", isCurrent: " + assignment.isCurrent() + ")."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // Release assignment
        assignment.setAssignmentStatus(MyBidAssignment.Status.DECLINED);
        assignment.setCurrent(false);
        assignment.setDeclinedAt(now);
        MyBidAssignment updatedAssignment = myBidAssignmentRepository.save(assignment);

        // Update accepted bid without deleting history
        MyBid acceptedBid = assignment.getAcceptedBid();
        if (acceptedBid != null) {
            acceptedBid.setStatus(MyBid.Status.ASSIGNMENT_DECLINED);
            myBidRepository.save(acceptedBid);
        }

        // Record audit events
        recordAudit(
                project,
                acceptedBid,
                contractor,
                "CONTRACTOR",
                MyBidAuditHistory.EventType.ASSIGNMENT_DECLINED,
                "Contractor " + contractor.getName() + " declined Assignment #" + assignment.getId()
        );
        recordAudit(
                project,
                null,
                contractor,
                "CONTRACTOR",
                MyBidAuditHistory.EventType.PROJECT_REOPENED,
                "Project #" + project.getId() + " reopened for contractor selection following assignment decline."
        );

        return updatedAssignment;
    }

    // =========================================================================
    // 5. CUSTOMER REVOKES ACCEPTANCE / TAKE BACK (Phase 2.1 Project-Level Serialized)
    // =========================================================================

    /**
     * Invoked when a customer voluntarily withdraws an active assignment.
     * Strictly acquires project lock FIRST to preserve lock order hierarchy.
     */
    @Transactional
    public MyBidAssignment revokeAcceptance(
            MarketplaceBackendApplication.MarketplaceUser customer,
            Long assignmentId
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }
        if (assignmentId == null) {
            throw new IllegalArgumentException("Assignment ID cannot be null.");
        }

        // 1. Initial lookup to identify associated project
        MyBidAssignment assignment = myBidAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new NoSuchElementException("Assignment not found with ID: " + assignmentId));

        Project project = assignment.getProject();
        if (project == null) {
            throw new IllegalStateException("Assignment is not linked to any project.");
        }

        // 2. CRITICAL CONCURRENCY FIX: Lock the project FIRST
        acquireProjectLock(project.getId());

        // 3. Lock assignment row
        assignment = myBidAssignmentRepository.findByIdForUpdate(assignmentId)
                .orElseThrow(() -> new NoSuchElementException("Assignment not found with ID: " + assignmentId));

        // Customer authorization check
        if (assignment.getCustomer() == null || !assignment.getCustomer().getId().equals(customer.getId())) {
            throw new SecurityException("Forbidden: You are not authorized to revoke this assignment.");
        }

        if (!assignment.isCurrent() || assignment.getAssignmentStatus() != MyBidAssignment.Status.ACTIVE) {
            throw new IllegalStateException(
                    "Cannot revoke assignment: Assignment is not currently active (Status: " +
                    assignment.getAssignmentStatus() + ", isCurrent: " + assignment.isCurrent() + ")."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // Release assignment
        assignment.setAssignmentStatus(MyBidAssignment.Status.REVOKED);
        assignment.setCurrent(false);
        assignment.setRevokedAt(now);
        MyBidAssignment updatedAssignment = myBidAssignmentRepository.save(assignment);

        // Mark previously accepted bid as NOT_SELECTED (preserves bid history)
        MyBid acceptedBid = assignment.getAcceptedBid();
        if (acceptedBid != null) {
            acceptedBid.setStatus(MyBid.Status.NOT_SELECTED);
            acceptedBid.setRejectedAt(now);
            myBidRepository.save(acceptedBid);
        }

        // Record audit events
        recordAudit(
                project,
                acceptedBid,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.ACCEPTANCE_WITHDRAWN,
                "Customer withdrew acceptance for Assignment #" + assignment.getId()
        );
        recordAudit(
                project,
                null,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.PROJECT_REOPENED,
                "Project #" + project.getId() + " reopened following acceptance withdrawal."
        );

        return updatedAssignment;
    }

    // =========================================================================
    // 6. REASSIGN EXISTING BID (Phase 2.1 Project-Level Serialized)
    // =========================================================================

    /**
     * Allows customer to select another existing bid after an assignment decline or revocation.
     * Strictly acquires project lock FIRST to preserve lock order hierarchy.
     */
    @Transactional
    public MyBidAssignment reassignContractor(
            MarketplaceBackendApplication.MarketplaceUser customer,
            Long bidId
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }
        if (bidId == null) {
            throw new IllegalArgumentException("Bid ID cannot be null.");
        }

        // 1. Initial lookup to identify target project
        MyBid bid = myBidRepository.findById(bidId)
                .orElseThrow(() -> new NoSuchElementException("Bid not found with ID: " + bidId));

        Project project = bid.getProject();
        if (project == null) {
            throw new IllegalStateException("Bid is not linked to any project.");
        }

        // 2. CRITICAL CONCURRENCY FIX: Lock the project FIRST
        acquireProjectLock(project.getId());

        // 3. Lock bid row
        bid = myBidRepository.findByIdForUpdate(bidId)
                .orElseThrow(() -> new NoSuchElementException("Bid not found with ID: " + bidId));

        // 4. Customer authorization
        verifyCustomerBidOwnership(bid, customer);

        // 5. Verify project currently has NO active assignment
        Optional<MyBidAssignment> activeAssignment = myBidAssignmentRepository.findCurrentAssignmentForUpdate(project.getId());
        if (activeAssignment.isPresent() && activeAssignment.get().isCurrent()) {
            throw new IllegalStateException(
                    "Cannot reassign: Project already has an active assignment (Assignment #" + activeAssignment.get().getId() + "). " +
                    "Revoke or decline current assignment before reassigning."
            );
        }

        // 6. Verify bid eligibility
        if (bid.getStatus() == MyBid.Status.ASSIGNMENT_DECLINED) {
            throw new IllegalStateException("Cannot reassign to a contractor who previously declined this project.");
        }
        if (bid.getStatus() == MyBid.Status.ACCEPTED) {
            throw new IllegalStateException("Bid is already in ACCEPTED status.");
        }
        if (bid.getStatus() == MyBid.Status.WITHDRAWN) {
            throw new IllegalStateException("Cannot reassign a withdrawn bid.");
        }

        LocalDateTime now = LocalDateTime.now();

        // 7. Mark selected bid as ACCEPTED
        bid.setStatus(MyBid.Status.ACCEPTED);
        bid.setRejectedAt(null);
        myBidRepository.save(bid);

        // 8. Create new active assignment
        MyBidAssignment newAssignment = new MyBidAssignment();
        newAssignment.setProject(project);
        newAssignment.setCustomer(customer);
        newAssignment.setContractor(bid.getContractor());
        newAssignment.setAcceptedBid(bid);
        newAssignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        newAssignment.setCurrent(true);
        newAssignment.setAcceptedAt(now);
        MyBidAssignment savedAssignment = myBidAssignmentRepository.save(newAssignment);

        // 9. Mark other competing project bids as NOT_SELECTED
        List<MyBid> projectBids = myBidRepository.findByProjectIdOrderBySubmittedAtDesc(project.getId());
        for (MyBid otherBid : projectBids) {
            if (!otherBid.getId().equals(bid.getId())) {
                if (otherBid.getStatus() == MyBid.Status.PENDING || otherBid.getStatus() == MyBid.Status.NOT_SELECTED) {
                    otherBid.setStatus(MyBid.Status.NOT_SELECTED);
                    otherBid.setRejectedAt(now);
                    myBidRepository.save(otherBid);

                    recordAudit(
                            project,
                            otherBid,
                            customer,
                            "CUSTOMER",
                            MyBidAuditHistory.EventType.BID_NOT_SELECTED,
                            "Bid #" + otherBid.getId() + " marked not selected following reassignment to Bid #" + bid.getId()
                    );
                }
            }
        }

        // 10. Record audit events
        recordAudit(
                project,
                bid,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.BID_ACCEPTED,
                "Customer accepted Bid #" + bid.getId() + " on reassignment."
        );
        recordAudit(
                project,
                bid,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.ASSIGNMENT_CREATED,
                "Active Assignment #" + savedAssignment.getId() + " created on reassignment."
        );
        recordAudit(
                project,
                bid,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.CONTRACTOR_REASSIGNED,
                "Contractor " + (bid.getContractor() != null ? bid.getContractor().getName() : "Unknown") +
                " reassigned to Project #" + project.getId()
        );

        return savedAssignment;
    }

    // =========================================================================
    // 7. 7-DAY NOT-SELECTED VISIBILITY LOGIC (WITHOUT DATA DELETION)
    // =========================================================================

    /**
     * Determines whether a bid is currently visible on the contractor's active dashboard.
     * Bids that are NOT_SELECTED are visible for 7 days following rejectedAt.
     * Data is NEVER deleted from the database.
     */
    public boolean isBidVisibleToContractor(MyBid bid) {
        if (bid == null) return false;

        // Withdrawn bids are not visible on active contractor dashboard
        if (bid.getStatus() == MyBid.Status.WITHDRAWN) {
            return false;
        }

        // Bids with pending, accepted, or declined status remain visible under their own rules
        if (bid.getStatus() != MyBid.Status.NOT_SELECTED && bid.getStatus() != MyBid.Status.REJECTED) {
            return true;
        }

        // If no rejection timestamp was set, keep visible
        if (bid.getRejectedAt() == null) {
            return true;
        }

        LocalDateTime visibleUntil = bid.getRejectedAt().plusDays(REJECTED_VISIBILITY_DAYS);
        return visibleUntil.isAfter(LocalDateTime.now());
    }

    /**
     * Returns the expiration timestamp for the 7-day visibility window.
     */
    public LocalDateTime getVisibleUntil(MyBid bid) {
        if (bid == null || bid.getRejectedAt() == null) {
            return null;
        }
        return bid.getRejectedAt().plusDays(REJECTED_VISIBILITY_DAYS);
    }

    /**
     * Retrieves bids for a contractor, optionally filtering out expired NOT_SELECTED bids.
     * Even if filtered out from active views, records remain permanently stored in the database.
     */
    public List<MyBid> getContractorBids(
            MarketplaceBackendApplication.MarketplaceUser contractor,
            boolean includeExpiredNotSelected
    ) {
        if (contractor == null || contractor.getId() == null) {
            throw new SecurityException("Authentication required: Valid contractor identity required.");
        }

        List<MyBid> allBids = myBidRepository.findByContractorIdOrderBySubmittedAtDesc(contractor.getId());
        if (includeExpiredNotSelected) {
            return allBids.stream()
                    .filter(b -> b.getStatus() != MyBid.Status.WITHDRAWN)
                    .toList();
        }

        return allBids.stream()
                .filter(this::isBidVisibleToContractor)
                .toList();
    }

    // =========================================================================
    // 8. CONTRACTOR "MY CONTRACTS" & CUSTOMER ASSIGNMENT RETRIEVAL
    // =========================================================================

    /**
     * Retrieves ONLY currently active assignments for the authenticated contractor.
     * Excludes declined, revoked, or completed historical assignments.
     */
    public List<MyBidAssignment> getMyContracts(
            MarketplaceBackendApplication.MarketplaceUser contractor
    ) {
        if (contractor == null || contractor.getId() == null) {
            throw new SecurityException("Authentication required: Valid contractor identity required.");
        }

        return myBidAssignmentRepository.findByContractorIdAndIsCurrentTrueOrderByAcceptedAtDesc(contractor.getId());
    }

    /**
     * Retrieves all current active assignments for a customer across their projects.
     */
    public List<MyBidAssignment> getCustomerActiveAssignments(
            MarketplaceBackendApplication.MarketplaceUser customer
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }

        return myBidAssignmentRepository.findByCustomerIdAndIsCurrentTrueOrderByAcceptedAtDesc(customer.getId());
    }

    /**
     * Retrieves the current active assignment for a customer's specific project, if any.
     */
    public Optional<MyBidAssignment> getCustomerProjectAssignment(
            MarketplaceBackendApplication.MarketplaceUser customer,
            Long projectId
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID cannot be null.");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found with ID: " + projectId));

        verifyCustomerProjectOwnership(project, customer);

        return myBidAssignmentRepository.findByProjectIdAndIsCurrentTrue(projectId);
    }

    /**
     * Lightweight active assignment existence check by project ID.
     * Does NOT dereference lazy associations, reload Project entity, or alter any state.
     */
    public boolean hasActiveAssignment(Long projectId) {
        if (projectId == null) {
            return false;
        }
        return myBidAssignmentRepository.existsByProjectIdAndIsCurrentTrue(projectId);
    }

    // =========================================================================
    // 9. AUDIT HISTORY & GENERAL LOOKUPS
    // =========================================================================

    /**
     * Retrieves the immutable audit history for a project.
     * Authorized for:
     * - The customer who owns the project
     * - Contractors who submitted a bid on the project
     */
    public List<MyBidAuditHistory> getProjectAuditHistory(
            MarketplaceBackendApplication.MarketplaceUser user,
            Long projectId
    ) {
        if (user == null || user.getId() == null) {
            throw new SecurityException("Authentication required.");
        }
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID cannot be null.");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found with ID: " + projectId));

        boolean isCustomerOwner = project.getCustomer() != null && project.getCustomer().getId().equals(user.getId());
        if (!isCustomerOwner) {
            boolean isParticipatingContractor = myBidRepository.findByProjectIdOrderBySubmittedAtDesc(projectId)
                    .stream()
                    .anyMatch(b -> b.getContractor() != null && b.getContractor().getId().equals(user.getId()));
            if (!isParticipatingContractor) {
                throw new SecurityException("Forbidden: You are not authorized to view this project's audit history.");
            }
        }

        return myBidAuditHistoryRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
    }

    public Optional<MyBid> getBidById(Long bidId) {
        if (bidId == null) return Optional.empty();
        return myBidRepository.findById(bidId);
    }

    public Optional<MyBidAssignment> getAssignmentById(Long assignmentId) {
        if (assignmentId == null) return Optional.empty();
        return myBidAssignmentRepository.findById(assignmentId);
    }

    /**
     * Updates an existing pending contractor bid.
     * Original submission timestamp (submittedAt) is strictly preserved.
     */
    @Transactional
    public MyBid updateBid(
            MarketplaceBackendApplication.MarketplaceUser contractor,
            Long bidId,
            UpdateBidRequest request
    ) {
        if (contractor == null || contractor.getId() == null) {
            throw new SecurityException("Authentication required: Valid contractor identity required.");
        }
        if (!isContractor(contractor)) {
            throw new SecurityException("Forbidden: User does not hold the CONTRACTOR role.");
        }
        if (bidId == null) {
            throw new IllegalArgumentException("Bid ID cannot be null.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Update request cannot be null.");
        }

        MyBid bid = myBidRepository.findById(bidId)
                .orElseThrow(() -> new NoSuchElementException("Bid not found with ID: " + bidId));

        if (bid.getContractor() == null || !bid.getContractor().getId().equals(contractor.getId())) {
            throw new SecurityException("Forbidden: You are not authorized to edit this bid.");
        }

        if (bid.getStatus() != MyBid.Status.PENDING) {
            throw new IllegalStateException("Only PENDING bids can be edited. Current status: " + bid.getStatus());
        }

        if (request.getBidAmount() != null) {
            if (request.getBidAmount() <= 0) {
                throw new IllegalArgumentException("Valid positive bid amount is required.");
            }
            bid.setBidAmount(request.getBidAmount());
        }
        if (request.getMaterialCost() != null) bid.setMaterialCost(request.getMaterialCost());
        if (request.getLabourCost() != null) bid.setLabourCost(request.getLabourCost());
        if (request.getEquipmentCost() != null) bid.setEquipmentCost(request.getEquipmentCost());
        if (request.getTransportCost() != null) bid.setTransportCost(request.getTransportCost());
        if (request.getOtherCharges() != null) bid.setOtherCharges(request.getOtherCharges());
        if (request.getEstimatedDuration() != null) bid.setEstimatedDuration(request.getEstimatedDuration());
        if (request.getProposedTimeline() != null) bid.setProposedTimeline(request.getProposedTimeline());
        if (request.getWorkersCount() != null) bid.setWorkersCount(request.getWorkersCount());
        if (request.getScopeOfWork() != null) bid.setScopeOfWork(request.getScopeOfWork());
        if (request.getIncludedWork() != null) bid.setIncludedWork(request.getIncludedWork());
        if (request.getExcludedWork() != null) bid.setExcludedWork(request.getExcludedWork());
        if (request.getPaymentTerms() != null) bid.setPaymentTerms(request.getPaymentTerms());
        if (request.getWarranty() != null) bid.setWarranty(request.getWarranty());
        if (request.getRemarks() != null) bid.setRemarks(request.getRemarks());
        if (request.getDescriptionEn() != null) bid.setDescriptionEn(request.getDescriptionEn());
        if (request.getDescriptionHi() != null) bid.setDescriptionHi(request.getDescriptionHi());

        // submittedAt MUST NEVER BE CHANGED - only updatedAt updates
        bid.setUpdatedAt(LocalDateTime.now());

        MyBid updatedBid = myBidRepository.save(bid);

        recordAudit(
                bid.getProject(),
                updatedBid,
                contractor,
                "CONTRACTOR",
                MyBidAuditHistory.EventType.BID_UPDATED,
                "Contractor " + contractor.getName() + " updated Bid #" + bid.getId() + " to ₹" + updatedBid.getBidAmount()
        );

        return updatedBid;
    }

    /**
     * Withdraws a contractor bid from active consideration.
     */
    @Transactional
    public MyBid withdrawBid(
            MarketplaceBackendApplication.MarketplaceUser contractor,
            Long bidId
    ) {
        if (contractor == null || contractor.getId() == null) {
            throw new SecurityException("Authentication required: Valid contractor identity required.");
        }
        if (!isContractor(contractor)) {
            throw new SecurityException("Forbidden: User does not hold the CONTRACTOR role.");
        }
        if (bidId == null) {
            throw new IllegalArgumentException("Bid ID cannot be null.");
        }

        MyBid bid = myBidRepository.findById(bidId)
                .orElseThrow(() -> new NoSuchElementException("Bid not found with ID: " + bidId));

        if (bid.getContractor() == null || !bid.getContractor().getId().equals(contractor.getId())) {
            throw new SecurityException("Forbidden: You are not authorized to withdraw this bid.");
        }

        if (bid.getStatus() == MyBid.Status.ACCEPTED) {
            throw new IllegalStateException("Cannot withdraw an ACCEPTED bid.");
        }
        if (bid.getStatus() == MyBid.Status.REJECTED) {
            throw new IllegalStateException("Cannot withdraw a REJECTED bid.");
        }
        if (bid.getStatus() == MyBid.Status.WITHDRAWN) {
            throw new IllegalStateException("Cannot withdraw a WITHDRAWN bid.");
        }

        bid.setStatus(MyBid.Status.WITHDRAWN);
        bid.setUpdatedAt(LocalDateTime.now());

        MyBid saved = myBidRepository.save(bid);

        recordAudit(
                bid.getProject(),
                saved,
                contractor,
                "CONTRACTOR",
                MyBidAuditHistory.EventType.BID_WITHDRAWN,
                "Contractor " + contractor.getName() + " withdrew Bid #" + bid.getId()
        );

        return saved;
    }

    /**
     * Customer explicitly rejects a contractor bid on their project.
     * Retains the bid in history and sets rejectedAt.
     */
    @Transactional
    public MyBid rejectBid(
            MarketplaceBackendApplication.MarketplaceUser customer,
            Long bidId
    ) {
        if (customer == null || customer.getId() == null) {
            throw new SecurityException("Authentication required: Valid customer identity required.");
        }
        if (bidId == null) {
            throw new IllegalArgumentException("Bid ID cannot be null.");
        }

        MyBid bid = myBidRepository.findById(bidId)
                .orElseThrow(() -> new NoSuchElementException("Bid not found with ID: " + bidId));

        verifyCustomerBidOwnership(bid, customer);

        if (bid.getStatus() == MyBid.Status.ACCEPTED) {
            throw new IllegalStateException("Cannot reject an already accepted bid.");
        }

        LocalDateTime now = LocalDateTime.now();
        bid.setStatus(MyBid.Status.REJECTED);
        bid.setRejectedAt(now);
        bid.setUpdatedAt(now);

        MyBid saved = myBidRepository.save(bid);

        recordAudit(
                bid.getProject(),
                saved,
                customer,
                "CUSTOMER",
                MyBidAuditHistory.EventType.BID_REJECTED,
                "Customer rejected Bid #" + bid.getId()
        );

        return saved;
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private boolean isContractor(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().contains(MarketplaceBackendApplication.Role.CONTRACTOR);
    }

    private void verifyCustomerProjectOwnership(
            Project project,
            MarketplaceBackendApplication.MarketplaceUser customer
    ) {
        if (project.getCustomer() == null || !project.getCustomer().getId().equals(customer.getId())) {
            throw new SecurityException("Forbidden: Customer does not own Project #" + project.getId());
        }
    }

    private void verifyCustomerBidOwnership(
            MyBid bid,
            MarketplaceBackendApplication.MarketplaceUser customer
    ) {
        if (bid.getCustomer() == null || !bid.getCustomer().getId().equals(customer.getId())) {
            throw new SecurityException("Forbidden: Bid does not belong to authenticated customer.");
        }
        if (bid.getProject() != null) {
            verifyCustomerProjectOwnership(bid.getProject(), customer);
        }
    }

    private void recordAudit(
            Project project,
            MyBid bid,
            MarketplaceBackendApplication.MarketplaceUser actor,
            String actorRole,
            MyBidAuditHistory.EventType eventType,
            String description
    ) {
        MyBidAuditHistory history = new MyBidAuditHistory(
                project,
                bid,
                actor,
                actorRole,
                eventType,
                description
        );
        myBidAuditHistoryRepository.save(history);
    }
}
