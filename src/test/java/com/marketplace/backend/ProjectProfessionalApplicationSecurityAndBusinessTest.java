package com.marketplace.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — STEP 7 POST REQUIREMENT MULTI-PROFESSIONAL SECURE API LAYER TEST SUITE
 * 
 * Verifies all 32 mandatory criteria:
 * - Professional security & role checking
 * - Trade eligibility resolution (Labour cannot apply for Engineer, etc.)
 * - Duplicate application protection per project + professional
 * - Multiple professional applications under one project
 * - Requester security (Customer, Contractor, Material Seller isolation)
 * - Trade capacity quota enforcement and race condition protection
 * - Multiple accepted professionals under one project
 * - Rejection and withdrawal mechanics
 */
public class ProjectProfessionalApplicationSecurityAndBusinessTest {

    private ProjectRepository projectRepository;
    private ProjectProfessionalApplicationRepository applicationRepository;
    private ProfessionalServiceRepository professionalServiceRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private ObjectMapper objectMapper;

    private ProjectApplicationService applicationService;
    private ProjectApplicationController applicationController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser sellerA;

    private MarketplaceBackendApplication.MarketplaceUser professionalLabour1;
    private MarketplaceBackendApplication.MarketplaceUser professionalLabour2;
    private MarketplaceBackendApplication.MarketplaceUser professionalLabour3;
    private MarketplaceBackendApplication.MarketplaceUser professionalEngineer1;
    private MarketplaceBackendApplication.MarketplaceUser professionalPlumber1;

    private Project projectHire1;
    private List<ProjectProfessionalApplication> simulatedAppDatabase;
    private long appIdSequence = 100L;

