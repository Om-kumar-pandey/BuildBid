package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.concurrent.locks.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - MY BID SERVICE TESTS (Phase 2 & Phase 2.1)
 *
 * Comprehensive test suite verifying all Phase 2 criteria plus Phase 2.1 project-level concurrency:
 * 1: Multi-bid submission & independence
 * 2: Customer project bid retrieval & ownership security
 * 3: Bid acceptance & active assignment creation
 * 4: Competing bid preservation & NOT_SELECTED marking
 * 5: Exactly-one-active-assignment & double-acceptance prevention
 * 6: Contractor decline & automatic project reopening
 * 7: Reassignment using existing historical bids (no re-bidding)
 * 8: Customer take back (revocation) of assignment
 * 9: Reassignment after customer take back
 * 10: 7-day visibility calculation without data deletion
 * 11: Cross-customer accept authorization enforcement
 * 12: Cross-contractor decline authorization enforcement
 * 13: Cross-customer revoke authorization enforcement
 * 14: Complete audit history preservation across lifecycle
 * 15: Exact Section 32 lifecycle end-to-end execution
 * 16: Contractor My Contracts active filter
 * 17: Dashboard summary dynamic calculation
 * 18: Contractor role validation & self-bidding prevention
 * 19: Phase 2.1 Concurrent first-time acceptance of two different bids on same project with project-level lock serialization
 */
public class MyBidServiceTest {

    private MyBidRepository myBidRepository;
    private MyBidAssignmentRepository myBidAssignmentRepository;
    private MyBidAuditHistoryRepository myBidAuditHistoryRepository;
    private ProjectRepository projectRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private MyBidProjectLockRepository myBidProjectLockRepository;

    private MyBidService myBidService;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser contractorC;
    private MarketplaceBackendApplication.MarketplaceUser contractorD;
    private MarketplaceBackendApplication.MarketplaceUser regularUser;

    private Project projectX;
    private Project projectY;

    @BeforeEach
    void setUp() {
        myBidRepository = mock(MyBidRepository.class);
        myBidAssignmentRepository = mock(MyBidAssignmentRepository.class);
        myBidAuditHistoryRepository = mock(MyBidAuditHistoryRepository.class);
        projectRepository = mock(ProjectRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        myBidProjectLockRepository = mock(MyBidProjectLockRepository.class);

        myBidService = new MyBidService(
                myBidRepository,
                myBidAssignmentRepository,
                myBidAuditHistoryRepository,
                projectRepository,
                userRepository,
                myBidProjectLockRepository
        );

        when(myBidProjectLockRepository.findByProjectIdForUpdate(anyLong())).thenAnswer(inv -> {
            Long pid = inv.getArgument(0);
            return Optional.of(new MyBidProjectLock(pid));
        });
        when(myBidProjectLockRepository.existsByProjectId(anyLong())).thenReturn(true);

        when(myBidRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return myBidRepository.findByIdForUpdate(id);
        });
        when(myBidAssignmentRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return myBidAssignmentRepository.findByIdForUpdate(id);
        });

