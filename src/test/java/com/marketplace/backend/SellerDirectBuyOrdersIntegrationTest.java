package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - SELLER DIRECT BUY ACCEPT/DECLINE & ORDERS INTEGRATION TEST SUITE
 *
 * Validates:
 * 1. Acceptance workflow: designated seller can accept; unauthorized seller gets 403; duplicate gets 409.
 * 2. Decline workflow: persists DECLINED status; does not create a material order.
 * 3. Orders aggregation: getUnifiedOrdersForSeller aggregates MaterialOrders + accepted Direct Buy requests.
 * 4. Orders exclusion: pending, declined, and cancelled direct buy requests are strictly excluded from seller orders.
 * 5. Seller isolation: seller only sees their assigned orders, never another seller's orders.
 * 6. Universal buyer roles: accurately preserves CUSTOMER, CONTRACTOR, and PROFESSIONAL buyer roles.
 * 7. Order card field mapping: buyerName, buyerPhone, contactNumber, line items, allocatedQuantity, agreedRate, deliveryAddress, expectedDeliveryDate.
 * 8. Fulfillment lifecycle: PROCESSING -> READY_FOR_DISPATCH -> OUT_FOR_DELIVERY -> DELIVERED transitions on Direct Buy requests.
 * 9. Expected delivery date updates on Direct Buy requests with seller ownership validation.
 * 10. Source-aware routing: prevents colliding numeric IDs from mutating the wrong table.
 */
public class SellerDirectBuyOrdersIntegrationTest {

    private MaterialRepository materialRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private MaterialRequestRepository materialRequestRepository;
    private GeoLocationService geoLocationService;
    private NotificationService notificationService;
    private QuotationRepository quotationRepository;
    private MaterialOrderRepository materialOrderRepository;
    private MaterialOrderItemRepository materialOrderItemRepository;
    private QuotationItemRepository quotationItemRepository;

    private DirectBuyController directBuyController;
    private MaterialRequestController materialRequestController;
    private MaterialOrderController materialOrderController;
    private MaterialOrderService materialOrderService;

    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser professionalUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;
    private MarketplaceBackendApplication.MarketplaceUser otherSellerUser;

    private Authentication authCustomer;
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
        materialOrderItemRepository = mock(MaterialOrderItemRepository.class);
        quotationItemRepository = mock(QuotationItemRepository.class);

        materialOrderService = new MaterialOrderService(
                materialOrderRepository,
                materialOrderItemRepository,
                quotationItemRepository,
                materialRepository,
                materialRequestRepository,
                quotationRepository,
                notificationService
        );

        directBuyController = new DirectBuyController(
                materialRepository,
                materialRequestRepository,
                userRepository,
                geoLocationService,
                notificationService
        );
        directBuyController.setMaterialOrderRepository(materialOrderRepository);

        materialRequestController = new MaterialRequestController(
                materialRequestRepository,
                userRepository,
                geoLocationService,
                notificationService
        );
        materialRequestController.setMaterialOrderService(materialOrderService);

        materialOrderController = new MaterialOrderController(materialOrderService, userRepository);
        materialOrderController.setDirectBuyController(directBuyController);

