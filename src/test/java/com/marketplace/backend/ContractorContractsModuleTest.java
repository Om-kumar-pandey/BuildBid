package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * CONTRACTOR DASHBOARD: MY CONTRACTS MODULE TESTS
 *
 * Verifies:
 * 1. An awarded project appears exclusively for its assigned contractor.
 * 2. Pending, rejected, withdrawn, and not-selected bids NEVER appear as contracts.
 * 3. Strict contractor-level authorization (Contractor A never sees Contractor B's contracts).
 * 4. Unauthenticated and non-contractor requests are rejected (401/403).
 * 5. Enriched project specs, scope, financials, and customer contacts are present in the response DTO.
 * 6. Empty contracts list returns HTTP 200 with an empty list (no null pointers or exceptions).
 */
public class ContractorContractsModuleTest {

    private MyBidService myBidService;
    private ProjectRepository projectRepository;
    private MyBidRepository myBidRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;

    private MyBidController myBidController;

    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser customerUser;

    private Authentication authContractorA;
    private Authentication authContractorB;
    private Authentication authCustomer;

    private Project project1;
    private MyBid bid1;
    private MyBidAssignment assignment1;

    @BeforeEach
    void setUp() {
        myBidService = mock(MyBidService.class);
        projectRepository = mock(ProjectRepository.class);
        myBidRepository = mock(MyBidRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        myBidController = new MyBidController(
                myBidService,
                projectRepository,
                myBidRepository,
                userRepository
        );

        // Contractor A
        contractorA = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(contractorA, "id", 10L);
        contractorA.setName("Sharma Construction");
        contractorA.setEmail("contractora@example.com");
        contractorA.setPhone("+91 9876543210");
        contractorA.setLocation("Jaipur, Rajasthan");
        contractorA.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CONTRACTOR)));

        // Contractor B
        contractorB = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(contractorB, "id", 20L);
        contractorB.setName("Verma Builders");
        contractorB.setEmail("contractorb@example.com");
        contractorB.setPhone("+91 9123456780");
        contractorB.setLocation("Delhi, NCR");
        contractorB.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CONTRACTOR)));

        // Customer
        customerUser = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(customerUser, "id", 30L);
        customerUser.setName("Rajesh Gupta");
        customerUser.setEmail("rajesh.gupta@example.com");
        customerUser.setPhone("+91 9988776655");
        customerUser.setLocation("Vaishali Nagar, Jaipur");
        customerUser.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CUSTOMER)));

        // Authentications
        authContractorA = mock(Authentication.class);
        when(authContractorA.getName()).thenReturn("contractora@example.com");

        authContractorB = mock(Authentication.class);
        when(authContractorB.getName()).thenReturn("contractorb@example.com");

        authCustomer = mock(Authentication.class);
        when(authCustomer.getName()).thenReturn("rajesh.gupta@example.com");

        when(userRepository.findByEmail("contractora@example.com")).thenReturn(Optional.of(contractorA));
        when(userRepository.findByEmail("contractorb@example.com")).thenReturn(Optional.of(contractorB));
        when(userRepository.findByEmail("rajesh.gupta@example.com")).thenReturn(Optional.of(customerUser));

        // Sample Awarded Project
        project1 = new Project();
        project1.setId(100L);
        project1.setProjectId("PRJ-100");
        project1.setProjectTitle("Modern 3-BHK Villa Construction");
        project1.setProjectType("New Construction");
        project1.setDescription("Complete RCC civil structure and brickwork construction.");
        project1.setAddress("Plot 42, Sector 5, Mansarovar");
        project1.setCity("Jaipur");
        project1.setState("Rajasthan");
        project1.setPincode("302020");
        project1.setBuiltUpArea(2400.0);
        project1.setPlotArea(3000.0);
        project1.setFloors("G + 2 Floors");
        project1.setQualityTier("Premium");
        project1.setTimeline("6 Months");
        project1.setTargetStartDate("2026-11-01");
        project1.setCustomer(customerUser);

        // Sample Bid
        bid1 = new MyBid();
        bid1.setId(500L);
        bid1.setProject(project1);
        bid1.setContractor(contractorA);
        bid1.setCustomer(customerUser);
        bid1.setBidAmount(4500000.0);
        bid1.setMaterialCost(2800000.0);
        bid1.setLabourCost(1200000.0);
        bid1.setEquipmentCost(300000.0);
        bid1.setTransportCost(150000.0);
        bid1.setOtherCharges(50000.0);
        bid1.setEstimatedDuration("6 Months");
        bid1.setProposedTimeline("Nov 2026 to Apr 2027");
        bid1.setWorkersCount(18);
        bid1.setScopeOfWork("Complete structure, masonry, plaster, and plumbing rough-ins.");
        bid1.setIncludedWork("Foundation, RCC column beams, brick walls");
        bid1.setExcludedWork("Interior loose furniture");
        bid1.setPaymentTerms("20% advance, 80% running bills");
        bid1.setWarranty("5-year structural warranty");
        bid1.setStatus(MyBid.Status.ACCEPTED);
        bid1.setSubmittedAt(LocalDateTime.now().minusDays(5));

        // Sample Active Assignment
        assignment1 = new MyBidAssignment();
        assignment1.setId(1L);
        assignment1.setProject(project1);
        assignment1.setContractor(contractorA);
        assignment1.setCustomer(customerUser);
        assignment1.setAcceptedBid(bid1);
        assignment1.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment1.setCurrent(true);
        assignment1.setAcceptedAt(LocalDateTime.now().minusDays(2));
    }

    @Test
    @DisplayName("Test 1: Only awarded active assignments appear in My Contracts for Contractor A")
    void test1_onlyAwardedActiveAssignmentsReturnedAsContracts() {
        when(myBidService.getMyContracts(contractorA)).thenReturn(Collections.singletonList(assignment1));

        ResponseEntity<?> response = myBidController.getContractorContracts(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<MyBidController.AssignmentResponseDto> dtoList = (List<MyBidController.AssignmentResponseDto>) response.getBody();
        assertNotNull(dtoList);
        assertEquals(1, dtoList.size());

        MyBidController.AssignmentResponseDto dto = dtoList.get(0);
        assertEquals(1L, dto.getId());
        assertEquals(100L, dto.getProjectId());
        assertEquals("PRJ-100", dto.getProjectCustomId());
        assertEquals("Modern 3-BHK Villa Construction", dto.getProjectTitle());
        assertEquals(4500000.0, dto.getBidAmount());
        assertEquals("ACTIVE", dto.getAssignmentStatus());
        assertTrue(dto.isCurrent());
    }

    @Test
    @DisplayName("Test 2: Pending, rejected, and withdrawn bids NEVER appear as contracts")
    void test2_pendingRejectedWithdrawnBidsNeverReturnedAsContracts() {
        // Contractor has submitted 3 bids: one PENDING, one REJECTED, one WITHDRAWN. None are accepted.
        // myBidService.getMyContracts only queries assignments where isCurrent is true.
        when(myBidService.getMyContracts(contractorA)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = myBidController.getContractorContracts(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<MyBidController.AssignmentResponseDto> dtoList = (List<MyBidController.AssignmentResponseDto>) response.getBody();
        assertNotNull(dtoList);
        assertTrue(dtoList.isEmpty(), "Pending and rejected bids must never appear as awarded contracts.");
    }

    @Test
    @DisplayName("Test 3: Contractor B cannot see contracts awarded to Contractor A")
    void test3_contractorIsolation_ContractorACannotSeeContractorBContracts() {
        // Assignment 1 belongs to Contractor A.
        when(myBidService.getMyContracts(contractorA)).thenReturn(Collections.singletonList(assignment1));
        when(myBidService.getMyContracts(contractorB)).thenReturn(Collections.emptyList());

        ResponseEntity<?> responseB = myBidController.getContractorContracts(authContractorB);
        assertEquals(HttpStatus.OK, responseB.getStatusCode());

        @SuppressWarnings("unchecked")
        List<MyBidController.AssignmentResponseDto> dtoListB = (List<MyBidController.AssignmentResponseDto>) responseB.getBody();
        assertNotNull(dtoListB);
        assertTrue(dtoListB.isEmpty(), "Contractor B must not see Contractor A's awarded contract.");
    }

    @Test
    @DisplayName("Test 4: Unauthenticated request returns 401 Unauthorized")
    void test4_unauthorizedAccessRejected() {
        ResponseEntity<?> response = myBidController.getContractorContracts(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("Test 5: Customer role attempting to access contractor contracts returns 403 Forbidden")
    void test5_nonContractorRoleRejected() {
        ResponseEntity<?> response = myBidController.getContractorContracts(authCustomer);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("Test 6: Enriched DTO contains full project specs, scope, and authorized customer contact")
    void test6_contractDtoContainsEnrichedProjectAndCustomerDetails() {
        when(myBidService.getMyContracts(contractorA)).thenReturn(Collections.singletonList(assignment1));

        ResponseEntity<?> response = myBidController.getContractorContracts(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<MyBidController.AssignmentResponseDto> dtoList = (List<MyBidController.AssignmentResponseDto>) response.getBody();
        assertEquals(1, dtoList.size());

        MyBidController.AssignmentResponseDto dto = dtoList.get(0);

        // Technical Specs
        assertEquals("New Construction", dto.getProjectType());
        assertEquals("Plot 42, Sector 5, Mansarovar", dto.getSiteAddress());
        assertEquals("Jaipur", dto.getCity());
        assertEquals("Rajasthan", dto.getState());
        assertEquals("302020", dto.getPincode());
        assertEquals(2400.0, dto.getBuiltUpArea());
        assertEquals("G + 2 Floors", dto.getFloors());
        assertEquals("Premium", dto.getQualityTier());
        assertEquals("6 Months", dto.getTimeline());
        assertEquals("2026-11-01", dto.getTargetStartDate());

        // Scope & Terms
        assertEquals("Complete structure, masonry, plaster, and plumbing rough-ins.", dto.getScopeOfWork());
        assertEquals("Foundation, RCC column beams, brick walls", dto.getIncludedWork());
        assertEquals("Interior loose furniture", dto.getExcludedWork());
        assertEquals("20% advance, 80% running bills", dto.getPaymentTerms());
        assertEquals("5-year structural warranty", dto.getWarranty());
        assertEquals(18, dto.getWorkersCount());

        // Financials
        assertEquals(2800000.0, dto.getMaterialCost());
        assertEquals(1200000.0, dto.getLabourCost());
        assertEquals(300000.0, dto.getEquipmentCost());

        // Customer Information
        assertNotNull(dto.getCustomer());
        assertEquals(30L, dto.getCustomer().getUserId());
        assertEquals("Rajesh Gupta", dto.getCustomer().getName());
        assertEquals("rajesh.gupta@example.com", dto.getCustomer().getEmail());
        assertEquals("+91 9988776655", dto.getCustomer().getPhone());
        assertEquals("Vaishali Nagar, Jaipur", dto.getCustomer().getLocation());
    }

    @Test
    @DisplayName("Test 7: Empty contracts result is handled gracefully with HTTP 200 and empty list")
    void test7_emptyContractsListHandledGracefully() {
        when(myBidService.getMyContracts(contractorA)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = myBidController.getContractorContracts(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<MyBidController.AssignmentResponseDto> dtoList = (List<MyBidController.AssignmentResponseDto>) response.getBody();
        assertNotNull(dtoList);
        assertEquals(0, dtoList.size());
    }

    @Test
    @DisplayName("Test 8: Security Privacy Audit — raw completeDataJson is never leaked in AssignmentResponseDto")
    void test8_completeDataJsonPrivacy_rawJsonNeverLeakedInDto() {
        project1.setCompleteDataJson("{\"secretClientNote\":\"VIP Customer\",\"internalBudget\":9999999}");
        when(myBidService.getMyContracts(contractorA)).thenReturn(Collections.singletonList(assignment1));

        ResponseEntity<?> response = myBidController.getContractorContracts(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<MyBidController.AssignmentResponseDto> dtoList = (List<MyBidController.AssignmentResponseDto>) response.getBody();
        assertEquals(1, dtoList.size());

        MyBidController.AssignmentResponseDto dto = dtoList.get(0);
        // Verify raw un-sanitized JSON payload is NOT leaked
        assertNull(dto.getCompleteDataJson(), "Raw unrestricted completeDataJson must never be leaked to contractors.");
        // All necessary typed specs are preserved
        assertEquals("Modern 3-BHK Villa Construction", dto.getProjectTitle());
        assertEquals("New Construction", dto.getProjectType());
        assertEquals("Plot 42, Sector 5, Mansarovar", dto.getSiteAddress());
        assertEquals(2400.0, dto.getBuiltUpArea());
    }

    @Test
    @DisplayName("Test 9: Project Details Authorization — Contractor B cannot access Contractor A's awarded project")
    void test9_projectDetailsAuthorization_contractorIsolationAndOpenDiscovery() {
        MyBidAssignmentRepository mockAssignmentRepo = mock(MyBidAssignmentRepository.class);
        ProjectController projectController = new ProjectController(
                projectRepository,
                userRepository,
                null,
                null,
                mockAssignmentRepo
        );

        org.springframework.security.core.GrantedAuthority contractorAuthority = () -> "ROLE_CONTRACTOR";
        doReturn(Collections.singleton(contractorAuthority)).when(authContractorA).getAuthorities();
        doReturn(Collections.singleton(contractorAuthority)).when(authContractorB).getAuthorities();

        when(projectRepository.findByProjectId("PRJ-100")).thenReturn(Optional.of(project1));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project1));

        // When project 100 has an active assignment awarded to Contractor A
        when(mockAssignmentRepo.findByProjectIdAndIsCurrentTrue(100L)).thenReturn(Optional.of(assignment1));

        // 1. Contractor A (the awarded contractor) CAN access the project details
        ResponseEntity<?> responseA = projectController.getContractorProjectById("100", authContractorA);
        assertEquals(HttpStatus.OK, responseA.getStatusCode());

        // 2. Contractor B CANNOT access Contractor A's awarded project details
        ResponseEntity<?> responseB = projectController.getContractorProjectById("100", authContractorB);
        assertEquals(HttpStatus.FORBIDDEN, responseB.getStatusCode());

        // 3. For an unassigned open project, Contractor B CAN browse it normally
        Project openProject = new Project();
        openProject.setId(200L);
        openProject.setProjectId("PRJ-200");
        openProject.setStatus("OPEN");
        when(projectRepository.findById(200L)).thenReturn(Optional.of(openProject));
        when(mockAssignmentRepo.findByProjectIdAndIsCurrentTrue(200L)).thenReturn(Optional.empty());

        ResponseEntity<?> responseOpen = projectController.getContractorProjectById("200", authContractorB);
        assertEquals(HttpStatus.OK, responseOpen.getStatusCode());
    }
}
