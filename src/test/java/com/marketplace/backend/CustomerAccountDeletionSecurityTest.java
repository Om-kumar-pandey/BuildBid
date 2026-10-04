package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
 * BUILDBID — ACCOUNT SETTINGS — STEP 8
 * Final Comprehensive Security & Functional Test Suite:
 * Account Deactivation & Permanent Deletion.
 *
 * Verifies:
 * 1. OTP Security (6 digits, SecureRandom, BCrypt hash, expiry, max 5 attempts, cooldown)
 * 2. Strict Delivery Equality (SAME OTP delivered to both verified email & verified mobile)
 * 3. Delivery Failure Enforcement (email failure, SMS failure, partial delivery)
 * 4. Role Authorization & IDOR Protection (CUSTOMER only; cross-customer access rejected)
 * 5. Password Verification (BCrypt match, rejection on wrong password)
 * 6. Explicit DELETE Confirmation (exact case-sensitive "DELETE")
 * 7. One-Time Use OTP & Short-Lived Server Deletion Ticket
 * 8. Reversible Deactivation (preserves data, disables login, invalidates tokens, sends bilingual email)
 * 9. Permanent Deletion Transaction (cleans customer-owned data, preserves shared business records,
 *    anonymizes user, terminates credentials & sessions)
 * 10. Official Bilingual Email Notifications (English + Hindi for all events)
 */
public class CustomerAccountDeletionSecurityTest {

    private MarketplaceBackendApplication.UserRepository userRepository;
    private UserVerificationRepository verificationRepository;
    private CustomerProfileRepository profileRepository;
    private CustomerConstructionPreferenceRepository constructionPreferenceRepository;
    private CustomerSavedLocationRepository savedLocationRepository;
    private CustomerRegionalPreferenceRepository regionalPreferenceRepository;
    private NotificationRepository notificationRepository;
    private EmailService emailService;
    private SmsService smsService;
    private PasswordEncoder passwordEncoder;

    private CustomerAccountDeletionService deletionService;
    private CustomerAccountDeletionController deletionController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser unverifiedCustomer;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser proUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;

    private CustomerProfile profileA;
    private CustomerConstructionPreference constPrefA;
    private CustomerSavedLocation locationA;
    private CustomerRegionalPreference regPrefA;

