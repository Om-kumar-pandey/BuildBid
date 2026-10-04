package com.marketplace.backend;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 3
 * Security & Login, Password Change, Token Invalidation, and Session Security Test Suite
 */
public class CustomerSecurityAndSessionTest {

    private MarketplaceBackendApplication.UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private CustomerSecurityController securityController;
    private MarketplaceBackendApplication.JwtService jwtService;
    private MarketplaceBackendApplication.AuthService authService;
    private AuthenticationManager authenticationManager;

    private MarketplaceBackendApplication.MarketplaceUser existingCustomer;
    private MarketplaceBackendApplication.MarketplaceUser existingContractor;
    private final String rawPassword = "OldPassword@123";
    private final String jwtSecret = "BuildBidSuperSecureSecretKeyThatIsAtLeast32BytesLong!";

    private MarketplaceBackendApplication.MarketplaceUser createMockUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role, LocalDateTime pwdUpdatedAt) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Bangalore");
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
        authenticationManager = mock(AuthenticationManager.class);

        authService = new MarketplaceBackendApplication.AuthService(
                userRepository,
                passwordEncoder,
                authenticationManager,
                jwtService,
                null
        );

        securityController = new CustomerSecurityController(
                userRepository,
                passwordEncoder
        );

        existingCustomer = createMockUser(1L, "customer@buildbid.com", "Customer One", "cust_one", MarketplaceBackendApplication.Role.CUSTOMER, null);
        existingContractor = createMockUser(2L, "contractor@buildbid.com", "Contractor One", "cont_one", MarketplaceBackendApplication.Role.CONTRACTOR, null);

        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
        when(userRepository.findByEmailIgnoreCase("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
        when(userRepository.existsByEmail("customer@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("customer@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));
        when(userRepository.findByEmailIgnoreCase("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));

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
    // 1. PASSWORD CHANGE VALIDATION & BCrypt TESTS
    // ============================================================

    @Test
    @DisplayName("1. Correct current password succeeds and persists new BCrypt hash")
    void testChangePassword_Success() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "BrandNewSecret@2026", "BrandNewSecret@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue((Boolean) body.get("sessionsInvalidated"));
        assertNotNull(body.get("passwordUpdatedAt"));

        // Verify password hash in entity was actually updated with new BCrypt hash
        assertTrue(passwordEncoder.matches("BrandNewSecret@2026", existingCustomer.getPasswordHash()));
        assertFalse(passwordEncoder.matches(rawPassword, existingCustomer.getPasswordHash()));
        assertNotNull(existingCustomer.getPasswordUpdatedAt());
        verify(userRepository, atLeastOnce()).save(existingCustomer);
    }

    @Test
    @DisplayName("2. Wrong current password fails with safe error message")
    void testChangePassword_WrongCurrentPassword_Fails() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest("WrongPassword@999", "BrandNewSecret@2026", "BrandNewSecret@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("Current password is incorrect.", body.get("error"));
        // Old password hash must remain intact
        assertTrue(passwordEncoder.matches(rawPassword, existingCustomer.getPasswordHash()));
    }

    @Test
    @DisplayName("3. New password confirmation mismatch fails")
    void testChangePassword_ConfirmationMismatch_Fails() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "BrandNewSecret@2026", "DifferentSecret@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("New password and confirmation do not match.", body.get("error"));
    }

    @Test
    @DisplayName("4. Weak or too short password (< 8 chars) fails")
    void testChangePassword_TooShort_Fails() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "short1", "short1");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue(body.get("error").toString().contains("at least 8 characters"));
    }

    @Test
    @DisplayName("5. Same current password reuse is rejected")
    void testChangePassword_ReuseCurrentPassword_Fails() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, rawPassword, rawPassword);

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("New password cannot be the same as your current password.", body.get("error"));
    }

    @Test
    @DisplayName("6. Blank passwords fail validation")
    void testChangePassword_BlankPasswords_Fails() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");

        ResponseEntity<?> r1 = securityController.changePassword(
                new CustomerSecurityController.ChangePasswordRequest("", "NewSecret@123", "NewSecret@123"), auth);
        assertEquals(HttpStatus.BAD_REQUEST, r1.getStatusCode());

        ResponseEntity<?> r2 = securityController.changePassword(
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "   ", "   "), auth);
        assertEquals(HttpStatus.BAD_REQUEST, r2.getStatusCode());
    }

    // ============================================================
    // 2. IDOR & ROLE PROTECTION TESTS
    // ============================================================

    @Test
    @DisplayName("7. Non-customer role (e.g. CONTRACTOR) is rejected with 403 Forbidden")
    void testChangePassword_NonCustomerRole_Forbidden() {
        Authentication auth = createMockAuth("contractor@buildbid.com", "CONTRACTOR");
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "BrandNewSecret@2026", "BrandNewSecret@2026");

        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("8. Unauthenticated request is rejected with 401 Unauthorized")
    void testChangePassword_Unauthenticated_Unauthorized() {
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "BrandNewSecret@2026", "BrandNewSecret@2026");

        ResponseEntity<?> response = securityController.changePassword(req, null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("9. IDOR protection: User identity is strictly resolved from SecurityContext principal")
    void testIDORProtection_AlwaysResolvesPrincipal() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        CustomerSecurityController.ChangePasswordRequest req =
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "BrandNewSecret@2026", "BrandNewSecret@2026");

        // The request does not contain any user ID or customer ID.
        // It strictly modifies customer@buildbid.com from authentication.getName().
        ResponseEntity<?> response = securityController.changePassword(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Verify existingContractor was NOT modified
        assertTrue(passwordEncoder.matches(rawPassword, existingContractor.getPasswordHash()));
        // Verify existingCustomer was modified
        assertTrue(passwordEncoder.matches("BrandNewSecret@2026", existingCustomer.getPasswordHash()));
    }

    // ============================================================
    // 3. SECURITY STATUS & LOGOUT ALL SESSIONS
    // ============================================================

    @Test
    @DisplayName("10. Security status returns verified email, mobile, and password metadata")
    void testGetSecurityStatus_Success() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        existingCustomer.setPasswordUpdatedAt(LocalDateTime.now().minusDays(2));

        ResponseEntity<?> response = securityController.getSecurityStatus(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals("customer@buildbid.com", body.get("email"));
        assertTrue((Boolean) body.get("emailVerified"));
        assertTrue((Boolean) body.get("phoneVerified"));
        assertTrue((Boolean) body.get("hasPassword"));
        assertNotNull(body.get("passwordUpdatedAt"));
        assertEquals("STATELESS_JWT_WITH_TIMESTAMP_INVALIDATION", body.get("sessionSecurityModel"));
    }

    @Test
    @DisplayName("11. Logout all sessions updates passwordUpdatedAt to invalidate tokens cross-device")
    void testLogoutAllSessions_Success() {
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");

        ResponseEntity<?> response = securityController.logoutAllSessions(auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue((Boolean) body.get("sessionsInvalidated"));
        assertNotNull(existingCustomer.getPasswordUpdatedAt());
        verify(userRepository, atLeastOnce()).save(existingCustomer);
    }

    // ============================================================
    // 4. JWT TOKEN INVALIDATION TESTS
    // ============================================================

    @Test
    @DisplayName("12. Old JWT token issued before password update is rejected as invalid")
    void testTokenIssuedBeforePasswordUpdate_IsInvalidated() {
        // Create an old token issued 10 minutes ago
        Date oldIssuedAt = new Date(System.currentTimeMillis() - 600000L);
        Date expiry = new Date(System.currentTimeMillis() + 3600000L);
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        String oldToken = Jwts.builder()
                .subject("customer@buildbid.com")
                .issuedAt(oldIssuedAt)
                .expiration(expiry)
                .signWith(key)
                .compact();

        // User updated password 5 minutes ago (after old token was issued)
        LocalDateTime passwordUpdatedAt = LocalDateTime.now().minusMinutes(5);
        MarketplaceBackendApplication.CustomUserDetails userDetails = new MarketplaceBackendApplication.CustomUserDetails(
                1L,
                "customer@buildbid.com",
                existingCustomer.getPasswordHash(),
                true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER")),
                passwordUpdatedAt
        );

        // Old token should be invalid!
        boolean isValid = jwtService.isValid(oldToken, userDetails);
        assertFalse(isValid, "Token issued before passwordUpdatedAt must be invalidated");
    }

    @Test
    @DisplayName("13. New JWT token issued after password update is accepted as valid")
    void testTokenIssuedAfterPasswordUpdate_IsValid() {
        // User updated password 10 minutes ago
        LocalDateTime passwordUpdatedAt = LocalDateTime.now().minusMinutes(10);
        MarketplaceBackendApplication.CustomUserDetails userDetails = new MarketplaceBackendApplication.CustomUserDetails(
                1L,
                "customer@buildbid.com",
                existingCustomer.getPasswordHash(),
                true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER")),
                passwordUpdatedAt
        );

        // Token issued now (after password update)
        String freshToken = jwtService.createToken(userDetails);

        // Fresh token must be valid!
        boolean isValid = jwtService.isValid(freshToken, userDetails);
        assertTrue(isValid, "Token issued after password update must be valid");
    }

    @Test
    @DisplayName("14. Legacy user without password update history (null timestamp) continues to validate")
    void testLegacyUser_WithoutPasswordUpdate_TokenRemainsValid() {
        MarketplaceBackendApplication.CustomUserDetails legacyUserDetails = new MarketplaceBackendApplication.CustomUserDetails(
                1L,
                "customer@buildbid.com",
                existingCustomer.getPasswordHash(),
                true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER")),
                null // Legacy user has null passwordUpdatedAt
        );

        String token = jwtService.createToken(legacyUserDetails);
        boolean isValid = jwtService.isValid(token, legacyUserDetails);
        assertTrue(isValid, "Legacy users with null passwordUpdatedAt must remain fully functional");
    }

    @Test
    @DisplayName("15. Wrong subject or expired token is rejected")
    void testInvalidSubjectOrExpiredToken_IsRejected() {
        MarketplaceBackendApplication.CustomUserDetails userDetails = new MarketplaceBackendApplication.CustomUserDetails(
                1L,
                "customer@buildbid.com",
                existingCustomer.getPasswordHash(),
                true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER")),
                null
        );

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        String expiredToken = Jwts.builder()
                .subject("customer@buildbid.com")
                .issuedAt(new Date(System.currentTimeMillis() - 7200000L))
                .expiration(new Date(System.currentTimeMillis() - 3600000L))
                .signWith(key)
                .compact();

        assertFalse(jwtService.isValid(expiredToken, userDetails));

        String wrongSubjectToken = Jwts.builder()
                .subject("intruder@buildbid.com")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000L))
                .signWith(key)
                .compact();

        assertFalse(jwtService.isValid(wrongSubjectToken, userDetails));
    }

    // ============================================================
    // 5. LOGIN WORKFLOW & OLD VS NEW PASSWORD
    // ============================================================

    @Test
    @DisplayName("16. Login with new password succeeds and old password is rejected")
    void testLogin_OldPasswordFails_NewPasswordSucceeds() {
        // Step A: Change password
        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        String newPassword = "BrandNewSecurePassword@2026";
        securityController.changePassword(
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, newPassword, newPassword), auth);

        // Step B: Authenticate with old password -> should fail
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenAnswer(inv -> {
                    UsernamePasswordAuthenticationToken tok = inv.getArgument(0);
                    if (!tok.getCredentials().equals(newPassword)) {
                        throw new BadCredentialsException("Invalid email or password");
                    }
                    return tok;
                });

        MarketplaceBackendApplication.LoginRequest oldLoginReq =
                new MarketplaceBackendApplication.LoginRequest("customer@buildbid.com", rawPassword, "CUSTOMER");

        assertThrows(BadCredentialsException.class, () -> authService.login(oldLoginReq),
                "Old password must be rejected after password change");

        // Step C: Authenticate with new password -> should succeed
        MarketplaceBackendApplication.LoginRequest newLoginReq =
                new MarketplaceBackendApplication.LoginRequest("customer@buildbid.com", newPassword, "CUSTOMER");

        MarketplaceBackendApplication.AuthResponse loginResponse = authService.login(newLoginReq);
        assertNotNull(loginResponse);
        assertNotNull(loginResponse.token());
        assertEquals("customer@buildbid.com", loginResponse.email());
    }

    @Test
    @DisplayName("17. Verification flags are preserved and not reset during password change")
    void testPasswordChange_DoesNotResetVerificationFlags() {
        assertTrue(existingCustomer.isEmailVerified());
        assertTrue(existingCustomer.isPhoneVerified());

        Authentication auth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        securityController.changePassword(
                new CustomerSecurityController.ChangePasswordRequest(rawPassword, "NewSecuredPassword@2026", "NewSecuredPassword@2026"), auth);

        assertTrue(existingCustomer.isEmailVerified(), "Email verification must not be reset");
        assertTrue(existingCustomer.isPhoneVerified(), "Phone verification must not be reset");
    }
}
