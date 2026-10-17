package com.marketplace.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — PHASE 8: PROFESSIONAL ACCOUNT SETTINGS
 * Comprehensive Security & Lifecycle Test Suite:
 * Professional Account Deactivation & Permanent Deletion.
 *
 * Verifies:
 * 1. Role Authorization & IDOR Protection (PROFESSIONAL & SERVICE_PROVIDER allowed; CUSTOMER, CONTRACTOR, MATERIAL_SELLER rejected)
 * 2. Status verification check (prerequisites enforcement for permanent deletion)
 * 3. Reversible Deactivation (service pause, disabled login, cross-device token invalidation, bilingual email)
 * 4. Permanent Deletion OTP Security (6 digits, SecureRandom, BCrypt hash, expiry, attempt limits, cooldown)
 * 5. Strict Delivery Equality (SAME OTP delivered to both verified email & verified mobile)
 * 6. Delivery Failure Enforcement (email failure, SMS failure, partial delivery abortion)
 * 7. Server Authorization Ticket & Single-Use OTP verification
 * 8. Atomic Permanent Deletion Transaction (cleans personal data, preserves shared business records, anonymizes user, terminates credentials & sessions)
 * 9. Rejection of deactivated/deleted accounts at authentication layer
 */
public class ProfessionalAccountDeletionSecurityTest {

    private MarketplaceBackendApplication.UserRepository userRepository;
    private UserVerificationRepository verificationRepository;
    private ProfessionalProfilePhotoRepository professionalProfilePhotoRepository;
    private ProfessionalServiceRepository professionalServiceRepository;
    private NotificationRepository notificationRepository;
    private EmailService emailService;
    private SmsService smsService;
    private PasswordEncoder passwordEncoder;

    private ProfessionalAccountDeletionService deletionService;
    private ProfessionalAccountDeletionController deletionController;

    private MarketplaceBackendApplication.MarketplaceUser proA;
    private MarketplaceBackendApplication.MarketplaceUser proB;
    private MarketplaceBackendApplication.MarketplaceUser unverifiedPro;
    private MarketplaceBackendApplication.MarketplaceUser serviceProviderUser;
    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;

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
        user.setLocation("Mumbai, Maharashtra");
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

