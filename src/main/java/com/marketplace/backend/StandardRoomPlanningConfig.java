package com.marketplace.backend;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * BUILDBID COST ESTIMATOR - STANDARD ROOM PLANNING CONFIGURATION (Phases 10-12)
 *
 * Single authoritative backend source for standard room planning dimensions,
 * planning allowances, and room-program geometric benchmarks.
 *
 * References:
 * - CivilInfo & CivilSite Standard Room Sizes in India
 * - Studio Matrx Bathroom Planning Benchmarks
 * - National Building Code (NBC) Residential Planning Guidelines
 */
public class StandardRoomPlanningConfig {

    /**
     * Configurable baseline planning allowance ratio for structural walls,
     * internal partitions, circulation passages, staircases, and service shafts.
     * Default benchmark: 20% (0.20) of net room program area.
     */
    public static final BigDecimal DEFAULT_PLANNING_ALLOWANCE_RATIO = new BigDecimal("0.20");

    public static class RoomBenchmark {
        private final String roomCode;
        private final String displayName;
        private final BigDecimal standardLengthFt;
        private final BigDecimal standardWidthFt;
        private final BigDecimal standardAreaSqFt;
        private final BigDecimal minPlanningAreaSqFt;
        private final String description;
        private final boolean isBathroom;

        public RoomBenchmark(String roomCode, String displayName,
                             BigDecimal standardLengthFt, BigDecimal standardWidthFt,
                             BigDecimal minPlanningAreaSqFt, String description, boolean isBathroom) {
            this.roomCode = roomCode;
            this.displayName = displayName;
            this.standardLengthFt = standardLengthFt;
            this.standardWidthFt = standardWidthFt;
            this.standardAreaSqFt = standardLengthFt.multiply(standardWidthFt).setScale(2, RoundingMode.HALF_UP);
            this.minPlanningAreaSqFt = minPlanningAreaSqFt;
            this.description = description;
            this.isBathroom = isBathroom;
        }

        public String getRoomCode() { return roomCode; }
        public String getDisplayName() { return displayName; }
        public BigDecimal getStandardLengthFt() { return standardLengthFt; }
        public BigDecimal getStandardWidthFt() { return standardWidthFt; }
        public BigDecimal getStandardAreaSqFt() { return standardAreaSqFt; }
        public BigDecimal getMinPlanningAreaSqFt() { return minPlanningAreaSqFt; }
        public String getDescription() { return description; }
        public boolean isBathroom() { return isBathroom; }
    }

    private static final Map<String, RoomBenchmark> BENCHMARKS = new LinkedHashMap<>();

    static {
        // 1. Bedrooms
        register(new RoomBenchmark("BEDROOM", "Bedrooms",
                new BigDecimal("10.0"), new BigDecimal("12.0"), new BigDecimal("100.0"),
                "Standard planning bedroom benchmark (10 ft x 12 ft)", false));

        register(new RoomBenchmark("MASTER_BEDROOM", "Master Bedroom",
                new BigDecimal("12.0"), new BigDecimal("14.0"), new BigDecimal("140.0"),
                "Master bedroom planning benchmark with wardrobe space (12 ft x 14 ft)", false));

        register(new RoomBenchmark("COMPACT_BEDROOM", "Compact Bedroom",
                new BigDecimal("10.0"), new BigDecimal("10.0"), new BigDecimal("90.0"),
                "Compact bedroom planning benchmark (10 ft x 10 ft)", false));

        // 2. Bathrooms
        register(new RoomBenchmark("BATHROOM", "Bathrooms",
                new BigDecimal("6.0"), new BigDecimal("8.0"), new BigDecimal("35.0"),
                "Standard 3-fixture bathroom (WC, basin, shower) benchmark (6 ft x 8 ft)", true));

        register(new RoomBenchmark("COMPACT_BATHROOM", "Compact Bathroom",
                new BigDecimal("5.0"), new BigDecimal("7.0"), new BigDecimal("30.0"),
                "Compact bathroom benchmark (5 ft x 7 ft)", true));

        // 3. Kitchen & Dining
        register(new RoomBenchmark("KITCHEN", "Kitchen",
                new BigDecimal("8.0"), new BigDecimal("10.0"), new BigDecimal("60.0"),
                "Standard modular/semi-modular kitchen benchmark (8 ft x 10 ft)", false));

        register(new RoomBenchmark("DINING", "Dining Room",
                new BigDecimal("10.0"), new BigDecimal("12.0"), new BigDecimal("80.0"),
                "Dining space for 6-person table layout (10 ft x 12 ft)", false));

        // 4. Living / Drawing
        register(new RoomBenchmark("LIVING", "Living Room",
                new BigDecimal("14.0"), new BigDecimal("16.0"), new BigDecimal("150.0"),
                "Drawing/Living room seating planning benchmark (14 ft x 16 ft)", false));

        // 5. Utility, Study, Pooja, Store
        register(new RoomBenchmark("STUDY", "Study Room",
                new BigDecimal("8.0"), new BigDecimal("10.0"), new BigDecimal("60.0"),
                "Home office / study room benchmark (8 ft x 10 ft)", false));

        register(new RoomBenchmark("POOJA", "Pooja Room",
                new BigDecimal("4.0"), new BigDecimal("5.0"), new BigDecimal("15.0"),
                "Mandir / prayer alcove benchmark (4 ft x 5 ft)", false));

        register(new RoomBenchmark("STORE", "Store Room",
                new BigDecimal("6.0"), new BigDecimal("8.0"), new BigDecimal("30.0"),
                "Pantry / household storage benchmark (6 ft x 8 ft)", false));

        register(new RoomBenchmark("UTILITY", "Utility/Wash Area",
                new BigDecimal("5.0"), new BigDecimal("7.0"), new BigDecimal("25.0"),
                "Washing machine & utility yard benchmark (5 ft x 7 ft)", false));

        // 6. Balcony & Parking
        register(new RoomBenchmark("BALCONY", "Balcony",
                new BigDecimal("5.0"), new BigDecimal("8.0"), new BigDecimal("25.0"),
                "Standard cantilevered balcony benchmark (5 ft x 8 ft)", false));

        register(new RoomBenchmark("PARKING", "Parking",
                new BigDecimal("10.0"), new BigDecimal("15.0"), new BigDecimal("120.0"),
                "Covered stilt/ground car parking bay benchmark (10 ft x 15 ft)", false));
    }

