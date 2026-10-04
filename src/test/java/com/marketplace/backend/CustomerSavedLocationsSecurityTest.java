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
 * BUILDBID — CUSTOMER ACCOUNT SETTINGS STEP 5
 * Saved Locations Security, IDOR Protection, Validation, Persistence & Default Logic Test Suite
 */
public class CustomerSavedLocationsSecurityTest {

    private CustomerSavedLocationRepository locationRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private CustomerSavedLocationService locationService;
    private CustomerSavedLocationController locationController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser professionalUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;

    private CustomerSavedLocation locA1;
    private CustomerSavedLocation locA2;
    private CustomerSavedLocation locB1;

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
        locationRepository = mock(CustomerSavedLocationRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        locationService = new CustomerSavedLocationService(locationRepository);
        locationController = new CustomerSavedLocationController(locationService, userRepository);

        customerA = createTestUser(101L, "custA@example.com", "Customer Alpha", "cust_alpha", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(102L, "custB@example.com", "Customer Beta", "cust_beta", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createTestUser(201L, "contractor@example.com", "Contractor User", "contractor1", MarketplaceBackendApplication.Role.CONTRACTOR);
        professionalUser = createTestUser(202L, "architect@example.com", "Architect User", "architect1", MarketplaceBackendApplication.Role.PROFESSIONAL);
        sellerUser = createTestUser(301L, "seller@example.com", "Seller User", "seller1", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        locA1 = new CustomerSavedLocation(customerA, "Home", "House 10, Sector 15", "Near City Park", "Noida", "Uttar Pradesh", "201301", "City Park Gate 2", true);
        locA1.setId(1L);

        locA2 = new CustomerSavedLocation(customerA, "Site Office", "Plot 42, Knowledge Park III", "Phase 2", "Greater Noida", "Uttar Pradesh", "201310", "Metro Pillar 104", false);
        locA2.setId(2L);

        locB1 = new CustomerSavedLocation(customerB, "Main Residence", "Flat 402, Skyline Towers", "MG Road", "Bengaluru", "Karnataka", "560001", "Opposite Metro Station", true);
        locB1.setId(3L);

        when(userRepository.findByEmail("custA@example.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByUsername("custA@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("custB@example.com")).thenReturn(Optional.of(customerB));
        when(userRepository.findByUsername("custB@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("contractor@example.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("architect@example.com")).thenReturn(Optional.of(professionalUser));
        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(sellerUser));

        when(locationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(customerA)).thenReturn(List.of(locA1, locA2));
        when(locationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(customerB)).thenReturn(List.of(locB1));

        when(locationRepository.findByIdAndUser(1L, customerA)).thenReturn(Optional.of(locA1));
        when(locationRepository.findByIdAndUser(2L, customerA)).thenReturn(Optional.of(locA2));
        when(locationRepository.findByIdAndUser(3L, customerB)).thenReturn(Optional.of(locB1));

        // Disallow cross-user lookups
        when(locationRepository.findByIdAndUser(3L, customerA)).thenReturn(Optional.empty());
        when(locationRepository.findByIdAndUser(1L, customerB)).thenReturn(Optional.empty());
        when(locationRepository.findByIdAndUser(2L, customerB)).thenReturn(Optional.empty());

        when(locationRepository.findByUserAndIsDefaultTrue(customerA)).thenReturn(Optional.of(locA1));
        when(locationRepository.findByUserAndIsDefaultTrue(customerB)).thenReturn(Optional.of(locB1));

        when(locationRepository.save(any(CustomerSavedLocation.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ========================================================
    // 1. AUTHENTICATION (401 UNAUTHORIZED)
    // ========================================================

    @Test
    @DisplayName("1. GET /api/customer/saved-locations rejects unauthenticated request with 401 UNAUTHORIZED")
    void testGetSavedLocationsUnauthenticated() {
        ResponseEntity<?> response = locationController.getSavedLocations(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("2. POST /api/customer/saved-locations rejects unauthenticated request with 401 UNAUTHORIZED")
    void testCreateSavedLocationUnauthenticated() {
        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request("Home", "123 Street", null, "Delhi", "Delhi", "110001", null, false);
        ResponseEntity<?> response = locationController.createSavedLocation(req, null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("3. PUT /api/customer/saved-locations/{id} rejects unauthenticated request with 401 UNAUTHORIZED")
    void testUpdateSavedLocationUnauthenticated() {
        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request("Home", "123 Street", null, "Delhi", "Delhi", "110001", null, false);
        ResponseEntity<?> response = locationController.updateSavedLocation(1L, req, null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("4. DELETE /api/customer/saved-locations/{id} rejects unauthenticated request with 401 UNAUTHORIZED")
    void testDeleteSavedLocationUnauthenticated() {
        ResponseEntity<?> response = locationController.deleteSavedLocation(1L, null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("5. PUT /api/customer/saved-locations/{id}/default rejects unauthenticated request with 401 UNAUTHORIZED")
    void testSetDefaultLocationUnauthenticated() {
        ResponseEntity<?> response = locationController.setDefaultLocation(1L, null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    // ========================================================
    // 2. AUTHORIZATION & ROLE GUARDS (403 FORBIDDEN)
    // ========================================================

    @Test
    @DisplayName("6. CONTRACTOR role rejected with 403 FORBIDDEN on GET /api/customer/saved-locations")
    void testContractorAccessRejected() {
        Authentication auth = createMockAuth("contractor@example.com", "ROLE_CONTRACTOR");
        ResponseEntity<?> response = locationController.getSavedLocations(auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("7. PROFESSIONAL role rejected with 403 FORBIDDEN on POST /api/customer/saved-locations")
    void testProfessionalAccessRejected() {
        Authentication auth = createMockAuth("architect@example.com", "ROLE_PROFESSIONAL");
        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request("Office", "Tower B", null, "Pune", "Maharashtra", "411001", null, false);
        ResponseEntity<?> response = locationController.createSavedLocation(req, auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("8. MATERIAL_SELLER role rejected with 403 FORBIDDEN on DELETE /api/customer/saved-locations/{id}")
    void testMaterialSellerAccessRejected() {
        Authentication auth = createMockAuth("seller@example.com", "ROLE_MATERIAL_SELLER");
        ResponseEntity<?> response = locationController.deleteSavedLocation(1L, auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ========================================================
    // 3. CRUD OPERATIONS
    // ========================================================

    @Test
    @DisplayName("9. Customer can read own saved locations")
    void testCustomerCanReadOwnLocations() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        ResponseEntity<?> response = locationController.getSavedLocations(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        List<CustomerSavedLocationDto.Response> list = (List<CustomerSavedLocationDto.Response>) response.getBody();
        assertNotNull(list);
        assertEquals(2, list.size());
        assertEquals("Home", list.get(0).label());
        assertTrue(list.get(0).isDefault());
        assertEquals("Site Office", list.get(1).label());
        assertFalse(list.get(1).isDefault());
    }

    @Test
    @DisplayName("10. Customer can create new saved location")
    void testCustomerCanCreateLocation() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        when(locationRepository.countByUser(customerA)).thenReturn(2L);

        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request(
                "Farmhouse", "Survey 88, Village Badlapur", "Near Lake", "Thane", "Maharashtra", "421503", "Opposite Mango Orchard", false
        );

        ResponseEntity<?> response = locationController.createSavedLocation(req, auth);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        CustomerSavedLocationDto.Response created = (CustomerSavedLocationDto.Response) response.getBody();
        assertNotNull(created);
        assertEquals("Farmhouse", created.label());
        assertEquals("Survey 88, Village Badlapur", created.addressLine1());
        assertEquals("421503", created.pincode());
        assertFalse(created.isDefault());
        verify(locationRepository).save(any(CustomerSavedLocation.class));
    }

    @Test
    @DisplayName("11. Customer can update own location")
    void testCustomerCanUpdateOwnLocation() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request(
                "Renovated Home", "House 10B, Sector 15", "Extension Block", "Noida", "Uttar Pradesh", "201301", "City Park Gate 3", false
        );

        ResponseEntity<?> response = locationController.updateSavedLocation(1L, req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        CustomerSavedLocationDto.Response updated = (CustomerSavedLocationDto.Response) response.getBody();
        assertNotNull(updated);
        assertEquals("Renovated Home", updated.label());
        assertEquals("House 10B, Sector 15", updated.addressLine1());
        assertEquals("Extension Block", updated.addressLine2());
        assertEquals("City Park Gate 3", updated.landmark());
    }

    @Test
    @DisplayName("12. Customer can delete own location")
    void testCustomerCanDeleteOwnLocation() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        ResponseEntity<?> response = locationController.deleteSavedLocation(2L, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(locationRepository).delete(locA2);
    }

    @Test
    @DisplayName("13. Customer can set a location as default")
    void testCustomerCanSetLocationAsDefault() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        ResponseEntity<?> response = locationController.setDefaultLocation(2L, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        CustomerSavedLocationDto.Response res = (CustomerSavedLocationDto.Response) response.getBody();
        assertNotNull(res);
        assertTrue(res.isDefault());
        assertFalse(locA1.isDefault());
    }

    // ========================================================
    // 4. DEFAULT LOCATION LOGIC & INTEGRITY
    // ========================================================

    @Test
    @DisplayName("14. First location created by customer automatically becomes default")
    void testFirstLocationAutomaticallyBecomesDefault() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        when(locationRepository.countByUser(customerA)).thenReturn(0L);

        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request(
                "First Site", "Plot 1, Industrial Area", null, "Jaipur", "Rajasthan", "302001", null, false
        );

        ResponseEntity<?> response = locationController.createSavedLocation(req, auth);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        CustomerSavedLocationDto.Response res = (CustomerSavedLocationDto.Response) response.getBody();
        assertNotNull(res);
        assertTrue(res.isDefault(), "First saved location MUST be automatically set as default.");
    }

    @Test
    @DisplayName("15. Creating new location with isDefault=true unsets previous default")
    void testCreatingWithIsDefaultTrueUnsetsPreviousDefault() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        when(locationRepository.countByUser(customerA)).thenReturn(2L);
        assertTrue(locA1.isDefault());

        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request(
                "New Corporate Office", "Cyber Hub Tower 3", "Level 5", "Gurugram", "Haryana", "122002", "Near Metro", true
        );

        ResponseEntity<?> response = locationController.createSavedLocation(req, auth);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        CustomerSavedLocationDto.Response res = (CustomerSavedLocationDto.Response) response.getBody();
        assertNotNull(res);
        assertTrue(res.isDefault());
        assertFalse(locA1.isDefault(), "Previous default location must be unset when new default is created.");
    }

    @Test
    @DisplayName("16. Deleting default location safely promotes remaining location to default")
    void testDeletingDefaultPromotesRemainingLocation() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        assertTrue(locA1.isDefault());
        assertFalse(locA2.isDefault());

        // When locA1 is deleted, locA2 is remaining
        when(locationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(customerA)).thenReturn(List.of(locA2));

        locationController.deleteSavedLocation(1L, auth);

        verify(locationRepository).delete(locA1);
        assertTrue(locA2.isDefault(), "Remaining location locA2 must be promoted to default.");
    }

    @Test
    @DisplayName("17. Deleting final location leaves no default and no fake records")
    void testDeletingFinalLocationLeavesNoDefault() {
        Authentication auth = createMockAuth("custB@example.com", "ROLE_CUSTOMER");
        when(locationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(customerB)).thenReturn(Collections.emptyList());

        locationController.deleteSavedLocation(3L, auth);

        verify(locationRepository).delete(locB1);
        verify(locationRepository, never()).save(argThat(loc -> loc != locB1 && loc.isDefault()));
    }

    // ========================================================
    // 5. IDOR PROTECTION
    // ========================================================

    @Test
    @DisplayName("18. IDOR: Customer A cannot read Customer B's location (404 Not Found)")
    void testIdorCustomerCannotReadOtherLocation() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        ResponseEntity<?> response = locationController.updateSavedLocation(3L, new CustomerSavedLocationDto.Request(
                "Hacked", "Addr", null, "City", "State", "110001", null, false), auth);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("19. IDOR: Customer A cannot update Customer B's location (404 Not Found)")
    void testIdorCustomerCannotUpdateOtherLocation() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request(
                "Tampered Label", "999 Hackers Way", null, "Delhi", "Delhi", "110001", null, false
        );

        ResponseEntity<?> response = locationController.updateSavedLocation(3L, req, auth);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("MG Road", locB1.getAddressLine2(), "Customer B location address must remain completely untouched.");
    }

    @Test
    @DisplayName("20. IDOR: Customer A cannot delete Customer B's location (404 Not Found)")
    void testIdorCustomerCannotDeleteOtherLocation() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        ResponseEntity<?> response = locationController.deleteSavedLocation(3L, auth);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(locationRepository, never()).delete(locB1);
    }

    @Test
    @DisplayName("21. IDOR: Customer A cannot set Customer B's location as default (404 Not Found)")
    void testIdorCustomerCannotSetOtherLocationAsDefault() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        ResponseEntity<?> response = locationController.setDefaultLocation(3L, auth);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertTrue(locA1.isDefault());
    }

    // ========================================================
    // 6. VALIDATION & INTEGRITY
    // ========================================================

    @Test
    @DisplayName("22. Blank label is rejected with 400 BAD REQUEST")
    void testBlankLabelRejected() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request("  ", "Street 1", null, "Delhi", "Delhi", "110001", null, false);
        ResponseEntity<?> response = locationController.createSavedLocation(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("23. Blank address line 1 is rejected with 400 BAD REQUEST")
    void testBlankAddress1Rejected() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request("Home", "   ", null, "Delhi", "Delhi", "110001", null, false);
        ResponseEntity<?> response = locationController.createSavedLocation(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("24. Blank city or state is rejected with 400 BAD REQUEST")
    void testBlankCityOrStateRejected() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        CustomerSavedLocationDto.Request req1 = new CustomerSavedLocationDto.Request("Home", "Street 1", null, "", "Delhi", "110001", null, false);
        assertEquals(HttpStatus.BAD_REQUEST, locationController.createSavedLocation(req1, auth).getStatusCode());

        CustomerSavedLocationDto.Request req2 = new CustomerSavedLocationDto.Request("Home", "Street 1", null, "Delhi", "  ", "110001", null, false);
        assertEquals(HttpStatus.BAD_REQUEST, locationController.createSavedLocation(req2, auth).getStatusCode());
    }

    @Test
    @DisplayName("25. Invalid PIN codes (letters, <6 digits, >6 digits) are rejected with 400 BAD REQUEST")
    void testInvalidPincodesRejected() {
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");

        // Non-numeric
        CustomerSavedLocationDto.Request req1 = new CustomerSavedLocationDto.Request("Home", "Street 1", null, "Delhi", "Delhi", "1100AB", null, false);
        assertEquals(HttpStatus.BAD_REQUEST, locationController.createSavedLocation(req1, auth).getStatusCode());

        // Less than 6 digits
        CustomerSavedLocationDto.Request req2 = new CustomerSavedLocationDto.Request("Home", "Street 1", null, "Delhi", "Delhi", "11001", null, false);
        assertEquals(HttpStatus.BAD_REQUEST, locationController.createSavedLocation(req2, auth).getStatusCode());

        // More than 6 digits
        CustomerSavedLocationDto.Request req3 = new CustomerSavedLocationDto.Request("Home", "Street 1", null, "Delhi", "Delhi", "1100001", null, false);
        assertEquals(HttpStatus.BAD_REQUEST, locationController.createSavedLocation(req3, auth).getStatusCode());

        // Blank
        CustomerSavedLocationDto.Request req4 = new CustomerSavedLocationDto.Request("Home", "Street 1", null, "Delhi", "Delhi", "  ", null, false);
        assertEquals(HttpStatus.BAD_REQUEST, locationController.createSavedLocation(req4, auth).getStatusCode());
    }

    // ========================================================
    // 7. REGRESSION & BOUNDARY SEPARATION
    // ========================================================

    @Test
    @DisplayName("26. CustomerProfile address remains completely untouched and independent of Saved Locations")
    void testCustomerProfileAddressUntouched() {
        CustomerProfile profile = new CustomerProfile();
        profile.setFullName("Customer Alpha");
        profile.setAddress("Original Profile Villa 7, Cyber City");
        profile.setCity("Gurugram");
        profile.setState("Haryana");
        profile.setPincode("122001");

        // Perform CRUD on saved locations
        CustomerSavedLocationDto.Request req = new CustomerSavedLocationDto.Request("Site", "Plot 99", null, "Noida", "Uttar Pradesh", "201301", null, true);
        Authentication auth = createMockAuth("custA@example.com", "ROLE_CUSTOMER");
        locationController.createSavedLocation(req, auth);

        // Verify CustomerProfile address has NOT been modified
        assertEquals("Original Profile Villa 7, Cyber City", profile.getAddress());
        assertEquals("Gurugram", profile.getCity());
        assertEquals("Haryana", profile.getState());
        assertEquals("122001", profile.getPincode());
    }
}
