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
 * PROFESSIONAL MATERIAL REQUESTS AND MY ORDERS SECURITY & WORKFLOW TESTS
 * 
 * Validates:
 * 1. Professional Direct Buy requests & lifecycle tracking in My Requests
 * 2. Seller acceptance -> synchronized order generation in Professional My Orders
 * 3. Strict User-Wise Categorization and Security (no cross-user leakage)
 * 4. Role Authorization: Customer, Contractor, Professional allowed; Seller/others blocked (403)
 * 5. Order delivery date tracking and detail retrieval security
 */
public class ProfessionalMaterialRequestsAndOrdersTest {

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

    private MarketplaceBackendApplication.MarketplaceUser professionalA;
    private MarketplaceBackendApplication.MarketplaceUser professionalB;
    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser serviceProviderUser;
    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;

    private Authentication authProfessionalA;
    private Authentication authProfessionalB;
    private Authentication authSeller1;
    private Authentication authServiceProvider;
    private Authentication authCustomer;
    private Authentication authContractor;

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

        // Setup Professional A
        professionalA = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(professionalA, "id", 301L);
        professionalA.setName("Ar. Rohan Mehta");
        professionalA.setEmail("rohan@buildbid.pro");
        professionalA.setUsername("rohan_architect");
        professionalA.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);

        // Setup Professional B
        professionalB = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(professionalB, "id", 302L);
        professionalB.setName("Er. Ananya Sen");
        professionalB.setEmail("ananya@buildbid.pro");
        professionalB.setUsername("ananya_engineer");
        professionalB.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);

        // Setup Seller 1
        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(seller1, "id", 401L);
        seller1.setName("Apex Building Supplies");
        seller1.setEmail("sales@apexsupplies.in");
        seller1.setUsername("apex_seller");
        seller1.setPhone("+91 98112 34567");
        seller1.setLocation("Sector 62, Noida");
        seller1.getRoles().add(MarketplaceBackendApplication.Role.SELLER);

        // Setup Legacy Service Provider
        serviceProviderUser = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(serviceProviderUser, "id", 303L);
        serviceProviderUser.setName("Er. Vikram Sharma");
        serviceProviderUser.setEmail("vikram@buildbid.pro");
        serviceProviderUser.setUsername("vikram_service_provider");
        serviceProviderUser.getRoles().add(MarketplaceBackendApplication.Role.SERVICE_PROVIDER);

        // Setup Customer
        customerUser = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(customerUser, "id", 101L);
        customerUser.setName("Customer Priya");
        customerUser.setEmail("priya@customer.in");
        customerUser.setUsername("priya_customer");
        customerUser.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        // Setup Contractor
        contractorUser = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(contractorUser, "id", 201L);
        contractorUser.setName("Contractor Rajesh");
        contractorUser.setEmail("rajesh@contractor.in");
        contractorUser.setUsername("rajesh_contractor");
        contractorUser.getRoles().add(MarketplaceBackendApplication.Role.CONTRACTOR);

        // Mock auth principals
        authProfessionalA = mock(Authentication.class);
        when(authProfessionalA.getName()).thenReturn("rohan@buildbid.pro");

        authProfessionalB = mock(Authentication.class);
        when(authProfessionalB.getName()).thenReturn("ananya@buildbid.pro");

        authSeller1 = mock(Authentication.class);
        when(authSeller1.getName()).thenReturn("sales@apexsupplies.in");

        authServiceProvider = mock(Authentication.class);
        when(authServiceProvider.getName()).thenReturn("vikram@buildbid.pro");

        authCustomer = mock(Authentication.class);
        when(authCustomer.getName()).thenReturn("priya@customer.in");

        authContractor = mock(Authentication.class);
        when(authContractor.getName()).thenReturn("rajesh@contractor.in");

        // Mock userRepository lookups
        when(userRepository.findByEmail("rohan@buildbid.pro")).thenReturn(Optional.of(professionalA));
        when(userRepository.findByUsername("rohan@buildbid.pro")).thenReturn(Optional.of(professionalA));
        when(userRepository.findByEmail("ananya@buildbid.pro")).thenReturn(Optional.of(professionalB));
        when(userRepository.findByUsername("ananya@buildbid.pro")).thenReturn(Optional.of(professionalB));
        when(userRepository.findByEmail("sales@apexsupplies.in")).thenReturn(Optional.of(seller1));
        when(userRepository.findByUsername("sales@apexsupplies.in")).thenReturn(Optional.of(seller1));
        when(userRepository.findByEmail("vikram@buildbid.pro")).thenReturn(Optional.of(serviceProviderUser));
        when(userRepository.findByUsername("vikram@buildbid.pro")).thenReturn(Optional.of(serviceProviderUser));
        when(userRepository.findByEmail("priya@customer.in")).thenReturn(Optional.of(customerUser));
        when(userRepository.findByUsername("priya@customer.in")).thenReturn(Optional.of(customerUser));
        when(userRepository.findByEmail("rajesh@contractor.in")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByUsername("rajesh@contractor.in")).thenReturn(Optional.of(contractorUser));
    }

    @Test
    @DisplayName("Test 1: Professional pending Direct Purchase appears in My Requests")
    public void test01_ProfessionalDirectPurchasePending() {
        MaterialRequest mr = new MaterialRequest();
        mr.setId(701L);
        mr.setRequestId("DMR-701");
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setBuyer(professionalA);
        mr.setBuyerRole("PROFESSIONAL");
        mr.setTargetSeller(seller1);
        mr.setStatus("WAITING_FOR_ACCEPTANCE");
        mr.setMaterialPrice(450.0);
        mr.setMaterialAmount(45000.0);
        mr.setEstimatedTotal(45000.0);

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialName("UltraTech Super Cement");
        item.setQuantity(100.0);
        item.setUnit("Bags");
        mr.addItem(item);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(professionalA))
                .thenReturn(List.of(mr));

        ResponseEntity<?> response = customerRequestController.getCustomerMyRequests(authProfessionalA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        List<?> list = (List<?>) response.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());

        Map<?, ?> card = (Map<?, ?>) list.get(0);
        assertEquals("DMR-701", card.get("id"));
        assertEquals("Waiting for Acceptance", card.get("status"));
        assertEquals("WAITING_FOR_ACCEPTANCE", card.get("rawStatus"));
        assertEquals("DIRECT_BUY", card.get("type"));
    }

    @Test
    @DisplayName("Test 2: Direct Purchase accepted by seller -> Order Accepted in My Requests and order in My Orders")
    public void test02_ProfessionalDirectPurchaseAcceptedSynchronization() {
        MaterialRequest mr = new MaterialRequest();
        mr.setId(701L);
        mr.setRequestId("DMR-701");
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setBuyer(professionalA);
        mr.setBuyerRole("PROFESSIONAL");
        mr.setTargetSeller(seller1);
        mr.setStatus("ACCEPTED");
        mr.setMaterialPrice(450.0);
        mr.setMaterialAmount(45000.0);
        mr.setEstimatedTotal(45000.0);
        mr.setDeliveryAddress("Plot 18, Commercial Belt, Alpha 1, Greater Noida");
        mr.setVerificationCode("BB-DM-882914");

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialName("UltraTech Super Cement");
        item.setQuantity(100.0);
        item.setUnit("Bags");
        mr.addItem(item);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(professionalA))
                .thenReturn(List.of(mr));

        // 1. Check My Requests
        ResponseEntity<?> reqResponse = customerRequestController.getCustomerMyRequests(authProfessionalA);
        assertEquals(HttpStatus.OK, reqResponse.getStatusCode());
        List<?> reqList = (List<?>) reqResponse.getBody();
        assertEquals(1, reqList.size());
        Map<?, ?> reqCard = (Map<?, ?>) reqList.get(0);
        assertEquals("Order Accepted", reqCard.get("status"));
        assertEquals("ACCEPTED", reqCard.get("rawStatus"));

        // 2. Check My Orders
        MaterialOrder order = new MaterialOrder();
        order.setId(801L);
        order.setOrderCode("BBD-ORD-801");
        order.setBuyer(professionalA);
        order.setSeller(seller1);
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setTotalAmount(45000.0);
        order.setMaterialRequest(mr);
        order.setCreatedAt(LocalDateTime.now());

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(professionalA.getId()))
                .thenReturn(List.of(order));

        ResponseEntity<?> ordersResponse = materialOrderController.getCustomerMyOrders(authProfessionalA);
        assertEquals(HttpStatus.OK, ordersResponse.getStatusCode());
        List<?> orderList = (List<?>) ordersResponse.getBody();
        assertNotNull(orderList);
        assertEquals(1, orderList.size());

        Map<?, ?> orderCard = (Map<?, ?>) orderList.get(0);
        assertEquals("BBD-ORD-801", orderCard.get("orderCode"));
        assertEquals("ORDER_ACCEPTED", orderCard.get("orderStatus"));
        assertEquals("Apex Building Supplies", orderCard.get("sellerName"));
    }

    @Test
    @DisplayName("Test 3: Professional user isolation - Professional A cannot see Professional B's requests or orders")
    public void test03_ProfessionalUserIsolation() {
        MaterialRequest mrA = new MaterialRequest();
        mrA.setId(701L);
        mrA.setBuyer(professionalA);

        MaterialRequest mrB = new MaterialRequest();
        mrB.setId(702L);
        mrB.setBuyer(professionalB);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(professionalA))
                .thenReturn(List.of(mrA));
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(professionalB))
                .thenReturn(List.of(mrB));

        // Professional A request check
        ResponseEntity<?> resA = customerRequestController.getCustomerMyRequests(authProfessionalA);
        List<?> listA = (List<?>) resA.getBody();
        assertEquals(1, listA.size());
        assertEquals(701L, ((Map<?, ?>) listA.get(0)).get("backendId"));

        // Professional B request check
        ResponseEntity<?> resB = customerRequestController.getCustomerMyRequests(authProfessionalB);
        List<?> listB = (List<?>) resB.getBody();
        assertEquals(1, listB.size());
        assertEquals(702L, ((Map<?, ?>) listB.get(0)).get("backendId"));

        // Order isolation
        MaterialOrder orderA = new MaterialOrder();
        orderA.setId(801L);
        orderA.setBuyer(professionalA);
        orderA.setOrderStatus("ORDER_ACCEPTED");

        MaterialOrder orderB = new MaterialOrder();
        orderB.setId(802L);
        orderB.setBuyer(professionalB);
        orderB.setOrderStatus("ORDER_ACCEPTED");

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(professionalA.getId()))
                .thenReturn(List.of(orderA));
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(professionalB.getId()))
                .thenReturn(List.of(orderB));

        ResponseEntity<?> ordersA = materialOrderController.getCustomerMyOrders(authProfessionalA);
        assertEquals(1, ((List<?>) ordersA.getBody()).size());
        assertEquals(801L, ((Map<?, ?>) ((List<?>) ordersA.getBody()).get(0)).get("id"));

        ResponseEntity<?> ordersB = materialOrderController.getCustomerMyOrders(authProfessionalB);
        assertEquals(1, ((List<?>) ordersB.getBody()).size());
        assertEquals(802L, ((Map<?, ?>) ((List<?>) ordersB.getBody()).get(0)).get("id"));
    }

    @Test
    @DisplayName("Test 4: Non-buyer Seller is blocked with 403 Forbidden on Professional/Buyer endpoints")
    public void test04_NonBuyerRoleBlockedFromMyOrdersAndMyRequests() {
        ResponseEntity<?> ordersRes = materialOrderController.getCustomerMyOrders(authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, ordersRes.getStatusCode());

        ResponseEntity<?> buyerOrdersRes = materialOrderController.getBuyerOrders(authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, buyerOrdersRes.getStatusCode());

        ResponseEntity<?> reqRes = customerRequestController.getCustomerMyRequests(authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, reqRes.getStatusCode());
    }

    @Test
    @DisplayName("Test 5: Professional access through /buyer endpoint returns accepted orders")
    public void test05_ProfessionalBuyerEndpointAccessible() {
        MaterialOrder order = new MaterialOrder();
        order.setId(801L);
        order.setOrderCode("BBD-ORD-801");
        order.setBuyer(professionalA);
        order.setSeller(seller1);
        order.setOrderStatus("PROCESSING");
        order.setTotalAmount(45000.0);

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(professionalA.getId()))
                .thenReturn(List.of(order));

        ResponseEntity<?> response = materialOrderController.getBuyerOrders(authProfessionalA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
        assertEquals("BBD-ORD-801", ((Map<?, ?>) list.get(0)).get("orderCode"));
    }

    @Test
    @DisplayName("Test 6: Order details by ID allows owner Professional and blocks unauthorized users")
    public void test06_GetOrderByIdAccessControl() {
        MaterialOrder order = new MaterialOrder();
        order.setId(801L);
        order.setOrderCode("BBD-ORD-801");
        order.setBuyer(professionalA);
        order.setSeller(seller1);
        order.setOrderStatus("ORDER_ACCEPTED");

        when(materialOrderRepository.findById(801L)).thenReturn(Optional.of(order));

        // Allowed: Owner Professional A
        ResponseEntity<?> okResponse = materialOrderController.getOrderById(801L, authProfessionalA);
        assertEquals(HttpStatus.OK, okResponse.getStatusCode());

        // Blocked: Professional B (unauthorized third party)
        ResponseEntity<?> forbiddenResponse = materialOrderController.getOrderById(801L, authProfessionalB);
        assertEquals(HttpStatus.FORBIDDEN, forbiddenResponse.getStatusCode());
    }

    @Test
    @DisplayName("Test 7: SERVICE_PROVIDER legacy role can access buyer requests, orders, and details")
    public void test07_ServiceProviderRoleCanAccessBuyerRequestsAndOrders() {
        // 1. My Requests access for SERVICE_PROVIDER
        MaterialRequest mrSP = new MaterialRequest();
        mrSP.setId(703L);
        mrSP.setRequestId("DMR-703");
        mrSP.setRequestType("DIRECT_MATERIAL");
        mrSP.setBuyer(serviceProviderUser);
        mrSP.setBuyerRole("PROFESSIONAL");
        mrSP.setTargetSeller(seller1);
        mrSP.setStatus("WAITING_FOR_ACCEPTANCE");
        mrSP.setEstimatedTotal(25000.0);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(serviceProviderUser))
                .thenReturn(List.of(mrSP));

        ResponseEntity<?> reqResp = customerRequestController.getCustomerMyRequests(authServiceProvider);
        assertEquals(HttpStatus.OK, reqResp.getStatusCode());
        List<?> reqList = (List<?>) reqResp.getBody();
        assertNotNull(reqList);
        assertEquals(1, reqList.size());
        assertEquals("DMR-703", ((Map<?, ?>) reqList.get(0)).get("id"));

        // 2. My Orders access for SERVICE_PROVIDER
        MaterialOrder orderSP = new MaterialOrder();
        orderSP.setId(803L);
        orderSP.setOrderCode("BBD-ORD-803");
        orderSP.setBuyer(serviceProviderUser);
        orderSP.setSeller(seller1);
        orderSP.setOrderStatus("ORDER_ACCEPTED");
        orderSP.setTotalAmount(25000.0);
        orderSP.setMaterialRequest(mrSP);

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(serviceProviderUser.getId()))
                .thenReturn(List.of(orderSP));

        ResponseEntity<?> ordersResp = materialOrderController.getCustomerMyOrders(authServiceProvider);
        assertEquals(HttpStatus.OK, ordersResp.getStatusCode());
        List<?> orderList = (List<?>) ordersResp.getBody();
        assertNotNull(orderList);
        assertEquals(1, orderList.size());
        assertEquals("BBD-ORD-803", ((Map<?, ?>) orderList.get(0)).get("orderCode"));

        // 3. /buyer endpoint access for SERVICE_PROVIDER
        ResponseEntity<?> buyerOrdersResp = materialOrderController.getBuyerOrders(authServiceProvider);
        assertEquals(HttpStatus.OK, buyerOrdersResp.getStatusCode());
        assertEquals(1, ((List<?>) buyerOrdersResp.getBody()).size());

        // 4. Order by ID for owner SERVICE_PROVIDER
        when(materialOrderRepository.findById(803L)).thenReturn(Optional.of(orderSP));
        ResponseEntity<?> orderDetailResp = materialOrderController.getOrderById(803L, authServiceProvider);
        assertEquals(HttpStatus.OK, orderDetailResp.getStatusCode());
    }

    @Test
    @DisplayName("Test 8: SERVICE_PROVIDER user isolation - cross-access with other buyers is blocked")
    public void test08_ServiceProviderUserIsolationAndCrossAccessBlocked() {
        MaterialRequest mrSP = new MaterialRequest();
        mrSP.setId(703L);
        mrSP.setBuyer(serviceProviderUser);

        MaterialRequest mrProA = new MaterialRequest();
        mrProA.setId(701L);
        mrProA.setBuyer(professionalA);

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(serviceProviderUser))
                .thenReturn(List.of(mrSP));
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(professionalA))
                .thenReturn(List.of(mrProA));

        // Requests isolation
        ResponseEntity<?> resSP = customerRequestController.getCustomerMyRequests(authServiceProvider);
        List<?> listSP = (List<?>) resSP.getBody();
        assertEquals(1, listSP.size());
        assertEquals(703L, ((Map<?, ?>) listSP.get(0)).get("backendId"));

        // Orders isolation
        MaterialOrder orderSP = new MaterialOrder();
        orderSP.setId(803L);
        orderSP.setBuyer(serviceProviderUser);
        orderSP.setOrderStatus("ORDER_ACCEPTED");

        MaterialOrder orderProA = new MaterialOrder();
        orderProA.setId(801L);
        orderProA.setBuyer(professionalA);
        orderProA.setOrderStatus("ORDER_ACCEPTED");

        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(serviceProviderUser.getId()))
                .thenReturn(List.of(orderSP));
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(professionalA.getId()))
                .thenReturn(List.of(orderProA));

        ResponseEntity<?> ordersSP = materialOrderController.getCustomerMyOrders(authServiceProvider);
        assertEquals(1, ((List<?>) ordersSP.getBody()).size());
        assertEquals(803L, ((Map<?, ?>) ((List<?>) ordersSP.getBody()).get(0)).get("id"));

        // Cross-access order details by ID: Professional A cannot view SERVICE_PROVIDER order
        when(materialOrderRepository.findById(803L)).thenReturn(Optional.of(orderSP));
        ResponseEntity<?> crossResp1 = materialOrderController.getOrderById(803L, authProfessionalA);
        assertEquals(HttpStatus.FORBIDDEN, crossResp1.getStatusCode());

        // Cross-access order details by ID: SERVICE_PROVIDER cannot view Professional A order
        when(materialOrderRepository.findById(801L)).thenReturn(Optional.of(orderProA));
        ResponseEntity<?> crossResp2 = materialOrderController.getOrderById(801L, authServiceProvider);
        assertEquals(HttpStatus.FORBIDDEN, crossResp2.getStatusCode());
    }

    @Test
    @DisplayName("Test 9: All 4 buyer roles (CUSTOMER, CONTRACTOR, PROFESSIONAL, SERVICE_PROVIDER) allowed, SELLER forbidden")
    public void test09_AllAllowedBuyerRolesPermittedAndSellerBlocked() {
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        // CUSTOMER
        assertEquals(HttpStatus.OK, customerRequestController.getCustomerMyRequests(authCustomer).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getCustomerMyOrders(authCustomer).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getBuyerOrders(authCustomer).getStatusCode());

        // CONTRACTOR
        assertEquals(HttpStatus.OK, customerRequestController.getCustomerMyRequests(authContractor).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getCustomerMyOrders(authContractor).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getBuyerOrders(authContractor).getStatusCode());

        // PROFESSIONAL
        assertEquals(HttpStatus.OK, customerRequestController.getCustomerMyRequests(authProfessionalA).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getCustomerMyOrders(authProfessionalA).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getBuyerOrders(authProfessionalA).getStatusCode());

        // SERVICE_PROVIDER
        assertEquals(HttpStatus.OK, customerRequestController.getCustomerMyRequests(authServiceProvider).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getCustomerMyOrders(authServiceProvider).getStatusCode());
        assertEquals(HttpStatus.OK, materialOrderController.getBuyerOrders(authServiceProvider).getStatusCode());

        // SELLER / non-buyer is FORBIDDEN
        assertEquals(HttpStatus.FORBIDDEN, customerRequestController.getCustomerMyRequests(authSeller1).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, materialOrderController.getCustomerMyOrders(authSeller1).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, materialOrderController.getBuyerOrders(authSeller1).getStatusCode());
    }
}
