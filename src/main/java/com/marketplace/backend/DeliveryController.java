package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * BUILDBID - CANONICAL DELIVERY CONTROLLER (Phase 2)
 *
 * REST endpoints for Delivery domain:
 * - GET /api/deliveries/seller: List deliveries for authenticated seller
 * - GET /api/deliveries/buyer: List deliveries for authenticated buyer
 * - GET /api/deliveries/{id}: Delivery detail
 * - GET /api/deliveries/order/{orderId}: Delivery for specific MaterialOrder
 * - PUT /api/deliveries/{id}/status: Transition delivery status (code-validated on DELIVERED)
 * - PUT /api/deliveries/{id}/details: Update transport details (carrier, driver, ETA)
 * - GET /api/deliveries/{id}/history: Status history
 */
@RestController
@RequestMapping("/api/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public DeliveryController(
            DeliveryService deliveryService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.deliveryService = deliveryService;
        this.userRepository = userRepository;
    }

    /**
     * Seller-scoped deliveries listing.
     */
    @GetMapping("/seller")
    public ResponseEntity<?> getSellerDeliveries(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }
        if (!hasSellerRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only material sellers can access seller deliveries."));
        }

        List<Map<String, Object>> response = deliveryService.getDeliveriesForSeller(user);
        return ResponseEntity.ok(response);
    }

    /**
     * Buyer-scoped deliveries listing (Customer, Contractor, Professional).
     */
    @GetMapping("/buyer")
    public ResponseEntity<?> getBuyerDeliveries(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }
        if (!isAllowedBuyer(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only Customer, Contractor, and Professional accounts can access deliveries."));
        }

        List<Map<String, Object>> response = deliveryService.getDeliveriesForBuyer(user);
        return ResponseEntity.ok(response);
    }

    /**
     * Authorized delivery detail retrieval.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDeliveryById(@PathVariable("id") Long id, Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }

        try {
            Delivery delivery = deliveryService.getDeliveryById(id, user);
            return ResponseEntity.ok(deliveryService.toResponseMap(delivery));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve delivery: " + e.getMessage()));
        }
    }

    /**
     * Authorized delivery retrieval by MaterialOrder ID.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getDeliveryByOrderId(@PathVariable("orderId") Long orderId, Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }

        try {
            Delivery delivery = deliveryService.getDeliveryByOrderId(orderId, user);
            return ResponseEntity.ok(deliveryService.toResponseMap(delivery));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve delivery: " + e.getMessage()));
        }
    }

    /**
     * Authorized delivery status transition.
     * Requires valid verificationCode for DELIVERED status.
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateDeliveryStatus(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }

        String targetStatus = body != null && body.get("status") != null ? body.get("status").toString().trim() : null;
        if (targetStatus == null || targetStatus.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Target delivery status is required."));
        }

        String verificationCode = null;
        if (body != null) {
            if (body.get("verificationCode") != null) {
                verificationCode = body.get("verificationCode").toString().trim();
            } else if (body.get("code") != null) {
                verificationCode = body.get("code").toString().trim();
            }
        }

        String notes = body != null && body.get("notes") != null ? body.get("notes").toString().trim() : null;
        String reason = body != null && body.get("reason") != null ? body.get("reason").toString().trim() : null;

        try {
            Delivery updated = deliveryService.updateDeliveryStatus(id, targetStatus, verificationCode, notes, reason, user);
            return ResponseEntity.ok(deliveryService.toResponseMap(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update delivery status: " + e.getMessage()));
        }
    }

    /**
     * Update transport & carrier details.
     */
    @PutMapping("/{id}/details")
    public ResponseEntity<?> updateDeliveryDetails(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication
    ) {
        MarketplaceBackendApplication.MarketplaceUser user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }
        if (!hasSellerRole(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only material sellers can update delivery details."));
        }

        try {
            Delivery updated = deliveryService.updateDeliveryDetails(id, body != null ? body : Collections.emptyMap(), user);
            return ResponseEntity.ok(deliveryService.toResponseMap(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update delivery details: " + e.getMessage()));
        }
    }

    /**
     * Retrieve status history.
     */
    @GetMapping("/{id}/history")
    public ResponseEntity<?> getDeliveryHistory(@PathVariable("id") Long id, Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }

        try {
            List<Map<String, Object>> history = deliveryService.getDeliveryHistory(id, user);
            return ResponseEntity.ok(history);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve delivery history: " + e.getMessage()));
        }
    }

    private MarketplaceBackendApplication.MarketplaceUser resolveAuthenticatedUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return null;
        }
        String principal = auth.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElse(null);
    }

    private boolean hasSellerRole(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SELLER);
    }

    private boolean isAllowedBuyer(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().contains(MarketplaceBackendApplication.Role.CUSTOMER)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.CONTRACTOR)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER);
    }
}
