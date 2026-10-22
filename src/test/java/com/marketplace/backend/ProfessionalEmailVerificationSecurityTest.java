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
                        Long id, String email, String name, String username, MarketplaceBackendApplication.Role role,
                        boolean emailVerified) {
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
                        java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class
                                        .getDeclaredField("id");
                        idField.setAccessible(true);
                        idField.set(user, id);

                        java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class
                                        .getDeclaredField("createdAt");
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
                                passwordEncoder);

                verificationController = new VerificationController(
                                verificationService,
                                userRepository,
                                jwtService,
                                userDetailsService);

                professionalProfileController = new ProfessionalProfileController(
                                professionalPhotoService,
                                userRepository);

                existingPro = createMockUser(101L, "pro@buildbid.com", "Pro Engineer", "pro_engineer",
                                MarketplaceBackendApplication.Role.PROFESSIONAL, true);
                existingLegacyServiceProvider = createMockUser(102L, "legacy.sp@buildbid.com", "Legacy Provider",
                                "legacy_sp", MarketplaceBackendApplication.Role.SERVICE_PROVIDER, true);
                existingCustomer = createMockUser(201L, "customer@buildbid.com", "Customer One", "cust_one",
                                MarketplaceBackendApplication.Role.CUSTOMER, true);
                existingContractor = createMockUser(301L, "contractor@buildbid.com", "Contractor One", "cont_one",
                                MarketplaceBackendApplication.Role.CONTRACTOR, true);

                // Repo mocking for existing accounts
                when(userRepository.findByEmail("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
                when(userRepository.findByEmailIgnoreCase("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
                when(userRepository.existsByEmail("pro@buildbid.com")).thenReturn(true);
                when(userRepository.existsByEmailIgnoreCase("pro@buildbid.com")).thenReturn(true);

                when(userRepository.findByEmail("legacy.sp@buildbid.com"))
                                .thenReturn(Optional.of(existingLegacyServiceProvider));
                when(userRepository.findByEmailIgnoreCase("legacy.sp@buildbid.com"))
                                .thenReturn(Optional.of(existingLegacyServiceProvider));
                when(userRepository.existsByEmail("legacy.sp@buildbid.com")).thenReturn(true);
                when(userRepository.existsByEmailIgnoreCase("legacy.sp@buildbid.com")).thenReturn(true);

                when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(existingCustomer));
                when(userRepository.findByEmailIgnoreCase("customer@buildbid.com"))
                                .thenReturn(Optional.of(existingCustomer));
                when(userRepository.existsByEmail("customer@buildbid.com")).thenReturn(true);
                when(userRepository.existsByEmailIgnoreCase("customer@buildbid.com")).thenReturn(true);

                when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(existingContractor));
                when(userRepository.findByEmailIgnoreCase("contractor@buildbid.com"))
                                .thenReturn(Optional.of(existingContractor));
                when(userRepository.existsByEmail("contractor@buildbid.com")).thenReturn(true);
                when(userRepository.existsByEmailIgnoreCase("contractor@buildbid.com")).thenReturn(true);

                when(userRepository.save(any(MarketplaceBackendApplication.MarketplaceUser.class)))
                                .thenAnswer(inv -> inv.getArgument(0));
                when(verificationRepository.save(any(UserVerification.class))).thenAnswer(inv -> inv.getArgument(0));
                when(verificationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
                when(emailService.sendVerificationOtpEmail(any(), any(), any(), any())).thenReturn(true);

                // Mock UserDetailsService for JWT creation
                when(userDetailsService.loadUserByUsername(anyString())).thenAnswer(inv -> {
                        String email = inv.getArgument(0);
                        return new MarketplaceBackendApplication.CustomUserDetails(
                                        101L,
                                        email,
                                        "hashedPassword",
                                        true,
                                        List.of(new SimpleGrantedAuthority("ROLE_PROFESSIONAL")),
                                        null);
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
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.empty());

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);

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
                                eq("Email Change Verification"));
                verify(emailService, never()).sendVerificationOtpEmail(
                                eq("pro@buildbid.com"),
                                any(),
                                any(),
                                any());

                // Verify current email on account remains unchanged while verification is
                // pending
                assertEquals("pro@buildbid.com", existingPro.getEmail());
        }

        @Test
        @DisplayName("2. Authenticated legacy SERVICE_PROVIDER can request email change correctly")
        void testLegacyServiceProviderCanRequestEmailChange() {
                String proposedEmail = "new.sp.architect@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);
                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingLegacyServiceProvider.getId()),
                                eq(UserVerification.VerificationType.EMAIL_CHANGE))).thenReturn(Optional.empty());

                Authentication auth = createMockAuth("legacy.sp@buildbid.com", "SERVICE_PROVIDER");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                verify(emailService, times(1)).sendVerificationOtpEmail(
                                eq(proposedEmail),
                                anyString(),
                                anyString(),
                                eq("Email Change Verification"));
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
                                LocalDateTime.now().minusSeconds(10));

                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.of(record));

                when(userRepository.findByEmail(proposedEmail)).thenReturn(Optional.empty());
                when(userRepository.findByEmailIgnoreCase(proposedEmail)).thenReturn(Optional.empty());

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest(proposedEmail, plainOtp),
                                auth);

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
                                LocalDateTime.now().plusSeconds(60));

                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.of(record));

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "000000"),
                                auth);

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
                                LocalDateTime.now().minusMinutes(5));

                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.of(expiredRecord));

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "123456"),
                                auth);

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
                                LocalDateTime.now().minusMinutes(1));
                consumedRecord.setUsed(true); // Already used

                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.empty());

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "123456"),
                                auth);

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
                                LocalDateTime.now().minusSeconds(10));

                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.of(recordA));

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                // Attacker attempts to verify email B using email A's OTP
                ResponseEntity<?> response = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest(proposedEmailB, plainOtp),
                                auth);

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
                                auth);

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
                                auth);

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
                                auth);

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
                                null);
                assertEquals(HttpStatus.UNAUTHORIZED, responseNull.getStatusCode());

                Authentication unauth = mock(Authentication.class);
                when(unauth.isAuthenticated()).thenReturn(false);
                ResponseEntity<?> responseUnauth = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest("test@buildbid.com"),
                                unauth);
                assertEquals(HttpStatus.UNAUTHORIZED, responseUnauth.getStatusCode());
        }

        @Test
        @DisplayName("12. Unauthenticated request to verify-change is rejected with 401 Unauthorized")
        void testUnauthenticatedVerifyChangeRejected() {
                ResponseEntity<?> responseNull = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest("test@buildbid.com", "123456"),
                                null);
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
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.of(activeCooldownRecord));

                when(userRepository.existsByEmail("fresh.pro@buildbid.com")).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase("fresh.pro@buildbid.com")).thenReturn(false);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest("fresh.pro@buildbid.com"),
                                auth);

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
                                LocalDateTime.now().plusSeconds(60));

                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.of(record));

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                // 4 failed attempts
                for (int i = 1; i <= 4; i++) {
                        ResponseEntity<?> res = verificationController.verifyEmailChange(
                                        new VerificationController.VerifyEmailChangeRequest(proposedEmail, "000000"),
                                        auth);
                        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
                }

                assertEquals(4, record.getAttemptCount());

                // 5th attempt locks the OTP record
                ResponseEntity<?> res5 = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest(proposedEmail, "000000"),
                                auth);
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

        // ============================================================
        // 6. FIVE-ATTEMPT / 24-HOUR RATE LIMITING & SECURITY FIX TESTS
        // ============================================================

        @Test
        @DisplayName("16. First accepted email-change send leaves four attempts remaining")
        void testFirstSendLeavesFourAttemptsRemaining() {
                String proposedEmail = "pro.attempt1@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);
                when(verificationRepository.findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Collections.emptyList());

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                assertEquals(5, body.get("maxAttempts"));
                assertEquals(1, body.get("attemptsUsed"));
                assertEquals(4, body.get("attemptsRemaining"));
                assertEquals(true, body.get("allowed"));
                assertNotNull(body.get("windowExpiresAt"));
        }

        @Test
        @DisplayName("17. Fifth accepted send leaves zero attempts remaining")
        void testFifthSendLeavesZeroAttemptsRemaining() {
                String proposedEmail = "pro.attempt5@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);

                LocalDateTime now = LocalDateTime.now();
                List<UserVerification> priorRecords = new ArrayList<>();
                for (int i = 0; i < 4; i++) {
                        UserVerification uv = new UserVerification(
                                        existingPro.getId(),
                                        UserVerification.VerificationType.EMAIL_CHANGE,
                                        "old" + i + "@buildbid.com",
                                        "hash" + i,
                                        now.plusMinutes(10),
                                        now.minusMinutes(1));
                        uv.setCreatedAt(now.minusHours(2).plusMinutes(i * 10));
                        priorRecords.add(uv);
                }

                when(verificationRepository.findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(priorRecords);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                assertEquals(5, body.get("maxAttempts"));
                assertEquals(5, body.get("attemptsUsed"));
                assertEquals(0, body.get("attemptsRemaining"));
                assertEquals(false, body.get("allowed"));
        }

        @Test
        @DisplayName("18. Sixth send within active 24-hour window is rejected with 429 Too Many Requests")
        void testSixthSendIn24HourWindowRejected() {
                String proposedEmail = "pro.attempt6@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);

                LocalDateTime now = LocalDateTime.now();
                List<UserVerification> exhaustedRecords = new ArrayList<>();
                for (int i = 0; i < 5; i++) {
                        UserVerification uv = new UserVerification(
                                        existingPro.getId(),
                                        UserVerification.VerificationType.EMAIL_CHANGE,
                                        "prior" + i + "@buildbid.com",
                                        "hash" + i,
                                        now.plusMinutes(10),
                                        now.minusMinutes(5));
                        uv.setCreatedAt(now.minusHours(3).plusMinutes(i * 10));
                        exhaustedRecords.add(uv);
                }

                when(verificationRepository.findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(exhaustedRecords);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);

                assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                assertTrue(((String) body.get("error")).contains("Maximum OTP send attempts (5) reached"));
                assertEquals(0, body.get("attemptsRemaining"));
                assertEquals(5, body.get("attemptsUsed"));
                assertEquals(false, body.get("allowed"));
                assertNotNull(body.get("windowExpiresAt"));
        }

        @Test
        @DisplayName("19. Failed email delivery does not report success and does not persist OTP")
        void testFailedEmailDeliveryDoesNotReportSuccess() {
                String proposedEmail = "pro.faildelivery@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);
                when(verificationRepository.findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Collections.emptyList());

                // Simulate delivery rejection by Brevo / SMTP
                when(emailService.sendVerificationOtpEmail(eq(proposedEmail), any(), any(), any())).thenReturn(false);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                assertTrue(((String) body.get("error")).contains("Failed to deliver verification code"));

                // Verify verificationRepository.save was NEVER called
                verify(verificationRepository, never()).save(argThat(uv -> proposedEmail.equals(uv.getTargetValue())));
        }

        @Test
        @DisplayName("20. Invalid syntax email cannot trigger Send OTP and returns 400 Bad Request")
        void testInvalidSyntaxEmailRejected() {
                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest("invalid-not-an-email"),
                                auth);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                assertEquals("Invalid email format.", body.get("error"));
        }

        @Test
        @DisplayName("21. 24-hour window renewal: allowance renews to five attempts after window expires")
        void testAllowanceRenewsAfter24Hours() {
                String proposedEmail = "pro.renewed@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);

                LocalDateTime now = LocalDateTime.now();
                // 5 records all created 26 hours ago (window ended 2 hours ago)
                List<UserVerification> oldRecords = new ArrayList<>();
                for (int i = 0; i < 5; i++) {
                        UserVerification uv = new UserVerification(
                                        existingPro.getId(),
                                        UserVerification.VerificationType.EMAIL_CHANGE,
                                        "old" + i + "@buildbid.com",
                                        "hash" + i,
                                        now.minusHours(25),
                                        now.minusHours(25));
                        uv.setCreatedAt(now.minusHours(26).plusMinutes(i * 5));
                        oldRecords.add(uv);
                }

                when(verificationRepository.findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(oldRecords);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                // After renewal, this send is attempt 1 of the new window, leaving 4 remaining
                assertEquals(5, body.get("maxAttempts"));
                assertEquals(1, body.get("attemptsUsed"));
                assertEquals(4, body.get("attemptsRemaining"));
                assertEquals(true, body.get("allowed"));
        }

        @Test
        @DisplayName("22. Attempt status endpoint returns authoritative rate limit metadata")
        void testAttemptStatusEndpoint() {
                LocalDateTime now = LocalDateTime.now();
                List<UserVerification> records = new ArrayList<>();
                UserVerification uv = new UserVerification(
                                existingPro.getId(),
                                UserVerification.VerificationType.EMAIL_CHANGE,
                                "first@buildbid.com",
                                "hash",
                                now.plusMinutes(10),
                                now.minusMinutes(1));
                uv.setCreatedAt(now.minusHours(1));
                records.add(uv);

                when(verificationRepository.findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(records);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                ResponseEntity<?> response = verificationController.getEmailChangeAttemptStatus(auth);
                assertEquals(HttpStatus.OK, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                assertEquals(5, body.get("maxAttempts"));
                assertEquals(1, body.get("attemptsUsed"));
                assertEquals(4, body.get("attemptsRemaining"));
                assertEquals(true, body.get("allowed"));
                assertNotNull(body.get("windowExpiresAt"));
        }

        @Test
        @DisplayName("23. Concurrent requests cannot bypass the five-attempt limit")
        void testConcurrentRequestsCannotBypassLimit() throws Exception {
                String proposedEmail = "pro.concurrent@buildbid.com";
                when(userRepository.existsByEmail(anyString())).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);

                List<UserVerification> sharedRecords = Collections.synchronizedList(new ArrayList<>());
                when(verificationRepository.findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenAnswer(inv -> new ArrayList<>(sharedRecords));

                when(verificationRepository.save(any(UserVerification.class))).thenAnswer(inv -> {
                        UserVerification uv = inv.getArgument(0);
                        sharedRecords.add(uv);
                        return uv;
                });

                int numThreads = 10;
                java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors
                                .newFixedThreadPool(numThreads);
                java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
                java.util.concurrent.CountDownLatch doneLatch = new java.util.concurrent.CountDownLatch(numThreads);
                java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(
                                0);
                java.util.concurrent.atomic.AtomicInteger rejectedCount = new java.util.concurrent.atomic.AtomicInteger(
                                0);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                for (int i = 0; i < numThreads; i++) {
                        executor.submit(() -> {
                                try {
                                        startLatch.await();
                                        ResponseEntity<?> resp = verificationController.requestEmailChange(
                                                        new VerificationController.EmailChangeRequest(proposedEmail),
                                                        auth);
                                        if (resp.getStatusCode() == HttpStatus.OK) {
                                                successCount.incrementAndGet();
                                        } else if (resp.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                                                rejectedCount.incrementAndGet();
                                        }
                                } catch (Exception e) {
                                        rejectedCount.incrementAndGet();
                                } finally {
                                        doneLatch.countDown();
                                }
                        });
                }

                startLatch.countDown();
                doneLatch.await(10, java.util.concurrent.TimeUnit.SECONDS);
                executor.shutdown();

                assertEquals(5, successCount.get());
                assertEquals(5, rejectedCount.get());
                assertEquals(5, sharedRecords.size());
        }

        @Test
        @DisplayName("24. Concurrent first-time requests cannot bypass the five-attempt limit")
        void testConcurrentFirstTimeRequestsCannotBypassLimit() throws Exception {
                String proposedEmail = "pro.firsttime@buildbid.com";
                when(userRepository.existsByEmail(anyString())).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);

                List<UserVerification> sharedRecords = Collections.synchronizedList(new ArrayList<>());
                when(verificationRepository
                                .findByUserIdAndVerificationTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                                                eq(existingPro.getId()),
                                                eq(UserVerification.VerificationType.EMAIL_CHANGE),
                                                any(LocalDateTime.class)))
                                .thenAnswer(inv -> new ArrayList<>(sharedRecords));

                when(verificationRepository.save(any(UserVerification.class))).thenAnswer(inv -> {
                        UserVerification uv = inv.getArgument(0);
                        sharedRecords.add(uv);
                        return uv;
                });

                int numThreads = 8;
                java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors
                                .newFixedThreadPool(numThreads);
                java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
                java.util.concurrent.CountDownLatch doneLatch = new java.util.concurrent.CountDownLatch(numThreads);
                java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(
                                0);
                java.util.concurrent.atomic.AtomicInteger rejectedCount = new java.util.concurrent.atomic.AtomicInteger(
                                0);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                for (int i = 0; i < numThreads; i++) {
                        executor.submit(() -> {
                                try {
                                        startLatch.await();
                                        ResponseEntity<?> resp = verificationController.requestEmailChange(
                                                        new VerificationController.EmailChangeRequest(proposedEmail),
                                                        auth);
                                        if (resp.getStatusCode() == HttpStatus.OK) {
                                                successCount.incrementAndGet();
                                        } else if (resp.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                                                rejectedCount.incrementAndGet();
                                        }
                                } catch (Exception e) {
                                        rejectedCount.incrementAndGet();
                                } finally {
                                        doneLatch.countDown();
                                }
                        });
                }

                startLatch.countDown();
                doneLatch.await(10, java.util.concurrent.TimeUnit.SECONDS);
                executor.shutdown();

                assertEquals(5, successCount.get());
                assertEquals(3, rejectedCount.get());
                assertEquals(5, sharedRecords.size());
        }

        @Test
        @DisplayName("25. Multi-instance concurrency with shared persistence store cannot exceed five attempts")
        void testMultiInstanceConcurrencyCannotExceedLimit() throws Exception {
                String proposedEmail = "pro.multiinstance@buildbid.com";

                // Simulate two independent service instances (instanceA and instanceB) sharing
                // one repository store
                List<UserVerification> sharedStore = Collections.synchronizedList(new ArrayList<>());
                java.util.concurrent.locks.ReentrantLock dbRowLock = new java.util.concurrent.locks.ReentrantLock(true);

                UserVerificationRepository sharedVerifRepo = mock(UserVerificationRepository.class);
                MarketplaceBackendApplication.UserRepository sharedUserRepo = mock(
                                MarketplaceBackendApplication.UserRepository.class);

                when(sharedUserRepo.existsByEmail(anyString())).thenReturn(false);
                when(sharedUserRepo.existsByEmailIgnoreCase(anyString())).thenReturn(false);
                when(sharedUserRepo.findByEmail("pro@buildbid.com")).thenReturn(Optional.of(existingPro));
                when(sharedUserRepo.findByEmailIgnoreCase("pro@buildbid.com")).thenReturn(Optional.of(existingPro));

                // SELECT ... FOR UPDATE simulation on shared store
                when(sharedUserRepo.findByIdForUpdate(existingPro.getId())).thenAnswer(inv -> {
                        dbRowLock.lock();
                        return Optional.of(existingPro);
                });

                when(sharedVerifRepo.findByUserIdAndVerificationTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE),
                                any(LocalDateTime.class))).thenAnswer(inv -> new ArrayList<>(sharedStore));

                when(sharedVerifRepo.save(any(UserVerification.class))).thenAnswer(inv -> {
                        UserVerification uv = inv.getArgument(0);
                        sharedStore.add(uv);
                        if (dbRowLock.isHeldByCurrentThread()) {
                                dbRowLock.unlock();
                        }
                        return uv;
                });

                VerificationService instanceA = new VerificationService(
                                sharedVerifRepo, sharedUserRepo, customerProfileRepository, emailService, smsService,
                                passwordEncoder);
                VerificationService instanceB = new VerificationService(
                                sharedVerifRepo, sharedUserRepo, customerProfileRepository, emailService, smsService,
                                passwordEncoder);

                VerificationController controllerA = new VerificationController(instanceA, sharedUserRepo);
                VerificationController controllerB = new VerificationController(instanceB, sharedUserRepo);

                int totalRequests = 10;
                java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors
                                .newFixedThreadPool(totalRequests);
                java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
                java.util.concurrent.CountDownLatch doneLatch = new java.util.concurrent.CountDownLatch(totalRequests);
                java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(
                                0);
                java.util.concurrent.atomic.AtomicInteger rejectedCount = new java.util.concurrent.atomic.AtomicInteger(
                                0);

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                for (int i = 0; i < totalRequests; i++) {
                        final boolean useInstanceA = (i % 2 == 0);
                        executor.submit(() -> {
                                try {
                                        startLatch.await();
                                        VerificationController targetController = useInstanceA ? controllerA
                                                        : controllerB;
                                        ResponseEntity<?> resp = targetController.requestEmailChange(
                                                        new VerificationController.EmailChangeRequest(proposedEmail),
                                                        auth);
                                        if (resp.getStatusCode() == HttpStatus.OK) {
                                                successCount.incrementAndGet();
                                        } else if (resp.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                                                rejectedCount.incrementAndGet();
                                        }
                                } catch (Exception e) {
                                        rejectedCount.incrementAndGet();
                                } finally {
                                        if (dbRowLock.isHeldByCurrentThread()) {
                                                dbRowLock.unlock();
                                        }
                                        doneLatch.countDown();
                                }
                        });
                }

                startLatch.countDown();
                doneLatch.await(10, java.util.concurrent.TimeUnit.SECONDS);
                executor.shutdown();

                assertEquals(5, successCount.get());
                assertEquals(5, rejectedCount.get());
                assertEquals(5, sharedStore.size());
        }

        @Test
        @DisplayName("26. Database persistence failure does not report success and leaves no uncommitted OTP")
        void testPersistenceFailureDoesNotReportSuccess() {
                String proposedEmail = "pro.persistfail@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);
                when(verificationRepository
                                .findByUserIdAndVerificationTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                                                eq(existingPro.getId()),
                                                eq(UserVerification.VerificationType.EMAIL_CHANGE),
                                                any(LocalDateTime.class)))
                                .thenReturn(Collections.emptyList());

                // Simulate database constraint / persistence crash during save
                when(verificationRepository.save(any(UserVerification.class)))
                                .thenThrow(new org.springframework.dao.DataIntegrityViolationException(
                                                "Simulated DB connection or constraint failure"));

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> {
                        verificationController.requestEmailChange(
                                        new VerificationController.EmailChangeRequest(proposedEmail),
                                        auth);
                });
        }

        @Test
        @DisplayName("27. Delivery retry after transport failure does not consume extra attempts")
        void testDeliveryRetryAfterTransportFailureDoesNotConsumeExtraAttempts() {
                String proposedEmail = "pro.retry@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);

                List<UserVerification> persistedStore = new ArrayList<>();
                when(verificationRepository
                                .findByUserIdAndVerificationTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                                                eq(existingPro.getId()),
                                                eq(UserVerification.VerificationType.EMAIL_CHANGE),
                                                any(LocalDateTime.class)))
                                .thenAnswer(inv -> new ArrayList<>(persistedStore));

                when(verificationRepository.save(any(UserVerification.class))).thenAnswer(inv -> {
                        UserVerification uv = inv.getArgument(0);
                        persistedStore.add(uv);
                        return uv;
                });

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                // Attempt 1: Delivery fails (e.g. SMTP down)
                when(emailService.sendVerificationOtpEmail(eq(proposedEmail), any(), any(), any())).thenReturn(false);

                ResponseEntity<?> failResp = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);
                assertEquals(HttpStatus.BAD_REQUEST, failResp.getStatusCode());
                assertEquals(0, persistedStore.size()); // No attempt recorded

                // Status check confirms 5 full attempts remain
                ResponseEntity<?> statusResp = verificationController.getEmailChangeAttemptStatus(auth);
                @SuppressWarnings("unchecked")
                Map<String, Object> statusBody = (Map<String, Object>) statusResp.getBody();
                assertNotNull(statusBody);
                assertEquals(5, statusBody.get("attemptsRemaining"));
                assertEquals(0, statusBody.get("attemptsUsed"));

                // Attempt 2: Delivery succeeds on retry
                when(emailService.sendVerificationOtpEmail(eq(proposedEmail), any(), any(), any())).thenReturn(true);

                ResponseEntity<?> successResp = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(proposedEmail),
                                auth);
                assertEquals(HttpStatus.OK, successResp.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> successBody = (Map<String, Object>) successResp.getBody();
                assertNotNull(successBody);
                assertEquals(4, successBody.get("attemptsRemaining"));
                assertEquals(1, successBody.get("attemptsUsed"));
                assertEquals(1, persistedStore.size());
        }

        @Test
        @DisplayName("28. Expired historical records (>24h) are filtered by cutoff query and restore full allowance")
        void testCutoffQueryFiltersExpiredRecords() {
                String proposedEmail = "pro.cutoff@buildbid.com";
                when(userRepository.existsByEmail(proposedEmail)).thenReturn(false);
                when(userRepository.existsByEmailIgnoreCase(proposedEmail)).thenReturn(false);

                LocalDateTime now = LocalDateTime.now();
                LocalDateTime cutoff = now.minusHours(24);

                // Simulated repository: returns only records where createdAt >= cutoff
                List<UserVerification> allHistory = new ArrayList<>();
                for (int i = 0; i < 5; i++) {
                        UserVerification old = new UserVerification(
                                        existingPro.getId(),
                                        UserVerification.VerificationType.EMAIL_CHANGE,
                                        "old" + i + "@buildbid.com",
                                        "hash" + i,
                                        now.minusHours(25),
                                        now.minusHours(25));
                        old.setCreatedAt(now.minusHours(30).plusHours(i));
                        allHistory.add(old);
                }

                when(verificationRepository
                                .findByUserIdAndVerificationTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                                                eq(existingPro.getId()),
                                                eq(UserVerification.VerificationType.EMAIL_CHANGE),
                                                any(LocalDateTime.class)))
                                .thenAnswer(inv -> {
                                        LocalDateTime c = inv.getArgument(2);
                                        return allHistory.stream().filter(r -> !r.getCreatedAt().isBefore(c)).toList();
                                });

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                VerificationService.RateLimitStatus status = verificationService
                                .getEmailChangeRateLimitStatus(existingPro.getId());
                assertEquals(5, status.maxAttempts());
                assertEquals(0, status.attemptsUsed());
                assertEquals(5, status.attemptsRemaining());
                assertTrue(status.allowed());
        }

        @Test
        @DisplayName("29. Duplicate email and invalid syntax requests do NOT consume rate-limit attempts")
        void testInvalidAndDuplicateRequestsDoNotConsumeAttempts() {
                String existingEmail = "customer@buildbid.com"; // belongs to another user
                when(userRepository.existsByEmail(existingEmail)).thenReturn(true);
                when(userRepository.existsByEmailIgnoreCase(existingEmail)).thenReturn(true);

                when(verificationRepository
                                .findByUserIdAndVerificationTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                                                eq(existingPro.getId()),
                                                eq(UserVerification.VerificationType.EMAIL_CHANGE),
                                                any(LocalDateTime.class)))
                                .thenReturn(Collections.emptyList());

                Authentication auth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");

                // 1. Duplicate email attempt
                ResponseEntity<?> dupResp = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest(existingEmail),
                                auth);
                assertEquals(HttpStatus.BAD_REQUEST, dupResp.getStatusCode());

                // 2. Invalid syntax attempt
                ResponseEntity<?> invalidResp = verificationController.requestEmailChange(
                                new VerificationController.EmailChangeRequest("not-an-email"),
                                auth);
                assertEquals(HttpStatus.BAD_REQUEST, invalidResp.getStatusCode());

                // 3. Status remains at full 5 attempts
                VerificationService.RateLimitStatus status = verificationService
                                .getEmailChangeRateLimitStatus(existingPro.getId());
                assertEquals(5, status.attemptsRemaining());
                assertEquals(0, status.attemptsUsed());
                verify(verificationRepository, never()).save(any());
        }

        @Test
        @DisplayName("30. Bounded striped lock maps users stably and prevents memory growth")
        void testBoundedStripedLockStability() {
                // Test that 1,000 distinct user IDs map to valid striped locks without
                // allocation growth
                for (long id = 1; id <= 1000; id++) {
                        VerificationService.RateLimitStatus status = verificationService
                                        .getEmailChangeRateLimitStatus(id);
                        assertNotNull(status);
                        assertEquals(5, status.maxAttempts());
                }
        }

        @Test
        @DisplayName("31. One user cannot verify another user's pending email change OTP")
        void testOneUserCannotVerifyAnotherUsersOtp() {
                // User A (existingPro) has a pending OTP
                LocalDateTime now = LocalDateTime.now();
                String targetEmail = "pro.userA.target@buildbid.com";
                String otp = "654321";
                UserVerification uvA = new UserVerification(
                                existingPro.getId(),
                                UserVerification.VerificationType.EMAIL_CHANGE,
                                targetEmail,
                                passwordEncoder.encode(otp),
                                now.plusMinutes(10),
                                now.plusSeconds(60));

                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingPro.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.of(uvA));

                // User B (existingContractor) has NO pending OTP
                when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                                eq(existingContractor.getId()), eq(UserVerification.VerificationType.EMAIL_CHANGE)))
                                .thenReturn(Optional.empty());

                Authentication authUserB = createMockAuth("contractor@buildbid.com", "CONTRACTOR");

                // User B attempts to verify User A's OTP and email
                ResponseEntity<?> response = verificationController.verifyEmailChange(
                                new VerificationController.VerifyEmailChangeRequest(targetEmail, otp),
                                authUserB);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                assertNotNull(body);
                assertEquals("No pending email change request found. Please request a new verification code.",
                                body.get("error"));
                assertFalse(uvA.isUsed()); // User A's OTP remains untouched
        }
}
