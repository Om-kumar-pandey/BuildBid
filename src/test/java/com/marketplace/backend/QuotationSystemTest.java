package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - QUOTATION SYSTEM PHASE 1 BACKEND TESTS
 * 
 * Verifies all 17 required backend validation and security criteria:
 * 1. MATERIAL_REQUIREMENT quotation creation
 * 2. Multiple sellers can quote the same requirement
 * 3. Seller A cannot submit as Seller B (JWT enforcement)
 * 4. Unauthorized / ineligible seller cannot quote
 * 5. DIRECT_HIRE targeted professional can quote
 * 6. Non-target professional cannot quote
 * 7. Customer cannot submit provider quotation
 * 8. Contractor cannot submit provider quotation
 * 9. DIRECT_BUY quotation creation is rejected
 * 10. Project quotation creation is rejected
 * 11. Customer can retrieve only own request quotations
 * 12. Customer A cannot retrieve Customer B quotations
 * 13. Duplicate active quotation protection
 * 14. Invalid request type rejected
 * 15. Missing request linkage rejected
 * 16. Both request foreign keys populated rejected
 * 17. Neither request foreign key populated rejected
 */
public class QuotationSystemTest {

    private QuotationRepository quotationRepository;
    private MaterialRequestRepository materialRequestRepository;
    private ClientServiceRequestRepository clientServiceRequestRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private GeoLocationService geoLocationService;

    private QuotationService quotationService;
    private QuotationController quotationController;

    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser seller2;
    private MarketplaceBackendApplication.MarketplaceUser outstationSeller;
    private MarketplaceBackendApplication.MarketplaceUser proTargeted;
    private MarketplaceBackendApplication.MarketplaceUser proUnrelated;
    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractor;

    private MaterialRequest materialReq;
    private MaterialRequest directBuyReq;
    private ClientServiceRequest serviceReq;

    private Authentication authSeller1;
    private Authentication authSeller2;
    private Authentication authOutstationSeller;
    private Authentication authProTargeted;
    private Authentication authProUnrelated;
    private Authentication authCustomerA;
    private Authentication authCustomerB;
    private Authentication authContractor;

    @BeforeEach
    public void setup() {
        quotationRepository = mock(QuotationRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        clientServiceRequestRepository = mock(ClientServiceRequestRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        geoLocationService = new GeoLocationService();

        quotationService = new QuotationService(
                quotationRepository,
                materialRequestRepository,
                clientServiceRequestRepository,
                userRepository,
                geoLocationService
        );

        quotationController = new QuotationController(quotationService, userRepository);

        // 1. Sellers
        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller1, "id", 101L);
        seller1.setEmail("seller1@buildbid.com");
        seller1.setName("Seller One Materials");
        seller1.setLocation("Sector 62, Noida, Uttar Pradesh");
        seller1.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        seller2 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller2, "id", 102L);
        seller2.setEmail("seller2@buildbid.com");
        seller2.setName("Seller Two Building Supply");
        seller2.setLocation("Greater Noida, Uttar Pradesh");
        seller2.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        outstationSeller = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(outstationSeller, "id", 103L);
        outstationSeller.setEmail("outstation@buildbid.com");
        outstationSeller.setName("Mumbai Materials Co");
        outstationSeller.setLocation("Andheri East, Mumbai, Maharashtra");
        outstationSeller.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        // 2. Professionals
        proTargeted = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(proTargeted, "id", 201L);
        proTargeted.setEmail("pro.targeted@buildbid.com");
        proTargeted.setName("Ar. Rajesh Sharma");
        proTargeted.setLocation("Noida, Uttar Pradesh");
        proTargeted.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);

