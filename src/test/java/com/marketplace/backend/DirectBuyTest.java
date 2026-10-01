package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class DirectBuyTest {

    private MaterialRepository materialRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private MaterialRequestRepository materialRequestRepository;
    private GeoLocationService geoLocationService;

    private DirectBuyController directBuyController;
    private MaterialRequestController materialRequestController;

    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;
    private MarketplaceBackendApplication.MarketplaceUser otherSellerUser;

    private Authentication authCustomer;
    private Authentication authContractor;
    private Authentication authSeller;
    private Authentication authOtherSeller;

    @BeforeEach
    public void setup() {
        materialRepository = mock(MaterialRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        geoLocationService = new GeoLocationService();

        directBuyController = new DirectBuyController(
                materialRepository,
                materialRequestRepository,
                userRepository,
                geoLocationService
        );

        materialRequestController = new MaterialRequestController(
                materialRequestRepository,
                userRepository,
                geoLocationService
        );

        // Setup Customer
        customerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerUser, "id", 1L);
        customerUser.setEmail("customer@buildbid.com");
        customerUser.setName("Rajesh Sharma");
        customerUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CUSTOMER));

        // Setup Contractor
        contractorUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorUser, "id", 2L);
        contractorUser.setEmail("contractor@buildbid.com");
        contractorUser.setName("Apex Infra");
        contractorUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.CONTRACTOR));

        // Setup Targeted Seller
        sellerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(sellerUser, "id", 101L);
        sellerUser.setEmail("seller@buildbid.com");
        sellerUser.setName("Gupta Building Materials");
        sellerUser.setLocation("Sector 62, Noida, Uttar Pradesh, 201301");
        sellerUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.MATERIAL_SELLER));

        // Setup Other Seller
        otherSellerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(otherSellerUser, "id", 102L);
        otherSellerUser.setEmail("otherseller@buildbid.com");
        otherSellerUser.setName("Other Materials Co");
        otherSellerUser.setLocation("Lucknow, Uttar Pradesh, 226001");
        otherSellerUser.setRoles(Collections.singleton(MarketplaceBackendApplication.Role.MATERIAL_SELLER));

        // Setup Auth mocks
        authCustomer = mock(Authentication.class);
        when(authCustomer.getName()).thenReturn("customer@buildbid.com");

        authContractor = mock(Authentication.class);
        when(authContractor.getName()).thenReturn("contractor@buildbid.com");

        authSeller = mock(Authentication.class);
        when(authSeller.getName()).thenReturn("seller@buildbid.com");

        authOtherSeller = mock(Authentication.class);
        when(authOtherSeller.getName()).thenReturn("otherseller@buildbid.com");

        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(customerUser));
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(sellerUser));
        when(userRepository.findByEmail("otherseller@buildbid.com")).thenReturn(Optional.of(otherSellerUser));
    }

    @Test
    public void testAvailableMaterialsEndpoint() {
        Material m1 = new Material();
        m1.setMaterialName("UltraTech Cement");
        m1.setCategory("Cement");
        m1.setUnit("Bag");
        m1.setCurrentStock(100.0);
        m1.setReservedStock(0.0);

        Material m2 = new Material();
        m2.setMaterialName("TMT Steel 500D");
        m2.setCategory("Steel");
        m2.setUnit("Ton");
        m2.setCurrentStock(50.0);
        m2.setReservedStock(10.0);

        when(materialRepository.findAll()).thenReturn(Arrays.asList(m1, m2));

        ResponseEntity<?> response = directBuyController.getAvailableMaterials();
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> list = (List<Map<String, Object>>) response.getBody();
        assertNotNull(list);
        assertTrue(list.size() >= 3); // UltraTech Cement, TMT Steel, and "Other"

        boolean hasCement = list.stream().anyMatch(m -> "UltraTech Cement".equals(m.get("name")));
        boolean hasSteel = list.stream().anyMatch(m -> "TMT Steel 500D".equals(m.get("name")));
        boolean hasOther = list.stream().anyMatch(m -> m.get("name") != null && m.get("name").toString().contains("Other"));

        assertTrue(hasCement);
        assertTrue(hasSteel);
        assertTrue(hasOther);
    }

    @Test
    public void testSellerMatchingOnlyMatchesSelectedMaterial() {
        Material cementMat = new Material();
        ReflectionTestUtils.setField(cementMat, "id", 501L);
        cementMat.setSeller(sellerUser);
        cementMat.setMaterialName("UltraTech Cement");
        cementMat.setCategory("Cement");
        cementMat.setUnit("Bag");
        cementMat.setUnitPrice(420.0);
        cementMat.setCurrentStock(100.0);
        cementMat.setReservedStock(10.0); // available = 90
        cementMat.setTransportationPolicyEnabled(true);
        cementMat.setTransportationChargeBasis("Per Unit");
        cementMat.setTransportationRate(10.0);
        cementMat.setDeliveryRadiusKm(50.0);

        Material steelMat = new Material();
        ReflectionTestUtils.setField(steelMat, "id", 502L);
        steelMat.setSeller(sellerUser);
        steelMat.setMaterialName("TMT Steel 500D");
        steelMat.setCategory("Steel");
        steelMat.setUnit("Ton");
        steelMat.setUnitPrice(55000.0);
        steelMat.setCurrentStock(20.0);
        steelMat.setReservedStock(0.0);

        when(materialRepository.findAll()).thenReturn(Arrays.asList(cementMat, steelMat));

        Map<String, Object> req = new HashMap<>();
        req.put("materialName", "UltraTech Cement");
        req.put("quantity", 50);
        req.put("state", "Uttar Pradesh");
        req.put("city", "Noida");
        req.put("pincode", "201301");
        req.put("address", "Sector 62, Noida");

        ResponseEntity<?> response = directBuyController.findMatchingSellers(req);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue((Boolean) body.get("success"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sellers = (List<Map<String, Object>>) body.get("sellers");
        assertEquals(1, sellers.size());

        Map<String, Object> sellerCard = sellers.get(0);
        assertEquals("Gupta Building Materials", sellerCard.get("sellerName"));
        assertEquals("UltraTech Cement", sellerCard.get("materialName"));
        assertEquals(90.0, ((Number) sellerCard.get("availableStock")).doubleValue(), 0.01);
        assertEquals(420.0, ((Number) sellerCard.get("unitPrice")).doubleValue(), 0.01);
        // Transport: 50 bags * 10 = 500
        assertEquals(500.0, ((Number) sellerCard.get("transportationCost")).doubleValue(), 0.01);
    }

    @Test
    public void testSellerMatchingStockValidationExcludesInsufficientStock() {
        Material cementMat = new Material();
        ReflectionTestUtils.setField(cementMat, "id", 501L);
        cementMat.setSeller(sellerUser);
        cementMat.setMaterialName("UltraTech Cement");
        cementMat.setUnit("Bag");
        cementMat.setUnitPrice(420.0);
        cementMat.setCurrentStock(50.0);
        cementMat.setReservedStock(10.0); // available stock = 40

        when(materialRepository.findAll()).thenReturn(Collections.singletonList(cementMat));

        Map<String, Object> req = new HashMap<>();
        req.put("materialName", "UltraTech Cement");
        req.put("quantity", 100); // Buyer requests 100, but only 40 available
        req.put("state", "Uttar Pradesh");
        req.put("city", "Noida");
        req.put("pincode", "201301");

        ResponseEntity<?> response = directBuyController.findMatchingSellers(req);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sellers = (List<Map<String, Object>>) body.get("sellers");
        assertEquals(0, sellers.size(), "Seller with insufficient stock must be excluded from results");
    }

    @Test
    public void testCreateDirectBuyRequest_PointInTimeSnapshotAndRole() {
        Material cementMat = new Material();
        ReflectionTestUtils.setField(cementMat, "id", 501L);
        cementMat.setSeller(sellerUser);
        cementMat.setMaterialName("UltraTech Cement");
        cementMat.setUnit("Bag");
        cementMat.setUnitPrice(420.0);
        cementMat.setCurrentStock(100.0);
        cementMat.setReservedStock(0.0);
        cementMat.setTransportationPolicyEnabled(true);
        cementMat.setTransportationChargeBasis("Fixed Flat");
        cementMat.setTransportationRate(500.0);
        cementMat.setDeliveryRadiusKm(50.0);

        when(userRepository.findById(101L)).thenReturn(Optional.of(sellerUser));
        when(materialRepository.findById(501L)).thenReturn(Optional.of(cementMat));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(invocation -> {
            MaterialRequest mr = invocation.getArgument(0);
            ReflectionTestUtils.setField(mr, "id", 999L);
            return mr;
        });

        Map<String, Object> payload = new HashMap<>();
        payload.put("sellerId", 101L);
        payload.put("materialId", 501L);
        payload.put("materialName", "UltraTech Cement");
        payload.put("quantity", 50);
        payload.put("unit", "Bag");
        payload.put("state", "Uttar Pradesh");
        payload.put("city", "Noida");
        payload.put("pincode", "201301");
        payload.put("address", "Plot 42, Sector 62, Noida");

        ResponseEntity<?> response = directBuyController.createDirectBuyRequest(payload, authCustomer);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue((Boolean) body.get("success"));
        assertEquals("DIRECT_MATERIAL", body.get("requestType"));
        assertEquals(420.0, ((Number) body.get("materialPrice")).doubleValue(), 0.01);
        assertEquals(21000.0, ((Number) body.get("materialAmount")).doubleValue(), 0.01); // 50 * 420
        assertEquals(500.0, ((Number) body.get("transportationCost")).doubleValue(), 0.01);
        assertEquals(21500.0, ((Number) body.get("estimatedTotal")).doubleValue(), 0.01); // 21000 + 500

        String verificationCode = (String) body.get("verificationCode");
        assertNotNull(verificationCode);
        assertTrue(verificationCode.startsWith("BB-DM-"));
    }

    @Test
    public void testCreateDirectBuyRequest_RejectsUnauthorizedRole() {
        // Authenticated as sellerUser instead of Customer/Contractor
        Map<String, Object> payload = new HashMap<>();
        payload.put("sellerId", 101L);
        payload.put("materialId", 501L);
        payload.put("quantity", 50);

        ResponseEntity<?> response = directBuyController.createDirectBuyRequest(payload, authSeller);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    public void testSellerAcceptAndDeclineWorkflow() {
        MaterialRequest directReq = new MaterialRequest();
        ReflectionTestUtils.setField(directReq, "id", 777L);
        directReq.setRequestId("DMR-777");
        directReq.setRequestType("DIRECT_MATERIAL");
        directReq.setTargetSeller(sellerUser);
        directReq.setStatus("PENDING");

        when(materialRequestRepository.findById(777L)).thenReturn(Optional.of(directReq));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. Other seller attempts to accept -> must be rejected with 403 Forbidden
        ResponseEntity<?> rejectOther = materialRequestController.acceptRequest(777L, authOtherSeller);
        assertEquals(HttpStatus.FORBIDDEN, rejectOther.getStatusCode());

        // 2. Targeted seller accepts -> succeeds with 200 OK
        ResponseEntity<?> acceptResp = materialRequestController.acceptRequest(777L, authSeller);
        assertEquals(HttpStatus.OK, acceptResp.getStatusCode());
        assertEquals("ACCEPTED", directReq.getStatus());
        assertNotNull(directReq.getVerificationCode());
        assertTrue(directReq.getVerificationCode().startsWith("BB-DM-"));

        // 3. Targeted seller declines
        directReq.setStatus("PENDING");
        ResponseEntity<?> declineResp = materialRequestController.declineRequest(777L, authSeller);
        assertEquals(HttpStatus.OK, declineResp.getStatusCode());
        assertEquals("DECLINED", directReq.getStatus());
    }

    @Test
    public void testSellerEligibleFeedIsolatesDirectMaterialRequests() {
        // Direct request targeted exclusively to sellerUser
        MaterialRequest directForSeller = new MaterialRequest();
        ReflectionTestUtils.setField(directForSeller, "id", 1001L);
        directForSeller.setRequestType("DIRECT_MATERIAL");
        directForSeller.setTargetSeller(sellerUser);
        directForSeller.setStatus("PENDING");

        // Normal posted requirement for UP
        MaterialRequest postedReq = new MaterialRequest();
        ReflectionTestUtils.setField(postedReq, "id", 1002L);
        postedReq.setRequestType("POSTED_REQUIREMENT");
        postedReq.setRequestScope("STATE");
        postedReq.setState("Uttar Pradesh");
        postedReq.setStatus("Open");

        when(materialRequestRepository.findAll()).thenReturn(Arrays.asList(directForSeller, postedReq));
        when(materialRequestRepository.findAllByOrderByCreatedAtDesc()).thenReturn(Arrays.asList(directForSeller, postedReq));

        // 1. Check eligible requests for sellerUser -> should see both (direct targeted + state posted)
        ResponseEntity<?> sellerFeed = materialRequestController.getSellerEligibleRequests(authSeller);
        assertEquals(HttpStatus.OK, sellerFeed.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sellerList = (List<Map<String, Object>>) sellerFeed.getBody();
        assertNotNull(sellerList);
        assertEquals(2, sellerList.size());

        // 2. Check eligible requests for otherSellerUser (in Lucknow, UP) -> should see postedReq, but NOT directForSeller
        ResponseEntity<?> otherSellerFeed = materialRequestController.getSellerEligibleRequests(authOtherSeller);
        assertEquals(HttpStatus.OK, otherSellerFeed.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> otherList = (List<Map<String, Object>>) otherSellerFeed.getBody();
        assertNotNull(otherList);
        assertEquals(1, otherList.size());
        assertEquals(1002L, otherList.get(0).get("id"));
    }

    @Test
    public void testCreateDirectBuyRequest_ContractorRole() {
        Material cementMat = new Material();
        ReflectionTestUtils.setField(cementMat, "id", 501L);
        cementMat.setSeller(sellerUser);
        cementMat.setMaterialName("UltraTech Cement");
        cementMat.setUnit("Bag");
        cementMat.setUnitPrice(420.0);
        cementMat.setCurrentStock(100.0);
        cementMat.setReservedStock(0.0);

        when(userRepository.findById(101L)).thenReturn(Optional.of(sellerUser));
        when(materialRepository.findById(501L)).thenReturn(Optional.of(cementMat));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(invocation -> {
            MaterialRequest mr = invocation.getArgument(0);
            ReflectionTestUtils.setField(mr, "id", 999L);
            return mr;
        });

        Map<String, Object> payload = new HashMap<>();
        payload.put("sellerId", 101L);
        payload.put("materialId", 501L);
        payload.put("materialName", "UltraTech Cement");
        payload.put("quantity", 30);
        payload.put("state", "Uttar Pradesh");
        payload.put("city", "Noida");
        payload.put("pincode", "201301");
        payload.put("deliveryAddress", "Noida Expressway Project Site");

        ResponseEntity<?> response = directBuyController.createDirectBuyRequest(payload, authContractor);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("CONTRACTOR", body.get("buyerRole"));
        assertEquals("DIRECT_MATERIAL", body.get("requestType"));
    }

    @Test
    public void testCreateDirectBuyRequest_StockExhaustedConcurrencyRejection() {
        Material cementMat = new Material();
        ReflectionTestUtils.setField(cementMat, "id", 501L);
        cementMat.setSeller(sellerUser);
        cementMat.setMaterialName("UltraTech Cement");
        cementMat.setUnit("Bag");
        cementMat.setUnitPrice(420.0);
        cementMat.setCurrentStock(30.0);
        cementMat.setReservedStock(25.0); // Only 5 bags available

        when(userRepository.findById(101L)).thenReturn(Optional.of(sellerUser));
        when(materialRepository.findById(501L)).thenReturn(Optional.of(cementMat));

        Map<String, Object> payload = new HashMap<>();
        payload.put("sellerId", 101L);
        payload.put("materialId", 501L);
        payload.put("quantity", 50); // Requested 50 > 5 available
        payload.put("state", "Uttar Pradesh");
        payload.put("city", "Noida");
        payload.put("pincode", "201301");
        payload.put("deliveryAddress", "Plot 42, Sector 62, Noida");

        ResponseEntity<?> response = directBuyController.createDirectBuyRequest(payload, authCustomer);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(body.get("error").toString().contains("Insufficient stock"));
    }

    @Test
    public void testCreateDirectBuyRequest_OtherMaterial() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(sellerUser));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(invocation -> {
            MaterialRequest mr = invocation.getArgument(0);
            ReflectionTestUtils.setField(mr, "id", 888L);
            return mr;
        });

        Map<String, Object> payload = new HashMap<>();
        payload.put("sellerId", 101L);
        payload.put("materialId", null); // Custom material
        payload.put("isOther", true);
        payload.put("customMaterialName", "White Quartz Gravel");
        payload.put("unit", "Ton");
        payload.put("unitPrice", 1800.0);
        payload.put("quantity", 10);
        payload.put("state", "Uttar Pradesh");
        payload.put("city", "Noida");
        payload.put("pincode", "201301");
        payload.put("deliveryAddress", "Garden Site 12, Noida");

        ResponseEntity<?> response = directBuyController.createDirectBuyRequest(payload, authCustomer);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("White Quartz Gravel", body.get("materialName"));
        assertEquals("DIRECT_MATERIAL", body.get("requestType"));
        assertEquals(18000.0, ((Number) body.get("materialAmount")).doubleValue(), 0.01);
    }
}
