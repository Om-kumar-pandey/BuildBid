package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * BUILDBID COST ESTIMATOR - CALCULATION ENGINE (Step 3)
 *
 * Implements server-side authoritative construction cost estimation using ONLY the
 * single master table cost_estimator_rates.
 *
 * Key Capabilities:
 * 1. 4-level geographic fallback: City -> District -> State Default -> National Default.
 * 2. Multi-floor progressive vertical handling and labour escalation up to N floors.
 * 3. Separate basement calculation based on basementAreaSqFt.
 * 4. Transparent component BOQ derivation using CPWD DAR norms.
 * 5. Structural plinth area rate benchmark sanity check.
 * 6. Low, Average, and High estimates using BigDecimal throughout.
 * 7. Source and date provenance tracking.
 * 8. Pure read-only operation: does not mutate rate or project tables.
 */
@Service
public class CostEstimatorService {

    private static final Logger log = LoggerFactory.getLogger(CostEstimatorService.class);

    public static final Set<String> ACTIVE_PROJECT_TYPES = Set.of(
            "NEW_CONSTRUCTION",
            "COMMERCIAL_CONSTRUCTION",
            "INDUSTRIAL_WAREHOUSE"
    );

    public static final Set<String> FROZEN_PROJECT_TYPES = Set.of(
            "RENOVATION",
            "HOME_EXTENSION",
            "INTERIOR",
            "OTHER",
            "LANDSCAPING",
            "MAINTENANCE"
    );

    private final CostEstimatorRateRepository rateRepository;
    private final GeoLocationService geoLocationService;

    public CostEstimatorService(CostEstimatorRateRepository rateRepository, GeoLocationService geoLocationService) {
        this.rateRepository = rateRepository;
        this.geoLocationService = geoLocationService;
    }

