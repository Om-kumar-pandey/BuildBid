package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - MATERIAL ORDER SYSTEM TESTS (Phase 4A)
 * 
 * Comprehensive test suite verifying all 28 Phase 4A criteria:
 * 1-13: Order creation and snapshotting from accepted quotation
 * 14-16: Duplicate protection and idempotency
 * 17-21: Strict security and authorization for buyer, seller, and third parties
 * 22-24: Universal Buyer architecture (CUSTOMER, CONTRACTOR, PROFESSIONAL)
 * 25-27: Module isolation (Direct Buy, Projects, Direct Hire)
 * 28: Transactional failure propagation
 */
public class MaterialOrderSystemTest {

    private MaterialOrderRepository materialOrderRepository;
    private QuotationRepository quotationRepository;
    private MaterialRequestRepository materialRequestRepository;
    private ClientServiceRequestRepository clientServiceRequestRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private GeoLocationService geoLocationService;

    private MaterialOrderService materialOrderService;
    private QuotationService quotationService;
    private MaterialOrderController materialOrderController;
    private QuotationController quotationController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorBuyer;
    private MarketplaceBackendApplication.MarketplaceUser proBuyer;
    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser seller2;

    private MaterialRequest materialReq;
    private ClientServiceRequest serviceReq;
    private Quotation materialQuote;

    private Authentication authCustomerA;
    private Authentication authCustomerB;
    private Authentication authContractor;
    private Authentication authPro;
    private Authentication authSeller1;
    private Authentication authSeller2;

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
        quotationController = new QuotationController(quotationService, userRepository);

