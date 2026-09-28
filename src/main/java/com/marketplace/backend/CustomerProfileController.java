package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customer/profile")
public class CustomerProfileController {

    private final CustomerProfileService profileService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public CustomerProfileController(
            CustomerProfileService profileService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.profileService = profileService;
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
    public ResponseEntity<?> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Customer role required."));
        }

        CustomerProfile profile = profileService.getOrCreateProfile(user);
        return ResponseEntity.ok(mapToResponse(profile, user));
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(
            @RequestBody CustomerProfileRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Customer role required."));
        }

        try {
            CustomerProfile updated = profileService.updateProfile(user, request);
            return ResponseEntity.ok(mapToResponse(updated, user));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/photo")
    public ResponseEntity<?> updatePhoto(
            @RequestBody PhotoUploadRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Customer role required."));
        }

        try {
            CustomerProfile updated = profileService.updatePhoto(user, request.photo());
            return ResponseEntity.ok(mapToResponse(updated, user));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/photo")
    public ResponseEntity<?> removePhoto(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Customer role required."));
        }

        CustomerProfile updated = profileService.removePhoto(user);
        return ResponseEntity.ok(mapToResponse(updated, user));
    }

    private CustomerProfileResponse mapToResponse(CustomerProfile p, MarketplaceBackendApplication.MarketplaceUser u) {
        Set<String> roleStrings = u.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
        return new CustomerProfileResponse(
                p.getId(),
                u.getId(),
                p.getFullName() != null ? p.getFullName() : (u.getName() != null ? u.getName() : u.getUsername()),
                u.getUsername(),
                u.getEmail(),
                p.getPhone() != null ? p.getPhone() : (u.getPhone() != null ? u.getPhone() : ""),
                p.getProfilePhoto(),
                p.getAddress() != null ? p.getAddress() : "",
                p.getCity() != null ? p.getCity() : (u.getLocation() != null ? u.getLocation() : ""),
                p.getState() != null ? p.getState() : "",
                p.getPincode() != null ? p.getPincode() : "",
                p.getAboutMe() != null ? p.getAboutMe() : "",
                p.getPreferredLanguage() != null ? p.getPreferredLanguage() : "English, Hindi",
                u.getCreatedAt(),
                p.getUpdatedAt(),
                roleStrings
        );
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CustomerProfileRequest(
            String fullName,
            String email,
            String phone,
            String address,
            String city,
            String state,
            String pincode,
            String aboutMe,
            String preferredLanguage
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PhotoUploadRequest(
            String photo
    ) {}

    public record CustomerProfileResponse(
            Long id,
            Long userId,
            String fullName,
            String username,
            String email,
            String phone,
            String profilePhoto,
            String address,
            String city,
            String state,
            String pincode,
            String aboutMe,
            String preferredLanguage,
            LocalDateTime memberSince,
            LocalDateTime updatedAt,
            Set<String> roles
    ) {}
}
