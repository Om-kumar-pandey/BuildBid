package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
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
 * BUILDBID - DIRECT MATERIAL PURCHASE ACCEPTANCE & CONTACT SHARING TEST SUITE
 * 
 * Validates Scenarios A through G:
 * - Scenario A: Creation status WAITING_FOR_ACCEPTANCE & IST timestamp
 * - Scenario B: Customer request view before acceptance (no quotations, no private seller contact)
 * - Scenario C: Targeted seller visibility and authorization
 * - Scenario D: Seller acceptance transition WAITING_FOR_ACCEPTANCE -> ACCEPTED
 * - Scenario E: Customer view after acceptance (full seller contact + expected delivery details)
 * - Scenario F: Strict isolation (unauthorized users receive 403 Forbidden)
 * - Scenario G: Atomic single allocation enforcement (duplicate accept returns 409 Conflict)
 */
public class DirectMaterialPurchaseAcceptanceTest {

    private MaterialRepository materialRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private MaterialRequestRepository materialRequestRepository;
    private GeoLocationService geoLocationService;
    private NotificationService notificationService;
    private QuotationRepository quotationRepository;
    private MaterialOrderRepository materialOrderRepository;

    private DirectBuyController directBuyController;
    private MaterialRequestController materialRequestController;
    private CustomerRequestController customerRequestController;
    private MaterialOrderService materialOrderService;

    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser otherCustomerUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;
    private MarketplaceBackendApplication.MarketplaceUser otherSellerUser;

    private Authentication authCustomer;
    private Authentication authOtherCustomer;
    private Authentication authSeller;
    private Authentication authOtherSeller;

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");

