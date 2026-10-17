package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service managing Personal Information retrieval and updates for authenticated
 * Professional accounts. Ensures validation, sanitization, and persistent storage
 * in the database.
 */
@Service
public class ProfessionalProfileService {

    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public ProfessionalProfileService(MarketplaceBackendApplication.UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * DTO representing professional profile details returned to clients.
     */
    public record ProfessionalProfileDto(
            Long id,
            String name,
            String fullName,
            String username,
            String email,
            String phone,
            String title,
            String location,
            String pincode,
            String bio,
            String profilePhotoUrl,
            boolean emailVerified,
            boolean phoneVerified,
            Set<String> roles,
            LocalDateTime createdAt
    ) {}

    /**
     * Request DTO for updating professional personal information.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProfessionalProfileUpdateRequest(
            String name,
            String fullName,
            String title,
            String location,
            String pincode,
            String bio
    ) {
        public String resolveRawName() {
            if (fullName != null && !fullName.isBlank()) return fullName;
            if (name != null && !name.isBlank()) return name;
            if (fullName != null) return fullName;
            return name;
        }

        public String resolveName() {
            String raw = resolveRawName();
            return (raw != null && !raw.isBlank()) ? raw.trim() : null;
        }
    }

    /**
     * Retrieves authoritative profile details for the given user.
     */
    @Transactional(readOnly = true)
    public ProfessionalProfileDto getProfile(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        return mapToDto(user);
    }

    /**
     * Validates and updates personal information fields for the authenticated user,
     * persisting changes directly to the database.
     */
    @Transactional
    public ProfessionalProfileDto updateProfile(
            MarketplaceBackendApplication.MarketplaceUser user,
            ProfessionalProfileUpdateRequest request
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Update payload cannot be null.");
        }

        // 1. Full name validation
        String rawName = request.resolveRawName();
        if (rawName != null) {
            String trimmedName = rawName.trim();
            if (trimmedName.length() < 2) {
                throw new IllegalArgumentException("Full name must be at least 2 characters.");
            }
            if (trimmedName.length() > 100) {
                throw new IllegalArgumentException("Full name cannot exceed 100 characters.");
            }
            user.setName(trimmedName);
        }

        // 2. Title validation
        if (request.title() != null) {
            String trimmedTitle = request.title().trim();
            if (trimmedTitle.length() > 150) {
                throw new IllegalArgumentException("Professional title cannot exceed 150 characters.");
            }
            user.setTitle(trimmedTitle);
        }

        // 3. Operating City / Location validation
        if (request.location() != null) {
            String trimmedLocation = request.location().trim();
            if (trimmedLocation.length() > 150) {
                throw new IllegalArgumentException("Location cannot exceed 150 characters.");
            }
            user.setLocation(trimmedLocation);
        }

        // 4. Pincode validation
        if (request.pincode() != null) {
            String trimmedPincode = request.pincode().trim();
            if (trimmedPincode.length() > 20) {
                throw new IllegalArgumentException("Base pincode cannot exceed 20 characters.");
            }
            user.setPincode(trimmedPincode);
        }

        // 5. Bio validation
        if (request.bio() != null) {
            String trimmedBio = request.bio().trim();
            if (trimmedBio.length() > 5000) {
                throw new IllegalArgumentException("Professional bio cannot exceed 5000 characters.");
            }
            user.setBio(trimmedBio);
        }

        MarketplaceBackendApplication.MarketplaceUser saved = userRepository.save(user);
        return mapToDto(saved);
    }

    private ProfessionalProfileDto mapToDto(MarketplaceBackendApplication.MarketplaceUser user) {
        String displayName = (user.getName() != null && !user.getName().isBlank())
                ? user.getName().trim()
                : (user.getUsername() != null ? user.getUsername().trim() : "Professional");

        Set<String> roleStrings = user.getRoles() != null
                ? user.getRoles().stream().map(Enum::name).collect(Collectors.toSet())
                : Set.of();

        return new ProfessionalProfileDto(
                user.getId(),
                displayName,
                displayName,
                user.getUsername() != null ? user.getUsername() : "",
                user.getEmail() != null ? user.getEmail() : "",
                user.getPhone() != null ? user.getPhone() : "",
                user.getTitle() != null ? user.getTitle() : "",
                user.getLocation() != null ? user.getLocation() : "",
                user.getPincode() != null ? user.getPincode() : "",
                user.getBio() != null ? user.getBio() : "",
                user.getProfilePhotoUrl() != null ? user.getProfilePhotoUrl() : "",
                user.isEmailVerified(),
                user.isPhoneVerified(),
                roleStrings,
                user.getCreatedAt()
        );
    }
}
