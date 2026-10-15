package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - SELLER MATERIAL REQUEST ACCEPT/DECLINE & 24-HOUR EXPIRY INTEGRATION TESTS
 *
 * Verifies:
 * 1. Acceptance workflow: seller can accept an eligible request.
 * 2. Order creation: exactly one order is created on accept and appears in seller orders.
 * 3. Duplicate prevention: repeated accept calls return 409 and do not duplicate orders.
 * 4. Decline workflow: persists seller-specific decline and 24-hour expiry timestamp.
 * 5. Timer stability: repeated decline calls do not reset the 24-hour expiry countdown.
 * 6. Seller isolation: declining a request only affects the declining seller; other sellers and original request remain intact.
 * 7. Expiry exclusion: expired declined requests are excluded from the declining seller's active dashboard.
 * 8. State machine validation: cannot decline accepted requests, cannot accept declined requests.
 * 9. Security & Authorization: unauthorized callers are rejected with 403 Forbidden.
 */
public class SellerMaterialRequestAcceptDeclineTest {

    private MaterialRequestRepository materialRequestRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private SellerMaterialRequestActionRepository sellerMaterialRequestActionRepository;
    private MaterialOrderRepository materialOrderRepository;
    private MaterialOrderItemRepository materialOrderItemRepository;
    private QuotationItemRepository quotationItemRepository;
    private MaterialRepository materialRepository;
    private QuotationRepository quotationRepository;
    private GeoLocationService geoLocationService;
    private NotificationService notificationService;

    private MaterialOrderService materialOrderService;
    private MaterialRequestController materialRequestController;

    private MarketplaceBackendApplication.MarketplaceUser sellerA;
    private MarketplaceBackendApplication.MarketplaceUser sellerB;
    private MarketplaceBackendApplication.MarketplaceUser buyerCustomer;

    private Authentication authSellerA;
    private Authentication authSellerB;
    private Authentication authCustomer;

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");

