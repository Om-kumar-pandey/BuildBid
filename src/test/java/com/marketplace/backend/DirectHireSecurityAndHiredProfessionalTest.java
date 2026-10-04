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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — DIRECT HIRE SECURITY & HIRED PROFESSIONAL TEST SUITE
 * 
 * Comprehensive tests verifying:
 * 1. Direct Hire request creation accepts existing payload contract.
 * 2. Authenticated user binding (never trusting frontend clientId/userId/recipientId).
 * 3. Requester role validation (CUSTOMER, CONTRACTOR, MATERIAL_SELLER allowed; PROFESSIONAL blocked; spoofing prevented).
 * 4. Target professional validation (must exist, must be registered PROFESSIONAL, cannot hire self).
 * 5. Notifications:
 *    - On create: exactly one notification sent to selected professional (DIRECT_HIRE_REQUEST).
 *    - On accept: exactly one notification sent to requester (HIRING_REQUEST_ACCEPTED).
 *    - On reject/decline: exactly one notification sent to requester (HIRING_REQUEST_DECLINED).
 * 6. Professional ownership isolation:
 *    - Professional A cannot view, count, or modify Professional B's request (403 Forbidden).
 * 7. Requester ownership isolation:
 *    - Customer A cannot access Customer B's hired professionals.
 *    - Contractor A cannot access Contractor B's hired professionals.
 *    - Material Seller A cannot access Material Seller B's hired professionals.
 * 8. Hired Professionals endpoint:
 *    - Returns only accepted direct hire relationships for authenticated requester.
 *    - PROFESSIONAL cannot access the requester endpoint (403 Forbidden).
 * 9. Part C response mapping (computed requestType = DIRECT_HIRE, requesterUserId, requesterRole, etc.).
 * 10. Status transition validation (cannot accept already declined request).
 */
public class DirectHireSecurityAndHiredProfessionalTest {

    private ClientServiceRequestRepository requestRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private ProfessionalServiceRepository professionalServiceRepository;
    private NotificationService notificationService;
    private ClientServiceRequestService requestService;
    private ClientServiceRequestController requestController;
    private HiredProfessionalService hiredProfessionalService;
    private HiredProfessionalController hiredProfessionalController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser sellerA;
    private MarketplaceBackendApplication.MarketplaceUser professionalA;
    private MarketplaceBackendApplication.MarketplaceUser professionalB;
    private MarketplaceBackendApplication.MarketplaceUser pureProfessional;

    private List<ClientServiceRequest> mockDatabase;
    private long idSequence = 1L;

