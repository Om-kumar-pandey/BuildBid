package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class CustomerSavedLocationService {

    private final CustomerSavedLocationRepository locationRepository;

    @Autowired
    public CustomerSavedLocationService(CustomerSavedLocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    @Transactional(readOnly = true)
    public List<CustomerSavedLocation> getSavedLocations(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        return locationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user);
    }

    @Transactional(readOnly = true)
    public CustomerSavedLocation getSavedLocation(MarketplaceBackendApplication.MarketplaceUser user, Long locationId) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        if (locationId == null) {
            throw new IllegalArgumentException("Location ID cannot be null.");
        }
        return locationRepository.findByIdAndUser(locationId, user)
                .orElseThrow(() -> new NoSuchElementException("Saved location not found."));
    }

    @Transactional
    public CustomerSavedLocation createSavedLocation(
            MarketplaceBackendApplication.MarketplaceUser user,
            CustomerSavedLocationDto.Request request
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Request body cannot be null.");
        }

        String label = validateRequired(request.label(), "Location label", 100);
        String addressLine1 = validateRequired(request.addressLine1(), "Address line 1", 255);
        String addressLine2 = validateOptional(request.addressLine2(), 255);
        String city = validateRequired(request.city(), "City", 100);
        String state = validateRequired(request.state(), "State", 100);
        String pincode = validatePincode(request.pincode());
        String landmark = validateOptional(request.landmark(), 255);

        long existingCount = locationRepository.countByUser(user);
        boolean shouldBeDefault;

        if (existingCount == 0) {
            // First saved location automatically becomes default
            shouldBeDefault = true;
        } else if (Boolean.TRUE.equals(request.isDefault())) {
            shouldBeDefault = true;
            clearUserDefault(user);
        } else {
            shouldBeDefault = false;
        }

        CustomerSavedLocation location = new CustomerSavedLocation(
                user,
                label,
                addressLine1,
                addressLine2,
                city,
                state,
                pincode,
                landmark,
                shouldBeDefault
        );

        return locationRepository.save(location);
    }

    @Transactional
    public CustomerSavedLocation updateSavedLocation(
            MarketplaceBackendApplication.MarketplaceUser user,
            Long locationId,
            CustomerSavedLocationDto.Request request
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        if (locationId == null) {
            throw new IllegalArgumentException("Location ID cannot be null.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Request body cannot be null.");
        }

        CustomerSavedLocation location = locationRepository.findByIdAndUser(locationId, user)
                .orElseThrow(() -> new NoSuchElementException("Saved location not found."));

        String label = validateRequired(request.label(), "Location label", 100);
        String addressLine1 = validateRequired(request.addressLine1(), "Address line 1", 255);
        String addressLine2 = validateOptional(request.addressLine2(), 255);
        String city = validateRequired(request.city(), "City", 100);
        String state = validateRequired(request.state(), "State", 100);
        String pincode = validatePincode(request.pincode());
        String landmark = validateOptional(request.landmark(), 255);

        location.setLabel(label);
        location.setAddressLine1(addressLine1);
        location.setAddressLine2(addressLine2);
        location.setCity(city);
        location.setState(state);
        location.setPincode(pincode);
        location.setLandmark(landmark);

        if (Boolean.TRUE.equals(request.isDefault()) && !location.isDefault()) {
            clearUserDefault(user);
            location.setDefault(true);
        }

        return locationRepository.save(location);
    }

    @Transactional
    public void deleteSavedLocation(MarketplaceBackendApplication.MarketplaceUser user, Long locationId) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        if (locationId == null) {
            throw new IllegalArgumentException("Location ID cannot be null.");
        }

        CustomerSavedLocation location = locationRepository.findByIdAndUser(locationId, user)
                .orElseThrow(() -> new NoSuchElementException("Saved location not found."));

        boolean wasDefault = location.isDefault();
        locationRepository.delete(location);
        locationRepository.flush();

        if (wasDefault) {
            List<CustomerSavedLocation> remaining = locationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user);
            if (!remaining.isEmpty()) {
                CustomerSavedLocation promote = remaining.get(0);
                promote.setDefault(true);
                locationRepository.save(promote);
            }
        }
    }

    @Transactional
    public CustomerSavedLocation setDefaultLocation(MarketplaceBackendApplication.MarketplaceUser user, Long locationId) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }
        if (locationId == null) {
            throw new IllegalArgumentException("Location ID cannot be null.");
        }

        CustomerSavedLocation target = locationRepository.findByIdAndUser(locationId, user)
                .orElseThrow(() -> new NoSuchElementException("Saved location not found."));

        if (target.isDefault()) {
            return target;
        }

        clearUserDefault(user);
        target.setDefault(true);
        return locationRepository.save(target);
    }

    private void clearUserDefault(MarketplaceBackendApplication.MarketplaceUser user) {
        locationRepository.findByUserAndIsDefaultTrue(user).ifPresent(currentDefault -> {
            currentDefault.setDefault(false);
            locationRepository.save(currentDefault);
        });
    }

    // ========================================================
    // VALIDATION HELPERS
    // ========================================================

    public static String validateRequired(String value, String fieldName, int maxLength) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        String clean = value.trim();
        if (clean.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " cannot exceed " + maxLength + " characters.");
        }
        return clean;
    }

    public static String validateOptional(String value, int maxLength) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String clean = value.trim();
        if (clean.length() > maxLength) {
            throw new IllegalArgumentException("Field cannot exceed " + maxLength + " characters.");
        }
        return clean;
    }

    public static String validatePincode(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException("PIN code is required.");
        }
        String clean = raw.trim();
        if (!clean.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("PIN code must be exactly 6 numeric digits.");
        }
        return clean;
    }
}