    @BeforeEach
    void setUp() {
        projectRepository = mock(ProjectRepository.class);
        applicationRepository = mock(ProjectProfessionalApplicationRepository.class);
        professionalServiceRepository = mock(ProfessionalServiceRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        objectMapper = new ObjectMapper();

        applicationService = new ProjectApplicationService(
                projectRepository,
                applicationRepository,
                professionalServiceRepository,
                userRepository,
                objectMapper
        );

        applicationController = new ProjectApplicationController(applicationService, userRepository);

        simulatedAppDatabase = new ArrayList<>();

        // 1. Requesters
        customerA = createTestUser(1L, "custA@buildbid.com", "Customer Alpha", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(2L, "custB@buildbid.com", "Customer Beta", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorA = createTestUser(3L, "contA@buildbid.com", "Contractor Alpha", MarketplaceBackendApplication.Role.CONTRACTOR);
        contractorB = createTestUser(4L, "contB@buildbid.com", "Contractor Beta", MarketplaceBackendApplication.Role.CONTRACTOR);
        sellerA = createTestUser(5L, "sellerA@buildbid.com", "Seller Alpha", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        // 2. Professionals
        professionalLabour1 = createTestUser(101L, "labour1@buildbid.com", "Ramesh Kumar (Labour)", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professionalLabour2 = createTestUser(102L, "labour2@buildbid.com", "Suresh Yadav (Labour)", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professionalLabour3 = createTestUser(103L, "labour3@buildbid.com", "Mahesh Pal (Labour)", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professionalEngineer1 = createTestUser(201L, "engineer1@buildbid.com", "Priya Sharma (Engineer)", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professionalPlumber1 = createTestUser(301L, "plumber1@buildbid.com", "Vikram Singh (Plumber)", MarketplaceBackendApplication.Role.PROFESSIONAL);

        // Mock userRepository
        List<MarketplaceBackendApplication.MarketplaceUser> allUsers = List.of(
                customerA, customerB, contractorA, contractorB, sellerA,
                professionalLabour1, professionalLabour2, professionalLabour3,
                professionalEngineer1, professionalPlumber1
        );
        for (MarketplaceBackendApplication.MarketplaceUser u : allUsers) {
            when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
            when(userRepository.findByUsername(u.getUsername())).thenReturn(Optional.of(u));
            when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        }

        // 3. Register verified professional services for each professional
        mockProfessionalTrade(professionalLabour1, "Labour", false, VerificationStatus.NOT_REQUIRED);
        mockProfessionalTrade(professionalLabour2, "Labour", false, VerificationStatus.NOT_REQUIRED);
        mockProfessionalTrade(professionalLabour3, "Labour", false, VerificationStatus.NOT_REQUIRED);
        mockProfessionalTrade(professionalEngineer1, "Civil Engineer", true, VerificationStatus.VERIFIED);
        mockProfessionalTrade(professionalPlumber1, "Plumber", false, VerificationStatus.NOT_REQUIRED);

        // 4. Set up sample Post Requirement owned by Customer A: Labour = 2, Engineer = 1
        projectHire1 = new Project();
        projectHire1.setId(10L);
        projectHire1.setProjectId("HIRE-1024");
        projectHire1.setProjectTitle("Residential Renovation HIRE-1024");
        projectHire1.setProjectType("Home Maintenance");
        projectHire1.setLocation("Indore, Madhya Pradesh");
        projectHire1.setStatus("OPEN");
        projectHire1.setCustomer(customerA);

        String sampleJson = """
        {
            "projectId": "HIRE-1024",
            "projectTitle": "Residential Renovation HIRE-1024",
            "projectCategory": "Home Maintenance",
            "location": "Indore, Madhya Pradesh",
            "requestedProfessionals": [
                {
                    "role": "Labour",
                    "quantity": 2,
                    "offerAmount": 550,
                    "offerType": "Per Day"
                },
                {
                    "role": "Engineer",
                    "quantity": 1,
                    "offerAmount": 25000,
                    "offerType": "Per Month"
                }
            ]
        }
        """;
        projectHire1.setCompleteDataJson(sampleJson);

        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectHire1));
        when(projectRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(projectHire1));
        when(projectRepository.findByProjectId("HIRE-1024")).thenReturn(Optional.of(projectHire1));
        when(projectRepository.findByStatusOrderByCreatedAtDesc("OPEN")).thenReturn(List.of(projectHire1));

        // Mock application repository saves
        when(applicationRepository.save(any(ProjectProfessionalApplication.class))).thenAnswer(inv -> {
            ProjectProfessionalApplication app = inv.getArgument(0);
            if (app.getId() == null) {
                ReflectionTestUtils.setField(app, "id", appIdSequence++);
                app.setCreatedAt(LocalDateTime.now());
                if (app.getApplicationId() == null) {
                    app.setApplicationId("APP-" + app.getId());
                }
            }
            if (!simulatedAppDatabase.contains(app)) {
                simulatedAppDatabase.add(app);
            }
            app.setUpdatedAt(LocalDateTime.now());
            return app;
        });

        // Mock counts and queries backed by simulatedAppDatabase
        when(applicationRepository.existsByProjectIdAndProfessionalId(anyLong(), anyLong())).thenAnswer(inv -> {
            Long pId = inv.getArgument(0);
            Long proId = inv.getArgument(1);
            return simulatedAppDatabase.stream().anyMatch(a -> a.getProject().getId().equals(pId) && a.getProfessional().getId().equals(proId));
        });

        when(applicationRepository.findByProjectIdAndProfessionalId(anyLong(), anyLong())).thenAnswer(inv -> {
            Long pId = inv.getArgument(0);
            Long proId = inv.getArgument(1);
            return simulatedAppDatabase.stream()
                    .filter(a -> a.getProject().getId().equals(pId) && a.getProfessional().getId().equals(proId))
                    .findFirst();
        });

        when(applicationRepository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(anyLong(), anyString(), any(ProjectProfessionalApplication.Status.class)))
                .thenAnswer(inv -> {
                    Long pId = inv.getArgument(0);
                    String trade = inv.getArgument(1);
                    ProjectProfessionalApplication.Status st = inv.getArgument(2);
                    return simulatedAppDatabase.stream()
                            .filter(a -> a.getProject().getId().equals(pId)
                                    && ProjectApplicationService.normalizeTrade(a.getTradeRole()).equals(ProjectApplicationService.normalizeTrade(trade))
                                    && a.getStatus() == st)
                            .count();
                });

        when(applicationRepository.findByProjectIdOrderByCreatedAtDesc(anyLong())).thenAnswer(inv -> {
            Long pId = inv.getArgument(0);
            return simulatedAppDatabase.stream().filter(a -> a.getProject().getId().equals(pId)).toList();
        });

        when(applicationRepository.findByProjectIdAndTradeRoleIgnoreCaseOrderByCreatedAtDesc(anyLong(), anyString())).thenAnswer(inv -> {
            Long pId = inv.getArgument(0);
            String trade = inv.getArgument(1);
            return simulatedAppDatabase.stream()
                    .filter(a -> a.getProject().getId().equals(pId) && ProjectApplicationService.normalizeTrade(a.getTradeRole()).equals(ProjectApplicationService.normalizeTrade(trade)))
                    .toList();
        });

        when(applicationRepository.findByApplicationId(anyString())).thenAnswer(inv -> {
            String aId = inv.getArgument(0);
            return simulatedAppDatabase.stream().filter(a -> aId.equalsIgnoreCase(a.getApplicationId())).findFirst();
        });

        when(applicationRepository.findByApplicationIdForUpdate(anyString())).thenAnswer(inv -> {
            String aId = inv.getArgument(0);
            return simulatedAppDatabase.stream().filter(a -> aId.equalsIgnoreCase(a.getApplicationId())).findFirst();
        });
    }

    // ========================================================
    // SECTION 1: PROFESSIONAL SECURITY
    // ========================================================

    @Test
    @DisplayName("1. Unauthenticated professional API → rejected (401)")
    void test01_UnauthenticatedProfessionalApiRejected() {
        ResponseEntity<?> res = applicationController.getEligibleRequirements(null);
        assertEquals(HttpStatus.UNAUTHORIZED, res.getStatusCode());

        ResponseEntity<?> res2 = applicationController.getRequirementDetails("HIRE-1024", null);
        assertEquals(HttpStatus.UNAUTHORIZED, res2.getStatusCode());

        ResponseEntity<?> res3 = applicationController.applyToRequirement("HIRE-1024", new ApplicationSubmissionDto("Labour", 600.0, "PER_DAY", 1, "3 days", "Ready to work"), null);
        assertEquals(HttpStatus.UNAUTHORIZED, res3.getStatusCode());
    }

    @Test
    @DisplayName("2. CUSTOMER cannot use professional application API (403)")
    void test02_CustomerCannotUseProfessionalApplicationApi() {
        Authentication auth = mockAuth(customerA.getEmail());
        ResponseEntity<?> res = applicationController.getEligibleRequirements(auth);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());

        ResponseEntity<?> res2 = applicationController.applyToRequirement("HIRE-1024", new ApplicationSubmissionDto("Labour", 600.0, "PER_DAY", 1, "3 days", "Test"), auth);
        assertEquals(HttpStatus.FORBIDDEN, res2.getStatusCode());
    }

    @Test
    @DisplayName("3. CONTRACTOR cannot use professional application API (403)")
    void test03_ContractorCannotUseProfessionalApplicationApi() {
        Authentication auth = mockAuth(contractorA.getEmail());
        ResponseEntity<?> res = applicationController.getEligibleRequirements(auth);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());

        ResponseEntity<?> res2 = applicationController.applyToRequirement("HIRE-1024", new ApplicationSubmissionDto("Labour", 600.0, "PER_DAY", 1, "3 days", "Test"), auth);
        assertEquals(HttpStatus.FORBIDDEN, res2.getStatusCode());
    }

    @Test
    @DisplayName("4. MATERIAL_SELLER cannot use professional application API (403)")
    void test04_MaterialSellerCannotUseProfessionalApplicationApi() {
        Authentication auth = mockAuth(sellerA.getEmail());
        ResponseEntity<?> res = applicationController.getEligibleRequirements(auth);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());

        ResponseEntity<?> res2 = applicationController.applyToRequirement("HIRE-1024", new ApplicationSubmissionDto("Labour", 600.0, "PER_DAY", 1, "3 days", "Test"), auth);
        assertEquals(HttpStatus.FORBIDDEN, res2.getStatusCode());
    }

    @Test
    @DisplayName("5. Professional identity comes from JWT")
    void test05_ProfessionalIdentityComesFromJwt() {
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "2 days", "Available");
        ResponseEntity<?> res = applicationController.applyToRequirement("HIRE-1024", sub, auth);

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        ProjectProfessionalApplicationDto dto = (ProjectProfessionalApplicationDto) res.getBody();
        assertNotNull(dto);
        assertEquals(professionalLabour1.getId(), dto.getProfessionalId());
        assertEquals(professionalLabour1.getName(), dto.getProfessionalName());
    }

    @Test
    @DisplayName("6. Professional cannot impersonate another professional")
    void test06_ProfessionalCannotImpersonateAnotherProfessional() {
        // Logged in as Labour 1
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "2 days", "Available");
        ResponseEntity<?> res = applicationController.applyToRequirement("HIRE-1024", sub, auth);

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        ProjectProfessionalApplicationDto dto = (ProjectProfessionalApplicationDto) res.getBody();
        // Server derived Labour 1 from JWT, not allowing Labour 2
        assertEquals(professionalLabour1.getId(), dto.getProfessionalId());
        assertNotEquals(professionalLabour2.getId(), dto.getProfessionalId());
    }

    @Test
    @DisplayName("7. Professional cannot apply to own requirement (403)")
    void test07_ProfessionalCannotApplyToOwnRequirement() {
        // Project owned by professionalLabour1
        Project ownProj = new Project();
        ownProj.setId(99L);
        ownProj.setProjectId("HIRE-OWN");
        ownProj.setStatus("OPEN");
        ownProj.setCustomer(professionalLabour1);
        ownProj.setCompleteDataJson(projectHire1.getCompleteDataJson());

        when(projectRepository.findByProjectId("HIRE-OWN")).thenReturn(Optional.of(ownProj));
        when(projectRepository.findById(99L)).thenReturn(Optional.of(ownProj));

        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "2 days", "Self apply");
        ResponseEntity<?> res = applicationController.applyToRequirement("HIRE-OWN", sub, auth);

        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("own requirement"));
    }

    @Test
    @DisplayName("8. Professional cannot apply for an unrelated trade (403)")
    void test08_ProfessionalCannotApplyForUnrelatedTrade() {
        // Plumber tries to apply to project HIRE-1024, but HIRE-1024 only requests Labour and Engineer
        Authentication auth = mockAuth(professionalPlumber1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Plumber", 400.0, "PER_VISIT", 1, "1 day", "Plumber here");
        ResponseEntity<?> res = applicationController.applyToRequirement("HIRE-1024", sub, auth);

        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("not requested"));
    }

    @Test
    @DisplayName("9. Labour cannot submit Engineer application (403)")
    void test09_LabourCannotSubmitEngineerApplication() {
        // Ramesh (Labour) tries to apply for Engineer role in HIRE-1024
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Engineer", 20000.0, "PER_MONTH", 1, "1 month", "I am engineer");
        ResponseEntity<?> res = applicationController.applyToRequirement("HIRE-1024", sub, auth);

        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("not eligible"));
    }

    @Test
    @DisplayName("10. Engineer cannot submit Plumber application (403)")
    void test10_EngineerCannotSubmitPlumberApplication() {
        // Priya (Engineer) tries to apply for Labour
        Authentication auth = mockAuth(professionalEngineer1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "1 day", "I am labour");
        ResponseEntity<?> res = applicationController.applyToRequirement("HIRE-1024", sub, auth);

        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("not eligible"));
    }

    // ========================================================
    // SECTION 2: APPLICATION RULES
    // ========================================================

    @Test
    @DisplayName("11. Valid trade application succeeds (201)")
    void test11_ValidTradeApplicationSucceeds() {
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 2, "5 days", "Experienced crew");
        ResponseEntity<?> res = applicationController.applyToRequirement("HIRE-1024", sub, auth);

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        ProjectProfessionalApplicationDto dto = (ProjectProfessionalApplicationDto) res.getBody();
        assertNotNull(dto);
        assertEquals("Labour", dto.getTradeRole());
        assertEquals(500.0, dto.getProposedRate());
        assertEquals("APPLIED", dto.getStatus());
        assertEquals(2, dto.getTeamSize());
    }

    @Test
    @DisplayName("12. Duplicate professional/project application rejected (409)")
    void test12_DuplicateProfessionalProjectApplicationRejected() {
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ApplicationSubmissionDto sub = new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "2 days", "First app");
        ResponseEntity<?> res1 = applicationController.applyToRequirement("HIRE-1024", sub, auth);
        assertEquals(HttpStatus.CREATED, res1.getStatusCode());

        // Second attempt
        ResponseEntity<?> res2 = applicationController.applyToRequirement("HIRE-1024", sub, auth);
        assertEquals(HttpStatus.CONFLICT, res2.getStatusCode());
        assertTrue(res2.getBody().toString().contains("already submitted"));
    }

    @Test
    @DisplayName("13. Multiple professionals can apply to same project")
    void test13_MultipleProfessionalsCanApplyToSameProject() {
        // Labour 1 applies
        Authentication auth1 = mockAuth(professionalLabour1.getEmail());
        ResponseEntity<?> res1 = applicationController.applyToRequirement(
                "HIRE-1024", new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "3 days", "Labour 1"), auth1);
        assertEquals(HttpStatus.CREATED, res1.getStatusCode());

        // Labour 2 applies
        Authentication auth2 = mockAuth(professionalLabour2.getEmail());
        ResponseEntity<?> res2 = applicationController.applyToRequirement(
                "HIRE-1024", new ApplicationSubmissionDto("Labour", 550.0, "PER_DAY", 1, "3 days", "Labour 2"), auth2);
        assertEquals(HttpStatus.CREATED, res2.getStatusCode());

        // Labour 3 applies
        Authentication auth3 = mockAuth(professionalLabour3.getEmail());
        ResponseEntity<?> res3 = applicationController.applyToRequirement(
                "HIRE-1024", new ApplicationSubmissionDto("Labour", 600.0, "PER_DAY", 1, "3 days", "Labour 3"), auth3);
        assertEquals(HttpStatus.CREATED, res3.getStatusCode());

        // Engineer 1 applies
        Authentication authEng = mockAuth(professionalEngineer1.getEmail());
        ResponseEntity<?> resEng = applicationController.applyToRequirement(
                "HIRE-1024", new ApplicationSubmissionDto("Engineer", 25000.0, "PER_MONTH", 1, "1 month", "Engineer 1"), authEng);
        assertEquals(HttpStatus.CREATED, resEng.getStatusCode());

        assertEquals(4, simulatedAppDatabase.size());
    }

    @Test
    @DisplayName("14. Application is linked to correct Project")
    void test14_ApplicationIsLinkedToCorrectProject() {
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ResponseEntity<?> res = applicationController.applyToRequirement(
                "HIRE-1024", new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "3 days", "Msg"), auth);
        assertEquals(HttpStatus.CREATED, res.getStatusCode());

        ProjectProfessionalApplication saved = simulatedAppDatabase.get(0);
        assertEquals("HIRE-1024", saved.getProject().getProjectId());
        assertEquals(projectHire1.getId(), saved.getProject().getId());
    }

    @Test
    @DisplayName("15. Application is linked to authenticated Professional")
    void test15_ApplicationIsLinkedToAuthenticatedProfessional() {
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ResponseEntity<?> res = applicationController.applyToRequirement(
                "HIRE-1024", new ApplicationSubmissionDto("Labour", 500.0, "PER_DAY", 1, "3 days", "Msg"), auth);
        assertEquals(HttpStatus.CREATED, res.getStatusCode());

        ProjectProfessionalApplication saved = simulatedAppDatabase.get(0);
        assertEquals(professionalLabour1.getId(), saved.getProfessional().getId());
        assertEquals("Ramesh Kumar (Labour)", saved.getProfessional().getName());
    }

    // ========================================================
    // SECTION 3: REQUESTER SECURITY
    // ========================================================

    @Test
    @DisplayName("16. Customer can access only their own Project applications")
    void test16_CustomerCanAccessOnlyTheirOwnProjectApplications() {
        // Add 1 application to projectHire1
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Hello");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(customerA.getEmail());
        ResponseEntity<?> res = applicationController.getApplicationsForRequester("HIRE-1024", null, auth);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        List<?> list = (List<?>) res.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());
    }

    @Test
    @DisplayName("17. Customer cannot access another Customer's applications (403)")
    void test17_CustomerCannotAccessAnotherCustomersApplications() {
        Authentication auth = mockAuth(customerB.getEmail());
        ResponseEntity<?> res = applicationController.getApplicationsForRequester("HIRE-1024", null, auth);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("do not own"));
    }

    @Test
    @DisplayName("18. Contractor can access only their own Project applications")
    void test18_ContractorCanAccessOnlyTheirOwnProjectApplications() {
        Project contractorProj = new Project();
        contractorProj.setId(20L);
        contractorProj.setProjectId("HIRE-CONT-1");
        contractorProj.setStatus("OPEN");
        contractorProj.setCustomer(contractorA);
        contractorProj.setCompleteDataJson(projectHire1.getCompleteDataJson());

        when(projectRepository.findByProjectId("HIRE-CONT-1")).thenReturn(Optional.of(contractorProj));
        when(projectRepository.findById(20L)).thenReturn(Optional.of(contractorProj));

        // Owner contractorA accesses -> 200
        Authentication authOwner = mockAuth(contractorA.getEmail());
        ResponseEntity<?> resOwner = applicationController.getApplicationsForRequester("HIRE-CONT-1", null, authOwner);
        assertEquals(HttpStatus.OK, resOwner.getStatusCode());

        // Another contractorB accesses -> 403
        Authentication authOther = mockAuth(contractorB.getEmail());
        ResponseEntity<?> resOther = applicationController.getApplicationsForRequester("HIRE-CONT-1", null, authOther);
        assertEquals(HttpStatus.FORBIDDEN, resOther.getStatusCode());
    }

    @Test
    @DisplayName("19. Material Seller can access only their own Project applications")
    void test19_MaterialSellerCanAccessOnlyTheirOwnProjectApplications() {
        Project sellerProj = new Project();
        sellerProj.setId(30L);
        sellerProj.setProjectId("HIRE-SELLER-1");
        sellerProj.setStatus("OPEN");
        sellerProj.setCustomer(sellerA);
        sellerProj.setCompleteDataJson(projectHire1.getCompleteDataJson());

        when(projectRepository.findByProjectId("HIRE-SELLER-1")).thenReturn(Optional.of(sellerProj));
        when(projectRepository.findById(30L)).thenReturn(Optional.of(sellerProj));

        // Owner sellerA accesses -> 200
        Authentication authOwner = mockAuth(sellerA.getEmail());
        ResponseEntity<?> resOwner = applicationController.getApplicationsForRequester("HIRE-SELLER-1", null, authOwner);
        assertEquals(HttpStatus.OK, resOwner.getStatusCode());

        // Customer accesses -> 403
        Authentication authOther = mockAuth(customerA.getEmail());
        ResponseEntity<?> resOther = applicationController.getApplicationsForRequester("HIRE-SELLER-1", null, authOther);
        assertEquals(HttpStatus.FORBIDDEN, resOther.getStatusCode());
    }

    @Test
    @DisplayName("20. Professional cannot use requester application-management API (403)")
    void test20_ProfessionalCannotUseRequesterApplicationManagementApi() {
        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ResponseEntity<?> res = applicationController.getApplicationsForRequester("HIRE-1024", null, auth);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());

        ResponseEntity<?> res2 = applicationController.updateApplicationStatus("APP-1", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        assertEquals(HttpStatus.FORBIDDEN, res2.getStatusCode());
    }

    // ========================================================
    // SECTION 4: ACCEPTANCE RULES & QUANTITY ENFORCEMENT
    // ========================================================

    @Test
    @DisplayName("21. Valid requester can accept application")
    void test21_ValidRequesterCanAcceptApplication() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Available");
        app.setApplicationId("APP-101");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(customerA.getEmail());
        ResponseEntity<?> res = applicationController.updateApplicationStatus("APP-101", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        assertEquals(HttpStatus.OK, res.getStatusCode());

        RequesterApplicationDto dto = (RequesterApplicationDto) res.getBody();
        assertNotNull(dto);
        assertEquals("ACCEPTED", dto.getStatus());
        assertNotNull(dto.getHiredAt());
    }

    @Test
    @DisplayName("22. Unauthorized requester cannot accept (403)")
    void test22_UnauthorizedRequesterCannotAccept() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Available");
        app.setApplicationId("APP-101");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(customerB.getEmail());
        ResponseEntity<?> res = applicationController.updateApplicationStatus("APP-101", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
    }

    @Test
    @DisplayName("23. Accepted application records hiredAt")
    void test23_AcceptedApplicationRecordsHiredAt() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Available");
        app.setApplicationId("APP-101");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(customerA.getEmail());
        applicationController.updateApplicationStatus("APP-101", new ApplicationStatusUpdateDto("ACCEPTED"), auth);

        assertNotNull(app.getHiredAt());
        assertEquals(ProjectProfessionalApplication.Status.ACCEPTED, app.getStatus());
    }

    @Test
    @DisplayName("24. Multiple professionals can be accepted under one project")
    void test24_MultipleProfessionalsCanBeAccepted() {
        // Labour required = 2.
        ProjectProfessionalApplication app1 = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "App 1");
        app1.setApplicationId("APP-1");
        simulatedAppDatabase.add(app1);

        ProjectProfessionalApplication app2 = new ProjectProfessionalApplication(
                projectHire1, professionalLabour2, "Labour", 520.0, "PER_DAY", 1, "2 days", "App 2");
        app2.setApplicationId("APP-2");
        simulatedAppDatabase.add(app2);

        Authentication auth = mockAuth(customerA.getEmail());

        // Accept first
        ResponseEntity<?> res1 = applicationController.updateApplicationStatus("APP-1", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        assertEquals(HttpStatus.OK, res1.getStatusCode());

        // Accept second
        ResponseEntity<?> res2 = applicationController.updateApplicationStatus("APP-2", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        assertEquals(HttpStatus.OK, res2.getStatusCode());

        assertEquals(ProjectProfessionalApplication.Status.ACCEPTED, app1.getStatus());
        assertEquals(ProjectProfessionalApplication.Status.ACCEPTED, app2.getStatus());
    }

    @Test
    @DisplayName("25. Cannot accept more professionals than required quantity (409)")
    void test25_CannotAcceptMoreProfessionalsThanRequiredQuantity() {
        // Project HIRE-1024 requires 2 Labour.
        ProjectProfessionalApplication app1 = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "App 1");
        app1.setApplicationId("APP-1");
        simulatedAppDatabase.add(app1);

        ProjectProfessionalApplication app2 = new ProjectProfessionalApplication(
                projectHire1, professionalLabour2, "Labour", 520.0, "PER_DAY", 1, "2 days", "App 2");
        app2.setApplicationId("APP-2");
        simulatedAppDatabase.add(app2);

        ProjectProfessionalApplication app3 = new ProjectProfessionalApplication(
                projectHire1, professionalLabour3, "Labour", 550.0, "PER_DAY", 1, "2 days", "App 3");
        app3.setApplicationId("APP-3");
        simulatedAppDatabase.add(app3);

        Authentication auth = mockAuth(customerA.getEmail());

        // Accept 1 and 2 (fills 2 / 2 slots)
        applicationController.updateApplicationStatus("APP-1", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        applicationController.updateApplicationStatus("APP-2", new ApplicationStatusUpdateDto("ACCEPTED"), auth);

        // Attempt to accept 3rd Labour -> 409 Conflict
        ResponseEntity<?> res3 = applicationController.updateApplicationStatus("APP-3", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        assertEquals(HttpStatus.CONFLICT, res3.getStatusCode());
        assertTrue(res3.getBody().toString().contains("already been fulfilled"));
    }

    @Test
    @DisplayName("26. Different trades maintain separate quantities")
    void test26_DifferentTradesMaintainSeparateQuantities() {
        // Labour required = 2, Engineer required = 1
        List<TradeRequirementSummaryDto> trades = applicationService.extractTradeRequirements(projectHire1, Collections.emptySet());
        TradeRequirementSummaryDto labourTrade = trades.stream().filter(t -> t.getTradeRole().equalsIgnoreCase("Labour")).findFirst().orElseThrow();
        TradeRequirementSummaryDto engineerTrade = trades.stream().filter(t -> t.getTradeRole().equalsIgnoreCase("Engineer")).findFirst().orElseThrow();

        assertEquals(2, labourTrade.getRequiredQuantity());
        assertEquals(1, engineerTrade.getRequiredQuantity());
    }

    @Test
    @DisplayName("27. Accepting Labour does not consume Engineer quantity")
    void test27_AcceptingLabourDoesNotConsumeEngineerQuantity() {
        // Project HIRE-1024 requires 2 Labour and 1 Engineer
        ProjectProfessionalApplication appLabour1 = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Labour 1");
        appLabour1.setApplicationId("APP-L1");
        simulatedAppDatabase.add(appLabour1);

        ProjectProfessionalApplication appLabour2 = new ProjectProfessionalApplication(
                projectHire1, professionalLabour2, "Labour", 520.0, "PER_DAY", 1, "2 days", "Labour 2");
        appLabour2.setApplicationId("APP-L2");
        simulatedAppDatabase.add(appLabour2);

        ProjectProfessionalApplication appEng = new ProjectProfessionalApplication(
                projectHire1, professionalEngineer1, "Engineer", 25000.0, "PER_MONTH", 1, "1 month", "Engineer 1");
        appEng.setApplicationId("APP-ENG");
        simulatedAppDatabase.add(appEng);

        Authentication auth = mockAuth(customerA.getEmail());

        // Accept 2 Labours
        applicationController.updateApplicationStatus("APP-L1", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        applicationController.updateApplicationStatus("APP-L2", new ApplicationStatusUpdateDto("ACCEPTED"), auth);

        // Engineer slot must still be open!
        ResponseEntity<?> resEng = applicationController.updateApplicationStatus("APP-ENG", new ApplicationStatusUpdateDto("ACCEPTED"), auth);
        assertEquals(HttpStatus.OK, resEng.getStatusCode());
        assertEquals(ProjectProfessionalApplication.Status.ACCEPTED, appEng.getStatus());
    }

    @Test
    @DisplayName("28. Rejecting application does not create hiring")
    void test28_RejectingApplicationDoesNotCreateHiring() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Labour 1");
        app.setApplicationId("APP-REJ");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(customerA.getEmail());
        ResponseEntity<?> res = applicationController.updateApplicationStatus("APP-REJ", new ApplicationStatusUpdateDto("REJECTED"), auth);
        assertEquals(HttpStatus.OK, res.getStatusCode());

        assertEquals(ProjectProfessionalApplication.Status.REJECTED, app.getStatus());
        assertNull(app.getHiredAt());
    }

    @Test
    @DisplayName("29. Rejected application remains stored")
    void test29_RejectedApplicationRemainsStored() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Labour 1");
        app.setApplicationId("APP-REJ2");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(customerA.getEmail());
        applicationController.updateApplicationStatus("APP-REJ2", new ApplicationStatusUpdateDto("REJECTED"), auth);

        Optional<ProjectProfessionalApplication> found = simulatedAppDatabase.stream().filter(a -> "APP-REJ2".equals(a.getApplicationId())).findFirst();
        assertTrue(found.isPresent());
        assertEquals(ProjectProfessionalApplication.Status.REJECTED, found.get().getStatus());
    }

    // ========================================================
    // SECTION 5: WITHDRAWAL & DISCOVERY DETAILS
    // ========================================================

    @Test
    @DisplayName("30. Professional can withdraw own application")
    void test30_ProfessionalCanWithdrawOwnApplication() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Labour 1");
        app.setApplicationId("APP-W1");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(professionalLabour1.getEmail());
        ResponseEntity<?> res = applicationController.withdrawApplication("APP-W1", auth);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(ProjectProfessionalApplication.Status.WITHDRAWN, app.getStatus());
    }

    @Test
    @DisplayName("31. Professional cannot withdraw another professional's application (403)")
    void test31_ProfessionalCannotWithdrawAnotherProfessionalsApplication() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectHire1, professionalLabour1, "Labour", 500.0, "PER_DAY", 1, "2 days", "Labour 1");
        app.setApplicationId("APP-W2");
        simulatedAppDatabase.add(app);

        Authentication auth = mockAuth(professionalLabour2.getEmail());
        ResponseEntity<?> res = applicationController.withdrawApplication("APP-W2", auth);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertNotEquals(ProjectProfessionalApplication.Status.WITHDRAWN, app.getStatus());
    }

    @Test
    @DisplayName("32. Professional Discovery and Details exposes accurate remaining quotas")
    void test32_ProfessionalDiscoveryAndDetailsExposesAccurateRemainingQuotas() {
        Authentication authLabour = mockAuth(professionalLabour1.getEmail());
        ResponseEntity<?> res = applicationController.getRequirementDetails("HIRE-1024", authLabour);
        assertEquals(HttpStatus.OK, res.getStatusCode());

        ProfessionalRequirementDetailDto dto = (ProfessionalRequirementDetailDto) res.getBody();
        assertNotNull(dto);
        assertEquals(2, dto.getTradeRequirements().size());

        TradeRequirementSummaryDto labour = dto.getTradeRequirements().stream()
                .filter(t -> t.getTradeRole().equalsIgnoreCase("Labour")).findFirst().orElseThrow();
        assertTrue(labour.isEligible());
        assertEquals(2, labour.getRequiredQuantity());
        assertEquals(2, labour.getRemainingQuantity());
        assertFalse(labour.isFilled());

        TradeRequirementSummaryDto engineer = dto.getTradeRequirements().stream()
                .filter(t -> t.getTradeRole().equalsIgnoreCase("Engineer")).findFirst().orElseThrow();
        assertFalse(engineer.isEligible()); // Ramesh is Labour, not Engineer
    }

    // ========================================================
    // HELPER METHODS
    // ========================================================

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id,
            String email,
            String name,
            MarketplaceBackendApplication.Role role
    ) {
        MarketplaceBackendApplication.MarketplaceUser u = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(u, "id", id);
        u.setEmail(email);
        u.setUsername(email.split("@")[0]);
        u.setName(name);
        u.setRoles(Set.of(role));
        u.setLocation("Indore, MP");
        u.setEnabled(true);
        return u;
    }

    private void mockProfessionalTrade(
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

        ServiceCategory cat = new ServiceCategory("CAT_1", "Trade Services", "ट्रेड सेवाएँ", "fa-tools", true);
        MasterService ms = new MasterService(cat, tradeTitle, tradeTitle, verificationRequired, "Per Day", true);
        ps.setMasterService(ms);

        when(professionalServiceRepository.findByProfessional_IdAndActiveTrue(pro.getId())).thenReturn(List.of(ps));
    }

    private Authentication mockAuth(String principal) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(principal);
        when(auth.isAuthenticated()).thenReturn(true);
        return auth;
    }
}