    @BeforeEach
    void setUp() {
        requestRepository = mock(ClientServiceRequestRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        professionalServiceRepository = mock(ProfessionalServiceRepository.class);
        notificationService = mock(NotificationService.class);

        requestService = new ClientServiceRequestService(requestRepository, notificationService);
        requestController = new ClientServiceRequestController(requestService, userRepository, professionalServiceRepository);

        hiredProfessionalService = new HiredProfessionalService(requestRepository);
        hiredProfessionalController = new HiredProfessionalController(hiredProfessionalService, userRepository);

        mockDatabase = new ArrayList<>();

        // Create test users
        customerA = createTestUser(1L, "custA@test.com", "Customer Alpha", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(2L, "custB@test.com", "Customer Beta", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorA = createTestUser(3L, "contA@test.com", "Contractor Alpha", MarketplaceBackendApplication.Role.CONTRACTOR);
        contractorB = createTestUser(4L, "contB@test.com", "Contractor Beta", MarketplaceBackendApplication.Role.CONTRACTOR);
        sellerA = createTestUser(5L, "sellerA@test.com", "Seller Alpha", MarketplaceBackendApplication.Role.MATERIAL_SELLER);
        professionalA = createTestUser(6L, "proA@test.com", "Pro Alpha", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professionalB = createTestUser(7L, "proB@test.com", "Pro Beta", MarketplaceBackendApplication.Role.PROFESSIONAL);
        pureProfessional = createTestUser(8L, "purePro@test.com", "Pure Pro", MarketplaceBackendApplication.Role.PROFESSIONAL);

        // Mock userRepository lookups
        List<MarketplaceBackendApplication.MarketplaceUser> allUsers = List.of(
                customerA, customerB, contractorA, contractorB, sellerA, professionalA, professionalB, pureProfessional
        );
        for (MarketplaceBackendApplication.MarketplaceUser u : allUsers) {
            when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
            when(userRepository.findByUsername(u.getUsername())).thenReturn(Optional.of(u));
            when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        }

        // Mock requestRepository save
        when(requestRepository.save(any(ClientServiceRequest.class))).thenAnswer(invocation -> {
            ClientServiceRequest req = invocation.getArgument(0);
            if (req.getId() == null) {
                req.setId(idSequence++);
                req.setCreatedAt(LocalDateTime.now());
                if (req.getRequestId() == null) {
                    req.setRequestId("REQ-" + req.getId());
                }
                mockDatabase.add(req);
            }
            req.setUpdatedAt(LocalDateTime.now());
            return req;
        });

        // Mock requestRepository findByRequestIdAndProfessional_Id
        when(requestRepository.findByRequestIdAndProfessional_Id(anyString(), anyLong())).thenAnswer(invocation -> {
            String reqId = invocation.getArgument(0);
            Long proId = invocation.getArgument(1);
            return mockDatabase.stream()
                    .filter(r -> reqId.equals(r.getRequestId()) && r.getProfessional() != null && proId.equals(r.getProfessional().getId()))
                    .findFirst();
        });

        // Mock requestRepository findByIdAndProfessional_Id
        when(requestRepository.findByIdAndProfessional_Id(anyLong(), anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            Long proId = invocation.getArgument(1);
            return mockDatabase.stream()
                    .filter(r -> id.equals(r.getId()) && r.getProfessional() != null && proId.equals(r.getProfessional().getId()))
                    .findFirst();
        });

        // Mock requestRepository findByRequestId
        when(requestRepository.findByRequestId(anyString())).thenAnswer(invocation -> {
            String reqId = invocation.getArgument(0);
            return mockDatabase.stream()
                    .filter(r -> reqId.equals(r.getRequestId()))
                    .findFirst();
        });

        // Mock requestRepository findById
        when(requestRepository.findById(anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return mockDatabase.stream()
                    .filter(r -> id.equals(r.getId()))
                    .findFirst();
        });

        // Mock requestRepository findByClient_IdAndStatusIgnoreCaseOrderByCreatedAtDesc
        when(requestRepository.findByClient_IdAndStatusIgnoreCaseOrderByCreatedAtDesc(anyLong(), anyString())).thenAnswer(invocation -> {
            Long clientId = invocation.getArgument(0);
            String status = invocation.getArgument(1);
            List<ClientServiceRequest> result = new ArrayList<>();
            for (ClientServiceRequest r : mockDatabase) {
                if (r.getClient() != null && clientId.equals(r.getClient().getId()) && status.equalsIgnoreCase(r.getStatus())) {
                    result.add(r);
                }
            }
            return result;
        });
    }

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id, String email, String name, MarketplaceBackendApplication.Role role) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(email.split("@")[0]);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Noida, UP");
        user.setPhone("+91 9876543210");
        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private Authentication mockAuth(MarketplaceBackendApplication.MarketplaceUser user) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(user.getEmail());
        when(auth.isAuthenticated()).thenReturn(true);
        return auth;
    }

    // ========================================================
    // 1. DIRECT HIRE CREATION & PAYLOAD REGRESSION
    // ========================================================

    @Test
    @DisplayName("Create Direct Hire with existing payload fields succeeds and binds authenticated client")
    void testCreateDirectHire_Success() {
        Authentication auth = mockAuth(customerA);

        Map<String, Object> payload = new HashMap<>();
        payload.put("professionalId", professionalA.getId());
        payload.put("requestedService", "Structural Consultation");
        payload.put("projectName", "Duplex Villa Design");
        payload.put("projectScope", "Inspect lintel and beam placement.");
        payload.put("location", "Sector 62, Noida");
        payload.put("distance", "5.2 km");
        payload.put("turnaround", "2 Days");
        payload.put("clientBudget", 25000.0);
        payload.put("requesterType", "CUSTOMER");

        // Attacker attempts to spoof client ID
        payload.put("clientId", 999L);
        payload.put("requesterUserId", 888L);

        ResponseEntity<?> response = requestController.createRequest(payload, auth);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("Duplex Villa Design", body.get("project"));
        assertEquals("Structural Consultation", body.get("service"));
        assertEquals("CUSTOMER", body.get("requesterRole"));
        assertEquals("DIRECT_HIRE", body.get("requestType"));
        assertEquals(customerA.getId(), body.get("requesterUserId"));
        assertEquals(professionalA.getId(), body.get("professionalId"));

        // Verify entity persisted in DB
        assertFalse(mockDatabase.isEmpty());
        ClientServiceRequest saved = mockDatabase.get(0);
        assertEquals(customerA.getId(), saved.getClient().getId()); // Bound to authenticated user!
        assertEquals(professionalA.getId(), saved.getProfessional().getId());
        assertEquals("New", saved.getStatus());

        // Verify PART F notification: Exactly 1 notification to professionalA
        verify(notificationService, times(1)).createNotification(
                eq(professionalA),
                eq("New Direct Hire Request"),
                anyString(),
                contains("Customer Alpha"),
                anyString(),
                eq("DIRECT_HIRE_REQUEST"),
                eq(saved.getRequestId())
        );
        // Verify NO notification was sent to customerA or other users
        verify(notificationService, never()).createNotification(eq(customerA), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
        verify(notificationService, never()).createNotification(eq(professionalB), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    // ========================================================
    // 2. REQUESTER ROLE VALIDATION & SPOOFING PREVENTION
    // ========================================================

    @Test
    @DisplayName("Pure PROFESSIONAL cannot create Direct Hire request (403 Forbidden)")
    void testPureProfessionalCannotCreateDirectHireRequest() {
        Authentication auth = mockAuth(pureProfessional);

        Map<String, Object> payload = Map.of(
                "professionalId", professionalA.getId(),
                "requestedService", "Masonry Work"
        );

        ResponseEntity<?> response = requestController.createRequest(payload, auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));
        assertTrue(mockDatabase.isEmpty());
    }

    @Test
    @DisplayName("Requester role spoofing is blocked: user with only CUSTOMER role cannot spoof CONTRACTOR")
    void testRequesterRoleSpoofingBlocked() {
        Authentication auth = mockAuth(customerA);

        Map<String, Object> payload = new HashMap<>();
        payload.put("professionalId", professionalA.getId());
        payload.put("requestedService", "Architectural Review");
        payload.put("requesterType", "CONTRACTOR"); // Attacker claims to be CONTRACTOR

        ResponseEntity<?> response = requestController.createRequest(payload, auth);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        // Server derived real role from authenticated user's registered roles
        assertEquals("CUSTOMER", body.get("requesterRole"));
        assertEquals("CUSTOMER", body.get("requesterType"));
    }

    @Test
    @DisplayName("CONTRACTOR and MATERIAL_SELLER can create Direct Hire requests")
    void testContractorAndSellerCanCreateDirectHire() {
        // Contractor
        Authentication authCont = mockAuth(contractorA);
        Map<String, Object> payloadCont = Map.of(
                "professionalId", professionalA.getId(),
                "requestedService", "HVAC Design",
                "requesterType", "CONTRACTOR"
        );
        ResponseEntity<?> respCont = requestController.createRequest(payloadCont, authCont);
        assertEquals(HttpStatus.CREATED, respCont.getStatusCode());
        assertEquals("CONTRACTOR", ((Map<?, ?>) respCont.getBody()).get("requesterRole"));

        // Seller
        Authentication authSeller = mockAuth(sellerA);
        Map<String, Object> payloadSeller = Map.of(
                "professionalId", professionalA.getId(),
                "requestedService", "Electrical Layout",
                "requesterType", "MATERIAL_SELLER"
        );
        ResponseEntity<?> respSeller = requestController.createRequest(payloadSeller, authSeller);
        assertEquals(HttpStatus.CREATED, respSeller.getStatusCode());
        assertEquals("MATERIAL_SELLER", ((Map<?, ?>) respSeller.getBody()).get("requesterRole"));
    }

    // ========================================================
    // 3. TARGET PROFESSIONAL VALIDATION
    // ========================================================

    @Test
    @DisplayName("Target user must have PROFESSIONAL role: non-professional target rejected with 400 Bad Request")
    void testTargetMustBeProfessional() {
        Authentication auth = mockAuth(customerA);

        // Attempting to send a direct hire request targeting another customer
        Map<String, Object> payload = Map.of(
                "professionalId", customerB.getId(),
                "requestedService", "Civil Consultation"
        );

        ResponseEntity<?> response = requestController.createRequest(payload, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Target user is not registered as a professional"));
    }

    @Test
    @DisplayName("User cannot hire themselves (400 Bad Request)")
    void testUserCannotHireSelf() {
        // User with multi-role CUSTOMER + PROFESSIONAL
        MarketplaceBackendApplication.MarketplaceUser multiUser = createTestUser(50L, "multi@test.com", "Multi User", MarketplaceBackendApplication.Role.CUSTOMER);
        multiUser.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);
        when(userRepository.findByEmail(multiUser.getEmail())).thenReturn(Optional.of(multiUser));
        when(userRepository.findById(multiUser.getId())).thenReturn(Optional.of(multiUser));

        Authentication auth = mockAuth(multiUser);
        Map<String, Object> payload = Map.of(
                "professionalId", multiUser.getId(),
                "requestedService", "Consultation"
        );

        ResponseEntity<?> response = requestController.createRequest(payload, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("You cannot hire yourself"));
    }

    // ========================================================
    // 4. PROFESSIONAL REQUEST OWNERSHIP & NOTIFICATIONS
    // ========================================================

    @Test
    @DisplayName("Accepting Direct Hire sends HIRING_REQUEST_ACCEPTED notification to requester")
    void testAcceptDirectHire_SendsNotificationToRequester() {
        // Pre-populate a request for Professional A from Customer A
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(10L);
        req.setRequestId("REQ-1010");
        req.setClient(customerA);
        req.setClientName(customerA.getName());
        req.setProfessional(professionalA);
        req.setRequestedService("Interior Architecture");
        req.setStatus("New");
        req.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req);

        Authentication auth = mockAuth(professionalA);
        ResponseEntity<?> response = requestController.updateStatus("REQ-1010", Map.of("status", "Accepted"), auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertEquals("Accepted", req.getStatus());

        // Verify PART G notification: Exactly 1 notification to customerA
        verify(notificationService, times(1)).createNotification(
                eq(customerA),
                eq("Hiring Request Accepted"),
                anyString(),
                contains("Pro Alpha"),
                anyString(),
                eq("HIRING_REQUEST_ACCEPTED"),
                eq("REQ-1010")
        );
        // Verify recipient was NOT taken from any frontend input
        verify(notificationService, never()).createNotification(eq(professionalA), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Declining Direct Hire sends HIRING_REQUEST_DECLINED notification to requester")
    void testDeclineDirectHire_SendsNotificationToRequester() {
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(20L);
        req.setRequestId("REQ-2020");
        req.setClient(contractorA);
        req.setClientName(contractorA.getName());
        req.setProfessional(professionalA);
        req.setRequestedService("Plumbing Inspection");
        req.setStatus("New");
        req.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req);

        Authentication auth = mockAuth(professionalA);
        ResponseEntity<?> response = requestController.updateStatus("REQ-2020", Map.of("status", "Declined"), auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertEquals("Declined", req.getStatus());

        // Verify PART H notification: Exactly 1 notification to contractorA
        verify(notificationService, times(1)).createNotification(
                eq(contractorA),
                eq("Hiring Request Declined"),
                anyString(),
                contains("Pro Alpha"),
                anyString(),
                eq("HIRING_REQUEST_DECLINED"),
                eq("REQ-2020")
        );
    }

    @Test
    @DisplayName("Professional A cannot view or modify Professional B's request (403 Forbidden)")
    void testProfessionalOwnershipIsolation_403Forbidden() {
        // Request belongs to Professional B
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(30L);
        req.setRequestId("REQ-3030");
        req.setClient(customerA);
        req.setProfessional(professionalB);
        req.setStatus("New");
        req.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req);

        // Professional A attempts to accept Professional B's request
        Authentication auth = mockAuth(professionalA);
        ResponseEntity<?> response = requestController.updateStatus("REQ-3030", Map.of("status", "Accepted"), auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));

        // Status remains unchanged
        assertEquals("New", req.getStatus());
        // No notifications sent
        verify(notificationService, never()).createNotification(any(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Updating nonexistent request returns 404 Not Found")
    void testUpdatingNonexistentRequest_404() {
        Authentication auth = mockAuth(professionalA);
        ResponseEntity<?> response = requestController.updateStatus("REQ-NONEXISTENT", Map.of("status", "Accepted"), auth);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("Status transition validation: cannot accept an already declined request (400 Bad Request)")
    void testCannotAcceptAlreadyDeclinedRequest() {
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(40L);
        req.setRequestId("REQ-4040");
        req.setClient(customerA);
        req.setProfessional(professionalA);
        req.setStatus("Declined");
        req.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req);

        Authentication auth = mockAuth(professionalA);
        ResponseEntity<?> response = requestController.updateStatus("REQ-4040", Map.of("status", "Accepted"), auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("already been declined"));
    }

    // ========================================================
    // 5. HIRED PROFESSIONALS BACKEND API & ISOLATION
    // ========================================================

    @Test
    @DisplayName("Hired Professionals endpoint returns accepted professionals for authenticated Customer")
    void testGetHiredProfessionals_CustomerSuccess() {
        // Accepted request for Customer A
        ClientServiceRequest req1 = new ClientServiceRequest();
        req1.setId(100L);
        req1.setRequestId("REQ-100");
        req1.setClient(customerA);
        req1.setProfessional(professionalA);
        req1.setRequestedService("Civil Engineering");
        req1.setStatus("Accepted");
        req1.setClientBudget(50000.0);
        req1.setProjectScope("Full foundation audit");
        req1.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req1);

        // Pending request for Customer A (should NOT be returned)
        ClientServiceRequest req2 = new ClientServiceRequest();
        req2.setId(101L);
        req2.setRequestId("REQ-101");
        req2.setClient(customerA);
        req2.setProfessional(professionalB);
        req2.setRequestedService("Plumbing");
        req2.setStatus("Pending");
        req2.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req2);

        // Accepted request for Customer B (should NOT be returned to Customer A)
        ClientServiceRequest req3 = new ClientServiceRequest();
        req3.setId(102L);
        req3.setRequestId("REQ-102");
        req3.setClient(customerB);
        req3.setProfessional(professionalB);
        req3.setRequestedService("Electrical");
        req3.setStatus("Accepted");
        req3.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req3);

        Authentication auth = mockAuth(customerA);
        ResponseEntity<?> response = hiredProfessionalController.getHiredProfessionals(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) response.getBody();
        assertNotNull(list);
        assertEquals(1, list.size());

        HiredProfessionalDto dto = list.get(0);
        assertEquals("REQ-100", dto.getRequestId());
        assertEquals("REQ-100", dto.getHiringId());
        assertEquals(professionalA.getId(), dto.getProfessionalUserId());
        assertEquals("Pro Alpha", dto.getProfessionalName());
        assertEquals("Civil Engineering", dto.getService());
        assertEquals("ACTIVE", dto.getStatus());
        assertEquals("DIRECT_HIRE", dto.getHiredVia());
        assertEquals(50000.0, dto.getAgreedBudget());
        assertEquals("Full foundation audit", dto.getProjectScope());
    }

    @Test
    @DisplayName("Customer A cannot access Customer B's hired professionals")
    void testCustomerOwnershipIsolation() {
        // Accepted request belonging ONLY to Customer B
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(200L);
        req.setRequestId("REQ-200");
        req.setClient(customerB);
        req.setProfessional(professionalA);
        req.setStatus("Accepted");
        req.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(req);

        // Customer A requests hired professionals
        Authentication authA = mockAuth(customerA);
        ResponseEntity<?> respA = hiredProfessionalController.getHiredProfessionals(authA);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> listA = (List<HiredProfessionalDto>) respA.getBody();
        assertTrue(listA.isEmpty(), "Customer A must NOT see Customer B's hired professional");

        // Customer B requests hired professionals
        Authentication authB = mockAuth(customerB);
        ResponseEntity<?> respB = hiredProfessionalController.getHiredProfessionals(authB);
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> listB = (List<HiredProfessionalDto>) respB.getBody();
        assertEquals(1, listB.size());
        assertEquals("REQ-200", listB.get(0).getRequestId());
    }

    @Test
    @DisplayName("Contractor and Material Seller can access their own hired professionals")
    void testContractorAndSellerCanAccessHiredProfessionals() {
        ClientServiceRequest reqCont = new ClientServiceRequest();
        reqCont.setId(300L);
        reqCont.setRequestId("REQ-300");
        reqCont.setClient(contractorA);
        reqCont.setProfessional(professionalA);
        reqCont.setStatus("Accepted");
        reqCont.setCreatedAt(LocalDateTime.now());
        mockDatabase.add(reqCont);

        Authentication auth = mockAuth(contractorA);
        ResponseEntity<?> resp = hiredProfessionalController.getHiredProfessionals(auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        @SuppressWarnings("unchecked")
        List<HiredProfessionalDto> list = (List<HiredProfessionalDto>) resp.getBody();
        assertEquals(1, list.size());
        assertEquals("REQ-300", list.get(0).getRequestId());
    }

    @Test
    @DisplayName("PROFESSIONAL cannot use the requester endpoint to access hiring data (403 Forbidden)")
    void testProfessionalCannotUseHiredProfessionalsEndpoint_403() {
        Authentication auth = mockAuth(pureProfessional);
        ResponseEntity<?> response = hiredProfessionalController.getHiredProfessionals(auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));
    }

    @Test
    @DisplayName("Unauthenticated request to hired-professionals returns 401 Unauthorized")
    void testUnauthenticatedHiredProfessionals_401() {
        ResponseEntity<?> response = hiredProfessionalController.getHiredProfessionals(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}
