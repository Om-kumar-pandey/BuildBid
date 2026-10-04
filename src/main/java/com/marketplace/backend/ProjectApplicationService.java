package com.marketplace.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * BUILDBID — PROJECT PROFESSIONAL APPLICATION SERVICE
 * 
 * Provides secure business logic for:
 * 1. Trade eligibility resolution and trade normalization.
 * 2. Discovery of eligible Post Requirements by authenticated professionals.
 * 3. Viewing individual Post Requirement details and trade capacity quotas.
 * 4. Submitting trade-specific applications with duplicate and capacity guards.
 * 5. Requester viewing of applications filtered/grouped by trade.
 * 6. Concurrency-safe acceptance and status updates respecting trade quotas.
 */
@Service
public class ProjectApplicationService {

    private final ProjectRepository projectRepository;
    private final ProjectProfessionalApplicationRepository applicationRepository;
    private final ProfessionalServiceRepository professionalServiceRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    public ProjectApplicationService(
            ProjectRepository projectRepository,
            ProjectProfessionalApplicationRepository applicationRepository,
            ProfessionalServiceRepository professionalServiceRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this(projectRepository, applicationRepository, professionalServiceRepository, userRepository, objectMapper, null);
    }

    @Autowired
    public ProjectApplicationService(
            ProjectRepository projectRepository,
            ProjectProfessionalApplicationRepository applicationRepository,
            ProfessionalServiceRepository professionalServiceRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            ObjectMapper objectMapper,
            @Autowired(required = false) NotificationService notificationService
    ) {
        this.projectRepository = projectRepository;
        this.applicationRepository = applicationRepository;
        this.professionalServiceRepository = professionalServiceRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
    }

    // ========================================================
    // 1. TRADE NORMALIZATION & RESOLUTION
    // ========================================================

    /**
     * Normalizes a trade string for safe, case-insensitive, alias-aware comparisons.
     */
    public static String normalizeTrade(String trade) {
        if (trade == null) return "";
        String t = trade.trim().toLowerCase();
        t = t.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();

        if (t.contains("labour") || t.contains("labor") || t.equals("helper") || t.contains("shramik") || t.contains("mazdoor")) {
            return "labour";
        }
        if (t.contains("electric")) {
            return "electrician";
        }
        if (t.contains("plumb")) {
            return "plumber";
        }
        if (t.contains("mason") || t.contains("mistri") || t.contains("rajmistri") || t.contains("tile")) {
            return "mason";
        }
        if (t.contains("paint")) {
            return "painter";
        }
        if (t.contains("carpent")) {
            return "carpenter";
        }
        if (t.contains("garden")) {
            return "gardener";
        }
        if (t.contains("architect")) {
            return "architect";
        }
        if (t.contains("interior")) {
            return "interior designer";
        }
        if (t.contains("engineer")) {
            return "engineer";
        }
        return t;
    }

    /**
     * Resolves all verified/eligible normalized trades for an authenticated professional
     * based on their active published services in ProfessionalServiceRepository.
     */
    public Set<String> getEligibleTradesForProfessional(MarketplaceBackendApplication.MarketplaceUser pro) {
        Set<String> eligibleTrades = new HashSet<>();
        if (pro == null || pro.getId() == null) {
            return eligibleTrades;
        }

        List<ProfessionalService> services = professionalServiceRepository.findByProfessional_IdAndActiveTrue(pro.getId());
        for (ProfessionalService ps : services) {
            // Must not be pending or rejected credential services
            boolean isEligible = !ps.isVerificationRequired()
                    || ps.getVerificationStatus() == VerificationStatus.VERIFIED
                    || ps.getVerificationStatus() == VerificationStatus.NOT_REQUIRED;

            if (isEligible) {
                if (ps.getMasterService() != null && ps.getMasterService().getTitleEn() != null) {
                    eligibleTrades.add(normalizeTrade(ps.getMasterService().getTitleEn()));
                }
                if (ps.getServiceTitleEn() != null) {
                    eligibleTrades.add(normalizeTrade(ps.getServiceTitleEn()));
                }
                if (ps.getMasterService() != null && ps.getMasterService().getCategory() != null) {
                    eligibleTrades.add(normalizeTrade(ps.getMasterService().getCategory().getNameEn()));
                }
            }
        }
        return eligibleTrades;
    }

    /**
     * Checks if a target trade is within the professional's eligible trades.
     */
    public boolean isTradeEligible(String tradeRole, Set<String> eligibleTrades) {
        if (tradeRole == null || eligibleTrades == null || eligibleTrades.isEmpty()) {
            return false;
        }
        String normalizedTarget = normalizeTrade(tradeRole);
        return eligibleTrades.contains(normalizedTarget);
    }

    // ========================================================
    // 2. PROJECT TRADE EXTRACTION
    // ========================================================

