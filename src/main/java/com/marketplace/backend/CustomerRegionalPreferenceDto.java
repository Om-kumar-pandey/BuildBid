package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

public class CustomerRegionalPreferenceDto {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Request(
            String preferredLanguage,
            String timeZone,
            String currency,
            String areaUnit,
            String dateFormat,
            String numberFormat
    ) {}

    public record Response(
            String preferredLanguage,
            String timeZone,
            String currency,
            String areaUnit,
            String dateFormat,
            String numberFormat,
            LocalDateTime updatedAt
    ) {
        public static final String DEFAULT_LANGUAGE = "English";
        public static final String DEFAULT_TIME_ZONE = "Asia/Kolkata";
        public static final String DEFAULT_CURRENCY = "INR";
        public static final String DEFAULT_AREA_UNIT = "sq ft";
        public static final String DEFAULT_DATE_FORMAT = "DD/MM/YYYY";
        public static final String DEFAULT_NUMBER_FORMAT = "Indian";

        public static Response of(CustomerRegionalPreference pref, String profileLanguage) {
            String lang = (profileLanguage != null && !profileLanguage.isBlank()) ? profileLanguage.trim() : DEFAULT_LANGUAGE;
            if (lang.equalsIgnoreCase("English, Hindi")) {
                lang = "English";
            }
            if (pref == null) {
                return new Response(
                        lang,
                        DEFAULT_TIME_ZONE,
                        DEFAULT_CURRENCY,
                        DEFAULT_AREA_UNIT,
                        DEFAULT_DATE_FORMAT,
                        DEFAULT_NUMBER_FORMAT,
                        null
                );
            }
            return new Response(
                    lang,
                    pref.getTimeZone() != null ? pref.getTimeZone() : DEFAULT_TIME_ZONE,
                    pref.getCurrency() != null ? pref.getCurrency() : DEFAULT_CURRENCY,
                    pref.getAreaUnit() != null ? pref.getAreaUnit() : DEFAULT_AREA_UNIT,
                    pref.getDateFormat() != null ? pref.getDateFormat() : DEFAULT_DATE_FORMAT,
                    pref.getNumberFormat() != null ? pref.getNumberFormat() : DEFAULT_NUMBER_FORMAT,
                    pref.getUpdatedAt()
            );
        }
    }
}