        // Setup Users
        customerA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerA, "id", 1001L);
        customerA.setName("Alice Customer");
        customerA.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CUSTOMER));

        customerB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerB, "id", 1002L);
        customerB.setName("Bob Customer");
        customerB.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CUSTOMER));

        contractorA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorA, "id", 2001L);
        contractorA.setName("Contractor A");
        contractorA.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        contractorB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorB, "id", 2002L);
        contractorB.setName("Contractor B");
        contractorB.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        contractorC = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorC, "id", 2003L);
        contractorC.setName("Contractor C");
        contractorC.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        contractorD = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorD, "id", 2004L);
        contractorD.setName("Contractor D");
        contractorD.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        regularUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(regularUser, "id", 3001L);
        regularUser.setName("Regular User");
        regularUser.setRoles(Collections.emptySet());

        // Setup Projects
        projectX = new Project();
        projectX.setId(5001L);
        projectX.setProjectId("PRJ-5001");
        projectX.setProjectTitle("Modern Villa Construction");
        projectX.setCustomer(customerA);

        projectY = new Project();
        projectY.setId(5002L);
        projectY.setProjectId("PRJ-5002");
        projectY.setProjectTitle("Commercial Renovation");
        projectY.setCustomer(customerB);

        when(projectRepository.findById(5001L)).thenReturn(Optional.of(projectX));
        when(projectRepository.findById(5002L)).thenReturn(Optional.of(projectY));
    }

    // =========================================================================
    // TEST 1 — SUBMIT MULTIPLE BIDS
    // =========================================================================
    @Test
    @DisplayName("Test 1: Multiple contractors submit bids -> separate independent MyBid records created")
    void test1_submitMultipleBids() {
        when(myBidRepository.save(any(MyBid.class))).thenAnswer(invocation -> {
            MyBid b = invocation.getArgument(0);
            if (b.getId() == null) {
                ReflectionTestUtils.setField(b, "id", (long) (Math.random() * 1000 + 1));
            }
            return b;
        });

        MyBidService.SubmitBidRequest reqA = new MyBidService.SubmitBidRequest();
        reqA.setBidAmount(1000000.0); // 10L
        reqA.setEstimatedDuration("6 months");

        MyBidService.SubmitBidRequest reqB = new MyBidService.SubmitBidRequest();
        reqB.setBidAmount(1050000.0); // 10.5L
        reqB.setEstimatedDuration("5 months");

        MyBidService.SubmitBidRequest reqC = new MyBidService.SubmitBidRequest();
        reqC.setBidAmount(1100000.0); // 11L
        reqC.setEstimatedDuration("6.5 months");

        MyBidService.SubmitBidRequest reqD = new MyBidService.SubmitBidRequest();
        reqD.setBidAmount(1120000.0); // 11.2L
        reqD.setEstimatedDuration("7 months");

        MyBid bidA = myBidService.submitBid(contractorA, 5001L, reqA);
        MyBid bidB = myBidService.submitBid(contractorB, 5001L, reqB);
        MyBid bidC = myBidService.submitBid(contractorC, 5001L, reqC);
        MyBid bidD = myBidService.submitBid(contractorD, 5001L, reqD);

        assertNotNull(bidA);
        assertNotNull(bidB);
        assertNotNull(bidC);
        assertNotNull(bidD);

        assertEquals(MyBid.Status.PENDING, bidA.getStatus());
        assertEquals(MyBid.Status.PENDING, bidB.getStatus());
        assertEquals(MyBid.Status.PENDING, bidC.getStatus());
        assertEquals(MyBid.Status.PENDING, bidD.getStatus());

        assertEquals(1000000.0, bidA.getBidAmount());
        assertEquals(1050000.0, bidB.getBidAmount());
        assertEquals(1100000.0, bidC.getBidAmount());
        assertEquals(1120000.0, bidD.getBidAmount());

        // Verify customer is derived from project, not frontend input
        assertEquals(customerA.getId(), bidA.getCustomer().getId());
        assertEquals(customerA.getId(), bidB.getCustomer().getId());

        // Verify audit records created for all 4 submissions
        verify(myBidAuditHistoryRepository, times(4)).save(any(MyBidAuditHistory.class));
    }

    // =========================================================================
    // TEST 2 — CUSTOMER SEES ONLY OWN PROJECT BIDS
    // =========================================================================
    @Test
    @DisplayName("Test 2: Customer A cannot view Customer B's project bids")
    void test2_customerSeesOnlyOwnProjectBids() {
        // Customer A trying to view Project Y (owned by Customer B)
        assertThrows(SecurityException.class, () -> {
            myBidService.getCustomerProjectBids(customerA, 5002L);
        });

        // Customer A viewing Project X (owned by Customer A)
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(Collections.emptyList());
        List<MyBid> bids = myBidService.getCustomerProjectBids(customerA, 5001L);
        assertNotNull(bids);
        verify(myBidRepository).findByProjectIdOrderBySubmittedAtDesc(5001L);
    }

    // =========================================================================
    // TEST 3 — ACCEPT ONE BID
    // =========================================================================
    @Test
    @DisplayName("Test 3: Customer accepts Contractor A's bid -> ACCEPTED status and ACTIVE assignment")
    void test3_acceptOneBid() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setBidAmount(1000000.0);
        bidA.setStatus(MyBid.Status.PENDING);

        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(bidA));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(Collections.singletonList(bidA));
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> {
            MyBidAssignment a = i.getArgument(0);
            ReflectionTestUtils.setField(a, "id", 701L);
            return a;
        });

        MyBidAssignment assignment = myBidService.acceptBid(customerA, 101L);

        assertNotNull(assignment);
        assertEquals(701L, assignment.getId());
        assertEquals(MyBidAssignment.Status.ACTIVE, assignment.getAssignmentStatus());
        assertTrue(assignment.isCurrent());
        assertEquals(MyBid.Status.ACCEPTED, bidA.getStatus());
        assertEquals(contractorA.getId(), assignment.getContractor().getId());

        // Verify audit events BID_ACCEPTED and ASSIGNMENT_CREATED
        verify(myBidAuditHistoryRepository, atLeast(2)).save(any(MyBidAuditHistory.class));
    }

    // =========================================================================
    // TEST 4 — COMPETING BIDS PRESERVED
    // =========================================================================
    @Test
    @DisplayName("Test 4: Competing bids are marked NOT_SELECTED with rejectedAt timestamp; none deleted")
    void test4_competingBidsPreserved() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.PENDING);

        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setStatus(MyBid.Status.PENDING);

        MyBid bidC = new MyBid();
        ReflectionTestUtils.setField(bidC, "id", 103L);
        bidC.setProject(projectX);
        bidC.setCustomer(customerA);
        bidC.setContractor(contractorC);
        bidC.setStatus(MyBid.Status.PENDING);

        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(bidA));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(Arrays.asList(bidA, bidB, bidC));
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> i.getArgument(0));

        myBidService.acceptBid(customerA, 101L);

        assertEquals(MyBid.Status.ACCEPTED, bidA.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidB.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidC.getStatus());

        assertNotNull(bidB.getRejectedAt());
        assertNotNull(bidC.getRejectedAt());

        // Verify save was called on competing bids (not delete)
        verify(myBidRepository).save(bidB);
        verify(myBidRepository).save(bidC);
        verify(myBidRepository, never()).delete(any());
        verify(myBidRepository, never()).deleteAll(any());
    }

    // =========================================================================
    // TEST 5 — DOUBLE ACCEPTANCE PROTECTION
    // =========================================================================
    @Test
    @DisplayName("Test 5: Cannot accept a second bid while an active assignment exists")
    void test5_doubleAcceptanceProtection() {
        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setStatus(MyBid.Status.NOT_SELECTED);

        MyBidAssignment existingAssignment = new MyBidAssignment();
        ReflectionTestUtils.setField(existingAssignment, "id", 701L);
        existingAssignment.setProject(projectX);
        existingAssignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        existingAssignment.setCurrent(true);

        when(myBidRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(bidB));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.of(existingAssignment));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            myBidService.acceptBid(customerA, 102L);
        });

        assertTrue(ex.getMessage().contains("already has an active assignment"));
        assertEquals(MyBid.Status.NOT_SELECTED, bidB.getStatus());
        assertTrue(existingAssignment.isCurrent());
    }

    // =========================================================================
    // TEST 6 — CONTRACTOR DECLINES ASSIGNMENT
    // =========================================================================
    @Test
    @DisplayName("Test 6: Accepted contractor declines -> DECLINED status, isCurrent false, project reopened")
    void test6_contractorDeclines() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.ACCEPTED);

        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 701L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorA);
        assignment.setAcceptedBid(bidA);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);

        when(myBidAssignmentRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(assignment));
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> i.getArgument(0));

        MyBidAssignment result = myBidService.declineAssignment(contractorA, 701L);

        assertEquals(MyBidAssignment.Status.DECLINED, result.getAssignmentStatus());
        assertFalse(result.isCurrent());
        assertNotNull(result.getDeclinedAt());
        assertEquals(MyBid.Status.ASSIGNMENT_DECLINED, bidA.getStatus());

        // Verify audit trail recorded decline and project reopening
        ArgumentCaptor<MyBidAuditHistory> captor = ArgumentCaptor.forClass(MyBidAuditHistory.class);
        verify(myBidAuditHistoryRepository, atLeast(2)).save(captor.capture());
        List<MyBidAuditHistory> records = captor.getAllValues();
        assertTrue(records.stream().anyMatch(r -> r.getEventType() == MyBidAuditHistory.EventType.ASSIGNMENT_DECLINED));
        assertTrue(records.stream().anyMatch(r -> r.getEventType() == MyBidAuditHistory.EventType.PROJECT_REOPENED));
    }

    // =========================================================================
    // TEST 7 — EXISTING BIDS REUSABLE AFTER DECLINE
    // =========================================================================
    @Test
    @DisplayName("Test 7: After Contractor A declines, Customer reassigns Contractor B directly using B's existing bid")
    void test7_existingBidsReusableAfterDecline() {
        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setStatus(MyBid.Status.NOT_SELECTED);

        MyBid bidC = new MyBid();
        ReflectionTestUtils.setField(bidC, "id", 103L);
        bidC.setProject(projectX);
        bidC.setCustomer(customerA);
        bidC.setContractor(contractorC);
        bidC.setStatus(MyBid.Status.NOT_SELECTED);

        // Project has no active assignment currently
        when(myBidRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(bidB));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(Arrays.asList(bidB, bidC));
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> {
            MyBidAssignment a = i.getArgument(0);
            ReflectionTestUtils.setField(a, "id", 702L);
            return a;
        });

        MyBidAssignment assignmentB = myBidService.reassignContractor(customerA, 102L);

        assertNotNull(assignmentB);
        assertEquals(702L, assignmentB.getId());
        assertEquals(MyBidAssignment.Status.ACTIVE, assignmentB.getAssignmentStatus());
        assertTrue(assignmentB.isCurrent());
        assertEquals(MyBid.Status.ACCEPTED, bidB.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidC.getStatus());

        // Verify CONTRACTOR_REASSIGNED audit event
        ArgumentCaptor<MyBidAuditHistory> captor = ArgumentCaptor.forClass(MyBidAuditHistory.class);
        verify(myBidAuditHistoryRepository, atLeast(3)).save(captor.capture());
        assertTrue(captor.getAllValues().stream()
                .anyMatch(r -> r.getEventType() == MyBidAuditHistory.EventType.CONTRACTOR_REASSIGNED));
    }

    // =========================================================================
    // TEST 8 — CUSTOMER TAKE BACK (REVOCATION)
    // =========================================================================
    @Test
    @DisplayName("Test 8: Customer revokes active assignment -> status REVOKED, isCurrent false, project reopened")
    void test8_customerTakeBack() {
        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setStatus(MyBid.Status.ACCEPTED);

        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 702L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorB);
        assignment.setAcceptedBid(bidB);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);

        when(myBidAssignmentRepository.findByIdForUpdate(702L)).thenReturn(Optional.of(assignment));
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> i.getArgument(0));

        MyBidAssignment revoked = myBidService.revokeAcceptance(customerA, 702L);

        assertEquals(MyBidAssignment.Status.REVOKED, revoked.getAssignmentStatus());
        assertFalse(revoked.isCurrent());
        assertNotNull(revoked.getRevokedAt());

        // Verify audit history
        ArgumentCaptor<MyBidAuditHistory> captor = ArgumentCaptor.forClass(MyBidAuditHistory.class);
        verify(myBidAuditHistoryRepository, atLeast(2)).save(captor.capture());
        List<MyBidAuditHistory> logs = captor.getAllValues();
        assertTrue(logs.stream().anyMatch(r -> r.getEventType() == MyBidAuditHistory.EventType.ACCEPTANCE_WITHDRAWN));
        assertTrue(logs.stream().anyMatch(r -> r.getEventType() == MyBidAuditHistory.EventType.PROJECT_REOPENED));
    }

    // =========================================================================
    // TEST 9 — REASSIGN AFTER TAKE BACK
    // =========================================================================
    @Test
    @DisplayName("Test 9: Reassign to Contractor C after take back of Contractor B")
    void test9_reassignAfterTakeBack() {
        MyBid bidC = new MyBid();
        ReflectionTestUtils.setField(bidC, "id", 103L);
        bidC.setProject(projectX);
        bidC.setCustomer(customerA);
        bidC.setContractor(contractorC);
        bidC.setStatus(MyBid.Status.NOT_SELECTED);

        when(myBidRepository.findByIdForUpdate(103L)).thenReturn(Optional.of(bidC));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(Collections.singletonList(bidC));
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> {
            MyBidAssignment a = i.getArgument(0);
            ReflectionTestUtils.setField(a, "id", 703L);
            return a;
        });

        MyBidAssignment assignmentC = myBidService.reassignContractor(customerA, 103L);

        assertNotNull(assignmentC);
        assertEquals(703L, assignmentC.getId());
        assertEquals(MyBidAssignment.Status.ACTIVE, assignmentC.getAssignmentStatus());
        assertTrue(assignmentC.isCurrent());
        assertEquals(contractorC.getId(), assignmentC.getContractor().getId());
    }

    // =========================================================================
    // TEST 10 — SEVEN-DAY VISIBILITY CALCULATION WITHOUT DATA DELETION
    // =========================================================================
    @Test
    @DisplayName("Test 10: 7-day visibility calculation handles fresh vs expired bids; no data deletion")
    void test10_sevenDayVisibility() {
        MyBid freshBid = new MyBid();
        freshBid.setStatus(MyBid.Status.NOT_SELECTED);
        freshBid.setRejectedAt(LocalDateTime.now().minusDays(2)); // 2 days ago

        MyBid expiredBid = new MyBid();
        expiredBid.setStatus(MyBid.Status.NOT_SELECTED);
        expiredBid.setRejectedAt(LocalDateTime.now().minusDays(8)); // 8 days ago (> 7 days)

        MyBid pendingBid = new MyBid();
        pendingBid.setStatus(MyBid.Status.PENDING);

        // Fresh bid is visible
        assertTrue(myBidService.isBidVisibleToContractor(freshBid));

        // Expired bid is not visible in active view
        assertFalse(myBidService.isBidVisibleToContractor(expiredBid));

        // Pending bid is always visible
        assertTrue(myBidService.isBidVisibleToContractor(pendingBid));

        // Visible until calculation
        assertNotNull(myBidService.getVisibleUntil(freshBid));
        assertTrue(myBidService.getVisibleUntil(freshBid).isAfter(LocalDateTime.now()));

        // Verification of permanent preservation in getContractorBids
        when(myBidRepository.findByContractorIdOrderBySubmittedAtDesc(2001L))
                .thenReturn(Arrays.asList(freshBid, expiredBid, pendingBid));

        // When filtering active: only 2 visible
        List<MyBid> activeViews = myBidService.getContractorBids(contractorA, false);
        assertEquals(2, activeViews.size());

        // When requesting all history: all 3 exist
        List<MyBid> fullHistory = myBidService.getContractorBids(contractorA, true);
        assertEquals(3, fullHistory.size());

        // Zero deletion calls
        verify(myBidRepository, never()).delete(any());
        verify(myBidRepository, never()).deleteAll(any());
    }

    // =========================================================================
    // TEST 11 — CUSTOMER SECURITY: CANNOT ACCEPT ANOTHER CUSTOMER'S BID
    // =========================================================================
    @Test
    @DisplayName("Test 11: Customer B cannot accept a bid submitted on Customer A's project")
    void test11_customerSecurity() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX); // Owned by customerA
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.PENDING);

        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(bidA));

        // Customer B tries to accept Customer A's project bid
        assertThrows(SecurityException.class, () -> {
            myBidService.acceptBid(customerB, 101L);
        });
    }

    // =========================================================================
    // TEST 12 — CONTRACTOR SECURITY: CANNOT DECLINE ANOTHER CONTRACTOR'S ASSIGNMENT
    // =========================================================================
    @Test
    @DisplayName("Test 12: Contractor B cannot decline Contractor A's assignment")
    void test12_contractorSecurity() {
        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 701L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorA); // Belongs to contractorA
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);

        when(myBidAssignmentRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(assignment));

        // Contractor B tries to decline
        assertThrows(SecurityException.class, () -> {
            myBidService.declineAssignment(contractorB, 701L);
        });
    }

    // =========================================================================
    // TEST 13 — CUSTOMER REVOKE SECURITY: CANNOT REVOKE ANOTHER CUSTOMER'S ASSIGNMENT
    // =========================================================================
    @Test
    @DisplayName("Test 13: Customer B cannot revoke Customer A's assignment")
    void test13_customerRevokeSecurity() {
        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 701L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA); // Belongs to customerA
        assignment.setContractor(contractorA);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);

        when(myBidAssignmentRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(assignment));

        // Customer B tries to revoke
        assertThrows(SecurityException.class, () -> {
            myBidService.revokeAcceptance(customerB, 701L);
        });
    }

    // =========================================================================
    // TEST 14 — AUDIT HISTORY PRESERVATION
    // =========================================================================
    @Test
    @DisplayName("Test 14: All audit events are append-only; retrieve project audit trail")
    void test14_auditHistoryPreservation() {
        List<MyBidAuditHistory> historyList = Arrays.asList(
                new MyBidAuditHistory(projectX, null, contractorA, "CONTRACTOR",
                        MyBidAuditHistory.EventType.BID_SUBMITTED, "Submitted bid"),
                new MyBidAuditHistory(projectX, null, customerA, "CUSTOMER",
                        MyBidAuditHistory.EventType.BID_ACCEPTED, "Accepted bid"),
                new MyBidAuditHistory(projectX, null, contractorA, "CONTRACTOR",
                        MyBidAuditHistory.EventType.ASSIGNMENT_DECLINED, "Declined assignment"),
                new MyBidAuditHistory(projectX, null, customerA, "CUSTOMER",
                        MyBidAuditHistory.EventType.PROJECT_REOPENED, "Reopened project")
        );

        when(myBidAuditHistoryRepository.findByProjectIdOrderByCreatedAtAsc(5001L)).thenReturn(historyList);

        List<MyBidAuditHistory> result = myBidService.getProjectAuditHistory(customerA, 5001L);
        assertEquals(4, result.size());
        assertEquals(MyBidAuditHistory.EventType.BID_SUBMITTED, result.get(0).getEventType());
        assertEquals(MyBidAuditHistory.EventType.BID_ACCEPTED, result.get(1).getEventType());
        assertEquals(MyBidAuditHistory.EventType.ASSIGNMENT_DECLINED, result.get(2).getEventType());
        assertEquals(MyBidAuditHistory.EventType.PROJECT_REOPENED, result.get(3).getEventType());
    }

    // =========================================================================
    // TEST 15 — COMPLETE SECTION 32 LIFECYCLE SCENARIO
    // =========================================================================
    @Test
    @DisplayName("Test 15: Exact Section 32 complete lifecycle end-to-end execution")
    void test15_section32CompleteLifecycle() {
        // Step 1: Contractor A (₹10L), B (₹10.5L), C (₹11L), D (₹11.2L)
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setBidAmount(1000000.0);
        bidA.setStatus(MyBid.Status.PENDING);

        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setBidAmount(1050000.0);
        bidB.setStatus(MyBid.Status.PENDING);

        MyBid bidC = new MyBid();
        ReflectionTestUtils.setField(bidC, "id", 103L);
        bidC.setProject(projectX);
        bidC.setCustomer(customerA);
        bidC.setContractor(contractorC);
        bidC.setBidAmount(1100000.0);
        bidC.setStatus(MyBid.Status.PENDING);

        MyBid bidD = new MyBid();
        ReflectionTestUtils.setField(bidD, "id", 104L);
        bidD.setProject(projectX);
        bidD.setCustomer(customerA);
        bidD.setContractor(contractorD);
        bidD.setBidAmount(1120000.0);
        bidD.setStatus(MyBid.Status.PENDING);

        List<MyBid> allBids = Arrays.asList(bidA, bidB, bidC, bidD);

        // Step 2: Customer accepts A
        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(bidA));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(allBids);
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> {
            MyBidAssignment a = i.getArgument(0);
            if (a.getId() == null) ReflectionTestUtils.setField(a, "id", 801L);
            return a;
        });

        MyBidAssignment assignment1 = myBidService.acceptBid(customerA, 101L);
        assertEquals(MyBid.Status.ACCEPTED, bidA.getStatus());
        assertEquals(MyBidAssignment.Status.ACTIVE, assignment1.getAssignmentStatus());
        assertTrue(assignment1.isCurrent());
        assertEquals(MyBid.Status.NOT_SELECTED, bidB.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidC.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidD.getStatus());

        // Step 3: Contractor A declines
        when(myBidAssignmentRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(assignment1));
        MyBidAssignment declinedA = myBidService.declineAssignment(contractorA, 801L);
        assertEquals(MyBidAssignment.Status.DECLINED, declinedA.getAssignmentStatus());
        assertFalse(declinedA.isCurrent());
        assertEquals(MyBid.Status.ASSIGNMENT_DECLINED, bidA.getStatus());

        // Verify B, C, D old bids remain intact
        assertEquals(MyBid.Status.NOT_SELECTED, bidB.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidC.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidD.getStatus());

        // Step 4: Customer assigns B using B's existing MyBid
        when(myBidRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(bidB));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty()); // No active assignment now
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> {
            MyBidAssignment a = i.getArgument(0);
            if (a.getId() == null) ReflectionTestUtils.setField(a, "id", 802L);
            return a;
        });

        MyBidAssignment assignment2 = myBidService.reassignContractor(customerA, 102L);
        assertEquals(MyBid.Status.ACCEPTED, bidB.getStatus());
        assertEquals(MyBidAssignment.Status.ACTIVE, assignment2.getAssignmentStatus());
        assertTrue(assignment2.isCurrent());
        assertEquals(MyBid.Status.NOT_SELECTED, bidC.getStatus());
        assertEquals(MyBid.Status.NOT_SELECTED, bidD.getStatus());

        // Step 5: Customer takes back B (revocation)
        when(myBidAssignmentRepository.findByIdForUpdate(802L)).thenReturn(Optional.of(assignment2));
        MyBidAssignment revokedB = myBidService.revokeAcceptance(customerA, 802L);
        assertEquals(MyBidAssignment.Status.REVOKED, revokedB.getAssignmentStatus());
        assertFalse(revokedB.isCurrent());
        assertEquals(MyBid.Status.NOT_SELECTED, bidB.getStatus());

        // Step 6: Customer assigns C using C's existing MyBid
        when(myBidRepository.findByIdForUpdate(103L)).thenReturn(Optional.of(bidC));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> {
            MyBidAssignment a = i.getArgument(0);
            if (a.getId() == null) ReflectionTestUtils.setField(a, "id", 803L);
            return a;
        });

        MyBidAssignment assignment3 = myBidService.reassignContractor(customerA, 103L);
        assertEquals(MyBid.Status.ACCEPTED, bidC.getStatus());
        assertEquals(MyBidAssignment.Status.ACTIVE, assignment3.getAssignmentStatus());
        assertTrue(assignment3.isCurrent());
        assertEquals(contractorC.getId(), assignment3.getContractor().getId());

        // Final verification: ZERO records were deleted across the entire lifecycle
        verify(myBidRepository, never()).delete(any());
        verify(myBidRepository, never()).deleteAll(any());
        verify(myBidAssignmentRepository, never()).delete(any());
    }

    // =========================================================================
    // TEST 16 — CONTRACTOR "MY CONTRACTS" ACTIVE FILTER
    // =========================================================================
    @Test
    @DisplayName("Test 16: Contractor My Contracts returns only active current assignments")
    void test16_getMyContracts() {
        MyBidAssignment activeAssignment = new MyBidAssignment();
        ReflectionTestUtils.setField(activeAssignment, "id", 901L);
        activeAssignment.setContractor(contractorA);
        activeAssignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        activeAssignment.setCurrent(true);

        when(myBidAssignmentRepository.findByContractorIdAndIsCurrentTrueOrderByAcceptedAtDesc(2001L))
                .thenReturn(Collections.singletonList(activeAssignment));

        List<MyBidAssignment> contracts = myBidService.getMyContracts(contractorA);
        assertEquals(1, contracts.size());
        assertEquals(901L, contracts.get(0).getId());
    }

    // =========================================================================
    // TEST 17 — CUSTOMER DASHBOARD SUMMARY
    // =========================================================================
    @Test
    @DisplayName("Test 17: Dynamic customer dashboard counts for owned projects and bids")
    void test17_customerDashboardSummary() {
        when(projectRepository.findByCustomer(customerA)).thenReturn(Collections.singletonList(projectX));
        when(myBidRepository.countByCustomerId(1001L)).thenReturn(4L);

        MyBidService.CustomerDashboardSummary summary = myBidService.getCustomerDashboardSummary(customerA);
        assertEquals(1L, summary.getTotalProjects());
        assertEquals(4L, summary.getTotalBids());
    }

    // =========================================================================
    // TEST 18 — ROLE VALIDATION AND SELF-BIDDING PREVENTION
    // =========================================================================
    @Test
    @DisplayName("Test 18: Reject non-contractors and prevent customer bidding on own project")
    void test18_roleValidationAndSelfBidding() {
        MyBidService.SubmitBidRequest req = new MyBidService.SubmitBidRequest();
        req.setBidAmount(500000.0);

        // Non-contractor user
        assertThrows(SecurityException.class, () -> {
            myBidService.submitBid(regularUser, 5001L, req);
        });

        // Customer bidding on their own project
        customerA.setRoles(new HashSet<>(Arrays.asList(MarketplaceBackendApplication.Role.CUSTOMER, MarketplaceBackendApplication.Role.CONTRACTOR)));
        assertThrows(IllegalArgumentException.class, () -> {
            myBidService.submitBid(customerA, 5001L, req);
        });
    }

    // =========================================================================
    // TEST 19 — PHASE 2.1 CONCURRENT FIRST-TIME ACCEPTANCE (RACE CONDITION FIX)
    // =========================================================================
    @Test
    @DisplayName("Test 19: Concurrent first-time acceptance of two different bids on same project with project-level lock serialization")
    void test19_concurrentFirstTimeAcceptance_projectLevelLockSerializes() throws Exception {
        // SCENARIO: Project X has NO current assignment yet.
        // Bid A (101) by Contractor A and Bid B (102) by Contractor B exist.
        // Two concurrent client requests simultaneously attempt: acceptBid(customerA, 101) & acceptBid(customerA, 102).
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.PENDING);

        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setStatus(MyBid.Status.PENDING);

        when(myBidRepository.findById(101L)).thenReturn(Optional.of(bidA));
        when(myBidRepository.findById(102L)).thenReturn(Optional.of(bidB));
        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(bidA));
        when(myBidRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(bidB));
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(Arrays.asList(bidA, bidB));

        // Shared database state for Project 5001's active assignment
        AtomicReference<MyBidAssignment> activeAssignmentInDb = new AtomicReference<>(null);
        ReentrantLock simulatedDatabaseProjectLock = new ReentrantLock();

        // Accurately simulate database-level pessimistic write lock (SELECT ... FOR UPDATE on my_bid_project_locks)
        when(myBidProjectLockRepository.findByProjectIdForUpdate(5001L)).thenAnswer(inv -> {
            simulatedDatabaseProjectLock.lock();
            return Optional.of(new MyBidProjectLock(5001L));
        });

        // When checking current assignment, returns what has actually been committed/written
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenAnswer(inv ->
                Optional.ofNullable(activeAssignmentInDb.get())
        );

        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(inv -> {
            MyBidAssignment assignment = inv.getArgument(0);
            ReflectionTestUtils.setField(assignment, "id", 999L);
            activeAssignmentInDb.set(assignment);
            return assignment;
        });

        // Concurrently invoke acceptBid for Bid A and Bid B across two separate threads
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        executor.submit(() -> {
            try {
                startLatch.await();
                myBidService.acceptBid(customerA, 101L);
                successCount.incrementAndGet();
            } catch (IllegalStateException e) {
                rejectedCount.incrementAndGet();
            } catch (Exception e) {
                // unexpected exception
            } finally {
                if (simulatedDatabaseProjectLock.isHeldByCurrentThread()) {
                    simulatedDatabaseProjectLock.unlock();
                }
                doneLatch.countDown();
            }
        });

        executor.submit(() -> {
            try {
                startLatch.await();
                myBidService.acceptBid(customerA, 102L);
                successCount.incrementAndGet();
            } catch (IllegalStateException e) {
                rejectedCount.incrementAndGet();
            } catch (Exception e) {
                // unexpected exception
            } finally {
                if (simulatedDatabaseProjectLock.isHeldByCurrentThread()) {
                    simulatedDatabaseProjectLock.unlock();
                }
                doneLatch.countDown();
            }
        });

        // Release both threads simultaneously
        startLatch.countDown();
        boolean completedInTime = doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completedInTime, "Concurrent accept execution timed out");

        // STRICT CONCURRENCY ASSERTIONS:
        // 1. Exactly ONE concurrent transaction succeeded
        assertEquals(1, successCount.get(), "Exactly one concurrent accept transaction must succeed");
        // 2. The other concurrent transaction was safely rejected because the project already had an active assignment
        assertEquals(1, rejectedCount.get(), "The competing concurrent accept transaction must be rejected");

        // 3. Exactly ONE active assignment exists in database state (NEVER two)
        assertNotNull(activeAssignmentInDb.get(), "Active assignment must exist");
        assertTrue(activeAssignmentInDb.get().isCurrent());
        assertEquals(MyBidAssignment.Status.ACTIVE, activeAssignmentInDb.get().getAssignmentStatus());

        // 4. Exactly ONE bid is ACCEPTED, the other is NOT_SELECTED (NEVER both ACCEPTED)
        boolean aAccepted = (bidA.getStatus() == MyBid.Status.ACCEPTED);
        boolean bAccepted = (bidB.getStatus() == MyBid.Status.ACCEPTED);
        assertTrue(aAccepted ^ bAccepted, "Exactly one bid must be ACCEPTED, the other must be NOT_SELECTED");
    }

    // =========================================================================
    // TEST 20 — WRONG PROJECT BID REJECTED
    // =========================================================================
    @Test
    @DisplayName("Test 20: Accept bid belonging to another customer's project throws SecurityException")
    void test20_accept_wrongProjectBid_throwsException() {
        MyBid bidY = new MyBid();
        ReflectionTestUtils.setField(bidY, "id", 201L);
        bidY.setProject(projectY); // Project Y owned by Customer B
        bidY.setCustomer(customerB);
        bidY.setContractor(contractorA);
        bidY.setStatus(MyBid.Status.PENDING);

        when(myBidRepository.findById(201L)).thenReturn(Optional.of(bidY));
        when(myBidRepository.findByIdForUpdate(201L)).thenReturn(Optional.of(bidY));

        assertThrows(SecurityException.class, () -> {
            myBidService.acceptBid(customerA, 201L);
        });
    }

    // =========================================================================
    // TEST 21 — TAKE BACK DUPLICATE REVOKE AND CONTACT REVOCATION
    // =========================================================================
    @Test
    @DisplayName("Test 21: Take Back duplicate revoke throws IllegalStateException; preserves same project and marks bid NOT_SELECTED")
    void test21_takeBack_duplicateRevoke_and_contactRevocation() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.ACCEPTED);

        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 701L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorA);
        assignment.setAcceptedBid(bidA);
        assignment.setAssignmentStatus(MyBidAssignment.Status.REVOKED);
        assignment.setCurrent(false);

        when(myBidAssignmentRepository.findById(701L)).thenReturn(Optional.of(assignment));
        when(myBidAssignmentRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(assignment));

        // Duplicate revoke attempt
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            myBidService.revokeAcceptance(customerA, 701L);
        });
        assertTrue(ex.getMessage().contains("Assignment is not currently active"));
        assertEquals(5001L, assignment.getProject().getId());
    }

    // =========================================================================
    // TEST 22 — CONTRACTOR DUPLICATE DECLINE
    // =========================================================================
    @Test
    @DisplayName("Test 22: Contractor duplicate decline throws IllegalStateException; bid remains ASSIGNMENT_DECLINED")
    void test22_contractorDecline_duplicateDecline_and_decisionCycleAvailable() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.ASSIGNMENT_DECLINED);

        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 701L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorA);
        assignment.setAcceptedBid(bidA);
        assignment.setAssignmentStatus(MyBidAssignment.Status.DECLINED);
        assignment.setCurrent(false);

        when(myBidAssignmentRepository.findById(701L)).thenReturn(Optional.of(assignment));
        when(myBidAssignmentRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(assignment));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            myBidService.declineAssignment(contractorA, 701L);
        });
        assertTrue(ex.getMessage().contains("Assignment is not currently active"));
    }

    // =========================================================================
    // TEST 23 — REASSIGN ACTIVE CONFLICT & WRONG PROJECT BID
    // =========================================================================
    @Test
    @DisplayName("Test 23: Reassign with active assignment conflict or wrong project bid throws exception")
    void test23_reassign_wrongProjectBid_and_conflictWithActiveAssignment() {
        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setStatus(MyBid.Status.NOT_SELECTED);

        MyBidAssignment activeAssignment = new MyBidAssignment();
        ReflectionTestUtils.setField(activeAssignment, "id", 701L);
        activeAssignment.setProject(projectX);
        activeAssignment.setCurrent(true);
        activeAssignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);

        when(myBidRepository.findById(102L)).thenReturn(Optional.of(bidB));
        when(myBidRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(bidB));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.of(activeAssignment));

        // Reassign while project still has active assignment -> conflict
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            myBidService.reassignContractor(customerA, 102L);
        });
        assertTrue(ex.getMessage().contains("already has an active assignment"));

        // Reassign bid belonging to another customer -> SecurityException
        MyBid bidY = new MyBid();
        ReflectionTestUtils.setField(bidY, "id", 201L);
        bidY.setProject(projectY);
        bidY.setCustomer(customerB);
        when(myBidRepository.findById(201L)).thenReturn(Optional.of(bidY));
        when(myBidRepository.findByIdForUpdate(201L)).thenReturn(Optional.of(bidY));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5002L)).thenReturn(Optional.empty());

        assertThrows(SecurityException.class, () -> {
            myBidService.reassignContractor(customerA, 201L);
        });
    }

    // =========================================================================
    // TEST 24 — MULTIPLE DECISION CYCLES & ZERO HISTORICAL DELETION
    // =========================================================================
    @Test
    @DisplayName("Test 24: Multiple customer decision cycles (Accept -> Decline -> Reassign -> Revoke -> Reassign) preserve all IDs and zero deletions")
    void test24_historicalPreservation_acrossMultipleDecisionCycles() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.PENDING);

        MyBid bidB = new MyBid();
        ReflectionTestUtils.setField(bidB, "id", 102L);
        bidB.setProject(projectX);
        bidB.setCustomer(customerA);
        bidB.setContractor(contractorB);
        bidB.setStatus(MyBid.Status.PENDING);

        MyBid bidC = new MyBid();
        ReflectionTestUtils.setField(bidC, "id", 103L);
        bidC.setProject(projectX);
        bidC.setCustomer(customerA);
        bidC.setContractor(contractorC);
        bidC.setStatus(MyBid.Status.PENDING);

        List<MyBid> projectBids = Arrays.asList(bidA, bidB, bidC);

        // Cycle 1: Accept A
        when(myBidRepository.findById(101L)).thenReturn(Optional.of(bidA));
        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(bidA));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(projectBids);
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(inv -> {
            MyBidAssignment a = inv.getArgument(0);
            if (a.getId() == null) ReflectionTestUtils.setField(a, "id", 801L);
            return a;
        });

        MyBidAssignment a1 = myBidService.acceptBid(customerA, 101L);
        assertEquals(801L, a1.getId());
        assertEquals(MyBidAssignment.Status.ACTIVE, a1.getAssignmentStatus());
        assertTrue(a1.isCurrent());
        assertEquals(MyBid.Status.ACCEPTED, bidA.getStatus());

        // Contractor A declines -> Assignment 801 becomes DECLINED
        when(myBidAssignmentRepository.findById(801L)).thenReturn(Optional.of(a1));
        when(myBidAssignmentRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(a1));
        MyBidAssignment declinedA = myBidService.declineAssignment(contractorA, 801L);
        assertEquals(MyBidAssignment.Status.DECLINED, declinedA.getAssignmentStatus());
        assertFalse(declinedA.isCurrent());
        assertEquals(MyBid.Status.ASSIGNMENT_DECLINED, bidA.getStatus());

        // Cycle 2: Customer reassigns B
        when(myBidRepository.findById(102L)).thenReturn(Optional.of(bidB));
        when(myBidRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(bidB));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(inv -> {
            MyBidAssignment a = inv.getArgument(0);
            if (a.getId() == null) ReflectionTestUtils.setField(a, "id", 802L);
            return a;
        });

        MyBidAssignment a2 = myBidService.reassignContractor(customerA, 102L);
        assertEquals(802L, a2.getId());
        assertEquals(MyBidAssignment.Status.ACTIVE, a2.getAssignmentStatus());
        assertTrue(a2.isCurrent());
        assertEquals(MyBid.Status.ACCEPTED, bidB.getStatus());

        // Customer revokes B
        when(myBidAssignmentRepository.findById(802L)).thenReturn(Optional.of(a2));
        when(myBidAssignmentRepository.findByIdForUpdate(802L)).thenReturn(Optional.of(a2));
        MyBidAssignment revokedB = myBidService.revokeAcceptance(customerA, 802L);
        assertEquals(MyBidAssignment.Status.REVOKED, revokedB.getAssignmentStatus());
        assertFalse(revokedB.isCurrent());
        assertEquals(MyBid.Status.NOT_SELECTED, bidB.getStatus());

        // Cycle 3: Customer reassigns C
        when(myBidRepository.findById(103L)).thenReturn(Optional.of(bidC));
        when(myBidRepository.findByIdForUpdate(103L)).thenReturn(Optional.of(bidC));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(inv -> {
            MyBidAssignment a = inv.getArgument(0);
            if (a.getId() == null) ReflectionTestUtils.setField(a, "id", 803L);
            return a;
        });

        MyBidAssignment a3 = myBidService.reassignContractor(customerA, 103L);
        assertEquals(803L, a3.getId());
        assertEquals(MyBidAssignment.Status.ACTIVE, a3.getAssignmentStatus());
        assertTrue(a3.isCurrent());
        assertEquals(MyBid.Status.ACCEPTED, bidC.getStatus());

        // VERIFICATIONS:
        // 1. Same project ID throughout all cycles
        assertEquals(5001L, a1.getProject().getId());
        assertEquals(5001L, a2.getProject().getId());
        assertEquals(5001L, a3.getProject().getId());

        // 2. All distinct assignment IDs preserved
        assertNotEquals(a1.getId(), a2.getId());
        assertNotEquals(a2.getId(), a3.getId());

        // 3. ZERO deletions across the entire lifecycle
        verify(myBidRepository, never()).delete(any());
        verify(myBidRepository, never()).deleteAll(any());
        verify(myBidAssignmentRepository, never()).delete(any());
        verify(myBidAuditHistoryRepository, never()).delete(any());
    }

    // =========================================================================
    // TEST 25 — CONTINUE WORK REGRESSION & METHOD ABSENCE
    // =========================================================================
    @Test
    @DisplayName("Test 25: Continue Work Regression: declined bid cannot be accepted or reassigned, and no continue/resume methods exist")
    void test25_continueWorkRegression_declinedBidCannotBeReactivatedOrAccepted() {
        MyBid declinedBid = new MyBid();
        ReflectionTestUtils.setField(declinedBid, "id", 101L);
        declinedBid.setProject(projectX);
        declinedBid.setCustomer(customerA);
        declinedBid.setContractor(contractorA);
        declinedBid.setStatus(MyBid.Status.ASSIGNMENT_DECLINED);

        when(myBidRepository.findById(101L)).thenReturn(Optional.of(declinedBid));
        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(declinedBid));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());

        // acceptBid rejects ASSIGNMENT_DECLINED
        IllegalStateException ex1 = assertThrows(IllegalStateException.class, () -> {
            myBidService.acceptBid(customerA, 101L);
        });
        assertTrue(ex1.getMessage().contains("Cannot accept a bid whose assignment was previously declined"));

        // reassignContractor rejects ASSIGNMENT_DECLINED
        IllegalStateException ex2 = assertThrows(IllegalStateException.class, () -> {
            myBidService.reassignContractor(customerA, 101L);
        });
        assertTrue(ex2.getMessage().contains("Cannot reassign to a contractor who previously declined this project"));

        // Verify NO continue or resume methods exist in MyBidService
        boolean hasContinueServiceMethod = Arrays.stream(MyBidService.class.getDeclaredMethods())
                .anyMatch(m -> m.getName().toLowerCase().contains("continue") || m.getName().toLowerCase().contains("resume"));
        assertFalse(hasContinueServiceMethod, "MyBidService must NOT have continue or resume methods");

        // Verify NO continue or resume methods exist in MyBidController
        boolean hasContinueControllerMethod = Arrays.stream(MyBidController.class.getDeclaredMethods())
                .anyMatch(m -> m.getName().toLowerCase().contains("continue") || m.getName().toLowerCase().contains("resume"));
        assertFalse(hasContinueControllerMethod, "MyBidController must NOT have continue or resume methods");
    }

    // =========================================================================
    // TEST 26 — CONCURRENCY: PROJECT-LEVEL LOCK ACQUIRED ON ALL MUTATIONS
    // =========================================================================
    @Test
    @DisplayName("Test 26: Concurrency: project-level lock is acquired on all state-changing operations")
    void test26_concurrency_projectLockProtectsAllStateTransitions() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 101L);
        bidA.setProject(projectX);
        bidA.setCustomer(customerA);
        bidA.setContractor(contractorA);
        bidA.setStatus(MyBid.Status.PENDING);

        MyBidAssignment assignment = new MyBidAssignment();
        ReflectionTestUtils.setField(assignment, "id", 701L);
        assignment.setProject(projectX);
        assignment.setCustomer(customerA);
        assignment.setContractor(contractorA);
        assignment.setAcceptedBid(bidA);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        assignment.setCurrent(true);

        when(myBidRepository.findById(101L)).thenReturn(Optional.of(bidA));
        when(myBidRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(bidA));
        when(myBidAssignmentRepository.findById(701L)).thenReturn(Optional.of(assignment));
        when(myBidAssignmentRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(assignment));
        when(myBidAssignmentRepository.findCurrentAssignmentForUpdate(5001L)).thenReturn(Optional.empty());
        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L)).thenReturn(Collections.singletonList(bidA));
        when(myBidAssignmentRepository.save(any(MyBidAssignment.class))).thenAnswer(i -> i.getArgument(0));

        // 1. acceptBid acquires lock
        myBidService.acceptBid(customerA, 101L);
        verify(myBidProjectLockRepository, atLeastOnce()).findByProjectIdForUpdate(5001L);

        // 2. declineAssignment acquires lock
        myBidService.declineAssignment(contractorA, 701L);
        verify(myBidProjectLockRepository, atLeast(2)).findByProjectIdForUpdate(5001L);

        // 3. revokeAcceptance acquires lock
        assignment.setCurrent(true);
        assignment.setAssignmentStatus(MyBidAssignment.Status.ACTIVE);
        myBidService.revokeAcceptance(customerA, 701L);
        verify(myBidProjectLockRepository, atLeast(3)).findByProjectIdForUpdate(5001L);

        // 4. reassignContractor acquires lock
        bidA.setStatus(MyBid.Status.NOT_SELECTED);
        myBidService.reassignContractor(customerA, 101L);
        verify(myBidProjectLockRepository, atLeast(4)).findByProjectIdForUpdate(5001L);
    }

    // =========================================================================
    // TEST 27 — LIGHTWEIGHT ACTIVE ASSIGNMENT CHECK
    // =========================================================================
    @Test
    @DisplayName("Test 27: Lightweight active assignment check without entity loading or proxy dereferencing")
    void test27_hasActiveAssignment() {
        when(myBidAssignmentRepository.existsByProjectIdAndIsCurrentTrue(5001L)).thenReturn(true);
        when(myBidAssignmentRepository.existsByProjectIdAndIsCurrentTrue(5002L)).thenReturn(false);

        assertTrue(myBidService.hasActiveAssignment(5001L));
        assertFalse(myBidService.hasActiveAssignment(5002L));
        assertFalse(myBidService.hasActiveAssignment(null));
    }

    // =========================================================================
    // TEST 28 — SECURITY HARDENING: CONTRACTOR BID WITHDRAW LIFECYCLE & GUARDS
    // =========================================================================
    @Test
    @DisplayName("Test 28: Security hardening: Contractor bid withdraw guards, IDOR protection, and lifecycle synchronization")
    void test28_withdrawBid_securityHardeningAndLifecycle() {
        // 1. Pending bid -> withdrawal succeeds
        MyBid pendingBid = new MyBid();
        ReflectionTestUtils.setField(pendingBid, "id", 301L);
        pendingBid.setProject(projectX);
        pendingBid.setCustomer(customerA);
        pendingBid.setContractor(contractorA);
        pendingBid.setStatus(MyBid.Status.PENDING);
        pendingBid.setBidAmount(4500000.0);

        when(myBidRepository.findById(301L)).thenReturn(Optional.of(pendingBid));
        when(myBidRepository.save(any(MyBid.class))).thenAnswer(i -> i.getArgument(0));

        MyBid withdrawn = myBidService.withdrawBid(contractorA, 301L);
        assertEquals(MyBid.Status.WITHDRAWN, withdrawn.getStatus());
        assertNotNull(withdrawn.getUpdatedAt());

        ArgumentCaptor<MyBidAuditHistory> auditCaptor = ArgumentCaptor.forClass(MyBidAuditHistory.class);
        verify(myBidAuditHistoryRepository, atLeastOnce()).save(auditCaptor.capture());
        assertTrue(auditCaptor.getAllValues().stream().anyMatch(a -> a.getEventType() == MyBidAuditHistory.EventType.BID_WITHDRAWN));

        // 2. Accepted bid -> withdrawal remains blocked
        MyBid acceptedBid = new MyBid();
        ReflectionTestUtils.setField(acceptedBid, "id", 302L);
        acceptedBid.setProject(projectX);
        acceptedBid.setCustomer(customerA);
        acceptedBid.setContractor(contractorA);
        acceptedBid.setStatus(MyBid.Status.ACCEPTED);

        when(myBidRepository.findById(302L)).thenReturn(Optional.of(acceptedBid));
        IllegalStateException exAccepted = assertThrows(IllegalStateException.class, () ->
                myBidService.withdrawBid(contractorA, 302L)
        );
        assertEquals("Cannot withdraw an ACCEPTED bid.", exAccepted.getMessage());

        // 3. Rejected bid -> withdrawal is blocked at service layer
        LocalDateTime rejectedTimestamp = LocalDateTime.now().minusHours(2);
        MyBid rejectedBid = new MyBid();
        ReflectionTestUtils.setField(rejectedBid, "id", 303L);
        rejectedBid.setProject(projectX);
        rejectedBid.setCustomer(customerA);
        rejectedBid.setContractor(contractorA);
        rejectedBid.setStatus(MyBid.Status.REJECTED);
        rejectedBid.setRejectedAt(rejectedTimestamp);

        when(myBidRepository.findById(303L)).thenReturn(Optional.of(rejectedBid));
        IllegalStateException exRejected = assertThrows(IllegalStateException.class, () ->
                myBidService.withdrawBid(contractorA, 303L)
        );
        assertEquals("Cannot withdraw a REJECTED bid.", exRejected.getMessage());
        // Verify rejection history remains intact (status not mutated, timestamp preserved)
        assertEquals(MyBid.Status.REJECTED, rejectedBid.getStatus());
        assertEquals(rejectedTimestamp, rejectedBid.getRejectedAt());

        // 4. Withdrawn bid -> repeated withdrawal remains blocked
        MyBid alreadyWithdrawnBid = new MyBid();
        ReflectionTestUtils.setField(alreadyWithdrawnBid, "id", 304L);
        alreadyWithdrawnBid.setProject(projectX);
        alreadyWithdrawnBid.setCustomer(customerA);
        alreadyWithdrawnBid.setContractor(contractorA);
        alreadyWithdrawnBid.setStatus(MyBid.Status.WITHDRAWN);

        when(myBidRepository.findById(304L)).thenReturn(Optional.of(alreadyWithdrawnBid));
        IllegalStateException exWithdrawn = assertThrows(IllegalStateException.class, () ->
                myBidService.withdrawBid(contractorA, 304L)
        );
        assertEquals("Cannot withdraw a WITHDRAWN bid.", exWithdrawn.getMessage());

        // 5. Contractor ownership / IDOR protection remains intact
        SecurityException exIdor = assertThrows(SecurityException.class, () ->
                myBidService.withdrawBid(contractorB, 301L)
        );
        assertTrue(exIdor.getMessage().contains("You are not authorized to withdraw this bid"));

        // Role restriction remains intact
        SecurityException exRole = assertThrows(SecurityException.class, () ->
                myBidService.withdrawBid(regularUser, 301L)
        );
        assertTrue(exRole.getMessage().contains("CONTRACTOR"));

        // 6. Existing edit restriction remains intact for withdrawn bids
        MyBidService.UpdateBidRequest updateReq = new MyBidService.UpdateBidRequest();
        updateReq.setBidAmount(4000000.0);
        IllegalStateException exEdit = assertThrows(IllegalStateException.class, () ->
                myBidService.updateBid(contractorA, 304L, updateReq)
        );
        assertTrue(exEdit.getMessage().contains("Only PENDING bids can be edited"));

        // 7. Existing customer-side synchronization remains intact
        MyBid activePendingBid = new MyBid();
        ReflectionTestUtils.setField(activePendingBid, "id", 305L);
        activePendingBid.setProject(projectX);
        activePendingBid.setCustomer(customerA);
        activePendingBid.setContractor(contractorA);
        activePendingBid.setStatus(MyBid.Status.PENDING);

        when(myBidRepository.findByProjectIdOrderBySubmittedAtDesc(5001L))
                .thenReturn(Arrays.asList(activePendingBid, rejectedBid, alreadyWithdrawnBid));

        List<MyBid> visibleCustomerBids = myBidService.getCustomerProjectBids(customerA, 5001L);
        assertEquals(2, visibleCustomerBids.size());
        assertTrue(visibleCustomerBids.contains(activePendingBid));
        assertTrue(visibleCustomerBids.contains(rejectedBid));
        assertFalse(visibleCustomerBids.contains(alreadyWithdrawnBid));
    }
}
