package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 7
 * Customer Data Download Controller
 *
 * Dedicated REST endpoint for authenticated customers to download their account data in JSON format.
 *
 * STRICT SECURITY CONSTRAINTS:
 * 1. Requires valid authentication (401 Unauthorized if unauthenticated).
 * 2. Requires CUSTOMER role (403 Forbidden for CONTRACTOR, PROFESSIONAL, MATERIAL_SELLER, etc.).
 * 3. IDOR-proof: resolves customer exclusively from SecurityContextHolder principal.
 * 4. Accepts NO userId, customerId, or other ownership parameter from the request.
 * 5. Returns downloadable JSON file with safe filename (buildbid-my-data-YYYY-MM-DD.json).
 * 6. Never logs sensitive exported content.
 * 7. Never mutates customer data.
 */
@RestController
@RequestMapping({"/api/customer/account/download-data", "/api/customer/download-data"})
public class CustomerDataDownloadController {

    private final CustomerDataDownloadService downloadService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public CustomerDataDownloadController(
            CustomerDataDownloadService downloadService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.downloadService = downloadService;
        this.userRepository = userRepository;
    }

    /**
     * Resolves the authenticated customer strictly from Authentication principal.
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
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .or(() -> userRepository.findByEmailIgnoreCase(principal));

        return userOpt.orElse(null);
    }

    /**
     * GET /api/customer/account/download-data
     * Downloads authoritative customer account data as a JSON file attachment.
     */
    @GetMapping
    public ResponseEntity<?> downloadMyData(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login first."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedCustomer(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Customer role required."));
        }

        CustomerDataExportDto exportDto = downloadService.generateCustomerDataExport(user);

        // Safe filename format: buildbid-my-data-YYYY-MM-DD.json (No email, phone, user id, or DB id)
        String dateStr = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String filename = "buildbid-my-data-" + dateStr + ".json";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
        headers.add(HttpHeaders.PRAGMA, "no-cache");
        headers.add(HttpHeaders.EXPIRES, "0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(exportDto);
    }
}
