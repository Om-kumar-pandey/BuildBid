package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * BUILDBID — HIRED PROFESSIONAL CONTROLLER
 * 
 * Exposes accepted hired professionals for CUSTOMER, CONTRACTOR, and MATERIAL_SELLER.
 * Authorization is strictly bound to the authenticated user from Spring Security principal.
 */
@RestController
@RequestMapping("/api/hired-professionals")
public class HiredProfessionalController {

    private final HiredProfessionalService hiredProfessionalService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public HiredProfessionalController(
            HiredProfessionalService hiredProfessionalService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.hiredProfessionalService = hiredProfessionalService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/hired-professionals
     * Returns accepted hired professionals for the authenticated requester.
     */
    @GetMapping
    public ResponseEntity<?> getHiredProfessionals(Authentication authentication) {
        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in to view hired professionals."));
        }

        Set<MarketplaceBackendApplication.Role> roles = user.getRoles();
        boolean isAllowedRequester = roles != null && (
                roles.contains(MarketplaceBackendApplication.Role.CUSTOMER) ||
                roles.contains(MarketplaceBackendApplication.Role.CONTRACTOR) ||
                roles.contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER) ||
                roles.contains(MarketplaceBackendApplication.Role.SELLER)
        );

        if (!isAllowedRequester) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only Customers, Contractors, and Material Sellers can view hired professionals."));
        }

        List<HiredProfessionalDto> list = hiredProfessionalService.getHiredProfessionalsForUser(user);
        return ResponseEntity.ok(list);
    }

    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        String principal = authentication.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElse(null);
    }
}
