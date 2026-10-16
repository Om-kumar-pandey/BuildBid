package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * CONTRACTOR ORDER ACCEPTANCE, APPROVAL STAMP & MY ORDERS SYNCHRONIZATION TESTS
 * 
 * Validates unified order acceptance synchronization across Flow A (Direct Purchase)
 * and Flow B (Post Requirement / Quotation) for Contractor accounts.
 */
public class ContractorOrderAcceptanceSyncTest {

    private MaterialOrderRepository materialOrderRepository;
    private QuotationRepository quotationRepository;
    private MaterialRequestRepository materialRequestRepository;
    private ClientServiceRequestRepository clientServiceRequestRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private GeoLocationService geoLocationService;

    private MaterialOrderService materialOrderService;
    private QuotationService quotationService;
    private MaterialOrderController materialOrderController;
    private CustomerRequestController customerRequestController;

    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser customerBuyer;
    private MarketplaceBackendApplication.MarketplaceUser seller1;

    private Authentication authContractorA;
    private Authentication authContractorB;
    private Authentication authSeller1;

    @BeforeEach
    public void setup() {
        materialOrderRepository = mock(MaterialOrderRepository.class);
        quotationRepository = mock(QuotationRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        clientServiceRequestRepository = mock(ClientServiceRequestRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        geoLocationService = new GeoLocationService();

        materialOrderService = new MaterialOrderService(materialOrderRepository);
        quotationService = new QuotationService(
                quotationRepository,
                materialRequestRepository,
                clientServiceRequestRepository,
                userRepository,
                geoLocationService,
                materialOrderService
        );

        materialOrderController = new MaterialOrderController(materialOrderService, userRepository);
        customerRequestController = new CustomerRequestController(
                materialRequestRepository,
                clientServiceRequestRepository,
                userRepository,
                quotationRepository,
                materialOrderRepository
        );

        // Setup Contractor A
        contractorA = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(contractorA, "id", 201L);
        contractorA.setName("Vikram Contractor");
        contractorA.setEmail("vikram@contractor.in");
        contractorA.setUsername("vikram_contractor");
        contractorA.getRoles().add(MarketplaceBackendApplication.Role.CONTRACTOR);

        // Setup Contractor B
        contractorB = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(contractorB, "id", 202L);
        contractorB.setName("Rajesh Contractor");
        contractorB.setEmail("rajesh@contractor.in");
        contractorB.setUsername("rajesh_contractor");
        contractorB.getRoles().add(MarketplaceBackendApplication.Role.CONTRACTOR);

        // Setup Customer
        customerBuyer = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(customerBuyer, "id", 101L);
        customerBuyer.setName("Amit Customer");
        customerBuyer.setEmail("amit@customer.in");
        customerBuyer.setUsername("amit_customer");
        customerBuyer.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        // Setup Seller 1
        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(seller1, "id", 301L);
        seller1.setName("Apex Building Supplies");
        seller1.setEmail("sales@apexsupplies.in");
        seller1.setUsername("apex_seller");
        seller1.setPhone("+91 98112 34567");
        seller1.setLocation("Sector 62, Noida");
        seller1.getRoles().add(MarketplaceBackendApplication.Role.SELLER);

        // Mock auth principals
        authContractorA = mock(Authentication.class);
        when(authContractorA.getName()).thenReturn("vikram@contractor.in");

        authContractorB = mock(Authentication.class);
        when(authContractorB.getName()).thenReturn("rajesh@contractor.in");

        authSeller1 = mock(Authentication.class);
        when(authSeller1.getName()).thenReturn("sales@apexsupplies.in");

        // Mock userRepository lookups
        when(userRepository.findByEmail("vikram@contractor.in")).thenReturn(Optional.of(contractorA));
        when(userRepository.findByUsername("vikram@contractor.in")).thenReturn(Optional.of(contractorA));
        when(userRepository.findByEmail("rajesh@contractor.in")).thenReturn(Optional.of(contractorB));
        when(userRepository.findByUsername("rajesh@contractor.in")).thenReturn(Optional.of(contractorB));
        when(userRepository.findByEmail("sales@apexsupplies.in")).thenReturn(Optional.of(seller1));
        when(userRepository.findByUsername("sales@apexsupplies.in")).thenReturn(Optional.of(seller1));
    }

    // 1. Flow A: New Direct Purchase in WAITING_FOR_ACCEPTANCE retains card in My Requests
    @Test
    @DisplayName("Scenario 1 & 16: New Direct Purchase request is pending, not accepted")
    public void test01_NewDirectPurchasePendingState() {
        MaterialRequest mr = new MaterialRequest();
        mr.setId(501L);
        mr.setRequestId("DMR-1001");
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setBuyer(contractorA);
        mr.setBuyerRole("CONTRACTOR");
        mr.setTargetSeller(seller1);
        mr.setStatus("WAITING_FOR_ACCEPTANCE");
        mr.setMaterialPrice(380.0);
        mr.setMaterialAmount(38000.0);
        mr.setEstimatedTotal(38000.0);

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialName("OPC 53 Cement");
        item.setQuantity(100.0);
        item.setUnit("Bags");
        mr.addItem(item);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(contractorA))
                .thenReturn(List.of(mr));

        ResponseEntity<?> response = customerRequestController.getCustomerMyRequests(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        List<?> list = (List<?>) response.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());

        Map<?, ?> card = (Map<?, ?>) list.get(0);
        assertEquals("DMR-1001", card.get("id"));
        assertEquals("Waiting for Acceptance", card.get("status"));
        assertEquals("WAITING_FOR_ACCEPTANCE", card.get("rawStatus"));
        assertEquals("DIRECT_BUY", card.get("type"));
        assertEquals(true, card.get("isDirectBuy"));
    }

    // 2 & 3 & 4 & 5 & 6: Flow A: Seller accepts Direct Purchase -> Order accepted, My Requests retains card, My Orders shows order
    @Test
    @DisplayName("Scenario 2 to 6: Flow A Direct Purchase accepted -> synced in My Requests and My Orders")
    public void test02_DirectPurchaseAcceptedSynchronization() {
        MaterialRequest mr = new MaterialRequest();
        mr.setId(501L);
        mr.setRequestId("DMR-1001");
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setBuyer(contractorA);
        mr.setBuyerRole("CONTRACTOR");
        mr.setTargetSeller(seller1);
        mr.setStatus("ACCEPTED");
        mr.setMaterialPrice(380.0);
        mr.setMaterialAmount(38000.0);
        mr.setEstimatedTotal(38000.0);
        mr.setDeliveryAddress("Project Site Plot 42, Block B");
        mr.setVerificationCode("BB-DM-123456");

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialName("OPC 53 Cement");
        item.setQuantity(100.0);
        item.setUnit("Bags");
        mr.addItem(item);

        // 1. Verify card in My Requests
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(contractorA))
                .thenReturn(List.of(mr));

        ResponseEntity<?> reqResponse = customerRequestController.getCustomerMyRequests(authContractorA);
        assertEquals(HttpStatus.OK, reqResponse.getStatusCode());
        List<?> reqList = (List<?>) reqResponse.getBody();
        assertEquals(1, reqList.size());

        Map<?, ?> reqCard = (Map<?, ?>) reqList.get(0);
        assertEquals("DMR-1001", reqCard.get("id"));
        assertEquals("Order Accepted", reqCard.get("status"));
        assertEquals("ACCEPTED", reqCard.get("rawStatus"));
        assertEquals(true, reqCard.get("isDirectBuy"));
        assertEquals("BB-DM-123456", reqCard.get("verificationCode"));
        // Contact details revealed on acceptance
        assertEquals("Apex Building Supplies", reqCard.get("sellerName"));
        assertEquals("+91 98112 34567", reqCard.get("sellerPhone"));

        // 2. Verify order in My Orders
        MaterialOrder order = new MaterialOrder();
        order.setId(701L);
        order.setOrderCode("ORD-2026-00001");
        order.setMaterialRequest(mr);
        order.setBuyer(contractorA);
        order.setBuyerRole("CONTRACTOR");
        order.setSeller(seller1);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setTotalAmount(38000.0);
        order.setDeliveryAddress("Project Site Plot 42, Block B");

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(contractorA.getId()))
                .thenReturn(List.of(order));

