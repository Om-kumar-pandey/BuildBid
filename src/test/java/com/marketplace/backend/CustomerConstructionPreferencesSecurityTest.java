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
 * BUILDBID — CUSTOMER ACCOUNT SETTINGS STEP 4
 * Construction Preferences Security, IDOR Protection, Validation, Persistence & Reset Test Suite
 */
public class CustomerConstructionPreferencesSecurityTest {

    private CustomerConstructionPreferenceRepository preferenceRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private CustomerConstructionPreferenceService preferenceService;
    private CustomerConstructionPreferenceController preferenceController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;

    private CustomerConstructionPreference prefA;
    private CustomerConstructionPreference prefB;

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Delhi");
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
        preferenceRepository = mock(CustomerConstructionPreferenceRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        preferenceService = new CustomerConstructionPreferenceService(preferenceRepository);
        preferenceController = new CustomerConstructionPreferenceController(preferenceService, userRepository);

        customerA = createTestUser(101L, "alpha@example.com", "Customer Alpha", "alpha_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(102L, "beta@example.com", "Customer Beta", "beta_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createTestUser(201L, "contractor@example.com", "Contractor User", "contractor1", MarketplaceBackendApplication.Role.CONTRACTOR);
        sellerUser = createTestUser(301L, "seller@example.com", "Seller User", "seller1", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        prefA = new CustomerConstructionPreference(customerA);
        prefA.setId(1L);
        prefA.setPreferredProjectType("New Construction");
        prefA.setPreferredPropertyType("Independent House");
        prefA.setPreferredBuiltUpArea(2500.0);
        prefA.setPreferredNumberOfFloors("2");
        prefA.setPreferredConstructionQuality("Standard");
        prefA.setPreferredBudgetRange("₹25–50 Lakh");

        prefB = new CustomerConstructionPreference(customerB);
        prefB.setId(2L);
        prefB.setPreferredProjectType("Commercial");
        prefB.setPreferredPropertyType("Commercial Space");
        prefB.setPreferredBuiltUpArea(12000.0);
        prefB.setPreferredNumberOfFloors("4");
        prefB.setPreferredConstructionQuality("Premium");
        prefB.setPreferredBudgetRange("₹1 Crore+");

        when(userRepository.findByEmail("alpha@example.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByUsername("alpha@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("beta@example.com")).thenReturn(Optional.of(customerB));
        when(userRepository.findByUsername("beta@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("contractor@example.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(sellerUser));

        when(preferenceRepository.findByUser(customerA)).thenReturn(Optional.of(prefA));
        when(preferenceRepository.findByUser(customerB)).thenReturn(Optional.of(prefB));
        when(preferenceRepository.save(any(CustomerConstructionPreference.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ========================================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ========================================================

    @Test
    @DisplayName("1. GET /api/customer/preferences/construction rejects unauthenticated request with 401 UNAUTHORIZED")
    void testGetPreferencesUnauthenticated() {
        ResponseEntity<?> response = preferenceController.getPreferences(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> response2 = preferenceController.getPreferences(unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, response2.getStatusCode());
    }

    @Test
    @DisplayName("2. PUT /api/customer/preferences/construction rejects unauthenticated request with 401 UNAUTHORIZED")
    void testPutPreferencesUnauthenticated() {
        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", 1800.0, "2", "Standard", "₹25–50 Lakh"
        );
        ResponseEntity<?> response = preferenceController.updatePreferences(req, null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("3. Non-CUSTOMER roles (CONTRACTOR, SELLER) are rejected with 403 FORBIDDEN")
    void testPreferencesForbiddenForNonCustomer() {
        Authentication contractorAuth = createMockAuth("contractor@example.com", "ROLE_CONTRACTOR");
        Authentication sellerAuth = createMockAuth("seller@example.com", "ROLE_MATERIAL_SELLER");

        assertEquals(HttpStatus.FORBIDDEN, preferenceController.getPreferences(contractorAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, preferenceController.getPreferences(sellerAuth).getStatusCode());

        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", 1800.0, "2", "Standard", "₹25–50 Lakh"
        );
        assertEquals(HttpStatus.FORBIDDEN, preferenceController.updatePreferences(req, contractorAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, preferenceController.resetPreferences(contractorAuth).getStatusCode());
    }

    // ========================================================
    // 2. OWNERSHIP & IDOR PROTECTION
    // ========================================================

    @Test
    @DisplayName("4. Customer A can read own preferences")
    void testCustomerAReadsOwnPreferences() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        ResponseEntity<?> response = preferenceController.getPreferences(authA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof CustomerConstructionPreferenceDto.Response);
        CustomerConstructionPreferenceDto.Response resp = (CustomerConstructionPreferenceDto.Response) response.getBody();

        assertEquals("New Construction", resp.preferredProjectType());
        assertEquals("Independent House", resp.preferredPropertyType());
        assertEquals(2500.0, resp.preferredBuiltUpArea());
        assertEquals("2", resp.preferredNumberOfFloors());
        assertEquals("Standard", resp.preferredConstructionQuality());
        assertEquals("₹25–50 Lakh", resp.preferredBudgetRange());
        assertEquals("sq ft", resp.areaUnit());
    }

    @Test
    @DisplayName("5. Customer A and Customer B are strictly isolated by authenticated principal (IDOR Protection)")
    void testStrictCustomerIsolation() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        Authentication authB = createMockAuth("beta@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Response respA =
                (CustomerConstructionPreferenceDto.Response) preferenceController.getPreferences(authA).getBody();
        CustomerConstructionPreferenceDto.Response respB =
                (CustomerConstructionPreferenceDto.Response) preferenceController.getPreferences(authB).getBody();

        assertNotNull(respA);
        assertNotNull(respB);
        assertNotEquals(respA.preferredProjectType(), respB.preferredProjectType());
        assertNotEquals(respA.preferredBuiltUpArea(), respB.preferredBuiltUpArea());
        assertEquals("New Construction", respA.preferredProjectType());
        assertEquals("Commercial", respB.preferredProjectType());
    }

    @Test
    @DisplayName("6. Customer A cannot modify Customer B's preferences via URL or request body")
    void testCustomerACannotModifyCustomerB() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        // Customer A updates their preferences
        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "Remodeling / Renovation", "Apartment", 1200.0, "1", "Basic", "Under ₹10 Lakh"
        );
        ResponseEntity<?> updateResp = preferenceController.updatePreferences(req, authA);
        assertEquals(HttpStatus.OK, updateResp.getStatusCode());

        // Verify Customer B's record in repository was never modified
        assertEquals("Commercial", prefB.getPreferredProjectType());
        assertEquals(12000.0, prefB.getPreferredBuiltUpArea());
        assertEquals("Premium", prefB.getPreferredConstructionQuality());
    }

    // ========================================================
    // 3. PERSISTENCE & EDITABILITY
    // ========================================================

    @Test
    @DisplayName("7. Create preferences when no prior record exists")
    void testCreatePreferencesWhenNoneExists() {
        MarketplaceBackendApplication.MarketplaceUser newCust = createTestUser(103L, "gamma@example.com", "Customer Gamma", "gamma_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        when(userRepository.findByEmail("gamma@example.com")).thenReturn(Optional.of(newCust));
        when(preferenceRepository.findByUser(newCust)).thenReturn(Optional.empty());

        Authentication authGamma = createMockAuth("gamma@example.com", "ROLE_CUSTOMER");

        // Initial GET returns empty response (not 404, clean defaults)
        ResponseEntity<?> getResp = preferenceController.getPreferences(authGamma);
        assertEquals(HttpStatus.OK, getResp.getStatusCode());
        CustomerConstructionPreferenceDto.Response emptyResp = (CustomerConstructionPreferenceDto.Response) getResp.getBody();
        assertNull(emptyResp.preferredProjectType());
        assertEquals("sq ft", emptyResp.areaUnit());

        // Update preferences
        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "Home Extension", "Villa", 800.0, "1", "Standard", "₹10–25 Lakh"
        );
        ResponseEntity<?> putResp = preferenceController.updatePreferences(req, authGamma);
        assertEquals(HttpStatus.OK, putResp.getStatusCode());
        CustomerConstructionPreferenceDto.Response savedResp = (CustomerConstructionPreferenceDto.Response) putResp.getBody();
        assertEquals("Home Extension", savedResp.preferredProjectType());
        assertEquals("Villa", savedResp.preferredPropertyType());
        assertEquals(800.0, savedResp.preferredBuiltUpArea());
    }

    @Test
    @DisplayName("8. Update existing preferences successfully")
    void testUpdateExistingPreferences() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Request updateReq = new CustomerConstructionPreferenceDto.Request(
                "Finishing", "Apartment", 1500.0, "3", "Premium", "₹50 Lakh–₹1 Crore"
        );
        ResponseEntity<?> response = preferenceController.updatePreferences(updateReq, authA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        CustomerConstructionPreferenceDto.Response resp = (CustomerConstructionPreferenceDto.Response) response.getBody();
        assertEquals("Finishing", resp.preferredProjectType());
        assertEquals("Apartment", resp.preferredPropertyType());
        assertEquals(1500.0, resp.preferredBuiltUpArea());
        assertEquals("3", resp.preferredNumberOfFloors());
        assertEquals("Premium", resp.preferredConstructionQuality());
        assertEquals("₹50 Lakh–₹1 Crore", resp.preferredBudgetRange());
    }

    @Test
    @DisplayName("9. Partial preferences supported: customer can save some preferences and leave others unset")
    void testPartialPreferencesSupported() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Request partialReq = new CustomerConstructionPreferenceDto.Request(
                "New Construction", null, null, null, null, "₹25–50 Lakh"
        );
        ResponseEntity<?> response = preferenceController.updatePreferences(partialReq, authA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        CustomerConstructionPreferenceDto.Response resp = (CustomerConstructionPreferenceDto.Response) response.getBody();
        assertEquals("New Construction", resp.preferredProjectType());
        assertNull(resp.preferredPropertyType());
        assertNull(resp.preferredBuiltUpArea());
        assertNull(resp.preferredNumberOfFloors());
        assertNull(resp.preferredConstructionQuality());
        assertEquals("₹25–50 Lakh", resp.preferredBudgetRange());
    }

    @Test
    @DisplayName("10. Reset preferences clears all six preference categories without deleting user account")
    void testResetPreferencesWorks() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        ResponseEntity<?> deleteResp = preferenceController.resetPreferences(authA);
        assertEquals(HttpStatus.OK, deleteResp.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) deleteResp.getBody();
        assertNotNull(body);
        assertTrue(body.containsKey("preferences"));

        CustomerConstructionPreferenceDto.Response resp = (CustomerConstructionPreferenceDto.Response) body.get("preferences");
        assertNull(resp.preferredProjectType());
        assertNull(resp.preferredPropertyType());
        assertNull(resp.preferredBuiltUpArea());
        assertNull(resp.preferredNumberOfFloors());
        assertNull(resp.preferredConstructionQuality());
        assertNull(resp.preferredBudgetRange());

        // Verify Customer A still exists and enabled
        assertTrue(customerA.isEnabled());
        assertEquals("Customer Alpha", customerA.getName());
    }

    // ========================================================
    // 4. REQUEST VALIDATION
    // ========================================================

    @Test
    @DisplayName("11. Invalid project type is rejected with 400 Bad Request")
    void testInvalidProjectTypeRejected() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "Government Hospital / Military Base", "Villa", 1000.0, "2", "Standard", "₹25–50 Lakh"
        );
        ResponseEntity<?> resp = preferenceController.updatePreferences(req, authA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Unsupported preferred project type"));
    }

    @Test
    @DisplayName("12. Invalid property type is rejected with 400 Bad Request")
    void testInvalidPropertyTypeRejected() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Underwater Igloo", 1000.0, "2", "Standard", "₹25–50 Lakh"
        );
        ResponseEntity<?> resp = preferenceController.updatePreferences(req, authA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Unsupported preferred property type"));
    }

    @Test
    @DisplayName("13. Negative or zero built-up area is rejected with 400 Bad Request")
    void testNegativeOrZeroAreaRejected() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Request reqZero = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", 0.0, "2", "Standard", "₹25–50 Lakh"
        );
        ResponseEntity<?> respZero = preferenceController.updatePreferences(reqZero, authA);
        assertEquals(HttpStatus.BAD_REQUEST, respZero.getStatusCode());
        assertTrue(respZero.getBody().toString().contains("greater than zero"));

        CustomerConstructionPreferenceDto.Request reqNeg = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", -500.0, "2", "Standard", "₹25–50 Lakh"
        );
        ResponseEntity<?> respNeg = preferenceController.updatePreferences(reqNeg, authA);
        assertEquals(HttpStatus.BAD_REQUEST, respNeg.getStatusCode());
        assertTrue(respNeg.getBody().toString().contains("greater than zero"));
    }

    @Test
    @DisplayName("14. Excessive built-up area is rejected with 400 Bad Request")
    void testExcessiveAreaRejected() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Request reqOver = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", 50_000_000.0, "2", "Standard", "₹25–50 Lakh"
        );
        ResponseEntity<?> resp = preferenceController.updatePreferences(reqOver, authA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("cannot exceed 10,000,000 sq ft"));
    }

    @Test
    @DisplayName("15. Invalid floor value is rejected with 400 Bad Request")
    void testInvalidFloorCountRejected() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", 1000.0, "Skybridge", "Standard", "₹25–50 Lakh"
        );
        ResponseEntity<?> resp = preferenceController.updatePreferences(req, authA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Unsupported preferred number of floors"));
    }

    @Test
    @DisplayName("16. Invalid construction quality is rejected with 400 Bad Request")
    void testInvalidConstructionQualityRejected() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", 1000.0, "2", "Ultra-Galactic", "₹25–50 Lakh"
        );
        ResponseEntity<?> resp = preferenceController.updatePreferences(req, authA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Unsupported preferred construction quality"));
    }

    @Test
    @DisplayName("17. Invalid budget range is rejected with 400 Bad Request")
    void testInvalidBudgetRangeRejected() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerConstructionPreferenceDto.Request req = new CustomerConstructionPreferenceDto.Request(
                "New Construction", "Villa", 1000.0, "2", "Standard", "Free of Cost / 100 Bitcoins"
        );
        ResponseEntity<?> resp = preferenceController.updatePreferences(req, authA);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Unsupported preferred budget range"));
    }
}
