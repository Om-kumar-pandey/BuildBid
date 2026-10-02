package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * BUILDBID - MATERIAL ORDER CONTROLLER (Phase 4A)
 * 
 * Minimal authenticated REST endpoints for Material Orders:
 * - GET /api/material-orders/buyer: Orders belonging to authenticated buyer
 * - GET /api/material-orders/seller: Orders belonging to authenticated seller
 * - GET /api/material-orders/{id}: Order details accessible ONLY by buyer or seller
 */
@RestController
@RequestMapping("/api/material-orders")
public class MaterialOrderController {

    private final MaterialOrderService materialOrderService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public MaterialOrderController(
            MaterialOrderService materialOrderService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.materialOrderService = materialOrderService;
        this.userRepository = userRepository;
    }

    /**
     * Returns orders belonging ONLY to the authenticated buyer.
     */
    @GetMapping("/buyer")
    public ResponseEntity<?> getBuyerOrders(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to view orders."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = resolveUser(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        List<MaterialOrder> orders = materialOrderService.getOrdersForBuyer(user);
        List<Map<String, Object>> response = orders.stream()
                .map(materialOrderService::toResponseMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Returns orders belonging ONLY to the authenticated seller.
     */
    @GetMapping("/seller")
    public ResponseEntity<?> getSellerOrders(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to view orders."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = resolveUser(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        List<MaterialOrder> orders = materialOrderService.getOrdersForSeller(user);
        List<Map<String, Object>> response = orders.stream()
                .map(materialOrderService::toResponseMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Returns a single order if the authenticated caller is the buyer or the seller.
     * Rejects all other callers with 403 FORBIDDEN.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable("id") Long id, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to view order."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = resolveUser(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        try {
            MaterialOrder order = materialOrderService.getOrderById(id, user);
            return ResponseEntity.ok(materialOrderService.toResponseMap(order));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while retrieving order: " + e.getMessage()));
        }
    }

    /**
     * Unified status transition endpoint (Phase 4E).
     * PUT /api/material-orders/{id}/status
     * Body: { "status": "PROCESSING" }
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication authentication
    ) {
        String targetStatus = body != null && body.get("status") != null ? body.get("status").toString() : null;
        return handleStatusTransition(id, targetStatus, authentication);
    }

    @PutMapping("/{id}/process")
    public ResponseEntity<?> processOrder(@PathVariable("id") Long id, Authentication authentication) {
        return handleStatusTransition(id, "PROCESSING", authentication);
    }

    @PutMapping("/{id}/dispatch")
    public ResponseEntity<?> dispatchOrder(@PathVariable("id") Long id, Authentication authentication) {
        return handleStatusTransition(id, "DISPATCHED", authentication);
    }

    @PutMapping("/{id}/out-for-delivery")
    public ResponseEntity<?> outForDeliveryOrder(@PathVariable("id") Long id, Authentication authentication) {
        return handleStatusTransition(id, "OUT_FOR_DELIVERY", authentication);
    }

    @PutMapping("/{id}/delivered")
    public ResponseEntity<?> deliverOrder(@PathVariable("id") Long id, Authentication authentication) {
        return handleStatusTransition(id, "DELIVERED", authentication);
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeOrder(@PathVariable("id") Long id, Authentication authentication) {
        return handleStatusTransition(id, "COMPLETED", authentication);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable("id") Long id, Authentication authentication) {
        return handleStatusTransition(id, "CANCELLED", authentication);
    }

    private ResponseEntity<?> handleStatusTransition(Long id, String targetStatus, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to update order status."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = resolveUser(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        if (targetStatus == null || targetStatus.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Target status is required."));
        }

        try {
            MaterialOrder updated = materialOrderService.updateOrderStatus(id, targetStatus, user);
            return ResponseEntity.ok(materialOrderService.toResponseMap(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while updating order status: " + e.getMessage()));
        }
    }

    private MarketplaceBackendApplication.MarketplaceUser resolveUser(String principal) {
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElse(null);
    }
}
