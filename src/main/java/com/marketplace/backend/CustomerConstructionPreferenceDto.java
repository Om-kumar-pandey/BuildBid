package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

public class CustomerConstructionPreferenceDto {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Request(
            String preferredProjectType,
            String preferredPropertyType,
            Double preferredBuiltUpArea,
            String preferredNumberOfFloors,
            String preferredConstructionQuality,
            String preferredBudgetRange
    ) {}

    public record Response(
            String preferredProjectType,
            String preferredPropertyType,
            Double preferredBuiltUpArea,
            String preferredNumberOfFloors,
            String preferredConstructionQuality,
            String preferredBudgetRange,
            String areaUnit,
            LocalDateTime updatedAt
    ) {
        public static Response from(CustomerConstructionPreference pref) {
            if (pref == null) {
                return new Response(null, null, null, null, null, null, "sq ft", null);
            }
            return new Response(
                    pref.getPreferredProjectType(),
                    pref.getPreferredPropertyType(),
                    pref.getPreferredBuiltUpArea(),
                    pref.getPreferredNumberOfFloors(),
                    pref.getPreferredConstructionQuality(),
                    pref.getPreferredBudgetRange(),
                    "sq ft",
                    pref.getUpdatedAt()
            );
        }
    }
}
