package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class CustomerRegionalPreferenceService {

    private final CustomerRegionalPreferenceRepository preferenceRepository;
    private final CustomerProfileRepository profileRepository;
    private final CustomerProfileService profileService;

    @Autowired
    public CustomerRegionalPreferenceService(
            CustomerRegionalPreferenceRepository preferenceRepository,
            CustomerProfileRepository profileRepository,
            CustomerProfileService profileService
    ) {
        this.preferenceRepository = preferenceRepository;
        this.profileRepository = profileRepository;
        this.profileService = profileService;
    }

    @Transactional(readOnly = true)
    public CustomerRegionalPreferenceDto.Response getPreferences(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            return null;
        }

        CustomerRegionalPreference pref = preferenceRepository.findByUser(user).orElse(null);
        String profileLang = profileRepository.findByUser(user)
                .map(CustomerProfile::getPreferredLanguage)
                .orElse(CustomerRegionalPreferenceDto.Response.DEFAULT_LANGUAGE);

        return CustomerRegionalPreferenceDto.Response.of(pref, profileLang);
    }

    @Transactional
    public CustomerRegionalPreferenceDto.Response updatePreferences(
            MarketplaceBackendApplication.MarketplaceUser user,
            CustomerRegionalPreferenceDto.Request request
    ) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }

        if (request == null) {
            return getPreferences(user);
        }

        // Validate and normalize all fields (authoritative backend validation)
        String validatedLang = validateAndNormalizeLanguage(request.preferredLanguage());
        String validatedTimeZone = validateAndNormalizeTimeZone(request.timeZone());
        String validatedCurrency = validateAndNormalizeCurrency(request.currency());
        String validatedAreaUnit = validateAndNormalizeAreaUnit(request.areaUnit());
        String validatedDateFormat = validateAndNormalizeDateFormat(request.dateFormat());
        String validatedNumberFormat = validateAndNormalizeNumberFormat(request.numberFormat());

        // 1. Authoritative Preferred Language persistence in CustomerProfile (avoids duplicate data sources)
        CustomerProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> profileService.getOrCreateProfile(user));

        if (validatedLang != null) {
            profile.setPreferredLanguage(validatedLang);
            profile = profileRepository.save(profile);
        }

        // 2. Dedicated Regional Preferences persistence
        CustomerRegionalPreference pref = preferenceRepository.findByUser(user)
                .orElseGet(() -> new CustomerRegionalPreference(user));

        if (validatedTimeZone != null) {
            pref.setTimeZone(validatedTimeZone);
        }
        if (validatedCurrency != null) {
            pref.setCurrency(validatedCurrency);
        }
        if (validatedAreaUnit != null) {
            pref.setAreaUnit(validatedAreaUnit);
        }
        if (validatedDateFormat != null) {
            pref.setDateFormat(validatedDateFormat);
        }
        if (validatedNumberFormat != null) {
            pref.setNumberFormat(validatedNumberFormat);
        }

        pref = preferenceRepository.save(pref);

        return CustomerRegionalPreferenceDto.Response.of(pref, profile.getPreferredLanguage());
    }

    @Transactional
    public CustomerRegionalPreferenceDto.Response resetPreferences(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }

        CustomerRegionalPreference pref = preferenceRepository.findByUser(user)
                .orElseGet(() -> new CustomerRegionalPreference(user));
        pref.reset();
        pref = preferenceRepository.save(pref);

        // Reset Preferred Language on CustomerProfile to default without altering other profile fields
        CustomerProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> profileService.getOrCreateProfile(user));
        profile.setPreferredLanguage(CustomerRegionalPreferenceDto.Response.DEFAULT_LANGUAGE);
        profile = profileRepository.save(profile);

        return CustomerRegionalPreferenceDto.Response.of(pref, CustomerRegionalPreferenceDto.Response.DEFAULT_LANGUAGE);
    }

    // ========================================================
    // AUTHORITATIVE VALIDATION & NORMALIZATION HELPERS
    // ========================================================

    public static String validateAndNormalizeLanguage(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("english")) {
            return "English";
        }
        if (lower.equals("hindi")) {
            return "Hindi";
        }
        if (lower.equals("english, hindi") || lower.equals("hindi, english")) {
            return "English";
        }

        throw new IllegalArgumentException("Unsupported preferred language: " + clean);
    }

    public static String validateAndNormalizeTimeZone(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("asia/kolkata") || lower.equals("ist") || lower.contains("kolkata")
                || lower.contains("india standard time") || lower.equals("utc+05:30") || lower.equals("+05:30")) {
            return "Asia/Kolkata";
        }

        throw new IllegalArgumentException("Unsupported time zone: " + clean);
    }

    public static String validateAndNormalizeCurrency(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("inr") || lower.equals("₹") || lower.equals("inr (₹)")
                || lower.equals("indian rupee") || lower.equals("indian rupee (inr)")
                || lower.equals("indian rupee (₹ / inr)") || lower.equals("rs") || lower.equals("rs.")) {
            return "INR";
        }

        throw new IllegalArgumentException("Unsupported currency: " + clean);
    }

    public static String validateAndNormalizeAreaUnit(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("sq ft") || lower.equals("sqft") || lower.equals("square feet")
                || lower.equals("sq. ft.") || lower.equals("sq.ft.") || lower.equals("square foot")) {
            return "sq ft";
        }

        throw new IllegalArgumentException("Unsupported area unit: " + clean);
    }

    public static String validateAndNormalizeDateFormat(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("dd/mm/yyyy") || lower.equals("dd-mm-yyyy")) {
            return "DD/MM/YYYY";
        }

        throw new IllegalArgumentException("Unsupported date format: " + clean);
    }

    public static String validateAndNormalizeNumberFormat(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim();
        String lower = clean.toLowerCase();

        if (lower.equals("indian") || lower.equals("indian number format")
                || lower.equals("en-in") || lower.contains("1,00,000") || lower.equals("lakhs")) {
            return "Indian";
        }

        throw new IllegalArgumentException("Unsupported number format: " + clean);
    }
}
