package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

public class CustomerSavedLocationDto {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Request(
            String label,
            String addressLine1,
            String addressLine2,
            String city,
            String state,
            String pincode,
            String landmark,
            Boolean isDefault
    ) {}

    public record Response(
            Long id,
            String label,
            String addressLine1,
            String addressLine2,
            String city,
            String state,
            String pincode,
            String landmark,
            boolean isDefault,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static Response from(CustomerSavedLocation loc) {
            if (loc == null) {
                return null;
            }
            return new Response(
                    loc.getId(),
                    loc.getLabel(),
                    loc.getAddressLine1(),
                    loc.getAddressLine2(),
                    loc.getCity(),
                    loc.getState(),
                    loc.getPincode(),
                    loc.getLandmark(),
                    loc.isDefault(),
                    loc.getCreatedAt(),
                    loc.getUpdatedAt()
            );
        }
    }
}
