package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — PHASE 4: PROFESSIONAL ACCOUNT SETTINGS
 * Email Change Using the Existing Verification Service & OTP Lifecycle
 *
 * Validates:
 * 1. Role-aware authentication for PROFESSIONAL and legacy SERVICE_PROVIDER
 * 2. OTP dispatch to proposed new email only
 * 3. Old email retention while verification is pending
 * 4. Successful verification updates email, marks verified, marks OTP used
 * 5. Refreshed JWT token issuance upon email change
 * 6. Rejection of invalid, expired, already-used, or mismatched OTPs
 * 7. Rate limiting (60s cooldown) and attempt locking (5 max attempts)
 * 8. Strict global email uniqueness enforcement across all roles
 * 9. Strict IDOR protection (SecurityContext principal authority)
 * 10. Role isolation on Professional-only paths
 */
public class ProfessionalEmailVerificationSecurityTest {

    private MarketplaceBackendApplication.UserRepository userRepository;
    private UserVerificationRepository verificationRepository;
    private CustomerProfileRepository customerProfileRepository;
    private EmailService emailService;
    private SmsService smsService;
    private PasswordEncoder passwordEncoder;
    private VerificationService verificationService;
    private VerificationController verificationController;
    private MarketplaceBackendApplication.JwtService jwtService;
    private UserDetailsService userDetailsService;
    private ProfessionalProfileController professionalProfileController;
    private ProfessionalProfilePhotoService professionalPhotoService;

    private MarketplaceBackendApplication.MarketplaceUser existingPro;
    private MarketplaceBackendApplication.MarketplaceUser existingLegacyServiceProvider;
    private MarketplaceBackendApplication.MarketplaceUser existingCustomer;
    private MarketplaceBackendApplication.MarketplaceUser existingContractor;

    private final String jwtSecret = "BuildBidSuperSecureSecretKeyThatIsAtLeast32BytesLong!";