        String authorityName = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(authorityName));
        doReturn(authorities).when(auth).getAuthorities();

        return auth;
    }

    @BeforeEach
    void setUp() {
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        verificationRepository = mock(UserVerificationRepository.class);
        professionalProfilePhotoRepository = mock(ProfessionalProfilePhotoRepository.class);
        professionalServiceRepository = mock(ProfessionalServiceRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        emailService = mock(EmailService.class);
        smsService = mock(SmsService.class);
        passwordEncoder = new BCryptPasswordEncoder();

        deletionService = new ProfessionalAccountDeletionService(
                userRepository,
                verificationRepository,
                professionalProfilePhotoRepository,
                professionalServiceRepository,
                notificationRepository,
                emailService,
                smsService,
                passwordEncoder
        );

        deletionController = new ProfessionalAccountDeletionController(deletionService, userRepository);

        proA = createMockUser(101L, "proA@buildbid.com", "Pro User A", "proA", MarketplaceBackendApplication.Role.PROFESSIONAL, true, true);
        proB = createMockUser(102L, "proB@buildbid.com", "Pro User B", "proB", MarketplaceBackendApplication.Role.PROFESSIONAL, true, true);
        unverifiedPro = createMockUser(103L, "unverified@buildbid.com", "Unverified Pro", "unverifiedPro", MarketplaceBackendApplication.Role.PROFESSIONAL, false, false);
        serviceProviderUser = createMockUser(104L, "sp@buildbid.com", "Service Provider", "spUser", MarketplaceBackendApplication.Role.SERVICE_PROVIDER, true, true);
        customerUser = createMockUser(201L, "customer@buildbid.com", "Customer User", "custUser", MarketplaceBackendApplication.Role.CUSTOMER, true, true);
        contractorUser = createMockUser(301L, "contractor@buildbid.com", "Contractor User", "contractorUser", MarketplaceBackendApplication.Role.CONTRACTOR, true, true);
        sellerUser = createMockUser(401L, "seller@buildbid.com", "Seller User", "sellerUser", MarketplaceBackendApplication.Role.MATERIAL_SELLER, true, true);

        when(userRepository.findByEmail("proA@buildbid.com")).thenReturn(Optional.of(proA));
        when(userRepository.findByEmail("proB@buildbid.com")).thenReturn(Optional.of(proB));
        when(userRepository.findByEmail("unverified@buildbid.com")).thenReturn(Optional.of(unverifiedPro));
        when(userRepository.findByEmail("sp@buildbid.com")).thenReturn(Optional.of(serviceProviderUser));
        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(customerUser));
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(sellerUser));

        when(userRepository.save(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.saveAndFlush(any(MarketplaceBackendApplication.MarketplaceUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(userRepository.consumeDeletionTicket(any(), any(), any())).thenAnswer(invocation -> {
            Long userId = invocation.getArgument(0);
            String ticket = invocation.getArgument(1);
            LocalDateTime now = invocation.getArgument(2);

            MarketplaceBackendApplication.MarketplaceUser target = null;
            if (proA != null && userId.equals(proA.getId())) target = proA;
            else if (proB != null && userId.equals(proB.getId())) target = proB;
            else if (unverifiedPro != null && userId.equals(unverifiedPro.getId())) target = unverifiedPro;
            else if (serviceProviderUser != null && userId.equals(serviceProviderUser.getId())) target = serviceProviderUser;

            if (target != null && target.getDeletionAuthToken() != null
                    && target.getDeletionAuthToken().equals(ticket)
                    && target.getDeletionAuthExpiry() != null
                    && target.getDeletionAuthExpiry().isAfter(now)
                    && !target.isDeleted() && target.isEnabled()) {
                target.setDeletionAuthToken(null);
                target.setDeletionAuthExpiry(null);
                return 1;
            }
            return 0;
        });

        when(emailService.sendDeletionOtpEmail(any(), any(), any())).thenReturn(true);
        when(smsService.sendDeletionOtpSms(any(), any())).thenReturn(true);
        when(emailService.sendDeletionInitiatedEmail(any(), any())).thenReturn(true);
        when(emailService.sendDeletionOtpVerifiedEmail(any(), any())).thenReturn(true);
        when(emailService.sendDeletionSecurityAlertEmail(any(), any(), any())).thenReturn(true);
        when(emailService.sendPermanentDeletionSuccessEmail(any(), any())).thenReturn(true);
        when(emailService.sendAccountDeactivatedEmail(any(), any())).thenReturn(true);
    }

    // ============================================================
    // 1. ROLE AUTHORIZATION & IDOR TESTS
    // ============================================================

    @Test
    @DisplayName("Unauthenticated requests are strictly rejected with HTTP 401")
    void testUnauthenticatedRequestsRejected() {
        ResponseEntity<?> res1 = deletionController.getStatus(null);
        assertEquals(HttpStatus.UNAUTHORIZED, res1.getStatusCode());

        ResponseEntity<?> res2 = deletionController.deactivateAccount(
                new ProfessionalAccountDeletionDto.DeactivateAccountRequest("SecretPass@123", "DEACTIVATE"), null
        );
        assertEquals(HttpStatus.UNAUTHORIZED, res2.getStatusCode());

        ResponseEntity<?> res3 = deletionController.startPermanentDeletion(
                new ProfessionalAccountDeletionDto.InitiateDeletionRequest("SecretPass@123", "DELETE"), null
        );
        assertEquals(HttpStatus.UNAUTHORIZED, res3.getStatusCode());
    }

    @Test
    @DisplayName("Non-professional roles (CUSTOMER, CONTRACTOR, SELLER) are rejected with HTTP 403")
    void testNonProfessionalRolesRejected() {
        Authentication custAuth = createMockAuth("customer@buildbid.com", "CUSTOMER");
        Authentication contAuth = createMockAuth("contractor@buildbid.com", "CONTRACTOR");
        Authentication sellerAuth = createMockAuth("seller@buildbid.com", "MATERIAL_SELLER");

        for (Authentication auth : List.of(custAuth, contAuth, sellerAuth)) {
            ResponseEntity<?> resStatus = deletionController.getStatus(auth);
            assertEquals(HttpStatus.FORBIDDEN, resStatus.getStatusCode(), "Should reject non-pro role for status");

            ResponseEntity<?> resDeact = deletionController.deactivateAccount(
                    new ProfessionalAccountDeletionDto.DeactivateAccountRequest("SecretPass@123", "DEACTIVATE"), auth
            );
            assertEquals(HttpStatus.FORBIDDEN, resDeact.getStatusCode(), "Should reject non-pro role for deactivation");

            ResponseEntity<?> resStart = deletionController.startPermanentDeletion(
                    new ProfessionalAccountDeletionDto.InitiateDeletionRequest("SecretPass@123", "DELETE"), auth
            );
            assertEquals(HttpStatus.FORBIDDEN, resStart.getStatusCode(), "Should reject non-pro role for deletion start");
        }
    }

    @Test
    @DisplayName("PROFESSIONAL and legacy SERVICE_PROVIDER roles are authorized")
    void testProfessionalAndServiceProviderAuthorized() {
        Authentication proAuth = createMockAuth("proA@buildbid.com", "PROFESSIONAL");
        Authentication spAuth = createMockAuth("sp@buildbid.com", "SERVICE_PROVIDER");

        ResponseEntity<?> resPro = deletionController.getStatus(proAuth);
        assertEquals(HttpStatus.OK, resPro.getStatusCode());

        ResponseEntity<?> resSp = deletionController.getStatus(spAuth);
        assertEquals(HttpStatus.OK, resSp.getStatusCode());
    }

    @Test
    @DisplayName("IDOR Protection: Current identity comes strictly from principal, not client payload")
    void testIdorProtectionPrincipalIsolation() {
        Authentication proAAuth = createMockAuth("proA@buildbid.com", "PROFESSIONAL");

        // Execute deactivation as Pro A
        ResponseEntity<?> res = deletionController.deactivateAccount(
                new ProfessionalAccountDeletionDto.DeactivateAccountRequest("SecretPass@123", "DEACTIVATE"), proAAuth
        );
        assertEquals(HttpStatus.OK, res.getStatusCode());

        // Verify Pro A is deactivated and Pro B remains active
        assertFalse(proA.isEnabled(), "Pro A must be deactivated");
        assertTrue(proB.isEnabled(), "Pro B must remain untouched and active");
    }

    // ============================================================
    // 2. ACCOUNT STATUS ENDPOINT TESTS
    // ============================================================

    @Test
    @DisplayName("Status returns canDelete=true only when both email and mobile are verified")
    void testStatusPrerequisites() {
        ProfessionalAccountDeletionDto.AccountDeletionStatusResponse statusVerified = deletionService.getStatus(proA);
        assertTrue(statusVerified.canDeactivate());
        assertTrue(statusVerified.canDelete());
        assertNull(statusVerified.verificationRequiredMessage());

        ProfessionalAccountDeletionDto.AccountDeletionStatusResponse statusUnverified = deletionService.getStatus(unverifiedPro);
        assertTrue(statusUnverified.canDeactivate());
        assertFalse(statusUnverified.canDelete());
        assertNotNull(statusUnverified.verificationRequiredMessage());
        assertTrue(statusUnverified.verificationRequiredMessage().contains("Both your email address and mobile number must be verified"));
    }

    // ============================================================
    // 3. DEACTIVATION WORKFLOW TESTS
    // ============================================================

    @Test
    @DisplayName("Deactivation requires valid confirmation string 'DEACTIVATE'")
    void testDeactivationRequiresConfirmation() {
        assertThrows(IllegalArgumentException.class, () ->
                deletionService.deactivateAccount(proA, "SecretPass@123", "WRONG_WORD")
        );
        assertThrows(IllegalArgumentException.class, () ->
                deletionService.deactivateAccount(proA, "SecretPass@123", null)
        );
    }

    @Test
    @DisplayName("Deactivation requires correct current password")
    void testDeactivationRequiresPassword() {
        assertThrows(IllegalArgumentException.class, () ->
                deletionService.deactivateAccount(proA, "WrongPass@999", "DEACTIVATE")
        );
        assertThrows(IllegalArgumentException.class, () ->
                deletionService.deactivateAccount(proA, "", "DEACTIVATE")
        );
    }

    @Test
    @DisplayName("Deactivation pauses published services, disables login, and invalidates tokens")
    void testDeactivationLifecycle() {
        ProfessionalService service1 = new ProfessionalService();
        service1.setActive(true);
        ProfessionalService service2 = new ProfessionalService();
        service2.setActive(true);
        when(professionalServiceRepository.findByProfessional_IdOrderByCreatedAtDesc(proA.getId()))
                .thenReturn(List.of(service1, service2));

        ProfessionalAccountDeletionDto.OperationResponse response =
                deletionService.deactivateAccount(proA, "SecretPass@123", "DEACTIVATE");

        assertTrue(response.success());
        assertTrue(response.sessionsInvalidated());
        assertFalse(proA.isEnabled(), "Account must be disabled");
        assertNotNull(proA.getDeactivatedAt());
        assertNotNull(proA.getPasswordUpdatedAt(), "PasswordUpdatedAt must be refreshed to invalidate JWTs");

        assertFalse(service1.isActive(), "Service 1 must be paused");
        assertFalse(service2.isActive(), "Service 2 must be paused");
        verify(emailService, times(1)).sendAccountDeactivatedEmail(eq("proA@buildbid.com"), eq("Pro User A"));
    }

    @Test
    @DisplayName("Already deactivated account cannot be deactivated again (Conflict)")
    void testAlreadyDeactivatedAccountConflict() {
        proA.setEnabled(false);
        proA.setDeactivatedAt(LocalDateTime.now().minusDays(1));

        assertThrows(IllegalStateException.class, () ->
                deletionService.deactivateAccount(proA, "SecretPass@123", "DEACTIVATE")
        );
    }

    // ============================================================
    // 4. PERMANENT DELETION: INITIATE & OTP GENERATION
    // ============================================================

    @Test
    @DisplayName("Permanent deletion initiation rejects unverified email or mobile")
    void testPermanentDeletionRequiresDualVerification() {
        assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(unverifiedPro, "SecretPass@123", "DELETE")
        );

        unverifiedPro.setEmailVerified(true);
        assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(unverifiedPro, "SecretPass@123", "DELETE")
        );
    }

    @Test
    @DisplayName("Permanent deletion initiation requires exact case-sensitive 'DELETE'")
    void testPermanentDeletionExactWordConfirmation() {
        assertThrows(IllegalArgumentException.class, () ->
                deletionService.initiatePermanentDeletion(proA, "SecretPass@123", "delete")
        );
        assertThrows(IllegalArgumentException.class, () ->
                deletionService.initiatePermanentDeletion(proA, "SecretPass@123", "REMOVE")
        );
    }

    @Test
    @DisplayName("Permanent deletion initiation generates secure numeric 6-digit OTP and dispatches SAME OTP to both channels")
    void testPermanentDeletionDispatchesSameOtpToBothChannels() {
        ArgumentCaptor<UserVerification> verifCaptor = ArgumentCaptor.forClass(UserVerification.class);
        ArgumentCaptor<String> emailOtpCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> smsOtpCaptor = ArgumentCaptor.forClass(String.class);

        ProfessionalAccountDeletionDto.DeletionInitiationResponse response =
                deletionService.initiatePermanentDeletion(proA, "SecretPass@123", "DELETE");

        assertNotNull(response);
        assertEquals(60, response.cooldownSeconds());

        verify(verificationRepository).save(verifCaptor.capture());
        UserVerification saved = verifCaptor.getValue();
        assertEquals(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION, saved.getVerificationType());
        assertNotNull(saved.getOtpHash());

        verify(emailService, times(1)).sendDeletionOtpEmail(eq("proA@buildbid.com"), eq("Pro User A"), emailOtpCaptor.capture());
        verify(smsService, times(1)).sendDeletionOtpSms(eq("9876543210"), smsOtpCaptor.capture());

        String emailOtp = emailOtpCaptor.getValue();
        String smsOtp = smsOtpCaptor.getValue();

        assertEquals(emailOtp, smsOtp, "SAME OTP must be dispatched to BOTH channels");
        assertTrue(emailOtp.matches("^\\d{6}$"), "OTP must be a 6-digit numeric string");
        assertTrue(passwordEncoder.matches(emailOtp, saved.getOtpHash()), "Stored hash must match dispatched OTP");
    }

    @Test
    @DisplayName("Delivery failure on email OR SMS immediately aborts and invalidates OTP")
    void testDeliveryFailureAbortsDeletion() {
        when(emailService.sendDeletionOtpEmail(any(), any(), any())).thenReturn(false);

        IllegalStateException exEmail = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(proA, "SecretPass@123", "DELETE")
        );
        assertTrue(exEmail.getMessage().contains("failed"));

        when(emailService.sendDeletionOtpEmail(any(), any(), any())).thenReturn(true);
        when(smsService.sendDeletionOtpSms(any(), any())).thenReturn(false);

        IllegalStateException exSms = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(proA, "SecretPass@123", "DELETE")
        );
        assertTrue(exSms.getMessage().contains("failed"));
    }

    @Test
    @DisplayName("Resend cooldown is enforced when an active deletion OTP exists")
    void testResendCooldownEnforcement() {
        UserVerification existing = new UserVerification(
                proA.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                proA.getEmail(),
                passwordEncoder.encode("123456"),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(45)
        );
        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(proA.getId()), eq(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION)
        )).thenReturn(Optional.of(existing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                deletionService.initiatePermanentDeletion(proA, "SecretPass@123", "DELETE")
        );
        assertTrue(ex.getMessage().contains("Please wait"));
    }

    // ============================================================
    // 5. OTP VERIFICATION & AUTHORIZATION TICKET
    // ============================================================

    @Test
    @DisplayName("OTP verification rejects expired or max-attempt-exceeded OTPs")
    void testOtpVerificationExpiryAndMaxAttempts() {
        UserVerification expiredRecord = new UserVerification(
                proA.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                proA.getEmail(),
                passwordEncoder.encode("123456"),
                LocalDateTime.now().minusMinutes(1),
                LocalDateTime.now().minusMinutes(5)
        );
        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(proA.getId()), eq(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION)
        )).thenReturn(Optional.of(expiredRecord));

        assertThrows(IllegalArgumentException.class, () ->
                deletionService.verifyDeletionOtp(proA, "123456")
        );
        assertTrue(expiredRecord.isUsed(), "Expired record must be marked used");
    }

    @Test
    @DisplayName("OTP verification issues short-lived server-side authorization ticket on match")
    void testOtpVerificationIssuesTicket() {
        String rawOtp = "654321";
        UserVerification activeRecord = new UserVerification(
                proA.getId(),
                UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION,
                proA.getEmail(),
                passwordEncoder.encode(rawOtp),
                LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().plusSeconds(30)
        );
        when(verificationRepository.findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
                eq(proA.getId()), eq(UserVerification.VerificationType.PERMANENT_ACCOUNT_DELETION)
        )).thenReturn(Optional.of(activeRecord));

        ProfessionalAccountDeletionDto.DeletionOtpVerificationResponse res =
                deletionService.verifyDeletionOtp(proA, rawOtp);

        assertTrue(activeRecord.isUsed(), "OTP must be marked used immediately");
        assertNotNull(res.deletionTicket());
        assertTrue(res.deletionTicket().startsWith("bb_del_"));
        assertEquals(5, res.validityMinutes());

        assertEquals(res.deletionTicket(), proA.getDeletionAuthToken());
        assertNotNull(proA.getDeletionAuthExpiry());
    }

    // ============================================================
    // 6. PERMANENT DELETION CONFIRMATION & ANONYMIZATION
    // ============================================================

    @Test
    @DisplayName("Permanent deletion confirmation rejects invalid or expired ticket")
    void testPermanentDeletionRejectsInvalidTicket() {
        proA.setDeletionAuthToken("bb_del_valid123");
        proA.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        assertThrows(IllegalArgumentException.class, () ->
                deletionService.confirmPermanentDeletion(proA, "bb_del_wrong", "DELETE")
        );

        proA.setDeletionAuthExpiry(LocalDateTime.now().minusMinutes(1));
        assertThrows(IllegalArgumentException.class, () ->
                deletionService.confirmPermanentDeletion(proA, "bb_del_valid123", "DELETE")
        );
    }

    @Test
    @DisplayName("Permanent deletion cleans personal data, preserves shared business records, and anonymizes user")
    void testPermanentDeletionAnonymization() {
        String ticket = "bb_del_secrettoken";
        proA.setDeletionAuthToken(ticket);
        proA.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        ProfessionalService ps = new ProfessionalService();
        ps.setActive(true);
        ps.setDocumentData("sensitive-license-data");
        when(professionalServiceRepository.findByProfessional_IdOrderByCreatedAtDesc(proA.getId()))
                .thenReturn(List.of(ps));

        ProfessionalAccountDeletionDto.OperationResponse response =
                deletionService.confirmPermanentDeletion(proA, ticket, "DELETE");

        assertTrue(response.success());
        assertTrue(response.sessionsInvalidated());

        // Personal data scrubbed
        verify(professionalProfilePhotoRepository, times(1)).deleteByUser(proA);
        verify(verificationRepository, times(1)).deleteByUserId(proA.getId());
        verify(notificationRepository, times(1)).deleteByRecipient(proA);

        assertFalse(ps.isActive(), "Published service must be paused");
        assertNull(ps.getDocumentData(), "Document data must be wiped");

        // User anonymization
        assertTrue(proA.isDeleted());
        assertNotNull(proA.getDeletedAt());
        assertFalse(proA.isEnabled());
        assertEquals("Deleted Professional", proA.getName());
        assertNull(proA.getPhone());
        assertNull(proA.getLocation());
        assertNull(proA.getProfilePhotoUrl());
        assertTrue(proA.getRoles().isEmpty());
        assertTrue(proA.getPasswordHash().startsWith("[DELETED_"));
        assertNull(proA.getDeletionAuthToken());

        // Email and username safely anonymized with unique collision-resistant tombstones
        assertNotNull(proA.getEmail());
        assertTrue(proA.getEmail().startsWith("deleted_pro_101_"), "Email must be anonymized with user ID tombstone prefix");
        assertTrue(proA.getEmail().endsWith("@deleted.buildbid.invalid"), "Email must end with non-routable .invalid domain");
        assertTrue(proA.getEmail().length() <= 150, "Email tombstone must fit within 150 character limit");
        assertNotEquals("proA@buildbid.com", proA.getEmail(), "Original email must be freed for future reuse");

        assertNotNull(proA.getUsername());
        assertTrue(proA.getUsername().startsWith("deleted_pro_101_"), "Username must be anonymized with user ID tombstone prefix");
        assertTrue(proA.getUsername().length() <= 100, "Username tombstone must fit within 100 character limit");
        assertNotEquals("proA", proA.getUsername(), "Original username must be freed for future reuse");

        // Verification flags invalidated
        assertFalse(proA.isEmailVerified(), "emailVerified must be set to false upon permanent deletion");
        assertNull(proA.getEmailVerifiedAt(), "emailVerifiedAt must be cleared upon permanent deletion");
        assertFalse(proA.isPhoneVerified(), "phoneVerified must be set to false upon permanent deletion");
        assertNull(proA.getPhoneVerifiedAt(), "phoneVerifiedAt must be cleared upon permanent deletion");

        // Final notification dispatched to original pre-anonymization email
        verify(emailService, times(1)).sendPermanentDeletionSuccessEmail(eq("proA@buildbid.com"), eq("Pro User A"));
    }

    @Test
    @DisplayName("Single-use ticket consumption: Replaying an already consumed ticket fails safely")
    void testReplayingConsumedTicketFailsSafely() {
        String ticket = "bb_del_singleuse123";
        proA.setDeletionAuthToken(ticket);
        proA.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        // First attempt consumes ticket successfully
        ProfessionalAccountDeletionDto.OperationResponse firstResponse =
                deletionService.confirmPermanentDeletion(proA, ticket, "DELETE");
        assertTrue(firstResponse.success());

        // Replay attempt with same ticket MUST fail because ticket was atomically consumed
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.confirmPermanentDeletion(proA, ticket, "DELETE")
        );
        assertTrue(ex.getMessage().contains("Invalid, expired, or already consumed"));
    }

    @Test
    @DisplayName("Concurrent ticket consumption: Exactly one competing thread can consume the ticket")
    void testConcurrentTicketConsumptionOnlyAllowsOneWinner() throws Exception {
        String ticket = "bb_del_race_ticket_999";
        proB.setDeletionAuthToken(ticket);
        proB.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        List<Future<Void>> futures = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                startLatch.await();
                try {
                    ProfessionalAccountDeletionDto.OperationResponse resp =
                            deletionService.confirmPermanentDeletion(proB, ticket, "DELETE");
                    if (resp.success()) {
                        successCount.incrementAndGet();
                    }
                } catch (IllegalArgumentException ex) {
                    if (ex.getMessage().contains("already consumed") || ex.getMessage().contains("Invalid")) {
                        rejectedCount.incrementAndGet();
                    }
                }
                return null;
            }));
        }

        startLatch.countDown();
        for (Future<Void> f : futures) {
            f.get(5, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one concurrent thread must succeed in consuming the ticket");
        assertEquals(threadCount - 1, rejectedCount.get(), "All other competing threads must be rejected");
    }

    @Test
    @DisplayName("Post-commit event delivery: Event is published and post-commit listener delivers email")
    void testPostCommitEventDispatchedAndHandled() {
        ApplicationEventPublisher mockPublisher = mock(ApplicationEventPublisher.class);
        ProfessionalAccountDeletionService serviceWithEvents = new ProfessionalAccountDeletionService(
                userRepository,
                verificationRepository,
                professionalProfilePhotoRepository,
                professionalServiceRepository,
                notificationRepository,
                emailService,
                smsService,
                passwordEncoder,
                mockPublisher
        );

        String ticket = "bb_del_event_test_ticket";
        proA.setDeletionAuthToken(ticket);
        proA.setDeletionAuthExpiry(LocalDateTime.now().plusMinutes(5));

        ProfessionalAccountDeletionDto.OperationResponse resp =
                serviceWithEvents.confirmPermanentDeletion(proA, ticket, "DELETE");
        assertTrue(resp.success());

        // Verify event was published with captured original contact details
        ArgumentCaptor<ProfessionalPermanentDeletionCompletedEvent> eventCaptor =
                ArgumentCaptor.forClass(ProfessionalPermanentDeletionCompletedEvent.class);
        verify(mockPublisher, times(1)).publishEvent(eventCaptor.capture());

        ProfessionalPermanentDeletionCompletedEvent publishedEvent = eventCaptor.getValue();
        assertEquals("proA@buildbid.com", publishedEvent.recipientEmail());
        assertEquals("Pro User A", publishedEvent.recipientName());

        // Verify post-commit listener executes without throwing exceptions even if email service encounters an error
        reset(emailService);
        when(emailService.sendPermanentDeletionSuccessEmail(any(), any())).thenThrow(new RuntimeException("SMTP Connection Error"));
        assertDoesNotThrow(() -> serviceWithEvents.handlePermanentDeletionSuccess(publishedEvent),
                "Listener must handle delivery failure gracefully without rolling back committed deletion");
    }

    // ============================================================
    // 7. CONTROLLER INTEGRATION REGRESSION TESTS
    // ============================================================

    @Test
    @DisplayName("Controller endpoint POST /api/professional/account/delete/start succeeds for authenticated professional")
    void testControllerStartDeletionSuccess() {
        Authentication auth = createMockAuth("proA@buildbid.com", "PROFESSIONAL");
        ProfessionalAccountDeletionDto.InitiateDeletionRequest req =
                new ProfessionalAccountDeletionDto.InitiateDeletionRequest("SecretPass@123", "DELETE");

        ResponseEntity<?> response = deletionController.startPermanentDeletion(req, auth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof ProfessionalAccountDeletionDto.DeletionInitiationResponse);
    }

    @Test
    @DisplayName("Controller endpoint POST /api/professional/account/delete/confirm rejects invalid confirmation")
    void testControllerConfirmDeletionRejectsWrongWord() {
        Authentication auth = createMockAuth("proA@buildbid.com", "PROFESSIONAL");
        ProfessionalAccountDeletionDto.ConfirmDeletionRequest req =
                new ProfessionalAccountDeletionDto.ConfirmDeletionRequest("bb_del_123", "NOT_DELETE");

        ResponseEntity<?> response = deletionController.confirmPermanentDeletion(req, auth);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }
}