    @BeforeEach
    public void setup() {
        materialRepository = mock(MaterialRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        geoLocationService = new GeoLocationService();
        notificationService = mock(NotificationService.class);
        quotationRepository = mock(QuotationRepository.class);
        materialOrderRepository = mock(MaterialOrderRepository.class);

        directBuyController = new DirectBuyController(
                materialRepository,
                materialRequestRepository,
                userRepository,
                geoLocationService,
                notificationService
        );

        materialRequestController = new MaterialRequestController(
                materialRequestRepository,
                userRepository,
                geoLocationService,
                notificationService
        );

        customerRequestController = new CustomerRequestController(
                materialRequestRepository,
                mock(ClientServiceRequestRepository.class),
                userRepository,
                quotationRepository,
                materialOrderRepository
        );

        materialOrderService = new MaterialOrderService(
                materialOrderRepository,
                mock(MaterialOrderItemRepository.class),
                mock(QuotationItemRepository.class),
                materialRepository,
                materialRequestRepository,
                quotationRepository,
                notificationService
        );

        // Setup Customer
        customerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerUser, "id", 1L);
        customerUser.setEmail("customer@buildbid.com");
        customerUser.setName("Rajesh Sharma");
        customerUser.setPhone("9876543210");
        customerUser.setLocation("Sector 18, Noida, Uttar Pradesh, 201301");
        customerUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CUSTOMER));

        // Setup Other Customer
        otherCustomerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(otherCustomerUser, "id", 2L);
        otherCustomerUser.setEmail("othercustomer@buildbid.com");
        otherCustomerUser.setName("Suresh Patel");
        otherCustomerUser.setPhone("9811223344");
        otherCustomerUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CUSTOMER));

        // Setup Targeted Seller
        sellerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(sellerUser, "id", 101L);
        sellerUser.setEmail("seller@buildbid.com");
        sellerUser.setName("Gupta Building Materials");
        sellerUser.setPhone("9810012345");
        sellerUser.setLocation("Sector 62, Noida, Uttar Pradesh, 201301");
        sellerUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.MATERIAL_SELLER));

        // Setup Other Seller
        otherSellerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(otherSellerUser, "id", 102L);
        otherSellerUser.setEmail("otherseller@buildbid.com");
        otherSellerUser.setName("Other Materials Co");
        otherSellerUser.setPhone("9820054321");
        otherSellerUser.setLocation("Lucknow, Uttar Pradesh, 226001");
        otherSellerUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.MATERIAL_SELLER));

        // Setup Auth mocks
        authCustomer = mock(Authentication.class);
        when(authCustomer.getName()).thenReturn("customer@buildbid.com");

        authOtherCustomer = mock(Authentication.class);
        when(authOtherCustomer.getName()).thenReturn("othercustomer@buildbid.com");

        authSeller = mock(Authentication.class);
        when(authSeller.getName()).thenReturn("seller@buildbid.com");

        authOtherSeller = mock(Authentication.class);
        when(authOtherSeller.getName()).thenReturn("otherseller@buildbid.com");

        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(customerUser));
        when(userRepository.findByEmail("othercustomer@buildbid.com")).thenReturn(Optional.of(otherCustomerUser));
        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(sellerUser));
        when(userRepository.findByEmail("otherseller@buildbid.com")).thenReturn(Optional.of(otherSellerUser));
        when(userRepository.findById(101L)).thenReturn(Optional.of(sellerUser));
        when(userRepository.findById(102L)).thenReturn(Optional.of(otherSellerUser));
    }

    /**
     * Scenario A: Direct Material Purchase Creation
     * - Status must be WAITING_FOR_ACCEPTANCE (never quotation status)
     * - Date + time must be formatted in Asia/Kolkata (IST) timezone
     */
    @Test
    public void testScenarioA_DirectMaterialPurchaseCreation_InitialStatusAndISTTimestamps() {
        Material mat = new Material();
        ReflectionTestUtils.setField(mat, "id", 501L);
        mat.setSeller(sellerUser);
        mat.setMaterialName("UltraTech Super Cement");
        mat.setCategory("Cement");
        mat.setUnit("Bag");
        mat.setUnitPrice(380.0);
        mat.setCurrentStock(500.0);
        mat.setReservedStock(0.0);
        mat.setDeliveryLocation("Sector 62, Noida, Uttar Pradesh, 201301");
        mat.setTransportationChargeBasis("Free Delivery");
        mat.setDeliveryRadiusKm(50.0);

        when(materialRepository.findById(501L)).thenReturn(Optional.of(mat));
        when(materialRequestRepository.count()).thenReturn(10L);
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(invocation -> {
            MaterialRequest saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 1001L);
            saved.setCreatedAt(LocalDateTime.now(IST_ZONE));
            return saved;
        });

        Map<String, Object> reqPayload = new HashMap<>();
        reqPayload.put("sellerId", 101L);
        reqPayload.put("materialId", 501L);
        reqPayload.put("quantity", 50);
        reqPayload.put("state", "Uttar Pradesh");
        reqPayload.put("city", "Noida");
        reqPayload.put("pincode", "201301");
        reqPayload.put("deliveryAddress", "Plot 42, Sector 18, Noida");
        reqPayload.put("expectedDeliveryDate", "08 Oct 2026");

        ResponseEntity<?> response = directBuyController.createDirectBuyRequest(reqPayload, authCustomer);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertTrue((Boolean) body.get("success"));
        assertEquals("WAITING_FOR_ACCEPTANCE", body.get("status"));
        assertEquals("Waiting for Acceptance", body.get("statusEn"));
        assertEquals("विक्रेता की स्वीकृति की प्रतीक्षा", body.get("statusHi"));

        // Timestamp integrity
        assertNotNull(body.get("createdAt"));
        assertNotNull(body.get("submittedDate"));
        assertNotNull(body.get("submittedTimestamp"));
        assertTrue(((Number) body.get("submittedTimestamp")).longValue() > 0);
    }

    /**
     * Scenario B: Customer View Before Acceptance
     * - Status is "Waiting for Acceptance"
     * - Quotations list is empty (NO quotation mentions)
     * - Private seller contact info (phone, email, address) is withheld until acceptance
     */
    @Test
    public void testScenarioB_CustomerViewBeforeAcceptance_NoQuotationsAndPrivateContactWithheld() {
        MaterialRequest mr = new MaterialRequest();
        ReflectionTestUtils.setField(mr, "id", 1001L);
        mr.setRequestId("DMR-1001");
        mr.setBuyer(customerUser);
        mr.setBuyerRole("CUSTOMER");
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setTargetSeller(sellerUser);
        mr.setStatus("WAITING_FOR_ACCEPTANCE");
        mr.setDeliveryAddress("Plot 42, Sector 18, Noida");
        mr.setCity("Noida");
        mr.setState("Uttar Pradesh");
        mr.setPinCode("201301");
        mr.setCreatedAt(LocalDateTime.now(IST_ZONE));

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialName("UltraTech Super Cement");
        item.setCategory("Cement");
        item.setQuantity(50.0);
        item.setUnit("Bag");
        mr.addItem(item);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customerUser))
                .thenReturn(Collections.singletonList(mr));

        ResponseEntity<?> response = customerRequestController.getCustomerMyRequests(authCustomer);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cards = (List<Map<String, Object>>) response.getBody();
        assertEquals(1, cards.size());

        Map<String, Object> card = cards.get(0);
        assertEquals("Waiting for Acceptance", card.get("status"));
        assertEquals("WAITING_FOR_ACCEPTANCE", card.get("rawStatus"));
        assertEquals("DIRECT_BUY", card.get("type"));
        assertTrue((Boolean) card.get("noQuotationsAllowed"));
        assertEquals(Collections.emptyList(), card.get("quotations"));

        // Contact security: before acceptance, private contact details must NOT be exposed
        assertEquals(sellerUser.getId(), card.get("sellerId"));
        assertEquals(sellerUser.getName(), card.get("sellerName"));
        assertNull(card.get("sellerPhone"), "Phone must not be visible before seller acceptance");
        assertNull(card.get("sellerEmail"), "Email must not be visible before seller acceptance");
        assertNull(card.get("sellerAddress"), "Address must not be visible before seller acceptance");
    }

    /**
     * Scenario C: Targeted Seller Visibility & Authorization
     * - Only designated seller can see direct request in seller eligible requests
     * - Other sellers calling accept receive 403 Forbidden
     */
    @Test
    public void testScenarioC_TargetedSellerVisibilityAndAuthorization() {
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 1001L);
        directReq.setRequestId("DMR-1001");
        directReq.setBuyer(customerUser);
        directReq.setRequestType("DIRECT_MATERIAL");
        directReq.setTargetSeller(sellerUser);
        directReq.setStatus("WAITING_FOR_ACCEPTANCE");
        directReq.setCreatedAt(LocalDateTime.now(IST_ZONE));
        directReq.setState("Uttar Pradesh");

        when(materialRequestRepository.findAll()).thenReturn(Collections.singletonList(directReq));

        // Designated seller can see the targeted request
        ResponseEntity<?> designatedResp = materialRequestController.getSellerEligibleRequests(authSeller);
        assertEquals(HttpStatus.OK, designatedResp.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> designatedList = (List<Map<String, Object>>) designatedResp.getBody();
        assertEquals(1, designatedList.size());
        assertEquals("DMR-1001", designatedList.get(0).get("requestId"));

        // Unrelated seller cannot see the direct request targeted to another seller
        ResponseEntity<?> otherResp = materialRequestController.getSellerEligibleRequests(authOtherSeller);
        assertEquals(HttpStatus.OK, otherResp.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> otherList = (List<Map<String, Object>>) otherResp.getBody();
        assertTrue(otherList.isEmpty(), "Unrelated seller must not see direct request targeted to another seller");

        // Unrelated seller attempting to accept receives 403 Forbidden
        when(materialRequestRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(directReq));
        when(materialRequestRepository.findById(1001L)).thenReturn(Optional.of(directReq));

        ResponseEntity<?> acceptOtherResp = materialRequestController.acceptRequest(1001L, authOtherSeller);
        assertEquals(HttpStatus.FORBIDDEN, acceptOtherResp.getStatusCode());
    }

    /**
     * Scenario D: Seller Acceptance
     * - Designated seller accepts: WAITING_FOR_ACCEPTANCE -> ACCEPTED
     * - Atomic update, verification code generated, targeted notification to buyer
     */
    @Test
    public void testScenarioD_SellerAcceptance_TransitionsToAccepted() {
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 1001L);
        directReq.setRequestId("DMR-1001");
        directReq.setBuyer(customerUser);
        directReq.setRequestType("DIRECT_MATERIAL");
        directReq.setTargetSeller(sellerUser);
        directReq.setStatus("WAITING_FOR_ACCEPTANCE");
        directReq.setCreatedAt(LocalDateTime.now(IST_ZONE));

        when(materialRequestRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(directReq));
        when(materialRequestRepository.findById(1001L)).thenReturn(Optional.of(directReq));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<?> acceptResp = materialRequestController.acceptRequest(1001L, authSeller);
        assertEquals(HttpStatus.OK, acceptResp.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) acceptResp.getBody();
        assertTrue((Boolean) body.get("success"));
        assertEquals("ACCEPTED", body.get("status"));
        assertEquals("Order Accepted", body.get("statusEn"));
        assertEquals("DMR-1001", body.get("requestId"));
        assertNotNull(body.get("verificationCode"));

        // Verify targeted notification sent to buyer
        verify(notificationService, times(1)).createNotification(
                eq(customerUser),
                eq("Order Accepted"),
                anyString(),
                anyString(),
                anyString(),
                eq("DIRECT_BUY_ACCEPTED"),
                eq("DMR-1001")
        );
    }

    /**
     * Scenario E: Customer View After Acceptance
     * - Status is "Order Accepted"
     * - Complete seller contact details (sellerBusinessName, sellerPhone, sellerEmail, sellerAddress, sellerId) exposed
     * - Expected delivery date exposed
     */
    @Test
    public void testScenarioE_CustomerViewAfterAcceptance_ExposesCompleteSellerContactDetails() {
        MaterialRequest mr = new MaterialRequest();
        ReflectionTestUtils.setField(mr, "id", 1001L);
        mr.setRequestId("DMR-1001");
        mr.setBuyer(customerUser);
        mr.setBuyerRole("CUSTOMER");
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setTargetSeller(sellerUser);
        mr.setStatus("ACCEPTED");
        mr.setDeliveryAddress("Plot 42, Sector 18, Noida");
        mr.setCity("Noida");
        mr.setState("Uttar Pradesh");
        mr.setPinCode("201301");
        mr.setExpectedDeliveryDate("08 Oct 2026");
        mr.setCreatedAt(LocalDateTime.now(IST_ZONE));

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialName("UltraTech Super Cement");
        item.setCategory("Cement");
        item.setQuantity(50.0);
        item.setUnit("Bag");
        mr.addItem(item);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customerUser))
                .thenReturn(Collections.singletonList(mr));

        ResponseEntity<?> response = customerRequestController.getCustomerMyRequests(authCustomer);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cards = (List<Map<String, Object>>) response.getBody();
        assertEquals(1, cards.size());

        Map<String, Object> card = cards.get(0);
        assertEquals("Order Accepted", card.get("status"));
        assertEquals("ACCEPTED", card.get("rawStatus"));

        // Full contact details MUST be present after acceptance
        assertEquals(sellerUser.getId(), card.get("sellerId"));
        assertEquals(sellerUser.getName(), card.get("sellerName"));
        assertEquals(sellerUser.getName(), card.get("sellerBusinessName"));
        assertEquals("9810012345", card.get("sellerPhone"));
        assertEquals("seller@buildbid.com", card.get("sellerEmail"));
        assertEquals("Sector 62, Noida, Uttar Pradesh, 201301", card.get("sellerLocation"));
        assertEquals("Sector 62, Noida, Uttar Pradesh, 201301", card.get("sellerAddress"));
        assertEquals("08 Oct 2026", card.get("expectedDeliveryDate"));
    }

    /**
     * Scenario F: Strict Security Authorization / Cross-User Isolation
     * - Unauthorized customer accessing another customer's request receives 403 Forbidden
     */
    @Test
    public void testScenarioF_StrictSecurityAuthorization_OtherCustomerForbidden() {
        MaterialRequest mr = new MaterialRequest();
        ReflectionTestUtils.setField(mr, "id", 1001L);
        mr.setRequestId("DMR-1001");
        mr.setBuyer(customerUser); // Owned by Rajesh Sharma
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setTargetSeller(sellerUser);
        mr.setStatus("ACCEPTED");

        when(materialRequestRepository.findById(1001L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.findByRequestId("DMR-1001")).thenReturn(Optional.of(mr));

        // Suresh Patel (other customer) attempts to access Rajesh's order
        ResponseEntity<?> forbiddenResp = materialRequestController.getMaterialRequestById("1001", authOtherCustomer);
        assertEquals(HttpStatus.FORBIDDEN, forbiddenResp.getStatusCode());
    }

    /**
     * Scenario G: Single Allocation & Concurrency Guard
     * - Duplicate accept attempt fails with 409 Conflict: "This material requirement has already been allocated."
     */
    @Test
    public void testScenarioG_SingleAllocationGuard_DuplicateAcceptanceReturns409Conflict() {
        MaterialRequest alreadyAcceptedReq = new MaterialRequest();
        ReflectionTestUtils.setField(alreadyAcceptedReq, "id", 1001L);
        alreadyAcceptedReq.setRequestId("DMR-1001");
        alreadyAcceptedReq.setBuyer(customerUser);
        alreadyAcceptedReq.setRequestType("DIRECT_MATERIAL");
        alreadyAcceptedReq.setTargetSeller(sellerUser);
        alreadyAcceptedReq.setStatus("ACCEPTED"); // Already accepted

        when(materialRequestRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(alreadyAcceptedReq));
        when(materialRequestRepository.findById(1001L)).thenReturn(Optional.of(alreadyAcceptedReq));

        // Seller attempts to accept again
        ResponseEntity<?> duplicateResp = materialRequestController.acceptRequest(1001L, authSeller);
        assertEquals(HttpStatus.CONFLICT, duplicateResp.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) duplicateResp.getBody();
        assertEquals("This material requirement has already been allocated.", body.get("error"));

        // DirectBuyController accept endpoint also returns 409 Conflict
        ResponseEntity<?> directBuyDuplicateResp = directBuyController.acceptDirectBuyRequest(1001L, authSeller);
        assertEquals(HttpStatus.CONFLICT, directBuyDuplicateResp.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> dbBody = (Map<String, Object>) directBuyDuplicateResp.getBody();
        assertEquals("This material requirement has already been allocated.", dbBody.get("error"));
    }

    /**
     * Scenario G2: Multi-Seller Procurement Allocation Atomic Guard
     * - allocatePurchase throws IllegalStateException if requirement is already ALLOCATED
     */
    @Test
    public void testScenarioG2_MultiSellerProcurement_AlreadyAllocatedThrowsConflict() {
        MaterialRequest allocatedReq = new MaterialRequest();
        ReflectionTestUtils.setField(allocatedReq, "id", 2001L);
        allocatedReq.setRequestId("MR-2001");
        allocatedReq.setBuyer(customerUser);
        allocatedReq.setRequestType("POSTED_REQUIREMENT");
        allocatedReq.setStatus("ALLOCATED");

        when(materialRequestRepository.findByIdForUpdate(2001L)).thenReturn(Optional.of(allocatedReq));
        when(materialRequestRepository.findById(2001L)).thenReturn(Optional.of(allocatedReq));

        Map<String, Object> allocPayload = Map.of("allocations", List.of(Map.of("quotationId", 301L)));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            materialOrderService.allocatePurchase(2001L, allocPayload, customerUser);
        });
        assertEquals("This material requirement has already been allocated.", ex.getMessage());
    }

    /**
     * Scenario G3: Allocated / Accepted Requirement Removed From Seller Active Requests
     */
    @Test
    public void testScenarioG3_AllocatedRequirementRemovedFromSellerActiveList() {
        MaterialRequest allocatedReq = new MaterialRequest();
        ReflectionTestUtils.setField(allocatedReq, "id", 2001L);
        allocatedReq.setRequestId("MR-2001");
        allocatedReq.setBuyer(customerUser);
        allocatedReq.setRequestType("POSTED_REQUIREMENT");
        allocatedReq.setStatus("ALLOCATED");
        allocatedReq.setState("Uttar Pradesh");
        allocatedReq.setRequestScope("STATE");

        when(materialRequestRepository.findAll()).thenReturn(Collections.singletonList(allocatedReq));

        ResponseEntity<?> resp = materialRequestController.getSellerEligibleRequests(authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        @SuppressWarnings("unchecked")
        List<?> list = (List<?>) resp.getBody();
        assertTrue(list.isEmpty(), "Allocated requirement must be filtered out from seller active requests");
    }

    /**
     * Scenario H1: Valid Forward Status Transitions in Order Lifecycle
     * WAITING_FOR_ACCEPTANCE -> ORDER_ACCEPTED -> PROCESSING -> READY_FOR_DISPATCH -> OUT_FOR_DELIVERY -> DELIVERED
     */
    @Test
    public void testScenarioH1_ValidForwardStatusTransitions() {
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 3001L);
        directReq.setRequestId("DMR-3001");
        directReq.setBuyer(customerUser);
        directReq.setRequestType("DIRECT_MATERIAL");
        directReq.setTargetSeller(sellerUser);
        directReq.setStatus("ORDER_ACCEPTED");

        when(materialRequestRepository.findById(3001L)).thenReturn(Optional.of(directReq));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. ORDER_ACCEPTED -> PROCESSING
        ResponseEntity<?> procResp = directBuyController.updateDirectBuyStatus(3001L, Map.of("status", "PROCESSING"), authSeller);
        assertEquals(HttpStatus.OK, procResp.getStatusCode());
        assertEquals("PROCESSING", directReq.getStatus());

        // 2. PROCESSING -> READY_FOR_DISPATCH
        ResponseEntity<?> dispResp = directBuyController.updateDirectBuyStatus(3001L, Map.of("status", "READY_FOR_DISPATCH"), authSeller);
        assertEquals(HttpStatus.OK, dispResp.getStatusCode());
        assertEquals("READY_FOR_DISPATCH", directReq.getStatus());

        // 3. READY_FOR_DISPATCH -> OUT_FOR_DELIVERY
        ResponseEntity<?> outResp = directBuyController.updateDirectBuyStatus(3001L, Map.of("status", "OUT_FOR_DELIVERY"), authSeller);
        assertEquals(HttpStatus.OK, outResp.getStatusCode());
        assertEquals("OUT_FOR_DELIVERY", directReq.getStatus());

        // 4. OUT_FOR_DELIVERY -> DELIVERED
        ResponseEntity<?> delResp = directBuyController.updateDirectBuyStatus(3001L, Map.of("status", "DELIVERED"), authSeller);
        assertEquals(HttpStatus.OK, delResp.getStatusCode());
        assertEquals("DELIVERED", directReq.getStatus());
    }

    /**
     * Scenario H2: Invalid Direct Forward Status Jump is Rejected
     * WAITING_FOR_ACCEPTANCE -> DELIVERED must be rejected with 400 Bad Request
     */
    @Test
    public void testScenarioH2_InvalidForwardStatusJumpRejected() {
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 3002L);
        directReq.setRequestId("DMR-3002");
        directReq.setBuyer(customerUser);
        directReq.setRequestType("DIRECT_MATERIAL");
        directReq.setTargetSeller(sellerUser);
        directReq.setStatus("WAITING_FOR_ACCEPTANCE");

        when(materialRequestRepository.findById(3002L)).thenReturn(Optional.of(directReq));

        ResponseEntity<?> jumpResp = directBuyController.updateDirectBuyStatus(3002L, Map.of("status", "DELIVERED"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, jumpResp.getStatusCode());
        assertEquals("WAITING_FOR_ACCEPTANCE", directReq.getStatus());
    }

    /**
     * Scenario H3: Backward Status Transition is Rejected
     * DELIVERED -> PROCESSING must be rejected with 400 Bad Request
     */
    @Test
    public void testScenarioH3_BackwardStatusTransitionRejected() {
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 3003L);
        directReq.setRequestId("DMR-3003");
        directReq.setBuyer(customerUser);
        directReq.setRequestType("DIRECT_MATERIAL");
        directReq.setTargetSeller(sellerUser);
        directReq.setStatus("DELIVERED");

        when(materialRequestRepository.findById(3003L)).thenReturn(Optional.of(directReq));

        ResponseEntity<?> backResp = directBuyController.updateDirectBuyStatus(3003L, Map.of("status", "PROCESSING"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, backResp.getStatusCode());
        assertEquals("DELIVERED", directReq.getStatus());
    }

    /**
     * Scenario H4: Unauthorized Seller Update Rejected
     * Other seller cannot update status of seller's order
     */
    @Test
    public void testScenarioH4_UnauthorizedSellerStatusUpdateRejected() {
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 3004L);
        directReq.setRequestId("DMR-3004");
        directReq.setBuyer(customerUser);
        directReq.setRequestType("DIRECT_MATERIAL");
        directReq.setTargetSeller(sellerUser);
        directReq.setStatus("ORDER_ACCEPTED");

        when(materialRequestRepository.findById(3004L)).thenReturn(Optional.of(directReq));

        ResponseEntity<?> resp = directBuyController.updateDirectBuyStatus(3004L, Map.of("status", "PROCESSING"), authOtherSeller);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
    }

    /**
     * Scenario I: Direct Hire Status in My Requests Response
     * - Before acceptance: status is "Waiting for Acceptance"
     * - After acceptance: status is "Accepted"
     */
    @Test
    public void testScenarioI_DirectHireStatusNormalizationInMyRequests() {
        ClientServiceRequestRepository csrRepo = mock(ClientServiceRequestRepository.class);
        CustomerRequestController ctrl = new CustomerRequestController(
                materialRequestRepository,
                csrRepo,
                userRepository,
                quotationRepository,
                materialOrderRepository
        );

        ClientServiceRequest csrNew = new ClientServiceRequest();
        ReflectionTestUtils.setField(csrNew, "id", 4001L);
        csrNew.setRequestId("REQ-4001");
        csrNew.setClient(customerUser);
        csrNew.setProfessional(sellerUser);
        csrNew.setStatus("New");
        csrNew.setRequestedService("Plumber");
        csrNew.setCreatedAt(LocalDateTime.now(IST_ZONE));

        ClientServiceRequest csrAccepted = new ClientServiceRequest();
        ReflectionTestUtils.setField(csrAccepted, "id", 4002L);
        csrAccepted.setRequestId("REQ-4002");
        csrAccepted.setClient(customerUser);
        csrAccepted.setProfessional(sellerUser);
        csrAccepted.setStatus("Accepted");
        csrAccepted.setRequestedService("Electrician");
        csrAccepted.setCreatedAt(LocalDateTime.now(IST_ZONE).minusHours(2));

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customerUser)).thenReturn(Collections.emptyList());
        when(csrRepo.findByClient_IdOrderByCreatedAtDesc(customerUser.getId())).thenReturn(List.of(csrNew, csrAccepted));

        ResponseEntity<?> resp = ctrl.getCustomerMyRequests(authCustomer);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cards = (List<Map<String, Object>>) resp.getBody();
        assertEquals(2, cards.size());

        Map<String, Object> newCard = cards.stream().filter(c -> "REQ-4001".equals(c.get("id"))).findFirst().orElseThrow();
        assertEquals("Waiting for Acceptance", newCard.get("status"));
        assertEquals("Waiting for Acceptance", newCard.get("statusEn"));
        assertEquals("स्वीकृति की प्रतीक्षा", newCard.get("statusHi"));

        Map<String, Object> acceptedCard = cards.stream().filter(c -> "REQ-4002".equals(c.get("id"))).findFirst().orElseThrow();
        assertEquals("Accepted", acceptedCard.get("status"));
        assertEquals("Accepted", acceptedCard.get("statusEn"));
        assertEquals("स्वीकार किया गया", acceptedCard.get("statusHi"));
    }
}