        // Setup Customer User
        customerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerUser, "id", 101L);
        customerUser.setEmail("customer@buildbid.com");
        customerUser.setName("Rajesh Sharma");
        customerUser.setPhone("9876543210");
        customerUser.setLocation("Sector 18, Noida, Uttar Pradesh, 201301");
        customerUser.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CUSTOMER)));

        // Setup Contractor User
        contractorUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorUser, "id", 102L);
        contractorUser.setEmail("contractor@buildbid.com");
        contractorUser.setName("Vikram Contractor");
        contractorUser.setPhone("9811223344");
        contractorUser.setLocation("Sector 62, Noida, Uttar Pradesh, 201309");
        contractorUser.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CONTRACTOR)));

        // Setup Professional User
        professionalUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(professionalUser, "id", 103L);
        professionalUser.setEmail("architect@buildbid.com");
        professionalUser.setName("Ananya Architect");
        professionalUser.setPhone("9899887766");
        professionalUser.setLocation("Connaught Place, New Delhi, 110001");
        professionalUser.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.PROFESSIONAL)));

        // Setup Seller User
        sellerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(sellerUser, "id", 201L);
        sellerUser.setEmail("seller@buildbid.com");
        sellerUser.setName("Apex Building Supplies");
        sellerUser.setPhone("9123456789");
        sellerUser.setLocation("Noida Phase 2, Uttar Pradesh, 201305");
        sellerUser.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.MATERIAL_SELLER)));

        // Setup Other Seller User
        otherSellerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(otherSellerUser, "id", 202L);
        otherSellerUser.setEmail("other_seller@buildbid.com");
        otherSellerUser.setName("Rival Building Supplies");
        otherSellerUser.setPhone("9988776655");
        otherSellerUser.setLocation("Greater Noida, Uttar Pradesh, 201310");
        otherSellerUser.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.MATERIAL_SELLER)));

        // Setup Authentication Mocks
        authCustomer = mock(Authentication.class);
        when(authCustomer.getName()).thenReturn("customer@buildbid.com");
        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(customerUser));

        authSeller = mock(Authentication.class);
        when(authSeller.getName()).thenReturn("seller@buildbid.com");
        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(sellerUser));

        authOtherSeller = mock(Authentication.class);
        when(authOtherSeller.getName()).thenReturn("other_seller@buildbid.com");
        when(userRepository.findByEmail("other_seller@buildbid.com")).thenReturn(Optional.of(otherSellerUser));
    }

    private MaterialRequest createDirectBuyRequest(Long id, String reqCode, MarketplaceBackendApplication.MarketplaceUser buyer, String buyerRole, String status) {
        MaterialRequest mr = new MaterialRequest();
        ReflectionTestUtils.setField(mr, "id", id);
        mr.setRequestId(reqCode);
        mr.setBuyer(buyer);
        mr.setBuyerRole(buyerRole);
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setTargetSeller(sellerUser);
        mr.setStatus(status);
        mr.setDeliveryAddress("Flat 402, Tower 3, Noida, UP");
        mr.setCity("Noida");
        mr.setState("Uttar Pradesh");
        mr.setPinCode("201301");
        mr.setContactPerson(buyer.getName());
        mr.setContactPhone(buyer.getPhone());
        mr.setMaterialPrice(380.0);
        mr.setMaterialAmount(38000.0);
        mr.setTransportationCost(1500.0);
        mr.setEstimatedTotal(39500.0);
        mr.setExpectedDeliveryDate("18 Oct 2026");
        mr.setVerificationCode("BB-DM-123456");

        MaterialRequestItem item = new MaterialRequestItem();
        ReflectionTestUtils.setField(item, "id", id * 10);
        item.setMaterialRequest(mr);
        item.setMaterialName("Ultratech Cement 53 Grade");
        item.setQuantity(100.0);
        item.setUnit("Bags");
        mr.getItems().add(item);

        return mr;
    }

    // ==========================================
    // 1. ACCEPTANCE & DECLINE WORKFLOW TESTS
    // ==========================================

    @Test
    @DisplayName("Assigned seller can accept eligible Direct Buy request")
    public void testAssignedSellerCanAcceptEligibleRequest() {
        MaterialRequest req = createDirectBuyRequest(501L, "DMR-501", customerUser, "CUSTOMER", "WAITING_FOR_ACCEPTANCE");
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = materialRequestController.acceptRequest(501L, authSeller);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ACCEPTED", req.getStatus());
        assertNotNull(req.getVerificationCode());
        verify(notificationService, times(1)).createNotification(
                eq(customerUser), eq("Order Accepted"), anyString(), anyString(), anyString(), eq("DIRECT_BUY_ACCEPTED"), eq("DMR-501")
        );
    }

    @Test
    @DisplayName("Unrelated seller is rejected with 403 Forbidden when attempting to accept")
    public void testUnrelatedSellerCannotAcceptDirectBuyRequest() {
        MaterialRequest req = createDirectBuyRequest(502L, "DMR-502", customerUser, "CUSTOMER", "WAITING_FOR_ACCEPTANCE");
        when(materialRequestRepository.findByIdForUpdate(502L)).thenReturn(Optional.of(req));

        ResponseEntity<?> response = materialRequestController.acceptRequest(502L, authOtherSeller);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("WAITING_FOR_ACCEPTANCE", req.getStatus());
    }

    @Test
    @DisplayName("Repeated acceptance returns 409 Conflict")
    public void testRepeatedAcceptanceReturns409Conflict() {
        MaterialRequest req = createDirectBuyRequest(503L, "DMR-503", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(503L)).thenReturn(Optional.of(req));

        ResponseEntity<?> response = materialRequestController.acceptRequest(503L, authSeller);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    @DisplayName("Decline persists DECLINED status and does not create MaterialOrder")
    public void testDeclinePersistsStatusAndDoesNotCreateOrder() {
        MaterialRequest req = createDirectBuyRequest(504L, "DMR-504", customerUser, "CUSTOMER", "WAITING_FOR_ACCEPTANCE");
        when(materialRequestRepository.findByIdForUpdate(504L)).thenReturn(Optional.of(req));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = materialRequestController.declineRequest(504L, authSeller);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("DECLINED", req.getStatus());
        verify(materialOrderRepository, never()).save(any(MaterialOrder.class));
    }

    // ==========================================
    // 2. ORDERS AGGREGATION & SELLER RETRIEVAL TESTS
    // ==========================================

    @Test
    @DisplayName("Seller Orders includes both standard MaterialOrders and accepted Direct Buy requests")
    public void testSellerOrdersAggregatesMaterialOrdersAndAcceptedDirectBuy() {
        // Standard MaterialOrder
        MaterialOrder standardOrder = new MaterialOrder();
        ReflectionTestUtils.setField(standardOrder, "id", 1001L);
        standardOrder.setOrderCode("ORD-2026-0001");
        standardOrder.setSeller(sellerUser);
        standardOrder.setBuyer(customerUser);
        standardOrder.setBuyerRole("CUSTOMER");
        standardOrder.setOrderStatus("CONFIRMED");
        standardOrder.setTotalAmount(50000.0);
        standardOrder.setCreatedAt(LocalDateTime.now(IST_ZONE).minusHours(3));

        // Accepted Direct Buy Request
        MaterialRequest directBuyAccepted = createDirectBuyRequest(601L, "DMR-601", contractorUser, "CONTRACTOR", "ACCEPTED");
        directBuyAccepted.setCreatedAt(LocalDateTime.now(IST_ZONE).minusHours(1));

        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(sellerUser.getId()))
                .thenReturn(Collections.singletonList(standardOrder));
        when(materialRequestRepository.findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(sellerUser, "DIRECT_MATERIAL"))
                .thenReturn(Collections.singletonList(directBuyAccepted));

        ResponseEntity<?> response = materialOrderController.getSellerOrders(authSeller);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> unifiedOrders = (List<Map<String, Object>>) response.getBody();
        assertNotNull(unifiedOrders);
        assertEquals(2, unifiedOrders.size());

        // Verify sorted by submittedTimestamp descending: DMR-601 (-1 hr) first, standardOrder (-3 hrs) second
        Map<String, Object> first = unifiedOrders.get(0);
        Map<String, Object> second = unifiedOrders.get(1);

        assertEquals("DMR-601", first.get("orderCode"));
        assertEquals("DIRECT_BUY", first.get("sourceType"));
        assertEquals("CONTRACTOR", first.get("buyerRole"));
        assertEquals("Vikram Contractor", first.get("buyerName"));
        assertEquals("9811223344", first.get("buyerPhone"));
        assertTrue((Boolean) first.get("isDirectBuy"));

        assertEquals("ORD-2026-0001", second.get("orderCode"));
        assertEquals("MATERIAL_ORDER", second.get("sourceType"));
        assertEquals("CUSTOMER", second.get("buyerRole"));
        assertEquals("Rajesh Sharma", second.get("buyerName"));
        assertFalse((Boolean) second.get("isDirectBuy"));
    }

    @Test
    @DisplayName("Seller Orders strictly excludes pending, declined, and cancelled Direct Buy requests")
    public void testSellerOrdersExcludesPendingAndDeclinedRequests() {
        MaterialRequest pendingReq = createDirectBuyRequest(701L, "DMR-701", customerUser, "CUSTOMER", "WAITING_FOR_ACCEPTANCE");
        MaterialRequest declinedReq = createDirectBuyRequest(702L, "DMR-702", customerUser, "CUSTOMER", "DECLINED");
        MaterialRequest cancelledReq = createDirectBuyRequest(703L, "DMR-703", customerUser, "CUSTOMER", "CANCELLED");
        MaterialRequest acceptedReq = createDirectBuyRequest(704L, "DMR-704", customerUser, "CUSTOMER", "ACCEPTED");

        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(sellerUser.getId())).thenReturn(Collections.emptyList());
        when(materialRequestRepository.findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(sellerUser, "DIRECT_MATERIAL"))
                .thenReturn(List.of(pendingReq, declinedReq, cancelledReq, acceptedReq));

        List<Map<String, Object>> result = materialOrderService.getUnifiedOrdersForSeller(sellerUser);
        assertEquals(1, result.size());
        assertEquals("DMR-704", result.get(0).get("orderCode"));
    }

    @Test
    @DisplayName("Seller isolation: Seller A never sees Seller B's direct buy orders")
    public void testSellerIsolationInOrdersRetrieval() {
        MaterialRequest sellerReq = createDirectBuyRequest(801L, "DMR-801", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(sellerUser.getId())).thenReturn(Collections.emptyList());
        when(materialRequestRepository.findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(sellerUser, "DIRECT_MATERIAL"))
                .thenReturn(Collections.singletonList(sellerReq));

        // When otherSeller queries, repo receives otherSellerUser as param
        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(otherSellerUser.getId())).thenReturn(Collections.emptyList());
        when(materialRequestRepository.findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(otherSellerUser, "DIRECT_MATERIAL"))
                .thenReturn(Collections.emptyList());

        List<Map<String, Object>> sellerOrders = materialOrderService.getUnifiedOrdersForSeller(sellerUser);
        List<Map<String, Object>> otherSellerOrders = materialOrderService.getUnifiedOrdersForSeller(otherSellerUser);

        assertEquals(1, sellerOrders.size());
        assertEquals(0, otherSellerOrders.size());
    }

    @Test
    @DisplayName("Universal buyer roles: preserves CUSTOMER, CONTRACTOR, and PROFESSIONAL roles")
    public void testUniversalBuyerRolesPreservedInOrderCard() {
        MaterialRequest mrCustomer = createDirectBuyRequest(901L, "DMR-901", customerUser, "CUSTOMER", "ACCEPTED");
        MaterialRequest mrContractor = createDirectBuyRequest(902L, "DMR-902", contractorUser, "CONTRACTOR", "ACCEPTED");
        MaterialRequest mrProfessional = createDirectBuyRequest(903L, "DMR-903", professionalUser, "PROFESSIONAL", "ACCEPTED");

        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(sellerUser.getId())).thenReturn(Collections.emptyList());
        when(materialRequestRepository.findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(sellerUser, "DIRECT_MATERIAL"))
                .thenReturn(List.of(mrCustomer, mrContractor, mrProfessional));

        List<Map<String, Object>> orders = materialOrderService.getUnifiedOrdersForSeller(sellerUser);
        assertEquals(3, orders.size());

        Map<String, Object> cOrder = orders.stream().filter(o -> "DMR-901".equals(o.get("orderCode"))).findFirst().orElseThrow();
        assertEquals("CUSTOMER", cOrder.get("buyerRole"));
        assertEquals("Rajesh Sharma", cOrder.get("buyerName"));

        Map<String, Object> conOrder = orders.stream().filter(o -> "DMR-902".equals(o.get("orderCode"))).findFirst().orElseThrow();
        assertEquals("CONTRACTOR", conOrder.get("buyerRole"));
        assertEquals("Vikram Contractor", conOrder.get("buyerName"));

        Map<String, Object> proOrder = orders.stream().filter(o -> "DMR-903".equals(o.get("orderCode"))).findFirst().orElseThrow();
        assertEquals("PROFESSIONAL", proOrder.get("buyerRole"));
        assertEquals("Ananya Architect", proOrder.get("buyerName"));
    }

    @Test
    @DisplayName("Order card mapping includes line items, allocatedQuantity, agreedRate, and delivery details")
    public void testOrderCardDetailedFieldMapping() {
        MaterialRequest mr = createDirectBuyRequest(950L, "DMR-950", contractorUser, "CONTRACTOR", "ACCEPTED");
        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(sellerUser.getId())).thenReturn(Collections.emptyList());
        when(materialRequestRepository.findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(sellerUser, "DIRECT_MATERIAL"))
                .thenReturn(Collections.singletonList(mr));

        List<Map<String, Object>> orders = materialOrderService.getUnifiedOrdersForSeller(sellerUser);
        Map<String, Object> card = orders.get(0);

        assertEquals("DMR-950", card.get("orderCode"));
        assertEquals("DIRECT_BUY", card.get("sourceType"));
        assertEquals(950L, card.get("backendId"));
        assertEquals("18 Oct 2026", card.get("expectedDeliveryDate"));
        assertEquals("Flat 402, Tower 3, Noida, UP", card.get("deliveryAddress"));
        assertEquals("BB-DM-123456", card.get("verificationCode"));
        assertEquals(39500.0, card.get("totalAmount"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) card.get("items");
        assertNotNull(items);
        assertEquals(1, items.size());
        Map<String, Object> item = items.get(0);
        assertEquals("Ultratech Cement 53 Grade", item.get("materialName"));
        assertEquals(100.0, item.get("quantity"));
        assertEquals(100.0, item.get("allocatedQuantity"));
        assertEquals("Bags", item.get("unit"));
        assertEquals(380.0, item.get("unitPrice"));
        assertEquals(380.0, item.get("agreedRate"));
        assertEquals(38000.0, item.get("subtotal"));
    }

    // ==========================================
    // 3. FULFILLMENT LIFECYCLE & EXPECTED DELIVERY TESTS
    // ==========================================

    @Test
    @DisplayName("Direct Buy status transitions succeed through valid lifecycle: ORDER_ACCEPTED -> PROCESSING -> READY_FOR_DISPATCH -> OUT_FOR_DELIVERY -> DELIVERED")
    public void testDirectBuyValidLifecycleTransitions() {
        MaterialRequest mr = createDirectBuyRequest(1001L, "DMR-1001", customerUser, "CUSTOMER", "ORDER_ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        // 1. ORDER_ACCEPTED -> PROCESSING
        ResponseEntity<?> r1 = directBuyController.updateDirectBuyStatus(1001L, Map.of("status", "PROCESSING"), authSeller);
        assertEquals(HttpStatus.OK, r1.getStatusCode());
        assertEquals("PROCESSING", mr.getStatus());

        // 2. PROCESSING -> READY_FOR_DISPATCH
        ResponseEntity<?> r2 = directBuyController.updateDirectBuyStatus(1001L, Map.of("status", "READY_FOR_DISPATCH"), authSeller);
        assertEquals(HttpStatus.OK, r2.getStatusCode());
        assertEquals("READY_FOR_DISPATCH", mr.getStatus());

        // 3. READY_FOR_DISPATCH -> OUT_FOR_DELIVERY
        ResponseEntity<?> r3 = directBuyController.updateDirectBuyStatus(1001L, Map.of("status", "OUT_FOR_DELIVERY"), authSeller);
        assertEquals(HttpStatus.OK, r3.getStatusCode());
        assertEquals("OUT_FOR_DELIVERY", mr.getStatus());

        // 4. OUT_FOR_DELIVERY -> DELIVERED
        ResponseEntity<?> r4 = directBuyController.updateDirectBuyStatus(1001L, Map.of("status", "DELIVERED"), authSeller);
        assertEquals(HttpStatus.OK, r4.getStatusCode());
        assertEquals("DELIVERED", mr.getStatus());
    }

    @Test
    @DisplayName("Invalid status transition on Direct Buy order is rejected with 400 Bad Request")
    public void testDirectBuyInvalidStatusTransitionRejected() {
        MaterialRequest mr = createDirectBuyRequest(1002L, "DMR-1002", customerUser, "CUSTOMER", "DELIVERED");
        when(materialRequestRepository.findByIdForUpdate(1002L)).thenReturn(Optional.of(mr));

        ResponseEntity<?> resp = directBuyController.updateDirectBuyStatus(1002L, Map.of("status", "PROCESSING"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertEquals("DELIVERED", mr.getStatus());
    }

    @Test
    @DisplayName("Unrelated seller cannot update status of Direct Buy order")
    public void testUnrelatedSellerCannotUpdateDirectBuyStatus() {
        MaterialRequest mr = createDirectBuyRequest(1003L, "DMR-1003", customerUser, "CUSTOMER", "ORDER_ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1003L)).thenReturn(Optional.of(mr));

        ResponseEntity<?> resp = directBuyController.updateDirectBuyStatus(1003L, Map.of("status", "PROCESSING"), authOtherSeller);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertEquals("ORDER_ACCEPTED", mr.getStatus());
    }

    @Test
    @DisplayName("Assigned seller can update expected delivery date on Direct Buy request")
    public void testAssignedSellerCanUpdateExpectedDeliveryDate() {
        MaterialRequest mr = createDirectBuyRequest(1004L, "DMR-1004", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1004L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(1004L, Map.of("expectedDeliveryDate", "25 Oct 2026"), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("25 Oct 2026", mr.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Unrelated seller is rejected with 403 when updating expected delivery on Direct Buy request")
    public void testUnrelatedSellerCannotUpdateExpectedDeliveryDate() {
        MaterialRequest mr = createDirectBuyRequest(1005L, "DMR-1005", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1005L)).thenReturn(Optional.of(mr));

        ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(1005L, Map.of("expectedDeliveryDate", "25 Oct 2026"), authOtherSeller);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertEquals("18 Oct 2026", mr.getExpectedDeliveryDate());
    }

    // ==========================================
    // 4. SOURCE-AWARE ROUTING & COLLIDING ID TESTS
    // ==========================================

    @Test
    @DisplayName("Source-aware routing: PUT /api/material-orders/{id}/status with sourceType=DIRECT_BUY updates MaterialRequest")
    public void testSourceAwareStatusRoutingToDirectBuy() {
        MaterialRequest mr = createDirectBuyRequest(777L, "DMR-777", customerUser, "CUSTOMER", "ORDER_ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(777L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = Map.of(
                "status", "PROCESSING",
                "sourceType", "DIRECT_BUY"
        );

        ResponseEntity<?> resp = materialOrderController.updateOrderStatus(777L, body, authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("PROCESSING", mr.getStatus());
        verify(materialOrderRepository, never()).findById(777L);
    }

    @Test
    @DisplayName("Source-aware routing: PUT /api/material-orders/{id}/expected-delivery with sourceType=DIRECT_BUY updates MaterialRequest")
    public void testSourceAwareDeliveryDateRoutingToDirectBuy() {
        MaterialRequest mr = createDirectBuyRequest(888L, "DMR-888", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(888L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = Map.of(
                "expectedDeliveryDate", "30 Oct 2026",
                "sourceType", "DIRECT_BUY"
        );

        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(888L, body, authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("30 Oct 2026", mr.getExpectedDeliveryDate());
        verify(materialOrderRepository, never()).findById(888L);
    }

    // ==========================================
    // 5. STANDARD MATERIAL ORDER DELIVERY DATE & VISIBILITY TESTS
    // ==========================================

    @Test
    @DisplayName("Assigned seller can update expected delivery date on standard MaterialOrder")
    public void testAssignedSellerCanUpdateMaterialOrderDeliveryDate() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 601L);
        order.setOrderCode("ORD-601");
        order.setSeller(sellerUser);
        order.setBuyer(customerUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("Not Set");

        when(materialOrderRepository.findById(601L)).thenReturn(Optional.of(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = Map.of("expectedDeliveryDate", "28 Oct 2026");
        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(601L, body, authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("28 Oct 2026", order.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Unrelated seller is rejected with 403 when updating expected delivery on standard MaterialOrder")
    public void testUnrelatedSellerCannotUpdateMaterialOrderDeliveryDate() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 602L);
        order.setOrderCode("ORD-602");
        order.setSeller(sellerUser);
        order.setBuyer(customerUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("Not Set");

        when(materialOrderRepository.findById(602L)).thenReturn(Optional.of(order));

        Map<String, Object> body = Map.of("expectedDeliveryDate", "28 Oct 2026");
        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(602L, body, authOtherSeller);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertEquals("Not Set", order.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Updating expected delivery on non-existent order returns 404")
    public void testUpdateExpectedDeliveryNonExistentOrderReturns404() {
        when(materialOrderRepository.findById(9999L)).thenReturn(Optional.empty());

        Map<String, Object> body = Map.of("expectedDeliveryDate", "28 Oct 2026");
        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(9999L, body, authSeller);
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
    }

    @Test
    @DisplayName("Empty expected delivery date returns 400 Bad Request")
    public void testEmptyExpectedDeliveryDateReturns400() {
        Map<String, Object> body = Map.of("expectedDeliveryDate", "   ");
        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(601L, body, authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("Saved expected delivery date is visible to customer via getAcceptedOrdersForCustomer")
    public void testSavedDeliveryDateVisibleToCustomer() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 701L);
        order.setOrderCode("ORD-701");
        order.setSeller(sellerUser);
        order.setBuyer(customerUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("02 Nov 2026");

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(customerUser.getId()))
                .thenReturn(List.of(order));

        List<Map<String, Object>> customerOrders = materialOrderService.getAcceptedOrdersForCustomer(customerUser);
        assertNotNull(customerOrders);
        assertEquals(1, customerOrders.size());
        assertEquals("02 Nov 2026", customerOrders.get(0).get("expectedDeliveryDate"));
    }

    // ==========================================
    // 6. STRICT EXPECTED DELIVERY DATE VALIDATION TESTS
    // ==========================================

    @Test
    @DisplayName("Impossible calendar dates (e.g. 31/02/2026, 29/02/2025, 31 Feb 2026) are rejected with 400 for MaterialOrder")
    public void testImpossibleDatesRejectedForMaterialOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 610L);
        order.setSeller(sellerUser);
        order.setExpectedDeliveryDate("Not Set");
        when(materialOrderRepository.findById(610L)).thenReturn(Optional.of(order));

        List<String> impossibleDates = List.of("31/02/2026", "29/02/2025", "31/04/2026", "31 Feb 2026");
        for (String d : impossibleDates) {
            ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(610L, Map.of("expectedDeliveryDate", d), authSeller);
            assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode(), "Expected 400 for impossible date: " + d);
            assertEquals("Not Set", order.getExpectedDeliveryDate());
        }
    }

    @Test
    @DisplayName("Impossible calendar dates (e.g. 31/02/2026, 29/02/2025, 31 Feb 2026) are rejected with 400 for DirectBuy")
    public void testImpossibleDatesRejectedForDirectBuy() {
        MaterialRequest mr = createDirectBuyRequest(1010L, "DMR-1010", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1010L)).thenReturn(Optional.of(mr));

        List<String> impossibleDates = List.of("31/02/2026", "29/02/2025", "31/04/2026", "31 Feb 2026");
        for (String d : impossibleDates) {
            ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(1010L, Map.of("expectedDeliveryDate", d), authSeller);
            assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode(), "Expected 400 for impossible date: " + d);
            assertEquals("18 Oct 2026", mr.getExpectedDeliveryDate());
        }
    }

    @Test
    @DisplayName("Malformed or arbitrary non-date strings (e.g. 2026-13-45, not-a-valid-date) are rejected with 400 for MaterialOrder")
    public void testMalformedStringsRejectedForMaterialOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 611L);
        order.setSeller(sellerUser);
        order.setExpectedDeliveryDate("Not Set");
        when(materialOrderRepository.findById(611L)).thenReturn(Optional.of(order));

        List<String> malformedStrings = List.of("not-a-valid-date", "2026-13-45", "99/99/9999", "tomorrow");
        for (String s : malformedStrings) {
            ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(611L, Map.of("expectedDeliveryDate", s), authSeller);
            assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode(), "Expected 400 for malformed string: " + s);
            assertEquals("Not Set", order.getExpectedDeliveryDate());
        }
    }

    @Test
    @DisplayName("Malformed or arbitrary non-date strings (e.g. 2026-13-45, not-a-valid-date) are rejected with 400 for DirectBuy")
    public void testMalformedStringsRejectedForDirectBuy() {
        MaterialRequest mr = createDirectBuyRequest(1011L, "DMR-1011", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1011L)).thenReturn(Optional.of(mr));

        List<String> malformedStrings = List.of("not-a-valid-date", "2026-13-45", "99/99/9999", "tomorrow");
        for (String s : malformedStrings) {
            ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(1011L, Map.of("expectedDeliveryDate", s), authSeller);
            assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode(), "Expected 400 for malformed string: " + s);
            assertEquals("18 Oct 2026", mr.getExpectedDeliveryDate());
        }
    }

    @Test
    @DisplayName("Past dates in Asia/Kolkata timezone are rejected with 400 for MaterialOrder")
    public void testPastDatesRejectedForMaterialOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 612L);
        order.setSeller(sellerUser);
        order.setExpectedDeliveryDate("Not Set");
        when(materialOrderRepository.findById(612L)).thenReturn(Optional.of(order));

        LocalDate yesterday = LocalDate.now(ZoneId.of("Asia/Kolkata")).minusDays(1);
        String textYesterday = yesterday.format(DateTimeFormatter.ofPattern("dd MMM uuuu", Locale.ENGLISH));

        ResponseEntity<?> resp1 = materialOrderController.updateExpectedDelivery(612L, Map.of("expectedDeliveryDate", textYesterday), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp1.getStatusCode());
        assertEquals("Not Set", order.getExpectedDeliveryDate());

        ResponseEntity<?> resp2 = materialOrderController.updateExpectedDelivery(612L, Map.of("expectedDeliveryDate", "10/10/2020"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp2.getStatusCode());
        assertEquals("Not Set", order.getExpectedDeliveryDate());

        ResponseEntity<?> resp3 = materialOrderController.updateExpectedDelivery(612L, Map.of("expectedDeliveryDate", "10 Oct 2020"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp3.getStatusCode());
        assertEquals("Not Set", order.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Past dates in Asia/Kolkata timezone are rejected with 400 for DirectBuy")
    public void testPastDatesRejectedForDirectBuy() {
        MaterialRequest mr = createDirectBuyRequest(1012L, "DMR-1012", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1012L)).thenReturn(Optional.of(mr));

        LocalDate yesterday = LocalDate.now(ZoneId.of("Asia/Kolkata")).minusDays(1);
        String textYesterday = yesterday.format(DateTimeFormatter.ofPattern("dd MMM uuuu", Locale.ENGLISH));

        ResponseEntity<?> resp1 = directBuyController.updateExpectedDelivery(1012L, Map.of("expectedDeliveryDate", textYesterday), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp1.getStatusCode());
        assertEquals("18 Oct 2026", mr.getExpectedDeliveryDate());

        ResponseEntity<?> resp2 = directBuyController.updateExpectedDelivery(1012L, Map.of("expectedDeliveryDate", "10/10/2020"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp2.getStatusCode());
        assertEquals("18 Oct 2026", mr.getExpectedDeliveryDate());

        ResponseEntity<?> resp3 = directBuyController.updateExpectedDelivery(1012L, Map.of("expectedDeliveryDate", "10 Oct 2020"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp3.getStatusCode());
        assertEquals("18 Oct 2026", mr.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Valid current business date (today in Asia/Kolkata) is accepted for MaterialOrder")
    public void testTodayDateAcceptedForMaterialOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 613L);
        order.setSeller(sellerUser);
        order.setExpectedDeliveryDate("Not Set");
        when(materialOrderRepository.findById(613L)).thenReturn(Optional.of(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        String textToday = today.format(DateTimeFormatter.ofPattern("dd MMM uuuu", Locale.ENGLISH));

        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(613L, Map.of("expectedDeliveryDate", textToday), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals(textToday, order.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Valid current business date (today in Asia/Kolkata) is accepted for DirectBuy")
    public void testTodayDateAcceptedForDirectBuy() {
        MaterialRequest mr = createDirectBuyRequest(1013L, "DMR-1013", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1013L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        String textToday = today.format(DateTimeFormatter.ofPattern("dd MMM uuuu", Locale.ENGLISH));

        ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(1013L, Map.of("expectedDeliveryDate", textToday), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals(textToday, mr.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Slash date format DD/MM/YYYY is accepted and normalized to canonical format for MaterialOrder")
    public void testSlashDateFormatAcceptedForMaterialOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 614L);
        order.setSeller(sellerUser);
        order.setExpectedDeliveryDate("Not Set");
        when(materialOrderRepository.findById(614L)).thenReturn(Optional.of(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(614L, Map.of("expectedDeliveryDate", "28/10/2026"), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("28 Oct 2026", order.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Slash date format DD/MM/YYYY is accepted and normalized to canonical format for DirectBuy")
    public void testSlashDateFormatAcceptedForDirectBuy() {
        MaterialRequest mr = createDirectBuyRequest(1014L, "DMR-1014", customerUser, "CUSTOMER", "ACCEPTED");
        when(materialRequestRepository.findByIdForUpdate(1014L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(1014L, Map.of("expectedDeliveryDate", "25/10/2026"), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("25 Oct 2026", mr.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Empty or whitespace expected delivery date returns 400 for DirectBuy")
    public void testEmptyDateReturns400ForDirectBuy() {
        ResponseEntity<?> resp1 = directBuyController.updateExpectedDelivery(1004L, Map.of("expectedDeliveryDate", ""), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp1.getStatusCode());

        ResponseEntity<?> resp2 = directBuyController.updateExpectedDelivery(1004L, Map.of("expectedDeliveryDate", "   "), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, resp2.getStatusCode());
    }

    @Test
    @DisplayName("Non-existent DirectBuy request returns 404 Not Found")
    public void testNonExistentDirectBuyReturns404() {
        when(materialRequestRepository.findByIdForUpdate(99999L)).thenReturn(Optional.empty());
        when(materialRequestRepository.findById(99999L)).thenReturn(Optional.empty());

        ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(99999L, Map.of("expectedDeliveryDate", "28 Oct 2026"), authSeller);
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
    }

    @Test
    @DisplayName("Saved expected delivery dates retain calendar day when returned to frontend in response maps")
    public void testSavedDatesRetainCalendarDayAcrossResponseMap() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 615L);
        order.setOrderCode("ORD-615");
        order.setSeller(sellerUser);
        order.setBuyer(customerUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("Not Set");
        when(materialOrderRepository.findById(615L)).thenReturn(Optional.of(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(615L, Map.of("expectedDeliveryDate", "28/10/2026"), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) resp.getBody();
        assertNotNull(map);
        String returnedDate = (String) map.get("expectedDeliveryDate");
        assertEquals("28 Oct 2026", returnedDate);

        // Verify day 28 is retained without shifting
        LocalDate parsed = DeliveryDateValidator.validateAndParse(returnedDate);
        assertEquals(28, parsed.getDayOfMonth());
        assertEquals(10, parsed.getMonthValue());
        assertEquals(2026, parsed.getYear());
        assertEquals("28/10/2026", DeliveryDateValidator.toDisplayFormat(parsed));
    }

    @Test
    @DisplayName("MaterialOrder date update propagates to linked MaterialRequest and returns authoritative date")
    public void testMaterialOrderDateUpdatePropagatesToLinkedMaterialRequest() {
        MaterialRequest mr = createDirectBuyRequest(2001L, "DMR-2001", customerUser, "CUSTOMER", "ACCEPTED");
        mr.setExpectedDeliveryDate("Not Set");

        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 701L);
        order.setOrderCode("ORD-701");
        order.setSeller(sellerUser);
        order.setBuyer(customerUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("Not Set");
        order.setMaterialRequest(mr);

        when(materialOrderRepository.findById(701L)).thenReturn(Optional.of(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = materialOrderController.updateExpectedDelivery(701L, Map.of("expectedDeliveryDate", "28/10/2026"), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("28 Oct 2026", order.getExpectedDeliveryDate());
        assertEquals("28 Oct 2026", mr.getExpectedDeliveryDate());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertEquals("28 Oct 2026", body.get("expectedDeliveryDate"));
    }

    @Test
    @DisplayName("Direct Buy date update propagates to linked MaterialOrder and returns authoritative date")
    public void testDirectBuyDateUpdatePropagatesToLinkedMaterialOrder() {
        MaterialRequest mr = createDirectBuyRequest(2002L, "DMR-2002", customerUser, "CUSTOMER", "ACCEPTED");
        mr.setExpectedDeliveryDate("Not Set");

        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 702L);
        order.setOrderCode("ORD-702");
        order.setSeller(sellerUser);
        order.setBuyer(customerUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("Not Set");
        order.setMaterialRequest(mr);

        when(materialRequestRepository.findByIdForUpdate(2002L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(2002L)).thenReturn(Collections.singletonList(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(2002L, Map.of("expectedDeliveryDate", "28/10/2026"), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("28 Oct 2026", mr.getExpectedDeliveryDate());
        assertEquals("28 Oct 2026", order.getExpectedDeliveryDate());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertEquals("28 Oct 2026", body.get("expectedDeliveryDate"));
    }

    @Test
    @DisplayName("Direct Buy date update succeeds when invoked with linked MaterialOrder ID")
    public void testDirectBuyDateUpdateWithMaterialOrderId() {
        MaterialRequest mr = createDirectBuyRequest(2003L, "DMR-2003", customerUser, "CUSTOMER", "ACCEPTED");
        mr.setExpectedDeliveryDate("Not Set");

        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 703L);
        order.setOrderCode("ORD-703");
        order.setSeller(sellerUser);
        order.setBuyer(customerUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("Not Set");
        order.setMaterialRequest(mr);

        when(materialRequestRepository.findByIdForUpdate(703L)).thenReturn(Optional.empty());
        when(materialOrderRepository.findById(703L)).thenReturn(Optional.of(order));
        when(materialRequestRepository.findByIdForUpdate(2003L)).thenReturn(Optional.of(mr));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(2003L)).thenReturn(Collections.singletonList(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = directBuyController.updateExpectedDelivery(703L, Map.of("expectedDeliveryDate", "28/10/2026"), authSeller);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("28 Oct 2026", mr.getExpectedDeliveryDate());
        assertEquals("28 Oct 2026", order.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Customer views receive authoritative expected delivery date for both order sources")
    public void testCustomerViewsSeeSavedExpectedDeliveryDate() {
        // Direct buy order
        MaterialRequest directMr = createDirectBuyRequest(2004L, "DMR-2004", customerUser, "CUSTOMER", "ACCEPTED");
        directMr.setExpectedDeliveryDate("28 Oct 2026");

        MaterialOrder directOrder = new MaterialOrder();
        ReflectionTestUtils.setField(directOrder, "id", 704L);
        directOrder.setOrderCode("ORD-704");
        directOrder.setSeller(sellerUser);
        directOrder.setBuyer(customerUser);
        directOrder.setOrderStatus("ORDER_ACCEPTED");
        directOrder.setExpectedDeliveryDate("28 Oct 2026");
        directOrder.setMaterialRequest(directMr);

        // Standard quotation order
        MaterialOrder quoteOrder = new MaterialOrder();
        ReflectionTestUtils.setField(quoteOrder, "id", 705L);
        quoteOrder.setOrderCode("ORD-705");
        quoteOrder.setSeller(sellerUser);
        quoteOrder.setBuyer(customerUser);
        quoteOrder.setOrderStatus("ORDER_ACCEPTED");
        quoteOrder.setExpectedDeliveryDate("29 Oct 2026");

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(customerUser.getId()))
                .thenReturn(Arrays.asList(directOrder, quoteOrder));
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customerUser))
                .thenReturn(Collections.emptyList());

        List<Map<String, Object>> customerOrders = materialOrderService.getAcceptedOrdersForCustomer(customerUser);
        assertEquals(2, customerOrders.size());
        assertEquals("28 Oct 2026", customerOrders.get(0).get("expectedDeliveryDate"));
        assertEquals("29 Oct 2026", customerOrders.get(1).get("expectedDeliveryDate"));
    }

    @Test
    @DisplayName("Contractor and professional requesters see saved expected delivery date via MaterialRequestController")
    public void testContractorAndProfessionalRequestersSeeSavedDate() {
        MaterialRequest req = new MaterialRequest();
        ReflectionTestUtils.setField(req, "id", 2005L);
        req.setRequestId("REQ-2005");
        req.setBuyer(contractorUser);
        req.setBuyerRole("CONTRACTOR");
        req.setStatus("ORDER_PLACED");
        req.setExpectedDeliveryDate("Not Set"); // Unset on request entity

        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 706L);
        order.setOrderCode("ORD-706");
        order.setSeller(sellerUser);
        order.setBuyer(contractorUser);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setExpectedDeliveryDate("28 Oct 2026"); // Persisted on order entity
        order.setMaterialRequest(req);

        Authentication authContractor = mock(Authentication.class);
        when(authContractor.getName()).thenReturn("contractor@buildbid.com");
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractorUser));
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(contractorUser))
                .thenReturn(Collections.singletonList(req));
        when(materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(2005L))
                .thenReturn(Collections.singletonList(order));

        ResponseEntity<?> resp = materialRequestController.getMyMaterialRequests(authContractor);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> list = (List<Map<String, Object>>) resp.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());
        // Falls back to linked MaterialOrder date
        assertEquals("28 Oct 2026", list.get(0).get("expectedDeliveryDate"));
    }

    @Test
    @DisplayName("Past date and invalid date submissions are rejected strictly")
    public void testPastAndInvalidDateRejectedStrictly() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 707L);
        order.setSeller(sellerUser);
        order.setExpectedDeliveryDate("Not Set");
        when(materialOrderRepository.findById(707L)).thenReturn(Optional.of(order));

        // Past date
        ResponseEntity<?> pastResp = materialOrderController.updateExpectedDelivery(707L, Map.of("expectedDeliveryDate", "01/01/2020"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, pastResp.getStatusCode());
        assertEquals("Not Set", order.getExpectedDeliveryDate());

        // Malformed date
        ResponseEntity<?> malformedResp = materialOrderController.updateExpectedDelivery(707L, Map.of("expectedDeliveryDate", "31/02/2026"), authSeller);
        assertEquals(HttpStatus.BAD_REQUEST, malformedResp.getStatusCode());
        assertEquals("Not Set", order.getExpectedDeliveryDate());
    }

    @Test
    @DisplayName("Reloading unified seller orders reconstructs the updated date without missing warning")
    public void testReloadUnifiedOrdersForSellerReconstructsUpdatedDate() {
        MaterialRequest directMr = createDirectBuyRequest(2006L, "DMR-2006", customerUser, "CUSTOMER", "ACCEPTED");
        directMr.setExpectedDeliveryDate("28 Oct 2026");

        MaterialOrder directOrder = new MaterialOrder();
        ReflectionTestUtils.setField(directOrder, "id", 708L);
        directOrder.setOrderCode("ORD-708");
        directOrder.setSeller(sellerUser);
        directOrder.setBuyer(customerUser);
        directOrder.setOrderStatus("ORDER_ACCEPTED");
        directOrder.setExpectedDeliveryDate("28 Oct 2026");
        directOrder.setMaterialRequest(directMr);

        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(sellerUser.getId()))
                .thenReturn(Collections.singletonList(directOrder));
        when(materialRequestRepository.findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(sellerUser, "DIRECT_MATERIAL"))
                .thenReturn(Collections.emptyList());

        List<Map<String, Object>> sellerOrders = materialOrderService.getUnifiedOrdersForSeller(sellerUser);
        assertEquals(1, sellerOrders.size());
        Map<String, Object> orderCard = sellerOrders.get(0);
        assertEquals("28 Oct 2026", orderCard.get("expectedDeliveryDate"));
        assertNotEquals("Not Set", orderCard.get("expectedDeliveryDate"));
    }
}