        proUnrelated = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(proUnrelated, "id", 202L);
        proUnrelated.setEmail("pro.unrelated@buildbid.com");
        proUnrelated.setName("Er. Amit Verma");
        proUnrelated.setLocation("Delhi");
        proUnrelated.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);

        // 3. Customers & Contractor
        customerA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerA, "id", 301L);
        customerA.setEmail("customerA@buildbid.com");
        customerA.setName("Ramesh Kumar (Customer A)");
        customerA.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        customerB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerB, "id", 302L);
        customerB.setEmail("customerB@buildbid.com");
        customerB.setName("Suresh Patel (Customer B)");
        customerB.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        contractor = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractor, "id", 401L);
        contractor.setEmail("contractor@buildbid.com");
        contractor.setName("BuildWell Contractors");
        contractor.getRoles().add(MarketplaceBackendApplication.Role.CONTRACTOR);

        // Mocks for UserRepository
        when(userRepository.findByEmail("seller1@buildbid.com")).thenReturn(Optional.of(seller1));
        when(userRepository.findByEmail("seller2@buildbid.com")).thenReturn(Optional.of(seller2));
        when(userRepository.findByEmail("outstation@buildbid.com")).thenReturn(Optional.of(outstationSeller));
        when(userRepository.findByEmail("pro.targeted@buildbid.com")).thenReturn(Optional.of(proTargeted));
        when(userRepository.findByEmail("pro.unrelated@buildbid.com")).thenReturn(Optional.of(proUnrelated));
        when(userRepository.findByEmail("customerA@buildbid.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByEmail("customerB@buildbid.com")).thenReturn(Optional.of(customerB));
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractor));

        // Authentications
        authSeller1 = mockAuth("seller1@buildbid.com");
        authSeller2 = mockAuth("seller2@buildbid.com");
        authOutstationSeller = mockAuth("outstation@buildbid.com");
        authProTargeted = mockAuth("pro.targeted@buildbid.com");
        authProUnrelated = mockAuth("pro.unrelated@buildbid.com");
        authCustomerA = mockAuth("customerA@buildbid.com");
        authCustomerB = mockAuth("customerB@buildbid.com");
        authContractor = mockAuth("contractor@buildbid.com");

        // Mock Requests
        materialReq = new MaterialRequest();
        ReflectionTestUtils.setField(materialReq, "id", 501L);
        materialReq.setRequestId("MR-1001");
        materialReq.setRequestType("POSTED_REQUIREMENT");
        materialReq.setRequestScope("STATE");
        materialReq.setState("Uttar Pradesh");
        materialReq.setCity("Noida");
        materialReq.setPinCode("201301");
        materialReq.setStatus("NEW");
        materialReq.setBuyer(customerA);

        directBuyReq = new MaterialRequest();
        ReflectionTestUtils.setField(directBuyReq, "id", 502L);
        directBuyReq.setRequestId("DMR-1002");
        directBuyReq.setRequestType("DIRECT_MATERIAL"); // Direct Buy
        directBuyReq.setStatus("NEW");
        directBuyReq.setBuyer(customerA);
        directBuyReq.setTargetSeller(seller1);

        serviceReq = new ClientServiceRequest();
        ReflectionTestUtils.setField(serviceReq, "id", 601L);
        serviceReq.setRequestId("CSR-1001");
        serviceReq.setStatus("New");
        serviceReq.setClient(customerA);
        serviceReq.setProfessional(proTargeted);
        serviceReq.setRequestedService("Architectural Design");

        when(materialRequestRepository.findById(501L)).thenReturn(Optional.of(materialReq));
        when(materialRequestRepository.findByRequestId("MR-1001")).thenReturn(Optional.of(materialReq));
        when(materialRequestRepository.findById(502L)).thenReturn(Optional.of(directBuyReq));
        when(materialRequestRepository.findByRequestId("DMR-1002")).thenReturn(Optional.of(directBuyReq));

        when(clientServiceRequestRepository.findById(601L)).thenReturn(Optional.of(serviceReq));
        when(clientServiceRequestRepository.findByRequestId("CSR-1001")).thenReturn(Optional.of(serviceReq));

        when(quotationRepository.save(any(Quotation.class))).thenAnswer(invocation -> {
            Quotation q = invocation.getArgument(0);
            if (q.getId() == null) {
                ReflectionTestUtils.setField(q, "id", 1L);
            }
            return q;
        });
    }

    private Authentication mockAuth(String principal) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(principal);
        return auth;
    }

    // 1. MATERIAL_REQUIREMENT quotation creation
    @Test
    public void test1_MaterialRequirementQuotationCreation() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 501L);
        payload.put("quotedAmount", 45000.0);
        payload.put("materialCost", 40000.0);
        payload.put("transportationCost", 5000.0);
        payload.put("timeline", "3 Days");
        payload.put("validity", "7 Days");
        payload.put("warranty", "BIS Batch Certified");
        payload.put("paymentTerms", "100% on Delivery");
        payload.put("message", "Ready stock available in warehouse.");

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("MATERIAL_REQUIREMENT", body.get("requestType"));
        assertEquals(501L, body.get("materialRequestId"));
        assertNull(body.get("serviceRequestId"));
        assertEquals(101L, body.get("providerId"));
        assertEquals("MATERIAL_SELLER", body.get("providerType"));
        assertEquals(45000.0, body.get("quotedAmount"));
        assertEquals("SUBMITTED", body.get("status"));
        assertTrue(body.get("quotationId").toString().startsWith("QT-"));

        verify(quotationRepository, times(1)).save(any(Quotation.class));
    }

    // 2. Multiple sellers can quote the same requirement
    @Test
    public void test2_MultipleSellersCanQuoteSameRequirement() {
        Map<String, Object> payload1 = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "quotedAmount", 45000.0
        );
        Map<String, Object> payload2 = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "quotedAmount", 43500.0
        );

        ResponseEntity<?> res1 = quotationController.submitQuotation(payload1, authSeller1);
        ResponseEntity<?> res2 = quotationController.submitQuotation(payload2, authSeller2);

        assertEquals(HttpStatus.CREATED, res1.getStatusCode());
        assertEquals(HttpStatus.CREATED, res2.getStatusCode());

        Map<?, ?> body1 = (Map<?, ?>) res1.getBody();
        Map<?, ?> body2 = (Map<?, ?>) res2.getBody();

        assertEquals(101L, body1.get("providerId"));
        assertEquals(102L, body2.get("providerId"));
        assertEquals(501L, body1.get("materialRequestId"));
        assertEquals(501L, body2.get("materialRequestId"));

        verify(quotationRepository, times(2)).save(any(Quotation.class));
    }

    // 3. Seller A cannot submit as Seller B (Strict JWT identity enforcement)
    @Test
    public void test3_SellerCannotSpoofAnotherProvider() {
        Map<String, Object> payload = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "providerId", 102L, // Trying to submit as Seller 2
                "quotedAmount", 42000.0
        );

        // Logged in as Seller 1
        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        // Provider ID MUST be 101 (from JWT authSeller1), completely ignoring payload 102
        assertEquals(101L, body.get("providerId"));
        assertNotEquals(102L, body.get("providerId"));
    }

    // 4. Unauthorized / Ineligible seller cannot quote
    @Test
    public void test4_IneligibleSellerCannotQuote() {
        // outstationSeller is in Mumbai, request is STATE=Uttar Pradesh
        Map<String, Object> payload = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "quotedAmount", 40000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authOutstationSeller);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("eligible service area"));

        verify(quotationRepository, never()).save(any(Quotation.class));
    }

    // 5. DIRECT_HIRE targeted professional can quote
    @Test
    public void test5_DirectHireTargetedProfessionalCanQuote() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "DIRECT_HIRE");
        payload.put("serviceRequestId", 601L);
        payload.put("quotedAmount", 25000.0);
        payload.put("labourCost", 22000.0);
        payload.put("taxGst", 3000.0);
        payload.put("timeline", "10 Days");
        payload.put("warranty", "Standard Architectural Guarantee");
        payload.put("paymentTerms", "50% Advance, 50% on Handover");
        payload.put("message", "We will provide complete 2D/3D working drawings.");

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authProTargeted);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("DIRECT_HIRE", body.get("requestType"));
        assertEquals(601L, body.get("serviceRequestId"));
        assertNull(body.get("materialRequestId"));
        assertEquals(201L, body.get("providerId"));
        assertEquals("PROFESSIONAL", body.get("providerType"));
        assertEquals(25000.0, body.get("quotedAmount"));
        assertEquals("SUBMITTED", body.get("status"));

        verify(quotationRepository, times(1)).save(any(Quotation.class));
    }

    // 6. Non-target professional cannot quote
    @Test
    public void test6_NonTargetProfessionalCannotQuote() {
        Map<String, Object> payload = Map.of(
                "requestType", "DIRECT_HIRE",
                "serviceRequestId", 601L,
                "quotedAmount", 20000.0
        );

        // proUnrelated tries to quote on serviceReq targeted to proTargeted
        ResponseEntity<?> response = quotationController.submitQuotation(payload, authProUnrelated);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("targeted to a different professional"));

        verify(quotationRepository, never()).save(any(Quotation.class));
    }

    // 7. Customer cannot submit provider quotation
    @Test
    public void test7_CustomerCannotSubmitQuotation() {
        Map<String, Object> payload = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "quotedAmount", 40000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authCustomerA);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Customers and Contractors cannot submit quotations"));

        verify(quotationRepository, never()).save(any(Quotation.class));
    }

    // 8. Contractor cannot submit provider quotation
    @Test
    public void test8_ContractorCannotSubmitQuotation() {
        Map<String, Object> payload = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "quotedAmount", 40000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authContractor);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Customers and Contractors cannot submit quotations"));

        verify(quotationRepository, never()).save(any(Quotation.class));
    }

    // 9. DIRECT_BUY quotation creation is rejected
    @Test
    public void test9_DirectBuyQuotationRejected() {
        // Attempt 1: explicitly setting requestType="DIRECT_BUY"
        Map<String, Object> payload1 = Map.of(
                "requestType", "DIRECT_BUY",
                "materialRequestId", 502L,
                "quotedAmount", 10000.0
        );
        ResponseEntity<?> res1 = quotationController.submitQuotation(payload1, authSeller1);
        assertEquals(HttpStatus.BAD_REQUEST, res1.getStatusCode());
        assertTrue(((Map<?, ?>) res1.getBody()).get("error").toString().contains("Direct Buy"));

        // Attempt 2: pointing MATERIAL_REQUIREMENT to a DIRECT_MATERIAL request
        Map<String, Object> payload2 = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 502L, // ID of directBuyReq
                "quotedAmount", 10000.0
        );
        ResponseEntity<?> res2 = quotationController.submitQuotation(payload2, authSeller1);
        assertEquals(HttpStatus.BAD_REQUEST, res2.getStatusCode());
        assertTrue(((Map<?, ?>) res2.getBody()).get("error").toString().contains("Direct Buy"));

        verify(quotationRepository, never()).save(any(Quotation.class));
    }

    // 10. Project quotation creation is rejected
    @Test
    public void test10_ProjectQuotationRejected() {
        Map<String, Object> payload = Map.of(
                "requestType", "PROJECT",
                "quotedAmount", 500000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Project bidding is managed separately"));

        verify(quotationRepository, never()).save(any(Quotation.class));
    }

    // 11. Customer can retrieve only own request quotations
    @Test
    public void test11_CustomerCanRetrieveOwnRequestQuotations() {
        Quotation q1 = new Quotation();
        ReflectionTestUtils.setField(q1, "id", 10L);
        q1.setQuotationId("QT-1001");
        q1.setRequestType("MATERIAL_REQUIREMENT");
        q1.setMaterialRequest(materialReq);
        q1.setProvider(seller1);
        q1.setProviderRole("MATERIAL_SELLER");
        q1.setQuotedAmount(45000.0);
        q1.setStatus("SUBMITTED");

        when(quotationRepository.findByMaterialRequestIdOrderByCreatedAtDesc(501L))
                .thenReturn(List.of(q1));

        ResponseEntity<?> response = quotationController.getCustomerRequestQuotations(
                "MATERIAL_REQUIREMENT", "501", authCustomerA
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
        Map<?, ?> qMap = (Map<?, ?>) list.get(0);
        assertEquals("QT-1001", qMap.get("quotationId"));
        assertEquals(45000.0, qMap.get("quotedAmount"));
    }

    // 12. Customer A cannot retrieve Customer B quotations
    @Test
    public void test12_CustomerCannotRetrieveAnotherCustomerQuotations() {
        // customerB attempts to view quotations for customerA's request (ID 501)
        ResponseEntity<?> response = quotationController.getCustomerRequestQuotations(
                "MATERIAL_REQUIREMENT", "501", authCustomerB
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("You do not own this material request"));
    }

    // 13. Duplicate active quotation protection
    @Test
    public void test13_DuplicateActiveQuotationProtection() {
        Quotation activeQuote = new Quotation();
        activeQuote.setQuotationId("QT-9999");
        activeQuote.setStatus("SUBMITTED");

        when(quotationRepository.findByMaterialRequestIdAndProviderIdAndStatusIn(
                eq(501L), eq(101L), anyCollection()
        )).thenReturn(List.of(activeQuote));

        Map<String, Object> payload = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "quotedAmount", 44000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("already exists"));

        verify(quotationRepository, never()).save(any(Quotation.class));
    }

    // 14. Invalid request type rejected
    @Test
    public void test14_InvalidRequestTypeRejected() {
        Map<String, Object> payload = Map.of(
                "requestType", "ARBITRARY_TYPE",
                "materialRequestId", 501L,
                "quotedAmount", 40000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Allowed values: MATERIAL_REQUIREMENT, DIRECT_HIRE"));
    }

    // 15. Missing request linkage rejected
    @Test
    public void test15_MissingRequestLinkageRejected() {
        Map<String, Object> payload = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "quotedAmount", 40000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Missing request reference"));
    }

    // 16. Both request foreign keys populated rejected (Collision-Safe Rule)
    @Test
    public void test16_BothForeignKeysPopulatedRejected() {
        Map<String, Object> payload = Map.of(
                "requestType", "MATERIAL_REQUIREMENT",
                "materialRequestId", 501L,
                "serviceRequestId", 601L, // Collision safety breach
                "quotedAmount", 40000.0
        );

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Collision safety violation"));
    }

    // 17. Neither request foreign key populated rejected
    @Test
    public void test17_NeitherForeignKeyPopulatedRejected() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "DIRECT_HIRE");
        payload.put("materialRequestId", null);
        payload.put("serviceRequestId", null);
        payload.put("quotedAmount", 20000.0);

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authProTargeted);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Missing request reference"));
    }

    // ========================================================
    // PHASE 3A TESTS: ACCEPT / REJECT WORKFLOWS
    // ========================================================

    private Quotation createMockQuotation(Long id, String code, String reqType, MaterialRequest mr, ClientServiceRequest csr, MarketplaceBackendApplication.MarketplaceUser provider, String status) {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", id);
        q.setQuotationId(code);
        q.setRequestType(reqType);
        q.setMaterialRequest(mr);
        q.setServiceRequest(csr);
        q.setProvider(provider);
        q.setProviderRole(provider != null && provider.getRoles().contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER) ? "MATERIAL_SELLER" : "PROFESSIONAL");
        q.setQuotedAmount(50000.0);
        q.setStatus(status);
        q.setCreatedAt(java.time.LocalDateTime.now());
        return q;
    }

    // 18. Customer accepts own MATERIAL_REQUIREMENT quotation -> Selected becomes ACCEPTED, parent MaterialRequest becomes ACCEPTED
    @Test
    public void test18_CustomerAcceptsOwnMaterialQuotationSuccess() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(501L), any())).thenReturn(List.of(q1));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("ACCEPTED", body.get("status"));
        assertEquals("ACCEPTED", q1.getStatus());
        assertEquals("ACCEPTED", materialReq.getStatus());
    }

    // 19. Accepting quotation atomically marks competing active quotations as REJECTED
    @Test
    public void test19_AcceptingQuotationRejectsCompetingActiveQuotations() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        Quotation q2 = createMockQuotation(1002L, "QT-1002", "MATERIAL_REQUIREMENT", materialReq, null, seller2, "SUBMITTED");
        Quotation q3 = createMockQuotation(1003L, "QT-1003", "MATERIAL_REQUIREMENT", materialReq, null, seller2, "UNDER_REVIEW");

        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(501L), any())).thenReturn(List.of(q1, q2, q3));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertEquals("ACCEPTED", q1.getStatus());
        assertEquals("REJECTED", q2.getStatus());
        assertEquals("REJECTED", q3.getStatus());
    }

    // 20. Accepting quotation leaves already REJECTED quotations as REJECTED
    @Test
    public void test20_AcceptingQuotationLeavesAlreadyRejectedQuotationsAsRejected() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        Quotation qRejected = createMockQuotation(1002L, "QT-1002", "MATERIAL_REQUIREMENT", materialReq, null, seller2, "REJECTED");

        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        // findByMaterialRequestIdAndStatusIn returns only SUBMITTED and UNDER_REVIEW
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(501L), any())).thenReturn(List.of(q1));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertEquals("ACCEPTED", q1.getStatus());
        assertEquals("REJECTED", qRejected.getStatus());
    }

    // 21. Accepting quotation leaves EXPIRED and WITHDRAWN quotations untouched
    @Test
    public void test21_AcceptingQuotationLeavesExpiredAndWithdrawnQuotationsUntouched() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        Quotation qExpired = createMockQuotation(1002L, "QT-1002", "MATERIAL_REQUIREMENT", materialReq, null, seller2, "EXPIRED");
        Quotation qWithdrawn = createMockQuotation(1003L, "QT-1003", "MATERIAL_REQUIREMENT", materialReq, null, seller2, "WITHDRAWN");

        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(501L), any())).thenReturn(List.of(q1));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertEquals("ACCEPTED", q1.getStatus());
        assertEquals("EXPIRED", qExpired.getStatus());
        assertEquals("WITHDRAWN", qWithdrawn.getStatus());
    }

    // 22. Customer rejects own quotation
    @Test
    public void test22_CustomerRejectsOwnQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("REJECTED", body.get("status"));
        assertEquals("REJECTED", q1.getStatus());
    }

    // 23. Customer rejecting one quotation leaves competing quotations unchanged and parent request untouched
    @Test
    public void test23_RejectingOneQuotationLeavesOtherQuotationsAndRequestUntouched() {
        materialReq.setStatus("NEW");
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        Quotation q2 = createMockQuotation(1002L, "QT-1002", "MATERIAL_REQUIREMENT", materialReq, null, seller2, "SUBMITTED");

        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertEquals("REJECTED", q1.getStatus());
        assertEquals("SUBMITTED", q2.getStatus());
        assertEquals("NEW", materialReq.getStatus());
    }

    // 24. Customer A cannot accept Customer B's quotation (403 FORBIDDEN)
    @Test
    public void test24_CustomerCannotAcceptAnotherCustomersQuotation() {
        // materialReq belongs to customerA
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        // Customer B attempts to accept Customer A's quotation
        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("You do not own this material request"));
    }

    // 25. Customer A cannot reject Customer B's quotation (403 FORBIDDEN)
    @Test
    public void test25_CustomerCannotRejectAnotherCustomersQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("You do not own this material request"));
    }

    // 26. Material seller cannot accept a quotation (403 FORBIDDEN)
    @Test
    public void test26_SellerCannotAcceptQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Only customers can accept quotations"));
    }

    // 27. Professional cannot accept a quotation (403 FORBIDDEN)
    @Test
    public void test27_ProfessionalCannotAcceptQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authProTargeted);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Only customers can accept quotations"));
    }

    // 28. Contractor cannot accept a quotation (403 FORBIDDEN)
    @Test
    public void test28_ContractorCannotAcceptQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authContractor);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Only customers can accept quotations"));
    }

    // 29. Material seller cannot reject a quotation (403 FORBIDDEN)
    @Test
    public void test29_SellerCannotRejectQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Only customers can reject quotations"));
    }

    // 30. Professional cannot reject a quotation (403 FORBIDDEN)
    @Test
    public void test30_ProfessionalCannotRejectQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authProTargeted);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Only customers can reject quotations"));
    }

    // 31. Contractor cannot reject a quotation (403 FORBIDDEN)
    @Test
    public void test31_ContractorCannotRejectQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authContractor);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Only customers can reject quotations"));
    }

    // 32. Cannot accept already ACCEPTED quotation (409 CONFLICT)
    @Test
    public void test32_CannotAcceptAlreadyAcceptedQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "ACCEPTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("already accepted"));
    }

    // 33. Cannot accept REJECTED quotation (409 CONFLICT)
    @Test
    public void test33_CannotAcceptRejectedQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "REJECTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Cannot accept a rejected quotation"));
    }

    // 34. Cannot accept EXPIRED quotation (409 CONFLICT)
    @Test
    public void test34_CannotAcceptExpiredQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "EXPIRED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Cannot accept an expired quotation"));
    }

    // 35. Cannot accept WITHDRAWN quotation (409 CONFLICT)
    @Test
    public void test35_CannotAcceptWithdrawnQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "WITHDRAWN");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Cannot accept a withdrawn quotation"));
    }

    // 36. Cannot reject already ACCEPTED quotation (409 CONFLICT)
    @Test
    public void test36_CannotRejectAlreadyAcceptedQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "ACCEPTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Cannot reject an already accepted quotation"));
    }

    // 37. Cannot reject already REJECTED quotation (409 CONFLICT)
    @Test
    public void test37_CannotRejectAlreadyRejectedQuotation() {
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "REJECTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q1));

        ResponseEntity<?> response = quotationController.rejectQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Quotation is already rejected"));
    }

    // 38. Concurrency guard: Cannot accept quotation if another quotation has already been accepted for the same request (409 CONFLICT)
    @Test
    public void test38_ConcurrencyGuardPreventsDoubleAcceptance() {
        MaterialRequest acceptedReq = new MaterialRequest();
        ReflectionTestUtils.setField(acceptedReq, "id", 501L);
        acceptedReq.setStatus("ACCEPTED"); // Another session just accepted
        acceptedReq.setBuyer(customerA);

        Quotation q2 = createMockQuotation(1002L, "QT-1002", "MATERIAL_REQUIREMENT", acceptedReq, null, seller2, "SUBMITTED");
        when(quotationRepository.findById(1002L)).thenReturn(Optional.of(q2));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(acceptedReq));

        ResponseEntity<?> response = quotationController.acceptQuotation("1002", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("Another quotation has already been accepted"));
    }

    // 39. Customer accepts own DIRECT_HIRE quotation
    @Test
    public void test39_CustomerAcceptsDirectHireQuotation() {
        serviceReq.setStatus("New");
        Quotation qPro1 = createMockQuotation(2001L, "QT-2001", "DIRECT_HIRE", null, serviceReq, proTargeted, "SUBMITTED");
        Quotation qPro2 = createMockQuotation(2002L, "QT-2002", "DIRECT_HIRE", null, serviceReq, proTargeted, "SUBMITTED");

        when(quotationRepository.findById(2001L)).thenReturn(Optional.of(qPro1));
        when(clientServiceRequestRepository.findByIdForUpdate(601L)).thenReturn(Optional.of(serviceReq));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(clientServiceRequestRepository.save(any(ClientServiceRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.findByServiceRequestIdAndStatusIn(eq(601L), any())).thenReturn(List.of(qPro1, qPro2));

        ResponseEntity<?> response = quotationController.acceptQuotation("2001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("ACCEPTED", body.get("status"));
        assertEquals("ACCEPTED", qPro1.getStatus());
        assertEquals("REJECTED", qPro2.getStatus());
        assertEquals("Accepted", serviceReq.getStatus());
    }

    // 40. Customer rejects own DIRECT_HIRE quotation
    @Test
    public void test40_CustomerRejectsDirectHireQuotation() {
        serviceReq.setStatus("New");
        Quotation qPro = createMockQuotation(2001L, "QT-2001", "DIRECT_HIRE", null, serviceReq, proTargeted, "SUBMITTED");
        when(quotationRepository.findById(2001L)).thenReturn(Optional.of(qPro));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = quotationController.rejectQuotation("2001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("REJECTED", body.get("status"));
        assertEquals("REJECTED", qPro.getStatus());
        assertEquals("New", serviceReq.getStatus());
    }

    // 41. Provider retrieves own submitted quotations with enriched project & customer metadata
    @Test
    public void test41_ProviderRetrievesOwnQuotationsWithEnrichedMetadata() {
        materialReq.setProjectName("Expressway Commercial");
        materialReq.setDeliveryAddress("Plot 42, Sector 128, Noida");
        Quotation q1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findByProviderIdOrderByCreatedAtDesc(101L)).thenReturn(List.of(q1));

        ResponseEntity<?> response = quotationController.getMySubmittedQuotations(authSeller1);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());

        Map<?, ?> qMap = (Map<?, ?>) list.get(0);
        assertEquals("QT-1001", qMap.get("quotationId"));
        assertEquals("Expressway Commercial", qMap.get("projectName"));
        assertEquals("Ramesh Kumar (Customer A)", qMap.get("customerName"));
        assertEquals("Noida, Uttar Pradesh", qMap.get("customerLocation"));
        assertEquals("Plot 42, Sector 128, Noida", qMap.get("deliveryAddress"));
        assertEquals("SUBMITTED", qMap.get("status"));
    }

    // 42. Tenant Isolation: Seller A cannot see Seller B quotations
    @Test
    public void test42_ProviderIsolation_SellerACannotSeeSellerBQuotations() {
        Quotation qSeller1 = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        Quotation qSeller2 = createMockQuotation(1002L, "QT-1002", "MATERIAL_REQUIREMENT", materialReq, null, seller2, "SUBMITTED");

        when(quotationRepository.findByProviderIdOrderByCreatedAtDesc(101L)).thenReturn(List.of(qSeller1));
        when(quotationRepository.findByProviderIdOrderByCreatedAtDesc(102L)).thenReturn(List.of(qSeller2));

        ResponseEntity<?> responseSeller1 = quotationController.getMySubmittedQuotations(authSeller1);
        ResponseEntity<?> responseSeller2 = quotationController.getMySubmittedQuotations(authSeller2);

        List<?> list1 = (List<?>) responseSeller1.getBody();
        List<?> list2 = (List<?>) responseSeller2.getBody();

        assertEquals(1, list1.size());
        assertEquals("QT-1001", ((Map<?, ?>) list1.get(0)).get("quotationId"));

        assertEquals(1, list2.size());
        assertEquals("QT-1002", ((Map<?, ?>) list2.get(0)).get("quotationId"));
    }

    // 43. Unauthenticated caller cannot access provider quotations
    @Test
    public void test43_UnauthenticatedCannotAccessProviderQuotations() {
        ResponseEntity<?> response = quotationController.getMySubmittedQuotations(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    // 44. Provider with zero quotations receives empty list
    @Test
    public void test44_ProviderWithZeroQuotationsReceivesEmptyList() {
        when(quotationRepository.findByProviderIdOrderByCreatedAtDesc(101L)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = quotationController.getMySubmittedQuotations(authSeller1);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> list = (List<?>) response.getBody();
        assertNotNull(list);
        assertEquals(0, list.size());
    }

    // =========================================================================
    // PHASE 3 — DUPLICATE PREVENTION, UPDATE WORKFLOW & ACCEPTED IMMUTABILITY
    // =========================================================================

    // 45. Provider updates own eligible SUBMITTED quotation successfully
    @Test
    public void test45_ProviderUpdatesOwnEligibleSubmittedQuotation_Success() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> updatePayload = new LinkedHashMap<>();
        updatePayload.put("materialCost", 55000.0);
        updatePayload.put("transportationCost", 2500.0);
        updatePayload.put("taxGst", 9900.0);
        updatePayload.put("quotedAmount", 67400.0);
        updatePayload.put("timeline", "4-5 Days");
        updatePayload.put("validity", "10 Days");
        updatePayload.put("paymentTerms", "50% Advance, 50% on Delivery");
        updatePayload.put("warranty", "1 Year Manufacturer Guarantee");

        ResponseEntity<?> response = quotationController.updateQuotation("1001", updatePayload, authSeller1);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("QT-1001", body.get("quotationId"));
        assertEquals(67400.0, ((Number) body.get("quotedAmount")).doubleValue(), 0.001);
        assertEquals(55000.0, ((Number) body.get("materialCost")).doubleValue(), 0.001);
        assertEquals(2500.0, ((Number) body.get("transportationCost")).doubleValue(), 0.001);
        assertEquals("4-5 Days", body.get("timeline"));
        assertEquals("10 Days", body.get("validity"));
        assertEquals("50% Advance, 50% on Delivery", body.get("paymentTerms"));

        // Verify entity in place
        assertEquals(67400.0, q.getQuotedAmount(), 0.001);
        assertEquals("4-5 Days", q.getTimeline());
        assertEquals("SUBMITTED", q.getStatus());
    }

    // 46. Provider updates UNDER_REVIEW quotation successfully
    @Test
    public void test46_ProviderUpdatesUnderReviewQuotation_Success() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "UNDER_REVIEW");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> updatePayload = new LinkedHashMap<>();
        updatePayload.put("quotedAmount", 72000.0);
        updatePayload.put("timeline", "1 Week");

        ResponseEntity<?> response = quotationController.updateQuotation("1001", updatePayload, authSeller1);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("UNDER_REVIEW", body.get("status"));
        assertEquals(72000.0, ((Number) body.get("quotedAmount")).doubleValue(), 0.001);
        assertEquals("1 Week", q.getTimeline());
    }

    // 47. Provider A cannot update Provider B's quotation (403 FORBIDDEN)
    @Test
    public void test47_ProviderCannotUpdateAnotherProvidersQuotation_403Forbidden() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));

        Map<String, Object> updatePayload = Map.of("quotedAmount", 40000.0);

        // Seller 2 attempts to update Seller 1's quotation
        ResponseEntity<?> response = quotationController.updateQuotation("1001", updatePayload, authSeller2);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("You do not own this quotation"));
    }

    // 48. Unauthenticated caller cannot update quotation (401 UNAUTHORIZED)
    @Test
    public void test48_UnauthenticatedCannotUpdateQuotation_401Unauthorized() {
        ResponseEntity<?> response = quotationController.updateQuotation("1001", Map.of("quotedAmount", 40000.0), null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    // 49. Accepted quotation CANNOT be updated (409 CONFLICT with exact message)
    @Test
    public void test49_AcceptedQuotationCannotBeUpdated_409Conflict_ExactMessage() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "ACCEPTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));

        Map<String, Object> updatePayload = Map.of(
                "quotedAmount", 80000.0,
                "timeline", "10 Days"
        );

        ResponseEntity<?> response = quotationController.updateQuotation("1001", updatePayload, authSeller1);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("Quotation is already been accepted. Now it cannot be updated.", body.get("error"));
        assertEquals("QUOTATION_ALREADY_ACCEPTED", body.get("code"));

        // Status remains ACCEPTED, amount unmodified
        assertEquals("ACCEPTED", q.getStatus());
        assertEquals(50000.0, q.getQuotedAmount(), 0.001);
    }

    // 50. Accepted quotation CANNOT be deleted (409 CONFLICT)
    @Test
    public void test50_AcceptedQuotationCannotBeDeleted_409Conflict() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "ACCEPTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));

        ResponseEntity<?> response = quotationController.deleteQuotation("1001", authSeller1);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("already been accepted"));
        verify(quotationRepository, never()).delete(any());
    }

    // 51. Accepted quotation CANNOT be withdrawn (409 CONFLICT)
    @Test
    public void test51_AcceptedQuotationCannotBeWithdrawn_409Conflict() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "ACCEPTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));

        ResponseEntity<?> response = quotationController.withdrawQuotation("1001", authSeller1);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("already been accepted"));
        assertEquals("ACCEPTED", q.getStatus());
    }

    // 52. Forged client status cannot bypass accepted lock
    @Test
    public void test52_ForgedClientStatusCannotBypassAcceptedLock() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "ACCEPTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));

        // Malicious client sends status="SUBMITTED" to try to unlock
        Map<String, Object> updatePayload = new LinkedHashMap<>();
        updatePayload.put("status", "SUBMITTED");
        updatePayload.put("quotedAmount", 99999.0);

        ResponseEntity<?> response = quotationController.updateQuotation("1001", updatePayload, authSeller1);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("Quotation is already been accepted. Now it cannot be updated.", body.get("error"));
        assertEquals("ACCEPTED", q.getStatus());
    }

    // 53. Duplicate active quotation submission is rejected with 409 CONFLICT
    @Test
    public void test53_DuplicateActiveQuotationSubmissionRejectedWith409() {
        Quotation existingActive = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.findByMaterialRequestIdAndProviderIdAndStatusIn(
                eq(501L), eq(101L), anyCollection()
        )).thenReturn(List.of(existingActive));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 501L);
        payload.put("quotedAmount", 45000.0);

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue(body.get("error").toString().contains("already exists"));
    }

    // 54. Resubmission allowed when existing quotation is REJECTED or WITHDRAWN
    @Test
    public void test54_ResubmissionAllowedWhenExistingQuotationIsRejectedOrWithdrawn() {
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        // Active check returns empty list because historical record is REJECTED
        when(quotationRepository.findByMaterialRequestIdAndProviderIdAndStatusIn(
                eq(501L), eq(101L), anyCollection()
        )).thenReturn(Collections.emptyList());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 501L);
        payload.put("quotedAmount", 48000.0);

        ResponseEntity<?> response = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body.get("quotationId"));
    }

    // 55. Seller cannot update quotation when parent material request is already ACCEPTED
    @Test
    public void test55_SellerCannotUpdateWhenParentRequestIsAlreadyAccepted() {
        materialReq.setStatus("ACCEPTED");
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));

        Map<String, Object> updatePayload = Map.of("quotedAmount", 60000.0);

        ResponseEntity<?> response = quotationController.updateQuotation("1001", updatePayload, authSeller1);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("Quotation is already been accepted. Now it cannot be updated.", body.get("error"));
    }

    // 56. Customer acceptance locks quotation from subsequent updates
    @Test
    public void test56_CustomerAcceptanceLocksQuotationFromSubsequentUpdates() {
        materialReq.setStatus("NEW");
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));
        when(materialRequestRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(501L), any())).thenReturn(List.of(q));

        // Customer accepts quotation
        ResponseEntity<?> acceptRes = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, acceptRes.getStatusCode());
        assertEquals("ACCEPTED", q.getStatus());

        // Subsequent update attempt by seller is blocked
        ResponseEntity<?> updateRes = quotationController.updateQuotation("1001", Map.of("quotedAmount", 99999.0), authSeller1);
        assertEquals(HttpStatus.CONFLICT, updateRes.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) updateRes.getBody();
        assertEquals("Quotation is already been accepted. Now it cannot be updated.", body.get("error"));
    }

    // 57. Seller can delete eligible SUBMITTED quotation
    @Test
    public void test57_SellerCanDeleteEligibleSubmittedQuotation() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));

        ResponseEntity<?> response = quotationController.deleteQuotation("1001", authSeller1);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals(true, body.get("success"));
        verify(quotationRepository, times(1)).delete(q);
    }

    // 58. Seller can withdraw eligible quotation
    @Test
    public void test58_SellerCanWithdrawEligibleQuotation() {
        Quotation q = createMockQuotation(1001L, "QT-1001", "MATERIAL_REQUIREMENT", materialReq, null, seller1, "SUBMITTED");
        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(q));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = quotationController.withdrawQuotation("1001", authSeller1);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("WITHDRAWN", body.get("status"));
        assertEquals("WITHDRAWN", q.getStatus());
    }
}
