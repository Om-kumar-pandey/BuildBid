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
 * BUILDBID — CUSTOMER ACCOUNT SETTINGS STEP 1
 * Customer Profile Security, IDOR Protection, Validation and Persistence Test Suite
 */
public class CustomerProfileSecurityAndPersistenceTest {

    private CustomerProfileRepository profileRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private CustomerProfileService profileService;
    private CustomerProfileController profileController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;

    private CustomerProfile profileA;
    private CustomerProfile profileB;

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
            dateField.set(user, LocalDateTime.now().minusMonths(2));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    @BeforeEach
    void setUp() {
        profileRepository = mock(CustomerProfileRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        profileService = new CustomerProfileService(profileRepository, userRepository);
        profileController = new CustomerProfileController(profileService, userRepository);

        customerA = createTestUser(101L, "alpha@example.com", "Customer Alpha", "alpha_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createTestUser(102L, "beta@example.com", "Customer Beta", "beta_cust", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createTestUser(201L, "contractor@example.com", "Contractor User", "contractor1", MarketplaceBackendApplication.Role.CONTRACTOR);

        profileA = new CustomerProfile();
        profileA.setId(1L);
        profileA.setUser(customerA);
        profileA.setFullName("Customer Alpha");
        profileA.setEmail("alpha@example.com");
        profileA.setPhone("9876543210");
        profileA.setCity("Mumbai");
        profileA.setAboutMe("Existing Bio for Alpha");
        profileA.setAddress("123 Marine Drive");
        profileA.setState("Maharashtra");
        profileA.setPincode("400001");

        profileB = new CustomerProfile();
        profileB.setId(2L);
        profileB.setUser(customerB);
        profileB.setFullName("Customer Beta");
        profileB.setEmail("beta@example.com");
        profileB.setPhone("9123456780");
        profileB.setCity("Delhi");
        profileB.setAboutMe("Existing Bio for Beta");

        when(userRepository.findByEmail("alpha@example.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByUsername("alpha@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("beta@example.com")).thenReturn(Optional.of(customerB));
        when(userRepository.findByUsername("beta@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("contractor@example.com")).thenReturn(Optional.of(contractorUser));

        when(profileRepository.findByUser(customerA)).thenReturn(Optional.of(profileA));
        when(profileRepository.findByUser(customerB)).thenReturn(Optional.of(profileB));
        when(profileRepository.save(any(CustomerProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Authentication createMockAuth(String principalEmail, String role) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(principalEmail);
        doReturn(List.of(new SimpleGrantedAuthority(role))).when(auth).getAuthorities();
        return auth;
    }

    @Test
    @DisplayName("GET /api/customer/profile rejects unauthenticated request with 401 UNAUTHORIZED")
    void testGetProfileUnauthenticated() {
        ResponseEntity<?> response = profileController.getProfile(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> response2 = profileController.getProfile(unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, response2.getStatusCode());
    }

    @Test
    @DisplayName("GET /api/customer/profile rejects non-customer roles with 403 FORBIDDEN")
    void testGetProfileForbiddenForNonCustomer() {
        Authentication contractorAuth = createMockAuth("contractor@example.com", "ROLE_CONTRACTOR");
        ResponseEntity<?> response = profileController.getProfile(contractorAuth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("GET /api/customer/profile retrieves authenticated Customer A's own profile")
    void testGetProfileSuccessForCustomerA() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        ResponseEntity<?> response = profileController.getProfile(authA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof CustomerProfileController.CustomerProfileResponse);

        CustomerProfileController.CustomerProfileResponse body =
                (CustomerProfileController.CustomerProfileResponse) response.getBody();
        assertEquals(customerA.getId(), body.userId());
        assertEquals("Customer Alpha", body.fullName());
        assertEquals("alpha_cust", body.username());
        assertEquals("alpha@example.com", body.email());
        assertEquals("9876543210", body.phone());
        assertEquals("Mumbai", body.city());
        assertEquals("Existing Bio for Alpha", body.aboutMe());
    }

    @Test
    @DisplayName("IDOR Protection: Customer A and Customer B are strictly isolated by authenticated principal")
    void testCustomerProfileStrictIsolation() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        Authentication authB = createMockAuth("beta@example.com", "ROLE_CUSTOMER");

        CustomerProfileController.CustomerProfileResponse resA =
                (CustomerProfileController.CustomerProfileResponse) profileController.getProfile(authA).getBody();
        CustomerProfileController.CustomerProfileResponse resB =
                (CustomerProfileController.CustomerProfileResponse) profileController.getProfile(authB).getBody();

        assertNotNull(resA);
        assertNotNull(resB);
        assertEquals("Customer Alpha", resA.fullName());
        assertEquals("Customer Beta", resB.fullName());
        assertNotEquals(resA.userId(), resB.userId());
        assertNotEquals(resA.email(), resB.email());
    }

    @Test
    @DisplayName("PUT /api/customer/profile updates personal details for authenticated user")
    void testUpdateCustomerProfileSuccess() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        CustomerProfileController.CustomerProfileRequest updateReq =
                new CustomerProfileController.CustomerProfileRequest(
                        "Alpha Updated Name",
                        "attempted_fake_email@spoof.com", // Should NOT overwrite actual user email!
                        "9998887776",
                        "New Address Line 456",
                        "Pune",
                        "Maharashtra",
                        "411001",
                        "Updated Bio about construction planning",
                        "English, Hindi"
                );

        ResponseEntity<?> response = profileController.updateProfile(updateReq, authA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        CustomerProfileController.CustomerProfileResponse updated =
                (CustomerProfileController.CustomerProfileResponse) response.getBody();

        assertNotNull(updated);
        assertEquals("Alpha Updated Name", updated.fullName());
        assertEquals("9998887776", updated.phone());
        assertEquals("New Address Line 456", updated.address());
        assertEquals("Pune", updated.city());
        assertEquals("Maharashtra", updated.state());
        assertEquals("411001", updated.pincode());
        assertEquals("Updated Bio about construction planning", updated.aboutMe());

        // CRITICAL: Email and username remain untouched and protected
        assertEquals("alpha@example.com", updated.email());
        assertEquals("alpha_cust", updated.username());

        verify(profileRepository, atLeastOnce()).save(any(CustomerProfile.class));
        verify(userRepository, atLeastOnce()).save(customerA);
    }

    @Test
    @DisplayName("POST /api/customer/profile/photo validates supported image formats and rejects invalid formats")
    void testPhotoUploadFormatValidation() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        // Invalid format: SVG / GIF / Plain text
        CustomerProfileController.PhotoUploadRequest invalidRequest =
                new CustomerProfileController.PhotoUploadRequest("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

        ResponseEntity<?> response = profileController.updatePhoto(invalidRequest, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        // Valid format: PNG
        String validPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        CustomerProfileController.PhotoUploadRequest validRequest =
                new CustomerProfileController.PhotoUploadRequest(validPng);

        ResponseEntity<?> validResponse = profileController.updatePhoto(validRequest, authA);
        assertEquals(HttpStatus.OK, validResponse.getStatusCode());
        CustomerProfileController.CustomerProfileResponse res =
                (CustomerProfileController.CustomerProfileResponse) validResponse.getBody();
        assertNotNull(res);
        assertEquals(validPng, res.profilePhoto());
    }

    @Test
    @DisplayName("POST /api/customer/profile/photo rejects oversized images > 7MB payload")
    void testPhotoUploadSizeRejection() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");

        // Create oversized payload > 7MB
        char[] bigChars = new char[8 * 1024 * 1024];
        Arrays.fill(bigChars, 'A');
        String oversized = "data:image/jpeg;base64," + new String(bigChars);

        CustomerProfileController.PhotoUploadRequest oversizedReq =
                new CustomerProfileController.PhotoUploadRequest(oversized);

        ResponseEntity<?> response = profileController.updatePhoto(oversizedReq, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("DELETE /api/customer/profile/photo removes photo for authenticated customer")
    void testPhotoRemoval() {
        Authentication authA = createMockAuth("alpha@example.com", "ROLE_CUSTOMER");
        profileA.setProfilePhoto("https://example.com/avatar.jpg");
        customerA.setProfilePhotoUrl("https://example.com/avatar.jpg");

        ResponseEntity<?> response = profileController.removePhoto(authA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        CustomerProfileController.CustomerProfileResponse body =
                (CustomerProfileController.CustomerProfileResponse) response.getBody();
        assertNotNull(body);
        assertNull(body.profilePhoto());
        assertNull(customerA.getProfilePhotoUrl());
    }
}
