package com.marketplace.backend;

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
 * BUILDBID - MY BID CONTROLLER TESTS (Phase 3)
 *
 * Verifies all 20 required Phase 3 criteria and Section 31 end-to-end API lifecycle:
 * 1-10: Customer endpoints (summary, projects, bids, details, accept, assignment, revoke, reassign, history)
 * 11-17: Contractor endpoints (my-bids, history, contracts, assignment details, decline, 7-day visibility)
 * 18-20: Strict authentication & cross-role authorization security
 * 21: Full Section 31 end-to-end API lifecycle execution
 */
public class MyBidControllerTest {

    private MyBidService myBidService;
    private ProjectRepository projectRepository;
    private MyBidRepository myBidRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;

    private MyBidController myBidController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser contractorC;

    private Authentication authCustomerA;
    private Authentication authCustomerB;
    private Authentication authContractorA;
    private Authentication authContractorB;

    private Project projectX;
    private Project projectY;

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

        // Setup users
        customerA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerA, "id", 101L);
        customerA.setName("Alice Customer");
        customerA.setEmail("customerA@buildbid.com");
        customerA.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CUSTOMER));

        customerB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerB, "id", 102L);
        customerB.setName("Bob Customer");
        customerB.setEmail("customerB@buildbid.com");
        customerB.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CUSTOMER));

        contractorA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorA, "id", 201L);
        contractorA.setName("Acme Builders");
        contractorA.setEmail("contractorA@buildbid.com");
        contractorA.setPhone("9876543210");
        contractorA.setLocation("Mumbai");
        contractorA.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        contractorB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorB, "id", 202L);
        contractorB.setName("Zenith Infra");
        contractorB.setEmail("contractorB@buildbid.com");
        contractorB.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        contractorC = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorC, "id", 203L);
        contractorC.setName("Horizon Works");
        contractorC.setEmail("contractorC@buildbid.com");
        contractorC.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        // Mock auth
        authCustomerA = mock(Authentication.class);
        when(authCustomerA.getName()).thenReturn("customerA@buildbid.com");
        when(userRepository.findByEmail("customerA@buildbid.com")).thenReturn(Optional.of(customerA));

        authCustomerB = mock(Authentication.class);
        when(authCustomerB.getName()).thenReturn("customerB@buildbid.com");
        when(userRepository.findByEmail("customerB@buildbid.com")).thenReturn(Optional.of(customerB));

        authContractorA = mock(Authentication.class);
        when(authContractorA.getName()).thenReturn("contractorA@buildbid.com");
        when(userRepository.findByEmail("contractorA@buildbid.com")).thenReturn(Optional.of(contractorA));

        authContractorB = mock(Authentication.class);
        when(authContractorB.getName()).thenReturn("contractorB@buildbid.com");
        when(userRepository.findByEmail("contractorB@buildbid.com")).thenReturn(Optional.of(contractorB));

        // Setup Projects
        projectX = new Project();
        projectX.setId(501L);
        projectX.setProjectId("PRJ-501");
        projectX.setProjectTitle("Luxury Penthouse");
        projectX.setCustomer(customerA);

        projectY = new Project();
        projectY.setId(502L);
        projectY.setProjectId("PRJ-502");
        projectY.setProjectTitle("Suburban Mall");
        projectY.setCustomer(customerB);
    }

    // =========================================================================
    // CUSTOMER API TESTS (1 - 10)
    // =========================================================================

    @Test
    @DisplayName("Test 1: GET /api/customer/my-bids/summary returns dynamic counts")
    void test1_customerSummary() {
        when(myBidService.getCustomerDashboardSummary(customerA))
                .thenReturn(new MyBidService.CustomerDashboardSummary(3L, 12L));

        ResponseEntity<?> response = myBidController.getCustomerSummary(authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof MyBidController.CustomerSummaryResponse);
        MyBidController.CustomerSummaryResponse summary = (MyBidController.CustomerSummaryResponse) response.getBody();
        assertEquals(3L, summary.getTotalProjects());
        assertEquals(12L, summary.getTotalBids());
    }

    @Test
    @DisplayName("Test 2: GET /api/customer/my-bids/projects returns customer-owned projects")
    void test2_customerProjects() {
        when(projectRepository.findByCustomer(customerA)).thenReturn(Collections.singletonList(projectX));
        when(myBidRepository.countByProjectId(501L)).thenReturn(4L);
        when(myBidService.hasActiveAssignment(501L)).thenReturn(false);

        ResponseEntity<?> response = myBidController.getCustomerProjects(authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
        MyBidController.CustomerProjectSummaryDto dto = (MyBidController.CustomerProjectSummaryDto) list.get(0);
        assertEquals(501L, dto.getId());
        assertEquals(4L, dto.getTotalBids());
        assertFalse(dto.isHasActiveAssignment());
    }

    @Test
    @DisplayName("Test 2a: Customer with an existing Project and zero bids returns HTTP 200 with totalBids=0")
    void test2a_customerProjectWithZeroBids() {
        when(projectRepository.findByCustomer(customerA)).thenReturn(Collections.singletonList(projectX));
        when(myBidRepository.countByProjectId(501L)).thenReturn(0L);
        when(myBidService.hasActiveAssignment(501L)).thenReturn(false);

        ResponseEntity<?> response = myBidController.getCustomerProjects(authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
        MyBidController.CustomerProjectSummaryDto dto = (MyBidController.CustomerProjectSummaryDto) list.get(0);
        assertEquals(501L, dto.getId());
        assertEquals(0L, dto.getTotalBids());
        assertFalse(dto.isHasActiveAssignment());
    }

    @Test
    @DisplayName("Test 2b: Customer with an existing Project and active assignment returns hasActiveAssignment=true")
    void test2b_customerProjectWithActiveAssignment() {
        when(projectRepository.findByCustomer(customerA)).thenReturn(Collections.singletonList(projectX));
        when(myBidRepository.countByProjectId(501L)).thenReturn(3L);
        when(myBidService.hasActiveAssignment(501L)).thenReturn(true);

        ResponseEntity<?> response = myBidController.getCustomerProjects(authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
        MyBidController.CustomerProjectSummaryDto dto = (MyBidController.CustomerProjectSummaryDto) list.get(0);
        assertEquals(501L, dto.getId());
        assertEquals(3L, dto.getTotalBids());
        assertTrue(dto.isHasActiveAssignment());
    }

    @Test
    @DisplayName("Test 3: Customer cannot see another customer's project bids -> 403 Forbidden")
    void test3_customerCannotSeeOtherCustomerBids() {
        when(myBidService.getCustomerProjectBids(customerA, 502L))
                .thenThrow(new SecurityException("Forbidden: Customer does not own Project #502"));

        ResponseEntity<?> response = myBidController.getCustomerProjectBids(502L, authCustomerA);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("Test 4: Customer can retrieve own project bids with masked contractor contact info before acceptance")
    void test4_customerProjectBidsMaskedContact() {
        MyBid bid = new MyBid();
        ReflectionTestUtils.setField(bid, "id", 1001L);
        bid.setProject(projectX);
        bid.setCustomer(customerA);
        bid.setContractor(contractorA);
        bid.setBidAmount(1500000.0);
        bid.setStatus(MyBid.Status.PENDING);

        when(myBidService.getCustomerProjectBids(customerA, 501L)).thenReturn(Collections.singletonList(bid));

        ResponseEntity<?> response = myBidController.getCustomerProjectBids(501L, authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
        MyBidController.BidResponseDto dto = (MyBidController.BidResponseDto) list.get(0);
        assertEquals(1001L, dto.getId());
        assertEquals("Acme Builders", dto.getContractorName());
        // Contractor phone & email MUST be null before acceptance
        assertNull(dto.getContractorContact());
    }

    @Test
    @DisplayName("Test 5: Customer accepts own bid -> 200 OK and exposes contact info after assignment")
    void test5_customerAcceptsOwnBid() {
        MyBid bid = new MyBid();
        ReflectionTestUtils.setField(bid, "id", 1001L);
        bid.setProject(projectX);
        bid.setCustomer(customerA);
        bid.setContractor(contractorA);
        bid.setStatus(MyBid.Status.ACCEPTED);

        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 801L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorA);
        assignment.setAcceptedBid(bid);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);

        when(myBidService.acceptBid(customerA, 1001L)).thenReturn(assignment);

        ResponseEntity<?> response = myBidController.acceptBid(1001L, authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        MyBidController.AssignmentResponseDto dto = (MyBidController.AssignmentResponseDto) response.getBody();
        assertEquals(801L, dto.getId());
        assertEquals("ACTIVE", dto.getAssignmentStatus());
        assertTrue(dto.isCurrent());
        assertNotNull(dto.getContractor());
        assertEquals("9876543210", dto.getContractor().getPhone());
    }

    @Test
    @DisplayName("Test 6: Customer cannot accept another customer's bid -> 403 Forbidden")
    void test6_customerCannotAcceptOtherCustomerBid() {
        when(myBidService.acceptBid(customerB, 1001L))
                .thenThrow(new SecurityException("Forbidden: You do not own this project bid."));

        ResponseEntity<?> response = myBidController.acceptBid(1001L, authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("Test 7: Customer retrieves current project assignment")
    void test7_customerProjectAssignment() {
        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 801L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorA);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);

        when(myBidService.getCustomerProjectAssignment(customerA, 501L)).thenReturn(Optional.of(assignment));

        ResponseEntity<?> response = myBidController.getCustomerProjectAssignment(501L, authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        MyBidController.AssignmentResponseDto dto = (MyBidController.AssignmentResponseDto) response.getBody();
        assertEquals(801L, dto.getId());
        assertTrue(dto.isCurrent());
    }

    @Test
    @DisplayName("Test 8: Customer revokes own assignment -> 200 OK and REVOKED status")
    void test8_customerRevokesOwnAssignment() {
        MyBidAssignment revoked = new MyBidAssignment();
        ReflectionTestUtils.setField(revoked, "id", 801L);
        revoked.setProject(projectX);
        revoked.setCustomer(customerA);
        revoked.setContractor(contractorA);
        revoked.setAssignmentStatus(MyBidAssignment.Status.REVOKED);
        revoked.setCurrent(false);
        revoked.setRevokedAt(LocalDateTime.now());

        when(myBidService.revokeAcceptance(customerA, 801L)).thenReturn(revoked);

        ResponseEntity<?> response = myBidController.revokeAcceptance(801L, authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        MyBidController.AssignmentResponseDto dto = (MyBidController.AssignmentResponseDto) response.getBody();
        assertEquals("REVOKED", dto.getAssignmentStatus());
        assertFalse(dto.isCurrent());
    }

    @Test
    @DisplayName("Test 9: Customer cannot revoke another customer's assignment -> 403 Forbidden")
    void test9_customerCannotRevokeOtherAssignment() {
        when(myBidService.revokeAcceptance(customerB, 801L))
                .thenThrow(new SecurityException("Forbidden: You are not authorized to revoke this assignment."));

        ResponseEntity<?> response = myBidController.revokeAcceptance(801L, authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("Test 10: Customer reassigns an existing eligible bid after reopening -> 200 OK")
    void test10_customerReassignsExistingBid() {
        MyBidAssignment reacquired = new MyBidAssignment();
        ReflectionTestUtils.setField(reacquired, "id", 802L);
        reacquired.setProject(projectX);
        reacquired.setCustomer(customerA);
        reacquired.setContractor(contractorB);
        reacquired.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        reacquired.setCurrent(true);

        when(myBidService.reassignContractor(customerA, 1002L)).thenReturn(reacquired);

        ResponseEntity<?> response = myBidController.reassignContractor(1002L, authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        MyBidController.AssignmentResponseDto dto = (MyBidController.AssignmentResponseDto) response.getBody();
        assertEquals(802L, dto.getId());
        assertTrue(dto.isCurrent());
    }

    // =========================================================================
    // CONTRACTOR API TESTS (11 - 17)
    // =========================================================================

    @Test
    @DisplayName("Test 11: GET /api/contractor/my-bids returns contractor's own bids")
    void test11_contractorMyBids() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 1001L);
        bidA.setProject(projectX);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.PENDING);

        when(myBidService.getContractorBids(contractorA, false)).thenReturn(Collections.singletonList(bidA));

        ResponseEntity<?> response = myBidController.getContractorBids(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
    }

    @Test
    @DisplayName("Test 12: Contractor B receives only Contractor B's bids")
    void test12_contractorIsolation() {
        when(myBidService.getContractorBids(contractorB, false)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = myBidController.getContractorBids(authContractorB);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(0, list.size());
    }

    @Test
    @DisplayName("Test 13: GET /api/contractor/my-bids/contracts returns only active contracts")
    void test13_contractorMyContracts() {
        MyBidAssignment contract = new MyBidAssignment();
        ReflectionTestUtils.setField(contract, "id", 801L);
        contract.setProject(projectX);
        contract.setContractor(contractorA);
        contract.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        contract.setCurrent(true);

        when(myBidService.getMyContracts(contractorA)).thenReturn(Collections.singletonList(contract));

        ResponseEntity<?> response = myBidController.getContractorContracts(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
        MyBidController.AssignmentResponseDto dto = (MyBidController.AssignmentResponseDto) list.get(0);
        assertEquals(801L, dto.getId());
        assertEquals("ACTIVE", dto.getAssignmentStatus());
    }

    @Test
    @DisplayName("Test 14: Contractor declines own active assignment -> 200 OK and DECLINED status")
    void test14_contractorDeclinesOwnAssignment() {
        MyBidAssignment declined = new MyBidAssignment();
        ReflectionTestUtils.setField(declined, "id", 801L);
        declined.setProject(projectX);
        declined.setContractor(contractorA);
        declined.setAssignmentStatus(MyBidAssignment.Status.DECLINED);
        declined.setCurrent(false);
        declined.setDeclinedAt(LocalDateTime.now());

        when(myBidService.declineAssignment(contractorA, 801L)).thenReturn(declined);

        ResponseEntity<?> response = myBidController.declineAssignment(801L, authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        MyBidController.AssignmentResponseDto dto = (MyBidController.AssignmentResponseDto) response.getBody();
        assertEquals("DECLINED", dto.getAssignmentStatus());
        assertFalse(dto.isCurrent());
    }

    @Test
    @DisplayName("Test 15: Contractor cannot decline another contractor's assignment -> 403 Forbidden")
    void test15_contractorCannotDeclineOtherAssignment() {
        when(myBidService.declineAssignment(contractorB, 801L))
                .thenThrow(new SecurityException("Forbidden: You are not authorized to decline this assignment."));

        ResponseEntity<?> response = myBidController.declineAssignment(801L, authContractorB);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("Test 16: 7-day visibility rule applied on /api/contractor/my-bids")
    void test16_sevenDayVisibilityBackendControlled() {
        MyBid activeBid = new MyBid();
        ReflectionTestUtils.setField(activeBid, "id", 1001L);
        activeBid.setStatus(MyBid.Status.NOT_SELECTED);
        activeBid.setRejectedAt(LocalDateTime.now().minusDays(3)); // 3 days ago

        when(myBidService.getContractorBids(contractorA, false)).thenReturn(Collections.singletonList(activeBid));

        ResponseEntity<?> response = myBidController.getContractorBids(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(myBidService).getContractorBids(contractorA, false);
    }

    @Test
    @DisplayName("Test 17: Expired NOT_SELECTED records remain available through /api/contractor/my-bids/history")
    void test17_expiredBidsAvailableInHistory() {
        MyBid expiredBid = new MyBid();
        ReflectionTestUtils.setField(expiredBid, "id", 1002L);
        expiredBid.setStatus(MyBid.Status.NOT_SELECTED);
        expiredBid.setRejectedAt(LocalDateTime.now().minusDays(10)); // 10 days ago (> 7 days)

        when(myBidService.getContractorBids(contractorA, true)).thenReturn(Collections.singletonList(expiredBid));

        ResponseEntity<?> response = myBidController.getContractorBidHistory(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(myBidService).getContractorBids(contractorA, true);
    }

    // =========================================================================
    // SECURITY TESTS (18 - 20)
    // =========================================================================

    @Test
    @DisplayName("Test 18: Unauthenticated requests return 401 Unauthorized")
    void test18_unauthenticatedRejected() {
        ResponseEntity<?> res1 = myBidController.getCustomerSummary(null);
        assertEquals(HttpStatus.UNAUTHORIZED, res1.getStatusCode());

        ResponseEntity<?> res2 = myBidController.getContractorBids(null);
        assertEquals(HttpStatus.UNAUTHORIZED, res2.getStatusCode());
    }

    @Test
    @DisplayName("Test 19: CUSTOMER cannot access contractor endpoints -> 403 Forbidden")
    void test19_customerBlockedFromContractorEndpoints() {
        ResponseEntity<?> res = myBidController.getContractorBids(authCustomerA);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
    }

    @Test
    @DisplayName("Test 20: CONTRACTOR cannot access customer endpoints -> 403 Forbidden")
    void test20_contractorBlockedFromCustomerEndpoints() {
        ResponseEntity<?> res = myBidController.getCustomerSummary(authContractorA);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
    }

    // =========================================================================
    // SECTION 31 COMPLETE API LIFECYCLE SCENARIO
    // =========================================================================

    @Test
    @DisplayName("Test 21: Section 31 Complete API Lifecycle Scenario (Accept A -> Decline A -> Reassign B -> Revoke B -> Reassign C)")
    void test21_section31CompleteApiLifecycle() {
        // Step 1: Customer accepts Bid A
        MyBidAssignment assignmentA = new MyBidAssignment();
        ReflectionTestUtils.setField(assignmentA, "id", 701L);
        assignmentA.setProject(projectX);
        assignmentA.setContractor(contractorA);
        assignmentA.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignmentA.setCurrent(true);

        when(myBidService.acceptBid(customerA, 1001L)).thenReturn(assignmentA);
        ResponseEntity<?> step1 = myBidController.acceptBid(1001L, authCustomerA);
        assertEquals(HttpStatus.OK, step1.getStatusCode());
        assertEquals("ACTIVE", ((MyBidController.AssignmentResponseDto) step1.getBody()).getAssignmentStatus());

        // Step 2: Contractor A declines assignment 701
        MyBidAssignment declinedA = new MyBidAssignment();
        ReflectionTestUtils.setField(declinedA, "id", 701L);
        declinedA.setProject(projectX);
        declinedA.setContractor(contractorA);
        declinedA.setAssignmentStatus(MyBidAssignment.Status.DECLINED);
        declinedA.setCurrent(false);

        when(myBidService.declineAssignment(contractorA, 701L)).thenReturn(declinedA);
        ResponseEntity<?> step2 = myBidController.declineAssignment(701L, authContractorA);
        assertEquals(HttpStatus.OK, step2.getStatusCode());
        assertEquals("DECLINED", ((MyBidController.AssignmentResponseDto) step2.getBody()).getAssignmentStatus());

        // Step 3: Customer reassigns Bid B
        MyBidAssignment assignmentB = new MyBidAssignment();
        ReflectionTestUtils.setField(assignmentB, "id", 702L);
        assignmentB.setProject(projectX);
        assignmentB.setContractor(contractorB);
        assignmentB.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignmentB.setCurrent(true);

        when(myBidService.reassignContractor(customerA, 1002L)).thenReturn(assignmentB);
        ResponseEntity<?> step3 = myBidController.reassignContractor(1002L, authCustomerA);
        assertEquals(HttpStatus.OK, step3.getStatusCode());
        assertEquals("ACTIVE", ((MyBidController.AssignmentResponseDto) step3.getBody()).getAssignmentStatus());

        // Step 4: Customer revokes assignment 702
        MyBidAssignment revokedB = new MyBidAssignment();
        ReflectionTestUtils.setField(revokedB, "id", 702L);
        revokedB.setProject(projectX);
        revokedB.setContractor(contractorB);
        revokedB.setAssignmentStatus(MyBidAssignment.Status.REVOKED);
        revokedB.setCurrent(false);

        when(myBidService.revokeAcceptance(customerA, 702L)).thenReturn(revokedB);
        ResponseEntity<?> step4 = myBidController.revokeAcceptance(702L, authCustomerA);
        assertEquals(HttpStatus.OK, step4.getStatusCode());
        assertEquals("REVOKED", ((MyBidController.AssignmentResponseDto) step4.getBody()).getAssignmentStatus());

        // Step 5: Customer reassigns Bid C
        MyBidAssignment assignmentC = new MyBidAssignment();
        ReflectionTestUtils.setField(assignmentC, "id", 703L);
        assignmentC.setProject(projectX);
        assignmentC.setContractor(contractorC);
        assignmentC.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignmentC.setCurrent(true);

        when(myBidService.reassignContractor(customerA, 1003L)).thenReturn(assignmentC);
        ResponseEntity<?> step5 = myBidController.reassignContractor(1003L, authCustomerA);
        assertEquals(HttpStatus.OK, step5.getStatusCode());
        assertEquals("ACTIVE", ((MyBidController.AssignmentResponseDto) step5.getBody()).getAssignmentStatus());
    }

    @Test
    @DisplayName("Test 22: Reassign conflict (e.g. project already active or declined contractor) returns 409 Conflict")
    void test22_reassignConflictReturns409() {
        when(myBidService.reassignContractor(customerA, 1001L))
                .thenThrow(new IllegalStateException("Cannot reassign to a contractor who previously declined this project."));

        ResponseEntity<?> response = myBidController.reassignContractor(1001L, authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("previously declined"));
    }

    @Test
    @DisplayName("Test 23: Revoke non-active assignment returns 409 Conflict")
    void test23_revokeConflictReturns409() {
        when(myBidService.revokeAcceptance(customerA, 801L))
                .thenThrow(new IllegalStateException("Cannot revoke assignment: Assignment is not currently active"));

        ResponseEntity<?> response = myBidController.revokeAcceptance(801L, authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("not currently active"));
    }

    @Test
    @DisplayName("Test 24: Verify MyBidController has NO Continue Work or Resume endpoints")
    void test24_noContinueOrResumeEndpointsExist() {
        boolean hasContinueOrResume = Arrays.stream(MyBidController.class.getDeclaredMethods())
                .anyMatch(m -> {
                    String name = m.getName().toLowerCase();
                    return name.contains("continue") || name.contains("resume");
                });
        assertFalse(hasContinueOrResume, "MyBidController must NOT define continue or resume endpoints");
    }

    @Test
    @DisplayName("Test 25: Multiple Decision Cycles through Controller API (Accept A -> Decline A -> Reassign B -> Revoke B -> Reassign C)")
    void test25_multipleDecisionCyclesInController() {
        // Cycle 1: Accept A
        MyBidAssignment a1 = new MyBidAssignment();
        ReflectionTestUtils.setField(a1, "id", 901L);
        a1.setProject(projectX);
        a1.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        a1.setCurrent(true);
        when(myBidService.acceptBid(customerA, 1001L)).thenReturn(a1);
        ResponseEntity<?> res1 = myBidController.acceptBid(1001L, authCustomerA);
        assertEquals(HttpStatus.OK, res1.getStatusCode());
        assertEquals("ACTIVE", ((MyBidController.AssignmentResponseDto) res1.getBody()).getAssignmentStatus());

        // Contractor A declines
        MyBidAssignment declinedA = new MyBidAssignment();
        ReflectionTestUtils.setField(declinedA, "id", 901L);
        declinedA.setProject(projectX);
        declinedA.setAssignmentStatus(MyBidAssignment.Status.DECLINED);
        declinedA.setCurrent(false);
        when(myBidService.declineAssignment(contractorA, 901L)).thenReturn(declinedA);
        ResponseEntity<?> res2 = myBidController.declineAssignment(901L, authContractorA);
        assertEquals(HttpStatus.OK, res2.getStatusCode());
        assertEquals("DECLINED", ((MyBidController.AssignmentResponseDto) res2.getBody()).getAssignmentStatus());

        // Cycle 2: Customer reassigns B (New Assignment 902 created)
        MyBidAssignment a2 = new MyBidAssignment();
        ReflectionTestUtils.setField(a2, "id", 902L);
        a2.setProject(projectX);
        a2.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        a2.setCurrent(true);
        when(myBidService.reassignContractor(customerA, 1002L)).thenReturn(a2);
        ResponseEntity<?> res3 = myBidController.reassignContractor(1002L, authCustomerA);
        assertEquals(HttpStatus.OK, res3.getStatusCode());
        assertEquals(902L, ((MyBidController.AssignmentResponseDto) res3.getBody()).getId());

        // Customer revokes B
        MyBidAssignment revokedB = new MyBidAssignment();
        ReflectionTestUtils.setField(revokedB, "id", 902L);
        revokedB.setProject(projectX);
        revokedB.setAssignmentStatus(MyBidAssignment.Status.REVOKED);
        revokedB.setCurrent(false);
        when(myBidService.revokeAcceptance(customerA, 902L)).thenReturn(revokedB);
        ResponseEntity<?> res4 = myBidController.revokeAcceptance(902L, authCustomerA);
        assertEquals(HttpStatus.OK, res4.getStatusCode());
        assertEquals("REVOKED", ((MyBidController.AssignmentResponseDto) res4.getBody()).getAssignmentStatus());

        // Cycle 3: Customer reassigns C (New Assignment 903 created)
        MyBidAssignment a3 = new MyBidAssignment();
        ReflectionTestUtils.setField(a3, "id", 903L);
        a3.setProject(projectX);
        a3.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        a3.setCurrent(true);
        when(myBidService.reassignContractor(customerA, 1003L)).thenReturn(a3);
        ResponseEntity<?> res5 = myBidController.reassignContractor(1003L, authCustomerA);
        assertEquals(HttpStatus.OK, res5.getStatusCode());
        assertEquals(903L, ((MyBidController.AssignmentResponseDto) res5.getBody()).getId());
    }
}
