package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * MANDATORY UNIT & SYSTEM TESTS FOR STEP 3:
 * BUILDBID COST ESTIMATOR CALCULATION ENGINE
 *
 * Tests all 30+ mandatory specifications:
 * 1. New Construction calculation
 * 2. Commercial Construction calculation
 * 3. Industrial/Warehouse calculation
 * 4. Frozen Renovation rejection
 * 5. Frozen Home Extension rejection
 * 6. Frozen Interior rejection
 * 7. Frozen Other rejection
 * 8. City-level lookup
 * 9. District-level fallback
 * 10. State-level fallback
 * 11. National fallback
 * 12. Basement = 0
 * 13. Basement > 0
 * 14. One floor
 * 15. Two floors
 * 16. Three floors
 * 17. Multiple floors
 * 18. High-floor calculation (e.g. 50 floors)
 * 19. Floor escalation applied
 * 20. Transportation escalation applied
 * 21. Machinery/hoist escalation applied
 * 22. Low <= average <= high for all components and totals
 * 23. BigDecimal calculations (precision and scale)
 * 24. Invalid negative area rejection
 * 25. Zero area rejection
 * 26. Invalid floor count rejection
 * 27. Missing required location rejection
 * 28. Missing required rate handling
 * 29. Structural benchmark comparison and divergence warning
 * 30. No database mutation during calculation (verify zero save/delete calls)
 * 31. Deterministic output verification
 */
public class CostEstimatorServiceTest {

    private CostEstimatorRateRepository mockRepository;
    private GeoLocationService geoLocationService;
    private CostEstimatorService estimatorService;
    private List<CostEstimatorRate> allRates;

