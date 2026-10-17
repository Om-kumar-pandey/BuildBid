package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Controller exposing authenticated endpoints for professional profile picture
 * management: upload, retrieval, and removal.
 */
@RestController
@RequestMapping("/api/professional/profile")
public class ProfessionalProfileController {

    private final ProfessionalProfilePhotoService photoService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public ProfessionalProfileController(
            ProfessionalProfilePhotoService photoService,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.photoService = photoService;
        this.userRepository = userRepository;
    }

    /**
     * Resolves the authenticated user from the SecurityContext principal.
     */
    private MarketplaceBackendApplication.MarketplaceUser getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String principal = authentication.getName();
        if (principal == null || principal.isBlank() || "anonymousUser".equalsIgnoreCase(principal)) {
            return null;
        }
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElse(null);
    }

    /**
     * Validates that the user holds the PROFESSIONAL or legacy SERVICE_PROVIDER role.
     */
    private boolean isProfessional(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER);
    }

    /**
     * Upload or update profile picture for the authenticated professional.
     * Supports both standard multipart/form-data file uploads and JSON base64 payloads.
     */
    @PostMapping(value = "/photo", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE, MediaType.ALL_VALUE})
    public ResponseEntity<?> uploadPhoto(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestBody(required = false) Map<String, String> jsonBody,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found or unauthenticated."));
        }

        if (!isProfessional(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can perform this action."));
        }

        byte[] imageBytes = null;
        String fileName = null;

        // 1. Process Multipart file
        if (file != null && !file.isEmpty()) {
            try {
                imageBytes = file.getBytes();
                fileName = file.getOriginalFilename();
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Failed to read uploaded file: " + e.getMessage()));
            }
        }
        // 2. Fallback to JSON Base64 data URL
        else if (jsonBody != null && jsonBody.containsKey("photo")) {
            String raw = jsonBody.get("photo");
            if (raw == null || raw.isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Photo payload cannot be empty."));
            }
            String trimmed = raw.trim();
            try {
                if (trimmed.startsWith("data:")) {
                    int commaIdx = trimmed.indexOf(",");
                    if (commaIdx != -1) {
                        trimmed = trimmed.substring(commaIdx + 1);
                    }
                }
                imageBytes = Base64.getDecoder().decode(trimmed);
                fileName = "profile-photo";
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid base64 image encoding."));
            }
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "No image file or photo payload provided."));
        }

        try {
            ProfessionalProfilePhoto saved = photoService.uploadOrUpdatePhoto(user, imageBytes, fileName);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "Profile picture updated successfully.");
            response.put("photoUrl", "/api/professional/profile/photo");
            response.put("contentType", saved.getContentType());
            response.put("fileSize", saved.getFileSize());
            response.put("width", saved.getWidth());
            response.put("height", saved.getHeight());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while saving profile photo."));
        }
    }

    /**
     * Retrieve the authenticated professional's profile picture.
     * Returns HTTP 404 if no picture has been uploaded.
     */
    @GetMapping("/photo")
    public ResponseEntity<?> getPhoto(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found or unauthenticated."));
        }

        if (!isProfessional(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can view this picture."));
        }

        Optional<ProfessionalProfilePhoto> photoOpt = photoService.getPhotoByUser(user);
        if (photoOpt.isEmpty() || photoOpt.get().getPhotoData() == null || photoOpt.get().getPhotoData().length == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "No profile picture found."));
        }

        ProfessionalProfilePhoto photo = photoOpt.get();
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(photo.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        String etag = "\"" + photo.getId() + "-" + (photo.getUpdatedAt() != null ? photo.getUpdatedAt().hashCode() : 0) + "\"";

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(photo.getFileSize())
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate().mustRevalidate())
                .eTag(etag)
                .body(photo.getPhotoData());
    }

    /**
     * Remove the authenticated professional's profile picture.
     */
    @DeleteMapping("/photo")
    public ResponseEntity<?> removePhoto(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a professional."));
        }

        MarketplaceBackendApplication.MarketplaceUser user = getAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found or unauthenticated."));
        }

        if (!isProfessional(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied. Only registered professionals can perform this action."));
        }

        boolean removed = photoService.deletePhoto(user);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", removed ? "Profile picture removed successfully." : "No profile picture was set.");

        return ResponseEntity.ok(response);
    }
}
