package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customer/preferences/construction")
public class CustomerConstructionPreferenceController {

    private final CustomerConstructionPreferenceService preferenceService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public CustomerConstructionPreferenceController(
            CustomerConstructionPreferenceService preferenceService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.preferenceService = preferenceService;
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
    public ResponseEntity<?> getPreferences(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        CustomerConstructionPreference pref = preferenceService.getPreferences(user);
        return ResponseEntity.ok(CustomerConstructionPreferenceDto.Response.from(pref));
    }

    @PutMapping
    public ResponseEntity<?> updatePreferences(
            @RequestBody CustomerConstructionPreferenceDto.Request request,
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
            CustomerConstructionPreference updated = preferenceService.updatePreferences(user, request);
            return ResponseEntity.ok(CustomerConstructionPreferenceDto.Response.from(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> resetPreferences(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        CustomerConstructionPreference cleared = preferenceService.resetPreferences(user);
        return ResponseEntity.ok(Map.of(
                "message", "Construction preferences reset successfully.",
                "preferences", CustomerConstructionPreferenceDto.Response.from(cleared)
        ));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPreferencesPost(Authentication authentication) {
        return resetPreferences(authentication);
    }
}