    /**
     * Safely extracts trade requirements and requested quantities from a Project
     * by parsing completeDataJson, requirements map, and fallback project properties.
     */
    public List<TradeRequirementSummaryDto> extractTradeRequirements(Project project, Set<String> proEligibleTrades) {
        List<TradeRequirementSummaryDto> list = new ArrayList<>();
        if (project == null) return list;

        Map<String, TradeRequirementSummaryDto> tradeMap = new LinkedHashMap<>();

        // 1. Primary: parse completeDataJson -> requestedProfessionals array
        String json = project.getCompleteDataJson();
        if (json != null && !json.isBlank()) {
            try {
                Map<?, ?> root = objectMapper.readValue(json, Map.class);
                Object reqPros = root.get("requestedProfessionals");
                if (reqPros instanceof List<?> proList) {
                    for (Object item : proList) {
                        if (item instanceof Map<?, ?> itemMap) {
                            String role = itemMap.get("role") != null ? itemMap.get("role").toString().trim() : "";
                            String customRole = itemMap.get("customRole") != null ? itemMap.get("customRole").toString().trim() : null;
                            String effectiveRole = (role.equalsIgnoreCase("Other") && customRole != null && !customRole.isBlank()) ? customRole : role;
                            if (effectiveRole.isBlank() && customRole != null) effectiveRole = customRole;
                            if (effectiveRole.isBlank()) effectiveRole = "General Construction";

                            int qty = 1;
                            if (itemMap.get("quantity") != null) {
                                try {
                                    qty = Integer.parseInt(itemMap.get("quantity").toString().trim());
                                } catch (NumberFormatException ignored) {}
                            }
                            if (qty < 1) qty = 1;

                            Double offerAmount = null;
                            if (itemMap.get("offerAmount") != null) {
                                try {
                                    offerAmount = Double.parseDouble(itemMap.get("offerAmount").toString().trim());
                                } catch (NumberFormatException ignored) {}
                            }

                            String offerType = itemMap.get("offerType") != null ? itemMap.get("offerType").toString().trim() : "Per Day";

                            String normKey = normalizeTrade(effectiveRole);
                            if (!tradeMap.containsKey(normKey)) {
                                tradeMap.put(normKey, new TradeRequirementSummaryDto(
                                        effectiveRole,
                                        qty,
                                        0L,
                                        qty,
                                        offerAmount,
                                        offerType,
                                        false,
                                        false
                                ));
                            } else {
                                TradeRequirementSummaryDto existing = tradeMap.get(normKey);
                                existing.setRequiredQuantity(existing.getRequiredQuantity() + qty);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        // 2. Secondary fallback: project_requirements map (legacy)
        if (tradeMap.isEmpty() && project.getRequirements() != null && !project.getRequirements().isEmpty()) {
            for (Map.Entry<String, Boolean> entry : project.getRequirements().entrySet()) {
                if (Boolean.TRUE.equals(entry.getValue()) && entry.getKey() != null && !entry.getKey().isBlank()) {
                    String normKey = normalizeTrade(entry.getKey());
                    if (!tradeMap.containsKey(normKey)) {
                        tradeMap.put(normKey, new TradeRequirementSummaryDto(
                                entry.getKey().trim(),
                                1,
                                0L,
                                1,
                                null,
                                "Per Day",
                                false,
                                false
                        ));
                    }
                }
            }
        }

        // 3. Tertiary fallback: projectType / projectTitle if still empty
        if (tradeMap.isEmpty()) {
            String candidateRole = project.getProjectType() != null && !project.getProjectType().isBlank()
                    ? project.getProjectType().trim()
                    : (project.getType() != null ? project.getType().trim() : "General Construction");
            String normKey = normalizeTrade(candidateRole);
            tradeMap.put(normKey, new TradeRequirementSummaryDto(
                    candidateRole,
                    1,
                    0L,
                    1,
                    null,
                    "Per Day",
                    false,
                    false
            ));
        }

        // Compute accepted and remaining quantities for each trade
        for (TradeRequirementSummaryDto dto : tradeMap.values()) {
            long accepted = 0;
            if (project.getId() != null) {
                accepted = applicationRepository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(
                        project.getId(),
                        dto.getTradeRole(),
                        ProjectProfessionalApplication.Status.ACCEPTED
                );
            }
            dto.setAcceptedQuantity(accepted);
            long remaining = Math.max(0, dto.getRequiredQuantity() - accepted);
            dto.setRemainingQuantity(remaining);
            dto.setFilled(remaining == 0);
            dto.setEligible(proEligibleTrades != null && isTradeEligible(dto.getTradeRole(), proEligibleTrades));
            list.add(dto);
        }

        return list;
    }

    // ========================================================
    // 3. PROJECT RESOLUTION
    // ========================================================

    public Project resolveProject(String id) {
        if (id == null || id.isBlank()) return null;
        try {
            Long numericId = Long.parseLong(id.trim());
            Optional<Project> p = projectRepository.findById(numericId);
            if (p.isPresent()) return p.get();
        } catch (NumberFormatException ignored) {}

        Optional<Project> byProjectId = projectRepository.findByProjectId(id.trim());
        if (byProjectId.isPresent()) return byProjectId.get();

        for (Project p : projectRepository.findAll()) {
            if (id.trim().equalsIgnoreCase(p.getProjectId())) {
                return p;
            }
        }
        return null;
    }

    // ========================================================
    // 3B. POST REQUIREMENT MATCH NOTIFICATIONS (STEP 11A)
    // ========================================================

    /**
     * POST REQUIREMENT MATCH NOTIFICATION (STEP 11A)
     * Scans candidate professionals, evaluates trade eligibility, and dispatches
     * exactly ONE POST_REQUIREMENT_MATCH notification per eligible professional.
     */
    @Transactional
    public List<Notification> notifyMatchingProfessionals(Project project) {
        if (project == null || notificationService == null) {
            return Collections.emptyList();
        }

        // Only notify if project is OPEN
        if (project.getStatus() != null && !"OPEN".equalsIgnoreCase(project.getStatus())) {
            return Collections.emptyList();
        }

        String projectId = project.getProjectId() != null ? project.getProjectId() : ("PRJ-" + project.getId());
        Long ownerId = (project.getCustomer() != null) ? project.getCustomer().getId() : null;

        // Gather candidate professionals
        Set<MarketplaceBackendApplication.MarketplaceUser> candidatePros = new LinkedHashSet<>();
        try {
            List<ProfessionalService> activeServices = professionalServiceRepository.findByActiveTrue();
            if (activeServices != null) {
                for (ProfessionalService ps : activeServices) {
                    if (ps.getProfessional() != null) {
                        candidatePros.add(ps.getProfessional());
                    }
                }
            }
        } catch (Exception ignored) {}

        try {
            List<MarketplaceBackendApplication.MarketplaceUser> allUsers = userRepository.findAll();
            if (allUsers != null) {
                for (MarketplaceBackendApplication.MarketplaceUser u : allUsers) {
                    if (u.getRoles() != null &&
                            (u.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL) ||
                             u.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER))) {
                        candidatePros.add(u);
                    }
                }
            }
        } catch (Exception ignored) {}

        List<Notification> createdNotifications = new ArrayList<>();

        for (MarketplaceBackendApplication.MarketplaceUser pro : candidatePros) {
            if (pro == null || pro.getId() == null) continue;

            // 1. Requester cannot receive match notification for own project
            if (ownerId != null && ownerId.equals(pro.getId())) {
                continue;
            }

            // 2. Must have professional role
            if (pro.getRoles() == null ||
                    (!pro.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL) &&
                     !pro.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER))) {
                continue;
            }

            // 3. Trade eligibility: check verified/active trades
            Set<String> proEligibleTrades = getEligibleTradesForProfessional(pro);
            if (proEligibleTrades == null || proEligibleTrades.isEmpty()) {
                continue;
            }

            // 4. Extract trade requirements from project
            List<TradeRequirementSummaryDto> projectTrades = extractTradeRequirements(project, proEligibleTrades);
            List<String> matchingTradeNames = new ArrayList<>();
            for (TradeRequirementSummaryDto ts : projectTrades) {
                if (ts.isEligible()) {
                    matchingTradeNames.add(ts.getTradeRole());
                }
            }

            if (matchingTradeNames.isEmpty()) {
                // Not eligible for any trade in this project
                continue;
            }

            // 5. Deduplication: Check if notification already exists for this pro and project
            if (notificationService.existsNotification(
                    pro.getId(),
                    "POST_REQUIREMENT_MATCH",
                    projectId
            )) {
                continue;
            }

            // 6. Create single consolidated notification for this professional
            String tradeListStr = String.join(", ", matchingTradeNames);
            String title = "New Work Opportunity";
            String titleHi = "नया कार्य अवसर";
            String msg = "A new " + tradeListStr + " opportunity is available for " + projectId + ".";
            String msgHi = "परियोजना " + projectId + " के लिए एक नया " + tradeListStr + " अवसर उपलब्ध है।";

            Notification n = notificationService.createNotification(
                    pro,
                    title,
                    titleHi,
                    msg,
                    msgHi,
                    "POST_REQUIREMENT_MATCH",
                    projectId
            );
            if (n != null) {
                createdNotifications.add(n);
            }
        }

        return createdNotifications;
    }

    // ========================================================
    // 4. PROFESSIONAL REQUIREMENTS DISCOVERY (GET)
    // ========================================================

    /**
     * GET /api/professional/requirements
     * Returns OPEN Post Requirements matching the authenticated professional's eligible trades.
     */
    @Transactional(readOnly = true)
    public List<ProfessionalRequirementDto> getEligibleRequirementsForProfessional(MarketplaceBackendApplication.MarketplaceUser pro) {
        verifyProfessionalRole(pro);

        Set<String> eligibleTrades = getEligibleTradesForProfessional(pro);
        List<Project> openProjects = projectRepository.findByStatusOrderByCreatedAtDesc("OPEN");
        List<ProfessionalRequirementDto> result = new ArrayList<>();

        for (Project p : openProjects) {
            // Rule: Professional cannot discover/apply to own project
            if (p.getCustomer() != null && p.getCustomer().getId().equals(pro.getId())) {
                continue;
            }

            List<TradeRequirementSummaryDto> tradeSummaries = extractTradeRequirements(p, eligibleTrades);

            // Filter: project must contain at least one trade matching the professional's eligibility
            boolean hasEligibleTrade = false;
            for (TradeRequirementSummaryDto ts : tradeSummaries) {
                if (ts.isEligible()) {
                    hasEligibleTrade = true;
                    break;
                }
            }

            if (!hasEligibleTrade) {
                continue;
            }

            // Check if professional has already applied
            Optional<ProjectProfessionalApplication> appOpt = applicationRepository.findByProjectIdAndProfessionalId(p.getId(), pro.getId());

            ProfessionalRequirementDto dto = new ProfessionalRequirementDto();
            dto.setProjectId(p.getProjectId() != null ? p.getProjectId() : ("PRJ-" + p.getId()));
            dto.setProjectTitle(p.getProjectTitle() != null ? p.getProjectTitle() : p.getTitle());
            dto.setProjectType(p.getProjectType() != null ? p.getProjectType() : p.getType());
            dto.setLocation(formatProjectLocation(p));
            dto.setStartDate(p.getTargetStartDate() != null ? p.getTargetStartDate() : p.getTimeline());
            dto.setDescription(p.getDescription());
            dto.setStatus(p.getStatus());
            dto.setTradeRequirements(tradeSummaries);
            dto.setCreatedAt(p.getCreatedAt());

            if (appOpt.isPresent()) {
                ProjectProfessionalApplication app = appOpt.get();
                dto.setHasApplied(true);
                dto.setAppliedTradeRole(app.getTradeRole());
                dto.setApplicationStatus(app.getStatus().name());
                dto.setApplicationId(app.getApplicationId());
            } else {
                dto.setHasApplied(false);
            }

            result.add(dto);
        }

        return result;
    }

    // ========================================================
    // 5. PROFESSIONAL REQUIREMENT DETAILS (GET)
    // ========================================================

    /**
     * GET /api/professional/requirements/{projectId}
     * Returns details and trade breakdown of ONE Post Requirement for authenticated professional.
     */
    @Transactional(readOnly = true)
    public ProfessionalRequirementDetailDto getRequirementDetailsForProfessional(String projectId, MarketplaceBackendApplication.MarketplaceUser pro) {
        verifyProfessionalRole(pro);

        Project project = resolveProject(projectId);
        if (project == null) {
            throw new NoSuchElementException("Project not found with ID: " + projectId);
        }

        if (!"OPEN".equalsIgnoreCase(project.getStatus())) {
            throw new IllegalStateException("Project is not open for applications (Status: " + project.getStatus() + ")");
        }

        Set<String> eligibleTrades = getEligibleTradesForProfessional(pro);
        List<TradeRequirementSummaryDto> tradeSummaries = extractTradeRequirements(project, eligibleTrades);

        Optional<ProjectProfessionalApplication> appOpt = applicationRepository.findByProjectIdAndProfessionalId(project.getId(), pro.getId());

        ProfessionalRequirementDetailDto dto = new ProfessionalRequirementDetailDto();
        dto.setProjectId(project.getProjectId() != null ? project.getProjectId() : ("PRJ-" + project.getId()));
        dto.setProjectTitle(project.getProjectTitle() != null ? project.getProjectTitle() : project.getTitle());
        dto.setProjectType(project.getProjectType() != null ? project.getProjectType() : project.getType());
        dto.setLocation(formatProjectLocation(project));
        dto.setStartDate(project.getTargetStartDate() != null ? project.getTargetStartDate() : project.getTimeline());
        dto.setDescription(project.getDescription());
        dto.setStatus(project.getStatus());
        dto.setTradeRequirements(tradeSummaries);
        dto.setCreatedAt(project.getCreatedAt());

        if (appOpt.isPresent()) {
            dto.setHasApplied(true);
            dto.setMyApplication(ProjectProfessionalApplicationDto.fromEntity(appOpt.get()));
        } else {
            dto.setHasApplied(false);
        }

        return dto;
    }

    // ========================================================
    // 6. APPLY / SUBMIT QUOTATION (POST)
    // ========================================================

    /**
     * POST /api/professional/requirements/{projectId}/apply
     * Submits a trade-specific application. Enforces all 15 validation rules.
     */
    @Transactional
    public ProjectProfessionalApplicationDto applyToRequirement(
            String projectId,
            ApplicationSubmissionDto submission,
            MarketplaceBackendApplication.MarketplaceUser pro
    ) {
        // 1 & 2. Role validation
        verifyProfessionalRole(pro);

        // 3. Project exists
        Project project = resolveProject(projectId);
        if (project == null) {
            throw new NoSuchElementException("Project not found with ID: " + projectId);
        }

        // 4 & 5. Project is OPEN
        if (!"OPEN".equalsIgnoreCase(project.getStatus())) {
            throw new IllegalStateException("Project is not open for applications (Current status: " + project.getStatus() + ")");
        }

        // 6. Professional is not the requester
        if (project.getCustomer() != null && project.getCustomer().getId().equals(pro.getId())) {
            throw new SecurityException("You cannot apply to your own requirement");
        }

        // 10. Duplicate protection
        if (applicationRepository.existsByProjectIdAndProfessionalId(project.getId(), pro.getId())) {
            throw new IllegalStateException("You have already submitted an application for this requirement");
        }

        // 11, 12, 13, 14. Input validation
        if (submission == null) {
            throw new IllegalArgumentException("Application submission payload is required");
        }
        if (submission.getTradeRole() == null || submission.getTradeRole().isBlank()) {
            throw new IllegalArgumentException("Trade role is required");
        }
        if (submission.getProposedRate() == null || submission.getProposedRate() <= 0) {
            throw new IllegalArgumentException("Proposed rate must be greater than zero");
        }
        String rateType = (submission.getRateType() != null && !submission.getRateType().isBlank())
                ? submission.getRateType().trim().toUpperCase()
                : "PER_DAY";
        int teamSize = (submission.getTeamSize() != null && submission.getTeamSize() > 0)
                ? submission.getTeamSize()
                : 1;

        // 8. Submitted trade actually exists in the project's requested requirements
        Set<String> eligibleTrades = getEligibleTradesForProfessional(pro);
        List<TradeRequirementSummaryDto> projectTrades = extractTradeRequirements(project, eligibleTrades);

        TradeRequirementSummaryDto matchedTrade = null;
        for (TradeRequirementSummaryDto pt : projectTrades) {
            if (normalizeTrade(pt.getTradeRole()).equals(normalizeTrade(submission.getTradeRole()))) {
                matchedTrade = pt;
                break;
            }
        }

        if (matchedTrade == null) {
            throw new IllegalArgumentException("Trade '" + submission.getTradeRole() + "' is not requested in this project");
        }

        // 7. Professional is eligible for the submitted trade
        if (!isTradeEligible(submission.getTradeRole(), eligibleTrades)) {
            throw new SecurityException("Professional is not eligible for trade '" + submission.getTradeRole()
                    + "'. Verified services required in this trade.");
        }

        // 9. That trade still has remaining quantity
        long acceptedCount = applicationRepository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(
                project.getId(),
                matchedTrade.getTradeRole(),
                ProjectProfessionalApplication.Status.ACCEPTED
        );
        if (acceptedCount >= matchedTrade.getRequiredQuantity()) {
            throw new IllegalStateException("Required quantity for this trade has already been fulfilled");
        }

        // Create and save application
        ProjectProfessionalApplication application = new ProjectProfessionalApplication(
                project,
                pro,
                matchedTrade.getTradeRole(),
                submission.getProposedRate(),
                rateType,
                teamSize,
                submission.getEstimatedDuration() != null ? submission.getEstimatedDuration().trim() : null,
                submission.getCoverMessage() != null ? submission.getCoverMessage().trim() : null
        );

        ProjectProfessionalApplication saved = applicationRepository.save(application);

        // POST REQUIREMENT APPLICATION NOTIFICATION (STEP 11C)
        if (notificationService != null && project.getCustomer() != null) {
            String projId = project.getProjectId() != null ? project.getProjectId() : ("PRJ-" + project.getId());
            notificationService.createNotification(
                    project.getCustomer(),
                    "New Professional Quotation",
                    "नया प्रोफेशनल कोटेशन",
                    "A professional has submitted a quotation for your " + projId + " requirement.",
                    "एक प्रोफेशनल ने आपकी " + projId + " आवश्यकता के लिए कोटेशन प्रस्तुत किया है।",
                    "POST_REQUIREMENT_APPLICATION",
                    saved.getApplicationId()
            );
        }

        return ProjectProfessionalApplicationDto.fromEntity(saved);
    }

    // ========================================================
    // 7. REQUESTER APPLICATIONS (GET)
    // ========================================================

    /**
     * GET /api/requester/requirements/{projectId}/applications
     * Requester fetches candidate applications for their owned Project.
     */
    @Transactional(readOnly = true)
    public List<RequesterApplicationDto> getApplicationsForRequester(
            String projectId,
            String tradeRoleFilter,
            MarketplaceBackendApplication.MarketplaceUser requester
    ) {
        verifyRequesterRole(requester);

        Project project = resolveProject(projectId);
        if (project == null) {
            throw new NoSuchElementException("Project not found with ID: " + projectId);
        }

        // Strict ownership verification
        if (project.getCustomer() == null || !project.getCustomer().getId().equals(requester.getId())) {
            throw new SecurityException("Access denied. You do not own this project requirement.");
        }

        List<ProjectProfessionalApplication> apps;
        if (tradeRoleFilter != null && !tradeRoleFilter.isBlank()) {
            apps = applicationRepository.findByProjectIdAndTradeRoleIgnoreCaseOrderByCreatedAtDesc(
                    project.getId(),
                    tradeRoleFilter.trim()
            );
        } else {
            apps = applicationRepository.findByProjectIdOrderByCreatedAtDesc(project.getId());
        }

        List<RequesterApplicationDto> result = new ArrayList<>();
        for (ProjectProfessionalApplication app : apps) {
            result.add(RequesterApplicationDto.fromEntity(app));
        }
        return result;
    }

    // ========================================================
    // 8. ACCEPT / REJECT APPLICATION (PATCH)
    // ========================================================

    /**
     * PATCH /api/requester/applications/{applicationId}/status
     * Requester updates application status (ACCEPTED, REJECTED, SHORTLISTED).
     * Enforces concurrency-safe trade capacity checks.
     */
    @Transactional
    public RequesterApplicationDto updateApplicationStatus(
            String applicationId,
            ApplicationStatusUpdateDto updateDto,
            MarketplaceBackendApplication.MarketplaceUser requester
    ) {
        verifyRequesterRole(requester);

        if (updateDto == null || updateDto.getStatus() == null || updateDto.getStatus().isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }

        // Pessimistic lock on the target application
        ProjectProfessionalApplication app = applicationRepository.findByApplicationIdForUpdate(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found with ID: " + applicationId));

        Project project = app.getProject();
        if (project == null) {
            throw new NoSuchElementException("Associated project not found for application: " + applicationId);
        }

        // Pessimistic lock on project to serialize concurrent acceptance attempts
        projectRepository.findByIdForUpdate(project.getId())
                .orElseThrow(() -> new NoSuchElementException("Project not found"));

        // Strict ownership check
        if (project.getCustomer() == null || !project.getCustomer().getId().equals(requester.getId())) {
            throw new SecurityException("Access denied. You do not own the project for this application.");
        }

        ProjectProfessionalApplication.Status targetStatus;
        try {
            targetStatus = ProjectProfessionalApplication.Status.valueOf(updateDto.getStatus().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + updateDto.getStatus());
        }

        if (targetStatus == ProjectProfessionalApplication.Status.ACCEPTED) {
            // If already accepted, return without re-validating
            if (app.getStatus() != ProjectProfessionalApplication.Status.ACCEPTED) {
                // Determine trade capacity
                List<TradeRequirementSummaryDto> projectTrades = extractTradeRequirements(project, Collections.emptySet());
                int requiredQty = 1;
                for (TradeRequirementSummaryDto pt : projectTrades) {
                    if (normalizeTrade(pt.getTradeRole()).equals(normalizeTrade(app.getTradeRole()))) {
                        requiredQty = pt.getRequiredQuantity();
                        break;
                    }
                }

                long currentAccepted = applicationRepository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(
                        project.getId(),
                        app.getTradeRole(),
                        ProjectProfessionalApplication.Status.ACCEPTED
                );

                if (currentAccepted >= requiredQty) {
                    throw new IllegalStateException("Required quantity for this trade has already been fulfilled");
                }

                app.setStatus(ProjectProfessionalApplication.Status.ACCEPTED);
                app.setHiredAt(LocalDateTime.now());
                ProjectProfessionalApplication saved = applicationRepository.save(app);

                // POST REQUIREMENT ACCEPTED NOTIFICATION (STEP 11D)
                if (notificationService != null && saved.getProfessional() != null) {
                    String projId = project.getProjectId() != null ? project.getProjectId() : ("PRJ-" + project.getId());
                    notificationService.createNotification(
                            saved.getProfessional(),
                            "Quotation Accepted",
                            "कोटेशन स्वीकृत",
                            "Your quotation for " + projId + " has been accepted.",
                            projId + " के लिए आपका कोटेशन स्वीकार कर लिया गया है।",
                            "POST_REQUIREMENT_ACCEPTED",
                            saved.getApplicationId()
                    );
                }

                return RequesterApplicationDto.fromEntity(saved);
            }
        } else if (targetStatus == ProjectProfessionalApplication.Status.REJECTED) {
            ProjectProfessionalApplication.Status oldStatus = app.getStatus();
            if (oldStatus != ProjectProfessionalApplication.Status.REJECTED) {
                app.setStatus(ProjectProfessionalApplication.Status.REJECTED);
                ProjectProfessionalApplication saved = applicationRepository.save(app);

                // POST REQUIREMENT REJECTED NOTIFICATION (STEP 11E)
                if (notificationService != null && saved.getProfessional() != null) {
                    String projId = project.getProjectId() != null ? project.getProjectId() : ("PRJ-" + project.getId());
                    notificationService.createNotification(
                            saved.getProfessional(),
                            "Quotation Update",
                            "कोटेशन अपडेट",
                            "Your quotation for " + projId + " was not selected.",
                            projId + " के लिए आपका कोटेशन नहीं चुना गया।",
                            "POST_REQUIREMENT_REJECTED",
                            saved.getApplicationId()
                    );
                }

                return RequesterApplicationDto.fromEntity(saved);
            }
        } else if (targetStatus == ProjectProfessionalApplication.Status.SHORTLISTED) {
            app.setStatus(ProjectProfessionalApplication.Status.SHORTLISTED);
            ProjectProfessionalApplication saved = applicationRepository.save(app);
            // SHORTLIST DECISION: No notification sent for shortlisted state as per design audit
            return RequesterApplicationDto.fromEntity(saved);
        } else {
            throw new IllegalArgumentException("Unsupported requester status transition: " + targetStatus);
        }

        ProjectProfessionalApplication saved = applicationRepository.save(app);
        return RequesterApplicationDto.fromEntity(saved);
    }

    // ========================================================
    // 9. PROFESSIONAL WITHDRAWAL (OPTIONAL)
    // ========================================================

    @Transactional
    public ProjectProfessionalApplicationDto withdrawApplication(
            String applicationId,
            MarketplaceBackendApplication.MarketplaceUser pro
    ) {
        verifyProfessionalRole(pro);

        ProjectProfessionalApplication app = applicationRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found with ID: " + applicationId));

        if (app.getProfessional() == null || !app.getProfessional().getId().equals(pro.getId())) {
            throw new SecurityException("Access denied. You can only withdraw your own application.");
        }

        if (app.getStatus() == ProjectProfessionalApplication.Status.ACCEPTED) {
            throw new IllegalStateException("Cannot withdraw an application that has already been accepted.");
        }

        app.setStatus(ProjectProfessionalApplication.Status.WITHDRAWN);
        ProjectProfessionalApplication saved = applicationRepository.save(app);
        return ProjectProfessionalApplicationDto.fromEntity(saved);
    }

    // ========================================================
    // 10. PROFESSIONAL ACTIVE WORKS
    // ========================================================

    @Transactional(readOnly = true)
    public List<ProfessionalActiveWorkDto> getActiveWorksForProfessional(
            MarketplaceBackendApplication.MarketplaceUser pro
    ) {
        verifyProfessionalRole(pro);

        List<ProjectProfessionalApplication> acceptedApps = applicationRepository
                .findByProfessionalIdAndStatusOrderByCreatedAtDesc(
                        pro.getId(),
                        ProjectProfessionalApplication.Status.ACCEPTED
                );

        if (acceptedApps == null || acceptedApps.isEmpty()) {
            return Collections.emptyList();
        }

        List<ProfessionalActiveWorkDto> result = new ArrayList<>();
        DateTimeFormatter startFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
        DateTimeFormatter isoFormatter = DateTimeFormatter.ISO_LOCAL_DATE;

        for (ProjectProfessionalApplication app : acceptedApps) {
            Project project = app.getProject();

            // 1. id: Prefer application.applicationId
            String id = (app.getApplicationId() != null && !app.getApplicationId().isBlank())
                    ? app.getApplicationId()
                    : String.valueOf(app.getId());

            // 2. name: Project title/name
            String name = "Project Requirement";
            if (project != null) {
                if (project.getProjectTitle() != null && !project.getProjectTitle().isBlank()) {
                    name = project.getProjectTitle().trim();
                } else if (project.getTitle() != null && !project.getTitle().isBlank()) {
                    name = project.getTitle().trim();
                } else if (project.getProjectId() != null && !project.getProjectId().isBlank()) {
                    name = "Project " + project.getProjectId().trim();
                }
            }

            // 3. customer: Customer/requester name from project.customer
            String customer = "Client";
            if (project != null && project.getCustomer() != null) {
                MarketplaceBackendApplication.MarketplaceUser cust = project.getCustomer();
                if (cust.getName() != null && !cust.getName().isBlank()) {
                    customer = cust.getName().trim();
                } else if (cust.getUsername() != null && !cust.getUsername().isBlank()) {
                    customer = cust.getUsername().trim();
                }
            }

            // 4. service: application.tradeRole
            String service = (app.getTradeRole() != null && !app.getTradeRole().isBlank())
                    ? app.getTradeRole().trim()
                    : "Professional Service";

            // 5. budget: application.proposedRate
            String budget = "--";
            if (app.getProposedRate() != null && app.getProposedRate() > 0) {
                budget = "₹" + String.format(Locale.ENGLISH, "%,.0f", app.getProposedRate());
            }

            // 6. status: "Active"
            String status = "Active";

            // 7. progress: 25
            Integer progress = 25;

            // 8. nextMilestone: "Drawings & BOQ"
            String nextMilestone = "Drawings & BOQ";

            // 9. start: application.hiredAt formatted consistently with existing backend conventions
            LocalDateTime hiredDate = app.getHiredAt() != null ? app.getHiredAt() : app.getCreatedAt();
            String start = hiredDate != null ? hiredDate.format(startFormatter) : "--";

            // 10. scheduledDate: project.targetStartDate if available, fallback to application.hiredAt as calendar date
            String scheduledDate = null;
            if (project != null && project.getTargetStartDate() != null && !project.getTargetStartDate().isBlank()) {
                scheduledDate = project.getTargetStartDate().trim();
            } else if (hiredDate != null) {
                scheduledDate = hiredDate.format(isoFormatter);
            } else {
                scheduledDate = LocalDate.now().format(isoFormatter);
            }

            // 11. deadline: Safest existing project/application value compatible with frontend
            String deadline = "--";
            if (project != null && project.getTimeline() != null && !project.getTimeline().isBlank()) {
                deadline = project.getTimeline().trim();
            } else if (app.getEstimatedDuration() != null && !app.getEstimatedDuration().isBlank()) {
                deadline = app.getEstimatedDuration().trim();
            } else if (project != null && project.getTargetStartDate() != null && !project.getTargetStartDate().isBlank()) {
                deadline = project.getTargetStartDate().trim();
            }

            // 12. source: "POST_REQUIREMENT"
            String source = "POST_REQUIREMENT";

            result.add(new ProfessionalActiveWorkDto(
                    id, name, customer, service, budget, status, progress, nextMilestone, start, scheduledDate, deadline, source
            ));
        }

        return result;
    }

    public static class ProfessionalActiveWorkDto {
        private String id;
        private String name;
        private String customer;
        private String service;
        private String budget;
        private String status;
        private Integer progress;
        private String nextMilestone;
        private String start;
        private String scheduledDate;
        private String deadline;
        private String source;

        public ProfessionalActiveWorkDto() {}

        public ProfessionalActiveWorkDto(
                String id,
                String name,
                String customer,
                String service,
                String budget,
                String status,
                Integer progress,
                String nextMilestone,
                String start,
                String scheduledDate,
                String deadline,
                String source
        ) {
            this.id = id;
            this.name = name;
            this.customer = customer;
            this.service = service;
            this.budget = budget;
            this.status = status;
            this.progress = progress;
            this.nextMilestone = nextMilestone;
            this.start = start;
            this.scheduledDate = scheduledDate;
            this.deadline = deadline;
            this.source = source;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getCustomer() { return customer; }
        public void setCustomer(String customer) { this.customer = customer; }

        public String getService() { return service; }
        public void setService(String service) { this.service = service; }

        public String getBudget() { return budget; }
        public void setBudget(String budget) { this.budget = budget; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Integer getProgress() { return progress; }
        public void setProgress(Integer progress) { this.progress = progress; }

        public String getNextMilestone() { return nextMilestone; }
        public void setNextMilestone(String nextMilestone) { this.nextMilestone = nextMilestone; }

        public String getStart() { return start; }
        public void setStart(String start) { this.start = start; }

        public String getScheduledDate() { return scheduledDate; }
        public void setScheduledDate(String scheduledDate) { this.scheduledDate = scheduledDate; }

        public String getDeadline() { return deadline; }
        public void setDeadline(String deadline) { this.deadline = deadline; }

        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
    }

    // ========================================================
    // 11. HELPER METHODS
    // ========================================================

    private void verifyProfessionalRole(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            throw new SecurityException("Authentication required");
        }
        boolean isPro = user.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER);
        if (!isPro) {
            throw new SecurityException("Access denied. Only registered professionals can perform this action.");
        }
    }

    private void verifyRequesterRole(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            throw new SecurityException("Authentication required");
        }
        boolean isRequester = user.getRoles().contains(MarketplaceBackendApplication.Role.CUSTOMER)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.CONTRACTOR)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER);
        if (!isRequester) {
            throw new SecurityException("Access denied. Only customers, contractors, or material sellers can manage requirement applications.");
        }
    }

    private String formatProjectLocation(Project p) {
        StringBuilder loc = new StringBuilder();
        if (p.getCity() != null && !p.getCity().isBlank()) {
            loc.append(p.getCity().trim());
        }
        if (p.getState() != null && !p.getState().isBlank()) {
            if (!loc.isEmpty()) loc.append(", ");
            loc.append(p.getState().trim());
        }
        if (p.getPincode() != null && !p.getPincode().isBlank()) {
            if (!loc.isEmpty()) loc.append(" ");
            loc.append(p.getPincode().trim());
        }
        if (!loc.isEmpty()) {
            return loc.toString();
        }
        return p.getLocation() != null && !p.getLocation().isBlank() ? p.getLocation() : "Location Not Specified";
    }
}
