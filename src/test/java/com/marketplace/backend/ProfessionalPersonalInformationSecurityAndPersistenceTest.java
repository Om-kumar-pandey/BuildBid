package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — PROFESSIONAL ACCOUNT SETTINGS: PERSONAL INFORMATION TEST SUITE
 *
 * Verifies Personal Information retrieval, validation, database persistence,
 * role authorization, and IDOR protection across the authenticated Professional lifecycle.
 */
public class ProfessionalPersonalInformationSecurityAndPersistenceTest {

    private MarketplaceBackendApplication.UserRepository userRepository;
    private ProfessionalProfileService profileService;
    private ProfessionalProfilePhotoService photoService;
    private ProfessionalProfileController profileController;

    private MarketplaceBackendApplication.MarketplaceUser proUserA;
    private MarketplaceBackendApplication.MarketplaceUser proUserB;
    private MarketplaceBackendApplication.MarketplaceUser legacyServiceProvider;
    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;

    private Authentication authProA;
    private Authentication authProB;
    private Authentication authLegacyProvider;
    private Authentication authCustomer;
    private Authentication authContractor;

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Mumbai");
        user.setPhone("9876543210");
        user.setTitle("Senior Structural Engineer");
        user.setPincode("400001");
        user.setBio("Experienced in RCC design and site supervision.");
        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);

            java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("createdAt");
            dateField.setAccessible(true);
            dateField.set(user, LocalDateTime.now().minusMonths(2));
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
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        photoService = mock(ProfessionalProfilePhotoService.class);

        profileService = new ProfessionalProfileService(userRepository);
        profileController = new ProfessionalProfileController(profileService, photoService, userRepository);

        proUserA = createTestUser(101L, "pro.a@example.com", "Professional Alpha", "pro_alpha", MarketplaceBackendApplication.Role.PROFESSIONAL);
        proUserB = createTestUser(102L, "pro.b@example.com", "Professional Beta", "pro_beta", MarketplaceBackendApplication.Role.PROFESSIONAL);
        legacyServiceProvider = createTestUser(103L, "provider@example.com", "Service Provider User", "service_provider", MarketplaceBackendApplication.Role.SERVICE_PROVIDER);
        customerUser = createTestUser(201L, "customer@example.com", "Customer User", "customer_1", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createTestUser(301L, "contractor@example.com", "Contractor User", "contractor_1", MarketplaceBackendApplication.Role.CONTRACTOR);

        authProA = createMockAuth("pro.a@example.com", "ROLE_PROFESSIONAL");
        authProB = createMockAuth("pro.b@example.com", "ROLE_PROFESSIONAL");
        authLegacyProvider = createMockAuth("provider@example.com", "ROLE_SERVICE_PROVIDER");
        authCustomer = createMockAuth("customer@example.com", "ROLE_CUSTOMER");
        authContractor = createMockAuth("contractor@example.com", "ROLE_CONTRACTOR");

        when(userRepository.findByEmail("pro.a@example.com")).thenReturn(Optional.of(proUserA));
        when(userRepository.findByUsername("pro.a@example.com")).thenReturn(Optional.empty());

        when(userRepository.findByEmail("pro.b@example.com")).thenReturn(Optional.of(proUserB));
        when(userRepository.findByUsername("pro.b@example.com")).thenReturn(Optional.empty());

        when(userRepository.findByEmail("provider@example.com")).thenReturn(Optional.of(legacyServiceProvider));
        when(userRepository.findByUsername("provider@example.com")).thenReturn(Optional.empty());

        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customerUser));
        when(userRepository.findByUsername("customer@example.com")).thenReturn(Optional.empty());

        when(userRepository.findByEmail("contractor@example.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByUsername("contractor@example.com")).thenReturn(Optional.empty());

        when(userRepository.save(any(MarketplaceBackendApplication.MarketplaceUser.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    // =========================================================================
    // 1. GET /api/professional/profile TESTS
    // =========================================================================

    @Test
    @DisplayName("GET /api/professional/profile: Returns 200 with full profile details for authenticated professional")
    void testGetProfileSuccess() {
        ResponseEntity<?> response = profileController.getProfile(authProA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof ProfessionalProfileService.ProfessionalProfileDto);

        ProfessionalProfileService.ProfessionalProfileDto dto =
                (ProfessionalProfileService.ProfessionalProfileDto) response.getBody();
        assertEquals(proUserA.getId(), dto.id());
        assertEquals("Professional Alpha", dto.name());
        assertEquals("Professional Alpha", dto.fullName());
        assertEquals("pro_alpha", dto.username());
        assertEquals("pro.a@example.com", dto.email());
        assertEquals("Senior Structural Engineer", dto.title());
        assertEquals("Mumbai", dto.location());
        assertEquals("400001", dto.pincode());
        assertEquals("Experienced in RCC design and site supervision.", dto.bio());
    }

    @Test
    @DisplayName("GET /api/professional/profile: Legacy SERVICE_PROVIDER role can also read profile")
    void testGetProfileLegacyServiceProvider() {
        ResponseEntity<?> response = profileController.getProfile(authLegacyProvider);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        ProfessionalProfileService.ProfessionalProfileDto dto =
                (ProfessionalProfileService.ProfessionalProfileDto) response.getBody();
        assertEquals("Service Provider User", dto.name());
    }

    @Test
    @DisplayName("GET /api/professional/profile: Unauthenticated request returns 401 UNAUTHORIZED")
    void testGetProfileUnauthenticated() {
        ResponseEntity<?> nullAuth = profileController.getProfile(null);
        assertEquals(HttpStatus.UNAUTHORIZED, nullAuth.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> resUnauth = profileController.getProfile(unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, resUnauth.getStatusCode());
    }

    @Test
    @DisplayName("GET /api/professional/profile: Customer or Contractor role receives 403 FORBIDDEN")
    void testGetProfileRoleIsolation() {
        ResponseEntity<?> customerRes = profileController.getProfile(authCustomer);
        assertEquals(HttpStatus.FORBIDDEN, customerRes.getStatusCode());

        ResponseEntity<?> contractorRes = profileController.getProfile(authContractor);
        assertEquals(HttpStatus.FORBIDDEN, contractorRes.getStatusCode());
    }

    // =========================================================================
    // 2. PUT /api/professional/profile PERSISTENCE TESTS
    // =========================================================================

    @Test
    @DisplayName("PUT /api/professional/profile: Successfully persists valid changes and returns updated DTO")
    void testUpdateProfileSuccess() {
        ProfessionalProfileService.ProfessionalProfileUpdateRequest request =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Alpha Engineering Lead",
                        "Alpha Engineering Lead",
                        "Chartered Civil & Geotechnical Consultant",
                        "Pune, Maharashtra",
                        "411001",
                        "15+ years delivering structural audits across residential & commercial zones."
                );

        ResponseEntity<?> response = profileController.updateProfile(request, authProA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("Alpha Engineering Lead", body.get("name"));
        assertEquals("Chartered Civil & Geotechnical Consultant", body.get("title"));
        assertEquals("Pune, Maharashtra", body.get("location"));
        assertEquals("411001", body.get("pincode"));
        assertEquals("15+ years delivering structural audits across residential & commercial zones.", body.get("bio"));

        // Verify repository persistence
        verify(userRepository, times(1)).save(proUserA);
        assertEquals("Alpha Engineering Lead", proUserA.getName());
        assertEquals("Chartered Civil & Geotechnical Consultant", proUserA.getTitle());
        assertEquals("Pune, Maharashtra", proUserA.getLocation());
        assertEquals("411001", proUserA.getPincode());
        assertEquals("15+ years delivering structural audits across residential & commercial zones.", proUserA.getBio());
    }

    @Test
    @DisplayName("PUT /api/professional/profile: Fresh GET request returns the updated persisted values")
    void testFreshGetReturnsPersistedValues() {
        ProfessionalProfileService.ProfessionalProfileUpdateRequest request =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Updated Name Pro",
                        "Updated Name Pro",
                        "Principal Architect",
                        "Bengaluru",
                        "560001",
                        "Bespoke sustainable architectural solutions."
                );

        profileController.updateProfile(request, authProA);

        ResponseEntity<?> freshGet = profileController.getProfile(authProA);
        assertEquals(HttpStatus.OK, freshGet.getStatusCode());
        ProfessionalProfileService.ProfessionalProfileDto dto =
                (ProfessionalProfileService.ProfessionalProfileDto) freshGet.getBody();

        assertEquals("Updated Name Pro", dto.name());
        assertEquals("Principal Architect", dto.title());
        assertEquals("Bengaluru", dto.location());
        assertEquals("560001", dto.pincode());
        assertEquals("Bespoke sustainable architectural solutions.", dto.bio());
    }

    @Test
    @DisplayName("PUT /api/professional/profile: Unchanged values do not invoke repository save or pointless DB update")
    void testUnchangedProfileUpdateDoesNotInvokeRepositorySave() {
        ProfessionalProfileService.ProfessionalProfileUpdateRequest req =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Professional Alpha  ",
                        null,
                        "Senior Structural Engineer",
                        "Mumbai",
                        "400001",
                        "Experienced in RCC design and site supervision."
                );

        ResponseEntity<?> res = profileController.updateProfile(req, authProA);
        assertEquals(HttpStatus.OK, res.getStatusCode());

        verify(userRepository, never()).save(proUserA);
    }

    @Test
    @DisplayName("PUT /api/professional/profile: Partial update leaves untouched fields intact")
    void testPartialUpdatePreservesUntouchedFields() {
        assertEquals("Senior Structural Engineer", proUserA.getTitle());
        assertEquals("Mumbai", proUserA.getLocation());
        assertEquals("400001", proUserA.getPincode());

        // Update only name
        ProfessionalProfileService.ProfessionalProfileUpdateRequest req =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "New Alpha Name", null, null, null, null, null
                );

        ResponseEntity<?> res = profileController.updateProfile(req, authProA);
        assertEquals(HttpStatus.OK, res.getStatusCode());

        assertEquals("New Alpha Name", proUserA.getName());
        assertEquals("Senior Structural Engineer", proUserA.getTitle());
        assertEquals("Mumbai", proUserA.getLocation());
        assertEquals("400001", proUserA.getPincode());
    }

    // =========================================================================
    // 3. SECURITY & IDOR ISOLATION TESTS
    // =========================================================================

    @Test
    @DisplayName("IDOR Protection: Professional A cannot modify Professional B's profile")
    void testIdorProtectionAcrossProfessionals() {
        String proBInitialName = proUserB.getName();
        String proBInitialTitle = proUserB.getTitle();

        ProfessionalProfileService.ProfessionalProfileUpdateRequest maliciousReq =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Hacked Name", null, "Hacked Title", null, null, null
                );

        // Pro A makes the update request under Pro A's authentication
        ResponseEntity<?> res = profileController.updateProfile(maliciousReq, authProA);
        assertEquals(HttpStatus.OK, res.getStatusCode());

        // Pro A's record was updated
        assertEquals("Hacked Name", proUserA.getName());

        // Pro B's record remains completely untouched
        assertEquals(proBInitialName, proUserB.getName());
        assertEquals(proBInitialTitle, proUserB.getTitle());
        verify(userRepository, never()).save(proUserB);
    }

    @Test
    @DisplayName("Security: Unauthenticated PUT receives 401 UNAUTHORIZED")
    void testUpdateProfileUnauthenticated() {
        ProfessionalProfileService.ProfessionalProfileUpdateRequest request =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Test", null, null, null, null, null
                );

        ResponseEntity<?> nullAuth = profileController.updateProfile(request, null);
        assertEquals(HttpStatus.UNAUTHORIZED, nullAuth.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> resUnauth = profileController.updateProfile(request, unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, resUnauth.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Security: Customer or Contractor role receives 403 FORBIDDEN on PUT")
    void testUpdateProfileRoleIsolation() {
        ProfessionalProfileService.ProfessionalProfileUpdateRequest request =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Attempted Name", null, null, null, null, null
                );

        ResponseEntity<?> customerRes = profileController.updateProfile(request, authCustomer);
        assertEquals(HttpStatus.FORBIDDEN, customerRes.getStatusCode());

        ResponseEntity<?> contractorRes = profileController.updateProfile(request, authContractor);
        assertEquals(HttpStatus.FORBIDDEN, contractorRes.getStatusCode());

        verify(userRepository, never()).save(any());
    }

    // =========================================================================
    // 4. INPUT VALIDATION TESTS
    // =========================================================================

    @Test
    @DisplayName("Validation: Blank or 1-character full name receives 400 BAD REQUEST")
    void testValidationBlankName() {
        ProfessionalProfileService.ProfessionalProfileUpdateRequest blankReq =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "   ", "", null, null, null, null
                );

        ResponseEntity<?> res = profileController.updateProfile(blankReq, authProA);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());

        ProfessionalProfileService.ProfessionalProfileUpdateRequest singleCharReq =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "X", null, null, null, null, null
                );

        ResponseEntity<?> res2 = profileController.updateProfile(singleCharReq, authProA);
        assertEquals(HttpStatus.BAD_REQUEST, res2.getStatusCode());

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Validation: Excessively long full name (> 100 chars) receives 400 BAD REQUEST")
    void testValidationOversizedName() {
        String longName = "A".repeat(101);
        ProfessionalProfileService.ProfessionalProfileUpdateRequest req =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        longName, null, null, null, null, null
                );

        ResponseEntity<?> res = profileController.updateProfile(req, authProA);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Validation: Oversized title (> 150 chars) receives 400 BAD REQUEST")
    void testValidationOversizedTitle() {
        String longTitle = "T".repeat(151);
        ProfessionalProfileService.ProfessionalProfileUpdateRequest req =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Valid Name", null, longTitle, null, null, null
                );

        ResponseEntity<?> res = profileController.updateProfile(req, authProA);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Validation: Oversized pincode (> 20 chars) receives 400 BAD REQUEST")
    void testValidationOversizedPincode() {
        String longPin = "1".repeat(21);
        ProfessionalProfileService.ProfessionalProfileUpdateRequest req =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Valid Name", null, null, null, longPin, null
                );

        ResponseEntity<?> res = profileController.updateProfile(req, authProA);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Validation: Oversized bio (> 5000 chars) receives 400 BAD REQUEST")
    void testValidationOversizedBio() {
        String longBio = "B".repeat(5001);
        ProfessionalProfileService.ProfessionalProfileUpdateRequest req =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Valid Name", null, null, null, null, longBio
                );

        ResponseEntity<?> res = profileController.updateProfile(req, authProA);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    // =========================================================================
    // 5. DATABASE FAILURE HANDLING
    // =========================================================================

    @Test
    @DisplayName("Failure Handling: Database save error returns 500 without reporting fake success")
    void testDatabaseFailureReturns500() {
        when(userRepository.save(any())).thenThrow(new RuntimeException("Database connection timeout."));

        ProfessionalProfileService.ProfessionalProfileUpdateRequest req =
                new ProfessionalProfileService.ProfessionalProfileUpdateRequest(
                        "Valid Name", null, null, null, null, null
                );

        ResponseEntity<?> res = profileController.updateProfile(req, authProA);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, res.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) res.getBody();
        assertNotNull(body);
        assertTrue(body.containsKey("error"));
        assertFalse(body.containsKey("success"));
    }
}