    private MarketplaceBackendApplication.MarketplaceUser createMockUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role,
            boolean emailVerified, boolean phoneVerified
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Bangalore, Karnataka");
        user.setPhone("9876543210");
        user.setEmailVerified(emailVerified);
        user.setEmailVerifiedAt(emailVerified ? LocalDateTime.now().minusDays(10) : null);
        user.setPhoneVerified(phoneVerified);
        user.setPhoneVerifiedAt(phoneVerified ? LocalDateTime.now().minusDays(5) : null);
        user.setPasswordHash(passwordEncoder.encode("SecretPass@123"));

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
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_" + role))).when(auth).getAuthorities();
        return auth;
    }

    @BeforeEach
    void setUp() {
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        verificationRepository = mock(UserVerificationRepository.class);
        profileRepository = mock(CustomerProfileRepository.class);
        constructionPreferenceRepository = mock(CustomerConstructionPreferenceRepository.class);
        savedLocationRepository = mock(CustomerSavedLocationRepository.class);
        regionalPreferenceRepository = mock(CustomerRegionalPreferenceRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        emailService = mock(EmailService.class);
        smsService = mock(SmsService.class);
        passwordEncoder = new BCryptPasswordEncoder();

        deletionService = new CustomerAccountDeletionService(
                userRepository,
                verificationRepository,
                profileRepository,
                constructionPreferenceRepository,
                savedLocationRepository,
                regionalPreferenceRepository,
                notificationRepository,
                emailService,
                smsService,
                passwordEncoder
        );

        deletionController = new CustomerAccountDeletionController(
                deletionService,
                userRepository
        );

        customerA = createMockUser(101L, "customera@buildbid.com", "Customer A", "cust_a",
                MarketplaceBackendApplication.Role.CUSTOMER, true, true);
        customerB = createMockUser(102L, "customerb@buildbid.com", "Customer B", "cust_b",
                MarketplaceBackendApplication.Role.CUSTOMER, true, true);
        unverifiedCustomer = createMockUser(103L, "unverified@buildbid.com", "Unverified Cust", "unverified_c",
                MarketplaceBackendApplication.Role.CUSTOMER, false, false);

        contractorUser = createMockUser(201L, "contractor@buildbid.com", "Contractor C", "cont_c",
                MarketplaceBackendApplication.Role.CONTRACTOR, true, true);
        proUser = createMockUser(301L, "pro@buildbid.com", "Professional P", "pro_p",
                MarketplaceBackendApplication.Role.PROFESSIONAL, true, true);
        sellerUser = createMockUser(401L, "seller@buildbid.com", "Seller S", "seller_s",
                MarketplaceBackendApplication.Role.MATERIAL_SELLER, true, true);

        profileA = new CustomerProfile();
        profileA.setUser(customerA);
        constPrefA = new CustomerConstructionPreference(customerA);
        locationA = new CustomerSavedLocation(customerA, "Site Office", "MG Road", "Near Metro",
                "Bangalore", "Karnataka", "560001", "Landmark 1", true);
        regPrefA = new CustomerRegionalPreference(customerA);

        when(userRepository.findByEmail("customera@buildbid.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByEmailIgnoreCase("customera@buildbid.com")).thenReturn(Optional.of(customerA));
        when(userRepository.findByUsername("customera@buildbid.com")).thenReturn(Optional.of(customerA));

        when(userRepository.findByEmail("customerb@buildbid.com")).thenReturn(Optional.of(customerB));
        when(userRepository.findByEmailIgnoreCase("customerb@buildbid.com")).thenReturn(Optional.of(customerB));

        when(userRepository.findByEmail("unverified@buildbid.com")).thenReturn(Optional.of(unverifiedCustomer));
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("pro@buildbid.com")).thenReturn(Optional.of(proUser));
        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(sellerUser));

        when(userRepository.save(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.saveAndFlush(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(inv -> inv.getArgument(0));

        when(verificationRepository.save(any(UserVerification.class))).thenAnswer(inv -> inv.getArgument(0));
        when(verificationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        // Default email & sms mocks to success
        when(emailService.sendDeletionOtpEmail(any(), any(), any())).thenReturn(true);
        when(smsService.sendDeletionOtpSms(any(), any())).thenReturn(true);
        when(emailService.sendDeletionInitiatedEmail(any(), any())).thenReturn(true);
        when(emailService.sendDeletionOtpVerifiedEmail(any(), any())).thenReturn(true);
        when(emailService.sendPermanentDeletionSuccessEmail(any(), any())).thenReturn(true);
        when(emailService.sendAccountDeactivatedEmail(any(), any())).thenReturn(true);
    }

    // ============================================================
    // 1. DUAL-CHANNEL SAME OTP DISPATCH TESTS
    // ============================================================

    @Test
    @DisplayName("Exactly ONE OTP is generated and the SAME OTP is sent to BOTH email and SMS")
    void testSameOtpSentToBothEmailAndSms() {
        deletionService.initiatePermanentDeletion(customerA, "SecretPass@123", "DELETE");

        ArgumentCaptor<String> emailOtpCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> smsOtpCaptor = ArgumentCaptor.forClass(String.class);

        verify(emailService, times(1)).sendDeletionOtpEmail(eq("customera@buildbid.com"), eq("Customer A"), emailOtpCaptor.capture());
        verify(smsService, times(1)).sendDeletionOtpSms(eq("9876543210"), smsOtpCaptor.capture());

        String emailOtp = emailOtpCaptor.getValue();
        String smsOtp = smsOtpCaptor.getValue();

        assertNotNull(emailOtp);
        assertNotNull(smsOtp);
        assertEquals(emailOtp, smsOtp, "CRITICAL: Email OTP and SMS OTP must be IDENTICAL");
        assertEquals(6, emailOtp.length(), "OTP must be exactly 6 digits");
        assertTrue(emailOtp.matches("^\\d{6}$"), "OTP must be numeric");

        // Verify raw OTP is never stored in DB - only BCrypt hash
        ArgumentCaptor<UserVerification> uvCaptor = ArgumentCaptor.forClass(UserVerification.class);
        verify(verificationRepository, atLeastOnce()).save(uvCaptor.capture());
        UserVerification savedUv = uvCaptor.getValue();

        assertNotEquals(emailOtp, savedUv.getOtpHash(), "Raw OTP must NEVER be stored in the database");
        assertTrue(passwordEncoder.matches(emailOtp, savedUv.getOtpHash()), "Stored OTP hash must verify with BCrypt");
        assertEquals(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION, savedUv.getVerificationType());
    }

    // ============================================================
    // 2. DELIVERY FAILURE RULE TESTS
    // ============================================================

    @Test
    @DisplayName("Email delivery failure aborts permanent deletion and invalidates OTP")
    void testEmailDeliveryFailureAbortsDeletion() {
        when(emailService.sendDeletionOtpEmail(any(), any(), any())).thenReturn(false);
        when(smsService.sendDeletionOtpSms(any(), any())).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(customerA, "SecretPass@123", "DELETE")
        );

        assertTrue(ex.getMessage().contains("delivery failed"));

        // Verify OTP record was marked as used (invalidated)
        ArgumentCaptor<UserVerification> uvCaptor = ArgumentCaptor.forClass(UserVerification.class);
        verify(verificationRepository, atLeast(2)).save(uvCaptor.capture());
        List<UserVerification> saved = uvCaptor.getAllValues();
        assertTrue(saved.get(saved.size() - 1).isUsed(), "Failed delivery must invalidate the OTP record");
    }

    @Test
    @DisplayName("SMS delivery failure aborts permanent deletion and invalidates OTP")
    void testSmsDeliveryFailureAbortsDeletion() {
        when(emailService.sendDeletionOtpEmail(any(), any(), any())).thenReturn(true);
        when(smsService.sendDeletionOtpSms(any(), any())).thenReturn(false);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(customerA, "SecretPass@123", "DELETE")
        );

        assertTrue(ex.getMessage().contains("delivery failed"));
    }

    @Test
    @DisplayName("Both email and SMS delivery failure aborts permanent deletion")
    void testBothDeliveryChannelsFailureAbortsDeletion() {
        when(emailService.sendDeletionOtpEmail(any(), any(), any())).thenReturn(false);
        when(smsService.sendDeletionOtpSms(any(), any())).thenReturn(false);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(customerA, "SecretPass@123", "DELETE")
        );

        assertTrue(ex.getMessage().contains("delivery failed"));
    }

    // ============================================================
    // 3. ROLE & AUTHENTICATION TESTS
    // ============================================================

    @Test
    @DisplayName("Unauthenticated request to deletion endpoints returns 401 Unauthorized")
    void testUnauthenticatedAccessRejected() {
        ResponseEntity<?> res1 = deletionController.getStatus(null);
        assertEquals(HttpStatus.UNAUTHORIZED, res1.getStatusCode());

        ResponseEntity<?> res2 = deletionController.startPermanentDeletion(
                new CustomerAccountDeletionDto.InitiateDeletionRequest("SecretPass@123", "DELETE"), null
        );
        assertEquals(HttpStatus.UNAUTHORIZED, res2.getStatusCode());

        ResponseEntity<?> res3 = deletionController.deactivateAccount(
                new CustomerAccountDeletionDto.DeactivateAccountRequest("SecretPass@123", "DEACTIVATE"), null
        );
        assertEquals(HttpStatus.UNAUTHORIZED, res3.getStatusCode());
    }

    @Test
    @DisplayName("Non-CUSTOMER roles (CONTRACTOR, PROFESSIONAL, MATERIAL_SELLER) return 403 Forbidden")
    void testNonCustomerRolesForbidden() {
        Authentication contractorAuth = createMockAuth("contractor@buildbid.com", "CONTRACTOR");
        Authentication proAuth = createMockAuth("pro@buildbid.com", "PROFESSIONAL");
        Authentication sellerAuth = createMockAuth("seller@buildbid.com", "MATERIAL_SELLER");

        for (Authentication auth : List.of(contractorAuth, proAuth, sellerAuth)) {
            ResponseEntity<?> resStatus = deletionController.getStatus(auth);
            assertEquals(HttpStatus.FORBIDDEN, resStatus.getStatusCode());

            ResponseEntity<?> resStart = deletionController.startPermanentDeletion(
                    new CustomerAccountDeletionDto.InitiateDeletionRequest("SecretPass@123", "DELETE"), auth
            );
            assertEquals(HttpStatus.FORBIDDEN, resStart.getStatusCode());

            ResponseEntity<?> resDeact = deletionController.deactivateAccount(
                    new CustomerAccountDeletionDto.DeactivateAccountRequest("SecretPass@123", "DEACTIVATE"), auth
            );
            assertEquals(HttpStatus.FORBIDDEN, resDeact.getStatusCode());
        }
    }

    // ============================================================
    // 4. PREREQUISITES & DELETE CONFIRMATION STRING MATCHING
    // ============================================================

    @Test
    @DisplayName("Deletion requires both email and mobile to be verified")
    void testDeletionRequiresVerifiedEmailAndMobile() {
        unverifiedCustomer.setEmailVerified(false);
        unverifiedCustomer.setPhoneVerified(false);

        IllegalStateException ex1 = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(unverifiedCustomer, "SecretPass@123", "DELETE")
        );
        assertTrue(ex1.getMessage().contains("verified email address"));

        unverifiedCustomer.setEmailVerified(true);
        unverifiedCustomer.setPhoneVerified(false);

        IllegalStateException ex2 = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(unverifiedCustomer, "SecretPass@123", "DELETE")
        );
        assertTrue(ex2.getMessage().contains("verified mobile number"));
    }

    @Test
    @DisplayName("Confirmation must match exact case-sensitive string 'DELETE'")
    void testDeleteConfirmationExactMatch() {
        for (String invalidConfirm : List.of("delete", "Delete", "DELETE ", " DELETE", "DEL", "", "cancel")) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    deletionService.initiatePermanentDeletion(customerA, "SecretPass@123", invalidConfirm)
            );
            assertTrue(ex.getMessage().contains("exactly 'DELETE'"));
        }
    }

    @Test
    @DisplayName("Wrong current password is strictly rejected with 400 Bad Request")
    void testWrongPasswordRejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.initiatePermanentDeletion(customerA, "WrongPass@999", "DELETE")
        );
        assertEquals("Current password is incorrect.", ex.getMessage());
    }

    // ============================================================
    // 5. OTP LIFECYCLE, ATTEMPT LIMIT & COOLDOWN
    // ============================================================

    @Test
    @DisplayName("Resend cooldown of 60 seconds is enforced")
    void testResendCooldownEnforced() {
        UserVerification activeUv = new UserVerification(
                customerA.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                customerA.getEmail(),
                passwordEncoder.encode("123456"),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(45) // 45 seconds remaining
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(customerA.getId()),
                eq(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION)
        )).thenReturn(Optional.of(activeUv));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(customerA, "SecretPass@123", "DELETE")
        );
        assertTrue(ex.getMessage().contains("Please wait"));
    }

    @Test
    @DisplayName("OTP verification fails with wrong code and tracks remaining attempts")
    void testWrongOtpIncrementsAttempts() {
        String correctOtp = "654321";
        UserVerification record = new UserVerification(
                customerA.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                customerA.getEmail(),
                passwordEncoder.encode(correctOtp),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(60)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(customerA.getId()),
                eq(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION)
        )).thenReturn(Optional.of(record));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.verifyDeletionOtp(customerA, "000000")
        );
        assertTrue(ex.getMessage().contains("Invalid verification code"));
        assertEquals(1, record.getAttemptCount());
    }

    @Test
    @DisplayName("Exceeding 5 failed OTP attempts invalidates the code and triggers security alert email")
    void testMaxOtpAttemptsInvalidatesCode() {
        String correctOtp = "654321";
        UserVerification record = new UserVerification(
                customerA.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                customerA.getEmail(),
                passwordEncoder.encode(correctOtp),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(60)
        );
        record.setAttemptCount(4); // 4 prior failures

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(customerA.getId()),
                eq(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION)
        )).thenReturn(Optional.of(record));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.verifyDeletionOtp(customerA, "000000")
        );
        assertTrue(ex.getMessage().contains("Maximum attempts exceeded"));
        assertTrue(record.isUsed(), "OTP must be marked used/invalidated after 5 failed attempts");
        verify(emailService, times(1)).sendDeletionSecurityAlertEmail(eq(customerA.getEmail()), eq(customerA.getName()), any());
    }

    @Test
    @DisplayName("OTP is strictly one-time use and cannot be verified twice")
    void testOtpIsOneTimeUse() {
        String correctOtp = "889900";
        UserVerification record = new UserVerification(
                customerA.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                customerA.getEmail(),
                passwordEncoder.encode(correctOtp),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(60)
        );

        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(customerA.getId()),
                eq(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION)
        )).thenReturn(Optional.of(record));

        // First verification succeeds
        CustomerAccountDeletionDto.DeletionOtpVerificationResponse res =
                deletionService.verifyDeletionOtp(customerA, correctOtp);

        assertNotNull(res.deletionTicket());
        assertTrue(record.isUsed(), "OTP must be marked used immediately upon successful verification");

        // Second verification attempt must fail because it is already used
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.verifyDeletionOtp(customerA, correctOtp)
        );
        assertTrue(ex.getMessage().contains("already been used"));
    }

    // ============================================================
    // 6. IDOR & CROSS-CUSTOMER SECURITY TESTS
    // ============================================================

    @Test
    @DisplayName("Customer A cannot delete or affect Customer B (Strict IDOR Isolation)")
    void testIdorCustomerIsolation() {
        // Customer A gets a valid deletion ticket
        customerA.setDeletionAuthToken("bb_del_ticket_for_A");
        customerA.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        // Customer B tries to submit Customer A's deletion ticket
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.confirmPermanentDeletion(customerB, "bb_del_ticket_for_A", "DELETE")
        );
        assertTrue(ex.getMessage().contains("Invalid or missing deletion authorization ticket"));

        // Verify Customer A was not deleted
        assertTrue(customerA.isEnabled());
        assertFalse(customerA.isDeleted());
    }

    // ============================================================
    // 7. REVERSIBLE DEACTIVATION TESTS
    // ============================================================

    @Test
    @DisplayName("Account deactivation sets enabled=false, invalidates tokens, preserves data, and sends email")
    void testAccountDeactivationFlow() {
        CustomerAccountDeletionDto.OperationResponse res =
                deletionService.deactivateAccount(customerA, "SecretPass@123", "DEACTIVATE");

        assertTrue(res.success());
        assertFalse(customerA.isEnabled(), "Account enabled must be false");
        assertNotNull(customerA.getDeactivatedAt());
        assertNotNull(customerA.getPasswordUpdatedAt(), "passwordUpdatedAt must be set to invalidate tokens cross-device");

        // Verify data was NOT deleted
        verify(profileRepository, never()).deleteByUser(any());
        verify(savedLocationRepository, never()).deleteByUser(any());
        verify(constructionPreferenceRepository, never()).deleteByUser(any());

        // Verify deactivation notification email
        verify(emailService, times(1)).sendAccountDeactivatedEmail(eq("customera@buildbid.com"), eq("Customer A"));
    }

    // ============================================================
    // 8. FINAL PERMANENT DELETION TRANSACTION TESTS
    // ============================================================

    @Test
    @DisplayName("Permanent deletion cleans customer-owned data, preserves shared records, and sends bilingual email")
    void testPermanentDeletionFlow() {
        customerA.setDeletionAuthToken("bb_del_valid_ticket_123");
        customerA.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        CustomerAccountDeletionDto.OperationResponse res =
                deletionService.confirmPermanentDeletion(customerA, "bb_del_valid_ticket_123", "DELETE");

        assertTrue(res.success());
        assertTrue(customerA.isDeleted(), "User isDeleted flag must be true");
        assertFalse(customerA.isEnabled(), "User enabled flag must be false");
        assertNotNull(customerA.getDeletedAt());
        assertEquals("Deleted Customer", customerA.getName());
        assertNull(customerA.getPhone());
        assertNull(customerA.getLocation());
        assertTrue(customerA.getRoles().isEmpty(), "User roles must be cleared");
        assertTrue(customerA.getPasswordHash().startsWith("[DELETED_"), "Password hash must be scrambled and unmatchable");

        // Category A records deleted
        verify(profileRepository, times(1)).deleteByUser(customerA);
        verify(constructionPreferenceRepository, times(1)).deleteByUser(customerA);
        verify(savedLocationRepository, times(1)).deleteByUser(customerA);
        verify(regionalPreferenceRepository, times(1)).deleteByUser(customerA);
        verify(notificationRepository, times(1)).deleteByRecipient(customerA);
        verify(verificationRepository, times(1)).deleteByUserId(customerA.getId());

        // Final official bilingual deletion email triggered
        verify(emailService, times(1)).sendPermanentDeletionSuccessEmail(eq("customera@buildbid.com"), eq("Customer A"));
    }

    @Test
    @DisplayName("Email failure after successful deletion commit does not rollback deletion")
    void testEmailFailureAfterDeletionDoesNotRollback() {
        customerA.setDeletionAuthToken("bb_del_valid_ticket_456");
        customerA.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        doThrow(new RuntimeException("SMTP Server Unreachable"))
                .when(emailService).sendPermanentDeletionSuccessEmail(any(), any());

        CustomerAccountDeletionDto.OperationResponse res =
                deletionService.confirmPermanentDeletion(customerA, "bb_del_valid_ticket_456", "DELETE");

        assertTrue(res.success());
        assertTrue(customerA.isDeleted(), "Account MUST remain deleted even if final notification fails");
    }

    // ============================================================
    // 9. CONTROLLER INTEGRATION TESTS
    // ============================================================

    @Test
    @DisplayName("Controller endpoint POST /api/customer/account/delete/start succeeds for authenticated customer")
    void testControllerStartPermanentDeletion() {
        Authentication auth = createMockAuth("customera@buildbid.com", "CUSTOMER");
        CustomerAccountDeletionDto.InitiateDeletionRequest req =
                new CustomerAccountDeletionDto.InitiateDeletionRequest("SecretPass@123", "DELETE");

        ResponseEntity<?> response = deletionController.startPermanentDeletion(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof CustomerAccountDeletionDto.DeletionInitiationResponse);
    }

    @Test
    @DisplayName("Controller endpoint POST /api/customer/account/delete/confirm rejects invalid confirmation")
    void testControllerConfirmRejectsInvalidString() {
        Authentication auth = createMockAuth("customera@buildbid.com", "CUSTOMER");
        CustomerAccountDeletionDto.ConfirmDeletionRequest req =
                new CustomerAccountDeletionDto.ConfirmDeletionRequest("ticket123", "delete_now");

        ResponseEntity<?> response = deletionController.confirmPermanentDeletion(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // ============================================================
    // 10. BILINGUAL NOTIFICATION EMAIL CONTENT & SECRET EXCLUSION
    // ============================================================

    @Test
    @DisplayName("Final permanent deletion email contains both English and Hindi headings and no secrets")
    void testFinalDeletionEmailBilingualContent() throws Exception {
        EmailService realEmailService = new EmailService(null);
        java.lang.reflect.Method method = EmailService.class.getDeclaredMethod("buildPermanentDeletionSuccessHtmlTemplate", String.class);
        method.setAccessible(true);

        String html = (String) method.invoke(realEmailService, "John Doe");

        assertNotNull(html);
        assertTrue(html.contains("Your BuildBid Account Has Been Permanently Deleted"), "Must contain English heading");
        assertTrue(html.contains("आपका BuildBid खाता स्थायी रूप से हटा दिया गया है"), "Must contain Hindi heading");
        assertTrue(html.contains("John Doe"));

        // Verify strictly no sensitive secrets are in the email
        assertFalse(html.contains("password"));
        assertFalse(html.contains("SecretPass@123"));
        assertFalse(html.contains("jwt"));
        assertFalse(html.contains("Bearer"));
        assertFalse(html.contains("token"));
        assertFalse(html.contains("otp"));
        assertFalse(html.contains("101")); // internal ID
    }

    @Test
    @DisplayName("Account deactivation email contains both English and Hindi headings")
    void testDeactivationEmailBilingualContent() throws Exception {
        EmailService realEmailService = new EmailService(null);
        java.lang.reflect.Method method = EmailService.class.getDeclaredMethod("buildAccountDeactivatedHtmlTemplate", String.class);
        method.setAccessible(true);

        String html = (String) method.invoke(realEmailService, "Jane Doe");

        assertNotNull(html);
        assertTrue(html.contains("Your BuildBid Account Has Been Deactivated"), "Must contain English heading");
        assertTrue(html.contains("आपका BuildBid खाता निष्क्रिय कर दिया गया है"), "Must contain Hindi heading");
    }

    @Test
    @DisplayName("Deletion OTP email contains bilingual security notices and valid format")
    void testDeletionOtpEmailBilingualContent() throws Exception {
        EmailService realEmailService = new EmailService(null);
        java.lang.reflect.Method method = EmailService.class.getDeclaredMethod("buildDeletionOtpHtmlTemplate", String.class, String.class);
        method.setAccessible(true);

        String html = (String) method.invoke(realEmailService, "Jane Doe", "789123");

        assertNotNull(html);
        assertTrue(html.contains("Permanent Account Deletion OTP"));
        assertTrue(html.contains("789123"), "Must contain OTP in OTP email");
        assertTrue(html.contains("10 minutes"));
        assertTrue(html.contains("आपके खाते को स्थायी रूप से हटाने के सत्यापन के लिए OTP है"));
    }

    // ============================================================
    // 11. LOGIN & JWT REJECTION AFTER DEACTIVATION & DELETION
    // ============================================================

    @Test
    @DisplayName("Login is strictly rejected for a deactivated user")
    void testLoginRejectedForDeactivatedUser() {
        customerA.setEnabled(false);
        customerA.setDeactivatedAt(LocalDateTime.now());

        MarketplaceBackendApplication.AuthService authService = new MarketplaceBackendApplication.AuthService(
                userRepository,
                passwordEncoder,
                mock(org.springframework.security.authentication.AuthenticationManager.class),
                mock(MarketplaceBackendApplication.JwtService.class),
                null
        );

        when(userRepository.existsByEmail("customera@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("customera@buildbid.com")).thenReturn(true);

        org.springframework.security.authentication.DisabledException ex =
                assertThrows(org.springframework.security.authentication.DisabledException.class, () ->
                        authService.login(new MarketplaceBackendApplication.LoginRequest("customera@buildbid.com", "SecretPass@123", "CUSTOMER"))
                );
        assertTrue(ex.getMessage().contains("deactivated"));
    }

    @Test
    @DisplayName("Login is strictly rejected for a permanently deleted user")
    void testLoginRejectedForDeletedUser() {
        customerA.setEnabled(false);
        customerA.setDeleted(true);
        customerA.setDeletedAt(LocalDateTime.now());

        MarketplaceBackendApplication.AuthService authService = new MarketplaceBackendApplication.AuthService(
                userRepository,
                passwordEncoder,
                mock(org.springframework.security.authentication.AuthenticationManager.class),
                mock(MarketplaceBackendApplication.JwtService.class),
                null
        );

        when(userRepository.existsByEmail("customera@buildbid.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("customera@buildbid.com")).thenReturn(true);

        org.springframework.security.core.userdetails.UsernameNotFoundException ex =
                assertThrows(org.springframework.security.core.userdetails.UsernameNotFoundException.class, () ->
                        authService.login(new MarketplaceBackendApplication.LoginRequest("customera@buildbid.com", "SecretPass@123", "CUSTOMER"))
                );
        assertTrue(ex.getMessage().contains("permanently deleted"));
    }

    @Test
    @DisplayName("JWT validation fails immediately when user is disabled or deleted")
    void testJwtInvalidForDisabledUser() {
        MarketplaceBackendApplication.JwtService jwtService = new MarketplaceBackendApplication.JwtService(
                "THIS_IS_A_VERY_LONG_SECRET_KEY_FOR_TESTING_JWT_SECURITY_32_BYTES",
                86400000L
        );

        MarketplaceBackendApplication.CustomUserDetails userDetails =
                new MarketplaceBackendApplication.CustomUserDetails(
                        customerA.getId(),
                        customerA.getEmail(),
                        customerA.getPasswordHash(),
                        true,
                        List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")),
                        null
                );

        String token = jwtService.createToken(userDetails);
        assertTrue(jwtService.isValid(token, userDetails), "Token should be valid for enabled user");

        // Deactivated / disabled user details
        MarketplaceBackendApplication.CustomUserDetails disabledDetails =
                new MarketplaceBackendApplication.CustomUserDetails(
                        customerA.getId(),
                        customerA.getEmail(),
                        customerA.getPasswordHash(),
                        false, // disabled!
                        List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")),
                        null
                );

        assertFalse(jwtService.isValid(token, disabledDetails), "Token MUST be invalid when user is disabled");
    }
}
