package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class CustomerProfileService {

    private final CustomerProfileRepository profileRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public CustomerProfileService(
            CustomerProfileRepository profileRepository,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CustomerProfile getOrCreateProfile(MarketplaceBackendApplication.MarketplaceUser user) {
        Optional<CustomerProfile> existing = profileRepository.findByUser(user);
        if (existing.isPresent()) {
            return existing.get();
        }

        CustomerProfile newProfile = new CustomerProfile();
        newProfile.setUser(user);
        newProfile.setFullName(user.getName() != null ? user.getName() : user.getUsername());
        newProfile.setEmail(user.getEmail());
        newProfile.setPhone(user.getPhone());
        newProfile.setProfilePhoto(user.getProfilePhotoUrl());
        
        String location = user.getLocation();
        if (location != null && !location.isBlank()) {
            newProfile.setCity(location);
        }
        newProfile.setPreferredLanguage("English, Hindi");
        newProfile.setAboutMe("");

        return profileRepository.save(newProfile);
    }

    @Transactional
    public CustomerProfile updateProfile(
            MarketplaceBackendApplication.MarketplaceUser user,
            CustomerProfileController.CustomerProfileRequest request
    ) {
        CustomerProfile profile = getOrCreateProfile(user);

        if (request.fullName() != null && !request.fullName().isBlank()) {
            String name = request.fullName().trim();
            profile.setFullName(name);
            user.setName(name);
        }

        if (request.phone() != null) {
            String phone = request.phone().trim();
            profile.setPhone(phone);
            user.setPhone(phone);
        }

        if (request.address() != null) {
            profile.setAddress(request.address().trim());
        }

        if (request.city() != null) {
            String city = request.city().trim();
            profile.setCity(city);
            if (!city.isBlank()) {
                user.setLocation(city);
            }
        }

        if (request.state() != null) {
            profile.setState(request.state().trim());
        }

        if (request.pincode() != null) {
            profile.setPincode(request.pincode().trim());
        }

        if (request.aboutMe() != null) {
            profile.setAboutMe(request.aboutMe().trim());
        }

        if (request.preferredLanguage() != null && !request.preferredLanguage().isBlank()) {
            profile.setPreferredLanguage(request.preferredLanguage().trim());
        }

        userRepository.save(user);
        return profileRepository.save(profile);
    }

    @Transactional
    public CustomerProfile updatePhoto(
            MarketplaceBackendApplication.MarketplaceUser user,
            String photoData
    ) {
        if (photoData == null || photoData.isBlank()) {
            throw new IllegalArgumentException("Photo data cannot be empty.");
        }

        String trimmed = photoData.trim();

        // Enforce maximum payload size (approx 7MB base64 string ~ 5MB raw image)
        if (trimmed.length() > 7 * 1024 * 1024) {
            throw new IllegalArgumentException("Image size exceeds maximum allowed limit (5MB).");
        }

        // Validate payload format: MUST be either an approved base64 data URL or a valid HTTPS URL
        if (trimmed.startsWith("data:")) {
            boolean validMime = trimmed.startsWith("data:image/jpeg;base64,") ||
                                trimmed.startsWith("data:image/jpg;base64,") ||
                                trimmed.startsWith("data:image/png;base64,") ||
                                trimmed.startsWith("data:image/webp;base64,");
            if (!validMime) {
                throw new IllegalArgumentException("Invalid image format. Supported formats are JPG, JPEG, PNG, and WEBP.");
            }
        } else if (trimmed.startsWith("https://")) {
            try {
                java.net.URI uri = java.net.URI.create(trimmed);
                if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getHost().isBlank()) {
                    throw new IllegalArgumentException("Invalid image URL. Must be a valid HTTPS URL.");
                }
            } catch (Exception ex) {
                throw new IllegalArgumentException("Invalid image URL format.");
            }
        } else {
            throw new IllegalArgumentException("Invalid image format. Supported formats are JPG, JPEG, PNG, and WEBP data URLs or valid HTTPS URLs.");
        }

        CustomerProfile profile = getOrCreateProfile(user);
        profile.setProfilePhoto(trimmed);

        if (trimmed.length() <= 500) {
            user.setProfilePhotoUrl(trimmed);
            userRepository.save(user);
        }

        return profileRepository.save(profile);
    }

    @Transactional
    public CustomerProfile removePhoto(MarketplaceBackendApplication.MarketplaceUser user) {
        CustomerProfile profile = getOrCreateProfile(user);
        profile.setProfilePhoto(null);
        user.setProfilePhotoUrl(null);
        userRepository.save(user);
        return profileRepository.save(profile);
    }
}
