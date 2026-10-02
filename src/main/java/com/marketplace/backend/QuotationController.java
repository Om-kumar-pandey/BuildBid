package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * BUILDBID - QUOTATION CONTROLLER
 * 
 * REST API for Phase 1 Quotation Foundation:
 * 1. POST /api/quotations - Provider submits quotation
 * 2. GET /api/customer/requests/{requestType}/{requestId}/quotations - Customer views quotations for own request
 * 3. GET /api/customer/requests/{requestId}/quotations - Customer views quotations (request ID resolution)
 * 4. GET /api/quotations/{id} - View quotation by ID (caller must be provider or request owner)
 * 5. GET /api/provider/quotations - Provider views submitted quotations
 */
@RestController
public class QuotationController {

    private final QuotationService quotationService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public QuotationController(
            QuotationService quotationService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.quotationService = quotationService;
        this.userRepository = userRepository;
    }

    /**
     * Provider submits a quotation for MATERIAL_REQUIREMENT or DIRECT_HIRE.
     * Provider identity is strictly derived from JWT (never frontend payload).
     */
    @PostMapping("/api/quotations")
    public ResponseEntity<?> submitQuotation(
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to submit a quotation."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        MarketplaceBackendApplication.MarketplaceUser provider = userOpt.get();

        try {
            Quotation created = quotationService.submitQuotation(payload, provider);
            Map<String, Object> response = quotationService.toResponseMap(created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            // Distinguish duplicate submission conflicts from lifecycle validation
            if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while submitting quotation: " + e.getMessage()));
        }
    }

    /**
     * Customer retrieves quotations for their own request.
     * Accessible ONLY by authenticated customer who owns the request.
     */
    @GetMapping("/api/customer/requests/{requestType}/{requestId}/quotations")
    public ResponseEntity<?> getCustomerRequestQuotations(
            @PathVariable("requestType") String requestType,
            @PathVariable("requestId") String requestId,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to view quotations."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Customer account not found."));
        }

        MarketplaceBackendApplication.MarketplaceUser customer = userOpt.get();

        try {
            List<Map<String, Object>> quotations =
                    quotationService.getQuotationsForCustomerRequest(requestType, requestId, customer);
            return ResponseEntity.ok(quotations);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve quotations: " + e.getMessage()));
        }
    }

    /**
     * Customer retrieves quotations by requestId alone.
     */
    @GetMapping("/api/customer/requests/{requestId}/quotations")
    public ResponseEntity<?> getCustomerRequestQuotationsById(
            @PathVariable("requestId") String requestId,
            Authentication authentication
    ) {
        return getCustomerRequestQuotations("AUTO", requestId, authentication);
    }

    /**
     * Get a specific quotation by ID or quotation code.
     * Authorized only for the provider who submitted it or the customer who owns the request.
     */
    @GetMapping("/api/quotations/{id}")
    public ResponseEntity<?> getQuotationById(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User not found."));
        }

        try {
            Map<String, Object> quotation = quotationService.getQuotationById(id, userOpt.get());
            return ResponseEntity.ok(quotation);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Provider retrieves their own submitted quotations.
     */
    @GetMapping({"/api/provider/quotations", "/api/quotations/my"})
    public ResponseEntity<?> getMySubmittedQuotations(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Provider account not found."));
        }

        List<Map<String, Object>> quotations = quotationService.getQuotationsByProvider(userOpt.get());
        return ResponseEntity.ok(quotations);
    }

    /**
     * Customer accepts a quotation.
     * PUT /api/quotations/{id}/accept
     * Customer authentication required. Caller must be the request owner.
     */
    @RequestMapping(value = "/api/quotations/{id}/accept", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<?> acceptQuotation(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to accept a quotation."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        try {
            Map<String, Object> response = quotationService.acceptQuotation(id, userOpt.get());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while accepting quotation: " + e.getMessage()));
        }
    }

    /**
     * Customer rejects a quotation.
     * PUT /api/quotations/{id}/reject
     * Customer authentication required. Caller must be the request owner.
     */
    @RequestMapping(value = "/api/quotations/{id}/reject", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<?> rejectQuotation(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to reject a quotation."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        try {
            Map<String, Object> response = quotationService.rejectQuotation(id, userOpt.get());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while rejecting quotation: " + e.getMessage()));
        }
    }
}
