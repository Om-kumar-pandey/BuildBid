package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — SELLER REQUEST WORKFLOW ISOLATION, CROSS-ROLE STATUS SYNCHRONIZATION,
 * REJECTION STAMPS & QUOTATION LIFECYCLE REGRESSION TEST SUITE (STEP 8)
 */
public class SellerRequestWorkflowIsolationAndLifecycleTest {

    private MaterialRequestRepository materialRequestRepository;
    private MaterialRequestItemRepository materialRequestItemRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private SellerMaterialRequestActionRepository sellerMaterialRequestActionRepository;
    private MaterialOrderRepository materialOrderRepository;
    private MaterialOrderItemRepository materialOrderItemRepository;
    private QuotationItemRepository quotationItemRepository;
    private MaterialRepository materialRepository;
    private QuotationRepository quotationRepository;
    private ClientServiceRequestRepository clientServiceRequestRepository;
    private GeoLocationService geoLocationService;
    private NotificationService notificationService;

    private MaterialOrderService materialOrderService;
    private MaterialRequestController materialRequestController;
    private DirectBuyController directBuyController;
    private QuotationService quotationService;
    private QuotationController quotationController;
    private CustomerRequestController customerRequestController;

    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser seller2;
    private MarketplaceBackendApplication.MarketplaceUser buyerCustomer;
    private MarketplaceBackendApplication.MarketplaceUser buyerContractor;
    private MarketplaceBackendApplication.MarketplaceUser buyerProfessional;
    private MarketplaceBackendApplication.MarketplaceUser unrelatedUser;

    private Authentication authSeller1;
    private Authentication authSeller2;
    private Authentication authCustomer;
    private Authentication authContractor;
    private Authentication authProfessional;
    private Authentication authUnrelated;

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");