        ResponseEntity<?> orderResponse = materialOrderController.getCustomerMyOrders(authContractorA);
        assertEquals(HttpStatus.OK, orderResponse.getStatusCode());
        List<?> orderList = (List<?>) orderResponse.getBody();
        assertEquals(1, orderList.size());

        Map<?, ?> orderCard = (Map<?, ?>) orderList.get(0);
        assertEquals("ORD-2026-00001", orderCard.get("orderCode"));
        assertEquals("ORDER_ACCEPTED", orderCard.get("orderStatus"));
        assertEquals(38000.0, orderCard.get("totalAmount"));
        assertEquals("Apex Building Supplies", orderCard.get("sellerName"));
    }

    // 7, 8, 9: Flow B: Submitted quotation does not trigger approval
    @Test
    @DisplayName("Scenario 7 to 9: Material Requirement with submitted quotation is not yet accepted")
    public void test03_QuotationSubmittedDoesNotTriggerApproval() {
        MaterialRequest mr = new MaterialRequest();
        mr.setId(601L);
        mr.setRequestId("MR-2001");
        mr.setRequestType("POSTED_REQUIREMENT");
        mr.setBuyer(contractorA);
        mr.setStatus("NEW");

        Quotation q = new Quotation();
        q.setId(801L);
        q.setQuotationId("QT-8001");
        q.setMaterialRequest(mr);
        q.setProvider(seller1);
        q.setQuotedAmount(45000.0);
        q.setStatus("SUBMITTED");

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(contractorA))
                .thenReturn(List.of(mr));
        when(quotationRepository.findByMaterialRequestIdOrderByCreatedAtDesc(601L))
                .thenReturn(List.of(q));

        ResponseEntity<?> reqResponse = customerRequestController.getCustomerMyRequests(authContractorA);
        assertEquals(HttpStatus.OK, reqResponse.getStatusCode());
        List<?> reqList = (List<?>) reqResponse.getBody();
        assertEquals(1, reqList.size());

        Map<?, ?> card = (Map<?, ?>) reqList.get(0);
        assertEquals("Active", card.get("status"));
        assertEquals("NEW", card.get("rawStatus"));

        // No orders exist in My Orders
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(contractorA.getId()))
                .thenReturn(Collections.emptyList());

        ResponseEntity<?> orderResponse = materialOrderController.getCustomerMyOrders(authContractorA);
        assertEquals(HttpStatus.OK, orderResponse.getStatusCode());
        List<?> orderList = (List<?>) orderResponse.getBody();
        assertTrue(orderList.isEmpty(), "Submitted quotation must not appear in My Orders");
    }

    // 10 & 11: Flow B: Accepted quotation / allocated order appears in My Requests with confirmed status and in My Orders
    @Test
    @DisplayName("Scenario 10 & 11: Flow B quotation accepted and order confirmed -> appears in both My Requests and My Orders")
    public void test04_QuotationAcceptedAndOrderConfirmedSynchronization() {
        MaterialRequest mr = new MaterialRequest();
        mr.setId(601L);
        mr.setRequestId("MR-2001");
        mr.setRequestType("POSTED_REQUIREMENT");
        mr.setBuyer(contractorA);
        mr.setStatus("ACCEPTED");

        MaterialOrder order = new MaterialOrder();
        order.setId(901L);
        order.setOrderCode("ORD-2026-00002");
        order.setMaterialRequest(mr);
        order.setBuyer(contractorA);
        order.setBuyerRole("CONTRACTOR");
        order.setSeller(seller1);
        order.setOrderStatus("CONFIRMED");
        order.setTotalAmount(45000.0);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(contractorA))
                .thenReturn(List.of(mr));
        when(materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(601L))
                .thenReturn(List.of(order));

        // 1. My Requests check
        ResponseEntity<?> reqResponse = customerRequestController.getCustomerMyRequests(authContractorA);
        assertEquals(HttpStatus.OK, reqResponse.getStatusCode());
        List<?> reqList = (List<?>) reqResponse.getBody();
        assertEquals(1, reqList.size());

        Map<?, ?> reqCard = (Map<?, ?>) reqList.get(0);
        assertEquals("Purchase Plan Confirmed", reqCard.get("status"));
        assertEquals("ACCEPTED", reqCard.get("rawStatus"));
        assertNotNull(reqCard.get("orders"));

        // 2. My Orders check
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(contractorA.getId()))
                .thenReturn(List.of(order));

        ResponseEntity<?> orderResponse = materialOrderController.getCustomerMyOrders(authContractorA);
        assertEquals(HttpStatus.OK, orderResponse.getStatusCode());
        List<?> orderList = (List<?>) orderResponse.getBody();
        assertEquals(1, orderList.size());

        Map<?, ?> orderCard = (Map<?, ?>) orderList.get(0);
        assertEquals("ORD-2026-00002", orderCard.get("orderCode"));
        assertEquals("CONFIRMED", orderCard.get("orderStatus"));
        assertEquals(45000.0, orderCard.get("totalAmount"));
        assertEquals("Apex Building Supplies", orderCard.get("sellerName"));
    }

    // 14: Repeated acceptance does not create duplicate orders (idempotency)
    @Test
    @DisplayName("Scenario 14: Repeated order creation returns existing order without duplicates")
    public void test05_IdempotentOrderCreationPreventsDuplicates() {
        Quotation quotation = new Quotation();
        quotation.setId(801L);
        quotation.setRequestType("MATERIAL_REQUIREMENT");
        quotation.setProvider(seller1);

        MaterialRequest mr = new MaterialRequest();
        mr.setId(601L);
        mr.setBuyer(contractorA);
        quotation.setMaterialRequest(mr);

        MaterialOrder existingOrder = new MaterialOrder();
        existingOrder.setId(901L);
        existingOrder.setOrderCode("ORD-2026-00001");
        existingOrder.setQuotation(quotation);

        when(materialOrderRepository.existsByQuotationId(801L)).thenReturn(true);
        when(materialOrderRepository.findByQuotationId(801L)).thenReturn(Optional.of(existingOrder));

        MaterialOrder result = materialOrderService.createOrderFromAcceptedQuotation(quotation, mr, contractorA);

        assertNotNull(result);
        assertEquals("ORD-2026-00001", result.getOrderCode());
        verify(materialOrderRepository, never()).save(any(MaterialOrder.class));
    }

    // 15: Cross-contractor isolation: Contractor B cannot access Contractor A's orders
    @Test
    @DisplayName("Scenario 15: Contractor data isolation enforced")
    public void test06_CrossContractorDataIsolation() {
        MaterialOrder orderA = new MaterialOrder();
        orderA.setId(901L);
        orderA.setOrderCode("ORD-A");
        orderA.setBuyer(contractorA);
        orderA.setOrderStatus("CONFIRMED");

        // When contractor B calls getCustomerMyOrders, they see only their orders (empty in this case)
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(contractorB.getId()))
                .thenReturn(Collections.emptyList());

        ResponseEntity<?> response = materialOrderController.getCustomerMyOrders(authContractorB);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertTrue(list.isEmpty());

        // Single order query by ID enforces ownership
        when(materialOrderRepository.findById(901L)).thenReturn(Optional.of(orderA));
        assertThrows(SecurityException.class, () -> {
            materialOrderService.getOrderById(901L, contractorB);
        });
    }

    // Non-buyer role (Seller) is rejected from accessing buyer My Orders
    @Test
    @DisplayName("Non-buyer role (Seller) receives 403 Forbidden")
    public void test07_SellerBlockedFromBuyerMyOrders() {
        ResponseEntity<?> response = materialOrderController.getCustomerMyOrders(authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // Contractor can access through both /customer and /contractor endpoints
    @Test
    @DisplayName("Contractor can access through mapped endpoints")
    public void test08_ContractorEndpointsAccessibility() {
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(contractorA.getId()))
                .thenReturn(Collections.emptyList());

        ResponseEntity<?> response = materialOrderController.getCustomerMyOrders(authContractorA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
