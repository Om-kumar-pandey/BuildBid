package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — PHASE 6: PROFESSIONAL ACCOUNT SETTINGS
 * Security & Login, Password Change, IDOR Prevention, Role Protection, and Session Security Test Suite.
 */
public class ProfessionalSecurityAndSessionTest {

    private MarketplaceBackendApplication.UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private ProfessionalSecurityController securityController;
    private MarketplaceBackendApplication.JwtService jwtService;

    private MarketplaceBackendApplication.MarketplaceUser existingPro;
    private MarketplaceBackendApplication.MarketplaceUser existingLegacyServiceProvider;
    private MarketplaceBackendApplication.MarketplaceUser existingCustomer;
    private MarketplaceBackendApplication.MarketplaceUser existingContractor;
    private MarketplaceBackendApplication.MarketplaceUser existingSeller;

    private final String rawPassword = "InitialPassword@123";
    private final String jwtSecret = "BuildBidSuperSecureSecretKeyThatIsAtLeast32BytesLong!";

    private MarketplaceBackendApplication.MarketplaceUser createMockUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role, LocalDateTime pwdUpdatedAt) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Mumbai");
        user.setPhone("9876543210");
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setPasswordUpdatedAt(pwdUpdatedAt);

        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);

            java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("createdAt");
            dateField.setAccessible(true);
            dateField.set(user, LocalDateTime.now().minusDays(30));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    @BeforeEach
    void setUp() {
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new MarketplaceBackendApplication.JwtService(jwtSecret, 86400000L);

        securityController = new ProfessionalSecurityController(
                userRepository,
                passwordEncoder
        );

        existingPro = createMockUser(10L, "pro@buildbid.com", "Pro Engineer", "pro_engineer", MarketplaceBackendApplication.Role.PROFESSIONAL, null);
        existingLegacyServiceProvider = createMockUser(11L, "service_provider@buildbid.com", "Service Provider", "svc_prov", MarketplaceBackendApplication.Role.SERVICE_PROVIDER, null);
        existingCustomer = createMockUser(20L, "customer@buildbid.com", "Customer One", "cust_one", MarketplaceBackendApplication.Role.CUSTOMER, null);
        existingContractor = createMockUser(30L, "contractor@buildbid.com", "Contractor One", "cont_one", MarketplaceBackendApplication.Role.CONTRACTOR, null);
        existingSeller = createMockUser(40L, "seller@buildbid.com", "Seller One", "seller_one", MarketplaceBackendApplication.Role.MATERIAL_SELLER, null);

        when(userRepository.findByEmail("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
        when(userRepository.findByEmailIgnoreCase("pro@buildbid.com")).thenReturn(Optional.of(existingPro));

        when(userRepository.findByEmail("service_provider@buildbid.com")).thenReturn(Optional.of(existingLegacyServiceProvider));
        when(userRepository.findByEmailIgnoreCase("service_provider@buildbid.com")).thenReturn(Optional.of(existingLegacyServiceProvider));

        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
        when(userRepository.findByEmailIgnoreCase("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));

        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));
        when(userRepository.findByEmailIgnoreCase("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));

        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(existingSeller));
        when(userRepository.findByEmailIgnoreCase("seller@buildbid.com")).thenReturn(Optional.of(existingSeller));

        when(userRepository.save(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Authentication createMockAuth(String principalEmail, String role) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(principalEmail);
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role)))
                .when(auth).getAuthorities();
        return auth;
    }

    // ============================================================
    // 1. SUCCESSFUL PASSWORD CHANGE & BCRYPT VERIFICATION
    // ============================================================

    @Test
    @DisplayName("1. Successful password change by authenticated Professional updates BCrypt hash and timestamp")
    void testChangePassword_Success() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "NewSecurePassword@2026", "NewSecurePassword@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals(true, body.get("sessionsInvalidated"));
        assertNotNull(body.get("passwordUpdatedAt"));

        // Verify password hash was updated with new BCrypt hash
        assertTrue(passwordEncoder.matches("NewSecurePassword@2026", existingPro.getPasswordHash()));
        assertFalse(passwordEncoder.matches(rawPassword, existingPro.getPasswordHash()));
        assertNotNull(existingPro.getPasswordUpdatedAt());
        verify(userRepository, atLeastOnce()).save(existingPro);
    }

    @Test
    @DisplayName("1b. Successful password change by legacy SERVICE_PROVIDER role is permitted")
    void testChangePassword_LegacyServiceProvider_Success() {
        Authentication auth = createMockAuth("service_provider@buildbid.com", "SERVICE_PROVIDER");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "LegacyNewPass@2026", "LegacyNewPass@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertTrue(passwordEncoder.matches("LegacyNewPass@2026", existingLegacyServiceProvider.getPasswordHash()));
        assertNotNull(existingLegacyServiceProvider.getPasswordUpdatedAt());
        verify(userRepository, atLeastOnce()).save(existingLegacyServiceProvider);
    }

    // ============================================================
    // 2. INCORRECT CURRENT PASSWORD REJECTED
    // ============================================================

    @Test
    @DisplayName("2. Incorrect current password rejected with 400 Bad Request and old hash preserved")
    void testChangePassword_IncorrectCurrentPassword_Fails() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest("WrongCurrentPass@999", "NewSecurePassword@2026", "NewSecurePassword@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("Current password is incorrect.", body.get("error"));

        // Original hash must remain unchanged
        assertTrue(passwordEncoder.matches(rawPassword, existingPro.getPasswordHash()));
        verify(userRepository, never()).save(any());
    }

    // ============================================================
    // 3. MISSING PASSWORD FIELDS REJECTED
    // ============================================================

    @Test
    @DisplayName("3. Missing or blank password fields rejected with 400 Bad Request")
    void testChangePassword_MissingFields_Fails() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        // Null request
        assertEquals(HttpStatus.BAD_REQUEST, securityController.changePassword(null, auth).getStatusCode());

        // Blank current password
        ResponseEntity<?> r1 = securityController.changePassword(
                new ProfessionalSecurityController.ChangePasswordRequest("", "NewSecure@123", "NewSecure@123"), auth);
        assertEquals(HttpStatus.BAD_REQUEST, r1.getStatusCode());
        assertEquals("Current password is required.", ((Map<?, ?>) r1.getBody()).get("error"));

        // Blank new password
        ResponseEntity<?> r2 = securityController.changePassword(
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "  ", "  "), auth);
        assertEquals(HttpStatus.BAD_REQUEST, r2.getStatusCode());
        assertEquals("New password is required.", ((Map<?, ?>) r2.getBody()).get("error"));

        // Blank confirmation
        ResponseEntity<?> r3 = securityController.changePassword(
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "NewSecure@123", ""), auth);
        assertEquals(HttpStatus.BAD_REQUEST, r3.getStatusCode());
        assertEquals("Password confirmation is required.", ((Map<?, ?>) r3.getBody()).get("error"));
    }

    // ============================================================
    // 4. PASSWORD POLICY ENFORCEMENT (< 8 CHARACTERS, > 100 CHARACTERS)
    // ============================================================

    @Test
    @DisplayName("4. New password failing length policy (< 8 chars or > 100 chars) rejected")
    void testChangePassword_PolicyLength_Fails() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        // Under 8 characters
        ResponseEntity<?> shortRes = securityController.changePassword(
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "short1", "short1"), auth);
        assertEquals(HttpStatus.BAD_REQUEST, shortRes.getStatusCode());
        assertTrue(((Map<?, ?>) shortRes.getBody()).get("error").toString().contains("at least 8 characters"));

        // Over 100 characters
        String longPass = "A".repeat(101);
        ResponseEntity<?> longRes = securityController.changePassword(
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, longPass, longPass), auth);
        assertEquals(HttpStatus.BAD_REQUEST, longRes.getStatusCode());
        assertTrue(((Map<?, ?>) longRes.getBody()).get("error").toString().contains("must not exceed 100 characters"));
    }

    // ============================================================
    // 5. CONFIRMATION MISMATCH REJECTED
    // ============================================================

    @Test
    @DisplayName("5. Confirmation password mismatch rejected with 400 Bad Request")
    void testChangePassword_ConfirmationMismatch_Fails() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "NewSecurePassword@2026", "DifferentPassword@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("New password and confirmation do not match.", body.get("error"));
    }

    // ============================================================
    // 6. PASSWORD REUSE REJECTED
    // ============================================================

    @Test
    @DisplayName("6. New password identical to current password rejected with 400 Bad Request")
    void testChangePassword_SameAsCurrent_Fails() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, rawPassword, rawPassword);

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("New password cannot be the same as your current password.", body.get("error"));
    }

    // ============================================================
    // 7. PASSWORD HASH UPDATED AND PLAINTEXT NEVER PERSISTED OR EXPOSED
    // ============================================================

    @Test
    @DisplayName("7. Plaintext password is never stored or exposed in API response")
    void testChangePassword_NoPlaintextLeak() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        String secretPlaintext = "SecretPassword123#";
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, secretPlaintext, secretPlaintext);

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Body must never contain plaintext password or hash
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertFalse(body.containsKey("password"));
        assertFalse(body.containsKey("passwordHash"));
        assertFalse(body.toString().contains(secretPlaintext));

        // Entity must store BCrypt hash, never plaintext
        assertNotEquals(secretPlaintext, existingPro.getPasswordHash());
        assertTrue(existingPro.getPasswordHash().startsWith("$2a$") || existingPro.getPasswordHash().startsWith("$2b$"));
    }

    // ============================================================
    // 8. UNAUTHENTICATED REQUEST REJECTED
    // ============================================================

    @Test
    @DisplayName("8. Unauthenticated request rejected with 401 Unauthorized")
    void testChangePassword_Unauthenticated_Rejected() {
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "NewSecurePassword@2026", "NewSecurePassword@2026");

        // Null authentication
        ResponseEntity<?> res1 = securityController.changePassword(req, null);
        assertEquals(HttpStatus.UNAUTHORIZED, res1.getStatusCode());

        // Unauthenticated principal
        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> res2 = securityController.changePassword(req, unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, res2.getStatusCode());
    }

    // ============================================================
    // 9. CUSTOMER ROLE DENIED ACCESS TO PROFESSIONAL-ONLY ENDPOINT
    // ============================================================

    @Test
    @DisplayName("9. Customer role denied access to professional security endpoint (403 Forbidden)")
    void testChangePassword_CustomerRole_Forbidden() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "NewSecurePassword@2026", "NewSecurePassword@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue(body.get("error").toString().contains("Only registered professionals"));
        verify(userRepository, never()).save(any());
    }

    // ============================================================
    // 10. CONTRACTOR AND MATERIAL SELLER DENIED ACCESS
    // ============================================================

    @Test
    @DisplayName("10. Contractor and Material Seller denied access to professional security endpoint (403 Forbidden)")
    void testChangePassword_ContractorAndSeller_Forbidden() {
        // Contractor
        Authentication contractorAuth = createMockAuth("contractor@buildbid.com", "CONTRACTOR");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "NewSecurePassword@2026", "NewSecurePassword@2026");

        ResponseEntity<?> contRes = securityController.changePassword(req, contractorAuth);
        assertEquals(HttpStatus.FORBIDDEN, contRes.getStatusCode());

        // Material Seller
        Authentication sellerAuth = createMockAuth("seller@buildbid.com", "MATERIAL_SELLER");
        ResponseEntity<?> sellerRes = securityController.changePassword(req, sellerAuth);
        assertEquals(HttpStatus.FORBIDDEN, sellerRes.getStatusCode());
    }

    // ============================================================
    // 11. STRICT IDOR PROTECTION: USER IDENTIFIED SOLELY FROM PRINCIPAL
    // ============================================================

    @Test
    @DisplayName("11. Strict IDOR protection: User account is resolved exclusively from SecurityContext principal")
    void testIDORProtection_PrincipalAloneGovernsTargetUser() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        ProfessionalSecurityController.ChangePasswordRequest req =
                new ProfessionalSecurityController.ChangePasswordRequest(rawPassword, "BrandNewPassword@2026", "BrandNewPassword@2026");

        // The request does not contain any user ID, customer ID, or target account parameter.
        // It strictly updates pro@buildbid.com.
        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Verify other accounts are untouched
        assertTrue(passwordEncoder.matches(rawPassword, existingCustomer.getPasswordHash()));
        assertTrue(passwordEncoder.matches(rawPassword, existingContractor.getPasswordHash()));
        assertTrue(passwordEncoder.matches(rawPassword, existingSeller.getPasswordHash()));

        // Verify target account is updated
        assertTrue(passwordEncoder.matches("BrandNewPassword@2026", existingPro.getPasswordHash()));
    }

    // ============================================================
    // 12. SECURITY STATUS ENDPOINT (ACCURATE & NON-FABRICATED)
    // ============================================================

    @Test
    @DisplayName("12. Security status returns verified email, mobile, and password metadata without fabricated sessions")
    void testGetSecurityStatus_Success() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        LocalDateTime lastChanged = LocalDateTime.now().minusDays(5);
        existingPro.setPasswordUpdatedAt(lastChanged);

        ResponseEntity<?> response = securityController.getSecurityStatus(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("pro@buildbid.com", body.get("email"));
        assertEquals(true, body.get("emailVerified"));
        assertEquals(true, body.get("hasPassword"));
        assertEquals(lastChanged.toString(), body.get("passwordUpdatedAt"));
        assertEquals("STATELESS_JWT_WITH_TIMESTAMP_INVALIDATION", body.get("sessionSecurityModel"));

        // Non-professional is rejected
        Authentication customerAuth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        assertEquals(HttpStatus.FORBIDDEN, securityController.getSecurityStatus(customerAuth).getStatusCode());
    }

    // ============================================================
    // 13. LOGOUT ALL SESSIONS & JWT TIMESTAMP INVALIDATION
    // ============================================================

    @Test
    @DisplayName("13. Logout all sessions updates passwordUpdatedAt to invalidate active tokens cross-device")
    void testLogoutAllSessions_Success() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = securityController.logoutAllSessions(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals(true, body.get("sessionsInvalidated"));
        assertNotNull(existingPro.getPasswordUpdatedAt());
        verify(userRepository, atLeastOnce()).save(existingPro);
    }

    @Test
    @DisplayName("14. Changing password or revoking sessions invalidates previously issued JWT tokens")
    void testJwtInvalidationViaPasswordUpdatedAt() {
        // Issue token prior to password update
        org.springframework.security.core.userdetails.UserDetails userDetails =
                new MarketplaceBackendApplication.CustomUserDetails(
                        existingPro.getId(),
                        existingPro.getEmail(),
                        existingPro.getPasswordHash(),
                        existingPro.isEnabled(),
                        List.of(new SimpleGrantedAuthority("ROLE_PROFESSIONAL")),
                        null
                );

        String token = jwtService.createToken(userDetails);
        assertTrue(jwtService.isValid(token, userDetails));

        // Now update password / passwordUpdatedAt
        LocalDateTime updateTime = LocalDateTime.now().plusSeconds(2);
        org.springframework.security.core.userdetails.UserDetails updatedUserDetails =
                new MarketplaceBackendApplication.CustomUserDetails(
                        existingPro.getId(),
                        existingPro.getEmail(),
                        existingPro.getPasswordHash(),
                        existingPro.isEnabled(),
                        List.of(new SimpleGrantedAuthority("ROLE_PROFESSIONAL")),
                        updateTime
                );

        // Previous token must now be invalid!
        assertFalse(jwtService.isValid(token, updatedUserDetails));
    }
}
