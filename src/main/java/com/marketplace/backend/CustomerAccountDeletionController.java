package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 8
 * Final Secure Implementation: Customer Account Deactivation & Permanent Deletion Controller.
 *
 * Strict IDOR and Role Protection:
 * - Requires authenticated CUSTOMER principal for every operation.
 * - Never accepts caller-supplied userId, customerId, or email in request bodies or parameters.
 * - Never exposes stack traces, passwords, or raw OTP secrets.
 */
@RestController
@RequestMapping("/api/customer/account")
public class CustomerAccountDeletionController {

    private static final Logger log = LoggerFactory.getLogger(CustomerAccountDeletionController.class);

    private final CustomerAccountDeletionService deletionService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public CustomerAccountDeletionController(
            CustomerAccountDeletionService deletionService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.deletionService = deletionService;
        this.userRepository = userRepository;
    }

    /**
     * Strictly resolves the authenticated customer from SecurityContextHolder.
     */
    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedCustomer(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        boolean isCustomer = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER") || a.getAuthority().equals("CUSTOMER"));
        if (!isCustomer) {
            return null;
        }

        String principal = authentication.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .or(() -> userRepository.findByEmailIgnoreCase(principal))
                .orElse(null);
    }

    // ============================================================
    // 1. GET ACCOUNT DELETION & DEACTIVATION STATUS
    // ============================================================
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        try {
            CustomerAccountDeletionDto.AccountDeletionStatusResponse status = deletionService.getStatus(user);
            return ResponseEntity.ok(status);
        } catch (Exception ex) {
            log.error("[Status] Failed to retrieve deletion status: {}", ex.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to retrieve account status."));
        }
    }

    // ============================================================
    // 2. REVERSIBLE ACCOUNT DEACTIVATION
    // ============================================================
    @PostMapping("/deactivate")
    public ResponseEntity<?> deactivateAccount(
            @RequestBody CustomerAccountDeletionDto.DeactivateAccountRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request body cannot be empty."));
        }

        try {
            CustomerAccountDeletionDto.OperationResponse response = deletionService.deactivateAccount(
                    user,
                    request.currentPassword(),
                    request.confirmation()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[Deactivate] Error processing deactivation: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while processing account deactivation. Please try again."));
        }
    }

    // ============================================================
    // 3. START PERMANENT DELETION (GENERATE & DISPATCH SAME OTP)
    // ============================================================
    @PostMapping("/delete/start")
    public ResponseEntity<?> startPermanentDeletion(
            @RequestBody CustomerAccountDeletionDto.InitiateDeletionRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request body cannot be empty."));
        }

        try {
            CustomerAccountDeletionDto.DeletionInitiationResponse response = deletionService.initiatePermanentDeletion(
                    user,
                    request.currentPassword(),
                    request.confirmation()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            // Delivery channel failure or cooldown or missing verification prerequisite
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[Delete Start] Error initiating deletion: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while initiating account deletion. Please try again."));
        }
    }

    // ============================================================
    // 4. RESEND DELETION OTP (SAME CODE TO BOTH CHANNELS)
    // ============================================================
    @PostMapping("/delete/resend-otp")
    public ResponseEntity<?> resendDeletionOtp(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        try {
            CustomerAccountDeletionDto.DeletionInitiationResponse response = deletionService.resendDeletionOtp(user);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[Delete Resend] Error resending deletion code: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to resend verification code. Please try again."));
        }
    }

    // ============================================================
    // 5. VERIFY DELETION OTP
    // ============================================================
    @PostMapping("/delete/verify-otp")
    public ResponseEntity<?> verifyDeletionOtp(
            @RequestBody CustomerAccountDeletionDto.VerifyDeletionOtpRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        if (request == null || request.otp() == null || request.otp().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verification code is required."));
        }

        try {
            CustomerAccountDeletionDto.DeletionOtpVerificationResponse response = deletionService.verifyDeletionOtp(
                    user,
                    request.otp()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[Delete Verify OTP] Error verifying OTP: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to verify code. Please try again."));
        }
    }

    // ============================================================
    // 6. CONFIRM PERMANENT DELETION (ATOMIC TRANSACTION)
    // ============================================================
    @PostMapping("/delete/confirm")
    public ResponseEntity<?> confirmPermanentDeletion(
            @RequestBody CustomerAccountDeletionDto.ConfirmDeletionRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request body cannot be empty."));
        }

        try {
            CustomerAccountDeletionDto.OperationResponse response = deletionService.confirmPermanentDeletion(
                    user,
                    request.deletionTicket(),
                    request.confirmation()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[Delete Confirm] Transaction error during permanent deletion: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to finalize account deletion. Please try again or contact support."));
        }
    }
}
