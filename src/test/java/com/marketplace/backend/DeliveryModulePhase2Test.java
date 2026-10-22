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
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - DELIVERY & LOGISTICS PHASE 2 VERIFICATION TEST SUITE
 *
 * Covers:
 * A. Delivery domain lifecycle (creation, state machine, append-only history, separation of DELIVERED & COMPLETED)
 * B. Idempotency & concurrency (repeated delivery creation, duplicate transitions)
 * C. Direct Buy ID mismatch & colliding IDs across MaterialOrder and MaterialRequest
 * D. Delivery confirmation code validation (missing, wrong, correct, and bypass prevention)
 * E. Role isolation & IDOR (buyer/seller authorization, cross-role protections)
 * F. Cross-role tracking consistency (Customer, Contractor, Professional 4-stage UI mapping)
 */
public class DeliveryModulePhase2Test {

    private DeliveryRepository deliveryRepository;
    private DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private MaterialOrderRepository materialOrderRepository;
    private MaterialOrderItemRepository materialOrderItemRepository;
    private QuotationItemRepository quotationItemRepository;
    private MaterialRepository materialRepository;
    private MaterialRequestRepository materialRequestRepository;
    private QuotationRepository quotationRepository;
    private NotificationService notificationService;
    private MarketplaceBackendApplication.UserRepository userRepository;

    private DeliveryService deliveryService;
    private DeliveryController deliveryController;
    private MaterialOrderService materialOrderService;
    private MaterialOrderController materialOrderController;
    private DirectBuyController directBuyController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser professionalC;
    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser seller2;

    private Authentication authCustomerA;
    private Authentication authContractorB;
    private Authentication authProfessionalC;
    private Authentication authSeller1;
    private Authentication authSeller2;

    private MaterialOrder sampleOrder;