        // 1. Users
        customerA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerA, "id", 1L);
        customerA.setEmail("customerA@buildbid.com");
        customerA.setName("Customer Alice");
        customerA.setPhone("9876543210");
        customerA.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        customerB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerB, "id", 2L);
        customerB.setEmail("customerB@buildbid.com");
        customerB.setName("Customer Bob");
        customerB.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        contractorBuyer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorBuyer, "id", 3L);
        contractorBuyer.setEmail("contractor@buildbid.com");
        contractorBuyer.setName("Contractor Charlie");
        contractorBuyer.setPhone("9876543211");
        contractorBuyer.getRoles().add(MarketplaceBackendApplication.Role.CONTRACTOR);

        proBuyer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(proBuyer, "id", 4L);
        proBuyer.setEmail("pro@buildbid.com");
        proBuyer.setName("Designer Diana");
        proBuyer.setPhone("9876543212");
        proBuyer.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);

        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller1, "id", 101L);
        seller1.setEmail("seller1@buildbid.com");
        seller1.setName("Apex Building Supplies");
        seller1.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        seller2 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller2, "id", 102L);
        seller2.setEmail("seller2@buildbid.com");
        seller2.setName("Zenith Cement Suppliers");
        seller2.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        // 2. Auth Mocks
        authCustomerA = mock(Authentication.class);
        when(authCustomerA.getName()).thenReturn("customerA@buildbid.com");

        authCustomerB = mock(Authentication.class);
        when(authCustomerB.getName()).thenReturn("customerB@buildbid.com");

        authContractor = mock(Authentication.class);
        when(authContractor.getName()).thenReturn("contractor@buildbid.com");

        authPro = mock(Authentication.class);
        when(authPro.getName()).thenReturn("pro@buildbid.com");

        authSeller1 = mock(Authentication.class);
        when(authSeller1.getName()).thenReturn("seller1@buildbid.com");

        authSeller2 = mock(Authentication.class);
        when(authSeller2.getName()).thenReturn("seller2@buildbid.com");

        when(userRepository.findByEmail("customerA@buildbid.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByEmail("customerB@buildbid.com")).thenReturn(Optional.of(customerB));
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractorBuyer));
        when(userRepository.findByEmail("pro@buildbid.com")).thenReturn(Optional.of(proBuyer));
        when(userRepository.findByEmail("seller1@buildbid.com")).thenReturn(Optional.of(seller1));
        when(userRepository.findByEmail("seller2@buildbid.com")).thenReturn(Optional.of(seller2));

        // 3. Requests
        materialReq = new MaterialRequest();
        ReflectionTestUtils.setField(materialReq, "id", 501L);
        materialReq.setRequestId("REQ-501");
        materialReq.setBuyer(customerA);
        materialReq.setBuyerRole("CUSTOMER");
        materialReq.setDeliveryAddress("Plot 42, Block B, Industrial Corridor, Noida");
        materialReq.setContactPhone("9876543210");
        materialReq.setStatus("NEW");

        serviceReq = new ClientServiceRequest();
        ReflectionTestUtils.setField(serviceReq, "id", 601L);
        serviceReq.setRequestId("REQ-601");
        serviceReq.setClient(customerA);
        serviceReq.setStatus("New");

        // 4. Quotation
        materialQuote = new Quotation();
        ReflectionTestUtils.setField(materialQuote, "id", 1001L);
        materialQuote.setQuotationId("QT-1001");
        materialQuote.setRequestType("MATERIAL_REQUIREMENT");
        materialQuote.setMaterialRequest(materialReq);
        materialQuote.setProvider(seller1);
        materialQuote.setProviderRole("MATERIAL_SELLER");
        materialQuote.setQuotedAmount(45000.0);
        materialQuote.setMaterialCost(38000.0);
        materialQuote.setTransportationCost(4000.0);
        materialQuote.setTaxGst(3000.0);
        materialQuote.setPaymentTerms("50% Advance, 50% on Delivery");
        materialQuote.setStatus("SUBMITTED");
    }

    private MaterialOrder triggerStandardAcceptanceAndCapture() {
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(materialQuote));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(501L), any())).thenReturn(List.of(materialQuote));

        when(materialOrderRepository.existsByQuotationId(1001L)).thenReturn(false);
        when(materialOrderRepository.findMaxId()).thenReturn(10L);
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> {
            MaterialOrder o = i.getArgument(0);
            ReflectionTestUtils.setField(o, "id", 7001L);
            return o;
        });

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        ArgumentCaptor<MaterialOrder> orderCaptor = ArgumentCaptor.forClass(MaterialOrder.class);
        verify(materialOrderRepository, atLeastOnce()).save(orderCaptor.capture());
        return orderCaptor.getValue();
    }

    // 1. Accepting MATERIAL_REQUIREMENT quotation creates exactly one MaterialOrder
    @Test
    public void test01_AcceptingQuotationCreatesExactlyOneMaterialOrder() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertNotNull(order);
        verify(materialOrderRepository, times(1)).save(any(MaterialOrder.class));
    }

    // 2. MaterialOrder references the accepted quotation
    @Test
    public void test02_OrderReferencesAcceptedQuotation() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals(materialQuote, order.getQuotation());
        assertEquals(1001L, order.getQuotation().getId());
    }

    // 3. MaterialOrder references the correct MaterialRequest
    @Test
    public void test03_OrderReferencesCorrectMaterialRequest() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals(materialReq, order.getMaterialRequest());
        assertEquals(501L, order.getMaterialRequest().getId());
    }

    // 4. MaterialOrder references the correct buyer
    @Test
    public void test04_OrderReferencesCorrectBuyer() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals(customerA.getId(), order.getBuyer().getId());
        assertEquals("Customer Alice", order.getBuyer().getName());
    }

    // 5. MaterialOrder stores the correct buyer role
    @Test
    public void test05_OrderStoresCorrectBuyerRole() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals("CUSTOMER", order.getBuyerRole());
    }

    // 6. MaterialOrder references the correct seller
    @Test
    public void test06_OrderReferencesCorrectSeller() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals(seller1.getId(), order.getSeller().getId());
        assertEquals("Apex Building Supplies", order.getSeller().getName());
    }

    // 7. Financial values match the accepted quotation snapshot
    @Test
    public void test07_FinancialValuesMatchQuotationSnapshot() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals(38000.0, order.getMaterialAmount());
        assertEquals(4000.0, order.getTransportationAmount());
        assertEquals(3000.0, order.getTaxGst());
        assertEquals(45000.0, order.getTotalAmount());
        assertEquals("INR", order.getCurrency());
    }

    // 8. Delivery address is snapshotted
    @Test
    public void test08_DeliveryAddressIsSnapshotted() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals("Plot 42, Block B, Industrial Corridor, Noida", order.getDeliveryAddress());
    }

    // 9. Contact number is snapshotted
    @Test
    public void test09_ContactNumberIsSnapshotted() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals("9876543210", order.getContactNumber());
    }

    // 10. Payment terms are snapshotted
    @Test
    public void test10_PaymentTermsAreSnapshotted() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals("50% Advance, 50% on Delivery", order.getPaymentTerms());
    }

    // 11. Initial order status is CONFIRMED
    @Test
    public void test11_InitialOrderStatusIsConfirmed() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals("CONFIRMED", order.getOrderStatus());
    }

    // 12. Initial payment status is PENDING
    @Test
    public void test12_InitialPaymentStatusIsPending() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals("PENDING", order.getPaymentStatus());
    }

    // 13. Initial delivery status is PENDING
    @Test
    public void test13_InitialDeliveryStatusIsPending() {
        MaterialOrder order = triggerStandardAcceptanceAndCapture();
        assertEquals("PENDING", order.getDeliveryStatus());
        assertNotNull(order.getConfirmedAt());
    }

    // 14. Repeated acceptance cannot create another MaterialOrder
    @Test
    public void test14_RepeatedAcceptanceCannotCreateAnotherOrder() {
        materialQuote.setStatus("ACCEPTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(materialQuote));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        verify(materialOrderRepository, never()).save(any());
    }

    // 15. Direct service invocation cannot create duplicate order when order exists
    @Test
    public void test15_DirectServiceInvocationCannotCreateDuplicateOrder() {
        MaterialOrder existing = new MaterialOrder();
        ReflectionTestUtils.setField(existing, "id", 7001L);
        existing.setOrderCode("ORD-2026-00010");
        existing.setQuotation(materialQuote);

        when(materialOrderRepository.existsByQuotationId(1001L)).thenReturn(true);
        when(materialOrderRepository.findByQuotationId(1001L)).thenReturn(Optional.of(existing));

        MaterialOrder result = materialOrderService.createOrderFromAcceptedQuotation(materialQuote, materialReq, customerA);
        assertNotNull(result);
        assertEquals(7001L, result.getId());
        verify(materialOrderRepository, never()).save(any());
    }

    // 16. Database uniqueness protects quotation_id on race condition
    @Test
    public void test16_DatabaseUniquenessProtectsQuotationId() {
        when(materialOrderRepository.existsByQuotationId(1001L)).thenReturn(false);
        when(materialOrderRepository.save(any(MaterialOrder.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate key violation on quotation_id"));

        MaterialOrder concurrentOrder = new MaterialOrder();
        ReflectionTestUtils.setField(concurrentOrder, "id", 7002L);
        when(materialOrderRepository.findByQuotationId(1001L)).thenReturn(Optional.of(concurrentOrder));

        MaterialOrder result = materialOrderService.createOrderFromAcceptedQuotation(materialQuote, materialReq, customerA);
        assertNotNull(result);
        assertEquals(7002L, result.getId());
    }

    // 17. Buyer can retrieve own order
    @Test
    public void test17_BuyerCanRetrieveOwnOrder() {
        MaterialOrder order = createMockOrder(7001L, "ORD-2026-00001", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        when(materialOrderRepository.findById(7001L)).thenReturn(Optional.of(order));
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(order));

        ResponseEntity<?> singleResp = materialOrderController.getOrderById(7001L, authCustomerA);
        assertEquals(HttpStatus.OK, singleResp.getStatusCode());

        ResponseEntity<?> listResp = materialOrderController.getBuyerOrders(authCustomerA);
        assertEquals(HttpStatus.OK, listResp.getStatusCode());
        List<?> list = (List<?>) listResp.getBody();
        assertEquals(1, list.size());
    }

    // 18. Seller can retrieve own order
    @Test
    public void test18_SellerCanRetrieveOwnOrder() {
        MaterialOrder order = createMockOrder(7001L, "ORD-2026-00001", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        when(materialOrderRepository.findById(7001L)).thenReturn(Optional.of(order));
        when(materialOrderRepository.findBySellerIdOrderByCreatedAtDesc(101L)).thenReturn(List.of(order));

        ResponseEntity<?> singleResp = materialOrderController.getOrderById(7001L, authSeller1);
        assertEquals(HttpStatus.OK, singleResp.getStatusCode());

        ResponseEntity<?> listResp = materialOrderController.getSellerOrders(authSeller1);
        assertEquals(HttpStatus.OK, listResp.getStatusCode());
        List<?> list = (List<?>) listResp.getBody();
        assertEquals(1, list.size());
    }

    // 19. Another buyer cannot retrieve order (403 FORBIDDEN)
    @Test
    public void test19_AnotherBuyerCannotRetrieveOrder() {
        MaterialOrder order = createMockOrder(7001L, "ORD-2026-00001", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        when(materialOrderRepository.findById(7001L)).thenReturn(Optional.of(order));

        ResponseEntity<?> response = materialOrderController.getOrderById(7001L, authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // 20. Another seller cannot retrieve order (403 FORBIDDEN)
    @Test
    public void test20_AnotherSellerCannotRetrieveOrder() {
        MaterialOrder order = createMockOrder(7001L, "ORD-2026-00001", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        when(materialOrderRepository.findById(7001L)).thenReturn(Optional.of(order));

        ResponseEntity<?> response = materialOrderController.getOrderById(7001L, authSeller2);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // 21. Unauthenticated user cannot retrieve order (401 UNAUTHORIZED)
    @Test
    public void test21_UnauthenticatedUserCannotRetrieveOrder() {
        ResponseEntity<?> singleResp = materialOrderController.getOrderById(7001L, null);
        assertEquals(HttpStatus.UNAUTHORIZED, singleResp.getStatusCode());

        ResponseEntity<?> buyerListResp = materialOrderController.getBuyerOrders(null);
        assertEquals(HttpStatus.UNAUTHORIZED, buyerListResp.getStatusCode());

        ResponseEntity<?> sellerListResp = materialOrderController.getSellerOrders(null);
        assertEquals(HttpStatus.UNAUTHORIZED, sellerListResp.getStatusCode());
    }

    // 22. CUSTOMER order identity stored correctly
    @Test
    public void test22_CustomerOrderIdentityStoredCorrectly() {
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));
        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(materialQuote, materialReq, customerA);
        assertEquals("CUSTOMER", order.getBuyerRole());
        assertEquals(customerA.getId(), order.getBuyer().getId());
    }

    // 23. CONTRACTOR order identity structurally supported
    @Test
    public void test23_ContractorOrderIdentityStructurallySupported() {
        MaterialRequest contractorReq = new MaterialRequest();
        ReflectionTestUtils.setField(contractorReq, "id", 502L);
        contractorReq.setBuyer(contractorBuyer);
        contractorReq.setBuyerRole("CONTRACTOR");

        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));
        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(materialQuote, contractorReq, contractorBuyer);
        assertEquals("CONTRACTOR", order.getBuyerRole());
        assertEquals(contractorBuyer.getId(), order.getBuyer().getId());
    }

    // 24. PROFESSIONAL order identity structurally supported
    @Test
    public void test24_ProfessionalOrderIdentityStructurallySupported() {
        MaterialRequest proReq = new MaterialRequest();
        ReflectionTestUtils.setField(proReq, "id", 503L);
        proReq.setBuyer(proBuyer);
        proReq.setBuyerRole("PROFESSIONAL");

        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));
        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(materialQuote, proReq, proBuyer);
        assertEquals("PROFESSIONAL", order.getBuyerRole());
        assertEquals(proBuyer.getId(), order.getBuyer().getId());
    }

    // 25. Direct Buy does not create quotation-generated order
    @Test
    public void test25_DirectBuyDoesNotCreateQuotationGeneratedOrder() {
        Quotation directBuyQuote = new Quotation();
        ReflectionTestUtils.setField(directBuyQuote, "id", 1009L);
        directBuyQuote.setRequestType("DIRECT_BUY");

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(directBuyQuote, materialReq, customerA);
        assertNull(order);
        verify(materialOrderRepository, never()).save(any());
    }

    // 26. Project records do not create MaterialOrder
    @Test
    public void test26_ProjectRecordsDoNotCreateMaterialOrder() {
        Quotation projectQuote = new Quotation();
        ReflectionTestUtils.setField(projectQuote, "id", 1010L);
        projectQuote.setRequestType("PROJECT");

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(projectQuote, materialReq, customerA);
        assertNull(order);
        verify(materialOrderRepository, never()).save(any());
    }

    // 27. Direct Hire does not create MaterialOrder
    @Test
    public void test27_DirectHireDoesNotCreateMaterialOrder() {
        serviceReq.setStatus("New");
        Quotation proQuote = new Quotation();
        ReflectionTestUtils.setField(proQuote, "id", 2001L);
        proQuote.setRequestType("DIRECT_HIRE");
        proQuote.setServiceRequest(serviceReq);
        proQuote.setStatus("SUBMITTED");

        when(quotationRepository.findById(2001L)).thenReturn(Optional.of(proQuote));
        when(clientServiceRequestRepository.findByIdForUpdate(601L)).thenReturn(Optional.of(serviceReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(clientServiceRequestRepository.save(any(ClientServiceRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.findByServiceRequestIdAndStatusIn(eq(601L), any())).thenReturn(List.of(proQuote));

        ResponseEntity<?> response = quotationController.acceptQuotation("2001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals(true, body.get("success"));
        assertNull(body.get("orderId"));
        verify(materialOrderRepository, never()).save(any());
    }

    // 28. If MaterialOrder creation fails, exception propagates for rollback
    @Test
    public void test28_TransactionRollbackWhenOrderCreationFails() {
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(materialQuote));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(501L), any())).thenReturn(List.of(materialQuote));

        when(materialOrderRepository.save(any(MaterialOrder.class)))
                .thenThrow(new RuntimeException("Order database connection failure"));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Order database connection failure"));
    }

    // 29. Customer My Orders returns accepted order for User A
    @Test
    public void test29_CustomerMyOrders_ReturnsAcceptedOrderForUserA() {
        MaterialOrder orderA = createMockOrder(7001L, "ORD-2026-00001", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        orderA.setOrderStatus("PROCESSING");
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(orderA));

        ResponseEntity<?> response = materialOrderController.getCustomerMyOrders(authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
    }

    // 30. Customer My Orders excludes waiting for acceptance order
    @Test
    public void test30_CustomerMyOrders_ExcludesWaitingForAcceptanceOrder() {
        MaterialOrder waitingOrder = createMockOrder(7002L, "ORD-2026-00002", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        waitingOrder.setOrderStatus("WAITING_FOR_ACCEPTANCE");
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(waitingOrder));

        ResponseEntity<?> response = materialOrderController.getCustomerMyOrders(authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(0, list.size());
    }

    // 31. Multi-user isolation: User B never sees User A's orders
    @Test
    public void test31_CustomerMyOrders_MultiUserDataIsolation() {
        MaterialOrder orderA = createMockOrder(7001L, "ORD-2026-00001", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        MaterialOrder orderB = createMockOrder(7003L, "ORD-2026-00003", materialQuote, materialReq, customerB, "CUSTOMER", seller1);
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(orderA));
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(orderB));

        // Customer A gets only Order A
        ResponseEntity<?> respA = materialOrderController.getCustomerMyOrders(authCustomerA);
        List<?> listA = (List<?>) respA.getBody();
        assertEquals(1, listA.size());
        Map<?, ?> mapA = (Map<?, ?>) listA.get(0);
        assertEquals(7001L, mapA.get("id"));

        // Customer B gets only Order B
        ResponseEntity<?> respB = materialOrderController.getCustomerMyOrders(authCustomerB);
        List<?> listB = (List<?>) respB.getBody();
        assertEquals(1, listB.size());
        Map<?, ?> mapB = (Map<?, ?>) listB.get(0);
        assertEquals(7003L, mapB.get("id"));
    }

    // 32. IDOR Protection: User B cannot retrieve User A's order by ID
    @Test
    public void test32_IDOR_UserBCannotRetrieveUserAOrder() {
        MaterialOrder orderA = createMockOrder(7001L, "ORD-2026-00001", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        when(materialOrderRepository.findById(7001L)).thenReturn(Optional.of(orderA));

        ResponseEntity<?> response = materialOrderController.getOrderById(7001L, authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // 33. User A cannot view waiting order via IDOR URL manipulation
    @Test
    public void test33_UserACannotViewWaitingOrderById() {
        MaterialOrder waitingOrder = createMockOrder(7002L, "ORD-2026-00002", materialQuote, materialReq, customerA, "CUSTOMER", seller1);
        waitingOrder.setOrderStatus("WAITING_FOR_ACCEPTANCE");
        when(materialOrderRepository.findById(7002L)).thenReturn(Optional.of(waitingOrder));

        ResponseEntity<?> response = materialOrderController.getOrderById(7002L, authCustomerA);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // 34. Non-Customer role blocked from Customer My Orders endpoint
    @Test
    public void test34_NonCustomerRoleBlockedFromCustomerMyOrders() {
        ResponseEntity<?> response = materialOrderController.getCustomerMyOrders(authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // 35. Unauthenticated user blocked from Customer My Orders endpoint
    @Test
    public void test35_UnauthenticatedUserBlockedFromCustomerMyOrders() {
        ResponseEntity<?> response = materialOrderController.getCustomerMyOrders(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    private MaterialOrder createMockOrder(
            Long id,
            String code,
            Quotation q,
            MaterialRequest req,
            MarketplaceBackendApplication.MarketplaceUser buyer,
            String buyerRole,
            MarketplaceBackendApplication.MarketplaceUser seller
    ) {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", id);
        order.setOrderCode(code);
        order.setQuotation(q);
        order.setMaterialRequest(req);
        order.setBuyer(buyer);
        order.setBuyerRole(buyerRole);
        order.setSeller(seller);
        order.setMaterialAmount(38000.0);
        order.setTransportationAmount(4000.0);
        order.setTaxGst(3000.0);
        order.setTotalAmount(45000.0);
        order.setCurrency("INR");
        order.setDeliveryAddress("Plot 42, Block B, Industrial Corridor");
        order.setContactNumber("9876543210");
        order.setPaymentTerms("50% Advance");
        order.setOrderStatus("CONFIRMED");
        order.setPaymentStatus("PENDING");
        order.setDeliveryStatus("PENDING");
        return order;
    }
}
