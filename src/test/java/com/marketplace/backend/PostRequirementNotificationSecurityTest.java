package com.marketplace.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — STEP 11: POST REQUIREMENT NOTIFICATION SECURITY & ISOLATION TEST SUITE
 *
 * Verifies:
 * 1. Match notifications:
 *    - Eligible Professional A receives match notification
 *    - Eligible Professional B receives match notification
 *    - Ineligible Professional C receives no notification
 *    - Requester receives no match notification
 *    - Other users (Contractors, Sellers, other Customers) receive no match notification
 *    - Multi-trade deduplication: 1 notification per pro even if matching multiple trades
 *    - Read-only GET requests never create notifications
 *    - Idempotency: repeated match checks do not duplicate notifications
 * 2. Application notifications:
 *    - Correct requester receives application notification
 *    - Applicant does not receive self-notification
 *    - Other requesters receive nothing
 *    - Application submission failure sends no notification
 * 3. Acceptance notifications:
 *    - Accepted professional receives acceptance notification
 *    - Other applicants receive nothing
 *    - Requester does not receive duplicate acceptance notification
 *    - 409 trade capacity failure sends no acceptance notification
 * 4. Rejection notifications:
 *    - Rejected professional receives rejection notification
 *    - Other applicants receive nothing
 *    - Other users receive nothing
 * 5. Shortlist decision:
 *    - SHORTLISTED status change generates no notification
 * 6. Security and IDOR Protection:
 *    - Recipient cannot be spoofed from request payload/frontend
 *    - Notification endpoint isolates user notifications strictly
 *    - Cross-role notification leakage is prevented
 *    - Safe serialization audit (no password, phone, or token exposed)
 */
public class PostRequirementNotificationSecurityTest {

    private ProjectRepository projectRepository;
    private ProjectProfessionalApplicationRepository applicationRepository;
    private ProfessionalServiceRepository professionalServiceRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private NotificationRepository notificationRepository;
    private ObjectMapper objectMapper;

    private NotificationService notificationService;
    private ProjectApplicationService projectApplicationService;
    private ProjectApplicationController applicationController;
    private NotificationController notificationController;
    private ProjectController projectController;

    // Users
    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser sellerA;
    private MarketplaceBackendApplication.MarketplaceUser proLabourAndElectrician;
    private MarketplaceBackendApplication.MarketplaceUser proEngineerOnly;
    private MarketplaceBackendApplication.MarketplaceUser proPlumberOnly;

    // In-memory stores
    private List<Notification> notificationStore;
    private List<ProjectProfessionalApplication> applicationStore;
    private List<Project> projectStore;
    private Map<Long, List<ProfessionalService>> proServicesMap;
    private long notificationIdSeq = 1000L;
    private long applicationIdSeq = 5000L;