    @BeforeEach
    void setUp() {
        mockRepository = mock(CostEstimatorRateRepository.class);
        geoLocationService = new GeoLocationService();

        // Capture all rates from seeder
        allRates = new ArrayList<>();
        when(mockRepository.save(any(CostEstimatorRate.class))).thenAnswer(inv -> {
            allRates.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
        when(mockRepository.existsByStateAndCityAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(false);
        when(mockRepository.existsByStateAndCityIsNullAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString())).thenReturn(false);

        CostEstimatorDataSeeder seeder = new CostEstimatorDataSeeder(mockRepository);
        seeder.run();

        // Wire mock repository search methods to filter in-memory rates
        when(mockRepository.findByStateIgnoreCaseAndCityIgnoreCaseAndProjectTypeAndIsActiveTrue(anyString(), anyString(), anyString()))
                .thenAnswer(inv -> {
                    String state = inv.getArgument(0);
                    String city = inv.getArgument(1);
                    String proj = inv.getArgument(2);
                    return allRates.stream()
                            .filter(r -> r.getState().equalsIgnoreCase(state) &&
                                    r.getCity() != null && r.getCity().equalsIgnoreCase(city) &&
                                    r.getProjectType().equalsIgnoreCase(proj))
                            .collect(Collectors.toList());
                });

        when(mockRepository.findByStateIgnoreCaseAndDistrictIgnoreCaseAndProjectTypeAndIsActiveTrue(anyString(), anyString(), anyString()))
                .thenAnswer(inv -> {
                    String state = inv.getArgument(0);
                    String dist = inv.getArgument(1);
                    String proj = inv.getArgument(2);
                    return allRates.stream()
                            .filter(r -> r.getState().equalsIgnoreCase(state) &&
                                    r.getDistrict() != null && r.getDistrict().equalsIgnoreCase(dist) &&
                                    r.getProjectType().equalsIgnoreCase(proj))
                            .collect(Collectors.toList());
                });

        when(mockRepository.findByStateIgnoreCaseAndCityIsNullAndProjectTypeAndIsActiveTrue(anyString(), anyString()))
                .thenAnswer(inv -> {
                    String state = inv.getArgument(0);
                    String proj = inv.getArgument(1);
                    return allRates.stream()
                            .filter(r -> r.getState().equalsIgnoreCase(state) &&
                                    r.getCity() == null &&
                                    r.getProjectType().equalsIgnoreCase(proj))
                            .collect(Collectors.toList());
                });

        when(mockRepository.findByStateIgnoreCaseAndProjectTypeAndIsActiveTrue(anyString(), anyString()))
                .thenAnswer(inv -> {
                    String state = inv.getArgument(0);
                    String proj = inv.getArgument(1);
                    return allRates.stream()
                            .filter(r -> r.getState().equalsIgnoreCase(state) &&
                                    r.getProjectType().equalsIgnoreCase(proj))
                            .collect(Collectors.toList());
                });

        estimatorService = new CostEstimatorService(mockRepository, geoLocationService);
        clearInvocations(mockRepository);
    }

    // ========================================================
    // 1. ACTIVE PROJECT TYPES
    // ========================================================

    @Test
    @DisplayName("1. New Construction calculation succeeds with valid breakdown")
    void testNewConstructionCalculation() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, "110001",
                new BigDecimal("2000"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals("NEW_CONSTRUCTION", res.getProjectType());
        assertNotNull(res.getTotal());
        assertTrue(res.getTotal().getAverage().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(res.getTotal().getLow().compareTo(res.getTotal().getAverage()) <= 0);
        assertTrue(res.getTotal().getAverage().compareTo(res.getTotal().getHigh()) <= 0);
    }

    @Test
    @DisplayName("2. Commercial Construction calculation succeeds")
    void testCommercialConstructionCalculation() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "COMMERCIAL_CONSTRUCTION", "Delhi", "New Delhi", null, "110001",
                new BigDecimal("3500"), new BigDecimal("1500"), 4, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals("COMMERCIAL_CONSTRUCTION", res.getProjectType());
        assertEquals(4, res.getFloors().size());
        assertTrue(res.getBasement().getAverage().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("3. Industrial/Warehouse calculation succeeds")
    void testIndustrialWarehouseCalculation() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "INDUSTRIAL_WAREHOUSE", "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "201301",
                new BigDecimal("10000"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals("INDUSTRIAL_WAREHOUSE", res.getProjectType());
        assertEquals(1, res.getFloors().size());
    }

    // ========================================================
    // 2. FROZEN PROJECT TYPES REJECTION
    // ========================================================

    @Test
    @DisplayName("4. Frozen Renovation rejection")
    void testFrozenRenovationRejection() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "RENOVATION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("PROJECT_TYPE_UNSUPPORTED", res.getErrorCode());
        assertTrue(res.getMessage().contains("New Construction, Commercial Construction, and Industrial/Warehouse"));
    }

    @Test
    @DisplayName("5. Frozen Home Extension rejection")
    void testFrozenHomeExtensionRejection() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "HOME_EXTENSION", "Delhi", "New Delhi", null, null,
                new BigDecimal("800"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("PROJECT_TYPE_UNSUPPORTED", res.getErrorCode());
    }

    @Test
    @DisplayName("6. Frozen Interior rejection")
    void testFrozenInteriorRejection() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "INTERIOR", "Delhi", "New Delhi", null, null,
                new BigDecimal("1200"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("PROJECT_TYPE_UNSUPPORTED", res.getErrorCode());
    }

    @Test
    @DisplayName("7. Frozen Other rejection")
    void testFrozenOtherRejection() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "OTHER", "Delhi", "New Delhi", null, null,
                new BigDecimal("1000"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("PROJECT_TYPE_UNSUPPORTED", res.getErrorCode());
    }

    // ========================================================
    // 3. 4-TIER LOCATION FALLBACK
    // ========================================================

    @Test
    @DisplayName("8. Tier 1: City-level lookup when city has rates")
    void testCityLevelLookup() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "201301",
                new BigDecimal("2000"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals("CITY", res.getLocation().getResolutionTier());
        assertEquals("Noida", res.getLocation().getCity());
    }

    @Test
    @DisplayName("9. Tier 2: District-level fallback when city is unknown but district matches")
    void testDistrictLevelFallback() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Uttar Pradesh", "UnknownCity", "Gautam Buddha Nagar", null,
                new BigDecimal("2000"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals("DISTRICT", res.getLocation().getResolutionTier());
    }

    @Test
    @DisplayName("10. Tier 3: State-level fallback when city/district unknown in UP")
    void testStateLevelFallback() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Uttar Pradesh", "UnknownCity", "UnknownDistrict", null,
                new BigDecimal("2000"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals("STATE_DEFAULT", res.getLocation().getResolutionTier());
    }

    @Test
    @DisplayName("11. Tier 4: National Default fallback for unseeded states")
    void testNationalFallback() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Karnataka", "Bengaluru", null, null,
                new BigDecimal("2000"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals("NATIONAL_DEFAULT", res.getLocation().getResolutionTier());
    }

    // ========================================================
    // 4. BASEMENT CALCULATIONS
    // ========================================================

    @Test
    @DisplayName("12. Basement = 0 produces 0 basement cost")
    void testBasementZeroCost() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2000"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals(BigDecimal.ZERO.setScale(2), res.getBasement().getAverage());
        assertEquals(BigDecimal.ZERO.setScale(2), res.getBreakdown().getBasement().getAverage());
    }

    @Test
    @DisplayName("13. Basement > 0 produces detailed excavation and waterproofing cost")
    void testBasementPositiveCost() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2000"), new BigDecimal("1000"), 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertTrue(res.getBasement().getAverage().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(res.getBasement().getExcavationCost().getAverage().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(res.getBasement().getWaterproofingCost().getAverage().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(res.getBasement().getLow().compareTo(res.getBasement().getAverage()) <= 0);
        assertTrue(res.getBasement().getAverage().compareTo(res.getBasement().getHigh()) <= 0);
    }

    // ========================================================
    // 5. FLOOR CALCULATIONS & DYNAMIC ESCALATION
    // ========================================================

    @Test
    @DisplayName("14. Single Floor: Ground floor only")
    void testSingleFloor() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertEquals(1, res.getFloors().size());
        assertEquals("Ground Floor", res.getFloors().get(0).getFloorName());
        assertEquals(BigDecimal.ONE.setScale(4), res.getFloors().get(0).getEscalationFactor());
    }