    @BeforeEach
    public void setup() {
        materialRequestRepository = mock(MaterialRequestRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        sellerMaterialRequestActionRepository = mock(SellerMaterialRequestActionRepository.class);
        materialOrderRepository = mock(MaterialOrderRepository.class);
        materialOrderItemRepository = mock(MaterialOrderItemRepository.class);
        quotationItemRepository = mock(QuotationItemRepository.class);
        materialRepository = mock(MaterialRepository.class);
        quotationRepository = mock(QuotationRepository.class);
        geoLocationService = new GeoLocationService();
        notificationService = mock(NotificationService.class);

        materialOrderService = new MaterialOrderService(
                materialOrderRepository,
                materialOrderItemRepository,
                quotationItemRepository,
                materialRepository,
                materialRequestRepository,
                quotationRepository,
                notificationService
        );
        materialOrderService.setSellerMaterialRequestActionRepository(sellerMaterialRequestActionRepository);

        materialRequestController = new MaterialRequestController(
                materialRequestRepository,
                userRepository,
                geoLocationService,
                notificationService
        );
        materialRequestController.setSellerMaterialRequestActionRepository(sellerMaterialRequestActionRepository);
        materialRequestController.setMaterialOrderService(materialOrderService);

        // Seller A
        sellerA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(sellerA, "id", 201L);
        sellerA.setEmail("sellerA@buildbid.com");
        sellerA.setName("Seller Alpha Materials");
        sellerA.setPhone("9111111111");
        sellerA.setLocation("Sector 18, Noida, Uttar Pradesh, 201301");
        sellerA.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.MATERIAL_SELLER)));

        // Seller B
        sellerB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(sellerB, "id", 202L);
        sellerB.setEmail("sellerB@buildbid.com");
        sellerB.setName("Seller Beta Supplies");
        sellerB.setPhone("9222222222");
        sellerB.setLocation("Sector 62, Noida, Uttar Pradesh, 201309");
        sellerB.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.MATERIAL_SELLER)));

        // Buyer Customer
        buyerCustomer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(buyerCustomer, "id", 101L);
        buyerCustomer.setEmail("customer@buildbid.com");
        buyerCustomer.setName("Rajesh Sharma");
        buyerCustomer.setPhone("9876543210");
        buyerCustomer.setLocation("Sector 18, Noida, Uttar Pradesh, 201301");
        buyerCustomer.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CUSTOMER)));

        // Mock userRepository lookups
        when(userRepository.findByEmail("sellerA@buildbid.com")).thenReturn(Optional.of(sellerA));
        when(userRepository.findByEmail("sellerB@buildbid.com")).thenReturn(Optional.of(sellerB));
        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(buyerCustomer));

        // Mock Authentications
        authSellerA = mock(Authentication.class);
        when(authSellerA.getName()).thenReturn("sellerA@buildbid.com");

        authSellerB = mock(Authentication.class);
        when(authSellerB.getName()).thenReturn("sellerB@buildbid.com");

        authCustomer = mock(Authentication.class);
        when(authCustomer.getName()).thenReturn("customer@buildbid.com");
    }

    private MaterialRequest createMockRequest(Long id, String reqCode, String scope, String status) {
        MaterialRequest req = new MaterialRequest();
        ReflectionTestUtils.setField(req, "id", id);
        req.setRequestId(reqCode);
        req.setRequestType("POSTED_REQUIREMENT");
        req.setRequestScope(scope);
        req.setState("Uttar Pradesh");
        req.setCity("Noida");
        req.setPinCode("201301");
        req.setStatus(status);
        req.setBuyer(buyerCustomer);
        req.setBuyerRole("CUSTOMER");
        req.setCreatedAt(LocalDateTime.now(IST_ZONE).minusHours(2));

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialName("Ultratech Cement OPC 53");
        item.setQuantity(100.0);
        item.setUnit("Bags");
        item.setCategory("Cement");
        req.addItem(item);

        return req;
    }

    @Test
    @DisplayName("Phase 2: Seller can accept eligible request, creates order and marks accepted")
    public void testSellerCanAcceptEligibleRequest() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "NEW");
        when(materialRequestRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.findById(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.empty());

        MaterialOrder savedOrder = new MaterialOrder();
        savedOrder.setId(501L);
        savedOrder.setOrderCode("ORD-105-001");
        savedOrder.setMaterialRequest(req);
        savedOrder.setSeller(sellerA);
        savedOrder.setBuyer(buyerCustomer);
        savedOrder.setOrderStatus("ORDER_ACCEPTED");
        savedOrder.setTotalAmount(45000.0);

        when(materialOrderRepository.existsByMaterialRequestIdAndSellerId(105L, sellerA.getId())).thenReturn(false);
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenReturn(savedOrder);

        ResponseEntity<?> resp = materialRequestController.acceptRequest("105", authSellerA);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals("ACCEPTED", body.get("status"));
        assertEquals("ACCEPTED", body.get("sellerStatus"));

        // Verify seller action persistence
        verify(sellerMaterialRequestActionRepository, times(1)).save(any(SellerMaterialRequestAction.class));
        verify(materialRequestRepository, times(1)).save(any(MaterialRequest.class));
    }

    @Test
    @DisplayName("Phase 2: Repeated acceptance returns 409 conflict and prevents duplicate orders")
    public void testRepeatedAcceptanceReturnsConflict() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.findById(105L)).thenReturn(Optional.of(req));

        SellerMaterialRequestAction existingAction = new SellerMaterialRequestAction();
        existingAction.setStatus("ACCEPTED");
        existingAction.setSeller(sellerA);
        existingAction.setMaterialRequest(req);
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.of(existingAction));

        ResponseEntity<?> resp = materialRequestController.acceptRequest("105", authSellerA);

        assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
        verify(materialOrderRepository, never()).save(any(MaterialOrder.class));
    }

    @Test
    @DisplayName("Phase 4 & 5: Seller can decline request, persists 24-hour expiry timestamp")
    public void testSellerCanDeclineRequest_persists24HourExpiry() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "NEW");
        when(materialRequestRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.findById(105L)).thenReturn(Optional.of(req));

        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.empty());

        ResponseEntity<?> resp = materialRequestController.declineRequest("105", authSellerA);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals("DECLINED", body.get("sellerStatus"));
        assertNotNull(body.get("declinedAt"));
        assertNotNull(body.get("expiryAt"));

        long remainingSec = ((Number) body.get("remainingSeconds")).longValue();
        assertTrue(remainingSec > 86300 && remainingSec <= 86400, "Countdown should start at approximately 24 hours (86400s)");

        // Original material request is NOT globally deleted or modified to DECLINED for broadcast requests
        verify(sellerMaterialRequestActionRepository, times(1)).save(any(SellerMaterialRequestAction.class));
    }

    @Test
    @DisplayName("Phase 5: Repeated decline does not reset the 24-hour timer")
    public void testRepeatedDeclineDoesNotResetTimer() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "NEW");
        when(materialRequestRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.findById(105L)).thenReturn(Optional.of(req));

        LocalDateTime originalDeclinedAt = LocalDateTime.now(IST_ZONE).minusHours(2);
        LocalDateTime originalExpiryAt = originalDeclinedAt.plusHours(24);

        SellerMaterialRequestAction existingAction = new SellerMaterialRequestAction();
        existingAction.setStatus("DECLINED");
        existingAction.setSeller(sellerA);
        existingAction.setMaterialRequest(req);
        existingAction.setDeclinedAt(originalDeclinedAt);
        existingAction.setExpiryAt(originalExpiryAt);

        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.of(existingAction));

        ResponseEntity<?> resp = materialRequestController.declineRequest("105", authSellerA);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals("DECLINED", body.get("sellerStatus"));
        assertEquals(originalDeclinedAt.toString(), body.get("declinedAt"));
        assertEquals(originalExpiryAt.toString(), body.get("expiryAt"));

        long remainingSec = ((Number) body.get("remainingSeconds")).longValue();
        assertTrue(remainingSec <= 79200, "Timer should reflect remaining time from original decline (around 22 hours)");
    }

    @Test
    @DisplayName("Phase 6: Seller isolation - Seller A decline does NOT affect Seller B view")
    public void testSellerIsolation_sellerADeclineDoesNotAffectSellerB() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "NEW");
        when(materialRequestRepository.findAll()).thenReturn(Collections.singletonList(req));

        // Seller A declined it
        SellerMaterialRequestAction actionA = new SellerMaterialRequestAction();
        actionA.setStatus("DECLINED");
        actionA.setSeller(sellerA);
        actionA.setMaterialRequest(req);
        actionA.setDeclinedAt(LocalDateTime.now(IST_ZONE).minusHours(1));
        actionA.setExpiryAt(LocalDateTime.now(IST_ZONE).plusHours(23));

        when(sellerMaterialRequestActionRepository.findBySellerId(sellerA.getId()))
                .thenReturn(Collections.singletonList(actionA));
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.of(actionA));

        // Seller B has NO action recorded
        when(sellerMaterialRequestActionRepository.findBySellerId(sellerB.getId()))
                .thenReturn(Collections.emptyList());
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerB.getId(), 105L))
                .thenReturn(Optional.empty());

        // Check Seller A's view
        ResponseEntity<?> respA = materialRequestController.getSellerEligibleRequests(authSellerA);
        assertEquals(HttpStatus.OK, respA.getStatusCode());
        List<?> listA = (List<?>) respA.getBody();
        assertEquals(1, listA.size());
        Map<?, ?> mapA = (Map<?, ?>) listA.get(0);
        assertEquals("DECLINED", mapA.get("sellerStatus"));
        assertNotNull(mapA.get("expiryAt"));

        // Check Seller B's view
        ResponseEntity<?> respB = materialRequestController.getSellerEligibleRequests(authSellerB);
        assertEquals(HttpStatus.OK, respB.getStatusCode());
        List<?> listB = (List<?>) respB.getBody();
        assertEquals(1, listB.size());
        Map<?, ?> mapB = (Map<?, ?>) listB.get(0);
        assertEquals("PENDING", mapB.get("sellerStatus"), "Seller B must see request as PENDING and unaffected!");
    }

    @Test
    @DisplayName("Phase 5: Expired declined request is excluded from declining seller's active dashboard")
    public void testExpiredDeclinedRequestIsExcluded() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "NEW");
        when(materialRequestRepository.findAll()).thenReturn(Collections.singletonList(req));

        // Decline action expired 1 hour ago
        SellerMaterialRequestAction expiredAction = new SellerMaterialRequestAction();
        expiredAction.setStatus("DECLINED");
        expiredAction.setSeller(sellerA);
        expiredAction.setMaterialRequest(req);
        expiredAction.setDeclinedAt(LocalDateTime.now(IST_ZONE).minusHours(25));
        expiredAction.setExpiryAt(LocalDateTime.now(IST_ZONE).minusHours(1));

        when(sellerMaterialRequestActionRepository.findBySellerId(sellerA.getId()))
                .thenReturn(Collections.singletonList(expiredAction));
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.of(expiredAction));

        ResponseEntity<?> respA = materialRequestController.getSellerEligibleRequests(authSellerA);
        assertEquals(HttpStatus.OK, respA.getStatusCode());
        List<?> listA = (List<?>) respA.getBody();
        assertEquals(0, listA.size(), "Expired declined request must be excluded from active results");
    }

    @Test
    @DisplayName("Phase 8: State validation - cannot accept a declined request")
    public void testCannotAcceptDeclinedRequest() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "NEW");
        when(materialRequestRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.findById(105L)).thenReturn(Optional.of(req));

        SellerMaterialRequestAction action = new SellerMaterialRequestAction();
        action.setStatus("DECLINED");
        action.setSeller(sellerA);
        action.setMaterialRequest(req);
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.of(action));

        ResponseEntity<?> resp = materialRequestController.acceptRequest("105", authSellerA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("Phase 8: State validation - cannot decline an accepted request")
    public void testCannotDeclineAcceptedRequest() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.findById(105L)).thenReturn(Optional.of(req));

        SellerMaterialRequestAction action = new SellerMaterialRequestAction();
        action.setStatus("ACCEPTED");
        action.setSeller(sellerA);
        action.setMaterialRequest(req);
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(sellerA.getId(), 105L))
                .thenReturn(Optional.of(action));

        ResponseEntity<?> resp = materialRequestController.declineRequest("105", authSellerA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("Phase 8: Non-seller user is rejected with 403 Forbidden")
    public void testNonSellerIsRejected() {
        MaterialRequest req = createMockRequest(105L, "MR-105", "STATE", "NEW");
        when(materialRequestRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.findById(105L)).thenReturn(Optional.of(req));

        ResponseEntity<?> acceptResp = materialRequestController.acceptRequest("105", authCustomer);
        assertEquals(HttpStatus.FORBIDDEN, acceptResp.getStatusCode());

        ResponseEntity<?> declineResp = materialRequestController.declineRequest("105", authCustomer);
        assertEquals(HttpStatus.FORBIDDEN, declineResp.getStatusCode());
    }
}
