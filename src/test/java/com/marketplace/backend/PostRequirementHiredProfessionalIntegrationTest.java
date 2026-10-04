package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — STEP 10 POST REQUIREMENT HIRED PROFESSIONALS INTEGRATION TEST SUITE
 * 
 * Comprehensive tests verifying:
 * 1. Direct Hire: Existing Direct Hire Hired Professional still appears with source DIRECT_HIRE.
 * 2. Post Requirement: Accepted application appears with source POST_REQUIREMENT and status ACTIVE.
 * 3. Status Filtering: APPLIED, SHORTLISTED, REJECTED, WITHDRAWN do not appear.
 * 4. Hiring Date: Authoritative hiredAt is used as hiringDate.
 * 5. Multi-Hiring: Multiple accepted professionals under same trade (e.g. 4 Labourers) all appear.
 * 6. Multi-Trade: Multiple accepted trades (Labour, Electrician, Engineer) all appear independently.
 * 7. Non-Overwriting: Multiple relationships for same professional across Direct Hire and Post Requirement remain distinct.
 * 8. Mixed Result: Requester with both Direct Hire and Post Requirement receives unified list sorted by hiringDate.
 * 9. Ownership Isolation: Customer A cannot see Customer B's hired professionals.
 * 10. Role Isolation: Contractor and Material Seller can see their own accepted professionals; cross-requester access prevented.
 * 11. Professional Access: User with only PROFESSIONAL role receives 403 Forbidden.
 * 12. Security / IDOR: Controller strictly binds identity to Spring Security Authentication, ignoring query parameters.
 */
public class PostRequirementHiredProfessionalIntegrationTest {

    private ClientServiceRequestRepository requestRepository;
    private ProjectProfessionalApplicationRepository applicationRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private HiredProfessionalService hiredProfessionalService;
    private HiredProfessionalController hiredProfessionalController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser sellerA;
    private MarketplaceBackendApplication.MarketplaceUser sellerB;
    private MarketplaceBackendApplication.MarketplaceUser professional1;
    private MarketplaceBackendApplication.MarketplaceUser professional2;
    private MarketplaceBackendApplication.MarketplaceUser professional3;
    private MarketplaceBackendApplication.MarketplaceUser professional4;
    private MarketplaceBackendApplication.MarketplaceUser pureProfessional;

    private Project projectCustA;
    private Project projectCustB;
    private Project projectContA;
    private Project projectSellerA;

    private List<ClientServiceRequest> mockDirectHireDb;
    private List<ProjectProfessionalApplication> mockApplicationDb;

