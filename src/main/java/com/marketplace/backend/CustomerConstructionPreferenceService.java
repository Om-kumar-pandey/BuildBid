package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class CustomerConstructionPreferenceService {

    private final CustomerConstructionPreferenceRepository preferenceRepository;

    @Autowired
    public CustomerConstructionPreferenceService(CustomerConstructionPreferenceRepository preferenceRepository) {
        this.preferenceRepository = preferenceRepository;
    }

    @Transactional(readOnly = true)
    public CustomerConstructionPreference getPreferences(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            return null;
        }
        return preferenceRepository.findByUser(user)
                .orElse(null);
    }

    @Transactional
    public CustomerConstructionPreference updatePreferences(
            MarketplaceBackendApplication.MarketplaceUser user,
            CustomerConstructionPreferenceDto.Request request
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }

        // Validate and normalize all six categories
        String projectType = validateAndNormalizeProjectType(request != null ? request.preferredProjectType() : null);
        String propertyType = validateAndNormalizePropertyType(request != null ? request.preferredPropertyType() : null);
        Double builtUpArea = validateBuiltUpArea(request != null ? request.preferredBuiltUpArea() : null);
        String floors = validateAndNormalizeFloors(request != null ? request.preferredNumberOfFloors() : null);
        String quality = validateAndNormalizeQuality(request != null ? request.preferredConstructionQuality() : null);
        String budget = validateAndNormalizeBudgetRange(request != null ? request.preferredBudgetRange() : null);

        CustomerConstructionPreference pref = preferenceRepository.findByUser(user)
                .orElseGet(() -> new CustomerConstructionPreference(user));

        pref.setPreferredProjectType(projectType);
        pref.setPreferredPropertyType(propertyType);
        pref.setPreferredBuiltUpArea(builtUpArea);
        pref.setPreferredNumberOfFloors(floors);
        pref.setPreferredConstructionQuality(quality);
        pref.setPreferredBudgetRange(budget);

        return preferenceRepository.save(pref);
    }

    @Transactional
    public CustomerConstructionPreference resetPreferences(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }

        CustomerConstructionPreference pref = preferenceRepository.findByUser(user)
                .orElseGet(() -> new CustomerConstructionPreference(user));

        pref.reset();
        return preferenceRepository.save(pref);
    }

    // ========================================================
    // VALIDATION & NORMALIZATION HELPERS
    // ========================================================

    public static String validateAndNormalizeProjectType(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("new construction")) {
            return "New Construction";
        }
        if (lower.equals("remodeling / renovation") || lower.equals("remodeling/renovation")
                || lower.equals("renovation") || lower.equals("remodeling") || lower.equals("renovation & remodeling")) {
            return "Remodeling / Renovation";
        }
        if (lower.equals("home extension") || lower.equals("extension")) {
            return "Home Extension";
        }
        if (lower.equals("finishing") || lower.equals("interior") || lower.equals("interior & finishing")) {
            return "Finishing";
        }
        if (lower.equals("commercial") || lower.equals("commercial construction")) {
            return "Commercial";
        }
        if (lower.equals("industrial warehouse") || lower.equals("industrial / warehouse")
                || lower.equals("industrial/warehouse") || lower.equals("industrial")) {
            return "Industrial Warehouse";
        }
        if (lower.equals("other")) {
            return "Other";
        }

        throw new IllegalArgumentException("Unsupported preferred project type: " + clean);
    }

    public static String validateAndNormalizePropertyType(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("independent house") || lower.equals("residential house") || lower.equals("house")) {
            return "Independent House";
        }
        if (lower.equals("villa")) {
            return "Villa";
        }
        if (lower.equals("apartment") || lower.equals("flat") || lower.equals("apartment / flat")) {
            return "Apartment";
        }
        if (lower.equals("duplex") || lower.equals("duplex / penthouse") || lower.equals("row house")) {
            return "Duplex";
        }
        if (lower.equals("commercial space") || lower.equals("commercial") || lower.equals("office space") || lower.equals("showroom")) {
            return "Commercial Space";
        }
        if (lower.equals("industrial / warehouse") || lower.equals("industrial/warehouse")
                || lower.equals("industrial") || lower.equals("warehouse") || lower.equals("industrial warehouse")) {
            return "Industrial / Warehouse";
        }
        if (lower.equals("farmhouse")) {
            return "Farmhouse";
        }
        if (lower.equals("other")) {
            return "Other";
        }

        throw new IllegalArgumentException("Unsupported preferred property type: " + clean);
    }

    public static Double validateBuiltUpArea(Double area) {
        if (area == null) {
            return null;
        }
        if (area <= 0) {
            throw new IllegalArgumentException("Preferred built-up area must be greater than zero.");
        }
        if (area > 10_000_000) {
            throw new IllegalArgumentException("Preferred built-up area cannot exceed 10,000,000 sq ft.");
        }
        return Math.round(area * 100.0) / 100.0;
    }

    public static String validateAndNormalizeFloors(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("1") || lower.equals("1 floor") || lower.equals("ground only") || lower.equals("ground floor only") || lower.equals("g")) {
            return "1";
        }
        if (lower.equals("2") || lower.equals("2 floors") || lower.equals("g+1") || lower.equals("g + 1") || lower.equals("g + 1 floor") || lower.equals("g + 1 floors")) {
            return "2";
        }
        if (lower.equals("3") || lower.equals("3 floors") || lower.equals("g+2") || lower.equals("g + 2") || lower.equals("g + 2 floors")) {
            return "3";
        }
        if (lower.equals("4") || lower.equals("4 floors") || lower.equals("g+3") || lower.equals("g + 3") || lower.equals("g + 3 floors")) {
            return "4";
        }
        if (lower.equals("5+") || lower.equals("5") || lower.equals("5 floors") || lower.equals("5+ floors") || lower.equals("g+4") || lower.equals("g + 4") || lower.equals("5 or more")) {
            return "5+";
        }

        throw new IllegalArgumentException("Unsupported preferred number of floors: " + clean);
    }

    public static String validateAndNormalizeQuality(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("basic") || lower.equals("basic quality")) {
            return "Basic";
        }
        if (lower.equals("standard") || lower.equals("standard finish") || lower.equals("standard quality")) {
            return "Standard";
        }
        if (lower.equals("premium") || lower.equals("premium / luxury") || lower.equals("luxury")) {
            return "Premium";
        }

        throw new IllegalArgumentException("Unsupported preferred construction quality: " + clean);
    }

    public static String validateAndNormalizeBudgetRange(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        // Normalize various dash representations
        String norm = clean.replace("–", "-").replace("—", "-").toLowerCase();

        if (norm.equals("under ₹10 lakh") || norm.equals("under 10 lakh") || norm.equals("< ₹10 lakh") || norm.equals("< 10 lakh")) {
            return "Under ₹10 Lakh";
        }
        if (norm.equals("₹10-25 lakh") || norm.equals("₹10 - 25 lakh") || norm.equals("10-25 lakh") || norm.equals("10 to 25 lakh")) {
            return "₹10–25 Lakh";
        }
        if (norm.equals("₹25-50 lakh") || norm.equals("₹25 - 50 lakh") || norm.equals("25-50 lakh") || norm.equals("25 to 50 lakh")) {
            return "₹25–50 Lakh";
        }
        if (norm.equals("₹50 lakh-₹1 crore") || norm.equals("₹50 lakh - ₹1 crore") || norm.equals("50 lakh - 1 crore") || norm.equals("50 lakh to 1 crore") || norm.equals("₹50 lakh–₹1 crore")) {
            return "₹50 Lakh–₹1 Crore";
        }
        if (norm.equals("₹1 crore+") || norm.equals("₹1 crore +") || norm.equals("above ₹1 crore") || norm.equals("> ₹1 crore") || norm.equals("1 crore+") || norm.equals("1 crore +")) {
            return "₹1 Crore+";
        }

        throw new IllegalArgumentException("Unsupported preferred budget range: " + clean);
    }
}