    @BeforeEach
    public void setup() {
        materialRequestRepository = mock(MaterialRequestRepository.class);
        materialRequestItemRepository = mock(MaterialRequestItemRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        sellerMaterialRequestActionRepository = mock(SellerMaterialRequestActionRepository.class);
        materialOrderRepository = mock(MaterialOrderRepository.class);
        materialOrderItemRepository = mock(MaterialOrderItemRepository.class);
        quotationItemRepository = mock(QuotationItemRepository.class);
        materialRepository = mock(MaterialRepository.class);
        quotationRepository = mock(QuotationRepository.class);
        clientServiceRequestRepository = mock(ClientServiceRequestRepository.class);
        geoLocationService = new GeoLocationService();
        notificationService = mock(NotificationService.class);

        // MaterialOrderService
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

        // MaterialRequestController
        materialRequestController = new MaterialRequestController(
                materialRequestRepository,
                userRepository,
                geoLocationService,
                notificationService
        );
        materialRequestController.setSellerMaterialRequestActionRepository(sellerMaterialRequestActionRepository);
        materialRequestController.setMaterialOrderService(materialOrderService);

        // DirectBuyController
        directBuyController = new DirectBuyController(
                materialRepository,
                materialRequestRepository,
                userRepository,
                geoLocationService,
                notificationService
        );
        directBuyController.setMaterialOrderService(materialOrderService);
        directBuyController.setSellerMaterialRequestActionRepository(sellerMaterialRequestActionRepository);

        // QuotationService
        quotationService = new QuotationService(
                quotationRepository,
                materialRequestRepository,
                clientServiceRequestRepository,
                userRepository,
                geoLocationService,
                materialOrderService,
                materialRepository,
                materialRequestItemRepository,
                quotationItemRepository
        );
        quotationService.setNotificationService(notificationService);

        // QuotationController
        quotationController = new QuotationController(
                quotationService,
                userRepository
        );

        // CustomerRequestController
        customerRequestController = new CustomerRequestController(
                materialRequestRepository,
                clientServiceRequestRepository,
                userRepository,
                quotationRepository,
                materialOrderRepository
        );

        // Setup users
        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller1, "id", 101L);
        seller1.setEmail("seller1@buildbid.com");
        seller1.setName("Seller One Supplies");
        seller1.setPhone("9876500001");
        seller1.setLocation("Sector 18, Noida, Uttar Pradesh, 201301");
        seller1.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.MATERIAL_SELLER)));

        seller2 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller2, "id", 102L);
        seller2.setEmail("seller2@buildbid.com");
        seller2.setName("Seller Two Building Hub");
        seller2.setPhone("9876500002");
        seller2.setLocation("Sector 62, Noida, Uttar Pradesh, 201301");
        seller2.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.MATERIAL_SELLER)));

        buyerCustomer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(buyerCustomer, "id", 201L);
        buyerCustomer.setEmail("customer@buildbid.com");
        buyerCustomer.setName("Customer Rajesh");
        buyerCustomer.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CUSTOMER)));

        buyerContractor = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(buyerContractor, "id", 202L);
        buyerContractor.setEmail("contractor@buildbid.com");
        buyerContractor.setName("Contractor Vikram");
        buyerContractor.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CONTRACTOR)));

        buyerProfessional = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(buyerProfessional, "id", 203L);
        buyerProfessional.setEmail("architect@buildbid.com");
        buyerProfessional.setName("Architect Ananya");
        buyerProfessional.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.SERVICE_PROVIDER)));

        unrelatedUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(unrelatedUser, "id", 204L);
        unrelatedUser.setEmail("unrelated@buildbid.com");
        unrelatedUser.setName("Unrelated User");
        unrelatedUser.setRoles(new HashSet<>(Collections.singletonList(MarketplaceBackendApplication.Role.CUSTOMER)));

        // Authentications
        authSeller1 = mock(Authentication.class);
        when(authSeller1.getName()).thenReturn("seller1@buildbid.com");

        authSeller2 = mock(Authentication.class);
        when(authSeller2.getName()).thenReturn("seller2@buildbid.com");

        authCustomer = mock(Authentication.class);
        when(authCustomer.getName()).thenReturn("customer@buildbid.com");

        authContractor = mock(Authentication.class);
        when(authContractor.getName()).thenReturn("contractor@buildbid.com");

        authProfessional = mock(Authentication.class);
        when(authProfessional.getName()).thenReturn("architect@buildbid.com");

        authUnrelated = mock(Authentication.class);
        when(authUnrelated.getName()).thenReturn("unrelated@buildbid.com");

        when(userRepository.findByEmail("seller1@buildbid.com")).thenReturn(Optional.of(seller1));
        when(userRepository.findByEmail("seller2@buildbid.com")).thenReturn(Optional.of(seller2));
        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(buyerCustomer));
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(buyerContractor));
        when(userRepository.findByEmail("architect@buildbid.com")).thenReturn(Optional.of(buyerProfessional));
        when(userRepository.findByEmail("unrelated@buildbid.com")).thenReturn(Optional.of(unrelatedUser));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
    }

    // =========================================================================
    // STEP 2 & STEP 8 — POSTED MATERIAL REQUIREMENTS: DUPLICATE QUOTATION PREVENTION
    // =========================================================================

    @Test
    @DisplayName("Step 2 & 8: Duplicate quotation submission is rejected for same seller and requirement, while other sellers can quote")
    public void testPostedRequirementQuotationDuplicatePrevention() {
        MaterialRequest postReq = new MaterialRequest();
        ReflectionTestUtils.setField(postReq, "id", 501L);
        postReq.setRequestType("POSTED_REQUIREMENT");
        postReq.setStatus("NEW");
        postReq.setBuyer(buyerCustomer);
        postReq.setState("Uttar Pradesh");
        postReq.setPinCode("201301");

        when(materialRequestRepository.findById(501L)).thenReturn(Optional.of(postReq));

        // First quotation by Seller 1
        Quotation existingQuote = new Quotation();
        existingQuote.setQuotationId("QT-501-1");
        existingQuote.setRequestType("MATERIAL_REQUIREMENT");
        existingQuote.setProvider(seller1);
        existingQuote.setMaterialRequest(postReq);
        existingQuote.setStatus("PENDING");

        // When seller 1 tries to submit again, findByMaterialRequestIdAndProviderIdAndStatusIn returns existing quote
        when(quotationRepository.findByMaterialRequestIdAndProviderIdAndStatusIn(
                eq(501L), eq(seller1.getId()), anyCollection()
        )).thenReturn(Collections.singletonList(existingQuote));

        // Seller 2 has no previous quotation
        when(quotationRepository.findByMaterialRequestIdAndProviderIdAndStatusIn(
                eq(501L), eq(seller2.getId()), anyCollection()
        )).thenReturn(Collections.emptyList());

        Map<String, Object> quoteRequest = new HashMap<>();
        quoteRequest.put("requestType", "MATERIAL_REQUIREMENT");
        quoteRequest.put("materialRequestId", 501L);
        quoteRequest.put("totalAmount", 550000.0);
        quoteRequest.put("timelineDays", 5);
        quoteRequest.put("notes", "Best price steel rebars");

        // Act & Assert 1: Seller 1 duplicate quotation throws IllegalStateException with "already exists"
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> quotationService.submitQuotation(quoteRequest, seller1)
        );
        assertTrue(ex.getMessage().contains("already exists"));

        // Act & Assert 1b: Controller returns 409 CONFLICT
        ResponseEntity<?> conflictResponse = quotationController.submitQuotation(quoteRequest, authSeller1);
        assertEquals(HttpStatus.CONFLICT, conflictResponse.getStatusCode());

        // Act & Assert 2: Seller 2 submits quotation successfully without conflict
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(invocation -> {
            Quotation q = invocation.getArgument(0);
            ReflectionTestUtils.setField(q, "id", 701L);
            return q;
        });

        Quotation createdQuote = quotationService.submitQuotation(quoteRequest, seller2);
        assertNotNull(createdQuote);
        assertEquals(seller2, createdQuote.getProvider());
        assertEquals("SUBMITTED", createdQuote.getStatus());
    }

    // =========================================================================
    // STEP 3 & STEP 8 — DIRECT BUY ACCEPTANCE: INTERNAL FAILURE ROOT CAUSE FIX
    // =========================================================================

    @Test
    @DisplayName("Step 3 & 8: Direct Buy acceptance creates order without PropertyValueException when catalog material is null")
    public void testDirectBuyAcceptanceFixesInternalFailureRootCause() {
        MaterialRequest directBuyReq = new MaterialRequest();
        ReflectionTestUtils.setField(directBuyReq, "id", 601L);
        directBuyReq.setRequestId("DMR-601");
        directBuyReq.setRequestType("DIRECT_MATERIAL");
        directBuyReq.setStatus("NEW");
        directBuyReq.setBuyer(buyerCustomer);
        directBuyReq.setBuyerRole("CUSTOMER");
        directBuyReq.setTargetSeller(seller1);
        directBuyReq.setState("Uttar Pradesh");
        directBuyReq.setPinCode("201301");
        directBuyReq.setDeliveryAddress("Plot 12, Noida Sector 62");

        // Line items without a pre-existing catalog material match
        MaterialRequestItem lineItem = new MaterialRequestItem();
        ReflectionTestUtils.setField(lineItem, "id", 801L);
        lineItem.setMaterialName("Ambuja Cement 53 Grade");
        lineItem.setQuantity(50.0);
        lineItem.setUnit("Bags");
        lineItem.setMaterialRequest(directBuyReq);

        directBuyReq.setItems(Collections.singletonList(lineItem));

        when(materialRequestRepository.findById(601L)).thenReturn(Optional.of(directBuyReq));
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(seller1.getId(), 601L))
                .thenReturn(Optional.empty());

        // Saving order
        ArgumentCaptor<MaterialOrder> orderCaptor = ArgumentCaptor.forClass(MaterialOrder.class);
        when(materialOrderRepository.save(orderCaptor.capture())).thenAnswer(invocation -> {
            MaterialOrder mo = invocation.getArgument(0);
            ReflectionTestUtils.setField(mo, "id", 901L);
            return mo;
        });

        // Act: Seller 1 accepts the direct buy request
        ResponseEntity<?> response = materialRequestController.acceptRequest(601L, authSeller1);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ACCEPTED", directBuyReq.getStatus());

        // Verify order items saved successfully with order cascade
        MaterialOrder savedOrder = orderCaptor.getValue();
        assertNotNull(savedOrder);
        assertNotNull(savedOrder.getItems());
        assertFalse(savedOrder.getItems().isEmpty());
        MaterialOrderItem savedItem = savedOrder.getItems().get(0);
        assertEquals("Ambuja Cement 53 Grade", savedItem.getMaterialName());
        assertEquals(50.0, savedItem.getQuantity());
        assertNull(savedItem.getMaterial(), "Material catalog reference can safely be null without throwing PropertyValueException");

        // Verify order is linked to seller1
        assertEquals(seller1, savedOrder.getSeller());
        assertEquals(buyerCustomer, savedOrder.getBuyer());
    }

    // =========================================================================
    // STEP 3 & STEP 8 — DIRECT BUY DECLINE PERSISTENCE & BUYER NOTIFICATION
    // =========================================================================

    @Test
    @DisplayName("Step 3 & 8: Seller declines Direct Buy request -> persisted as DECLINED and buyer receives notification")
    public void testDirectBuyDeclinePersistsAndNotifiesBuyer() {
        MaterialRequest directBuyReq = new MaterialRequest();
        ReflectionTestUtils.setField(directBuyReq, "id", 602L);
        directBuyReq.setRequestId("DMR-602");
        directBuyReq.setRequestType("DIRECT_MATERIAL");
        directBuyReq.setStatus("NEW");
        directBuyReq.setBuyer(buyerCustomer);
        directBuyReq.setBuyerRole("CUSTOMER");
        directBuyReq.setTargetSeller(seller1);
        directBuyReq.setState("Uttar Pradesh");
        directBuyReq.setPinCode("201301");

        when(materialRequestRepository.findById(602L)).thenReturn(Optional.of(directBuyReq));
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(seller1.getId(), 602L))
                .thenReturn(Optional.empty());

        // Act: Seller declines direct buy request
        ResponseEntity<?> response = materialRequestController.declineRequest(602L, authSeller1);

        // Assert: 200 OK
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("DECLINED", directBuyReq.getStatus());

        // Verify action saved for seller
        verify(sellerMaterialRequestActionRepository).save(argThat(act ->
                act.getSeller().equals(seller1) &&
                act.getMaterialRequest().equals(directBuyReq) &&
                "DECLINED".equals(act.getStatus())
        ));

        // Verify notification sent to buyer with type DIRECT_BUY_DECLINED
        verify(notificationService).createNotification(
                eq(buyerCustomer),
                contains("Declined"),
                anyString(),
                contains("declined"),
                anyString(),
                eq("DIRECT_BUY_DECLINED"),
                eq("DMR-602")
        );
    }

    // =========================================================================
    // STEP 4 & STEP 8 — SYNCHRONIZE STATUS ACROSS ALL THREE REQUESTER ROLES
    // =========================================================================

    @Test
    @DisplayName("Step 4 & 8: Status synchronization across CUSTOMER, CONTRACTOR, and PROFESSIONAL requesters")
    @SuppressWarnings("unchecked")
    public void testStatusSynchronizationAcrossAllThreeRoles() {
        // 1. CUSTOMER Direct Buy Request
        MaterialRequest reqCustomer = new MaterialRequest();
        ReflectionTestUtils.setField(reqCustomer, "id", 610L);
        reqCustomer.setRequestId("DMR-610");
        reqCustomer.setRequestType("DIRECT_MATERIAL");
        reqCustomer.setStatus("NEW");
        reqCustomer.setBuyer(buyerCustomer);
        reqCustomer.setBuyerRole("CUSTOMER");
        reqCustomer.setTargetSeller(seller1);
        reqCustomer.setState("Uttar Pradesh");
        reqCustomer.setPinCode("201301");

        // 2. CONTRACTOR Direct Buy Request
        MaterialRequest reqContractor = new MaterialRequest();
        ReflectionTestUtils.setField(reqContractor, "id", 611L);
        reqContractor.setRequestId("DMR-611");
        reqContractor.setRequestType("DIRECT_MATERIAL");
        reqContractor.setStatus("NEW");
        reqContractor.setBuyer(buyerContractor);
        reqContractor.setBuyerRole("CONTRACTOR");
        reqContractor.setTargetSeller(seller1);
        reqContractor.setState("Uttar Pradesh");
        reqContractor.setPinCode("201301");

        // 3. PROFESSIONAL Direct Buy Request
        MaterialRequest reqPro = new MaterialRequest();
        ReflectionTestUtils.setField(reqPro, "id", 612L);
        reqPro.setRequestId("DMR-612");
        reqPro.setRequestType("DIRECT_MATERIAL");
        reqPro.setStatus("NEW");
        reqPro.setBuyer(buyerProfessional);
        reqPro.setBuyerRole("PROFESSIONAL");
        reqPro.setTargetSeller(seller1);
        reqPro.setState("Uttar Pradesh");
        reqPro.setPinCode("201301");

        // Setup repository mock responses
        when(materialRequestRepository.findById(610L)).thenReturn(Optional.of(reqCustomer));
        when(materialRequestRepository.findById(611L)).thenReturn(Optional.of(reqContractor));
        when(materialRequestRepository.findById(612L)).thenReturn(Optional.of(reqPro));

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(buyerCustomer))
                .thenReturn(Collections.singletonList(reqCustomer));
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(buyerContractor))
                .thenReturn(Collections.singletonList(reqContractor));
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(buyerProfessional))
                .thenReturn(Collections.singletonList(reqPro));

        // When queried initial state -> all show Waiting for Acceptance
        ResponseEntity<?> respCust = customerRequestController.getCustomerMyRequests(authCustomer);
        List<Map<String, Object>> listCust = (List<Map<String, Object>>) respCust.getBody();
        assertEquals("Waiting for Acceptance", listCust.get(0).get("status"));

        ResponseEntity<?> respContr = customerRequestController.getCustomerMyRequests(authContractor);
        List<Map<String, Object>> listContr = (List<Map<String, Object>>) respContr.getBody();
        assertEquals("Waiting for Acceptance", listContr.get(0).get("status"));

        ResponseEntity<?> respPro = customerRequestController.getCustomerMyRequests(authProfessional);
        List<Map<String, Object>> listPro = (List<Map<String, Object>>) respPro.getBody();
        assertEquals("Waiting for Acceptance", listPro.get(0).get("status"));

        // Seller 1 ACCEPTS Contractor's request
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(seller1.getId(), 611L))
                .thenReturn(Optional.empty());
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> i.getArgument(0));
        materialRequestController.acceptRequest(611L, authSeller1);

        // Seller 1 DECLINES Professional's request
        when(sellerMaterialRequestActionRepository.findBySellerIdAndMaterialRequestId(seller1.getId(), 612L))
                .thenReturn(Optional.empty());
        materialRequestController.declineRequest(612L, authSeller1);

        // Verify CONTRACTOR dashboard reflects ORDER_ACCEPTED / ACCEPTED
        ResponseEntity<?> respContrUpdated = customerRequestController.getCustomerMyRequests(authContractor);
        List<Map<String, Object>> listContrUpdated = (List<Map<String, Object>>) respContrUpdated.getBody();
        assertEquals("Order Accepted", listContrUpdated.get(0).get("status"));
        assertEquals("ACCEPTED", listContrUpdated.get(0).get("rawStatus"));

        // Verify PROFESSIONAL dashboard reflects DECLINED
        ResponseEntity<?> respProUpdated = customerRequestController.getCustomerMyRequests(authProfessional);
        List<Map<String, Object>> listProUpdated = (List<Map<String, Object>>) respProUpdated.getBody();
        assertEquals("Declined", listProUpdated.get(0).get("status"));
        assertEquals("DECLINED", listProUpdated.get(0).get("rawStatus"));

        // Verify Security: Unrelated user querying requests sees EMPTY list (user isolation preserved)
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(unrelatedUser))
                .thenReturn(Collections.emptyList());
        ResponseEntity<?> respUnrelated = customerRequestController.getCustomerMyRequests(authUnrelated);
        List<Map<String, Object>> listUnrelated = (List<Map<String, Object>>) respUnrelated.getBody();
        assertTrue(listUnrelated.isEmpty(), "Unrelated user cannot see another requester's requests");
    }

    // =========================================================================
    // STEP 5 & STEP 8 — REJECTED DIRECT BUY REQUEST CARD MAPPING
    // =========================================================================

    @Test
    @DisplayName("Step 5 & 8: Declined Direct Buy requests map to Declined status without waiting indicators")
    @SuppressWarnings("unchecked")
    public void testDeclinedDirectBuyCardMapping() {
        MaterialRequest declinedReq = new MaterialRequest();
        ReflectionTestUtils.setField(declinedReq, "id", 630L);
        declinedReq.setRequestId("DMR-630");
        declinedReq.setRequestType("DIRECT_MATERIAL");
        declinedReq.setStatus("DECLINED");
        declinedReq.setBuyer(buyerCustomer);
        declinedReq.setBuyerRole("CUSTOMER");
        declinedReq.setTargetSeller(seller1);
        declinedReq.setState("Uttar Pradesh");
        declinedReq.setPinCode("201301");

        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(buyerCustomer))
                .thenReturn(Collections.singletonList(declinedReq));

        ResponseEntity<?> response = customerRequestController.getCustomerMyRequests(authCustomer);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        List<Map<String, Object>> cards = (List<Map<String, Object>>) response.getBody();
        assertEquals(1, cards.size());
        Map<String, Object> card = cards.get(0);

        // Must display Declined / अस्वीकृत
        assertEquals("Declined", card.get("status"));
        assertEquals("Declined", card.get("statusEn"));
        assertEquals("अस्वीकृत", card.get("statusHi"));
        assertEquals("DECLINED", card.get("rawStatus"));
        assertNotEquals("Waiting for Acceptance", card.get("status"));
    }

    // =========================================================================
    // STEP 7 & STEP 8 — MY QUOTATIONS: 24-HOUR REJECTION EXPIRY & SELLER NOTIFICATION
    // =========================================================================

    @Test
    @DisplayName("Step 7 & 8: Quotation rejection sets rejectedAt and sends 'This quotation has been rejected.' notification")
    public void testQuotationRejectionTimestampAndNotification() {
        Quotation quote = new Quotation();
        ReflectionTestUtils.setField(quote, "id", 710L);
        quote.setQuotationId("QT-710");
        quote.setRequestType("MATERIAL_REQUIREMENT");
        quote.setProvider(seller1);
        quote.setStatus("SUBMITTED");

        MaterialRequest req = new MaterialRequest();
        ReflectionTestUtils.setField(req, "id", 550L);
        req.setBuyer(buyerCustomer);
        quote.setMaterialRequest(req);

        when(quotationRepository.findByQuotationId("QT-710")).thenReturn(Optional.of(quote));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        // Act: Customer rejects the quotation
        quotationService.rejectQuotation("QT-710", buyerCustomer);

        // Assert: Status is REJECTED
        assertEquals("REJECTED", quote.getStatus());
        assertNotNull(quote.getRejectedAt(), "rejectedAt timestamp must be persisted");

        // Notification must be sent to seller1 with specific message
        verify(notificationService).createNotification(
                eq(seller1),
                eq("Quotation Rejected"),
                eq("कोटेशन अस्वीकृत"),
                eq("This quotation has been rejected."),
                eq("यह कोटेशन अस्वीकृत कर दिया गया है।"),
                eq("QUOTATION_REJECTED"),
                eq("QT-710")
        );
    }

    @Test
    @DisplayName("Step 7 & 8: 24-hour expiry lifecycle in getQuotationsByProvider")
    public void testQuotation24HourExpiryLifecycle() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Rejected quotation 5 hours ago (within 24 hours -> must remain VISIBLE)
        Quotation quoteRecentReject = new Quotation();
        ReflectionTestUtils.setField(quoteRecentReject, "id", 721L);
        quoteRecentReject.setQuotationId("QT-721");
        quoteRecentReject.setRequestType("MATERIAL_REQUIREMENT");
        quoteRecentReject.setProvider(seller1);
        quoteRecentReject.setStatus("REJECTED");
        quoteRecentReject.setRejectedAt(now.minusHours(5));

        // 2. Rejected quotation 25 hours ago (beyond 24 hours -> must be EXCLUDED)
        Quotation quoteExpiredReject = new Quotation();
        ReflectionTestUtils.setField(quoteExpiredReject, "id", 722L);
        quoteExpiredReject.setQuotationId("QT-722");
        quoteExpiredReject.setRequestType("MATERIAL_REQUIREMENT");
        quoteExpiredReject.setProvider(seller1);
        quoteExpiredReject.setStatus("REJECTED");
        quoteExpiredReject.setRejectedAt(now.minusHours(25));

        // 3. Active pending quotation (must remain VISIBLE)
        Quotation quotePending = new Quotation();
        ReflectionTestUtils.setField(quotePending, "id", 723L);
        quotePending.setQuotationId("QT-723");
        quotePending.setRequestType("MATERIAL_REQUIREMENT");
        quotePending.setProvider(seller1);
        quotePending.setStatus("PENDING");

        // 4. Accepted quotation (must remain VISIBLE)
        Quotation quoteAccepted = new Quotation();
        ReflectionTestUtils.setField(quoteAccepted, "id", 724L);
        quoteAccepted.setQuotationId("QT-724");
        quoteAccepted.setRequestType("MATERIAL_REQUIREMENT");
        quoteAccepted.setProvider(seller1);
        quoteAccepted.setStatus("ACCEPTED");

        when(quotationRepository.findByProviderIdOrderByCreatedAtDesc(seller1.getId()))
                .thenReturn(Arrays.asList(quoteRecentReject, quoteExpiredReject, quotePending, quoteAccepted));

        // Act: Retrieve quotations for seller1
        List<Map<String, Object>> activeQuotes = quotationService.getQuotationsByProvider(seller1);

        // Assert: 3 quotations visible, 1 expired quotation excluded
        assertEquals(3, activeQuotes.size(), "Only unexpired rejected quotes, pending, and accepted should be returned");

        List<String> quoteIds = activeQuotes.stream().map(q -> (String) q.get("quotationId")).toList();
        assertTrue(quoteIds.contains("QT-721"), "Quotation rejected 5 hours ago must remain visible");
        assertFalse(quoteIds.contains("QT-722"), "Quotation rejected 25 hours ago must be excluded after 24 hours");
        assertTrue(quoteIds.contains("QT-723"), "Pending quotation must remain visible");
        assertTrue(quoteIds.contains("QT-724"), "Accepted quotation must remain visible");

        // Verify that refreshing the dashboard / repeated calls does NOT reset rejection timestamp
        assertEquals(now.minusHours(5), quoteRecentReject.getRejectedAt());
        assertEquals(now.minusHours(25), quoteExpiredReject.getRejectedAt());
    }

    @Test
    @DisplayName("Step 7 & 8: Duplicate rejection call does not extend expiry timer or send duplicate notifications")
    public void testDuplicateRejectionDoesNotExtendExpiryOrDuplicateNotifications() {
        LocalDateTime originalRejectionTime = LocalDateTime.now().minusHours(10);

        Quotation alreadyRejectedQuote = new Quotation();
        ReflectionTestUtils.setField(alreadyRejectedQuote, "id", 730L);
        alreadyRejectedQuote.setQuotationId("QT-730");
        alreadyRejectedQuote.setRequestType("MATERIAL_REQUIREMENT");
        alreadyRejectedQuote.setProvider(seller1);
        alreadyRejectedQuote.setStatus("REJECTED");
        alreadyRejectedQuote.setRejectedAt(originalRejectionTime);

        MaterialRequest req = new MaterialRequest();
        ReflectionTestUtils.setField(req, "id", 551L);
        req.setBuyer(buyerCustomer);
        alreadyRejectedQuote.setMaterialRequest(req);

        when(quotationRepository.findByQuotationId("QT-730")).thenReturn(Optional.of(alreadyRejectedQuote));

        // Act: Attempt second rejection throws IllegalStateException
        assertThrows(IllegalStateException.class, () -> quotationService.rejectQuotation("QT-730", buyerCustomer));

        // Assert: Timestamp is unchanged, notificationService is NOT called again
        assertEquals(originalRejectionTime, alreadyRejectedQuote.getRejectedAt(), "Rejection timestamp must not be overwritten");
        verifyNoInteractions(notificationService);
    }
}