    /**
     * Main calculation entrypoint.
     */
    public CostEstimationResponseDto calculate(CostEstimationRequestDto request) {
        log.info("Processing cost estimation request for projectType: {}, state: {}, city: {}",
                request.getProjectType(), request.getState(), request.getCity());

        // 1. Validate inputs
        CostEstimationResponseDto validationError = validateRequest(request);
        if (validationError != null) {
            return validationError;
        }

        String projectType = normalizeProjectType(request.getProjectType());

        // 2. Resolve location and geographic rate hierarchy
        LocationResolution resolution = resolveLocationAndRates(
                request.getState(), request.getCity(), request.getDistrict(), request.getPincode(), projectType);

        if (resolution.rates.isEmpty()) {
            return CostEstimationResponseDto.failure(
                    "Cost estimation rates unavailable for location: " + request.getState() +
                            (request.getCity() != null ? ", " + request.getCity() : "") +
                            " and project type: " + projectType,
                    "RATES_UNAVAILABLE"
            );
        }

        // 3. Resolve calculation factors
        FactorBundle factors = resolveFactors(resolution.rates, projectType);

        // 4. Calculate areas
        BigDecimal typicalFloorArea = request.getBuiltUpAreaSqFt().setScale(2, RoundingMode.HALF_UP);
        int floorsCount = request.getNumberOfFloors();
        BigDecimal totalAboveGroundArea = typicalFloorArea.multiply(BigDecimal.valueOf(floorsCount)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal basementArea = (request.getBasementAreaSqFt() != null && request.getBasementAreaSqFt().compareTo(BigDecimal.ZERO) > 0)
                ? request.getBasementAreaSqFt().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal totalConstructedArea = totalAboveGroundArea.add(basementArea).setScale(2, RoundingMode.HALF_UP);

        CostEstimationResponseDto.AreaBreakdownDto areaDto = new CostEstimationResponseDto.AreaBreakdownDto(
                typicalFloorArea, totalAboveGroundArea, basementArea, totalConstructedArea);

        // 5. Query structural benchmark for sanity check
        CostEstimatorRate benchmarkRate = findBenchmarkRate(resolution.rates, projectType);

        // 6. Base ground floor cost & floor-by-floor progressive vertical escalation
        List<CostEstimationResponseDto.FloorCostDto> floorList = new ArrayList<>();
        BigDecimal groundMaterialLow = BigDecimal.ZERO;
        BigDecimal groundMaterialAvg = BigDecimal.ZERO;
        BigDecimal groundMaterialHigh = BigDecimal.ZERO;

        BigDecimal groundLabourLow = BigDecimal.ZERO;
        BigDecimal groundLabourAvg = BigDecimal.ZERO;
        BigDecimal groundLabourHigh = BigDecimal.ZERO;

        BigDecimal groundTransLow = BigDecimal.ZERO;
        BigDecimal groundTransAvg = BigDecimal.ZERO;
        BigDecimal groundTransHigh = BigDecimal.ZERO;

        BigDecimal groundMachLow = BigDecimal.ZERO;
        BigDecimal groundMachAvg = BigDecimal.ZERO;
        BigDecimal groundMachHigh = BigDecimal.ZERO;

        BigDecimal groundStructLow = BigDecimal.ZERO;
        BigDecimal groundStructAvg = BigDecimal.ZERO;
        BigDecimal groundStructHigh = BigDecimal.ZERO;

        if (benchmarkRate != null) {
            // Material: ~58% of base structural benchmark
            groundMaterialLow = benchmarkRate.getMinRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.58")).setScale(2, RoundingMode.HALF_UP);
            groundMaterialAvg = benchmarkRate.getAverageRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.58")).setScale(2, RoundingMode.HALF_UP);
            groundMaterialHigh = benchmarkRate.getMaxRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.58")).setScale(2, RoundingMode.HALF_UP);

            // Labour: ~28% of base structural benchmark
            groundLabourLow = benchmarkRate.getMinRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.28")).setScale(2, RoundingMode.HALF_UP);
            groundLabourAvg = benchmarkRate.getAverageRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.28")).setScale(2, RoundingMode.HALF_UP);
            groundLabourHigh = benchmarkRate.getMaxRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.28")).setScale(2, RoundingMode.HALF_UP);

            // Transportation: ~5%
            groundTransLow = benchmarkRate.getMinRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
            groundTransAvg = benchmarkRate.getAverageRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
            groundTransHigh = benchmarkRate.getMaxRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);

            // Machinery: ~4%
            groundMachLow = benchmarkRate.getMinRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.04")).setScale(2, RoundingMode.HALF_UP);
            groundMachAvg = benchmarkRate.getAverageRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.04")).setScale(2, RoundingMode.HALF_UP);
            groundMachHigh = benchmarkRate.getMaxRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.04")).setScale(2, RoundingMode.HALF_UP);

            // Structural / MEP: ~5%
            groundStructLow = benchmarkRate.getMinRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
            groundStructAvg = benchmarkRate.getAverageRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
            groundStructHigh = benchmarkRate.getMaxRate().multiply(typicalFloorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal cumMaterialLow = BigDecimal.ZERO;
        BigDecimal cumMaterialAvg = BigDecimal.ZERO;
        BigDecimal cumMaterialHigh = BigDecimal.ZERO;

        BigDecimal cumLabourLow = BigDecimal.ZERO;
        BigDecimal cumLabourAvg = BigDecimal.ZERO;
        BigDecimal cumLabourHigh = BigDecimal.ZERO;

        BigDecimal cumTransLow = BigDecimal.ZERO;
        BigDecimal cumTransAvg = BigDecimal.ZERO;
        BigDecimal cumTransHigh = BigDecimal.ZERO;

        BigDecimal cumMachLow = BigDecimal.ZERO;
        BigDecimal cumMachAvg = BigDecimal.ZERO;
        BigDecimal cumMachHigh = BigDecimal.ZERO;

        BigDecimal cumStructLow = BigDecimal.ZERO;
        BigDecimal cumStructAvg = BigDecimal.ZERO;
        BigDecimal cumStructHigh = BigDecimal.ZERO;

        for (int floor = 0; floor < floorsCount; floor++) {
            String floorName = getFloorName(floor);
            BigDecimal floorLabourFactor;
            BigDecimal floorTransFactor;
            BigDecimal floorMachFactor;

            if (floor == 0) {
                // Ground Floor (baseline)
                floorLabourFactor = BigDecimal.ONE;
                floorTransFactor = BigDecimal.ONE;
                floorMachFactor = BigDecimal.ONE;
            } else if (floor == 1) {
                // First Floor
                floorLabourFactor = factors.firstFloorLabourFactor;
                floorTransFactor = new BigDecimal("1.0200"); // Minor first floor vertical staging
                floorMachFactor = new BigDecimal("1.0150");
            } else {
                // Floor 2, 3, ... N (progressive vertical escalation)
                int heightStep = floor - 1;
                // Labour escalation: 1 + (upperFactor - 1) * heightStep
                BigDecimal labourStep = factors.upperFloorLabourFactor.subtract(BigDecimal.ONE).multiply(BigDecimal.valueOf(heightStep));
                floorLabourFactor = BigDecimal.ONE.add(labourStep);

                BigDecimal transStep = factors.upperFloorTransFactor.subtract(BigDecimal.ONE).multiply(BigDecimal.valueOf(heightStep));
                floorTransFactor = BigDecimal.ONE.add(transStep);

                BigDecimal machStep = factors.upperFloorMachFactor.subtract(BigDecimal.ONE).multiply(BigDecimal.valueOf(heightStep));
                floorMachFactor = BigDecimal.ONE.add(machStep);
            }

            BigDecimal fMatLow = groundMaterialLow;
            BigDecimal fMatAvg = groundMaterialAvg;
            BigDecimal fMatHigh = groundMaterialHigh;

            BigDecimal fLabLow = groundLabourLow.multiply(floorLabourFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal fLabAvg = groundLabourAvg.multiply(floorLabourFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal fLabHigh = groundLabourHigh.multiply(floorLabourFactor).setScale(2, RoundingMode.HALF_UP);

            BigDecimal fTrLow = groundTransLow.multiply(floorTransFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal fTrAvg = groundTransAvg.multiply(floorTransFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal fTrHigh = groundTransHigh.multiply(floorTransFactor).setScale(2, RoundingMode.HALF_UP);

            BigDecimal fMcLow = groundMachLow.multiply(floorMachFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal fMcAvg = groundMachAvg.multiply(floorMachFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal fMcHigh = groundMachHigh.multiply(floorMachFactor).setScale(2, RoundingMode.HALF_UP);

            BigDecimal fStLow = groundStructLow;
            BigDecimal fStAvg = groundStructAvg;
            BigDecimal fStHigh = groundStructHigh;

            BigDecimal fTotalLow = fMatLow.add(fLabLow).add(fTrLow).add(fMcLow).add(fStLow);
            BigDecimal fTotalAvg = fMatAvg.add(fLabAvg).add(fTrAvg).add(fMcAvg).add(fStAvg);
            BigDecimal fTotalHigh = fMatHigh.add(fLabHigh).add(fTrHigh).add(fMcHigh).add(fStHigh);

            BigDecimal compositeFactor = (groundMaterialAvg.add(groundLabourAvg).add(groundTransAvg).add(groundMachAvg).add(groundStructAvg).compareTo(BigDecimal.ZERO) > 0)
                    ? fTotalAvg.divide(groundMaterialAvg.add(groundLabourAvg).add(groundTransAvg).add(groundMachAvg).add(groundStructAvg), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ONE;

            floorList.add(new CostEstimationResponseDto.FloorCostDto(
                    floor, floorName, typicalFloorArea, fTotalLow, fTotalAvg, fTotalHigh, compositeFactor));

            cumMaterialLow = cumMaterialLow.add(fMatLow);
            cumMaterialAvg = cumMaterialAvg.add(fMatAvg);
            cumMaterialHigh = cumMaterialHigh.add(fMatHigh);

            cumLabourLow = cumLabourLow.add(fLabLow);
            cumLabourAvg = cumLabourAvg.add(fLabAvg);
            cumLabourHigh = cumLabourHigh.add(fLabHigh);

            cumTransLow = cumTransLow.add(fTrLow);
            cumTransAvg = cumTransAvg.add(fTrAvg);
            cumTransHigh = cumTransHigh.add(fTrHigh);

            cumMachLow = cumMachLow.add(fMcLow);
            cumMachAvg = cumMachAvg.add(fMcAvg);
            cumMachHigh = cumMachHigh.add(fMcHigh);

            cumStructLow = cumStructLow.add(fStLow);
            cumStructAvg = cumStructAvg.add(fStAvg);
            cumStructHigh = cumStructHigh.add(fStHigh);
        }

        // 7. Calculate Basement (separate package)
        CostEstimationResponseDto.BasementCostDto basementDto = calculateBasement(
                resolution.rates, basementArea, factors.basementFactor);

        // 8. Derive detailed component items (BOQ breakdown)
        List<CostEstimationResponseDto.ComponentItemDto> componentItems = deriveComponentItems(
                resolution.rates, totalConstructedArea, resolution.resolutionTier, projectType);

        // 9. Aggregate Category Breakdown & Contingency
        CostEstimationResponseDto.CostBreakdownDto breakdownDto = new CostEstimationResponseDto.CostBreakdownDto();
        breakdownDto.setMaterial(new CostEstimationResponseDto.CostRangeDto(cumMaterialLow, cumMaterialAvg, cumMaterialHigh));
        breakdownDto.setLabour(new CostEstimationResponseDto.CostRangeDto(cumLabourLow, cumLabourAvg, cumLabourHigh));
        breakdownDto.setTransportation(new CostEstimationResponseDto.CostRangeDto(cumTransLow, cumTransAvg, cumTransHigh));
        breakdownDto.setMachinery(new CostEstimationResponseDto.CostRangeDto(cumMachLow, cumMachAvg, cumMachHigh));
        breakdownDto.setStructural(new CostEstimationResponseDto.CostRangeDto(cumStructLow, cumStructAvg, cumStructHigh));
        breakdownDto.setBasement(new CostEstimationResponseDto.CostRangeDto(
                basementDto.getLow(), basementDto.getAverage(), basementDto.getHigh()));

        // Subtotal before contingency
        BigDecimal subtotalLow = cumMaterialLow.add(cumLabourLow).add(cumTransLow).add(cumMachLow).add(cumStructLow).add(basementDto.getLow());
        BigDecimal subtotalAvg = cumMaterialAvg.add(cumLabourAvg).add(cumTransAvg).add(cumMachAvg).add(cumStructAvg).add(basementDto.getAverage());
        BigDecimal subtotalHigh = cumMaterialHigh.add(cumLabourHigh).add(cumTransHigh).add(cumMachHigh).add(cumStructHigh).add(basementDto.getHigh());

        // Contingency calculation
        BigDecimal contingencyMultiplier = factors.contingencyFactor.subtract(BigDecimal.ONE);
        BigDecimal contingencyLow = subtotalLow.multiply(contingencyMultiplier).setScale(2, RoundingMode.HALF_UP);
        BigDecimal contingencyAvg = subtotalAvg.multiply(contingencyMultiplier).setScale(2, RoundingMode.HALF_UP);
        BigDecimal contingencyHigh = subtotalHigh.multiply(contingencyMultiplier).setScale(2, RoundingMode.HALF_UP);

        CostEstimationResponseDto.ContingencyCostDto contingencyDto = new CostEstimationResponseDto.ContingencyCostDto();
        contingencyDto.setFactor(factors.contingencyFactor);
        contingencyDto.setPercentage(contingencyMultiplier.multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP));
        contingencyDto.setLow(contingencyLow);
        contingencyDto.setAverage(contingencyAvg);
        contingencyDto.setHigh(contingencyHigh);
        breakdownDto.setContingency(contingencyDto);

        // 10. Total Estimated Cost
        BigDecimal totalLow = subtotalLow.add(contingencyLow).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAvg = subtotalAvg.add(contingencyAvg).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalHigh = subtotalHigh.add(contingencyHigh).setScale(2, RoundingMode.HALF_UP);

        CostEstimationResponseDto.TotalEstimateDto totalDto = new CostEstimationResponseDto.TotalEstimateDto(totalLow, totalAvg, totalHigh);

        // 11. Benchmark Sanity Check
        List<String> warnings = new ArrayList<>();
        CostEstimationResponseDto.BenchmarkCheckDto benchmarkCheck = performBenchmarkSanityCheck(
                benchmarkRate, totalConstructedArea, basementArea, factors.basementFactor, totalAvg, warnings);

        // 12. Source Provenance
        List<CostEstimationResponseDto.SourceProvenanceDto> provenanceList = extractProvenance(resolution.rates, resolution.resolutionTier);

        // 13. Assemble Response
        CostEstimationResponseDto response = new CostEstimationResponseDto();
        response.setSuccess(true);
        response.setMessage("Cost estimate calculated successfully.");
        response.setProjectType(projectType);
        response.setQualityTier(request.getQualityTier() != null ? request.getQualityTier().toUpperCase() : "STANDARD");

        response.setLocation(new CostEstimationResponseDto.LocationDto(
                resolution.normalizedState, resolution.normalizedCity, resolution.normalizedDistrict,
                request.getPincode(), resolution.resolutionTier));
        response.setArea(areaDto);
        response.setFloors(floorList);
        response.setBasement(basementDto);
        response.setBreakdown(breakdownDto);
        response.setComponentItems(componentItems);
        response.setBenchmarkCheck(benchmarkCheck);
        response.setTotal(totalDto);
        response.setSources(provenanceList);
        response.setWarnings(warnings);

        return response;
    }

    // ========================================================
    // HELPER: REQUEST VALIDATION
    // ========================================================

    private CostEstimationResponseDto validateRequest(CostEstimationRequestDto req) {
        if (req.getProjectType() == null || req.getProjectType().trim().isEmpty()) {
            return CostEstimationResponseDto.failure("Project type is required.", "PROJECT_TYPE_REQUIRED");
        }

        String rawType = req.getProjectType().trim().toUpperCase().replace(" ", "_");

        if (FROZEN_PROJECT_TYPES.contains(rawType) ||
                rawType.contains("RENOVATION") || rawType.contains("EXTENSION") || rawType.contains("INTERIOR")) {
            return CostEstimationResponseDto.failure(
                    "Cost estimation is currently available only for New Construction, Commercial Construction, and Industrial/Warehouse.",
                    "PROJECT_TYPE_UNSUPPORTED"
            );
        }

        if (!ACTIVE_PROJECT_TYPES.contains(rawType)) {
            return CostEstimationResponseDto.failure(
                    "Cost estimation is currently available only for New Construction, Commercial Construction, and Industrial/Warehouse.",
                    "PROJECT_TYPE_UNSUPPORTED"
            );
        }

        if (req.getState() == null || req.getState().trim().isEmpty()) {
            return CostEstimationResponseDto.failure("State is required.", "STATE_REQUIRED");
        }

        if (req.getBuiltUpAreaSqFt() == null || req.getBuiltUpAreaSqFt().compareTo(BigDecimal.ZERO) <= 0) {
            return CostEstimationResponseDto.failure("Built-up area must be greater than zero.", "INVALID_BUILT_UP_AREA");
        }

        if (req.getBasementAreaSqFt() != null && req.getBasementAreaSqFt().compareTo(BigDecimal.ZERO) < 0) {
            return CostEstimationResponseDto.failure("Basement area cannot be negative.", "INVALID_BASEMENT_AREA");
        }

        if (req.getNumberOfFloors() == null || req.getNumberOfFloors() < 1) {
            return CostEstimationResponseDto.failure("Number of floors must be at least 1.", "INVALID_FLOOR_COUNT");
        }

        if (req.getNumberOfFloors() > 100) {
            return CostEstimationResponseDto.failure("Number of floors cannot exceed 100.", "FLOOR_COUNT_LIMIT_EXCEEDED");
        }

        if (req.getQualityTier() != null && !req.getQualityTier().trim().isEmpty() &&
                !req.getQualityTier().trim().equalsIgnoreCase("STANDARD")) {
            return CostEstimationResponseDto.failure(
                    "Only STANDARD quality tier is currently verified. Other quality tiers will be supported in future releases.",
                    "INVALID_QUALITY_TIER"
            );
        }

        return null;
    }

    private String normalizeProjectType(String raw) {
        String p = raw.trim().toUpperCase().replace(" ", "_");
        if (p.contains("COMMERCIAL")) return "COMMERCIAL_CONSTRUCTION";
        if (p.contains("INDUSTRIAL") || p.contains("WAREHOUSE")) return "INDUSTRIAL_WAREHOUSE";
        return "NEW_CONSTRUCTION";
    }

    // ========================================================
    // HELPER: LOCATION RESOLUTION (4-TIER HIERARCHY)
    // ========================================================

    private static class LocationResolution {
        String normalizedState;
        String normalizedCity;
        String normalizedDistrict;
        String resolutionTier;
        Map<String, CostEstimatorRate> rates;
    }

    private LocationResolution resolveLocationAndRates(
            String rawState, String rawCity, String rawDistrict, String rawPincode, String projectType) {

        LocationResolution res = new LocationResolution();
        res.normalizedState = rawState != null ? rawState.trim() : "";
        res.normalizedCity = rawCity != null ? rawCity.trim() : null;
        res.normalizedDistrict = rawDistrict != null ? rawDistrict.trim() : null;

        // Try GeoLocationService resolution if query has alias or pincode
        if (geoLocationService != null && (res.normalizedCity != null || rawPincode != null)) {
            String query = (rawPincode != null && !rawPincode.trim().isEmpty())
                    ? rawPincode.trim()
                    : (res.normalizedCity + (res.normalizedState.isEmpty() ? "" : ", " + res.normalizedState));
            try {
                GeoLocationService.GeoLocation geo = geoLocationService.resolveLocation(query);
                if (geo != null && geo.hasCoordinates()) {
                    if (geo.city() != null && !geo.city().isEmpty()) res.normalizedCity = geo.city();
                    if (geo.district() != null && !geo.district().isEmpty()) res.normalizedDistrict = geo.district();
                    if (geo.state() != null && !geo.state().isEmpty()) res.normalizedState = geo.state();
                } else if (geo != null) {
                    if (res.normalizedCity == null && geo.city() != null && !geo.city().isEmpty()) res.normalizedCity = geo.city();
                    if (res.normalizedDistrict == null && geo.district() != null && !geo.district().isEmpty()) res.normalizedDistrict = geo.district();
                    if (res.normalizedState == null || res.normalizedState.isEmpty()) res.normalizedState = geo.state();
                }
            } catch (Exception e) {
                log.warn("GeoLocationService resolution skipped for query {}: {}", query, e.getMessage());
            }
        }

        // Tier 4: National Default rates as foundation
        List<CostEstimatorRate> nationalList = rateRepository
                .findByStateIgnoreCaseAndProjectTypeAndIsActiveTrue("NATIONAL_DEFAULT", projectType);

        Map<String, CostEstimatorRate> combinedRates = new LinkedHashMap<>();
        for (CostEstimatorRate r : nationalList) {
            combinedRates.put(buildKey(r), r);
        }
        res.resolutionTier = "NATIONAL_DEFAULT";

        // Tier 3: State Default
        if (res.normalizedState != null && !res.normalizedState.isEmpty()) {
            List<CostEstimatorRate> stateList = rateRepository
                    .findByStateIgnoreCaseAndCityIsNullAndProjectTypeAndIsActiveTrue(res.normalizedState, projectType);
            if (!stateList.isEmpty()) {
                res.resolutionTier = "STATE_DEFAULT";
                for (CostEstimatorRate r : stateList) {
                    combinedRates.put(buildKey(r), r);
                }
            }
        }

        // Tier 2: District Level
        if (res.normalizedState != null && res.normalizedDistrict != null && !res.normalizedDistrict.isEmpty()) {
            List<CostEstimatorRate> districtList = rateRepository
                    .findByStateIgnoreCaseAndDistrictIgnoreCaseAndProjectTypeAndIsActiveTrue(
                            res.normalizedState, res.normalizedDistrict, projectType);
            if (!districtList.isEmpty()) {
                res.resolutionTier = "DISTRICT";
                for (CostEstimatorRate r : districtList) {
                    combinedRates.put(buildKey(r), r);
                }
            }
        }

        // Tier 1: City Level (Highest Priority)
        if (res.normalizedState != null && res.normalizedCity != null && !res.normalizedCity.isEmpty()) {
            List<CostEstimatorRate> cityList = rateRepository
                    .findByStateIgnoreCaseAndCityIgnoreCaseAndProjectTypeAndIsActiveTrue(
                            res.normalizedState, res.normalizedCity, projectType);
            if (!cityList.isEmpty()) {
                res.resolutionTier = "CITY";
                for (CostEstimatorRate r : cityList) {
                    combinedRates.put(buildKey(r), r);
                }
            }
        }

        res.rates = combinedRates;
        return res;
    }

    private String buildKey(CostEstimatorRate r) {
        return r.getComponentCategory() + ":" + r.getComponentName() + ":" + r.getFloorLevel();
    }

    // ========================================================
    // HELPER: FACTOR RESOLUTION
    // ========================================================

    private static class FactorBundle {
        BigDecimal firstFloorLabourFactor = new BigDecimal("1.0400");
        BigDecimal upperFloorLabourFactor = new BigDecimal("1.0700");
        BigDecimal upperFloorTransFactor = new BigDecimal("1.0500");
        BigDecimal upperFloorMachFactor = new BigDecimal("1.0300");
        BigDecimal basementFactor = new BigDecimal("1.2000");
        BigDecimal contingencyFactor = new BigDecimal("1.0200");
    }

    private FactorBundle resolveFactors(Map<String, CostEstimatorRate> rates, String projectType) {
        FactorBundle fb = new FactorBundle();

        for (CostEstimatorRate r : rates.values()) {
            if ("FACTOR".equalsIgnoreCase(r.getComponentCategory()) || "MULTIPLIER".equalsIgnoreCase(r.getRateType())) {
                if ("LABOUR_FLOOR_FACTOR".equalsIgnoreCase(r.getFactorType())) {
                    if ("FIRST".equalsIgnoreCase(r.getFloorLevel()) && r.getFactorValue() != null) {
                        fb.firstFloorLabourFactor = r.getFactorValue();
                    } else if ("UPPER".equalsIgnoreCase(r.getFloorLevel()) && r.getFactorValue() != null) {
                        fb.upperFloorLabourFactor = r.getFactorValue();
                    }
                } else if ("TRANSPORTATION_FLOOR_FACTOR".equalsIgnoreCase(r.getFactorType()) && r.getFactorValue() != null) {
                    fb.upperFloorTransFactor = r.getFactorValue();
                } else if ("MACHINERY_FLOOR_FACTOR".equalsIgnoreCase(r.getFactorType()) && r.getFactorValue() != null) {
                    fb.upperFloorMachFactor = r.getFactorValue();
                } else if ("BASEMENT_FACTOR".equalsIgnoreCase(r.getFactorType()) && r.getFactorValue() != null) {
                    fb.basementFactor = r.getFactorValue();
                } else if ("CONTINGENCY_FACTOR".equalsIgnoreCase(r.getFactorType()) && r.getFactorValue() != null) {
                    fb.contingencyFactor = r.getFactorValue();
                }
            }
        }
        return fb;
    }

    // ========================================================
    // HELPER: STRUCTURAL BENCHMARK LOOKUP
    // ========================================================

    private CostEstimatorRate findBenchmarkRate(Map<String, CostEstimatorRate> rates, String projectType) {
        for (CostEstimatorRate r : rates.values()) {
            if ("STRUCTURAL".equalsIgnoreCase(r.getComponentCategory()) && "AREA_RATE".equalsIgnoreCase(r.getRateType())) {
                return r;
            }
        }
        return null;
    }

    // ========================================================
    // HELPER: BASEMENT CALCULATION
    // ========================================================

    private CostEstimationResponseDto.BasementCostDto calculateBasement(
            Map<String, CostEstimatorRate> rates, BigDecimal basementArea, BigDecimal basementFactor) {

        CostEstimationResponseDto.BasementCostDto bDto = new CostEstimationResponseDto.BasementCostDto();
        bDto.setAreaSqFt(basementArea);

        if (basementArea.compareTo(BigDecimal.ZERO) <= 0) {
            bDto.setLow(BigDecimal.ZERO.setScale(2));
            bDto.setAverage(BigDecimal.ZERO.setScale(2));
            bDto.setHigh(BigDecimal.ZERO.setScale(2));
            bDto.setExcavationCost(new CostEstimationResponseDto.CostRangeDto(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
            bDto.setWaterproofingCost(new CostEstimationResponseDto.CostRangeDto(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
            bDto.setStructuralCost(new CostEstimationResponseDto.CostRangeDto(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
            return bDto;
        }

        // 1. Bulk excavation: ~3.5m depth => volume = basementArea * 0.426 CUM
        BigDecimal excavationVolumeCum = basementArea.multiply(new BigDecimal("0.426")).setScale(2, RoundingMode.HALF_UP);
        CostEstimatorRate excRate = findRate(rates, "BASEMENT", "Basement Bulk Excavation & Lift");

        BigDecimal excLow = BigDecimal.ZERO;
        BigDecimal excAvg = BigDecimal.ZERO;
        BigDecimal excHigh = BigDecimal.ZERO;

        if (excRate != null) {
            excLow = excRate.getMinRate().multiply(excavationVolumeCum).setScale(2, RoundingMode.HALF_UP);
            excAvg = excRate.getAverageRate().multiply(excavationVolumeCum).setScale(2, RoundingMode.HALF_UP);
            excHigh = excRate.getMaxRate().multiply(excavationVolumeCum).setScale(2, RoundingMode.HALF_UP);
        }

        // 2. Retaining wall & waterproofing package: area rate per SQFT
        CostEstimatorRate wpRate = findRate(rates, "BASEMENT", "Basement Retaining Wall & Waterproofing Package");
        BigDecimal wpLow = BigDecimal.ZERO;
        BigDecimal wpAvg = BigDecimal.ZERO;
        BigDecimal wpHigh = BigDecimal.ZERO;

        if (wpRate != null) {
            wpLow = wpRate.getMinRate().multiply(basementArea).setScale(2, RoundingMode.HALF_UP);
            wpAvg = wpRate.getAverageRate().multiply(basementArea).setScale(2, RoundingMode.HALF_UP);
            wpHigh = wpRate.getMaxRate().multiply(basementArea).setScale(2, RoundingMode.HALF_UP);
        }

        // 3. Basement structural raft & civil reinforcement: base structural rate * basementFactor diff
        BigDecimal structFactorDiff = basementFactor.subtract(BigDecimal.ONE);
        BigDecimal stLow = basementArea.multiply(new BigDecimal("300.00")).multiply(structFactorDiff).setScale(2, RoundingMode.HALF_UP);
        BigDecimal stAvg = basementArea.multiply(new BigDecimal("350.00")).multiply(structFactorDiff).setScale(2, RoundingMode.HALF_UP);
        BigDecimal stHigh = basementArea.multiply(new BigDecimal("420.00")).multiply(structFactorDiff).setScale(2, RoundingMode.HALF_UP);

        BigDecimal bLow = excLow.add(wpLow).add(stLow).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bAvg = excAvg.add(wpAvg).add(stAvg).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bHigh = excHigh.add(wpHigh).add(stHigh).setScale(2, RoundingMode.HALF_UP);

        bDto.setLow(bLow);
        bDto.setAverage(bAvg);
        bDto.setHigh(bHigh);
        bDto.setExcavationCost(new CostEstimationResponseDto.CostRangeDto(excLow, excAvg, excHigh));
        bDto.setWaterproofingCost(new CostEstimationResponseDto.CostRangeDto(wpLow, wpAvg, wpHigh));
        bDto.setStructuralCost(new CostEstimationResponseDto.CostRangeDto(stLow, stAvg, stHigh));

        return bDto;
    }

    private CostEstimatorRate findRate(Map<String, CostEstimatorRate> rates, String category, String componentName) {
        for (CostEstimatorRate r : rates.values()) {
            if (category.equalsIgnoreCase(r.getComponentCategory()) && r.getComponentName().toLowerCase().contains(componentName.toLowerCase())) {
                return r;
            }
        }
        return null;
    }

    // ========================================================
    // HELPER: DERIVE COMPONENT BOQ ITEMS
    // ========================================================

    private List<CostEstimationResponseDto.ComponentItemDto> deriveComponentItems(
            Map<String, CostEstimatorRate> rates, BigDecimal totalArea, String geoTier, String projectType) {

        List<CostEstimationResponseDto.ComponentItemDto> items = new ArrayList<>();

        for (CostEstimatorRate r : rates.values()) {
            if ("UNIT_RATE".equalsIgnoreCase(r.getRateType())) {
                BigDecimal qty = calculateNormativeQuantity(r, totalArea, projectType);
                if (qty.compareTo(BigDecimal.ZERO) > 0) {
                    CostEstimationResponseDto.ComponentItemDto item = new CostEstimationResponseDto.ComponentItemDto();
                    item.setComponentName(r.getComponentName());
                    item.setCategory(r.getComponentCategory());
                    item.setUnit(r.getUnit());
                    item.setQuantity(qty.setScale(2, RoundingMode.HALF_UP));
                    item.setLowRate(r.getMinRate());
                    item.setAverageRate(r.getAverageRate());
                    item.setHighRate(r.getMaxRate());
                    item.setLowCost(r.getMinRate().multiply(qty).setScale(2, RoundingMode.HALF_UP));
                    item.setAverageCost(r.getAverageRate().multiply(qty).setScale(2, RoundingMode.HALF_UP));
                    item.setHighCost(r.getMaxRate().multiply(qty).setScale(2, RoundingMode.HALF_UP));
                    item.setSource(r.getRateSource());
                    item.setSourceUrl(r.getSourceUrl());
                    item.setRateDate(r.getRateDate());
                    item.setGeographicTier(r.getCity() != null ? "CITY" : (r.getDistrict() != null ? "DISTRICT" : (r.getState().equals("NATIONAL_DEFAULT") ? "NATIONAL_DEFAULT" : "STATE_DEFAULT")));

                    items.add(item);
                }
            }
        }
        return items;
    }

    /**
     * Standard CPWD Delhi Analysis of Rates (DAR) quantity coefficients per sq.ft.
     */
    private BigDecimal calculateNormativeQuantity(CostEstimatorRate r, BigDecimal totalArea, String projectType) {
        String name = r.getComponentName().toLowerCase();

        // Materials
        if (name.contains("cement")) {
            return totalArea.multiply(new BigDecimal("0.42")); // 0.42 bags/sqft
        } else if (name.contains("tmt steel")) {
            BigDecimal coef = "COMMERCIAL_CONSTRUCTION".equals(projectType) ? new BigDecimal("5.50") : new BigDecimal("4.00");
            return totalArea.multiply(coef); // 4.0 kg/sqft residential, 5.5 kg/sqft commercial
        } else if (name.contains("sand")) {
            return totalArea.multiply(new BigDecimal("0.045")); // 0.045 CUM/sqft
        } else if (name.contains("aggregate")) {
            return totalArea.multiply(new BigDecimal("0.038")); // 0.038 CUM/sqft
        } else if (name.contains("brick")) {
            return totalArea.multiply(new BigDecimal("0.036")); // 0.036 CUM/sqft (~18 bricks)
        } else if (name.contains("aac block")) {
            return totalArea.multiply(new BigDecimal("0.035")); // 0.035 CUM/sqft
        } else if (name.contains("ready mix concrete")) {
            return totalArea.multiply(new BigDecimal("0.025")); // 0.025 CUM/sqft
        } else if (name.contains("structural steel")) {
            BigDecimal coef = "INDUSTRIAL_WAREHOUSE".equals(projectType) ? new BigDecimal("6.50") : new BigDecimal("2.50");
            return totalArea.multiply(coef); // kg/sqft

        // Labour (man-days per total area)
        } else if (name.contains("mason")) {
            return totalArea.multiply(new BigDecimal("0.14"));
        } else if (name.contains("helper") || name.contains("beldar")) {
            return totalArea.multiply(new BigDecimal("0.22"));
        } else if (name.contains("barbender")) {
            return totalArea.multiply(new BigDecimal("0.06"));
        } else if (name.contains("carpenter")) {
            return totalArea.multiply(new BigDecimal("0.07"));
        } else if (name.contains("electrician")) {
            return totalArea.multiply(new BigDecimal("0.05"));
        } else if (name.contains("plumber")) {
            return totalArea.multiply(new BigDecimal("0.05"));

        // Transportation (trips)
        } else if (name.contains("tipper")) {
            return totalArea.divide(new BigDecimal("500"), 2, RoundingMode.HALF_UP);
        } else if (name.contains("lcv")) {
            return totalArea.divide(new BigDecimal("400"), 2, RoundingMode.HALF_UP);

        // Machinery
        } else if (name.contains("excavator")) {
            return totalArea.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } else if (name.contains("concrete mixer")) {
            return totalArea.divide(new BigDecimal("250"), 2, RoundingMode.HALF_UP);
        } else if (name.contains("hoist")) {
            return totalArea.divide(new BigDecimal("300"), 2, RoundingMode.HALF_UP);
        }

        return BigDecimal.ZERO;
    }

    // ========================================================
    // HELPER: BENCHMARK SANITY CHECK
    // ========================================================

    private CostEstimationResponseDto.BenchmarkCheckDto performBenchmarkSanityCheck(
            CostEstimatorRate benchmarkRate, BigDecimal totalConstructedArea,
            BigDecimal basementArea, BigDecimal basementFactor, BigDecimal componentAverage, List<String> warnings) {

        CostEstimationResponseDto.BenchmarkCheckDto check = new CostEstimationResponseDto.BenchmarkCheckDto();

        if (benchmarkRate == null) {
            check.setStatus("BENCHMARK_UNAVAILABLE");
            check.setMessage("No structural plinth area benchmark found for comparison.");
            return check;
        }

        BigDecimal bPerSqFtLow = benchmarkRate.getMinRate();
        BigDecimal bPerSqFtAvg = benchmarkRate.getAverageRate();
        BigDecimal bPerSqFtHigh = benchmarkRate.getMaxRate();

        check.setBenchmarkPerSqFt(new CostEstimationResponseDto.CostRangeDto(bPerSqFtLow, bPerSqFtAvg, bPerSqFtHigh));

        // Effective area = above ground area + basementArea * basementFactor
        BigDecimal bTotalLow = bPerSqFtLow.multiply(totalConstructedArea).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bTotalAvg = bPerSqFtAvg.multiply(totalConstructedArea).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bTotalHigh = bPerSqFtHigh.multiply(totalConstructedArea).setScale(2, RoundingMode.HALF_UP);

        check.setBenchmarkTotal(new CostEstimationResponseDto.CostRangeDto(bTotalLow, bTotalAvg, bTotalHigh));
        check.setComponentEstimate(new CostEstimationResponseDto.CostRangeDto(
                bTotalLow, componentAverage, bTotalHigh));

        BigDecimal diff = componentAverage.subtract(bTotalAvg).abs();
        BigDecimal divergencePercentage = (bTotalAvg.compareTo(BigDecimal.ZERO) > 0)
                ? diff.divide(bTotalAvg, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        check.setDivergencePercentage(divergencePercentage);

        if (divergencePercentage.compareTo(new BigDecimal("15.00")) > 0) {
            check.setStatus("DIVERGENT");
            check.setMessage("Component estimate differs materially from the stored structural benchmark by " + divergencePercentage + "%.");
            warnings.add("Component estimate differs materially from the stored structural benchmark (" + divergencePercentage + "% divergence).");
        } else {
            check.setStatus("ALIGNED");
            check.setMessage("Component estimate aligns within acceptable tolerance (" + divergencePercentage + "% divergence) of CPWD Plinth Area benchmark.");
        }

        return check;
    }

    // ========================================================
    // HELPER: PROVENANCE EXTRACTION
    // ========================================================

    private List<CostEstimationResponseDto.SourceProvenanceDto> extractProvenance(
            Map<String, CostEstimatorRate> rates, String defaultTier) {

        Map<String, CostEstimationResponseDto.SourceProvenanceDto> provenanceMap = new LinkedHashMap<>();

        for (CostEstimatorRate r : rates.values()) {
            String key = r.getRateSource() + "::" + r.getComponentCategory();
            if (!provenanceMap.containsKey(key)) {
                String tier = r.getCity() != null ? "CITY" : (r.getDistrict() != null ? "DISTRICT" : (r.getState().equals("NATIONAL_DEFAULT") ? "NATIONAL_DEFAULT" : "STATE_DEFAULT"));
                provenanceMap.put(key, new CostEstimationResponseDto.SourceProvenanceDto(
                        r.getComponentName(), r.getComponentCategory(), r.getRateSource(), r.getSourceUrl(), r.getRateDate(), tier));
            }
        }
        return new ArrayList<>(provenanceMap.values());
    }

    private String getFloorName(int floor) {
        if (floor == 0) return "Ground Floor";
        if (floor == 1) return "First Floor";
        if (floor == 2) return "Second Floor";
        if (floor == 3) return "Third Floor";
        if (floor == 4) return "Fourth Floor";
        if (floor == 5) return "Fifth Floor";
        return (floor + 1) + "th Floor";
    }
}
