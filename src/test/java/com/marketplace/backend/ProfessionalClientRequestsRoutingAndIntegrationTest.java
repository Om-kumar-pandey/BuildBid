package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Targeted verification suite for BuildBid Professional Dashboard Client Requests:
 * 1. Spring MVC endpoint mapping disambiguation between CustomerRequestController and ClientServiceRequestController.
 * 2. Unambiguous routing for GET /api/professional/requests, GET /api/professional/my-requests,
 *    GET /api/customer/my-requests, and GET /api/contractor/my-requests.
 * 3. Empty list handling (200 OK with empty array, avoiding 500 error).
 * 4. Lazy proxy / deleted client entity resilience in response mapping.
 * 5. Accept Direct Hire request integration with My Work (ProjectApplicationService.getActiveWorksForProfessional).
 * 6. Role-based access control and cross-professional isolation.
 */
public class ProfessionalClientRequestsRoutingAndIntegrationTest {

    private ClientServiceRequestRepository clientServiceRequestRepository;
    private MaterialRequestRepository materialRequestRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private ProfessionalServiceRepository professionalServiceRepository;
    private NotificationService notificationService;
    private ProjectProfessionalApplicationRepository projectApplicationRepository;
    private ProjectRepository projectRepository;

    private ClientServiceRequestService clientServiceRequestService;
    private ClientServiceRequestController clientServiceRequestController;
    private CustomerRequestController customerRequestController;
    private ProjectApplicationService projectApplicationService;

    private MarketplaceBackendApplication.MarketplaceUser proUserA;
    private MarketplaceBackendApplication.MarketplaceUser proUserB;
    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;

