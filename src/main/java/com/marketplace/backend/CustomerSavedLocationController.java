package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

@RestController
@RequestMapping("/api/customer/saved-locations")
public class CustomerSavedLocationController {

    private final CustomerSavedLocationService locationService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public CustomerSavedLocationController(
            CustomerSavedLocationService locationService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.locationService = locationService;
        this.userRepository = userRepository;
    }

    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedCustomer(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        boolean isCustomer = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER") || a.getAuthority().equals("CUSTOMER"));
        if (!isCustomer) {
            return null;
        }

        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email));

        return userOpt.orElse(null);
    }

    @GetMapping
    public ResponseEntity<?> getSavedLocations(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        List<CustomerSavedLocation> locations = locationService.getSavedLocations(user);
        List<CustomerSavedLocationDto.Response> responses = locations.stream()
                .map(CustomerSavedLocationDto.Response::from)
                .toList();

        return ResponseEntity.ok(responses);
    }

    @PostMapping
    public ResponseEntity<?> createSavedLocation(
            @RequestBody CustomerSavedLocationDto.Request request,
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

        try {
            CustomerSavedLocation created = locationService.createSavedLocation(user, request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(CustomerSavedLocationDto.Response.from(created));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSavedLocation(
            @PathVariable("id") Long id,
            @RequestBody CustomerSavedLocationDto.Request request,
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

        try {
            CustomerSavedLocation updated = locationService.updateSavedLocation(user, id, request);
            return ResponseEntity.ok(CustomerSavedLocationDto.Response.from(updated));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Saved location not found."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSavedLocation(
            @PathVariable("id") Long id,
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

        try {
            locationService.deleteSavedLocation(user, id);
            return ResponseEntity.ok(Map.of("message", "Saved location deleted successfully."));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Saved location not found."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<?> setDefaultLocation(
            @PathVariable("id") Long id,
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

        try {
            CustomerSavedLocation updated = locationService.setDefaultLocation(user, id);
            return ResponseEntity.ok(CustomerSavedLocationDto.Response.from(updated));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Saved location not found."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}
