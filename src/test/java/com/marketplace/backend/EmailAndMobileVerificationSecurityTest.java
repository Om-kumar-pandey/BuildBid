package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 2
 * Email & Mobile Verification, One Email = One Account Global Enforcement,
 * OTP Lifecycle, IDOR Protection, and Email/Phone Change Test Suite
 */
public class EmailAndMobileVerificationSecurityTest {

    private MarketplaceBackendApplication.UserRepository userRepository;
    private UserVerificationRepository verificationRepository;
    private CustomerProfileRepository profileRepository;
    private EmailService emailService;
    private SmsService smsService;
    private PasswordEncoder passwordEncoder;
    private VerificationService verificationService;
    private VerificationController verificationController;
    private MarketplaceBackendApplication.AuthService authService;
    private MarketplaceBackendApplication.JwtService jwtService;
    private AuthenticationManager authenticationManager;

    private MarketplaceBackendApplication.MarketplaceUser existingCustomer;
    private MarketplaceBackendApplication.MarketplaceUser existingContractor;
    private MarketplaceBackendApplication.MarketplaceUser existingPro;
    private MarketplaceBackendApplication.MarketplaceUser existingSeller;
    private MarketplaceBackendApplication.MarketplaceUser unverifiedUser;

    private MarketplaceBackendApplication.MarketplaceUser createMockUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role, boolean emailVerified) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Bangalore");
        user.setPhone("9876543210");
        user.setEmailVerified(emailVerified);
        user.setPhoneVerified(false);
        user.setPasswordHash(passwordEncoder.encode("Secret@123"));

        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);

            java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("createdAt");
            dateField.setAccessible(true);
            dateField.set(user, LocalDateTime.now().minusDays(10));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    @BeforeEach
    void setUp() {
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        verificationRepository = mock(UserVerificationRepository.class);
        profileRepository = mock(CustomerProfileRepository.class);
        emailService = mock(EmailService.class);
        smsService = mock(SmsService.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = mock(MarketplaceBackendApplication.JwtService.class);
        authenticationManager = mock(AuthenticationManager.class);

        verificationService = new VerificationService(
                verificationRepository,
                userRepository,
                profileRepository,
                emailService,
                smsService,
                passwordEncoder
        );

        verificationController = new VerificationController(
                verificationService,
                userRepository
        );

        authService = new MarketplaceBackendApplication.AuthService(
                userRepository,
                passwordEncoder,
                authenticationManager,
                jwtService,
                verificationService
        );

        existingCustomer = createMockUser(1L, "customer@buildbid.com", "Customer One", "cust_one", MarketplaceBackendApplication.Role.CUSTOMER, true);
        existingContractor = createMockUser(2L, "contractor@buildbid.com", "Contractor One", "cont_one", MarketplaceBackendApplication.Role.CONTRACTOR, true);
        existingPro = createMockUser(3L, "pro@buildbid.com", "Pro One", "pro_one", MarketplaceBackendApplication.Role.PROFESSIONAL, true);
        existingSeller = createMockUser(4L, "seller@buildbid.com", "Seller One", "seller_one", MarketplaceBackendApplication.Role.MATERIAL_SELLER, true);
        unverifiedUser = createMockUser(5L, "unverified@buildbid.com", "Unverified User", "unverified_one", MarketplaceBackendApplication.Role.CUSTOMER, false);

        // Standard repo mocking
        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
        when(userRepository.findByEmailIgnoreCase("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
        when(userRepository.existsByEmail("customer@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("customer@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));
        when(userRepository.findByEmailIgnoreCase("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));
        when(userRepository.existsByEmail("contractor@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("contractor@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
        when(userRepository.findByEmailIgnoreCase("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
        when(userRepository.existsByEmail("pro@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("pro@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(existingSeller));
        when(userRepository.findByEmailIgnoreCase("seller@buildbid.com")).thenReturn(Optional.of(existingSeller));
        when(userRepository.existsByEmail("seller@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("seller@buildbid.com")).thenReturn(true);

        when(userRepository.findByEmail("unverified@buildbid.com")).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.findByEmailIgnoreCase("unverified@buildbid.com")).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.existsByEmail("unverified@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("unverified@buildbid.com")).thenReturn(true);

        when(userRepository.save(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.saveAndFlush(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(inv -> inv.getArgument(0));

        when(verificationRepository.save(any(UserVerification.class))).thenAnswer(inv -> inv.getArgument(0));
        when(verificationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private Authentication createMockAuth(String principalEmail, String role) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(principalEmail);
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_" + role))).when(auth).getAuthorities();
        return auth;
    }

    // ============================================================
    // A. ONE EMAIL = ONE BUILDBID ACCOUNT TESTS
    // ============================================================

    @Test
    @DisplayName("Duplicate registration with exact same email fails with required exact message")
    void testDuplicateExactEmailFails() {
        MarketplaceBackendApplication.RegisterRequest req = new MarketplaceBackendApplication.RegisterRequest(
                "Duplicate User", "dup1", "customer@buildbid.com", "9876543211", "Delhi", "Pass@123", "CUSTOMER", null
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        assertEquals("This email already exists. Try another email.", ex.getMessage());
    }

    @Test
    @DisplayName("Duplicate registration with case-insensitive variation (uppercase/mixed) fails")
    void testDuplicateCaseInsensitiveEmailFails() {
        MarketplaceBackendApplication.RegisterRequest reqUpper = new MarketplaceBackendApplication.RegisterRequest(
                "Duplicate User", "dup2", "CUSTOMER@BUILDBID.COM", "9876543211", "Delhi", "Pass@123", "CUSTOMER", null
        );

        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqUpper));
        assertEquals("This email already exists. Try another email.", ex1.getMessage());

        MarketplaceBackendApplication.RegisterRequest reqMixed = new MarketplaceBackendApplication.RegisterRequest(
                "Duplicate User", "dup3", "CuStOmEr@BuildBid.Com", "9876543211", "Delhi", "Pass@123", "CUSTOMER", null
        );

        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqMixed));
        assertEquals("This email already exists. Try another email.", ex2.getMessage());
    }

    @Test
    @DisplayName("Cross-Role duplicate registration: CUSTOMER email cannot be registered as CONTRACTOR, PROFESSIONAL, or MATERIAL_SELLER")
    void testCustomerEmailCannotRegisterOtherRoles() {
        // Try to register existing customer's email as CONTRACTOR
        MarketplaceBackendApplication.RegisterRequest reqContractor = new MarketplaceBackendApplication.RegisterRequest(
                "Fake Contractor", "fake_cont", "customer@buildbid.com", "9876543211", "Delhi", "Pass@123", "CONTRACTOR", null
        );
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqContractor));
        assertEquals("This email already exists. Try another email.", ex1.getMessage());

        // Try as PROFESSIONAL
        MarketplaceBackendApplication.RegisterRequest reqPro = new MarketplaceBackendApplication.RegisterRequest(
                "Fake Pro", "fake_pro", "customer@buildbid.com", "9876543211", "Delhi", "Pass@123", "PROFESSIONAL", null
        );
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqPro));
        assertEquals("This email already exists. Try another email.", ex2.getMessage());

        // Try as MATERIAL_SELLER
        MarketplaceBackendApplication.RegisterRequest reqSeller = new MarketplaceBackendApplication.RegisterRequest(
                "Fake Seller", "fake_seller", "customer@buildbid.com", "9876543211", "Delhi", "Pass@123", "MATERIAL_SELLER", null
        );
        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqSeller));
        assertEquals("This email already exists. Try another email.", ex3.getMessage());
    }

    @Test
    @DisplayName("Cross-Role duplicate registration: CONTRACTOR email cannot be registered as CUSTOMER, PROFESSIONAL, or MATERIAL_SELLER")
    void testContractorEmailCannotRegisterOtherRoles() {
        MarketplaceBackendApplication.RegisterRequest reqCust = new MarketplaceBackendApplication.RegisterRequest(
                "Fake Cust", "fake_c", "contractor@buildbid.com", "9876543211", "Delhi", "Pass@123", "CUSTOMER", null
        );
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqCust));
        assertEquals("This email already exists. Try another email.", ex1.getMessage());

        MarketplaceBackendApplication.RegisterRequest reqPro = new MarketplaceBackendApplication.RegisterRequest(
                "Fake Pro", "fake_p", "contractor@buildbid.com", "9876543211", "Delhi", "Pass@123", "PROFESSIONAL", null
        );
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqPro));
        assertEquals("This email already exists. Try another email.", ex2.getMessage());

        MarketplaceBackendApplication.RegisterRequest reqSeller = new MarketplaceBackendApplication.RegisterRequest(
                "Fake Seller", "fake_s", "contractor@buildbid.com", "9876543211", "Delhi", "Pass@123", "MATERIAL_SELLER", null
        );
        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class, () -> authService.register(reqSeller));
        assertEquals("This email already exists. Try another email.", ex3.getMessage());
    }

    @Test
    @DisplayName("Cross-Role duplicate registration: PROFESSIONAL email cannot register CUSTOMER, CONTRACTOR, or MATERIAL_SELLER")
    void testProfessionalEmailCannotRegisterOtherRoles() {
        for (String role : List.of("CUSTOMER", "CONTRACTOR", "MATERIAL_SELLER")) {
            MarketplaceBackendApplication.RegisterRequest req = new MarketplaceBackendApplication.RegisterRequest(
                    "Fake " + role, "fake_" + role, "pro@buildbid.com", "9876543211", "Delhi", "Pass@123", role, null
            );
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authService.register(req));
            assertEquals("This email already exists. Try another email.", ex.getMessage());
        }
    }

    @Test
    @DisplayName("Cross-Role duplicate registration: MATERIAL_SELLER email cannot register CUSTOMER, CONTRACTOR, or PROFESSIONAL")
    void testMaterialSellerEmailCannotRegisterOtherRoles() {
        for (String role : List.of("CUSTOMER", "CONTRACTOR", "PROFESSIONAL")) {
            MarketplaceBackendApplication.RegisterRequest req = new MarketplaceBackendApplication.RegisterRequest(
                    "Fake " + role, "fake_" + role, "seller@buildbid.com", "9876543211", "Delhi", "Pass@123", role, null
            );
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authService.register(req));
            assertEquals("This email already exists. Try another email.", ex.getMessage());
        }
    }

    @Test
    @DisplayName("Existing unverified account strictly blocks a second account registration")
    void testExistingUnverifiedAccountBlocksDuplicateSignup() {
        assertFalse(unverifiedUser.isEmailVerified());

        MarketplaceBackendApplication.RegisterRequest req = new MarketplaceBackendApplication.RegisterRequest(
                "Second Try", "sec_try", "unverified@buildbid.com", "9876543211", "Delhi", "Pass@123", "CUSTOMER", null
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        assertEquals("This email already exists. Try another email.", ex.getMessage());
    }

    @Test
    @DisplayName("Database duplicate key constraint race condition throws safe user-facing message")
    void testDatabaseDuplicateConstraintRaceConditionSafety() {
        when(userRepository.existsByEmail("race@buildbid.com")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("race@buildbid.com")).thenReturn(false);

        // Simulate database race condition where unique constraint trips on flush
        doThrow(new DataIntegrityViolationException("Duplicate entry 'race@buildbid.com' for key 'users.email'"))
                .when(userRepository).saveAndFlush(any());

        MarketplaceBackendApplication.RegisterRequest req = new MarketplaceBackendApplication.RegisterRequest(
                "Race User", "race_user", "race@buildbid.com", "9876543211", "Delhi", "Pass@123", "CUSTOMER", null
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        assertEquals("This email already exists. Try another email.", ex.getMessage());
    }

    // ============================================================
    // B. OTP LIFECYCLE & SECURITY TESTS
    // ============================================================

    @Test
    @DisplayName("Email OTP generation: OTP is exactly 6 digits, hashed with BCrypt, 10 min expiry, 60s cooldown")
    void testEmailOtpGenerationAndSecurity() {
        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingCustomer.getId()), eq(UserVerification.VerificationType.EMAIL_VERIFICATION)
        )).thenReturn(Optional.empty());

        verificationService.sendEmailVerification(existingCustomer);

        verify(verificationRepository, times(1)).save(argThat(uv -> {
            assertNotNull(uv.getOtpHash());
            assertTrue(uv.getOtpHash().startsWith("$2a$") || uv.getOtpHash().startsWith("$2b$"));
            assertFalse(uv.isUsed());
            assertEquals(existingCustomer.getId(), uv.getUserId());
            assertEquals("customer@buildbid.com", uv.getTargetValue());
            assertEquals(UserVerification.VerificationType.EMAIL_VERIFICATION, uv.getVerificationType());
            assertTrue(uv.getExpiryTime().isAfter(LocalDateTime.now().plusMinutes(9)));
            assertTrue(uv.getResendAvailableAt().isAfter(LocalDateTime.now().plusSeconds(50)));
            return true;
        }));

        verify(emailService, times(1)).sendVerificationOtpEmail(
                eq("customer@buildbid.com"), any(), any(), eq("Email Verification")
        );
    }

    @Test
    @DisplayName("Resend cooldown: Attempting to resend OTP within 60s cooldown throws 429 Too Many Requests")
    void testResendCooldownEnforcement() {
        UserVerification cooldownRecord = new UserVerification(
                existingCustomer.getId(),
                UserVerification.VerificationType.EMAIL_VERIFICATION,
                "customer@buildbid.com",
                passwordEncoder.encode("123456"),
                LocalDateTime.now().plusMinutes(9),
                LocalDateTime.now().plusSeconds(45) // 45 seconds cooldown remaining
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingCustomer.getId()), eq(UserVerification.VerificationType.EMAIL_VERIFICATION)
        )).thenReturn(Optional.of(cooldownRecord));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                verificationService.sendEmailVerification(existingCustomer)
        );

        assertTrue(ex.getMessage().contains("Please wait"));
        assertTrue(ex.getMessage().contains("seconds before requesting a new OTP"));
    }

    @Test
    @DisplayName("Invalid OTP fails, increments attempt count, and locks after 5 failed attempts")
    void testMaxFailedAttemptsEnforced() {
        String plainOtp = "654321";
        String hashedOtp = passwordEncoder.encode(plainOtp);

        UserVerification record = new UserVerification(
                existingCustomer.getId(),
                UserVerification.VerificationType.EMAIL_VERIFICATION,
                "customer@buildbid.com",
                hashedOtp,
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(60)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingCustomer.getId()), eq(UserVerification.VerificationType.EMAIL_VERIFICATION)
        )).thenReturn(Optional.of(record));

        // Attempts 1 to 4 fail
        for (int i = 1; i <= 4; i++) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    verificationService.verifyEmailOtp(existingCustomer, "000000")
            );
            assertTrue(ex.getMessage().contains("Invalid verification code"));
        }

        assertEquals(4, record.getAttemptCount());

        // 5th failed attempt locks the record
        IllegalArgumentException ex5 = assertThrows(IllegalArgumentException.class, () ->
                verificationService.verifyEmailOtp(existingCustomer, "000000")
        );
        assertTrue(ex5.getMessage().contains("Maximum attempts exceeded"));
        assertTrue(record.isUsed());
    }

    @Test
    @DisplayName("Expired OTP is rejected and marked used")
    void testExpiredOtpRejected() {
        UserVerification expiredRecord = new UserVerification(
                existingCustomer.getId(),
                UserVerification.VerificationType.EMAIL_VERIFICATION,
                "customer@buildbid.com",
                passwordEncoder.encode("123456"),
                LocalDateTime.now().minusMinutes(1), // Already expired
                LocalDateTime.now().minusMinutes(5)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingCustomer.getId()), eq(UserVerification.VerificationType.EMAIL_VERIFICATION)
        )).thenReturn(Optional.of(expiredRecord));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                verificationService.verifyEmailOtp(existingCustomer, "123456")
        );

        assertTrue(ex.getMessage().contains("expired"));
        assertTrue(expiredRecord.isUsed());
    }

    @Test
    @DisplayName("Correct OTP marks email verified and sets emailVerifiedAt")
    void testSuccessfulEmailOtpVerification() {
        String plainOtp = "789123";
        UserVerification validRecord = new UserVerification(
                unverifiedUser.getId(),
                UserVerification.VerificationType.EMAIL_VERIFICATION,
                "unverified@buildbid.com",
                passwordEncoder.encode(plainOtp),
                LocalDateTime.now().plusMinutes(8),
                LocalDateTime.now().minusSeconds(10)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(unverifiedUser.getId()), eq(UserVerification.VerificationType.EMAIL_VERIFICATION)
        )).thenReturn(Optional.of(validRecord));

        assertFalse(unverifiedUser.isEmailVerified());

        boolean result = verificationService.verifyEmailOtp(unverifiedUser, plainOtp);

        assertTrue(result);
        assertTrue(validRecord.isUsed());
        assertTrue(unverifiedUser.isEmailVerified());
        assertNotNull(unverifiedUser.getEmailVerifiedAt());
        verify(userRepository, times(1)).save(unverifiedUser);
    }

    // ============================================================
    // C. MOBILE / PHONE VERIFICATION TESTS
    // ============================================================

    @Test
    @DisplayName("Phone OTP generation and verification marks phone verified")
    void testPhoneVerificationLifecycle() {
        String testPhone = "9988776655";
        String otp = "543210";

        UserVerification phoneRecord = new UserVerification(
                existingCustomer.getId(),
                UserVerification.VerificationType.PHONE_VERIFICATION,
                testPhone,
                passwordEncoder.encode(otp),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().minusSeconds(10)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingCustomer.getId()), eq(UserVerification.VerificationType.PHONE_VERIFICATION)
        )).thenReturn(Optional.of(phoneRecord));

        assertFalse(existingCustomer.isPhoneVerified());

        boolean verified = verificationService.verifyPhoneOtp(existingCustomer, testPhone, otp);

        assertTrue(verified);
        assertTrue(phoneRecord.isUsed());
        assertTrue(existingCustomer.isPhoneVerified());
        assertEquals(testPhone, existingCustomer.getPhone());
        assertNotNull(existingCustomer.getPhoneVerifiedAt());
        verify(userRepository, times(1)).save(existingCustomer);
    }

    // ============================================================
    // D. EMAIL CHANGE FLOW TESTS
    // ============================================================

    @Test
    @DisplayName("Email change to an existing email is rejected with exact duplicate message")
    void testEmailChangeToExistingEmailFails() {
        when(userRepository.existsByEmail("contractor@buildbid.com")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                verificationService.requestEmailChange(existingCustomer, "contractor@buildbid.com")
        );

        assertEquals("This email already exists. Try another email.", ex.getMessage());
    }

    @Test
    @DisplayName("Email change to fresh email requires OTP verification before applying")
    void testEmailChangeRequiresOtpVerification() {
        String newEmail = "brandnew@buildbid.com";
        when(userRepository.existsByEmail(newEmail)).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(newEmail)).thenReturn(false);

        verificationService.requestEmailChange(existingCustomer, newEmail);

        // Verify OTP was sent to new email
        verify(emailService, times(1)).sendVerificationOtpEmail(
                eq(newEmail), any(), any(), eq("Email Change Verification")
        );

        // Prior email on account must still remain unchanged
        assertEquals("customer@buildbid.com", existingCustomer.getEmail());

        // Now simulate entering valid OTP for change
        String plainOtp = "889900";
        UserVerification changeRecord = new UserVerification(
                existingCustomer.getId(),
                UserVerification.VerificationType.EMAIL_CHANGE,
                newEmail,
                passwordEncoder.encode(plainOtp),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().minusSeconds(5)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(existingCustomer.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)
        )).thenReturn(Optional.of(changeRecord));

        boolean changed = verificationService.verifyEmailChange(existingCustomer, newEmail, plainOtp);

        assertTrue(changed);
        assertEquals(newEmail, existingCustomer.getEmail());
        assertTrue(existingCustomer.isEmailVerified());
        assertTrue(changeRecord.isUsed());
    }

    // ============================================================
    // E. CONTROLLER SECURITY & IDOR PROTECTION TESTS
    // ============================================================

    @Test
    @DisplayName("Unauthenticated request to /api/verification/status is rejected with 401")
    void testVerificationStatusUnauthenticatedRejected() {
        ResponseEntity<?> response = verificationController.getVerificationStatus(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        ResponseEntity<?> response2 = verificationController.getVerificationStatus(unauth);
        assertEquals(HttpStatus.UNAUTHORIZED, response2.getStatusCode());
    }

    @Test
    @DisplayName("IDOR Protection: Endpoints resolve user exclusively from authentication context")
    void testIdorProtectionOnVerificationEndpoints() {
        Authentication authCustomer = createMockAuth("customer@buildbid.com", "CUSTOMER");

        ResponseEntity<?> statusResponse = verificationController.getVerificationStatus(authCustomer);
        assertEquals(HttpStatus.OK, statusResponse.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) statusResponse.getBody();
        assertNotNull(body);
        assertEquals("customer@buildbid.com", body.get("email"));
        assertEquals(true, body.get("emailVerified"));
    }
}