    @BeforeEach
    void setUp() {
        projectRepository = mock(ProjectRepository.class);
        applicationRepository = mock(ProjectProfessionalApplicationRepository.class);
        professionalServiceRepository = mock(ProfessionalServiceRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        objectMapper = new ObjectMapper();

        notificationStore = new ArrayList<>();
        applicationStore = new ArrayList<>();
        projectStore = new ArrayList<>();
        proServicesMap = new HashMap<>();

        // 1. Initialize Users
        customerA = createTestUser(1L, "customerA@buildbid.com", "Customer Alpha", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(2L, "customerB@buildbid.com", "Customer Beta", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorA = createTestUser(3L, "contractorA@buildbid.com", "Contractor Alpha", MarketplaceBackendApplication.Role.CONTRACTOR);
        sellerA = createTestUser(4L, "sellerA@buildbid.com", "Seller Alpha", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        proLabourAndElectrician = createTestUser(10L, "proMulti@buildbid.com", "Pro Multi (Labour + Electrician)", MarketplaceBackendApplication.Role.PROFESSIONAL);
        proEngineerOnly = createTestUser(20L, "proEngineer@buildbid.com", "Pro Engineer", MarketplaceBackendApplication.Role.PROFESSIONAL);
        proPlumberOnly = createTestUser(30L, "proPlumber@buildbid.com", "Pro Plumber", MarketplaceBackendApplication.Role.PROFESSIONAL);

        List<MarketplaceBackendApplication.MarketplaceUser> allUsers = List.of(
                customerA, customerB, contractorA, sellerA, proLabourAndElectrician, proEngineerOnly, proPlumberOnly
        );

        when(userRepository.findAll()).thenReturn(allUsers);
        for (MarketplaceBackendApplication.MarketplaceUser u : allUsers) {
            when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
            when(userRepository.findByUsername(u.getEmail())).thenReturn(Optional.of(u));
            when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        }

        // Mock NotificationRepository backed by in-memory notificationStore
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            if (n.getId() == null) {
                ReflectionTestUtils.setField(n, "id", ++notificationIdSeq);
                notificationStore.add(n);
            }
            return n;
        });

        when(notificationRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return notificationStore.stream().filter(n -> id.equals(n.getId())).findFirst();
        });

        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(anyLong())).thenAnswer(inv -> {
            Long recId = inv.getArgument(0);
            return notificationStore.stream()
                    .filter(n -> n.getRecipient() != null && recId.equals(n.getRecipient().getId()))
                    .sorted(Comparator.comparing(Notification::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        });

        when(notificationRepository.countByRecipientIdAndIsReadFalse(anyLong())).thenAnswer(inv -> {
            Long recId = inv.getArgument(0);
            return notificationStore.stream()
                    .filter(n -> n.getRecipient() != null && recId.equals(n.getRecipient().getId()) && !Boolean.TRUE.equals(n.getIsRead()))
                    .count();
        });

        when(notificationRepository.existsByRecipientIdAndNotificationTypeAndReferenceId(anyLong(), anyString(), anyString())).thenAnswer(inv -> {
            Long recId = inv.getArgument(0);
            String type = inv.getArgument(1);
            String refId = inv.getArgument(2);
            return notificationStore.stream()
                    .anyMatch(n -> n.getRecipient() != null && recId.equals(n.getRecipient().getId())
                            && type.equalsIgnoreCase(n.getNotificationType())
                            && refId.equalsIgnoreCase(n.getReferenceId()));
        });

        when(notificationRepository.markAllAsReadForUser(anyLong())).thenAnswer(inv -> {
            Long recId = inv.getArgument(0);
            int count = 0;
            for (Notification n : notificationStore) {
                if (n.getRecipient() != null && recId.equals(n.getRecipient().getId()) && !Boolean.TRUE.equals(n.getIsRead())) {
                    n.setIsRead(true);
                    count++;
                }
            }
            return count;
        });

        // Mock ProfessionalServiceRepository
        when(professionalServiceRepository.findByProfessional_IdAndActiveTrue(anyLong())).thenAnswer(inv -> {
            Long proId = inv.getArgument(0);
            return proServicesMap.getOrDefault(proId, Collections.emptyList());
        });

        when(professionalServiceRepository.findByActiveTrue()).thenAnswer(inv -> {
            List<ProfessionalService> allActive = new ArrayList<>();
            for (List<ProfessionalService> list : proServicesMap.values()) {
                allActive.addAll(list);
            }
            return allActive;
        });

        // Mock ApplicationRepository
        when(applicationRepository.save(any(ProjectProfessionalApplication.class))).thenAnswer(inv -> {
            ProjectProfessionalApplication a = inv.getArgument(0);
            if (a.getId() == null) {
                ReflectionTestUtils.setField(a, "id", ++applicationIdSeq);
            }
            if (a.getApplicationId() == null || a.getApplicationId().isBlank()) {
                a.onCreate();
            }
            if (!applicationStore.contains(a)) {
                applicationStore.add(a);
            }
            return a;
        });

        when(applicationRepository.findByApplicationId(anyString())).thenAnswer(inv -> {
            String appCode = inv.getArgument(0);
            return applicationStore.stream().filter(a -> appCode.equalsIgnoreCase(a.getApplicationId())).findFirst();
        });

        when(applicationRepository.findByApplicationIdForUpdate(anyString())).thenAnswer(inv -> {
            String appCode = inv.getArgument(0);
            return applicationStore.stream().filter(a -> appCode.equalsIgnoreCase(a.getApplicationId())).findFirst();
        });

        when(applicationRepository.existsByProjectIdAndProfessionalId(anyLong(), anyLong())).thenAnswer(inv -> {
            Long pId = inv.getArgument(0);
            Long proId = inv.getArgument(1);
            return applicationStore.stream().anyMatch(a -> a.getProject().getId().equals(pId) && a.getProfessional().getId().equals(proId));
        });

        when(applicationRepository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(anyLong(), anyString(), any(ProjectProfessionalApplication.Status.class))).thenAnswer(inv -> {
            Long pId = inv.getArgument(0);
            String trade = inv.getArgument(1);
            ProjectProfessionalApplication.Status st = inv.getArgument(2);
            return applicationStore.stream()
                    .filter(a -> a.getProject().getId().equals(pId)
                            && ProjectApplicationService.normalizeTrade(a.getTradeRole()).equals(ProjectApplicationService.normalizeTrade(trade))
                            && a.getStatus() == st)
                    .count();
        });

        when(applicationRepository.findByProjectIdOrderByCreatedAtDesc(anyLong())).thenAnswer(inv -> {
            Long pId = inv.getArgument(0);
            return applicationStore.stream().filter(a -> a.getProject().getId().equals(pId)).toList();
        });

        // Mock ProjectRepository
        when(projectRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return projectStore.stream().filter(p -> id.equals(p.getId())).findFirst();
        });

        when(projectRepository.findByIdForUpdate(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return projectStore.stream().filter(p -> id.equals(p.getId())).findFirst();
        });

        when(projectRepository.findByProjectId(anyString())).thenAnswer(inv -> {
            String pid = inv.getArgument(0);
            return projectStore.stream().filter(p -> pid.equalsIgnoreCase(p.getProjectId())).findFirst();
        });

        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            if (p.getId() == null) {
                ReflectionTestUtils.setField(p, "id", (long) (projectStore.size() + 1));
            }
            if (!projectStore.contains(p)) {
                projectStore.add(p);
            }
            return p;
        });

        // Initialize Services & Controllers
        notificationService = new NotificationService(notificationRepository);
        projectApplicationService = new ProjectApplicationService(
                projectRepository,
                applicationRepository,
                professionalServiceRepository,
                userRepository,
                objectMapper,
                notificationService
        );
        applicationController = new ProjectApplicationController(projectApplicationService, userRepository);
        notificationController = new NotificationController(notificationService, userRepository);
        projectController = new ProjectController(projectRepository, userRepository, null, projectApplicationService);

