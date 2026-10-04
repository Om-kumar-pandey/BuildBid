package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customer/preferences/regional")
public class CustomerRegionalPreferenceController {

    private final CustomerRegionalPreferenceService preferenceService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public CustomerRegionalPreferenceController(
            CustomerRegionalPreferenceService preferenceService,
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

        CustomerRegionalPreferenceDto.Response response = preferenceService.getPreferences(user);
        return ResponseEntity.ok(response);
    }

    @PutMapping
    public ResponseEntity<?> updatePreferences(
            @RequestBody CustomerRegionalPreferenceDto.Request request,
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
            CustomerRegionalPreferenceDto.Response response = preferenceService.updatePreferences(user, request);
            return ResponseEntity.ok(response);
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

        CustomerRegionalPreferenceDto.Response response = preferenceService.resetPreferences(user);
        return ResponseEntity.ok(Map.of(
                "message", "Language and regional preferences reset successfully.",
                "preferences", response
        ));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPreferencesPost(Authentication authentication) {
        return resetPreferences(authentication);
    }
}
