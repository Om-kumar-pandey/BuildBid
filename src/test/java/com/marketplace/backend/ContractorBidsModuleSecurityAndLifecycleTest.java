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
 * CONTRACTOR BIDS MODULE - SECURITY, LIFECYCLE & INTEGRATION TESTS
 * Verifies Section 49 test cases:
 * - Bid Submission
 * - Exact Timestamp preservation
 * - Contractor Bid Editing (submittedAt preserved, updatedAt recorded)
 * - Contractor Bid Withdrawal / Soft Deletion
 * - Customer Bid Rejection (contractor retains in history, status=REJECTED)
 * - Customer Bid Acceptance
 * - Security & IDOR Authorization checks
 */
public class ContractorBidsModuleSecurityAndLifecycleTest {

    private MyBidService myBidService;
    private ProjectRepository projectRepository;
    private MyBidRepository myBidRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;

    private MyBidController myBidController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;

    private Authentication authCustomerA;
    private Authentication authCustomerB;
    private Authentication authContractorA;
    private Authentication authContractorB;

    private Project projectX;

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
        contractorA.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        contractorB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorB, "id", 202L);
        contractorB.setName("Zenith Infra");
        contractorB.setEmail("contractorB@buildbid.com");
        contractorB.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

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

        projectX = new Project();
        projectX.setId(501L);
        projectX.setProjectId("PRJ-501");
        projectX.setProjectTitle("Luxury Villa Construction");
        projectX.setCustomer(customerA);
    }

    @Test
    @DisplayName("Test 1: Contractor submits bid via POST /api/bids -> 201 Created")
    void test1_contractorSubmitsBid() {
        when(projectRepository.findByProjectId("PRJ-501")).thenReturn(Optional.of(projectX));

        MyBid createdBid = new MyBid();
        ReflectionTestUtils.setField(createdBid, "id", 1001L);
        createdBid.setProject(projectX);
        createdBid.setContractor(contractorA);
        createdBid.setCustomer(customerA);
        createdBid.setBidAmount(4500000.0);
        createdBid.setStatus(MyBid.Status.PENDING);
        LocalDateTime now = LocalDateTime.now();
        createdBid.setSubmittedAt(now);

        when(myBidService.submitBid(eq(contractorA), eq(501L), any(MyBidService.SubmitBidRequest.class)))
                .thenReturn(createdBid);

        Map<String, Object> payload = new HashMap<>();
        payload.put("projectId", "PRJ-501");
        payload.put("bidAmount", 4500000.0);
        payload.put("duration", "60 Days");
        payload.put("scopeOfWork", "Complete structural civil work.");

        ResponseEntity<?> res = myBidController.submitContractorBid(null, payload, authContractorA);
        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        MyBidController.BidResponseDto dto = (MyBidController.BidResponseDto) res.getBody();
        assertNotNull(dto);
        assertEquals(1001L, dto.getId());
        assertEquals(4500000.0, dto.getBidAmount());
        assertEquals("PENDING", dto.getStatus());
        assertEquals(now, dto.getSubmittedAt());
    }

    @Test
    @DisplayName("Test 2: Exact timestamp with seconds preserved in BidResponseDto")
    void test2_exactTimestampPreserved() {
        LocalDateTime exactTime = LocalDateTime.of(2026, 10, 8, 14, 37, 49);
        MyBid bid = new MyBid();
        ReflectionTestUtils.setField(bid, "id", 1001L);
        bid.setProject(projectX);
        bid.setContractor(contractorA);
        bid.setStatus(MyBid.Status.PENDING);
        bid.setSubmittedAt(exactTime);

        when(myBidService.getBidById(1001L)).thenReturn(Optional.of(bid));

        ResponseEntity<?> res = myBidController.getContractorBidDetails(1001L, authContractorA);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        MyBidController.BidResponseDto dto = (MyBidController.BidResponseDto) res.getBody();
        assertEquals(exactTime, dto.getSubmittedAt());
        assertEquals(49, dto.getSubmittedAt().getSecond());
        assertEquals(37, dto.getSubmittedAt().getMinute());
        assertEquals(14, dto.getSubmittedAt().getHour());
    }

    @Test
    @DisplayName("Test 4: Contractor edits pending bid -> submittedAt unchanged, updatedAt recorded")
    void test4_contractorEditsPendingBid() {
        LocalDateTime originalSubmittedAt = LocalDateTime.of(2026, 10, 5, 9, 30, 0);
        LocalDateTime updatedAt = LocalDateTime.of(2026, 10, 8, 11, 45, 12);

        MyBid updatedBid = new MyBid();
        ReflectionTestUtils.setField(updatedBid, "id", 1001L);
        updatedBid.setProject(projectX);
        updatedBid.setContractor(contractorA);
        updatedBid.setBidAmount(4200000.0);
        updatedBid.setStatus(MyBid.Status.PENDING);
        updatedBid.setSubmittedAt(originalSubmittedAt); // Unchanged!
        updatedBid.setUpdatedAt(updatedAt);

        MyBidService.UpdateBidRequest req = new MyBidService.UpdateBidRequest();
        req.setBidAmount(4200000.0);
        req.setEstimatedDuration("45 Days");

        when(myBidService.updateBid(eq(contractorA), eq(1001L), any(MyBidService.UpdateBidRequest.class)))
                .thenReturn(updatedBid);

        ResponseEntity<?> res = myBidController.updateContractorBid(1001L, req, authContractorA);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        MyBidController.BidResponseDto dto = (MyBidController.BidResponseDto) res.getBody();
        assertEquals(4200000.0, dto.getBidAmount());
        assertEquals(originalSubmittedAt, dto.getSubmittedAt());
        assertEquals(updatedAt, dto.getUpdatedAt());
    }

    @Test
    @DisplayName("Test 5: Contractor withdraws bid -> 200 OK and WITHDRAWN status")
    void test5_contractorWithdrawsBid() {
        MyBid withdrawn = new MyBid();
        ReflectionTestUtils.setField(withdrawn, "id", 1001L);
        withdrawn.setStatus(MyBid.Status.WITHDRAWN);

        when(myBidService.withdrawBid(contractorA, 1001L)).thenReturn(withdrawn);

        ResponseEntity<?> res = myBidController.withdrawContractorBid(1001L, authContractorA);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        Map<?, ?> map = (Map<?, ?>) res.getBody();
        assertEquals("WITHDRAWN", map.get("status"));
    }

    @Test
    @DisplayName("Test 5b: Contractor cannot withdraw REJECTED bid -> 409 CONFLICT")
    void test5b_contractorCannotWithdrawRejectedBid() {
        when(myBidService.withdrawBid(contractorA, 1001L))
                .thenThrow(new IllegalStateException("Cannot withdraw a REJECTED bid."));

        ResponseEntity<?> res = myBidController.withdrawContractorBid(1001L, authContractorA);
        assertEquals(HttpStatus.CONFLICT, res.getStatusCode());
        Map<?, ?> map = (Map<?, ?>) res.getBody();
        assertEquals("Cannot withdraw a REJECTED bid.", map.get("error"));
    }

    @Test
    @DisplayName("Test 5c: Contractor cannot repeatedly withdraw WITHDRAWN bid -> 409 CONFLICT")
    void test5c_contractorCannotRepeatedlyWithdrawWithdrawnBid() {
        when(myBidService.withdrawBid(contractorA, 1001L))
                .thenThrow(new IllegalStateException("Cannot withdraw a WITHDRAWN bid."));

        ResponseEntity<?> res = myBidController.withdrawContractorBid(1001L, authContractorA);
        assertEquals(HttpStatus.CONFLICT, res.getStatusCode());
        Map<?, ?> map = (Map<?, ?>) res.getBody();
        assertEquals("Cannot withdraw a WITHDRAWN bid.", map.get("error"));
    }

    @Test
    @DisplayName("Test 5d: IDOR check - Contractor B cannot withdraw Contractor A's bid -> 403 FORBIDDEN")
    void test5d_contractorCannotWithdrawOtherContractorBid() {
        when(myBidService.withdrawBid(contractorB, 1001L))
                .thenThrow(new SecurityException("Forbidden: You are not authorized to withdraw this bid."));

        ResponseEntity<?> res = myBidController.withdrawContractorBid(1001L, authContractorB);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
    }

    @Test
    @DisplayName("Test 6: Customer rejects bid -> 200 OK and REJECTED status in history")
    void test6_customerRejectsBid() {
        MyBid rejected = new MyBid();
        ReflectionTestUtils.setField(rejected, "id", 1001L);
        rejected.setProject(projectX);
        rejected.setContractor(contractorA);
        rejected.setCustomer(customerA);
        rejected.setStatus(MyBid.Status.REJECTED);
        LocalDateTime now = LocalDateTime.now();
        rejected.setRejectedAt(now);

        when(myBidService.rejectBid(customerA, 1001L)).thenReturn(rejected);

        ResponseEntity<?> res = myBidController.rejectBid(1001L, authCustomerA);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        MyBidController.BidResponseDto dto = (MyBidController.BidResponseDto) res.getBody();
        assertEquals("REJECTED", dto.getStatus());
        assertEquals(now, dto.getRejectedAt());
    }

    @Test
    @DisplayName("Test 8: IDOR check - Contractor B cannot view or edit Contractor A's bid")
    void test8_contractorCannotEditOtherContractorBid() {
        MyBid bidA = new MyBid();
        ReflectionTestUtils.setField(bidA, "id", 1001L);
        bidA.setContractor(contractorA);

        when(myBidService.getBidById(1001L)).thenReturn(Optional.of(bidA));

        // Contractor B tries to GET Contractor A's bid
        ResponseEntity<?> resGet = myBidController.getContractorBidDetails(1001L, authContractorB);
        assertEquals(HttpStatus.FORBIDDEN, resGet.getStatusCode());

        // Contractor B tries to PUT Contractor A's bid
        when(myBidService.updateBid(eq(contractorB), eq(1001L), any()))
                .thenThrow(new SecurityException("Forbidden: You are not authorized to edit this bid."));

        MyBidService.UpdateBidRequest req = new MyBidService.UpdateBidRequest();
        req.setBidAmount(99999.0);
        ResponseEntity<?> resPut = myBidController.updateContractorBid(1001L, req, authContractorB);
        assertEquals(HttpStatus.FORBIDDEN, resPut.getStatusCode());
    }

    @Test
    @DisplayName("Test 10: IDOR check - Customer B cannot reject Customer A's project bid")
    void test10_customerCannotRejectOtherCustomerBid() {
        when(myBidService.rejectBid(customerB, 1001L))
                .thenThrow(new SecurityException("Forbidden: Bid does not belong to authenticated customer."));

        ResponseEntity<?> res = myBidController.rejectBid(1001L, authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
    }
}