    private Authentication authProA;
    private Authentication authProB;
    private Authentication authCustomer;
    private Authentication authContractor;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        clientServiceRequestRepository = mock(ClientServiceRequestRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        professionalServiceRepository = mock(ProfessionalServiceRepository.class);
        notificationService = mock(NotificationService.class);
        projectApplicationRepository = mock(ProjectProfessionalApplicationRepository.class);
        projectRepository = mock(ProjectRepository.class);

        // Instantiate services
        clientServiceRequestService = new ClientServiceRequestService(clientServiceRequestRepository, notificationService);
        clientServiceRequestController = new ClientServiceRequestController(
                clientServiceRequestService, userRepository, professionalServiceRepository
        );

        customerRequestController = new CustomerRequestController(
                materialRequestRepository, clientServiceRequestRepository, userRepository
        );

        projectApplicationService = new ProjectApplicationService(
                projectRepository,
                projectApplicationRepository,
                professionalServiceRepository,
                userRepository,
                null,
                notificationService,
                clientServiceRequestRepository
        );

        // Mock users
        proUserA = createUser(101L, "proA@buildbid.com", "Pro Architect A", MarketplaceBackendApplication.Role.PROFESSIONAL);
        proUserB = createUser(102L, "proB@buildbid.com", "Pro Architect B", MarketplaceBackendApplication.Role.PROFESSIONAL);
        customerUser = createUser(201L, "client@buildbid.com", "Client Rahul", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createUser(301L, "contractor@buildbid.com", "Contractor Singh", MarketplaceBackendApplication.Role.CONTRACTOR);

        authProA = new UsernamePasswordAuthenticationToken(proUserA.getEmail(), null,
                List.of(new SimpleGrantedAuthority("ROLE_PROFESSIONAL")));
        authProB = new UsernamePasswordAuthenticationToken(proUserB.getEmail(), null,
                List.of(new SimpleGrantedAuthority("ROLE_PROFESSIONAL")));
        authCustomer = new UsernamePasswordAuthenticationToken(customerUser.getEmail(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        authContractor = new UsernamePasswordAuthenticationToken(contractorUser.getEmail(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CONTRACTOR")));

        when(userRepository.findByEmail(proUserA.getEmail())).thenReturn(Optional.of(proUserA));
        when(userRepository.findByEmail(proUserB.getEmail())).thenReturn(Optional.of(proUserB));
        when(userRepository.findByEmail(customerUser.getEmail())).thenReturn(Optional.of(customerUser));
        when(userRepository.findByEmail(contractorUser.getEmail())).thenReturn(Optional.of(contractorUser));

        when(userRepository.findById(proUserA.getId())).thenReturn(Optional.of(proUserA));
        when(userRepository.findById(proUserB.getId())).thenReturn(Optional.of(proUserB));
        when(userRepository.findById(customerUser.getId())).thenReturn(Optional.of(customerUser));
        when(userRepository.findById(contractorUser.getId())).thenReturn(Optional.of(contractorUser));

        // Setup Spring MVC MockMvc with BOTH controllers registered together
        mockMvc = MockMvcBuilders.standaloneSetup(clientServiceRequestController, customerRequestController).build();
    }

    private MarketplaceBackendApplication.MarketplaceUser createUser(Long id, String email, String name, MarketplaceBackendApplication.Role role) {
        MarketplaceBackendApplication.MarketplaceUser u = new MarketplaceBackendApplication.MarketplaceUser();
        try {
            Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(u, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        u.setEmail(email);
        u.setName(name);
        u.setUsername(email);
        u.setPhone("+91 98765 43210");
        u.setLocation("Bangalore, Karnataka");
        Set<MarketplaceBackendApplication.Role> roles = new HashSet<>();
        roles.add(role);
        u.setRoles(roles);
        return u;
    }

    // ========================================================
    // 1. SPRING MVC ROUTE DISAMBIGUATION & REGISTRATION
    // ========================================================

    @Test
    @DisplayName("Verify Spring MVC registers both controllers without Ambiguous Mapping collision")
    void testSpringMvcRouteRegistrationNoCollision() {
        assertDoesNotThrow(() -> {
            MockMvcBuilders.standaloneSetup(clientServiceRequestController, customerRequestController).build();
        }, "Registering both controllers must not throw IllegalStateException: Ambiguous handler mapping");
    }

    @Test
    @DisplayName("Verify GET /api/professional/requests routes to ClientServiceRequestController with empty list (200 OK)")
    void testGetProfessionalRequestsEmptyListRoutesCorrectly() throws Exception {
        when(clientServiceRequestRepository.findByProfessional_IdOrderByCreatedAtDesc(proUserA.getId()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/professional/requests")
                        .principal(authProA)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(clientServiceRequestRepository, times(1)).findByProfessional_IdOrderByCreatedAtDesc(proUserA.getId());
        verify(materialRequestRepository, never()).findByBuyerOrderByCreatedAtDesc(any());
    }

    @Test
    @DisplayName("Verify GET /api/professional/my-requests routes to CustomerRequestController for professional material requests")
    void testGetProfessionalMyRequestsRoutesToCustomerRequestController() throws Exception {
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(proUserA))
                .thenReturn(Collections.emptyList());
        when(clientServiceRequestRepository.findByClient_IdOrderByCreatedAtDesc(proUserA.getId()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/professional/my-requests")
                        .principal(authProA)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(materialRequestRepository, times(1)).findByBuyerOrderByCreatedAtDesc(proUserA);
    }

    @Test
    @DisplayName("Verify GET /api/customer/my-requests and /requests route correctly to CustomerRequestController")
    void testCustomerMyRequestsRoutesCorrectly() throws Exception {
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customerUser))
                .thenReturn(Collections.emptyList());
        when(clientServiceRequestRepository.findByClient_IdOrderByCreatedAtDesc(customerUser.getId()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/customer/my-requests")
                        .principal(authCustomer)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/customer/requests")
                        .principal(authCustomer)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("Verify GET /api/contractor/my-requests and /requests route correctly to CustomerRequestController")
    void testContractorMyRequestsRoutesCorrectly() throws Exception {
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(contractorUser))
                .thenReturn(Collections.emptyList());
        when(clientServiceRequestRepository.findByClient_IdOrderByCreatedAtDesc(contractorUser.getId()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/contractor/my-requests")
                        .principal(authContractor)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/contractor/requests")
                        .principal(authContractor)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ========================================================
    // 2. DATA RESOLUTION & PART C RESPONSE MAPPING
    // ========================================================

    @Test
    @DisplayName("Verify incoming Direct Hire requests return complete Part C contract fields")
    void testIncomingDirectHireRequestReturnsPartCContract() {
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(55L);
        req.setRequestId("REQ-55");
        req.setProfessional(proUserA);
        req.setClient(customerUser);
        req.setClientName("Rahul Sharma");
        req.setClientEmail("rahul@example.com");
        req.setClientPhone("+91 91234 56789");
        req.setRequesterType("CUSTOMER");
        req.setProjectName("Villa Structural Design");
        req.setRequestedService("Structural Engineering");
        req.setLocation("Whitefield, Bangalore");
        req.setTargetDate("2026-11-15");
        req.setClientBudget(75000.0);
        req.setStatus("New");
        req.setProjectScope("Full structural analysis and drawing sheet generation.");
        req.setCreatedAt(LocalDateTime.now().minusHours(2));

        when(clientServiceRequestRepository.findByProfessional_IdOrderByCreatedAtDesc(proUserA.getId()))
                .thenReturn(List.of(req));

        ResponseEntity<?> response = clientServiceRequestController.getMyRequests(authProA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> body = (List<Map<String, Object>>) response.getBody();
        assertNotNull(body);
        assertEquals(1, body.size());

        Map<String, Object> card = body.get(0);
        assertEquals("REQ-55", card.get("id"));
        assertEquals("REQ-55", card.get("requestId"));
        assertEquals("DIRECT_HIRE", card.get("requestType"));
        assertEquals("CUSTOMER", card.get("requesterRole"));
        assertEquals("Rahul Sharma", card.get("requesterName"));
        assertEquals(customerUser.getId(), card.get("requesterUserId"));
        assertEquals("+91 91234 56789", card.get("requesterPhone"));
        assertEquals("Whitefield, Bangalore", card.get("requesterLocation"));
        assertEquals("Villa Structural Design", card.get("projectName"));
        assertEquals("Structural Engineering", card.get("requestedService"));
        assertEquals(75000.0, card.get("clientBudget"));
        assertEquals("New", card.get("status"));
        assertEquals(proUserA.getId(), card.get("professionalId"));
    }

    // ========================================================
    // 3. SECONDARY RISKS: PROXY & MISSING CLIENT RESILIENCE
    // ========================================================

    @Test
    @DisplayName("Verify toRequestMap handles detached / null / failing client entity without HTTP 500")
    void testToRequestMapHandlesFailingClientEntityGracefully() {
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(99L);
        req.setRequestId("REQ-99");
        req.setProfessional(proUserA);
        // Client entity is null (or detached proxy whose table row was removed)
        req.setClient(null);
        req.setClientName("Deleted Client User");
        req.setClientPhone("+91 99999 88888");
        req.setLocation("Indiranagar, Bangalore");
        req.setRequesterType("CUSTOMER");
        req.setProjectName("Heritage Restoration");
        req.setRequestedService("Heritage Consultant");
        req.setClientBudget(120000.0);
        req.setStatus("New");
        req.setCreatedAt(LocalDateTime.now().minusDays(1));

        when(clientServiceRequestRepository.findByProfessional_IdOrderByCreatedAtDesc(proUserA.getId()))
                .thenReturn(List.of(req));

        assertDoesNotThrow(() -> {
            ResponseEntity<?> response = clientServiceRequestController.getMyRequests(authProA);
            assertEquals(HttpStatus.OK, response.getStatusCode());

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> body = (List<Map<String, Object>>) response.getBody();
            assertNotNull(body);
            assertEquals(1, body.size());
            Map<String, Object> card = body.get(0);
            assertNull(card.get("requesterUserId"));
            assertEquals("Deleted Client User", card.get("requesterName"));
            assertEquals("+91 99999 88888", card.get("requesterPhone"));
            assertEquals("Indiranagar, Bangalore", card.get("requesterLocation"));
            assertEquals("DIRECT_HIRE", card.get("requestType"));
        });
    }

    // ========================================================
    // 4. ACCEPTANCE & MY WORK ROUTING INTEGRATION
    // ========================================================

    @Test
    @DisplayName("Verify accepting a Direct Hire request immediately surfaces in My Work (getActiveWorksForProfessional)")
    void testAcceptDirectHireSurfacesInActiveWorks() {
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(77L);
        req.setRequestId("REQ-77");
        req.setProfessional(proUserA);
        req.setClient(customerUser);
        req.setClientName("Sunita Menon");
        req.setRequesterType("CUSTOMER");
        req.setProjectName("Eco-friendly Villa Interior");
        req.setRequestedService("Interior Architecture");
        req.setClientBudget(90000.0);
        req.setStatus("New");
        req.setTargetDate("2026-12-01");
        req.setCreatedAt(LocalDateTime.now().minusDays(2));

        when(clientServiceRequestRepository.findByRequestIdAndProfessional_Id("REQ-77", proUserA.getId()))
                .thenReturn(Optional.of(req));
        when(clientServiceRequestRepository.findByIdAndProfessional_Id(77L, proUserA.getId()))
                .thenReturn(Optional.of(req));
        when(clientServiceRequestRepository.save(any(ClientServiceRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // 1. Accept request
        ResponseEntity<?> acceptResp = clientServiceRequestController.updateStatus("REQ-77", Map.of("status", "Accepted"), authProA);
        assertEquals(HttpStatus.OK, acceptResp.getStatusCode());
        assertEquals("Accepted", req.getStatus());
        assertNotNull(req.getUpdatedAt());

        // 2. Query Active Works for Professional A
        when(clientServiceRequestRepository.findByProfessional_IdAndStatusIgnoreCaseOrderByCreatedAtDesc(proUserA.getId(), "Accepted"))
                .thenReturn(List.of(req));
        when(projectApplicationRepository.findByProfessionalIdAndStatusOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Collections.emptyList());

        List<ProjectApplicationService.ProfessionalActiveWorkDto> activeWorks =
                projectApplicationService.getActiveWorksForProfessional(proUserA);

        assertNotNull(activeWorks);
        assertEquals(1, activeWorks.size());
        ProjectApplicationService.ProfessionalActiveWorkDto work = activeWorks.get(0);
        assertEquals("REQ-77", work.getId());
        assertEquals("Eco-friendly Villa Interior", work.getName());
        assertEquals("Sunita Menon", work.getCustomer());
        assertEquals("Interior Architecture", work.getService());
        assertEquals("₹90,000", work.getBudget());
        assertEquals("Active", work.getStatus());
        assertEquals(25, work.getProgress());
        assertEquals("Drawings & BOQ", work.getNextMilestone());
        assertEquals("DIRECT_HIRE", work.getSource());
        assertEquals("2026-12-01", work.getDeadline());
    }

    @Test
    @DisplayName("Verify declining a Direct Hire request does NOT appear in My Work")
    void testDeclineDirectHireDoesNotAppearInActiveWorks() {
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(88L);
        req.setRequestId("REQ-88");
        req.setProfessional(proUserA);
        req.setClient(customerUser);
        req.setStatus("New");

        when(clientServiceRequestRepository.findByRequestIdAndProfessional_Id("REQ-88", proUserA.getId()))
                .thenReturn(Optional.of(req));
        when(clientServiceRequestRepository.save(any(ClientServiceRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Decline request
        ResponseEntity<?> declineResp = clientServiceRequestController.updateStatus("REQ-88", Map.of("status", "Declined"), authProA);
        assertEquals(HttpStatus.OK, declineResp.getStatusCode());
        assertEquals("Declined", req.getStatus());

        // Active Works query searches ONLY for "Accepted" status
        when(clientServiceRequestRepository.findByProfessional_IdAndStatusIgnoreCaseOrderByCreatedAtDesc(proUserA.getId(), "Accepted"))
                .thenReturn(Collections.emptyList());
        when(projectApplicationRepository.findByProfessionalIdAndStatusOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Collections.emptyList());

        List<ProjectApplicationService.ProfessionalActiveWorkDto> activeWorks =
                projectApplicationService.getActiveWorksForProfessional(proUserA);

        assertTrue(activeWorks.isEmpty(), "Declined direct hire requests must never appear in My Work");
    }

    @Test
    @DisplayName("Verify state transition restriction: Cannot accept an already declined request")
    void testCannotAcceptDeclinedRequest() {
        ClientServiceRequest req = new ClientServiceRequest();
        req.setId(89L);
        req.setRequestId("REQ-89");
        req.setProfessional(proUserA);
        req.setStatus("Declined");

        when(clientServiceRequestRepository.findByRequestIdAndProfessional_Id("REQ-89", proUserA.getId()))
                .thenReturn(Optional.of(req));

        ResponseEntity<?> response = clientServiceRequestController.updateStatus("REQ-89", Map.of("status", "Accepted"), authProA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("already been declined"));
    }

    // ========================================================
    // 5. SECURITY & ISOLATION
    // ========================================================

    @Test
    @DisplayName("Verify cross-professional isolation: Professional B cannot access Professional A's requests")
    void testCrossProfessionalIsolation() {
        ClientServiceRequest reqA = new ClientServiceRequest();
        reqA.setId(10L);
        reqA.setRequestId("REQ-10");
        reqA.setProfessional(proUserA);
        reqA.setStatus("New");

        // Professional B attempts to act on Professional A's request
        when(clientServiceRequestRepository.findByRequestIdAndProfessional_Id("REQ-10", proUserB.getId()))
                .thenReturn(Optional.empty());

        ResponseEntity<?> response = clientServiceRequestController.updateStatus("REQ-10", Map.of("status", "Accepted"), authProB);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("Verify role restriction: Customer cannot access /api/professional/requests (403 Forbidden)")
    void testCustomerCannotAccessProfessionalRequestsEndpoint() {
        ResponseEntity<?> response = clientServiceRequestController.getMyRequests(authCustomer);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }
}