    private static void register(RoomBenchmark benchmark) {
        BENCHMARKS.put(benchmark.getRoomCode().toUpperCase(), benchmark);
        BENCHMARKS.put(benchmark.getDisplayName().toUpperCase().replace(" ", "_"), benchmark);
    }

    public static Collection<RoomBenchmark> getAllBenchmarks() {
        // Return unique benchmarks
        Set<RoomBenchmark> set = new LinkedHashSet<>(BENCHMARKS.values());
        return Collections.unmodifiableSet(set);
    }

    public static RoomBenchmark getBenchmark(String roomNameOrCode) {
        if (roomNameOrCode == null || roomNameOrCode.trim().isEmpty()) {
            return null;
        }
        String key = roomNameOrCode.trim().toUpperCase().replace(" ", "_");
        if (BENCHMARKS.containsKey(key)) {
            return BENCHMARKS.get(key);
        }

        // Fuzzy fallback for common naming variations
        if (key.contains("BEDROOM")) {
            if (key.contains("MASTER")) return BENCHMARKS.get("MASTER_BEDROOM");
            if (key.contains("COMPACT")) return BENCHMARKS.get("COMPACT_BEDROOM");
            return BENCHMARKS.get("BEDROOM");
        }
        if (key.contains("BATH") || key.contains("TOILET")) {
            if (key.contains("COMPACT")) return BENCHMARKS.get("COMPACT_BATHROOM");
            return BENCHMARKS.get("BATHROOM");
        }
        if (key.contains("KITCHEN")) return BENCHMARKS.get("KITCHEN");
        if (key.contains("DINING")) return BENCHMARKS.get("DINING");
        if (key.contains("LIVING") || key.contains("DRAWING")) return BENCHMARKS.get("LIVING");
        if (key.contains("STUDY")) return BENCHMARKS.get("STUDY");
        if (key.contains("POOJA") || key.contains("MANDIR")) return BENCHMARKS.get("POOJA");
        if (key.contains("STORE")) return BENCHMARKS.get("STORE");
        if (key.contains("UTILITY") || key.contains("WASH")) return BENCHMARKS.get("UTILITY");
        if (key.contains("BALCONY")) return BENCHMARKS.get("BALCONY");
        if (key.contains("PARK")) return BENCHMARKS.get("PARKING");

        return null;
    }

    /**
     * Resolves effective area for a single room instance.
     * Custom dimensions strictly override planning benchmarks.
     */
    public static BigDecimal resolveEffectiveRoomArea(String roomName, BigDecimal customLength,
                                                       BigDecimal customWidth, BigDecimal customArea) {
        if (customLength != null && customWidth != null
                && customLength.compareTo(BigDecimal.ZERO) > 0 && customWidth.compareTo(BigDecimal.ZERO) > 0) {
            return customLength.multiply(customWidth).setScale(2, RoundingMode.HALF_UP);
        }
        if (customArea != null && customArea.compareTo(BigDecimal.ZERO) > 0) {
            return customArea.setScale(2, RoundingMode.HALF_UP);
        }
        RoomBenchmark benchmark = getBenchmark(roomName);
        if (benchmark != null) {
            return benchmark.getStandardAreaSqFt();
        }
        // Generic fallback for any unspecified custom room type
        return new BigDecimal("100.00");
    }
}
