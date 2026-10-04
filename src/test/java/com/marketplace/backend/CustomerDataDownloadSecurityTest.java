package com.marketplace.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — CUSTOMER ACCOUNT SETTINGS STEP 7
 * Customer Data Download Security, Role Authorization, IDOR Protection,
 * Secret Exclusion, Data Integrity, and Serialization Test Suite.
 */
public class CustomerDataDownloadSecurityTest {

    private CustomerProfileRepository profileRepository;
    private CustomerConstructionPreferenceRepository constructionPreferenceRepository;
    private CustomerSavedLocationRepository savedLocationRepository;
    private CustomerRegionalPreferenceRepository regionalPreferenceRepository;
    private ProjectRepository projectRepository;
    private MaterialRequestRepository materialRequestRepository;
    private ClientServiceRequestRepository clientServiceRequestRepository;
    private MaterialOrderRepository materialOrderRepository;
    private HiredProfessionalService hiredProfessionalService;
    private MarketplaceBackendApplication.UserRepository userRepository;

    private CustomerDataDownloadService downloadService;
    private CustomerDataDownloadController downloadController;
    private ObjectMapper objectMapper;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser professionalUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;

    private CustomerProfile profileA;
    private CustomerProfile profileB;
    private CustomerConstructionPreference constPrefA;
    private CustomerSavedLocation locationA1;
    private CustomerSavedLocation locationA2;
    private CustomerRegionalPreference regPrefA;
    private Project projectA;
    private Project projectB;

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Mumbai, Maharashtra");
        user.setPhone("+91 9876543210");
        user.setPasswordHash("$2a$10$e7S9Z0mQwKp7T8xN1SECRET_HASH_SHOULD_NEVER_LEAK");
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now().minusDays(10));
        user.setPhoneVerified(true);
        user.setPhoneVerifiedAt(LocalDateTime.now().minusDays(5));
        user.setPasswordUpdatedAt(LocalDateTime.now().minusDays(2));
        user.setProfilePhotoUrl("https://example.com/photoA.jpg");

        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);

            java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("createdAt");
            dateField.setAccessible(true);
            dateField.set(user, LocalDateTime.now().minusMonths(3));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private Authentication createMockAuth(String principalEmail, String role) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(principalEmail);
        doReturn(List.of(new SimpleGrantedAuthority(role))).when(auth).getAuthorities();
        return auth;
    }

    @BeforeEach
    void setUp() {
        profileRepository = mock(CustomerProfileRepository.class);
        constructionPreferenceRepository = mock(CustomerConstructionPreferenceRepository.class);
        savedLocationRepository = mock(CustomerSavedLocationRepository.class);
        regionalPreferenceRepository = mock(CustomerRegionalPreferenceRepository.class);
        projectRepository = mock(ProjectRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        clientServiceRequestRepository = mock(ClientServiceRequestRepository.class);
        materialOrderRepository = mock(MaterialOrderRepository.class);
        hiredProfessionalService = mock(HiredProfessionalService.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        downloadService = new CustomerDataDownloadService(
                profileRepository,
                constructionPreferenceRepository,
                savedLocationRepository,
                regionalPreferenceRepository,
                projectRepository,
                materialRequestRepository,
                clientServiceRequestRepository,
                materialOrderRepository,
                hiredProfessionalService
        );

        downloadController = new CustomerDataDownloadController(downloadService, userRepository);

        customerA = createTestUser(101L, "customer.a@buildbid.test", "Customer Alpha", "cust_alpha", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(102L, "customer.b@buildbid.test", "Customer Beta", "cust_beta", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createTestUser(201L, "contractor@buildbid.test", "Contractor User", "contractor_1", MarketplaceBackendApplication.Role.CONTRACTOR);
        professionalUser = createTestUser(202L, "architect@buildbid.test", "Architect User", "architect_1", MarketplaceBackendApplication.Role.PROFESSIONAL);
        sellerUser = createTestUser(301L, "seller@buildbid.test", "Seller User", "seller_1", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        when(userRepository.findByEmail("customer.a@buildbid.test")).thenReturn(Optional.of(customerA));
        when(userRepository.findByUsername("customer.a@buildbid.test")).thenReturn(Optional.of(customerA));
        when(userRepository.findByEmailIgnoreCase("customer.a@buildbid.test")).thenReturn(Optional.of(customerA));

        when(userRepository.findByEmail("customer.b@buildbid.test")).thenReturn(Optional.of(customerB));
        when(userRepository.findByUsername("customer.b@buildbid.test")).thenReturn(Optional.of(customerB));

        when(userRepository.findByEmail("contractor@buildbid.test")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("architect@buildbid.test")).thenReturn(Optional.of(professionalUser));
        when(userRepository.findByEmail("seller@buildbid.test")).thenReturn(Optional.of(sellerUser));

        // Setup Customer A Authoritative Entities
        profileA = new CustomerProfile();
        profileA.setId(1L);
        profileA.setUser(customerA);
        profileA.setFullName("Customer Alpha Full Name");
        profileA.setEmail("customer.a@buildbid.test");
        profileA.setPhone("+91 9876543210");
        profileA.setAddress("404 Skyline Tower, Worli");
        profileA.setCity("Mumbai");
        profileA.setState("Maharashtra");
        profileA.setPincode("400018");
        profileA.setAboutMe("Home builder seeking premium renovation services.");
        profileA.setPreferredLanguage("English");
        when(profileRepository.findByUser(customerA)).thenReturn(Optional.of(profileA));

        constPrefA = new CustomerConstructionPreference(customerA);
        constPrefA.setId(10L);
        constPrefA.setPreferredProjectType("Residential New Construction");
        constPrefA.setPreferredPropertyType("Independent Villa");
        constPrefA.setPreferredBuiltUpArea(3200.0);
        constPrefA.setPreferredNumberOfFloors("G+2 Floors");
        constPrefA.setPreferredConstructionQuality("Premium");
        constPrefA.setPreferredBudgetRange("₹50L - ₹1Cr");
        when(constructionPreferenceRepository.findByUser(customerA)).thenReturn(Optional.of(constPrefA));

        locationA1 = new CustomerSavedLocation(customerA, "Primary Villa Site", "Plot 42", "Green Valley", "Pune", "Maharashtra", "411001", "Near Golf Course", true);
        locationA1.setId(1001L);
        locationA2 = new CustomerSavedLocation(customerA, "Corporate Office", "Level 5 Tech Park", null, "Mumbai", "Maharashtra", "400051", "BKC", false);
        locationA2.setId(1002L);
        when(savedLocationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(customerA)).thenReturn(List.of(locationA1, locationA2));

        regPrefA = new CustomerRegionalPreference(customerA);
        regPrefA.setId(20L);
        regPrefA.setTimeZone("Asia/Kolkata");
        regPrefA.setCurrency("INR");
        regPrefA.setAreaUnit("sq ft");
        regPrefA.setDateFormat("DD/MM/YYYY");
        regPrefA.setNumberFormat("Indian");
        when(regionalPreferenceRepository.findByUser(customerA)).thenReturn(Optional.of(regPrefA));

        projectA = new Project();
        projectA.setId(501L);
        projectA.setProjectId("PRJ-2026-001");
        projectA.setProjectTitle("Luxury Penthouse Construction");
        projectA.setProjectType("Residential");
        projectA.setCity("Mumbai");
        projectA.setState("Maharashtra");
        projectA.setCustomer(customerA);
        projectA.setStatus("OPEN");
        projectA.setBudget("₹85,00,000");
        when(projectRepository.findByCustomer(customerA)).thenReturn(List.of(projectA));

        // Customer B Setup (Cross-user leakage protection check)
        profileB = new CustomerProfile();
        profileB.setId(2L);
        profileB.setUser(customerB);
        profileB.setFullName("Customer Beta Secret Data");
        profileB.setEmail("customer.b@buildbid.test");
        when(profileRepository.findByUser(customerB)).thenReturn(Optional.of(profileB));

        projectB = new Project();
        projectB.setId(502L);
        projectB.setProjectId("PRJ-2026-999-SECRET-BETA");
        projectB.setProjectTitle("Secret Beta Commercial Complex");
        projectB.setCustomer(customerB);
        when(projectRepository.findByCustomer(customerB)).thenReturn(List.of(projectB));
    }

    // ============================================================
    // 1. AUTHENTICATION & ROLE AUTHORIZATION TESTS
    // ============================================================

    @Test
    @DisplayName("1. Unauthenticated request -> 401 Unauthorized")
    void testUnauthenticatedReturns401() {
        ResponseEntity<?> response = downloadController.downloadMyData(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Unauthorized"));

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> response2 = downloadController.downloadMyData(unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, response2.getStatusCode());
    }

    @Test
    @DisplayName("2. CUSTOMER role -> 200 OK allowed")
    void testCustomerRoleAllowed() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("3. CONTRACTOR role -> 403 Forbidden")
    void testContractorRoleForbidden() {
        Authentication auth = createMockAuth("contractor@buildbid.test", "ROLE_CONTRACTOR");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));
    }

    @Test
    @DisplayName("4. PROFESSIONAL role -> 403 Forbidden")
    void testProfessionalRoleForbidden() {
        Authentication auth = createMockAuth("architect@buildbid.test", "ROLE_PROFESSIONAL");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));
    }

    @Test
    @DisplayName("5. MATERIAL_SELLER role -> 403 Forbidden")
    void testSellerRoleForbidden() {
        Authentication auth = createMockAuth("seller@buildbid.test", "ROLE_MATERIAL_SELLER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));
    }

    // ============================================================
    // 2. EXPORT FORMAT, FILENAME, AND CONTENT TYPE TESTS
    // ============================================================

    @Test
    @DisplayName("6-10. Successful export headers: correct Content-Type, Content-Disposition, and safe filename")
    void testExportHeadersAndFilename() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        // 7. Correct JSON Content-Type
        HttpHeaders headers = response.getHeaders();
        assertEquals(MediaType.APPLICATION_JSON, headers.getContentType());

        // 8. Correct attachment disposition
        String disposition = headers.getFirst(HttpHeaders.CONTENT_DISPOSITION);
        assertNotNull(disposition);
        assertTrue(disposition.startsWith("attachment;"));

        // 9. Safe filename: buildbid-my-data-YYYY-MM-DD.json
        String expectedDate = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String expectedFilename = "buildbid-my-data-" + expectedDate + ".json";
        assertTrue(disposition.contains("filename=\"" + expectedFilename + "\""));

        // Must NOT contain email, phone, user id, or secrets in filename
        assertFalse(disposition.contains("customer.a"));
        assertFalse(disposition.contains("9876543210"));
        assertFalse(disposition.contains("101"));

        // 10. Valid body
        assertTrue(response.getBody() instanceof CustomerDataExportDto);
    }

    // ============================================================
    // 3. OWNERSHIP & DATA INCLUSION TESTS
    // ============================================================

    @Test
    @DisplayName("11. Export contains authenticated customer's own profile data")
    void testExportContainsCustomerProfile() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        assertNotNull(dto);
        assertNotNull(dto.getProfile());
        assertEquals("Customer Alpha Full Name", dto.getProfile().getFullName());
        assertEquals("customer.a@buildbid.test", dto.getProfile().getEmail());
        assertEquals("Mumbai", dto.getProfile().getCity());
        assertEquals("Maharashtra", dto.getProfile().getState());
        assertEquals("400018", dto.getProfile().getPincode());
        assertEquals("English", dto.getProfile().getPreferredLanguage());
    }

    @Test
    @DisplayName("12. Export contains authenticated customer's own saved locations")
    void testExportContainsCustomerSavedLocations() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        assertNotNull(dto);
        assertNotNull(dto.getSavedLocations());
        assertEquals(2, dto.getSavedLocations().size());
        assertEquals("Primary Villa Site", dto.getSavedLocations().get(0).getLabel());
        assertTrue(dto.getSavedLocations().get(0).isDefault());
        assertEquals("Corporate Office", dto.getSavedLocations().get(1).getLabel());
        assertFalse(dto.getSavedLocations().get(1).isDefault());
    }

    @Test
    @DisplayName("13. Export contains authenticated customer's own construction preferences")
    void testExportContainsCustomerConstructionPreferences() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        assertNotNull(dto);
        assertNotNull(dto.getConstructionPreferences());
        assertEquals("Residential New Construction", dto.getConstructionPreferences().getPreferredProjectType());
        assertEquals("Independent Villa", dto.getConstructionPreferences().getPreferredPropertyType());
        assertEquals(3200.0, dto.getConstructionPreferences().getPreferredBuiltUpArea());
        assertEquals("G+2 Floors", dto.getConstructionPreferences().getPreferredNumberOfFloors());
        assertEquals("Premium", dto.getConstructionPreferences().getPreferredConstructionQuality());
    }

    @Test
    @DisplayName("14. Export contains authenticated customer's own regional preferences")
    void testExportContainsCustomerRegionalPreferences() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        assertNotNull(dto);
        assertNotNull(dto.getRegionalPreferences());
        assertEquals("English", dto.getRegionalPreferences().getPreferredLanguage());
        assertEquals("Asia/Kolkata", dto.getRegionalPreferences().getTimeZone());
        assertEquals("INR", dto.getRegionalPreferences().getCurrency());
        assertEquals("sq ft", dto.getRegionalPreferences().getAreaUnit());
        assertEquals("DD/MM/YYYY", dto.getRegionalPreferences().getDateFormat());
        assertEquals("Indian", dto.getRegionalPreferences().getNumberFormat());
    }

    @Test
    @DisplayName("15. Export contains only projects belonging to authenticated customer")
    void testExportContainsOnlyCustomerProjects() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        assertNotNull(dto);
        assertNotNull(dto.getProjects());
        assertEquals(1, dto.getProjects().size());
        assertEquals("PRJ-2026-001", dto.getProjects().get(0).getProjectId());
        assertEquals("Luxury Penthouse Construction", dto.getProjects().get(0).getProjectTitle());
    }

    @Test
    @DisplayName("16. Export contains customer-authorized requests, orders, and direct hire")
    void testExportContainsRequestsOrdersAndDirectHire() {
        // Mock material request
        MaterialRequest mr = new MaterialRequest();
        mr.setRequestId("REQ-MAT-001");
        mr.setRequestType("POSTED_REQUIREMENT");
        mr.setProjectName("Site Cement Batch 1");
        mr.setDeliveryAddress("Plot 42, Green Valley, Pune");
        mr.setStatus("NEW");
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(customerA)).thenReturn(List.of(mr));

        // Mock material order
        MaterialOrder order = new MaterialOrder();
        order.setOrderCode("ORD-2026-00042");
        order.setTotalAmount(145000.0);
        order.setCurrency("INR");
        order.setOrderStatus("CONFIRMED");
        order.setPaymentStatus("PAID");
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(customerA.getId())).thenReturn(List.of(order));

        // Mock hired professional
        HiredProfessionalDto hired = new HiredProfessionalDto();
        hired.setHiringId("HIR-901");
        hired.setProfessionalName("Master Architect Dev");
        hired.setServiceType("Architectural Design");
        hired.setStatus("Accepted");
        when(hiredProfessionalService.getHiredProfessionalsForUser(customerA)).thenReturn(List.of(hired));

        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        assertNotNull(dto);
        assertEquals(1, dto.getRequests().size());
        assertEquals("REQ-MAT-001", dto.getRequests().get(0).getRequestId());

        assertEquals(1, dto.getOrders().size());
        assertEquals("ORD-2026-00042", dto.getOrders().get(0).getOrderCode());
        assertEquals(145000.0, dto.getOrders().get(0).getTotalAmount());

        assertEquals(1, dto.getDirectHire().size());
        assertEquals("HIR-901", dto.getDirectHire().get(0).getHiringId());
        assertEquals("Master Architect Dev", dto.getDirectHire().get(0).getProfessionalName());
    }

    @Test
    @DisplayName("17. Cross-user data protection: Customer B data is NEVER present in Customer A export")
    void testCrossUserDataProtection() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        assertNotNull(dto);

        // Verify Customer B data is completely absent
        assertNotEquals("Customer Beta Secret Data", dto.getProfile().getFullName());
        assertFalse(dto.getProjects().stream().anyMatch(p -> "PRJ-2026-999-SECRET-BETA".equals(p.getProjectId())));
        assertFalse(dto.getAccount().getEmail().contains("customer.b"));
    }

    // ============================================================
    // 4. SECURITY & SECRET LEAKAGE PREVENTION TESTS
    // ============================================================

    @Test
    @DisplayName("18-24. Secret leakage prevention: Password hash, OTPs, tokens, and internal keys MUST be absent in JSON serialization")
    void testSecuritySecretsExclusion() throws Exception {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();

        // Convert the export DTO to JSON string to verify raw serialized output
        String jsonOutput = objectMapper.writeValueAsString(dto);

        // 18. Password hash absent
        assertFalse(jsonOutput.contains("passwordHash"));
        assertFalse(jsonOutput.contains("SECRET_HASH_SHOULD_NEVER_LEAK"));

        // 19. JWT absent
        assertFalse(jsonOutput.contains("jwt"));
        assertFalse(jsonOutput.contains("Bearer"));
        assertFalse(jsonOutput.contains("token"));

        // 20-21. OTP code and OTP hash absent
        assertFalse(jsonOutput.contains("otpHash"));
        assertFalse(jsonOutput.contains("otpCode"));

        // 22-24. Verification secret/token absent
        assertFalse(jsonOutput.contains("verificationToken"));
        assertFalse(jsonOutput.contains("secret"));
        assertFalse(jsonOutput.contains("apiKey"));

        // Verification status (boolean/timestamp) IS present and allowed
        assertTrue(jsonOutput.contains("\"emailVerified\":true"));
        assertTrue(jsonOutput.contains("\"phoneVerified\":true"));
    }

    // ============================================================
    // 5. BEHAVIOR, IMMUTABILITY, AND IDOR PREVENTION TESTS
    // ============================================================

    @Test
    @DisplayName("25. Empty datasets serialize cleanly as [] rather than null or error")
    void testEmptyDatasetsSerializeAsEmptyArrays() throws Exception {
        // Customer with zero projects, locations, requests, orders, or direct hires
        MarketplaceBackendApplication.MarketplaceUser emptyUser = createTestUser(999L, "empty@buildbid.test", "Empty User", "empty_u", MarketplaceBackendApplication.Role.CUSTOMER);
        when(userRepository.findByEmail("empty@buildbid.test")).thenReturn(Optional.of(emptyUser));
        when(savedLocationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(emptyUser)).thenReturn(Collections.emptyList());
        when(projectRepository.findByCustomer(emptyUser)).thenReturn(Collections.emptyList());
        when(materialRequestRepository.findByBuyerOrderByCreatedAtDesc(emptyUser)).thenReturn(Collections.emptyList());
        when(clientServiceRequestRepository.findByClient_IdOrderByCreatedAtDesc(999L)).thenReturn(Collections.emptyList());
        when(materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(999L)).thenReturn(Collections.emptyList());
        when(hiredProfessionalService.getHiredProfessionalsForUser(emptyUser)).thenReturn(Collections.emptyList());

        Authentication auth = createMockAuth("empty@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response = downloadController.downloadMyData(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        CustomerDataExportDto dto = (CustomerDataExportDto) response.getBody();
        assertNotNull(dto);
        assertNotNull(dto.getSavedLocations());
        assertNotNull(dto.getProjects());
        assertNotNull(dto.getRequests());
        assertNotNull(dto.getOrders());
        assertNotNull(dto.getDirectHire());

        String json = objectMapper.writeValueAsString(dto);
        assertTrue(json.contains("\"savedLocations\":[]"));
        assertTrue(json.contains("\"projects\":[]"));
        assertTrue(json.contains("\"requests\":[]"));
        assertTrue(json.contains("\"orders\":[]"));
        assertTrue(json.contains("\"directHire\":[]"));
    }

    @Test
    @DisplayName("26. Export is strictly read-only and does NOT mutate database state")
    void testExportDoesNotMutateDatabaseState() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        downloadController.downloadMyData(auth);

        // Verify zero save, delete, or update operations were performed on any repository
        verify(userRepository, never()).save(any());
        verify(userRepository, never()).delete(any());
        verify(profileRepository, never()).save(any());
        verify(profileRepository, never()).delete(any());
        verify(constructionPreferenceRepository, never()).save(any());
        verify(savedLocationRepository, never()).save(any());
        verify(regionalPreferenceRepository, never()).save(any());
        verify(projectRepository, never()).save(any());
    }

    @Test
    @DisplayName("27. Repeated downloads produce consistent authorized data")
    void testRepeatedDownloadsProduceConsistentData() {
        Authentication auth = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> response1 = downloadController.downloadMyData(auth);
        ResponseEntity<?> response2 = downloadController.downloadMyData(auth);

        CustomerDataExportDto dto1 = (CustomerDataExportDto) response1.getBody();
        CustomerDataExportDto dto2 = (CustomerDataExportDto) response2.getBody();

        assertNotNull(dto1);
        assertNotNull(dto2);
        assertEquals(dto1.getAccount().getEmail(), dto2.getAccount().getEmail());
        assertEquals(dto1.getProfile().getFullName(), dto2.getProfile().getFullName());
        assertEquals(dto1.getProjects().size(), dto2.getProjects().size());
        assertEquals(dto1.getSavedLocations().size(), dto2.getSavedLocations().size());
    }

    @Test
    @DisplayName("28. IDOR Prevention: Identity resolved strictly from principal, no caller parameters trusted")
    void testIdorPreventionPrincipalOnly() {
        // Only principal email customer.a@buildbid.test determines identity
        Authentication authA = createMockAuth("customer.a@buildbid.test", "ROLE_CUSTOMER");
        ResponseEntity<?> responseA = downloadController.downloadMyData(authA);
        CustomerDataExportDto dtoA = (CustomerDataExportDto) responseA.getBody();

        assertEquals("customer.a@buildbid.test", dtoA.getAccount().getEmail());
        // Verify customer B's data is impossible to access using customer A's authentication
        assertNotEquals("customer.b@buildbid.test", dtoA.getAccount().getEmail());
    }
}