    @BeforeEach
    void setUp() {
        requestRepository = mock(ClientServiceRequestRepository.class);
        applicationRepository = mock(ProjectProfessionalApplicationRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        hiredProfessionalService = new HiredProfessionalService(requestRepository, applicationRepository);
        hiredProfessionalController = new HiredProfessionalController(hiredProfessionalService, userRepository);

        mockDirectHireDb = new ArrayList<>();
        mockApplicationDb = new ArrayList<>();

        // Create Users
        customerA = createTestUser(101L, "custA@test.com", "Customer Alpha", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(102L, "custB@test.com", "Customer Beta", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorA = createTestUser(201L, "contA@test.com", "Contractor Alpha", MarketplaceBackendApplication.Role.CONTRACTOR);
        contractorB = createTestUser(202L, "contB@test.com", "Contractor Beta", MarketplaceBackendApplication.Role.CONTRACTOR);
        sellerA = createTestUser(301L, "sellerA@test.com", "Seller Alpha", MarketplaceBackendApplication.Role.MATERIAL_SELLER);
        sellerB = createTestUser(302L, "sellerB@test.com", "Seller Beta", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        professional1 = createTestUser(401L, "pro1@test.com", "Ramesh Kumar", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professional2 = createTestUser(402L, "pro2@test.com", "Suresh Sharma", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professional3 = createTestUser(403L, "pro3@test.com", "Mohan Lal", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professional4 = createTestUser(404L, "pro4@test.com", "Rajesh Patel", MarketplaceBackendApplication.Role.PROFESSIONAL);
        pureProfessional = createTestUser(405L, "purepro@test.com", "Pure Specialist", MarketplaceBackendApplication.Role.PROFESSIONAL);

        // Projects
        projectCustA = createProject(1L, "PRJ-CUSTA-1", "Greenfield Villa", customerA);
        projectCustB = createProject(2L, "PRJ-CUSTB-1", "Blue Horizon Complex", customerB);
        projectContA = createProject(3L, "PRJ-CONTA-1", "Highway Bridge Repair", contractorA);
        projectSellerA = createProject(4L, "PRJ-SELLA-1", "Warehouse Shed Expansion", sellerA);

        // Mock userRepository
        List<MarketplaceBackendApplication.MarketplaceUser> allUsers = List.of(
                customerA, customerB, contractorA, contractorB, sellerA, sellerB,
                professional1, professional2, professional3, professional4, pureProfessional
        );
        for (MarketplaceBackendApplication.MarketplaceUser u : allUsers) {
            when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
            when(userRepository.findByUsername(u.getUsername())).thenReturn(Optional.of(u));
            when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        }

        // Mock requestRepository
        when(requestRepository.findByClient_IdAndStatusIgnoreCaseOrderByCreatedAtDesc(anyLong(), anyString()))
                .thenAnswer(invocation -> {
                    Long clientId = invocation.getArgument(0);
                    String status = invocation.getArgument(1);
                    return mockDirectHireDb.stream()
                            .filter(r -> r.getClient() != null && clientId.equals(r.getClient().getId()) && status.equalsIgnoreCase(r.getStatus()))
                            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                            .collect(Collectors.toList());
                });

        // Mock applicationRepository
        when(applicationRepository.findByProjectCustomerIdAndStatusOrderByHiredAtDesc(anyLong(), any(ProjectProfessionalApplication.Status.class)))
                .thenAnswer(invocation -> {
                    Long customerId = invocation.getArgument(0);
                    ProjectProfessionalApplication.Status status = invocation.getArgument(1);
                    return mockApplicationDb.stream()
                            .filter(a -> a.getProject() != null && a.getProject().getCustomer() != null
                                    && customerId.equals(a.getProject().getCustomer().getId())
                                    && status == a.getStatus())
                            .sorted((a, b) -> {
                                LocalDateTime da = a.getHiredAt() != null ? a.getHiredAt() : a.getCreatedAt();
                                LocalDateTime db = b.getHiredAt() != null ? b.getHiredAt() : b.getCreatedAt();
                                if (da == null && db == null) return 0;
                                if (da == null) return 1;
                                if (db == null) return -1;
                                return db.compareTo(da);
                            })
                            .collect(Collectors.toList());
                });
    }

    // ========================================================
    // 1. DIRECT HIRE TESTS (EXISTING FLOW INTACT)
    // ========================================================

    @Test
    @DisplayName("Direct Hire: Existing accepted Direct Hire still appears with source DIRECT_HIRE")
    void testDirectHireStillAppearsWithCorrectSource() {
        ClientServiceRequest directReq = new ClientServiceRequest();
        directReq.setId(10L);
        directReq.setRequestId("REQ-DH-10");
        directReq.setClient(customerA);
        directReq.setProfessional(professional1);
        directReq.setRequestedService("Plumber");
        directReq.setStatus("Accepted");
        directReq.setClientBudget(15000.0);
        directReq.setProjectScope("Fix main drainage pipeline");
        directReq.setCreatedAt(LocalDateTime.now().minusDays(2));
        directReq.setUpdatedAt(LocalDateTime.now().minusDays(1));
        mockDirectHireDb.add(directReq);

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());

        HiredProfessionalDto dto = list.get(0);
        assertEquals("REQ-DH-10", dto.getHiringId());
        assertEquals("DIRECT_HIRE", dto.getHiredVia());
        assertEquals("ACTIVE", dto.getStatus());
        assertEquals("Plumber", dto.getService());
        assertEquals(15000.0, dto.getAgreedBudget());
        assertEquals(professional1.getName(), dto.getProfessionalName());
    }

    // ========================================================
    // 2. POST REQUIREMENT TESTS (ACCEPTED APPLICATION LIFECYCLE)
    // ========================================================

    @Test
    @DisplayName("Post Requirement: Accepted application appears with source POST_REQUIREMENT")
    void testAcceptedPostRequirementAppears() {
        LocalDateTime hiredTime = LocalDateTime.of(2026, 10, 4, 11, 30);
        ProjectProfessionalApplication app = new ProjectProfessionalApplication();
        app.setId(101L);
        app.setApplicationId("APP-101");
        app.setProject(projectCustA);
        app.setProfessional(professional1);
        app.setTradeRole("Labour");
        app.setProposedRate(800.0);
        app.setRateType("PER_DAY");
        app.setTeamSize(1);
        app.setStatus(ProjectProfessionalApplication.Status.ACCEPTED);
        app.setHiredAt(hiredTime);
        app.setCreatedAt(hiredTime.minusHours(5));
        app.setCoverMessage("Experienced in foundation work");
        mockApplicationDb.add(app);

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());

        HiredProfessionalDto dto = list.get(0);
        assertEquals("APP-101", dto.getHiringId());
        assertEquals("PRJ-CUSTA-1", dto.getRequestId());
        assertEquals(professional1.getId(), dto.getProfessionalUserId());
        assertEquals("Ramesh Kumar", dto.getProfessionalName());
        assertEquals("Labour", dto.getService());
        assertEquals("Labour", dto.getServiceType());
        assertEquals("ACTIVE", dto.getStatus());
        assertEquals("POST_REQUIREMENT", dto.getHiredVia());
        assertEquals(800.0, dto.getAgreedBudget());
        assertEquals(hiredTime, dto.getHiringDate());
        assertTrue(dto.getProjectScope().contains("Greenfield Villa"));
        assertTrue(dto.getProjectScope().contains("Experienced in foundation work"));
    }

    @Test
    @DisplayName("Post Requirement: Non-accepted applications (APPLIED, SHORTLISTED, REJECTED, WITHDRAWN) do not appear")
    void testNonAcceptedApplicationsDoNotAppear() {
        // APPLIED
        ProjectProfessionalApplication app1 = createApplication(1L, "APP-1", projectCustA, professional1, "Labour", ProjectProfessionalApplication.Status.APPLIED, null);
        // SHORTLISTED
        ProjectProfessionalApplication app2 = createApplication(2L, "APP-2", projectCustA, professional2, "Electrician", ProjectProfessionalApplication.Status.SHORTLISTED, null);
        // REJECTED
        ProjectProfessionalApplication app3 = createApplication(3L, "APP-3", projectCustA, professional3, "Plumber", ProjectProfessionalApplication.Status.REJECTED, null);
        // WITHDRAWN
        ProjectProfessionalApplication app4 = createApplication(4L, "APP-4", projectCustA, professional4, "Mason", ProjectProfessionalApplication.Status.WITHDRAWN, null);

        mockApplicationDb.addAll(List.of(app1, app2, app3, app4));

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();
        assertNotNull(list);
        assertTrue(list.isEmpty(), "Non-accepted applications must NOT appear in Hired Professionals");
    }

    @Test
    @DisplayName("Hiring Date: Authoritative hiredAt date is used when present")
    void testHiredAtIsAuthoritative() {
        LocalDateTime createTime = LocalDateTime.of(2026, 10, 1, 9, 0);
        LocalDateTime acceptTime = LocalDateTime.of(2026, 10, 4, 15, 45);

        ProjectProfessionalApplication app = createApplication(5L, "APP-5", projectCustA, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, acceptTime);
        app.setCreatedAt(createTime);
        mockApplicationDb.add(app);

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();
        assertEquals(1, list.size());
        assertEquals(acceptTime, list.get(0).getHiringDate());
    }

    // ========================================================
    // 3. MULTI-HIRING TESTS
    // ========================================================

    @Test
    @DisplayName("Multi-Hiring: Multiple accepted Labour professionals under one requirement all appear")
    void testMultipleAcceptedLabourProfessionalsAllAppear() {
        LocalDateTime t1 = LocalDateTime.of(2026, 10, 4, 10, 0);
        LocalDateTime t2 = LocalDateTime.of(2026, 10, 4, 10, 30);
        LocalDateTime t3 = LocalDateTime.of(2026, 10, 4, 11, 0);
        LocalDateTime t4 = LocalDateTime.of(2026, 10, 4, 11, 30);

        ProjectProfessionalApplication app1 = createApplication(11L, "APP-LAB-1", projectCustA, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, t1);
        ProjectProfessionalApplication app2 = createApplication(12L, "APP-LAB-2", projectCustA, professional2, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, t2);
        ProjectProfessionalApplication app3 = createApplication(13L, "APP-LAB-3", projectCustA, professional3, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, t3);
        ProjectProfessionalApplication app4 = createApplication(14L, "APP-LAB-4", projectCustA, professional4, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, t4);

        mockApplicationDb.addAll(List.of(app1, app2, app3, app4));

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();

        assertEquals(4, list.size(), "All 4 accepted Labour professionals must appear");
        Set<String> hiringIds = list.stream().map(HiredProfessionalDto::getHiringId).collect(Collectors.toSet());
        assertTrue(hiringIds.containsAll(Set.of("APP-LAB-1", "APP-LAB-2", "APP-LAB-3", "APP-LAB-4")));
    }

    @Test
    @DisplayName("Multi-Trade: Multiple accepted trades under same project independently appear")
    void testMultipleTradesIndependentlyAppear() {
        ProjectProfessionalApplication appLabour = createApplication(21L, "APP-T-1", projectCustA, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        ProjectProfessionalApplication appElectrician = createApplication(22L, "APP-T-2", projectCustA, professional2, "Electrician", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        ProjectProfessionalApplication appEngineer = createApplication(23L, "APP-T-3", projectCustA, professional3, "Civil Engineer", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());

        mockApplicationDb.addAll(List.of(appLabour, appElectrician, appEngineer));

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();

        assertEquals(3, list.size());
        Set<String> services = list.stream().map(HiredProfessionalDto::getService).collect(Collectors.toSet());
        assertTrue(services.containsAll(Set.of("Labour", "Electrician", "Civil Engineer")));
    }

    // ========================================================
    // 4. MIXED DIRECT HIRE + POST REQUIREMENT
    // ========================================================

    @Test
    @DisplayName("Mixed Result: Requester with both Direct Hire and Post Requirement receives unified list")
    void testDirectHireAndPostRequirementMixedResult() {
        // Direct Hire: Amit Singh (Civil Engineer)
        ClientServiceRequest csr = new ClientServiceRequest();
        csr.setId(50L);
        csr.setRequestId("REQ-DH-50");
        csr.setClient(customerA);
        csr.setProfessional(professional3);
        csr.setRequestedService("Civil Engineer");
        csr.setStatus("Accepted");
        csr.setClientBudget(45000.0);
        csr.setCreatedAt(LocalDateTime.of(2026, 10, 2, 10, 0));
        mockDirectHireDb.add(csr);

        // Post Requirement: Ramesh Kumar (Labour)
        ProjectProfessionalApplication app1 = createApplication(51L, "APP-PR-51", projectCustA, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.of(2026, 10, 4, 14, 0));
        // Post Requirement: Suresh Sharma (Electrician)
        ProjectProfessionalApplication app2 = createApplication(52L, "APP-PR-52", projectCustA, professional2, "Electrician", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.of(2026, 10, 3, 11, 0));

        mockApplicationDb.addAll(List.of(app1, app2));

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();

        assertEquals(3, list.size());

        // Sorted newest first:
        // 1. APP-PR-51 (2026-10-04)
        // 2. APP-PR-52 (2026-10-03)
        // 3. REQ-DH-50 (2026-10-02)
        assertEquals("APP-PR-51", list.get(0).getHiringId());
        assertEquals("POST_REQUIREMENT", list.get(0).getHiredVia());
        assertEquals("Labour", list.get(0).getService());

        assertEquals("APP-PR-52", list.get(1).getHiringId());
        assertEquals("POST_REQUIREMENT", list.get(1).getHiredVia());
        assertEquals("Electrician", list.get(1).getService());

        assertEquals("REQ-DH-50", list.get(2).getHiringId());
        assertEquals("DIRECT_HIRE", list.get(2).getHiredVia());
        assertEquals("Civil Engineer", list.get(2).getService());
    }

    @Test
    @DisplayName("Non-Merging: Same professional hired via Direct Hire AND Post Requirement retains both distinct records")
    void testSameProfessionalInMultipleHiringRelationships() {
        // Professional 1 hired directly
        ClientServiceRequest csr = new ClientServiceRequest();
        csr.setId(60L);
        csr.setRequestId("REQ-DH-60");
        csr.setClient(customerA);
        csr.setProfessional(professional1);
        csr.setRequestedService("Site Supervision");
        csr.setStatus("Accepted");
        csr.setCreatedAt(LocalDateTime.now().minusDays(1));
        mockDirectHireDb.add(csr);

        // Professional 1 ALSO hired through Post Requirement
        ProjectProfessionalApplication app = createApplication(61L, "APP-PR-61", projectCustA, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        mockApplicationDb.add(app);

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();

        assertEquals(2, list.size(), "Same professional must appear for both distinct hiring relationships");
        Set<String> vias = list.stream().map(HiredProfessionalDto::getHiredVia).collect(Collectors.toSet());
        assertTrue(vias.contains("DIRECT_HIRE"));
        assertTrue(vias.contains("POST_REQUIREMENT"));
    }

    // ========================================================
    // 5. OWNERSHIP & SECURITY ISOLATION
    // ========================================================

    @Test
    @DisplayName("Ownership: Customer A cannot see Customer B's Post Requirement accepted professionals")
    void testCustomerOwnershipIsolation() {
        ProjectProfessionalApplication appCustB = createApplication(70L, "APP-B-70", projectCustB, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        mockApplicationDb.add(appCustB);

        // Customer A queries
        Authentication authA = mockAuth(customerA);
        ResponseEntity<?> respA = hiredProfessionalController.getHiredProfessionals(authA);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> listA = (List<HiredProfessionalDto>) respA.getBody();
        assertTrue(listA.isEmpty(), "Customer A must NOT see Customer B's hired professionals");

        // Customer B queries
        Authentication authB = mockAuth(customerB);
        ResponseEntity<?> respB = hiredProfessionalController.getHiredProfessionals(authB);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> listB = (List<HiredProfessionalDto>) respB.getBody();
        assertEquals(1, listB.size());
        assertEquals("APP-B-70", listB.get(0).getHiringId());
    }

    @Test
    @DisplayName("Ownership: Contractor A sees only Contractor A's accepted professionals, not Contractor B's")
    void testContractorOwnershipIsolation() {
        Project projectContB = createProject(5L, "PRJ-CONTB-1", "Bridge 2", contractorB);

        ProjectProfessionalApplication appContA = createApplication(80L, "APP-CA-80", projectContA, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        ProjectProfessionalApplication appContB = createApplication(81L, "APP-CB-81", projectContB, professional2, "Electrician", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        mockApplicationDb.addAll(List.of(appContA, appContB));

        Authentication auth = mockAuth(contractorA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();

        assertEquals(1, list.size());
        assertEquals("APP-CA-80", list.get(0).getHiringId());
    }

    @Test
    @DisplayName("Ownership: Material Seller A sees only Material Seller A's accepted professionals")
    void testMaterialSellerOwnershipIsolation() {
        Project projectSellerB = createProject(6L, "PRJ-SELLB-1", "Warehouse B", sellerB);

        ProjectProfessionalApplication appSellerA = createApplication(90L, "APP-SA-90", projectSellerA, professional1, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        ProjectProfessionalApplication appSellerB = createApplication(91L, "APP-SB-91", projectSellerB, professional2, "Labour", ProjectProfessionalApplication.Status.ACCEPTED, LocalDateTime.now());
        mockApplicationDb.addAll(List.of(appSellerA, appSellerB));

        Authentication auth = mockAuth(sellerA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();

        assertEquals(1, list.size());
        assertEquals("APP-SA-90", list.get(0).getHiringId());
    }

    @Test
    @DisplayName("Professional Role Guard: PROFESSIONAL cannot access requester Hired Professionals endpoint (403 Forbidden)")
    void testProfessionalRoleBlockedWith403() {
        Authentication auth = mockAuth(pureProfessional);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Access denied"));
    }

    @Test
    @DisplayName("Security: Unauthenticated request returns 401 Unauthorized")
    void testUnauthenticatedReturns401() {
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(null);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    // ========================================================
    // HELPER METHODS
    // ========================================================

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id, String email, String name, MarketplaceBackendApplication.Role role
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(user, "id", id);
        user.setEmail(email);
        user.setUsername(email);
        user.setName(name);
        user.setRoles(Set.of(role));
        user.setPhone("+91 9876543210");
        user.setLocation("New Delhi");
        return user;
    }

    private Project createProject(Long id, String projectId, String title, MarketplaceBackendApplication.MarketplaceUser customer) {
        Project p = new Project();
        p.setId(id);
        p.setProjectId(projectId);
        p.setProjectTitle(title);
        p.setTitle(title);
        p.setCustomer(customer);
        p.setLocation("New Delhi");
        p.setCity("New Delhi");
        return p;
    }

    private ProjectProfessionalApplication createApplication(
            Long id,
            String appId,
            Project project,
            MarketplaceBackendApplication.MarketplaceUser professional,
            String tradeRole,
            ProjectProfessionalApplication.Status status,
            LocalDateTime hiredAt
    ) {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication();
        app.setId(id);
        app.setApplicationId(appId);
        app.setProject(project);
        app.setProfessional(professional);
        app.setTradeRole(tradeRole);
        app.setProposedRate(750.0);
        app.setRateType("PER_DAY");
        app.setTeamSize(1);
        app.setStatus(status);
        app.setHiredAt(hiredAt);
        app.setCreatedAt(LocalDateTime.now().minusDays(1));
        return app;
    }

    private Authentication mockAuth(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) return null;
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.name()))
                .collect(Collectors.toList());
        return new UsernamePasswordAuthenticationToken(user.getEmail(), null, authorities);
    }
}