        // Register Professional Services:
        // Pro Multi: Labour (NOT_REQUIRED) and Electrician (NOT_REQUIRED)
        mockService(proLabourAndElectrician, "Labour", false, VerificationStatus.NOT_REQUIRED);
        mockService(proLabourAndElectrician, "Electrician", false, VerificationStatus.NOT_REQUIRED);

        // Pro Engineer: Civil Engineer (VERIFIED)
        mockService(proEngineerOnly, "Civil Engineer", true, VerificationStatus.VERIFIED);

        // Pro Plumber: Plumber (NOT_REQUIRED)
        mockService(proPlumberOnly, "Plumber", false, VerificationStatus.NOT_REQUIRED);
    }

    // =========================================================================
    // 1. MATCH NOTIFICATIONS (STEP 11A, 11B, 11L, 11M, 11N)
    // =========================================================================

    @Test
    @DisplayName("Match 1 & 2: Eligible Professional A & B receive match notifications for requested trades")
    void testMatch_EligibleProfessionalsReceiveNotifications() {
        Project project = createMultiTradeProject("HIRE-1024", customerA, List.of(
                Map.of("role", "Labour", "quantity", 3),
                Map.of("role", "Civil Engineer", "quantity", 1)
        ));

        // Trigger matching notification (e.g. on project save)
        List<Notification> created = projectApplicationService.notifyMatchingProfessionals(project);

        // proLabourAndElectrician matches Labour -> gets notification
        // proEngineerOnly matches Civil Engineer -> gets notification
        assertEquals(2, created.size());

        List<Notification> proMultiNotifs = getNotificationsFor(proLabourAndElectrician);
        assertEquals(1, proMultiNotifs.size());
        assertEquals("POST_REQUIREMENT_MATCH", proMultiNotifs.get(0).getNotificationType());
        assertEquals("HIRE-1024", proMultiNotifs.get(0).getReferenceId());
        assertEquals("New Work Opportunity", proMultiNotifs.get(0).getTitle());
        assertTrue(proMultiNotifs.get(0).getMessage().contains("Labour"));

        List<Notification> proEngNotifs = getNotificationsFor(proEngineerOnly);
        assertEquals(1, proEngNotifs.size());
        assertEquals("POST_REQUIREMENT_MATCH", proEngNotifs.get(0).getNotificationType());
        assertEquals("HIRE-1024", proEngNotifs.get(0).getReferenceId());
        assertTrue(proEngNotifs.get(0).getMessage().contains("Civil Engineer") || proEngNotifs.get(0).getMessage().contains("Engineer"));
    }

    @Test
    @DisplayName("Match 3: Ineligible Professional C receives no notification when trade not requested")
    void testMatch_IneligibleProfessionalReceivesNoNotification() {
        Project project = createMultiTradeProject("HIRE-1025", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2),
                Map.of("role", "Civil Engineer", "quantity", 1)
        ));

        projectApplicationService.notifyMatchingProfessionals(project);

        // proPlumberOnly is Plumber -> not in project requirements -> receives NO notification
        List<Notification> plumberNotifs = getNotificationsFor(proPlumberOnly);
        assertTrue(plumberNotifs.isEmpty(), "Ineligible professional must receive zero match notifications");
    }

    @Test
    @DisplayName("Match 4: Requester receives no match notification for their own requirement")
    void testMatch_RequesterReceivesNoMatchNotification() {
        // Suppose Customer A also happens to have a professional role on their account
        customerA.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);
        mockService(customerA, "Labour", false, VerificationStatus.NOT_REQUIRED);

        Project project = createMultiTradeProject("HIRE-1026", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        projectApplicationService.notifyMatchingProfessionals(project);

        List<Notification> custANotifs = getNotificationsFor(customerA);
        assertTrue(custANotifs.isEmpty(), "Requirement owner must never receive match notification for their own project");
    }

    @Test
    @DisplayName("Match 5: Other users (Customer B, Contractor A, Seller A) receive no match notifications")
    void testMatch_OtherUsersReceiveNoMatchNotification() {
        Project project = createMultiTradeProject("HIRE-1027", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2),
                Map.of("role", "Civil Engineer", "quantity", 1)
        ));

        projectApplicationService.notifyMatchingProfessionals(project);

        assertTrue(getNotificationsFor(customerB).isEmpty());
        assertTrue(getNotificationsFor(contractorA).isEmpty());
        assertTrue(getNotificationsFor(sellerA).isEmpty());
    }

    @Test
    @DisplayName("Match 6: Multi-trade requirement creates exactly ONE deduplicated notification for a pro matching multiple trades")
    void testMatch_MultiTradeDeduplication_OneNotificationPerPro() {
        // Project requires BOTH Labour AND Electrician
        Project project = createMultiTradeProject("HIRE-1028", customerA, List.of(
                Map.of("role", "Labour", "quantity", 3),
                Map.of("role", "Electrician", "quantity", 2)
        ));

        // proLabourAndElectrician is eligible for BOTH Labour and Electrician
        projectApplicationService.notifyMatchingProfessionals(project);

        List<Notification> notifs = getNotificationsFor(proLabourAndElectrician);
        assertEquals(1, notifs.size(), "Professional matching multiple trades must receive exactly ONE consolidated notification");

        Notification n = notifs.get(0);
        assertEquals("POST_REQUIREMENT_MATCH", n.getNotificationType());
        assertEquals("HIRE-1028", n.getReferenceId());
        // Consolidated notification mentions matching trades
        assertTrue(n.getMessage().contains("Labour") && n.getMessage().contains("Electrician"),
                "Consolidated message should mention the matching trades");
    }

    @Test
    @DisplayName("Match 7: Read-only GET /api/professional/requirements does not create any notifications")
    void testMatch_ReadOnlyGetDoesNotCreateNotifications() {
        Project project = createMultiTradeProject("HIRE-1029", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        int notifCountBefore = notificationStore.size();

        // Professional queries discovery list
        ResponseEntity<?> resp = applicationController.getEligibleRequirements(mockAuth(proLabourAndElectrician.getEmail()));
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        // Professional queries single requirement details
        ResponseEntity<?> detailResp = applicationController.getRequirementDetails("HIRE-1029", mockAuth(proLabourAndElectrician.getEmail()));
        assertEquals(HttpStatus.OK, detailResp.getStatusCode());

        assertEquals(notifCountBefore, notificationStore.size(), "Read-only GET requests must NEVER generate notifications");
    }

    @Test
    @DisplayName("Match Idempotency: Calling notifyMatchingProfessionals repeatedly does not create duplicate notifications")
    void testMatch_IdempotentNotificationGuard() {
        Project project = createMultiTradeProject("HIRE-1030", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        // First call: creates notification
        List<Notification> firstCall = projectApplicationService.notifyMatchingProfessionals(project);
        assertEquals(1, firstCall.size());

        // Second call (e.g. retry or edit): must skip already notified professional
        List<Notification> secondCall = projectApplicationService.notifyMatchingProfessionals(project);
        assertEquals(0, secondCall.size(), "Idempotent guard must skip already notified professionals for this project");

        assertEquals(1, getNotificationsFor(proLabourAndElectrician).size());
    }

    // =========================================================================
    // 2. APPLICATION NOTIFICATIONS (STEP 11C, 11O)
    // =========================================================================

    @Test
    @DisplayName("Application 8 & 9: Correct requester receives application notification, applicant receives no self-notification")
    void testApplication_CorrectRequesterReceivesNotification_NoSelfNotification() {
        Project project = createMultiTradeProject("HIRE-1031", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        ApplicationSubmissionDto submission = new ApplicationSubmissionDto();
        submission.setTradeRole("Labour");
        submission.setProposedRate(950.0);
        submission.setRateType("PER_DAY");
        submission.setTeamSize(1);
        submission.setCoverMessage("Experienced mason and labour worker ready to start immediately.");

        // proLabourAndElectrician applies
        ResponseEntity<?> response = applicationController.applyToRequirement(
                "HIRE-1031",
                submission,
                mockAuth(proLabourAndElectrician.getEmail())
        );
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        // 1. Customer A (requester) receives notification
        List<Notification> custNotifs = getNotificationsFor(customerA);
        assertEquals(1, custNotifs.size());
        Notification n = custNotifs.get(0);
        assertEquals("POST_REQUIREMENT_APPLICATION", n.getNotificationType());
        assertEquals("New Professional Quotation", n.getTitle());
        assertTrue(n.getMessage().contains("HIRE-1031"));
        assertNotNull(n.getReferenceId());
        assertTrue(n.getReferenceId().startsWith("APP-"));

        // 2. Applicant does NOT receive self-notification
        List<Notification> applicantNotifs = getNotificationsFor(proLabourAndElectrician);
        assertTrue(applicantNotifs.isEmpty(), "Applicant must not receive self-notification for submitting a quotation");
    }

    @Test
    @DisplayName("Application 10: Other requesters receive nothing when professional applies")
    void testApplication_OtherRequestersReceiveNothing() {
        Project project = createMultiTradeProject("HIRE-1032", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        ApplicationSubmissionDto submission = new ApplicationSubmissionDto();
        submission.setTradeRole("Labour");
        submission.setProposedRate(900.0);
        submission.setRateType("PER_DAY");

        applicationController.applyToRequirement("HIRE-1032", submission, mockAuth(proLabourAndElectrician.getEmail()));

        // Customer B receives nothing
        assertTrue(getNotificationsFor(customerB).isEmpty());
        // Contractor A receives nothing
        assertTrue(getNotificationsFor(contractorA).isEmpty());
        // Seller A receives nothing
        assertTrue(getNotificationsFor(sellerA).isEmpty());
    }

    @Test
    @DisplayName("Application 11: Application submission failure sends no notification")
    void testApplication_FailureSendsNoNotification() {
        Project project = createMultiTradeProject("HIRE-1033", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        // Invalid submission: negative rate
        ApplicationSubmissionDto invalidSubmission = new ApplicationSubmissionDto();
        invalidSubmission.setTradeRole("Labour");
        invalidSubmission.setProposedRate(-50.0);

        ResponseEntity<?> response = applicationController.applyToRequirement(
                "HIRE-1033",
                invalidSubmission,
                mockAuth(proLabourAndElectrician.getEmail())
        );
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        assertTrue(notificationStore.isEmpty(), "Failed application submission must produce zero notifications");
    }

    // =========================================================================
    // 3. ACCEPTANCE NOTIFICATIONS (STEP 11D, 11P)
    // =========================================================================

    @Test
    @DisplayName("Accepted 12 & 13: Accepted professional receives notification, other applicants receive nothing")
    void testAccepted_AcceptedProfessionalReceivesNotification_OtherApplicantsDoNot() {
        Project project = createMultiTradeProject("HIRE-1034", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        // Create application for Pro Multi
        ProjectProfessionalApplication app1 = createSimulatedApplication(project, proLabourAndElectrician, "Labour", 900.0);
        // Create second competing application for another pro
        MarketplaceBackendApplication.MarketplaceUser pro2 = createTestUser(105L, "pro2@buildbid.com", "Pro Two", MarketplaceBackendApplication.Role.PROFESSIONAL);
        mockService(pro2, "Labour", false, VerificationStatus.NOT_REQUIRED);
        ProjectProfessionalApplication app2 = createSimulatedApplication(project, pro2, "Labour", 950.0);

        // Customer A accepts app1
        ApplicationStatusUpdateDto acceptDto = new ApplicationStatusUpdateDto("ACCEPTED");
        ResponseEntity<?> resp = applicationController.updateApplicationStatus(
                app1.getApplicationId(),
                acceptDto,
                mockAuth(customerA.getEmail())
        );
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        // 1. Pro Multi receives ACCEPTED notification
        List<Notification> pro1Notifs = getNotificationsFor(proLabourAndElectrician);
        assertEquals(1, pro1Notifs.size());
        Notification n = pro1Notifs.get(0);
        assertEquals("POST_REQUIREMENT_ACCEPTED", n.getNotificationType());
        assertEquals("Quotation Accepted", n.getTitle());
        assertEquals(app1.getApplicationId(), n.getReferenceId());
        assertTrue(n.getMessage().contains("HIRE-1034"));

        // 2. Pro Two (other applicant) receives NOTHING
        List<Notification> pro2Notifs = getNotificationsFor(pro2);
        assertTrue(pro2Notifs.isEmpty(), "Non-accepted applicants must not receive acceptance notification");

        // 3. Customer A does not receive duplicate acceptance notification
        List<Notification> custNotifs = getNotificationsFor(customerA);
        assertTrue(custNotifs.isEmpty(), "Requester does not receive acceptance notification for accepting an applicant");
    }

    @Test
    @DisplayName("Accepted 14: Repeated acceptance does not create duplicate acceptance notifications")
    void testAccepted_RepeatedAcceptanceDoesNotDuplicate() {
        Project project = createMultiTradeProject("HIRE-1035", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));
        ProjectProfessionalApplication app = createSimulatedApplication(project, proLabourAndElectrician, "Labour", 900.0);

        ApplicationStatusUpdateDto acceptDto = new ApplicationStatusUpdateDto("ACCEPTED");

        // First accept
        applicationController.updateApplicationStatus(app.getApplicationId(), acceptDto, mockAuth(customerA.getEmail()));
        assertEquals(1, getNotificationsFor(proLabourAndElectrician).size());

        // Second accept of same application
        applicationController.updateApplicationStatus(app.getApplicationId(), acceptDto, mockAuth(customerA.getEmail()));
        assertEquals(1, getNotificationsFor(proLabourAndElectrician).size(), "Repeated acceptance must not generate duplicate notification");
    }

    @Test
    @DisplayName("Accepted 15: 409 Trade capacity failure creates NO acceptance notification")
    void testAccepted_CapacityConflict409CreatesNoAcceptanceNotification() {
        // Project requires only 1 Labour
        Project project = createMultiTradeProject("HIRE-1036", customerA, List.of(
                Map.of("role", "Labour", "quantity", 1)
        ));

        // Pro 1 is already accepted (quota fulfilled)
        ProjectProfessionalApplication app1 = createSimulatedApplication(project, proLabourAndElectrician, "Labour", 900.0);
        app1.setStatus(ProjectProfessionalApplication.Status.ACCEPTED);

        // Pro 2 applied
        MarketplaceBackendApplication.MarketplaceUser pro2 = createTestUser(106L, "competingPro@buildbid.com", "Competing Pro", MarketplaceBackendApplication.Role.PROFESSIONAL);
        mockService(pro2, "Labour", false, VerificationStatus.NOT_REQUIRED);
        ProjectProfessionalApplication app2 = createSimulatedApplication(project, pro2, "Labour", 950.0);

        // Customer attempts to accept Pro 2 -> capacity is 1, already 1 accepted -> 409 CONFLICT
        ApplicationStatusUpdateDto acceptDto = new ApplicationStatusUpdateDto("ACCEPTED");
        ResponseEntity<?> resp = applicationController.updateApplicationStatus(
                app2.getApplicationId(),
                acceptDto,
                mockAuth(customerA.getEmail())
        );
        assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());

        // Verify Pro 2 received ZERO acceptance notifications
        List<Notification> pro2Notifs = getNotificationsFor(pro2);
        assertTrue(pro2Notifs.isEmpty(), "Failed acceptance due to 409 capacity conflict must NOT produce any notification");
    }

    // =========================================================================
    // 4. REJECTION NOTIFICATIONS (STEP 11E, 11Q)
    // =========================================================================

    @Test
    @DisplayName("Rejected 16, 17, 18: Rejected professional receives notification, other applicants and users receive nothing")
    void testRejected_OnlyRejectedProfessionalReceivesNotification() {
        Project project = createMultiTradeProject("HIRE-1037", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));

        ProjectProfessionalApplication app1 = createSimulatedApplication(project, proLabourAndElectrician, "Labour", 1000.0);
        MarketplaceBackendApplication.MarketplaceUser pro2 = createTestUser(107L, "proTwo@buildbid.com", "Pro Two", MarketplaceBackendApplication.Role.PROFESSIONAL);
        mockService(pro2, "Labour", false, VerificationStatus.NOT_REQUIRED);
        ProjectProfessionalApplication app2 = createSimulatedApplication(project, pro2, "Labour", 950.0);

        // Customer rejects app1
        ApplicationStatusUpdateDto rejectDto = new ApplicationStatusUpdateDto("REJECTED");
        ResponseEntity<?> resp = applicationController.updateApplicationStatus(
                app1.getApplicationId(),
                rejectDto,
                mockAuth(customerA.getEmail())
        );
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        // 1. Rejected professional receives REJECTED notification
        List<Notification> pro1Notifs = getNotificationsFor(proLabourAndElectrician);
        assertEquals(1, pro1Notifs.size());
        Notification n = pro1Notifs.get(0);
        assertEquals("POST_REQUIREMENT_REJECTED", n.getNotificationType());
        assertEquals("Quotation Update", n.getTitle());
        assertEquals(app1.getApplicationId(), n.getReferenceId());
        assertTrue(n.getMessage().contains("HIRE-1037"));

        // 2. Other applicant receives nothing
        assertTrue(getNotificationsFor(pro2).isEmpty());

        // 3. Other users receive nothing
        assertTrue(getNotificationsFor(customerA).isEmpty());
        assertTrue(getNotificationsFor(customerB).isEmpty());
        assertTrue(getNotificationsFor(contractorA).isEmpty());
    }

    // =========================================================================
    // 5. SHORTLIST DECISION (STEP 11F)
    // =========================================================================

    @Test
    @DisplayName("Shortlist 23: Shortlisting an application creates NO notification (documented design decision)")
    void testShortlist_CreatesNoNotification() {
        Project project = createMultiTradeProject("HIRE-1038", customerA, List.of(
                Map.of("role", "Labour", "quantity", 2)
        ));
        ProjectProfessionalApplication app = createSimulatedApplication(project, proLabourAndElectrician, "Labour", 900.0);

        ApplicationStatusUpdateDto shortlistDto = new ApplicationStatusUpdateDto("SHORTLISTED");
        ResponseEntity<?> resp = applicationController.updateApplicationStatus(
                app.getApplicationId(),
                shortlistDto,
                mockAuth(customerA.getEmail())
        );
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        assertTrue(notificationStore.isEmpty(), "Shortlist transition must not produce any notification");
    }

    // =========================================================================
    // 6. SECURITY & IDOR PROTECTION (STEP 11I, 11T, 11U, 11V)
    // =========================================================================

    @Test
    @DisplayName("Security 19 & 20: Notification recipient cannot be spoofed; NotificationController strictly scopes to authenticated principal")
    void testSecurity_NotificationScopingAndNoSpoofing() {
        // Create confidential notification for Pro Multi
        notificationService.createNotification(
                proLabourAndElectrician,
                "Quotation Accepted",
                "कोटेशन स्वीकृत",
                "Your quotation for HIRE-9999 has been accepted.",
                "HIRE-9999 के लिए आपका कोटेशन स्वीकार कर लिया गया है।",
                "POST_REQUIREMENT_ACCEPTED",
                "APP-9999"
        );

        // Pro Multi views their notifications -> 1 notification
        ResponseEntity<?> respMulti = notificationController.getNotifications(mockAuth(proLabourAndElectrician.getEmail()));
        assertEquals(HttpStatus.OK, respMulti.getStatusCode());
        Map<?, ?> bodyMulti = (Map<?, ?>) respMulti.getBody();
        List<?> listMulti = (List<?>) bodyMulti.get("notifications");
        assertEquals(1, listMulti.size());
        assertEquals(1L, bodyMulti.get("unreadCount"));

        // Pro Engineer queries notification endpoint -> 0 notifications
        ResponseEntity<?> respEng = notificationController.getNotifications(mockAuth(proEngineerOnly.getEmail()));
        assertEquals(HttpStatus.OK, respEng.getStatusCode());
        Map<?, ?> bodyEng = (Map<?, ?>) respEng.getBody();
        List<?> listEng = (List<?>) bodyEng.get("notifications");
        assertEquals(0, listEng.size());
        assertEquals(0L, bodyEng.get("unreadCount"));

        // Customer A queries notification endpoint -> 0 notifications
        ResponseEntity<?> respCust = notificationController.getNotifications(mockAuth(customerA.getEmail()));
        assertEquals(HttpStatus.OK, respCust.getStatusCode());
        Map<?, ?> bodyCust = (Map<?, ?>) respCust.getBody();
        List<?> listCust = (List<?>) bodyCust.get("notifications");
        assertEquals(0, listCust.size());
    }

    @Test
    @DisplayName("Security 21: IDOR Protection on Mark As Read — User B cannot mark User A notification as read")
    void testSecurity_IdorProtectionOnMarkAsRead() {
        Notification n = notificationService.createNotification(
                proLabourAndElectrician,
                "New Work Opportunity",
                "नया कार्य अवसर",
                "A new Labour opportunity is available for HIRE-1040.",
                "परियोजना HIRE-1040 के लिए एक नया Labour अवसर उपलब्ध है।",
                "POST_REQUIREMENT_MATCH",
                "HIRE-1040"
        );

        // Attacker Pro Engineer attempts to mark Pro Multi's notification as read -> 403 FORBIDDEN
        ResponseEntity<?> attackerResp = notificationController.markAsRead(n.getId(), mockAuth(proEngineerOnly.getEmail()));
        assertEquals(HttpStatus.FORBIDDEN, attackerResp.getStatusCode());
        assertFalse(n.getIsRead(), "Notification must remain unread after unauthorized attempt");

        // Legitimate owner marks as read -> 200 OK
        ResponseEntity<?> ownerResp = notificationController.markAsRead(n.getId(), mockAuth(proLabourAndElectrician.getEmail()));
        assertEquals(HttpStatus.OK, ownerResp.getStatusCode());
        assertTrue(n.getIsRead(), "Notification should be marked read by its rightful recipient");
    }

    @Test
    @DisplayName("Security 22: Safe Serialization Audit — No sensitive credentials or recipient tokens leaked in notification DTOs")
    void testSecurity_SafeSerializationAudit() {
        Notification n = notificationService.createNotification(
                proLabourAndElectrician,
                "Quotation Accepted",
                "कोटेशन स्वीकृत",
                "Confidential message",
                "गोपनीय",
                "POST_REQUIREMENT_ACCEPTED",
                "APP-1234"
        );

        List<Map<String, Object>> userNotifs = notificationService.getUserNotifications(proLabourAndElectrician);
        assertEquals(1, userNotifs.size());
        Map<String, Object> map = userNotifs.get(0);

        // Verify exposed fields
        assertTrue(map.containsKey("id"));
        assertTrue(map.containsKey("title"));
        assertTrue(map.containsKey("titleHi"));
        assertTrue(map.containsKey("message"));
        assertTrue(map.containsKey("messageHi"));
        assertTrue(map.containsKey("type"));
        assertTrue(map.containsKey("referenceId"));
        assertTrue(map.containsKey("isRead"));
        assertTrue(map.containsKey("createdAt"));

        // Verify forbidden fields are NOT present
        assertFalse(map.containsKey("recipient"));
        assertFalse(map.containsKey("recipientUser"));
        assertFalse(map.containsKey("password"));
        assertFalse(map.containsKey("passwordHash"));
        assertFalse(map.containsKey("token"));
        assertFalse(map.containsKey("phone"));
        assertFalse(map.containsKey("email"));
    }

    @Test
    @DisplayName("End-to-End: Project creation via ProjectController triggers MATCH notifications for eligible professionals")
    void testEndToEnd_ProjectCreationTriggersMatchNotifications() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectId", "HIRE-2024");
        payload.put("projectTitle", "New Villa Project");
        payload.put("status", "OPEN");
        payload.put("type", "New Construction");
        payload.put("requestedProfessionals", List.of(
                Map.of("role", "Labour", "quantity", 2),
                Map.of("role", "Civil Engineer", "quantity", 1)
        ));

        ResponseEntity<?> resp = projectController.createProject(payload, mockAuth(customerA.getEmail()));
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        // Eligible professionals receive match notifications
        List<Notification> proMultiNotifs = getNotificationsFor(proLabourAndElectrician);
        assertEquals(1, proMultiNotifs.size());
        assertEquals("POST_REQUIREMENT_MATCH", proMultiNotifs.get(0).getNotificationType());
        assertEquals("HIRE-2024", proMultiNotifs.get(0).getReferenceId());

        List<Notification> proEngNotifs = getNotificationsFor(proEngineerOnly);
        assertEquals(1, proEngNotifs.size());
        assertEquals("POST_REQUIREMENT_MATCH", proEngNotifs.get(0).getNotificationType());

        // Ineligible professional gets zero
        assertTrue(getNotificationsFor(proPlumberOnly).isEmpty());
        // Project creator gets zero
        assertTrue(getNotificationsFor(customerA).isEmpty());
    }

    @Test
    @DisplayName("Direct Hire Regression: Existing Direct Hire notifications remain fully operational and isolated")
    void testDirectHireRegression_NotificationsRemainOperational() {
        Notification dhReq = notificationService.createNotification(
                proLabourAndElectrician,
                "New Direct Hire Request",
                "नया डायरेक्ट हायर अनुरोध",
                "Client Customer Alpha has sent a direct hire request for Labour.",
                "ग्राहक Customer Alpha ने Labour के लिए डायरेक्ट हायर अनुरोध भेजा है।",
                "DIRECT_HIRE_REQUEST",
                "REQ-DH-100"
        );
        assertNotNull(dhReq);
        assertEquals("DIRECT_HIRE_REQUEST", dhReq.getNotificationType());
        assertEquals("REQ-DH-100", dhReq.getReferenceId());

        // Client gets accepted notification
        Notification dhAcc = notificationService.createNotification(
                customerA,
                "Hiring Request Accepted",
                "हायरिंग अनुरोध स्वीकार किया गया",
                "Professional Pro Multi has accepted your direct hire request for Labour.",
                "प्रोफेशनल Pro Multi ने Labour के लिए आपका डायरेक्ट हायर अनुरोध स्वीकार कर लिया है।",
                "HIRING_REQUEST_ACCEPTED",
                "REQ-DH-100"
        );
        assertNotNull(dhAcc);
        assertEquals("HIRING_REQUEST_ACCEPTED", dhAcc.getNotificationType());

        // Pro multi only sees their notification
        List<Notification> proNotifs = getNotificationsFor(proLabourAndElectrician);
        assertEquals(1, proNotifs.size());
        assertEquals("DIRECT_HIRE_REQUEST", proNotifs.get(0).getNotificationType());

        // Customer A only sees their notification
        List<Notification> custNotifs = getNotificationsFor(customerA);
        assertEquals(1, custNotifs.size());
        assertEquals("HIRING_REQUEST_ACCEPTED", custNotifs.get(0).getNotificationType());
    }

    @Test
    @DisplayName("Mark All As Read: Scoped strictly to authenticated user without affecting others")
    void testSecurity_MarkAllAsReadScoping() {
        // Customer A has 2 notifications
        notificationService.createNotification(customerA, "N1", "N1Hi", "Msg1", "Msg1Hi", "ORDER_UPDATE", "ORD-1");
        notificationService.createNotification(customerA, "N2", "N2Hi", "Msg2", "Msg2Hi", "ORDER_UPDATE", "ORD-2");

        // Customer B has 1 notification
        notificationService.createNotification(customerB, "N3", "N3Hi", "Msg3", "Msg3Hi", "ORDER_UPDATE", "ORD-3");

        assertEquals(2L, notificationService.getUnreadCount(customerA));
        assertEquals(1L, notificationService.getUnreadCount(customerB));

        // Customer A marks all as read
        ResponseEntity<?> resp = notificationController.markAllAsRead(mockAuth(customerA.getEmail()));
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        assertEquals(0L, notificationService.getUnreadCount(customerA));
        assertEquals(1L, notificationService.getUnreadCount(customerB), "Customer B unread count must not change when Customer A marks all read");
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id, String email, String name, MarketplaceBackendApplication.Role role
    ) {
        MarketplaceBackendApplication.MarketplaceUser u = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(u, "id", id);
        u.setEmail(email);
        u.setUsername(email);
        u.setName(name);
        u.setPasswordHash("$2a$10$hashedPasswordPlaceholder");
        u.setRoles(new HashSet<>(Set.of(role)));
        u.setEnabled(true);
        return u;
    }

    private void mockService(
            MarketplaceBackendApplication.MarketplaceUser pro,
            String tradeTitle,
            boolean verificationRequired,
            VerificationStatus verificationStatus
    ) {
        ProfessionalService ps = new ProfessionalService();
        ps.setProfessional(pro);
        ps.setServiceTitleEn(tradeTitle);
        ps.setServiceTitleHi(tradeTitle);
        ps.setVerificationRequired(verificationRequired);
        ps.setVerificationStatus(verificationStatus);
        ps.setActive(true);

        ServiceCategory cat = new ServiceCategory("CAT_TRADE", "Trade Services", "ट्रेड सेवाएँ", "fa-tools", true);
        MasterService ms = new MasterService(cat, tradeTitle, tradeTitle, verificationRequired, "Per Day", true);
        ps.setMasterService(ms);

        proServicesMap.computeIfAbsent(pro.getId(), k -> new ArrayList<>()).add(ps);
    }

    private Project createMultiTradeProject(String projectId, MarketplaceBackendApplication.MarketplaceUser owner, List<Map<String, Object>> requestedTrades) {
        Project p = new Project();
        ReflectionTestUtils.setField(p, "id", (long) (projectStore.size() + 1));
        p.setProjectId(projectId);
        p.setProjectTitle("Multi-Trade Site Project " + projectId);
        p.setCustomer(owner);
        p.setStatus("OPEN");
        p.setCity("Mumbai");
        p.setState("Maharashtra");

        Map<String, Object> completeData = new HashMap<>();
        completeData.put("projectId", projectId);
        completeData.put("requestedProfessionals", requestedTrades);

        try {
            p.setCompleteDataJson(objectMapper.writeValueAsString(completeData));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        projectStore.add(p);
        return p;
    }

    private ProjectProfessionalApplication createSimulatedApplication(
            Project project,
            MarketplaceBackendApplication.MarketplaceUser pro,
            String tradeRole,
            Double proposedRate
    ) {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                project,
                pro,
                tradeRole,
                proposedRate,
                "PER_DAY",
                1,
                "15 Days",
                "Quotation details"
        );
        long newId = ++applicationIdSeq;
        ReflectionTestUtils.setField(app, "id", newId);
        app.setApplicationId("APP-TEST-" + newId);
        app.onCreate();
        applicationStore.add(app);
        return app;
    }

    private List<Notification> getNotificationsFor(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getId() == null) return Collections.emptyList();
        return notificationStore.stream()
                .filter(n -> n.getRecipient() != null && user.getId().equals(n.getRecipient().getId()))
                .toList();
    }

    private Authentication mockAuth(String principal) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(principal);
        when(auth.isAuthenticated()).thenReturn(true);
        return auth;
    }
}
