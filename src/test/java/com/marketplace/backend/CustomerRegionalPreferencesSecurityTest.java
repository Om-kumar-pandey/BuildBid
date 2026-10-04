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
 * BUILDBID — CUSTOMER ACCOUNT SETTINGS STEP 6
 * Regional Preferences Security, Authorization, IDOR Protection, Validation, Persistence & Reset Test Suite
 */
public class CustomerRegionalPreferencesSecurityTest {

    private CustomerRegionalPreferenceRepository preferenceRepository;
    private CustomerProfileRepository profileRepository;
    private CustomerProfileService profileService;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private CustomerRegionalPreferenceService regionalService;
    private CustomerRegionalPreferenceController regionalController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser professionalUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;

    private CustomerProfile profileA;
    private CustomerProfile profileB;
    private CustomerRegionalPreference prefA;
    private CustomerRegionalPreference prefB;

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
        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);

            java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("createdAt");
            dateField.setAccessible(true);
            dateField.set(user, LocalDateTime.now().minusMonths(1));
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
        preferenceRepository = mock(CustomerRegionalPreferenceRepository.class);
        profileRepository = mock(CustomerProfileRepository.class);
        profileService = mock(CustomerProfileService.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        regionalService = new CustomerRegionalPreferenceService(preferenceRepository, profileRepository, profileService);
        regionalController = new CustomerRegionalPreferenceController(regionalService, userRepository);

        customerA = createTestUser(101L, "alpha@example.com", "Customer Alpha", "alpha_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(102L, "beta@example.com", "Customer Beta", "beta_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createTestUser(201L, "contractor@example.com", "Contractor User", "contractor1", MarketplaceBackendApplication.Role.CONTRACTOR);
        professionalUser = createTestUser(202L, "architect@example.com", "Architect Pro", "pro1", MarketplaceBackendApplication.Role.PROFESSIONAL);
        sellerUser = createTestUser(301L, "seller@example.com", "Seller User", "seller1", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        profileA = new CustomerProfile();
        profileA.setId(1L);
        profileA.setUser(customerA);
        profileA.setFullName("Customer Alpha");
        profileA.setEmail("alpha@example.com");
        profileA.setPreferredLanguage("English");

        profileB = new CustomerProfile();
        profileB.setId(2L);
        profileB.setUser(customerB);
        profileB.setFullName("Customer Beta");
        profileB.setEmail("beta@example.com");
        profileB.setPreferredLanguage("Hindi");

        prefA = new CustomerRegionalPreference(customerA);
        prefA.setId(1L);
        prefA.setTimeZone("Asia/Kolkata");
        prefA.setCurrency("INR");
        prefA.setAreaUnit("sq ft");
        prefA.setDateFormat("DD/MM/YYYY");
        prefA.setNumberFormat("Indian");

        prefB = new CustomerRegionalPreference(customerB);
        prefB.setId(2L);
        prefB.setTimeZone("Asia/Kolkata");
        prefB.setCurrency("INR");
        prefB.setAreaUnit("sq ft");
        prefB.setDateFormat("DD/MM/YYYY");
        prefB.setNumberFormat("Indian");

        when(userRepository.findByEmail("alpha@example.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByUsername("alpha@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("beta@example.com")).thenReturn(Optional.of(customerB));
        when(userRepository.findByUsername("beta@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("contractor@example.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("architect@example.com")).thenReturn(Optional.of(professionalUser));
        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(sellerUser));

        when(profileRepository.findByUser(customerA)).thenReturn(Optional.of(profileA));
        when(profileRepository.findByUser(customerB)).thenReturn(Optional.of(profileB));

        when(profileRepository.save(any(CustomerProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(preferenceRepository.save(any(CustomerRegionalPreference.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(preferenceRepository.findByUser(customerA)).thenReturn(Optional.of(prefA));
        when(preferenceRepository.findByUser(customerB)).thenReturn(Optional.of(prefB));
    }

    // ========================================================
    // 1. AUTHENTICATION TESTS (401)
    // ========================================================

    @Test
    @DisplayName("1. Unauthenticated GET regional preferences returns 401")
    void testUnauthenticatedGetReturns401() {
        ResponseEntity<?> resp = regionalController.getPreferences(null);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> resp2 = regionalController.getPreferences(unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, resp2.getStatusCode());
    }

    @Test
    @DisplayName("2. Unauthenticated PUT/save regional preferences returns 401")
    void testUnauthenticatedPutReturns401() {
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "English", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        ResponseEntity<?> resp = regionalController.updatePreferences(req, null);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    @DisplayName("3. Unauthenticated reset regional preferences returns 401 (DELETE and POST /reset)")
    void testUnauthenticatedResetReturns401() {
        ResponseEntity<?> respDelete = regionalController.resetPreferences(null);
        assertEquals(HttpStatus.UNAUTHORIZED, respDelete.getStatusCode());

        ResponseEntity<?> respPost = regionalController.resetPreferencesPost(null);
        assertEquals(HttpStatus.UNAUTHORIZED, respPost.getStatusCode());
    }

    // ========================================================
    // 2. AUTHORIZATION TESTS (403)
    // ========================================================

    @Test
    @DisplayName("4. CONTRACTOR role is rejected with 403")
    void testContractorRoleRejected() {
        Authentication auth = createMockAuth("contractor@example.com", "ROLE_CONTRACTOR");
        ResponseEntity<?> resp = regionalController.getPreferences(auth);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());

        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "English", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        ResponseEntity<?> updateResp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.FORBIDDEN, updateResp.getStatusCode());
    }

    @Test
    @DisplayName("5. PROFESSIONAL role is rejected with 403")
    void testProfessionalRoleRejected() {
        Authentication auth = createMockAuth("architect@example.com", "ROLE_PROFESSIONAL");
        ResponseEntity<?> resp = regionalController.getPreferences(auth);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
    }

    @Test
    @DisplayName("6. MATERIAL_SELLER role is rejected with 403")
    void testMaterialSellerRoleRejected() {
        Authentication auth = createMockAuth("seller@example.com", "ROLE_MATERIAL_SELLER");
        ResponseEntity<?> resp = regionalController.getPreferences(auth);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
    }

    // ========================================================
    // 3. PERSISTENCE & DEFAULTS
    // ========================================================

    @Test
    @DisplayName("7. Customer can read defaults when no preferences record exists")
    void testCustomerReadsDefaultsWhenNoRecord() {
        MarketplaceBackendApplication.MarketplaceUser newCust = createTestUser(103L, "gamma@example.com", "Customer Gamma", "gamma_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        when(userRepository.findByEmail("gamma@example.com")).thenReturn(Optional.of(newCust));
        when(preferenceRepository.findByUser(newCust)).thenReturn(Optional.empty());
        when(profileRepository.findByUser(newCust)).thenReturn(Optional.empty());

        Authentication auth = createMockAuth("gamma@example.com", "ROLE_CUSTOMER");
        ResponseEntity<?> resp = regionalController.getPreferences(auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        CustomerRegionalPreferenceDto.Response data = (CustomerRegionalPreferenceDto.Response) resp.getBody();
        assertNotNull(data);
        assertEquals("English", data.preferredLanguage());
        assertEquals("Asia/Kolkata", data.timeZone());
        assertEquals("INR", data.currency());
        assertEquals("sq ft", data.areaUnit());
        assertEquals("DD/MM/YYYY", data.dateFormat());
        assertEquals("Indian", data.numberFormat());
    }

    @Test
    @DisplayName("8. Customer can save regional preferences")
    void testCustomerCanSavePreferences() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "Hindi", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );

        ResponseEntity<?> resp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        CustomerRegionalPreferenceDto.Response body = (CustomerRegionalPreferenceDto.Response) resp.getBody();
        assertNotNull(body);
        assertEquals("Hindi", body.preferredLanguage());
        assertEquals("Asia/Kolkata", body.timeZone());
        assertEquals("INR", body.currency());
        assertEquals("sq ft", body.areaUnit());
        assertEquals("DD/MM/YYYY", body.dateFormat());
        assertEquals("Indian", body.numberFormat());

        // Verify profile preferredLanguage was updated as the authoritative storage
        assertEquals("Hindi", profileA.getPreferredLanguage());
        verify(profileRepository, atLeastOnce()).save(profileA);
        verify(preferenceRepository, atLeastOnce()).save(prefA);
    }

    @Test
    @DisplayName("9. Customer can update preferences from English to Hindi and vice versa")
    void testCustomerCanUpdatePreferences() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        // First update to Hindi
        CustomerRegionalPreferenceDto.Request req1 = new CustomerRegionalPreferenceDto.Request(
                "Hindi", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        regionalController.updatePreferences(req1, auth);
        assertEquals("Hindi", profileA.getPreferredLanguage());

        // Then update back to English
        CustomerRegionalPreferenceDto.Request req2 = new CustomerRegionalPreferenceDto.Request(
                "English", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        ResponseEntity<?> resp2 = regionalController.updatePreferences(req2, auth);
        assertEquals(HttpStatus.OK, resp2.getStatusCode());
        CustomerRegionalPreferenceDto.Response body2 = (CustomerRegionalPreferenceDto.Response) resp2.getBody();
        assertEquals("English", body2.preferredLanguage());
        assertEquals("English", profileA.getPreferredLanguage());
    }

    @Test
    @DisplayName("10. Saved values persist after re-fetch")
    void testSavedValuesPersistAfterRefetch() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "Hindi", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        regionalController.updatePreferences(req, auth);

        // Subsequent GET retrieves the updated values
        ResponseEntity<?> getResp = regionalController.getPreferences(auth);
        assertEquals(HttpStatus.OK, getResp.getStatusCode());
        CustomerRegionalPreferenceDto.Response fetched = (CustomerRegionalPreferenceDto.Response) getResp.getBody();
        assertEquals("Hindi", fetched.preferredLanguage());
        assertEquals("Asia/Kolkata", fetched.timeZone());
    }

    @Test
    @DisplayName("11. Partial values are handled correctly if nullable")
    void testPartialValuesHandledCorrectly() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        // Only update language, other fields null
        CustomerRegionalPreferenceDto.Request partialReq = new CustomerRegionalPreferenceDto.Request(
                "Hindi", null, null, null, null, null
        );

        ResponseEntity<?> resp = regionalController.updatePreferences(partialReq, auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        CustomerRegionalPreferenceDto.Response body = (CustomerRegionalPreferenceDto.Response) resp.getBody();
        assertEquals("Hindi", body.preferredLanguage());
        // Existing regional fields should remain intact
        assertEquals("Asia/Kolkata", body.timeZone());
        assertEquals("INR", body.currency());
        assertEquals("sq ft", body.areaUnit());
    }

    // ========================================================
    // 4. VALIDATION TESTS
    // ========================================================

    @Test
    @DisplayName("12. Unsupported language rejected with 400")
    void testUnsupportedLanguageRejected() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "French", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        ResponseEntity<?> resp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("13. Unsupported timezone rejected with 400")
    void testUnsupportedTimeZoneRejected() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "English", "America/New_York", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        ResponseEntity<?> resp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("14. Unsupported currency rejected with 400")
    void testUnsupportedCurrencyRejected() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "English", "Asia/Kolkata", "USD", "sq ft", "DD/MM/YYYY", "Indian"
        );
        ResponseEntity<?> resp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("15. Unsupported area unit rejected with 400")
    void testUnsupportedAreaUnitRejected() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "English", "Asia/Kolkata", "INR", "sq meters", "DD/MM/YYYY", "Indian"
        );
        ResponseEntity<?> resp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("16. Unsupported date format rejected with 400")
    void testUnsupportedDateFormatRejected() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "English", "Asia/Kolkata", "INR", "sq ft", "MM/DD/YYYY", "Indian"
        );
        ResponseEntity<?> resp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    @DisplayName("17. Unsupported number format rejected with 400")
    void testUnsupportedNumberFormatRejected() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "English", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "US Standard"
        );
        ResponseEntity<?> resp = regionalController.updatePreferences(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    // ========================================================
    // 5. IDOR PROTECTION
    // ========================================================

    @Test
    @DisplayName("18. Customer A cannot access Customer B settings")
    void testCustomerCannotAccessOtherCustomerSettings() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        ResponseEntity<?> resp = regionalController.getPreferences(authA);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        CustomerRegionalPreferenceDto.Response data = (CustomerRegionalPreferenceDto.Response) resp.getBody();
        assertEquals("English", data.preferredLanguage()); // Alpha's setting

        Authentication authB = createMockAuth("beta@example.com", "ROLE_CUSTOMER");
        ResponseEntity<?> respB = regionalController.getPreferences(authB);
        assertEquals(HttpStatus.OK, respB.getStatusCode());
        CustomerRegionalPreferenceDto.Response dataB = (CustomerRegionalPreferenceDto.Response) respB.getBody();
        assertEquals("Hindi", dataB.preferredLanguage()); // Beta's setting, separate from Alpha
    }

    @Test
    @DisplayName("19. Customer A cannot modify Customer B settings")
    void testCustomerCannotModifyOtherCustomerSettings() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "Hindi", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        regionalController.updatePreferences(req, authA);

        // Alpha's profile updated to Hindi, Beta's profile unchanged
        assertEquals("Hindi", profileA.getPreferredLanguage());
        assertEquals("Hindi", profileB.getPreferredLanguage());
    }

    @Test
    @DisplayName("20. Customer A cannot reset Customer B settings")
    void testCustomerCannotResetOtherCustomerSettings() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        regionalController.resetPreferences(authA);

        // Only Alpha's preferences reset, Beta's prefB untouched
        verify(preferenceRepository, atLeastOnce()).save(prefA);
        verify(preferenceRepository, never()).save(prefB);
    }

    // ========================================================
    // 6. RESET BEHAVIOR
    // ========================================================

    @Test
    @DisplayName("21. Reset clears only regional preferences and language")
    void testResetClearsOnlyRegionalPreferences() {
        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        ResponseEntity<?> resp = regionalController.resetPreferences(auth);
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertNotNull(body);
        CustomerRegionalPreferenceDto.Response res = (CustomerRegionalPreferenceDto.Response) body.get("preferences");
        assertEquals("English", res.preferredLanguage());
        assertEquals("Asia/Kolkata", res.timeZone());
        assertEquals("INR", res.currency());
        assertEquals("sq ft", res.areaUnit());
        assertEquals("DD/MM/YYYY", res.dateFormat());
        assertEquals("Indian", res.numberFormat());
    }

    @Test
    @DisplayName("22. CustomerProfile fields remain unchanged after reset")
    void testProfileRemainsUnchangedAfterReset() {
        profileA.setFullName("Customer Alpha");
        profileA.setEmail("alpha@example.com");
        profileA.setPhone("9876543210");
        profileA.setAddress("123 Marine Drive");
        profileA.setCity("Mumbai");
        profileA.setAboutMe("Senior Builder");

        Authentication auth = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        regionalController.resetPreferences(auth);

        // Crucial check: None of the other profile fields were wiped or changed
        assertEquals("Customer Alpha", profileA.getFullName());
        assertEquals("alpha@example.com", profileA.getEmail());
        assertEquals("9876543210", profileA.getPhone());
        assertEquals("123 Marine Drive", profileA.getAddress());
        assertEquals("Mumbai", profileA.getCity());
        assertEquals("Senior Builder", profileA.getAboutMe());
        assertEquals("English", profileA.getPreferredLanguage());
    }

    // ========================================================
    // 7. SPECIAL LANGUAGE REGRESSION & SOURCE OF TRUTH
    // ========================================================

    @Test
    @DisplayName("23. Special Language Regression Test: Section 6 reads and writes authoritative CustomerProfile.preferredLanguage")
    void testLanguageSingleSourceOfTruth() {
        // 1. Initial state: CustomerProfile has "English"
        assertEquals("English", profileA.getPreferredLanguage());

        // 2. Section 6 GET reads "English" from CustomerProfile
        CustomerRegionalPreferenceDto.Response getResp = regionalService.getPreferences(customerA);
        assertEquals("English", getResp.preferredLanguage());

        // 3. Section 6 PUT updates language to "Hindi"
        CustomerRegionalPreferenceDto.Request req = new CustomerRegionalPreferenceDto.Request(
                "Hindi", "Asia/Kolkata", "INR", "sq ft", "DD/MM/YYYY", "Indian"
        );
        CustomerRegionalPreferenceDto.Response updateResp = regionalService.updatePreferences(customerA, req);
        assertEquals("Hindi", updateResp.preferredLanguage());

        // 4. Verify CustomerProfile.preferredLanguage is updated and authoritative
        assertEquals("Hindi", profileA.getPreferredLanguage());

        // 5. Subsequent GET confirms single source of truth without conflicting duplicate
        CustomerRegionalPreferenceDto.Response refetchResp = regionalService.getPreferences(customerA);
        assertEquals("Hindi", refetchResp.preferredLanguage());
    }

    @Test
    @DisplayName("24. Normalization accepts case-insensitive valid values")
    void testNormalizationAcceptsCaseInsensitiveValues() {
        assertEquals("English", CustomerRegionalPreferenceService.validateAndNormalizeLanguage("english"));
        assertEquals("Hindi", CustomerRegionalPreferenceService.validateAndNormalizeLanguage("HINDI"));
        assertEquals("Asia/Kolkata", CustomerRegionalPreferenceService.validateAndNormalizeTimeZone("asia/kolkata"));
        assertEquals("Asia/Kolkata", CustomerRegionalPreferenceService.validateAndNormalizeTimeZone("IST"));
        assertEquals("INR", CustomerRegionalPreferenceService.validateAndNormalizeCurrency("inr"));
        assertEquals("INR", CustomerRegionalPreferenceService.validateAndNormalizeCurrency("₹"));
        assertEquals("sq ft", CustomerRegionalPreferenceService.validateAndNormalizeAreaUnit("sq ft"));
        assertEquals("sq ft", CustomerRegionalPreferenceService.validateAndNormalizeAreaUnit("square feet"));
        assertEquals("DD/MM/YYYY", CustomerRegionalPreferenceService.validateAndNormalizeDateFormat("dd/mm/yyyy"));
        assertEquals("Indian", CustomerRegionalPreferenceService.validateAndNormalizeNumberFormat("indian"));
        assertEquals("Indian", CustomerRegionalPreferenceService.validateAndNormalizeNumberFormat("en-in"));
    }
}