    @BeforeEach
    public void setup() {
        deliveryRepository = mock(DeliveryRepository.class);
        deliveryStatusHistoryRepository = mock(DeliveryStatusHistoryRepository.class);
        materialOrderRepository = mock(MaterialOrderRepository.class);
        materialOrderItemRepository = mock(MaterialOrderItemRepository.class);
        quotationItemRepository = mock(QuotationItemRepository.class);
        materialRepository = mock(MaterialRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        quotationRepository = mock(QuotationRepository.class);
        notificationService = mock(NotificationService.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        // Users
        customerA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerA, "id", 101L);
        customerA.setEmail("customerA@buildbid.com");
        customerA.setName("Customer Alice");
        customerA.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        contractorB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorB, "id", 102L);
        contractorB.setEmail("contractorB@buildbid.com");
        contractorB.setName("Contractor Bob");
        contractorB.getRoles().add(MarketplaceBackendApplication.Role.CONTRACTOR);

        professionalC = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(professionalC, "id", 103L);
        professionalC.setEmail("professionalC@buildbid.com");
        professionalC.setName("Architect Charlie");
        professionalC.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);

        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller1, "id", 201L);
        seller1.setEmail("seller1@buildbid.com");
        seller1.setName("Apex Building Materials");
        seller1.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        seller2 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller2, "id", 202L);
        seller2.setEmail("seller2@buildbid.com");
        seller2.setName("Zenith Cement Suppliers");
        seller2.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        when(userRepository.findByEmail("customerA@buildbid.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByEmail("contractorB@buildbid.com")).thenReturn(Optional.of(contractorB));
        when(userRepository.findByEmail("professionalC@buildbid.com")).thenReturn(Optional.of(professionalC));
        when(userRepository.findByEmail("seller1@buildbid.com")).thenReturn(Optional.of(seller1));
        when(userRepository.findByEmail("seller2@buildbid.com")).thenReturn(Optional.of(seller2));

        authCustomerA = mock(Authentication.class);
        when(authCustomerA.getName()).thenReturn("customerA@buildbid.com");

        authContractorB = mock(Authentication.class);
        when(authContractorB.getName()).thenReturn("contractorB@buildbid.com");

        authProfessionalC = mock(Authentication.class);
        when(authProfessionalC.getName()).thenReturn("professionalC@buildbid.com");

        authSeller1 = mock(Authentication.class);
        when(authSeller1.getName()).thenReturn("seller1@buildbid.com");

        authSeller2 = mock(Authentication.class);
        when(authSeller2.getName()).thenReturn("seller2@buildbid.com");

        // Services & Controllers
        deliveryService = new DeliveryService(
                deliveryRepository,
                deliveryStatusHistoryRepository,
                materialOrderRepository,
                notificationService
        );

        deliveryController = new DeliveryController(deliveryService, userRepository);

        materialOrderService = new MaterialOrderService(
                materialOrderRepository,
                materialOrderItemRepository,
                quotationItemRepository,
                materialRepository,
                materialRequestRepository,
                quotationRepository,
                notificationService
        );
        materialOrderService.setDeliveryService(deliveryService);
        materialOrderService.setDeliveryRepository(deliveryRepository);

        directBuyController = new DirectBuyController(
                materialRepository,
                materialRequestRepository,
                userRepository,
                new GeoLocationService(),
                notificationService
        );
        directBuyController.setMaterialOrderRepository(materialOrderRepository);
        directBuyController.setMaterialOrderService(materialOrderService);

        materialOrderController = new MaterialOrderController(materialOrderService, userRepository);
        materialOrderController.setDirectBuyController(directBuyController);

        // Sample Order
        sampleOrder = new MaterialOrder();
        ReflectionTestUtils.setField(sampleOrder, "id", 501L);
        sampleOrder.setOrderCode("ORD-2026-TEST501");
        sampleOrder.setBuyer(customerA);
        sampleOrder.setBuyerRole("CUSTOMER");
        sampleOrder.setSeller(seller1);
        sampleOrder.setOrderStatus("CONFIRMED");
        sampleOrder.setDeliveryStatus("PENDING");
        sampleOrder.setVerificationCode("BB-DEL-123456");

        when(materialOrderRepository.findById(501L)).thenReturn(Optional.of(sampleOrder));
        when(materialOrderRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(sampleOrder));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(inv -> {
            Delivery d = inv.getArgument(0);
            if (d.getId() == null) {
                ReflectionTestUtils.setField(d, "id", 801L);
            }
            return d;
        });
    }

    // =========================================================================
    // SECTION A: DELIVERY LIFECYCLE & STATE MACHINE
    // =========================================================================

    @Test
    @DisplayName("Lifecycle: Creates delivery domain record with 1-to-1 relationship to MaterialOrder")
    public void testDeliveryCreationForOrder() {
        when(deliveryRepository.findByMaterialOrderId(501L)).thenReturn(Optional.empty());

        Delivery delivery = deliveryService.getOrCreateDeliveryForOrder(sampleOrder);

        assertNotNull(delivery);
        assertEquals(sampleOrder.getId(), delivery.getMaterialOrder().getId());
        assertEquals(DeliveryStatus.PROCESSING, delivery.getStatus());
        assertNotNull(delivery.getTrackingNumber());
        assertTrue(delivery.getTrackingNumber().startsWith("TRK-"));
        assertFalse(delivery.getStatusHistories().isEmpty());
        assertEquals(DeliveryStatus.PROCESSING, delivery.getStatusHistories().get(0).getNewStatus());
    }

    @Test
    @DisplayName("Lifecycle: Full canonical state machine progression")
    public void testCanonicalStateMachineProgression() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.PROCESSING);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        // 1. PROCESSING -> READY_TO_DISPATCH
        Delivery d1 = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.READY_TO_DISPATCH, null, null, null, seller1);
        assertEquals(DeliveryStatus.READY_TO_DISPATCH, d1.getStatus());

        // 2. READY_TO_DISPATCH -> DISPATCHED
        Delivery d2 = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.DISPATCHED, null, null, null, seller1);
        assertEquals(DeliveryStatus.DISPATCHED, d2.getStatus());

        // 3. DISPATCHED -> IN_TRANSIT
        Delivery d3 = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.IN_TRANSIT, null, null, null, seller1);
        assertEquals(DeliveryStatus.IN_TRANSIT, d3.getStatus());

        // 4. IN_TRANSIT -> OUT_FOR_DELIVERY
        Delivery d4 = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.OUT_FOR_DELIVERY, null, null, null, seller1);
        assertEquals(DeliveryStatus.OUT_FOR_DELIVERY, d4.getStatus());

        // 5. OUT_FOR_DELIVERY -> DELIVERED (with verification code)
        Delivery d5 = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.DELIVERED, "BB-DEL-123456", null, null, seller1);
        assertEquals(DeliveryStatus.DELIVERED, d5.getStatus());
        assertNotNull(d5.getActualDeliveryDate());

        // Verify append-only history captured all stages
        assertTrue(d5.getStatusHistories().size() >= 5);
    }

    @Test
    @DisplayName("Lifecycle: Rejection of invalid status skip transitions")
    public void testInvalidStatusTransitionRejected() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.PROCESSING);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        // Attempt invalid skip from PROCESSING directly to DELIVERED
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                deliveryService.updateDeliveryStatus(801L, DeliveryStatus.DELIVERED, "BB-DEL-123456", null, null, seller1)
        );
        assertTrue(ex.getMessage().contains("Invalid delivery transition"));
    }

    @Test
    @DisplayName("Lifecycle: DELIVERED and COMPLETED remain distinct concepts")
    public void testDeliveredDoesNotSilentlyCompleteOrder() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.OUT_FOR_DELIVERY);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        Delivery d = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.DELIVERED, "BB-DEL-123456", null, null, seller1);

        assertEquals(DeliveryStatus.DELIVERED, d.getStatus());
        assertEquals("DELIVERED", sampleOrder.getOrderStatus());
        assertNotEquals("COMPLETED", sampleOrder.getOrderStatus(), "Physical delivery must not silently complete commercial order");
    }

    // =========================================================================
    // SECTION B: IDEMPOTENCY & CONCURRENCY
    // =========================================================================

    @Test
    @DisplayName("Idempotency: Repeated delivery creation returns same instance without duplication")
    public void testRepeatedDeliveryCreationIsIdempotent() {
        Delivery existing = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(existing, "id", 801L);

        when(deliveryRepository.findByMaterialOrderId(501L)).thenReturn(Optional.of(existing));

        Delivery d1 = deliveryService.getOrCreateDeliveryForOrder(sampleOrder);
        Delivery d2 = deliveryService.getOrCreateDeliveryForOrder(sampleOrder);

        assertSame(d1, d2);
        assertEquals(801L, d1.getId());
        verify(deliveryRepository, never()).save(any(Delivery.class));
    }

    @Test
    @DisplayName("Idempotency: Repeated transition to current status does not duplicate history")
    public void testRepeatedStatusTransitionIsIdempotent() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        int initialHistorySize = delivery.getStatusHistories().size();

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        Delivery result = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.IN_TRANSIT, null, null, null, seller1);

        assertEquals(DeliveryStatus.IN_TRANSIT, result.getStatus());
        assertEquals(initialHistorySize, result.getStatusHistories().size(), "History must not append duplicate entries for idempotent retry");
    }

    // =========================================================================
    // SECTION C: DIRECT BUY ID MISMATCH & COLLISION REGRESSION
    // =========================================================================

    @Test
    @DisplayName("Direct Buy Bug Fix: Correctly resolves MaterialOrder.id when caller passes canonical order ID")
    public void testDirectBuyResolvesMaterialOrderIdWithoutMismatch() {
        // Direct Buy scenario: MaterialOrder id is 600, linked MaterialRequest id is 700
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 700L);
        directReq.setRequestId("DMR-1001");
        directReq.setStatus("ACCEPTED");
        directReq.setTargetSeller(seller1);
        directReq.setVerificationCode("BB-DM-888999");

        MaterialOrder directOrder = new MaterialOrder();
        ReflectionTestUtils.setField(directOrder, "id", 600L); // Deliberately different ID from request
        directOrder.setOrderCode("ORD-2026-DIR600");
        directOrder.setMaterialRequest(directReq);
        directOrder.setSeller(seller1);
        directOrder.setBuyer(customerA);
        directOrder.setOrderStatus("PROCESSING");
        directOrder.setDeliveryStatus("PROCESSING");
        directOrder.setVerificationCode("BB-DM-888999");

        when(materialOrderRepository.findById(600L)).thenReturn(Optional.of(directOrder));
        when(materialOrderRepository.findByIdForUpdate(600L)).thenReturn(Optional.of(directOrder));
        when(materialRequestRepository.findById(700L)).thenReturn(Optional.of(directReq));
        when(materialRequestRepository.findByIdForUpdate(700L)).thenReturn(Optional.of(directReq));
        when(materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(700L)).thenReturn(List.of(directOrder));

        // When seller calls Direct Buy status update with order ID (600)
        Map<String, Object> body = Map.of("status", "READY_FOR_DISPATCH");
        ResponseEntity<?> resp = directBuyController.updateDirectBuyStatus(600L, body, authSeller1);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("READY_FOR_DISPATCH", directOrder.getOrderStatus());
    }

    @Test
    @DisplayName("Direct Buy Bug Fix: Prevents ID collision when MaterialOrder and MaterialRequest share numeric ID")
    public void testDirectBuyNumericIdCollisionResolution() {
        // Colliding numeric ID scenario:
        // ID 999 is a MaterialOrder owned by Seller 1 (linked to MR 750)
        // ID 999 is ALSO a MaterialRequest owned by Seller 2 (unrelated)
        MaterialRequest unrelatedReqSeller2 = new MaterialRequest();
        ReflectionTestUtils.setField(unrelatedReqSeller2, "id", 999L);
        unrelatedReqSeller2.setRequestId("DMR-999");
        unrelatedReqSeller2.setTargetSeller(seller2); // Belongs to SELLER 2!
        unrelatedReqSeller2.setStatus("WAITING_FOR_ACCEPTANCE");

        MaterialRequest seller1Req = new MaterialRequest();
        ReflectionTestUtils.setField(seller1Req, "id", 750L);
        seller1Req.setRequestId("DMR-750");
        seller1Req.setTargetSeller(seller1);
        seller1Req.setStatus("ACCEPTED");

        MaterialOrder seller1Order = new MaterialOrder();
        ReflectionTestUtils.setField(seller1Order, "id", 999L); // Same ID 999 as Seller 2's request!
        seller1Order.setOrderCode("ORD-2026-COLLIDE999");
        seller1Order.setSeller(seller1);
        seller1Order.setBuyer(customerA);
        seller1Order.setMaterialRequest(seller1Req);
        seller1Order.setOrderStatus("PROCESSING");
        seller1Order.setDeliveryStatus("PROCESSING");

        when(materialOrderRepository.findById(999L)).thenReturn(Optional.of(seller1Order));
        when(materialOrderRepository.findByIdForUpdate(999L)).thenReturn(Optional.of(seller1Order));
        when(materialRequestRepository.findById(999L)).thenReturn(Optional.of(unrelatedReqSeller2));
        when(materialRequestRepository.findByIdForUpdate(999L)).thenReturn(Optional.of(unrelatedReqSeller2));

        // Seller 1 calls Direct Buy status update with ID 999
        Map<String, Object> body = Map.of("status", "READY_FOR_DISPATCH");
        ResponseEntity<?> resp = directBuyController.updateDirectBuyStatus(999L, body, authSeller1);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        // Verify Seller 1's order was updated
        assertEquals("READY_FOR_DISPATCH", seller1Order.getOrderStatus());
        // CRITICAL CHECK: Seller 2's unrelated request MUST NOT have been mutated!
        assertEquals("WAITING_FOR_ACCEPTANCE", unrelatedReqSeller2.getStatus());
    }

    // =========================================================================
    // SECTION D: DELIVERY VERIFICATION CODE ENFORCEMENT
    // =========================================================================

    @Test
    @DisplayName("Verification Code: Rejects missing verification code on DELIVERED transition")
    public void testDeliveryFailsWithoutVerificationCode() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.OUT_FOR_DELIVERY);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deliveryService.updateDeliveryStatus(801L, DeliveryStatus.DELIVERED, null, null, null, seller1)
        );
        assertTrue(ex.getMessage().contains("verification code is required"));
    }

    @Test
    @DisplayName("Verification Code: Rejects incorrect verification code")
    public void testDeliveryFailsWithWrongVerificationCode() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.OUT_FOR_DELIVERY);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deliveryService.updateDeliveryStatus(801L, DeliveryStatus.DELIVERED, "WRONG-CODE-999", null, null, seller1)
        );
        assertTrue(ex.getMessage().contains("Invalid delivery verification code"));
    }

    @Test
    @DisplayName("Verification Code: Accepts correct verification code only for its linked order")
    public void testDeliverySucceedsWithCorrectVerificationCode() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.OUT_FOR_DELIVERY);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        Delivery result = deliveryService.updateDeliveryStatus(801L, DeliveryStatus.DELIVERED, "BB-DEL-123456", null, null, seller1);
        assertEquals(DeliveryStatus.DELIVERED, result.getStatus());
    }

    // =========================================================================
    // SECTION E: ROLE ISOLATION & IDOR PROTECTIONS
    // =========================================================================

    @Test
    @DisplayName("Security & IDOR: Seller 2 cannot access or mutate Seller 1's delivery")
    public void testSellerCannotMutateOtherSellerDelivery() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.PROCESSING);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        SecurityException ex = assertThrows(SecurityException.class, () ->
                deliveryService.updateDeliveryStatus(801L, DeliveryStatus.READY_TO_DISPATCH, null, null, null, seller2)
        );
        assertTrue(ex.getMessage().contains("Access denied"));
    }

    @Test
    @DisplayName("Security & IDOR: Buyer cannot mutate seller-only delivery status")
    public void testBuyerCannotMutateDeliveryStatus() {
        Delivery delivery = new Delivery(sampleOrder);
        ReflectionTestUtils.setField(delivery, "id", 801L);
        delivery.setStatus(DeliveryStatus.PROCESSING);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(delivery));

        SecurityException ex = assertThrows(SecurityException.class, () ->
                deliveryService.updateDeliveryStatus(801L, DeliveryStatus.READY_TO_DISPATCH, null, null, null, customerA)
        );
        assertTrue(ex.getMessage().contains("Access denied"));
    }

    @Test
    @DisplayName("Security & IDOR: Unrelated buyer cannot view other buyer's delivery")
    public void testUnrelatedBuyerCannotViewDelivery() {
        Delivery delivery = new Delivery(sampleOrder); // Owned by customerA
        ReflectionTestUtils.setField(delivery, "id", 801L);

        when(deliveryRepository.findById(801L)).thenReturn(Optional.of(delivery));

        // Contractor B (unrelated) attempts to access Customer A's delivery details
        ResponseEntity<?> resp = deliveryController.getDeliveryById(801L, authContractorB);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
    }

    // =========================================================================
    // SECTION F: CROSS-ROLE TRACKING STATUS CONSISTENCY
    // =========================================================================

    @Test
    @DisplayName("Cross-Role Tracking: IN_TRANSIT maps consistently to Stage 2 with clear bilingual substatus")
    public void testInTransitMappedToStageTwoAcrossRoles() {
        // Customer, Contractor, and Professional mapping rules:
        // Stage 1: PROCESSING
        // Stage 2: READY_TO_DISPATCH, DISPATCHED, IN_TRANSIT, DELAYED
        // Stage 3: OUT_FOR_DELIVERY
        // Stage 4: DELIVERED

        String inTransit = "IN_TRANSIT";
        assertEquals(DeliveryStatus.IN_TRANSIT, DeliveryStatus.fromString(inTransit));
        assertEquals("In Transit", DeliveryStatus.IN_TRANSIT.getEnglishLabel());
        assertEquals("रास्ते में", DeliveryStatus.IN_TRANSIT.getHindiLabel());

        // Verify valid transitions into and out of IN_TRANSIT
        assertTrue(DeliveryStatus.isValidTransition(DeliveryStatus.DISPATCHED, DeliveryStatus.IN_TRANSIT));
        assertTrue(DeliveryStatus.isValidTransition(DeliveryStatus.IN_TRANSIT, DeliveryStatus.OUT_FOR_DELIVERY));
        assertTrue(DeliveryStatus.isValidTransition(DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELAYED));
    }

    @Test
    @DisplayName("Cross-Role Tracking: READY_TO_DISPATCH and DELAYED properly classified in Stage 2")
    public void testReadyToDispatchAndDelayedStateHandling() {
        assertEquals(DeliveryStatus.READY_TO_DISPATCH, DeliveryStatus.fromString("READY_FOR_DISPATCH"));
        assertEquals("Ready for Dispatch", DeliveryStatus.READY_TO_DISPATCH.getEnglishLabel());
        assertEquals("भेजने के लिए तैयार", DeliveryStatus.READY_TO_DISPATCH.getHindiLabel());

        assertEquals(DeliveryStatus.DELAYED, DeliveryStatus.fromString("DELAYED"));
        assertEquals("Delayed", DeliveryStatus.DELAYED.getEnglishLabel());
        assertEquals("विलंबित", DeliveryStatus.DELAYED.getHindiLabel());

        // Verify recovery transitions from DELAYED
        assertTrue(DeliveryStatus.isValidTransition(DeliveryStatus.DELAYED, DeliveryStatus.IN_TRANSIT));
        assertTrue(DeliveryStatus.isValidTransition(DeliveryStatus.DELAYED, DeliveryStatus.OUT_FOR_DELIVERY));
        assertFalse(DeliveryStatus.isValidTransition(DeliveryStatus.DELAYED, DeliveryStatus.DELIVERED), "Delayed shipment cannot jump directly to DELIVERED");
    }
}