    private MarketplaceBackendApplication.MarketplaceUser createMockUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role, boolean emailVerified) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Mumbai");
        user.setPhone("9876543210");
        user.setEmailVerified(emailVerified);
        user.setPhoneVerified(true);
        user.setPasswordHash(passwordEncoder.encode("SecurePass@123"));

        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);

            java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("createdAt");
            dateField.setAccessible(true);
            dateField.set(user, LocalDateTime.now().minusDays(15));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    @BeforeEach
    void setUp() {
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        verificationRepository = mock(UserVerificationRepository.class);
        customerProfileRepository = mock(CustomerProfileRepository.class);
        emailService = mock(EmailService.class);
        smsService = mock(SmsService.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new MarketplaceBackendApplication.JwtService(jwtSecret, 86400000L);
        userDetailsService = mock(UserDetailsService.class);
        professionalPhotoService = mock(ProfessionalProfilePhotoService.class);

        verificationService = new VerificationService(
                verificationRepository,
                userRepository,
                customerProfileRepository,
                emailService,
                smsService,
                passwordEncoder
        );

        verificationController = new VerificationController(
                verificationService,
                userRepository,
                jwtService,
                userDetailsService
        );

        professionalProfileController = new ProfessionalProfileController(
                professionalPhotoService,
                userRepository
        );

        existingPro = createMockUser(101L, "pro@buildbid.com", "Pro Engineer", "pro_engineer", MarketplaceBackendApplication.Role.PROFESSIONAL, true);
        existingLegacyServiceProvider = createMockUser(102L, "legacy.sp@buildbid.com", "Legacy Provider", "legacy_sp", MarketplaceBackendApplication.Role.SERVICE_PROVIDER, true);
        existingCustomer = createMockUser(201L, "customer@buildbid.com", "Customer One", "cust_one", MarketplaceBackendApplication.Role.CUSTOMER, true);
        existingContractor = createMockUser(301L, "contractor@buildbid.com", "Contractor One", "cont_one", MarketplaceBackendApplication.Role.CONTRACTOR, true);

        // Repo mocking for existing accounts
        when(userRepository.findByEmail("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
        when(userRepository.findByEmailIgnoreCase("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
        when(userRepository.existsByEmail("pro@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("pro@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("legacy.sp@buildbid.com")).thenReturn(Optional.of(existingLegacyServiceProvider));
        when(userRepository.findByEmailIgnoreCase("legacy.sp@buildbid.com")).thenReturn(Optional.of(existingLegacyServiceProvider));
        when(userRepository.existsByEmail("legacy.sp@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("legacy.sp@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
        when(userRepository.findByEmailIgnoreCase("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
        when(userRepository.existsByEmail("customer@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("customer@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));
        when(userRepository.findByEmailIgnoreCase("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));
        when(userRepository.existsByEmail("contractor@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("contractor@buildbid.com")).thenReturn(true);

        when(userRepository.save(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(verificationRepository.save(any(UserVerification.class))).thenAnswer(inv -> inv.getArgument(0));
        when(verificationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        // Mock UserDetailsService for JWT creation
        when(userDetailsService.loadUserByUsername(anyString())).thenAnswer(inv -> {
            String email = inv.getArgument(0);
            return new MarketplaceBackendApplication.CustomUserDetails(
                    101L,
                    email,
                    "hashedPassword",
                    true,
                    List.of(new SimpleGrantedAuthority("ROLE_PROFESSIONAL")),
                    null
            );
        });
    }

    private Authentication createMockAuth(String principalEmail, String role) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(principalEmail);
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_" + role))).when(auth).getAuthorities();
        return auth;
    }

    // ============================================================
    // 1. PROFESSIONAL EMAIL CHANGE REQUEST & OTP DELIVERY
    // ============================================================

    @Test
    @DisplayName("1. Authenticated Professional can request email change and OTP is sent to proposed email only")
    void testProfessionalCanRequestEmailChangeAndOtpSentToProposedEmail() {
        String proposedEmail = "new.pro.civil@buildbid.com";
        when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);
        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.empty());

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest(proposedEmail),
                auth
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertTrue(((String) body.get("message")).contains("Verification code sent"));
        assertEquals(proposedEmail, body.get("targetEmail"));
        assertEquals(60, body.get("cooldownSeconds"));

        // Verify OTP is dispatched to proposed new email, NOT the old email
        verify(emailService, times(1)).sendVerificationOtpEmail(
                eq(proposedEmail),
                eq("Pro Engineer"),
                anyString(),
                eq("Email Change Verification")
        );
        verify(emailService, never()).sendVerificationOtpEmail(
                eq("pro@buildbid.com"),
                any(),
                any(),
                any()
        );

        // Verify current email on account remains unchanged while verification is pending
        assertEquals("pro@buildbid.com", existingPro.getEmail());
    }

    @Test
    @DisplayName("2. Authenticated legacy SERVICE_PROVIDER can request email change correctly")
    void testLegacyServiceProviderCanRequestEmailChange() {
        String proposedEmail = "new.sp.architect@buildbid.com";
        when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);
        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingLegacyServiceProvider.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.empty());

        Authentication auth = createMockAuth("legacy.sp@buildbid.com", "SERVICE_PROVIDER");

        ResponseEntity<?> response = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest(proposedEmail),
                auth
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(emailService, times(1)).sendVerificationOtpEmail(
                eq(proposedEmail),
                anyString(),
                anyString(),
                eq("Email Change Verification")
        );
        assertEquals("legacy.sp@buildbid.com", existingLegacyServiceProvider.getEmail());
    }

    // ============================================================
    // 2. OTP VERIFICATION, PERSISTENCE & SESSION REFRESH
    // ============================================================

    @Test
    @DisplayName("3. Valid OTP completes email change, persists new email, and returns refreshed JWT token")
    void testValidOtpCompletesChangeAndIssuesRefreshedToken() {
        String proposedEmail = "pro.verified.new@buildbid.com";
        String plainOtp = "654321";

        UserVerification record = new UserVerification(
                existingPro.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                proposedEmail,
                passwordEncoder.encode(plainOtp),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().minusSeconds(10)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.of(record));

        when(userRepository.findByEmail(proposedEmail)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(proposedEmail)).thenReturn(Optional.empty());

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.verifyEmailChange(
                new VerificationController.VerifyEmailChangeRequest(proposedEmail, plainOtp),
                auth
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("Email updated and verified successfully.", body.get("message"));
        assertEquals(proposedEmail, body.get("email"));
        assertEquals(true, body.get("emailVerified"));

        // Refreshed JWT token present
        assertNotNull(body.get("token"));
        String newToken = (String) body.get("token");
        assertEquals(proposedEmail, jwtService.extractUsername(newToken));

        // Persistence verified
        assertEquals(proposedEmail, existingPro.getEmail());
        assertTrue(existingPro.isEmailVerified());
        assertNotNull(existingPro.getEmailVerifiedAt());
        assertTrue(record.isUsed());
        verify(userRepository, times(1)).save(existingPro);
    }

    // ============================================================
    // 3. FAILURE MODES: INCORRECT, EXPIRED, CONSUMED, MISMATCHED
    // ============================================================

    @Test
    @DisplayName("4. Incorrect OTP does not change email and decrements remaining attempts")
    void testIncorrectOtpDoesNotChangeEmail() {
        String proposedEmail = "pro.attempt@buildbid.com";
        UserVerification record = new UserVerification(
                existingPro.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                proposedEmail,
                passwordEncoder.encode("123456"),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(60)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.of(record));

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.verifyEmailChange(
                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "000000"),
                auth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertTrue(((String) body.get("error")).contains("Invalid verification code"));

        // Email remains old email
        assertEquals("pro@buildbid.com", existingPro.getEmail());
        assertFalse(record.isUsed());
        assertEquals(1, record.getAttemptCount());
    }

    @Test
    @DisplayName("5. Expired OTP is rejected and marked used without updating email")
    void testExpiredOtpIsRejected() {
        String proposedEmail = "pro.expired@buildbid.com";
        UserVerification expiredRecord = new UserVerification(
                existingPro.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                proposedEmail,
                passwordEncoder.encode("123456"),
                LocalDateTime.now().minusMinutes(2), // Expired 2 minutes ago
                LocalDateTime.now().minusMinutes(5)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.of(expiredRecord));

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.verifyEmailChange(
                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "123456"),
                auth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertTrue(((String) body.get("error")).contains("expired"));

        assertEquals("pro@buildbid.com", existingPro.getEmail());
        assertTrue(expiredRecord.isUsed());
    }

    @Test
    @DisplayName("6. Already consumed OTP cannot be reused")
    void testConsumedOtpCannotBeReused() {
        String proposedEmail = "pro.consumed@buildbid.com";
        UserVerification consumedRecord = new UserVerification(
                existingPro.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                proposedEmail,
                passwordEncoder.encode("123456"),
                LocalDateTime.now().plusMinutes(5),
                LocalDateTime.now().minusMinutes(1)
        );
        consumedRecord.setUsed(true); // Already used

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.empty());

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.verifyEmailChange(
                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "123456"),
                auth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertTrue(((String) body.get("error")).contains("No pending email change request found"));
        assertEquals("pro@buildbid.com", existingPro.getEmail());
    }

    @Test
    @DisplayName("7. OTP for proposed email A cannot authorize proposed email B")
    void testOtpBoundToTargetEmail() {
        String proposedEmailA = "email.a@buildbid.com";
        String proposedEmailB = "email.b@buildbid.com";
        String plainOtp = "998877";

        UserVerification recordA = new UserVerification(
                existingPro.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                proposedEmailA,
                passwordEncoder.encode(plainOtp),
                LocalDateTime.now().plusMinutes(8),
                LocalDateTime.now().minusSeconds(10)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.of(recordA));

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        // Attacker attempts to verify email B using email A's OTP
        ResponseEntity<?> response = verificationController.verifyEmailChange(
                new VerificationController.VerifyEmailChangeRequest(proposedEmailB, plainOtp),
                auth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("Verification code does not match the requested new email address.", body.get("error"));
        assertEquals("pro@buildbid.com", existingPro.getEmail());
    }

    // ============================================================
    // 4. DUPLICATE EMAIL & GLOBAL ONE-EMAIL-ONE-ACCOUNT REJECTION
    // ============================================================

    @Test
    @DisplayName("8. Pro changing email to duplicate belonging to Customer is rejected with exact message")
    void testDuplicateCustomerEmailRejected() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest("customer@buildbid.com"),
                auth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("This email already exists. Try another email.", body.get("error"));
    }

    @Test
    @DisplayName("9. Pro changing email to duplicate belonging to Contractor is rejected")
    void testDuplicateContractorEmailRejected() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest("contractor@buildbid.com"),
                auth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("This email already exists. Try another email.", body.get("error"));
    }

    @Test
    @DisplayName("10. Pro changing email to their own current email is rejected")
    void testSameEmailChangeRejected() {
        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest("pro@buildbid.com"),
                auth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("New email cannot be the same as your current email.", body.get("error"));
    }

    // ============================================================
    // 5. SECURITY, IDOR & RATE LIMITING PROTECTIONS
    // ============================================================

    @Test
    @DisplayName("11. Unauthenticated request to request-change is rejected with 401 Unauthorized")
    void testUnauthenticatedRequestChangeRejected() {
        ResponseEntity<?> responseNull = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest("test@buildbid.com"),
                null
        );
        assertEquals(HttpStatus.UNAUTHORIZED, responseNull.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> responseUnauth = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest("test@buildbid.com"),
                unauth
        );
        assertEquals(HttpStatus.UNAUTHORIZED, responseUnauth.getStatusCode());
    }

    @Test
    @DisplayName("12. Unauthenticated request to verify-change is rejected with 401 Unauthorized")
    void testUnauthenticatedVerifyChangeRejected() {
        ResponseEntity<?> responseNull = verificationController.verifyEmailChange(
                new VerificationController.VerifyEmailChangeRequest("test@buildbid.com", "123456"),
                null
        );
        assertEquals(HttpStatus.UNAUTHORIZED, responseNull.getStatusCode());
    }

    @Test
    @DisplayName("13. Resend cooldown: Requesting email change within 60s cooldown returns 429 Too Many Requests")
    void testResendCooldownEnforced() {
        UserVerification activeCooldownRecord = new UserVerification(
                existingPro.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                "fresh.pro@buildbid.com",
                passwordEncoder.encode("123456"),
                LocalDateTime.now().plusMinutes(9),
                LocalDateTime.now().plusSeconds(40) // 40s remaining
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.of(activeCooldownRecord));

        when(userRepository.existsByEmail("fresh.pro@buildbid.com")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("fresh.pro@buildbid.com")).thenReturn(false);

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        ResponseEntity<?> response = verificationController.requestEmailChange(
                new VerificationController.EmailChangeRequest("fresh.pro@buildbid.com"),
                auth
        );

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertTrue(((String) body.get("error")).contains("Please wait"));
        assertTrue(((String) body.get("error")).contains("seconds before requesting a new OTP"));
    }

    @Test
    @DisplayName("14. Max 5 failed attempts locks OTP and rejects subsequent attempts")
    void testMaxAttemptsLocksOtp() {
        String proposedEmail = "pro.attempts.lock@buildbid.com";
        UserVerification record = new UserVerification(
                existingPro.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                proposedEmail,
                passwordEncoder.encode("987654"),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(60)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.of(record));

        Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

        // 4 failed attempts
        for (int i = 1; i <= 4; i++) {
            ResponseEntity<?> res = verificationController.verifyEmailChange(
                    new VerificationController.VerifyEmailChangeRequest(proposedEmail, "000000"),
                    auth
            );
            assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        }

        assertEquals(4, record.getAttemptCount());

        // 5th attempt locks the OTP record
        ResponseEntity<?> res5 = verificationController.verifyEmailChange(
                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "000000"),
                auth
        );
        assertEquals(HttpStatus.BAD_REQUEST, res5.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body5 = (Map<String, Object>) res5.getBody();
        assertNotNull(body5);
        assertTrue(((String) body5.get("error")).contains("Maximum attempts exceeded"));
        assertTrue(record.isUsed());
    }

    @Test
    @DisplayName("15. Role Isolation: Customer or Contractor cannot access Professional-only paths")
    void testNonProfessionalCannotAccessProfessionalOnlyPaths() {
        Authentication authCustomer = createMockAuth("customer@buildbid.com", "CUSTOMER");

        ResponseEntity<?> response = professionalProfileController.getPhoto(authCustomer);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertTrue(((String) body.get("error")).contains("Access denied"));
    }
}
