package com.marketplace.backend;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for geographical location normalization, pincode resolution,
 * city/district alias mapping, and Haversine distance calculations for Direct Hire.
 */
@Service
public class GeoLocationService {

    private static final Pattern PINCODE_PATTERN = Pattern.compile("\\b([1-9][0-9]{5})\\b");

    /**
     * Immutable metadata describing a resolved geographic location.
     */
    public record GeoLocation(
            String query,
            String city,
            String district,
            String state,
            String pincode,
            Double latitude,
            Double longitude
    ) {
        public boolean hasCoordinates() {
            return latitude != null && longitude != null;
        }
    }

    // Static registry of normalized city / district / pincode knowledge
    private static final Map<String, GeoLocation> KNOWN_LOCATIONS = new LinkedHashMap<>();
    private static final Map<String, GeoLocation> PINCODE_MAP = new LinkedHashMap<>();
    private static final Set<String> KNOWN_STATES = new LinkedHashSet<>();

    static {
        // Gautam Buddha Nagar (Greater Noida, Noida, etc.)
        registerLocation(new GeoLocation("greater noida", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", "201310", 28.4744, 77.5040));
        registerLocation(new GeoLocation("gautam buddha nagar", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", "201310", 28.4744, 77.5040));
        registerLocation(new GeoLocation("gautam budh nagar", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", "201310", 28.4744, 77.5040));
        registerLocation(new GeoLocation("gb nagar", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", "201310", 28.4744, 77.5040));
        registerLocation(new GeoLocation("noida", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", "201301", 28.5355, 77.3910));
        registerLocation(new GeoLocation("dadri", "Dadri", "Gautam Buddha Nagar", "Uttar Pradesh", "203207", 28.5534, 77.5539));
        registerLocation(new GeoLocation("jewar", "Jewar", "Gautam Buddha Nagar", "Uttar Pradesh", "203135", 28.1276, 77.5562));

        // Pincodes for Gautam Buddha Nagar / Noida / Greater Noida
        registerPincode("201301", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.5800, 77.3110);
        registerPincode("201302", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.5670, 77.3320);
        registerPincode("201303", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.5900, 77.3550);
        registerPincode("201304", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.5610, 77.3500);
        registerPincode("201305", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.5720, 77.3680);
        registerPincode("201306", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4800, 77.5100);
        registerPincode("201307", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.6180, 77.3750);
        registerPincode("201308", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4900, 77.4900);
        registerPincode("201309", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.5300, 77.4500);
        registerPincode("201310", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4744, 77.5040);
        registerPincode("201312", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4600, 77.4800);
        registerPincode("201313", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4700, 77.5200);
        registerPincode("201314", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4650, 77.5100);
        registerPincode("201315", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4720, 77.5080);
        registerPincode("201318", "Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4950, 77.4850);

        // Delhi-NCR and Neighboring Areas
        registerLocation(new GeoLocation("delhi", "Delhi", "New Delhi", "Delhi", "110001", 28.6139, 77.2090));
        registerLocation(new GeoLocation("new delhi", "New Delhi", "New Delhi", "Delhi", "110001", 28.6139, 77.2090));
        registerPincode("110001", "New Delhi", "New Delhi", "Delhi", 28.6315, 77.2167);

        registerLocation(new GeoLocation("gurugram", "Gurugram", "Gurugram", "Haryana", "122001", 28.4595, 77.0266));
        registerLocation(new GeoLocation("gurgaon", "Gurugram", "Gurugram", "Haryana", "122001", 28.4595, 77.0266));
        registerPincode("122001", "Gurugram", "Gurugram", "Haryana", 28.4595, 77.0266);

        registerLocation(new GeoLocation("ghaziabad", "Ghaziabad", "Ghaziabad", "Uttar Pradesh", "201001", 28.6692, 77.4538));
        registerPincode("201001", "Ghaziabad", "Ghaziabad", "Uttar Pradesh", 28.6692, 77.4538);

        registerLocation(new GeoLocation("faridabad", "Faridabad", "Faridabad", "Haryana", "121001", 28.4089, 77.3178));
        registerPincode("121001", "Faridabad", "Faridabad", "Haryana", 28.4089, 77.3178);

        // Uttar Pradesh Major Cities & Districts
        registerLocation(new GeoLocation("lucknow", "Lucknow", "Lucknow", "Uttar Pradesh", "226001", 26.8467, 80.9462));
        registerPincode("226001", "Lucknow", "Lucknow", "Uttar Pradesh", 26.8467, 80.9462);

        registerLocation(new GeoLocation("kanpur", "Kanpur", "Kanpur Nagar", "Uttar Pradesh", "208001", 26.4499, 80.3319));
        registerPincode("208001", "Kanpur", "Kanpur Nagar", "Uttar Pradesh", 26.4499, 80.3319);

        registerLocation(new GeoLocation("agra", "Agra", "Agra", "Uttar Pradesh", "282001", 27.1767, 78.0081));
        registerPincode("282001", "Agra", "Agra", "Uttar Pradesh", 27.1767, 78.0081);

        registerLocation(new GeoLocation("meerut", "Meerut", "Meerut", "Uttar Pradesh", "250001", 28.9845, 77.7064));
        registerPincode("250001", "Meerut", "Meerut", "Uttar Pradesh", 28.9845, 77.7064);

        registerLocation(new GeoLocation("varanasi", "Varanasi", "Varanasi", "Uttar Pradesh", "221001", 25.3176, 82.9739));
        registerPincode("221001", "Varanasi", "Varanasi", "Uttar Pradesh", 25.3176, 82.9739);

        registerLocation(new GeoLocation("prayagraj", "Prayagraj", "Prayagraj", "Uttar Pradesh", "211001", 25.4358, 81.8463));
        registerLocation(new GeoLocation("allahabad", "Prayagraj", "Prayagraj", "Uttar Pradesh", "211001", 25.4358, 81.8463));
        registerPincode("211001", "Prayagraj", "Prayagraj", "Uttar Pradesh", 25.4358, 81.8463);

        registerLocation(new GeoLocation("bareilly", "Bareilly", "Bareilly", "Uttar Pradesh", "243001", 28.3670, 79.4304));
        registerPincode("243001", "Bareilly", "Bareilly", "Uttar Pradesh", 28.3670, 79.4304);

        registerLocation(new GeoLocation("aligarh", "Aligarh", "Aligarh", "Uttar Pradesh", "202001", 27.8974, 78.0880));
        registerPincode("202001", "Aligarh", "Aligarh", "Uttar Pradesh", 27.8974, 78.0880);

        registerLocation(new GeoLocation("gorakhpur", "Gorakhpur", "Gorakhpur", "Uttar Pradesh", "273001", 26.7606, 83.3732));
        registerPincode("273001", "Gorakhpur", "Gorakhpur", "Uttar Pradesh", 26.7606, 83.3732);

        registerLocation(new GeoLocation("moradabad", "Moradabad", "Moradabad", "Uttar Pradesh", "244001", 28.8386, 78.7733));
        registerPincode("244001", "Moradabad", "Moradabad", "Uttar Pradesh", 28.8386, 78.7733);

        registerLocation(new GeoLocation("mathura", "Mathura", "Mathura", "Uttar Pradesh", "281001", 27.4924, 77.6737));
        registerPincode("281001", "Mathura", "Mathura", "Uttar Pradesh", 27.4924, 77.6737);

        // Major National Cities
        registerLocation(new GeoLocation("jaipur", "Jaipur", "Jaipur", "Rajasthan", "302001", 26.9124, 75.7873));
        registerPincode("302001", "Jaipur", "Jaipur", "Rajasthan", 26.9124, 75.7873);

        registerLocation(new GeoLocation("mumbai", "Mumbai", "Mumbai", "Maharashtra", "400001", 19.0760, 72.8777));
        registerPincode("400001", "Mumbai", "Mumbai", "Maharashtra", 19.0760, 72.8777);

        registerLocation(new GeoLocation("bengaluru", "Bengaluru", "Bengaluru", "Karnataka", "560001", 12.9716, 77.5946));
        registerLocation(new GeoLocation("bangalore", "Bengaluru", "Bengaluru", "Karnataka", "560001", 12.9716, 77.5946));
        registerPincode("560001", "Bengaluru", "Bengaluru", "Karnataka", 12.9716, 77.5946);

        registerLocation(new GeoLocation("hyderabad", "Hyderabad", "Hyderabad", "Telangana", "500001", 17.3850, 78.4867));
        registerPincode("500001", "Hyderabad", "Hyderabad", "Telangana", 17.3850, 78.4867);

        registerLocation(new GeoLocation("patna", "Patna", "Patna", "Bihar", "800001", 25.5941, 85.1376));
        registerPincode("800001", "Patna", "Patna", "Bihar", 25.5941, 85.1376);

        registerLocation(new GeoLocation("chandigarh", "Chandigarh", "Chandigarh", "Chandigarh", "160017", 30.7333, 76.7794));
        registerPincode("160017", "Chandigarh", "Chandigarh", "Chandigarh", 30.7333, 76.7794);

        registerLocation(new GeoLocation("dehradun", "Dehradun", "Dehradun", "Uttarakhand", "248001", 30.3165, 78.0322));
        registerPincode("248001", "Dehradun", "Dehradun", "Uttarakhand", 30.3165, 78.0322);

        registerLocation(new GeoLocation("indore", "Indore", "Indore", "Madhya Pradesh", "452001", 22.7196, 75.8577));
        registerPincode("452001", "Indore", "Indore", "Madhya Pradesh", 22.7196, 75.8577);

        registerLocation(new GeoLocation("bhopal", "Bhopal", "Bhopal", "Madhya Pradesh", "462001", 23.2599, 77.4126));
        registerPincode("462001", "Bhopal", "Bhopal", "Madhya Pradesh", 23.2599, 77.4126);

        // Indian States List for State-level matching
        List<String> states = List.of(
                "Uttar Pradesh", "Delhi", "Haryana", "Rajasthan", "Punjab",
                "Madhya Pradesh", "Bihar", "Uttarakhand", "Himachal Pradesh",
                "Maharashtra", "Gujarat", "Karnataka", "Telangana", "Andhra Pradesh",
                "Tamil Nadu", "Kerala", "West Bengal", "Odisha", "Jharkhand",
                "Chhattisgarh", "Assam", "Goa", "Chandigarh", "Jammu and Kashmir"
        );
        for (String s : states) {
            KNOWN_STATES.add(s.toLowerCase());
        }
    }

    private static void registerLocation(GeoLocation geo) {
        KNOWN_LOCATIONS.put(geo.query().toLowerCase(), geo);
    }

    private static void registerPincode(String pincode, String city, String district, String state, double lat, double lon) {
        GeoLocation geo = new GeoLocation(pincode, city, district, state, pincode, lat, lon);
        PINCODE_MAP.put(pincode, geo);
        KNOWN_LOCATIONS.put(pincode, geo);
    }

    /**
     * Resolves and normalizes any location string into structured GeoLocation.
     * Extracts embedded pincodes, resolves city/district aliases, and attaches coordinates.
     */
    public GeoLocation resolveLocation(String rawQuery) {
        if (rawQuery == null || rawQuery.trim().isEmpty()) {
            return null;
        }

        String query = rawQuery.trim();
        String lower = query.toLowerCase();

        // Check if query contains a 6-digit Indian Pincode
        Matcher pinMatcher = PINCODE_PATTERN.matcher(query);
        String extractedPin = null;
        if (pinMatcher.find()) {
            extractedPin = pinMatcher.group(1);
        }

        // Direct pincode registry lookup
        if (extractedPin != null && PINCODE_MAP.containsKey(extractedPin)) {
            GeoLocation base = PINCODE_MAP.get(extractedPin);
            return new GeoLocation(
                    query,
                    base.city(),
                    base.district(),
                    base.state(),
                    extractedPin,
                    base.latitude(),
                    base.longitude()
            );
        }

        // Check if exact or substring match in known locations
        for (Map.Entry<String, GeoLocation> entry : KNOWN_LOCATIONS.entrySet()) {
            String key = entry.getKey();
            if (lower.equals(key) || lower.contains(key) || key.contains(lower)) {
                GeoLocation match = entry.getValue();
                return new GeoLocation(
                        query,
                        match.city(),
                        match.district(),
                        match.state(),
                        extractedPin != null ? extractedPin : match.pincode(),
                        match.latitude(),
                        match.longitude()
                );
            }
        }

        // State detection
        String matchedState = null;
        for (String st : KNOWN_STATES) {
            if (lower.contains(st) || (st.equals("uttar pradesh") && lower.contains("up"))) {
                matchedState = capitalizeWords(st);
                break;
            }
        }

        // Fallback for general city / district input
        String[] parts = query.split(",");
        String cityOrDistrict = parts[0].trim();
        return new GeoLocation(
                query,
                cityOrDistrict,
                cityOrDistrict,
                matchedState != null ? matchedState : (parts.length > 1 ? parts[1].trim() : ""),
                extractedPin != null ? extractedPin : "",
                null,
                null
        );
    }

    /**
     * Checks if a raw string represents a State.
     */
    public boolean isStateQuery(String rawQuery) {
        if (rawQuery == null) return false;
        String lower = rawQuery.trim().toLowerCase();
        if (lower.equals("up")) return true;
        for (String st : KNOWN_STATES) {
            if (lower.equals(st) || lower.equals(st + ", india") || lower.equals(st + " state")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Extracts standard state name from query.
     */
    public String normalizeStateName(String rawQuery) {
        if (rawQuery == null) return null;
        String lower = rawQuery.trim().toLowerCase();
        if (lower.equals("up") || lower.contains("uttar pradesh")) {
            return "Uttar Pradesh";
        }
        for (String st : KNOWN_STATES) {
            if (lower.contains(st)) {
                return capitalizeWords(st);
            }
        }
        return rawQuery.trim();
    }

    /**
     * Calculate Great-Circle distance in Kilometers between two coordinates using the Haversine formula.
     */
    public double calculateHaversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final double EARTH_RADIUS_KM = 6371.0;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round((EARTH_RADIUS_KM * c) * 10.0) / 10.0;
    }

    /**
     * Checks if two locations match by district or city alias (e.g. Greater Noida and Gautam Buddha Nagar).
     */
    public boolean areLocationsEquivalent(String loc1, String loc2) {
        if (loc1 == null || loc2 == null) return false;
        GeoLocation g1 = resolveLocation(loc1);
        GeoLocation g2 = resolveLocation(loc2);
        if (g1 == null || g2 == null) return false;

        // Same Pincode
        if (g1.pincode() != null && !g1.pincode().isEmpty() && g1.pincode().equals(g2.pincode())) {
            return true;
        }

        // Same District (e.g. Gautam Buddha Nagar for both Greater Noida and Noida)
        if (g1.district() != null && !g1.district().isEmpty()
                && g2.district() != null && !g2.district().isEmpty()
                && g1.district().equalsIgnoreCase(g2.district())) {
            return true;
        }

        // Coordinates within 25 KM
        if (g1.hasCoordinates() && g2.hasCoordinates()) {
            double dist = calculateHaversineDistanceKm(g1.latitude(), g1.longitude(), g2.latitude(), g2.longitude());
            if (dist <= 25.0) {
                return true;
            }
        }

        return false;
    }

    private String capitalizeWords(String str) {
        if (str == null || str.isEmpty()) return str;
        String[] words = str.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                sb.append(Character.toUpperCase(w.charAt(0)));
                if (w.length() > 1) {
                    sb.append(w.substring(1).toLowerCase());
                }
                sb.append(" ");
            }
        }
        return sb.toString().trim();
    }
}