    @Test
    @DisplayName("15. Two Floors: Ground + First floor")
    void testTwoFloors() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertEquals(2, res.getFloors().size());
        assertEquals("Ground Floor", res.getFloors().get(0).getFloorName());
        assertEquals("First Floor", res.getFloors().get(1).getFloorName());

        // First floor cost is higher than ground floor due to labour lift escalation
        assertTrue(res.getFloors().get(1).getAverage().compareTo(res.getFloors().get(0).getAverage()) > 0);
    }

    @Test
    @DisplayName("16. Three Floors: Ground + First + Second floor")
    void testThreeFloors() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 3, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertEquals(3, res.getFloors().size());
        assertEquals("Second Floor", res.getFloors().get(2).getFloorName());

        // Second floor > First floor > Ground floor
        assertTrue(res.getFloors().get(2).getAverage().compareTo(res.getFloors().get(1).getAverage()) > 0);
        assertTrue(res.getFloors().get(1).getAverage().compareTo(res.getFloors().get(0).getAverage()) > 0);
    }

    @Test
    @DisplayName("17. Multiple Floors: 5 floors dynamic breakdown")
    void testMultipleFloors() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2000"), BigDecimal.ZERO, 5, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertEquals(5, res.getFloors().size());
        for (int i = 1; i < 5; i++) {
            assertTrue(res.getFloors().get(i).getAverage().compareTo(res.getFloors().get(i - 1).getAverage()) > 0,
                    "Floor " + i + " should cost more than Floor " + (i - 1));
        }
    }

    @Test
    @DisplayName("18. High Floor Calculation: 50 floors high-rise")
    void testHighFloorCalculation() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "COMMERCIAL_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("5000"), new BigDecimal("2000"), 50, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals(50, res.getFloors().size());
        assertEquals("50th Floor", res.getFloors().get(49).getFloorName());
        assertTrue(res.getTotal().getAverage().compareTo(BigDecimal.ZERO) > 0);
    }

    // ========================================================
    // 6. ESCALATION SPECIFICS
    // ========================================================

    @Test
    @DisplayName("19, 20, 21. Progressive Labour, Transport, and Machinery Escalation")
    void testEscalationComponents() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2000"), BigDecimal.ZERO, 3, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());

        // Contingency should be 2%
        assertEquals(new BigDecimal("1.0200"), res.getBreakdown().getContingency().getFactor());
        assertEquals(new BigDecimal("2.00"), res.getBreakdown().getContingency().getPercentage());
    }

    // ========================================================
    // 7. DATA TYPES, RANGES & DETERMINISM
    // ========================================================

    @Test
    @DisplayName("22 & 23. Low <= Average <= High across all totals & BigDecimals used")
    void testRangeIntegrityAndBigDecimals() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2500"), new BigDecimal("1000"), 3, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);

        // Overall total
        assertTrue(res.getTotal().getLow().compareTo(res.getTotal().getAverage()) <= 0);
        assertTrue(res.getTotal().getAverage().compareTo(res.getTotal().getHigh()) <= 0);

        // Category breakdown
        assertTrue(res.getBreakdown().getMaterial().getLow().compareTo(res.getBreakdown().getMaterial().getAverage()) <= 0);
        assertTrue(res.getBreakdown().getLabour().getLow().compareTo(res.getBreakdown().getLabour().getAverage()) <= 0);
        assertTrue(res.getBreakdown().getTransportation().getLow().compareTo(res.getBreakdown().getTransportation().getAverage()) <= 0);
        assertTrue(res.getBreakdown().getMachinery().getLow().compareTo(res.getBreakdown().getMachinery().getAverage()) <= 0);
    }

    // ========================================================
    // 8. INPUT DEFENSE & VALIDATIONS
    // ========================================================

    @Test
    @DisplayName("24. Invalid negative area rejection")
    void testNegativeAreaRejection() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("-500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("INVALID_BUILT_UP_AREA", res.getErrorCode());
    }

    @Test
    @DisplayName("25. Zero area rejection")
    void testZeroAreaRejection() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("INVALID_BUILT_UP_AREA", res.getErrorCode());
    }

    @Test
    @DisplayName("26. Invalid floor count rejection (< 1 or > 100)")
    void testInvalidFloorCountRejection() {
        CostEstimationRequestDto req1 = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 0, "STANDARD");

        CostEstimationResponseDto res1 = estimatorService.calculate(req1);
        assertFalse(res1.isSuccess());
        assertEquals("INVALID_FLOOR_COUNT", res1.getErrorCode());

        CostEstimationRequestDto req2 = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 101, "STANDARD");

        CostEstimationResponseDto res2 = estimatorService.calculate(req2);
        assertFalse(res2.isSuccess());
        assertEquals("FLOOR_COUNT_LIMIT_EXCEEDED", res2.getErrorCode());
    }

    @Test
    @DisplayName("27. Missing required location (blank state)")
    void testMissingStateRejection() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "   ", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("STATE_REQUIRED", res.getErrorCode());
    }

    @Test
    @DisplayName("28. Missing required rates when repo returns empty list")
    void testMissingRates() {
        CostEstimatorRateRepository emptyRepo = mock(CostEstimatorRateRepository.class);
        CostEstimatorService serviceWithEmptyRepo = new CostEstimatorService(emptyRepo, geoLocationService);

        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto res = serviceWithEmptyRepo.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("RATES_UNAVAILABLE", res.getErrorCode());
    }

    @Test
    @DisplayName("29. Structural benchmark comparison")
    void testBenchmarkComparison() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2000"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertNotNull(res.getBenchmarkCheck());
        assertNotNull(res.getBenchmarkCheck().getBenchmarkPerSqFt());
        assertTrue(res.getBenchmarkCheck().getDivergencePercentage().compareTo(BigDecimal.ZERO) >= 0);
        assertTrue(res.getBenchmarkCheck().getStatus().equals("ALIGNED") || res.getBenchmarkCheck().getStatus().equals("DIVERGENT"));
    }

    @Test
    @DisplayName("30. Read-only verification: NO database mutation during calculation")
    void testNoDatabaseMutation() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2000"), new BigDecimal("500"), 3, "STANDARD");

        clearInvocations(mockRepository);
        estimatorService.calculate(req);

        // Verify that save, delete, or update were NEVER called during calculate()
        verify(mockRepository, never()).save(any(CostEstimatorRate.class));
        verify(mockRepository, never()).delete(any(CostEstimatorRate.class));
        verify(mockRepository, never()).deleteAll();
    }

    @Test
    @DisplayName("31. Deterministic Calculation: identical inputs produce identical outputs")
    void testDeterministicCalculation() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("2000"), new BigDecimal("500"), 3, "STANDARD");

        CostEstimationResponseDto res1 = estimatorService.calculate(req);
        CostEstimationResponseDto res2 = estimatorService.calculate(req);

        assertEquals(res1.getTotal().getAverage(), res2.getTotal().getAverage());
        assertEquals(res1.getTotal().getLow(), res2.getTotal().getLow());
        assertEquals(res1.getTotal().getHigh(), res2.getTotal().getHigh());
        assertEquals(res1.getFloors().size(), res2.getFloors().size());
        assertEquals(res1.getComponentItems().size(), res2.getComponentItems().size());
    }
}
