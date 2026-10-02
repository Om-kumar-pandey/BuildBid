package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * BUILDBID COST ESTIMATOR - CALCULATION ENGINE (Step 3 & Phase 2-20)
 *
 * Implements server-side authoritative construction cost estimation using ONLY the
 * single master table cost_estimator_rates.
 *
 * Upgraded capabilities:
 * 1. Semantic distinction between totalBuildUpAreaSqFt, declared floor areas, basement area, and room programs.
 * 2. Floor-by-floor area validation: Ground Floor <= Total Build-up Area, Aggregate Floors <= Total Build-up Area.
 * 3. Independent basement area validation when basement is requested.
 * 4. Floor copy model (SAME_AS_FIRST_FLOOR, SAME_AS_PREVIOUS_FLOOR) with deep-copy safety and circular reference rejection.
 * 5. Standard room planning benchmarks and custom dimension overrides.
 * 6. Room program area calculation and floor capacity verification (with configurable planning allowance).
 * 7. Room-driven cost impact for internal partitions, sanitary/plumbing, electrical points, and finishes.
 * 8. Strict estimate locking: refuse calculation with structured validation errors when inputs are invalid.
 * 9. Legacy compatibility preserved for callers without explicit floor requirements.
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

        // 1. Validate inputs and resolve floor requirements
        ResolvedFloorBundle floorBundle = new ResolvedFloorBundle();
        CostEstimationResponseDto validationError = validateAndResolveRequest(request, floorBundle);
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

        // 4. Calculate areas (Server-Authoritative)
        BigDecimal totalAboveGroundArea = floorBundle.totalAboveGroundArea;
        BigDecimal basementArea = (request.getBasementAreaSqFt() != null && request.getBasementAreaSqFt().compareTo(BigDecimal.ZERO) > 0)
                ? request.getBasementAreaSqFt().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal totalConstructedArea = totalAboveGroundArea.add(basementArea).setScale(2, RoundingMode.HALF_UP);
        BigDecimal typicalFloorArea = floorBundle.typicalFloorArea;

        CostEstimationResponseDto.AreaBreakdownDto areaDto = new CostEstimationResponseDto.AreaBreakdownDto(
                typicalFloorArea, totalAboveGroundArea, basementArea, totalConstructedArea);
        areaDto.setDeclaredTotalBuildUpAreaSqFt(floorBundle.declaredTotalBuildUpArea);
        areaDto.setDeclaredFloorsAggregateAreaSqFt(totalAboveGroundArea);
        areaDto.setTotalRoomProgramAreaSqFt(floorBundle.totalRoomProgramArea);
        areaDto.setTotalPlanningAllowanceSqFt(floorBundle.totalPlanningAllowance);

        // 5. Query structural benchmark for sanity check
        CostEstimatorRate benchmarkRate = findBenchmarkRate(resolution.rates, projectType);

        // 6. Floor-by-floor calculation with vertical progressive escalation
        List<CostEstimationResponseDto.FloorCostDto> floorList = new ArrayList<>();
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

        int floorsCount = floorBundle.resolvedFloors.size();

        for (int floorIndex = 0; floorIndex < floorsCount; floorIndex++) {
            FloorRequirementDto floorReq = floorBundle.resolvedFloors.get(floorIndex);
            String floorName = floorReq.getFloorName() != null ? floorReq.getFloorName() : getFloorName(floorIndex);
            BigDecimal floorArea = floorReq.getDeclaredAreaSqFt();

            BigDecimal floorLabourFactor;
            BigDecimal floorTransFactor;
            BigDecimal floorMachFactor;

            if (floorIndex == 0) {
                // Ground Floor (baseline)
                floorLabourFactor = BigDecimal.ONE;
                floorTransFactor = BigDecimal.ONE;
                floorMachFactor = BigDecimal.ONE;
            } else if (floorIndex == 1) {
                // First Floor
                floorLabourFactor = factors.firstFloorLabourFactor;
                floorTransFactor = new BigDecimal("1.0200");
                floorMachFactor = new BigDecimal("1.0150");
            } else {
                // Upper Floors: progressive vertical escalation
                int heightStep = floorIndex - 1;
                BigDecimal labourStep = factors.upperFloorLabourFactor.subtract(BigDecimal.ONE).multiply(BigDecimal.valueOf(heightStep));
                floorLabourFactor = BigDecimal.ONE.add(labourStep);

                BigDecimal transStep = factors.upperFloorTransFactor.subtract(BigDecimal.ONE).multiply(BigDecimal.valueOf(heightStep));
                floorTransFactor = BigDecimal.ONE.add(transStep);

                BigDecimal machStep = factors.upperFloorMachFactor.subtract(BigDecimal.ONE).multiply(BigDecimal.valueOf(heightStep));
                floorMachFactor = BigDecimal.ONE.add(machStep);
            }

            BigDecimal fMatLow = BigDecimal.ZERO;
            BigDecimal fMatAvg = BigDecimal.ZERO;
            BigDecimal fMatHigh = BigDecimal.ZERO;

            BigDecimal fLabLow = BigDecimal.ZERO;
            BigDecimal fLabAvg = BigDecimal.ZERO;
            BigDecimal fLabHigh = BigDecimal.ZERO;

            BigDecimal fTrLow = BigDecimal.ZERO;
            BigDecimal fTrAvg = BigDecimal.ZERO;
            BigDecimal fTrHigh = BigDecimal.ZERO;

            BigDecimal fMcLow = BigDecimal.ZERO;
            BigDecimal fMcAvg = BigDecimal.ZERO;
            BigDecimal fMcHigh = BigDecimal.ZERO;

            BigDecimal fStLow = BigDecimal.ZERO;
            BigDecimal fStAvg = BigDecimal.ZERO;
            BigDecimal fStHigh = BigDecimal.ZERO;

            if (benchmarkRate != null) {
                fMatLow = benchmarkRate.getMinRate().multiply(floorArea).multiply(new BigDecimal("0.58")).setScale(2, RoundingMode.HALF_UP);
                fMatAvg = benchmarkRate.getAverageRate().multiply(floorArea).multiply(new BigDecimal("0.58")).setScale(2, RoundingMode.HALF_UP);
                fMatHigh = benchmarkRate.getMaxRate().multiply(floorArea).multiply(new BigDecimal("0.58")).setScale(2, RoundingMode.HALF_UP);

                fLabLow = benchmarkRate.getMinRate().multiply(floorArea).multiply(new BigDecimal("0.28")).multiply(floorLabourFactor).setScale(2, RoundingMode.HALF_UP);
                fLabAvg = benchmarkRate.getAverageRate().multiply(floorArea).multiply(new BigDecimal("0.28")).multiply(floorLabourFactor).setScale(2, RoundingMode.HALF_UP);
                fLabHigh = benchmarkRate.getMaxRate().multiply(floorArea).multiply(new BigDecimal("0.28")).multiply(floorLabourFactor).setScale(2, RoundingMode.HALF_UP);

                fTrLow = benchmarkRate.getMinRate().multiply(floorArea).multiply(new BigDecimal("0.05")).multiply(floorTransFactor).setScale(2, RoundingMode.HALF_UP);
                fTrAvg = benchmarkRate.getAverageRate().multiply(floorArea).multiply(new BigDecimal("0.05")).multiply(floorTransFactor).setScale(2, RoundingMode.HALF_UP);
                fTrHigh = benchmarkRate.getMaxRate().multiply(floorArea).multiply(new BigDecimal("0.05")).multiply(floorTransFactor).setScale(2, RoundingMode.HALF_UP);

                fMcLow = benchmarkRate.getMinRate().multiply(floorArea).multiply(new BigDecimal("0.04")).multiply(floorMachFactor).setScale(2, RoundingMode.HALF_UP);
                fMcAvg = benchmarkRate.getAverageRate().multiply(floorArea).multiply(new BigDecimal("0.04")).multiply(floorMachFactor).setScale(2, RoundingMode.HALF_UP);
                fMcHigh = benchmarkRate.getMaxRate().multiply(floorArea).multiply(new BigDecimal("0.04")).multiply(floorMachFactor).setScale(2, RoundingMode.HALF_UP);

                fStLow = benchmarkRate.getMinRate().multiply(floorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
                fStAvg = benchmarkRate.getAverageRate().multiply(floorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
                fStHigh = benchmarkRate.getMaxRate().multiply(floorArea).multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
            }

            BigDecimal fTotalLow = fMatLow.add(fLabLow).add(fTrLow).add(fMcLow).add(fStLow);
            BigDecimal fTotalAvg = fMatAvg.add(fLabAvg).add(fTrAvg).add(fMcAvg).add(fStAvg);
            BigDecimal fTotalHigh = fMatHigh.add(fLabHigh).add(fTrHigh).add(fMcHigh).add(fStHigh);

            BigDecimal compositeFactor = (fMatAvg.compareTo(BigDecimal.ZERO) > 0)
                    ? fTotalAvg.divide(fMatAvg.add(benchmarkRate != null ? benchmarkRate.getAverageRate().multiply(floorArea).multiply(new BigDecimal("0.42")) : BigDecimal.ONE), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ONE;

            CostEstimationResponseDto.FloorCostDto fCostDto = new CostEstimationResponseDto.FloorCostDto(
                    floorIndex, floorName, floorArea, fTotalLow, fTotalAvg, fTotalHigh, compositeFactor);

            fCostDto.setDeclaredAreaSqFt(floorArea);
            fCostDto.setCopyMode(floorReq.getCopyMode());
            fCostDto.setSourceFloor(floorReq.getSourceFloor());
            fCostDto.setRooms(floorReq.getRooms());

            // Room program calculations for this floor
            FloorProgramDetails floorProg = floorBundle.floorPrograms.get(floorIndex);
            if (floorProg != null) {
                fCostDto.setRoomProgramAreaSqFt(floorProg.roomProgramArea);
                fCostDto.setPlanningAllowanceSqFt(floorProg.planningAllowance);
                fCostDto.setRequiredProgramAreaSqFt(floorProg.requiredProgramArea);
                fCostDto.setRemainingCapacitySqFt(floorArea.subtract(floorProg.requiredProgramArea));
                fCostDto.setCapacityStatus(floorProg.isValidCapacity ? "VALID" : "CAPACITY_EXCEEDED");
            } else {
                fCostDto.setCapacityStatus("VALID");
            }

            floorList.add(fCostDto);

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

        // 9. Room-Driven Measurable Cost Integration (Phases 14, 17, 18, 19)
        RoomCostImpact roomCostImpact = calculateRoomCostImpact(floorBundle, resolution.rates);

        // Aggregate Category Breakdown & Contingency
        CostEstimationResponseDto.CostBreakdownDto breakdownDto = new CostEstimationResponseDto.CostBreakdownDto();

        BigDecimal finalMatLow = cumMaterialLow.add(roomCostImpact.materialLow);
        BigDecimal finalMatAvg = cumMaterialAvg.add(roomCostImpact.materialAvg);
        BigDecimal finalMatHigh = cumMaterialHigh.add(roomCostImpact.materialHigh);

        BigDecimal finalLabLow = cumLabourLow.add(roomCostImpact.labourLow);
        BigDecimal finalLabAvg = cumLabourAvg.add(roomCostImpact.labourAvg);
        BigDecimal finalLabHigh = cumLabourHigh.add(roomCostImpact.labourHigh);

        breakdownDto.setMaterial(new CostEstimationResponseDto.CostRangeDto(finalMatLow, finalMatAvg, finalMatHigh));
        breakdownDto.setLabour(new CostEstimationResponseDto.CostRangeDto(finalLabLow, finalLabAvg, finalLabHigh));
        breakdownDto.setTransportation(new CostEstimationResponseDto.CostRangeDto(cumTransLow, cumTransAvg, cumTransHigh));
        breakdownDto.setMachinery(new CostEstimationResponseDto.CostRangeDto(cumMachLow, cumMachAvg, cumMachHigh));
        breakdownDto.setStructural(new CostEstimationResponseDto.CostRangeDto(cumStructLow, cumStructAvg, cumStructHigh));
        breakdownDto.setBasement(new CostEstimationResponseDto.CostRangeDto(
                basementDto.getLow(), basementDto.getAverage(), basementDto.getHigh()));

        if (roomCostImpact.hasRoomImpact) {
            breakdownDto.setInternalPartitions(new CostEstimationResponseDto.CostRangeDto(
                    roomCostImpact.partitionLow, roomCostImpact.partitionAvg, roomCostImpact.partitionHigh));
            breakdownDto.setSanitaryPlumbing(new CostEstimationResponseDto.CostRangeDto(
                    roomCostImpact.sanitaryLow, roomCostImpact.sanitaryAvg, roomCostImpact.sanitaryHigh));
            breakdownDto.setElectricalPoints(new CostEstimationResponseDto.CostRangeDto(
                    roomCostImpact.electricalLow, roomCostImpact.electricalAvg, roomCostImpact.electricalHigh));
        }

        // Subtotal before contingency
        BigDecimal subtotalLow = finalMatLow.add(finalLabLow).add(cumTransLow).add(cumMachLow).add(cumStructLow).add(basementDto.getLow());
        BigDecimal subtotalAvg = finalMatAvg.add(finalLabAvg).add(cumTransAvg).add(cumMachAvg).add(cumStructAvg).add(basementDto.getAverage());
        BigDecimal subtotalHigh = finalMatHigh.add(finalLabHigh).add(cumTransHigh).add(cumMachHigh).add(cumStructHigh).add(basementDto.getHigh());

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
    // HELPER: FLOOR & AREA VALIDATION + COPY RESOLUTION (PHASES 2-16)
    // ========================================================

    private static class FloorProgramDetails {
        BigDecimal roomProgramArea = BigDecimal.ZERO;
        BigDecimal planningAllowance = BigDecimal.ZERO;
        BigDecimal requiredProgramArea = BigDecimal.ZERO;
        boolean isValidCapacity = true;
    }

    private static class ResolvedFloorBundle {
        BigDecimal declaredTotalBuildUpArea = BigDecimal.ZERO;
        BigDecimal totalAboveGroundArea = BigDecimal.ZERO;
        BigDecimal typicalFloorArea = BigDecimal.ZERO;
        BigDecimal totalRoomProgramArea = BigDecimal.ZERO;
        BigDecimal totalPlanningAllowance = BigDecimal.ZERO;
        List<FloorRequirementDto> resolvedFloors = new ArrayList<>();
        Map<Integer, FloorProgramDetails> floorPrograms = new HashMap<>();
    }

    private CostEstimationResponseDto validateAndResolveRequest(CostEstimationRequestDto req, ResolvedFloorBundle bundle) {
        // Basic project type validation
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

        // Quality tier validation
        if (req.getQualityTier() != null && !req.getQualityTier().trim().isEmpty() &&
                !req.getQualityTier().trim().equalsIgnoreCase("STANDARD")) {
            return CostEstimationResponseDto.failure(
                    "Only STANDARD quality tier is currently verified. Other quality tiers will be supported in future releases.",
                    "INVALID_QUALITY_TIER"
            );
        }

        // Floor count validation
        if (req.getNumberOfFloors() == null || req.getNumberOfFloors() < 1) {
            return CostEstimationResponseDto.failure("Number of floors must be at least 1.", "INVALID_FLOOR_COUNT");
        }
        if (req.getNumberOfFloors() > 100) {
            return CostEstimationResponseDto.failure("Number of floors cannot exceed 100.", "FLOOR_COUNT_LIMIT_EXCEEDED");
        }
        int floorCount = req.getNumberOfFloors();

        // Total Build-up Area Envelope Validation (Phase 2 & 4)
        BigDecimal totalBuildUp = req.getTotalBuildUpAreaSqFt();
        if (totalBuildUp == null || totalBuildUp.compareTo(BigDecimal.ZERO) <= 0) {
            totalBuildUp = req.getBuiltUpAreaSqFt();
        }
        if (totalBuildUp == null || totalBuildUp.compareTo(BigDecimal.ZERO) <= 0) {
            return CostEstimationResponseDto.validationFailure(
                    "Total Build-up Area is required and must be greater than zero.",
                    "INVALID_BUILT_UP_AREA",
                    List.of(new CostEstimationResponseDto.ValidationErrorDto("totalBuildUpAreaSqFt", "INVALID_BUILT_UP_AREA", "Total Build-up Area must be greater than zero."))
            );
        }
        bundle.declaredTotalBuildUpArea = totalBuildUp.setScale(2, RoundingMode.HALF_UP);

        // Basement Area Validation (Phase 3 & 10)
        boolean hasBasement = Boolean.TRUE.equals(req.getHasBasement()) ||
                (req.getBasementAreaSqFt() != null && req.getBasementAreaSqFt().compareTo(BigDecimal.ZERO) > 0);

        if (hasBasement) {
            if (req.getBasementAreaSqFt() == null || req.getBasementAreaSqFt().compareTo(BigDecimal.ZERO) <= 0) {
                return CostEstimationResponseDto.validationFailure(
                        "Basement is enabled. Please enter the approximate Basement Build-up Area.",
                        "BASEMENT_AREA_REQUIRED",
                        List.of(new CostEstimationResponseDto.ValidationErrorDto("basementAreaSqFt", "BASEMENT_AREA_REQUIRED", "Basement is enabled. Please enter the approximate Basement Build-up Area."))
                );
            }
        }
        if (req.getBasementAreaSqFt() != null && req.getBasementAreaSqFt().compareTo(BigDecimal.ZERO) < 0) {
            return CostEstimationResponseDto.failure("Basement area cannot be negative.", "INVALID_BASEMENT_AREA");
        }

        // Planning allowance ratio (default 20%)
        BigDecimal planningAllowanceRatio = req.getPlanningAllowanceRatio() != null
                ? req.getPlanningAllowanceRatio()
                : StandardRoomPlanningConfig.DEFAULT_PLANNING_ALLOWANCE_RATIO;

        List<FloorRequirementDto> inputFloors = req.getFloors();

        // Case A: Explicit floor-by-floor requirements provided
        if (inputFloors != null && !inputFloors.isEmpty()) {
            List<CostEstimationResponseDto.ValidationErrorDto> errors = new ArrayList<>();

            // Build map of inputs by floor number
            Map<Integer, FloorRequirementDto> floorInputMap = new LinkedHashMap<>();
            for (FloorRequirementDto f : inputFloors) {
                if (f.getFloorNumber() != null) {
                    floorInputMap.put(f.getFloorNumber(), f);
                }
            }

            // Resolve floors 0 to floorCount - 1 in sequential order
            List<FloorRequirementDto> resolvedList = new ArrayList<>();

            for (int i = 0; i < floorCount; i++) {
                FloorRequirementDto inputF = floorInputMap.get(i);
                if (inputF == null && i < inputFloors.size()) {
                    inputF = inputFloors.get(i);
                }

                String floorName = inputF != null && inputF.getFloorName() != null ? inputF.getFloorName() : getFloorName(i);
                String copyMode = inputF != null && inputF.getCopyMode() != null ? inputF.getCopyMode() : FloorRequirementDto.COPY_MODE_MANUAL;

                FloorRequirementDto resolvedF;

                if (i == 0) {
                    // Ground floor must be manual
                    if (inputF == null || inputF.getDeclaredAreaSqFt() == null || inputF.getDeclaredAreaSqFt().compareTo(BigDecimal.ZERO) <= 0) {
                        errors.add(new CostEstimationResponseDto.ValidationErrorDto(
                                "groundFloorArea", "GROUND_AREA_REQUIRED", "Ground Floor Area must be greater than zero.", 0));
                        return CostEstimationResponseDto.validationFailure("Ground Floor Area must be greater than zero.", "GROUND_AREA_REQUIRED", errors);
                    }

                    BigDecimal groundArea = inputF.getDeclaredAreaSqFt();
                    // Ground Floor Area <= Total Build-up Area (Phase 2 & 4)
                    if (groundArea.compareTo(bundle.declaredTotalBuildUpArea) > 0) {
                        errors.add(new CostEstimationResponseDto.ValidationErrorDto(
                                "groundFloorArea", "GROUND_AREA_EXCEEDS_TOTAL", "Ground Floor Area cannot exceed Total Build-up Area.", 0));
                        return CostEstimationResponseDto.validationFailure("Ground Floor Area cannot exceed Total Build-up Area.", "GROUND_AREA_EXCEEDS_TOTAL", errors);
                    }

                    resolvedF = inputF.deepCopy(0, floorName, FloorRequirementDto.COPY_MODE_MANUAL, null);

                } else if (FloorRequirementDto.COPY_MODE_SAME_AS_FIRST.equalsIgnoreCase(copyMode)) {
                    // Same as First Floor
                    if (resolvedList.size() < 2) {
                        errors.add(new CostEstimationResponseDto.ValidationErrorDto(
                                "copyMode", "FIRST_FLOOR_INCOMPLETE", "Please complete First Floor requirements before copying them to another floor.", i));
                        return CostEstimationResponseDto.validationFailure("Please complete First Floor requirements before copying them to another floor.", "FIRST_FLOOR_INCOMPLETE", errors);
                    }
                    FloorRequirementDto firstFloor = resolvedList.get(1);
                    resolvedF = firstFloor.deepCopy(i, floorName, FloorRequirementDto.COPY_MODE_SAME_AS_FIRST, 1);

                } else if (FloorRequirementDto.COPY_MODE_SAME_AS_PREVIOUS.equalsIgnoreCase(copyMode)) {
                    // Same as Previous Floor
                    if (resolvedList.isEmpty()) {
                        errors.add(new CostEstimationResponseDto.ValidationErrorDto(
                                "copyMode", "PREVIOUS_FLOOR_INCOMPLETE", "Previous floor configuration could not be resolved.", i));
                        return CostEstimationResponseDto.validationFailure("Previous floor configuration could not be resolved.", "PREVIOUS_FLOOR_INCOMPLETE", errors);
                    }
                    FloorRequirementDto prevFloor = resolvedList.get(i - 1);
                    resolvedF = prevFloor.deepCopy(i, floorName, FloorRequirementDto.COPY_MODE_SAME_AS_PREVIOUS, i - 1);

                } else {
                    // Manual mode for upper floor
                    if (inputF == null || inputF.getDeclaredAreaSqFt() == null || inputF.getDeclaredAreaSqFt().compareTo(BigDecimal.ZERO) <= 0) {
                        errors.add(new CostEstimationResponseDto.ValidationErrorDto(
                                "declaredAreaSqFt", "FLOOR_AREA_REQUIRED", "Floor area for " + floorName + " must be greater than zero.", i));
                        return CostEstimationResponseDto.validationFailure("Floor area for " + floorName + " must be greater than zero.", "FLOOR_AREA_REQUIRED", errors);
                    }
                    resolvedF = inputF.deepCopy(i, floorName, FloorRequirementDto.COPY_MODE_MANUAL, null);
                }

                if (resolvedF.getDeclaredAreaSqFt() != null) {
                    resolvedF.setDeclaredAreaSqFt(resolvedF.getDeclaredAreaSqFt().setScale(2, RoundingMode.HALF_UP));
                }

                resolvedList.add(resolvedF);
            }

            // Aggregate floor area validation: sum(floor areas) <= totalBuildUpArea (Phase 2 & 9)
            BigDecimal aggregateFloorArea = BigDecimal.ZERO;
            for (FloorRequirementDto f : resolvedList) {
                aggregateFloorArea = aggregateFloorArea.add(f.getDeclaredAreaSqFt());
            }

            if (aggregateFloorArea.compareTo(bundle.declaredTotalBuildUpArea) > 0) {
                errors.add(new CostEstimationResponseDto.ValidationErrorDto(
                        "aggregateFloorArea", "AGGREGATE_AREA_EXCEEDS_TOTAL",
                        "Total above-ground floor area (" + aggregateFloorArea.setScale(0, RoundingMode.HALF_UP) +
                                " sq ft) exceeds the declared Total Build-up Area (" + bundle.declaredTotalBuildUpArea.setScale(0, RoundingMode.HALF_UP) + " sq ft). Please adjust floor distribution."));
                return CostEstimationResponseDto.validationFailure(
                        "Total above-ground floor area exceeds the declared Total Build-up Area.", "AGGREGATE_AREA_EXCEEDS_TOTAL", errors);
            }

            // Room Program & Floor Capacity Verification (Phases 13-16)
            for (int i = 0; i < resolvedList.size(); i++) {
                FloorRequirementDto f = resolvedList.get(i);
                FloorProgramDetails prog = calculateFloorProgram(f, planningAllowanceRatio);
                bundle.floorPrograms.put(i, prog);

                bundle.totalRoomProgramArea = bundle.totalRoomProgramArea.add(prog.roomProgramArea);
                bundle.totalPlanningAllowance = bundle.totalPlanningAllowance.add(prog.planningAllowance);

                // Capacity check: requiredFloorArea <= declaredFloorArea
                if (prog.roomProgramArea.compareTo(BigDecimal.ZERO) > 0 && prog.requiredProgramArea.compareTo(f.getDeclaredAreaSqFt()) > 0) {
                    prog.isValidCapacity = false;
                    String errMsg = "Your selected room requirements for " + f.getFloorName() + " require approximately " +
                            prog.requiredProgramArea.setScale(0, RoundingMode.HALF_UP) + " sq ft (including planning/circulation allowance), but this floor is only " +
                            f.getDeclaredAreaSqFt().setScale(0, RoundingMode.HALF_UP) + " sq ft. Please increase the floor area or adjust room requirements.";
                    errors.add(new CostEstimationResponseDto.ValidationErrorDto(
                            "roomProgram", "ROOM_PROGRAM_EXCEEDS_FLOOR_CAPACITY", errMsg, i));
                    return CostEstimationResponseDto.validationFailure(errMsg, "ROOM_PROGRAM_EXCEEDS_FLOOR_CAPACITY", errors);
                }
            }

            bundle.resolvedFloors = resolvedList;
            bundle.totalAboveGroundArea = aggregateFloorArea.setScale(2, RoundingMode.HALF_UP);
            bundle.typicalFloorArea = resolvedList.get(0).getDeclaredAreaSqFt().setScale(2, RoundingMode.HALF_UP);

        } else {
            // Case B: Legacy request (no explicit floor list supplied)
            // Preserve existing fallback behavior: typicalFloorArea = totalBuildUp
            BigDecimal typicalFloorArea = bundle.declaredTotalBuildUpArea;
            BigDecimal totalAboveGround = typicalFloorArea.multiply(BigDecimal.valueOf(floorCount)).setScale(2, RoundingMode.HALF_UP);

            List<FloorRequirementDto> legacyFloors = new ArrayList<>();
            for (int i = 0; i < floorCount; i++) {
                FloorRequirementDto f = new FloorRequirementDto(i, getFloorName(i), typicalFloorArea);
                legacyFloors.add(f);
            }

            bundle.resolvedFloors = legacyFloors;
            bundle.totalAboveGroundArea = totalAboveGround;
            bundle.typicalFloorArea = typicalFloorArea;
        }

        return null;
    }

    private FloorProgramDetails calculateFloorProgram(FloorRequirementDto floor, BigDecimal planningAllowanceRatio) {
        FloorProgramDetails prog = new FloorProgramDetails();
        if (floor.getRooms() == null || floor.getRooms().isEmpty()) {
            return prog;
        }

        BigDecimal sumRoomArea = BigDecimal.ZERO;
        Map<String, CustomRoomDimensionDto> customDims = floor.getCustomDimensions() != null
                ? floor.getCustomDimensions()
                : Collections.emptyMap();

        for (Map.Entry<String, Integer> entry : floor.getRooms().entrySet()) {
            String roomName = entry.getKey();
            int qty = entry.getValue() != null ? entry.getValue() : 0;
            if (qty <= 0) continue;

            for (int instance = 1; instance <= qty; instance++) {
                String dimKey = roomName + "_" + instance;
                CustomRoomDimensionDto customDim = customDims.get(dimKey);

                BigDecimal effectiveArea;
                if (customDim != null && customDim.getAreaSqFt() != null && customDim.getAreaSqFt().compareTo(BigDecimal.ZERO) > 0) {
                    effectiveArea = customDim.getAreaSqFt();
                } else if (customDim != null && customDim.getLengthFt() != null && customDim.getWidthFt() != null
                        && customDim.getLengthFt().compareTo(BigDecimal.ZERO) > 0 && customDim.getWidthFt().compareTo(BigDecimal.ZERO) > 0) {
                    effectiveArea = customDim.getLengthFt().multiply(customDim.getWidthFt()).setScale(2, RoundingMode.HALF_UP);
                } else {
                    effectiveArea = StandardRoomPlanningConfig.resolveEffectiveRoomArea(roomName, null, null, null);
                }

                sumRoomArea = sumRoomArea.add(effectiveArea);
            }
        }

        prog.roomProgramArea = sumRoomArea.setScale(2, RoundingMode.HALF_UP);
        prog.planningAllowance = prog.roomProgramArea.multiply(planningAllowanceRatio).setScale(2, RoundingMode.HALF_UP);
        prog.requiredProgramArea = prog.roomProgramArea.add(prog.planningAllowance).setScale(2, RoundingMode.HALF_UP);
        return prog;
    }

    // ========================================================
    // HELPER: ROOM-DRIVEN MEASURABLE COST IMPACT (PHASES 17-20)
    // ========================================================

    private static class RoomCostImpact {
        boolean hasRoomImpact = false;
        BigDecimal materialLow = BigDecimal.ZERO;
        BigDecimal materialAvg = BigDecimal.ZERO;
        BigDecimal materialHigh = BigDecimal.ZERO;

        BigDecimal labourLow = BigDecimal.ZERO;
        BigDecimal labourAvg = BigDecimal.ZERO;
        BigDecimal labourHigh = BigDecimal.ZERO;

        BigDecimal partitionLow = BigDecimal.ZERO;
        BigDecimal partitionAvg = BigDecimal.ZERO;
        BigDecimal partitionHigh = BigDecimal.ZERO;

        BigDecimal sanitaryLow = BigDecimal.ZERO;
        BigDecimal sanitaryAvg = BigDecimal.ZERO;
        BigDecimal sanitaryHigh = BigDecimal.ZERO;

        BigDecimal electricalLow = BigDecimal.ZERO;
        BigDecimal electricalAvg = BigDecimal.ZERO;
        BigDecimal electricalHigh = BigDecimal.ZERO;
    }

    private RoomCostImpact calculateRoomCostImpact(ResolvedFloorBundle bundle, Map<String, CostEstimatorRate> rates) {
        RoomCostImpact impact = new RoomCostImpact();

        int totalBedrooms = 0;
        int totalBathrooms = 0;
        int totalKitchens = 0;
        int totalOtherRooms = 0;

        for (FloorRequirementDto f : bundle.resolvedFloors) {
            if (f.getRooms() != null) {
                for (Map.Entry<String, Integer> e : f.getRooms().entrySet()) {
                    int qty = e.getValue() != null ? e.getValue() : 0;
                    if (qty <= 0) continue;
                    String rName = e.getKey().toUpperCase();
                    if (rName.contains("BEDROOM")) {
                        totalBedrooms += qty;
                    } else if (rName.contains("BATH") || rName.contains("TOILET")) {
                        totalBathrooms += qty;
                    } else if (rName.contains("KITCHEN")) {
                        totalKitchens += qty;
                    } else if (!rName.contains("BALCONY") && !rName.contains("PARK")) {
                        totalOtherRooms += qty;
                    }
                }
            }
        }

        int totalEnclosedRooms = totalBedrooms + totalBathrooms + totalKitchens + totalOtherRooms;
        if (totalEnclosedRooms == 0) {
            return impact;
        }

        impact.hasRoomImpact = true;

        // Rates lookup from single master table
        CostEstimatorRate brickRate = findRate(rates, "MATERIAL", "Brick");
        CostEstimatorRate cementRate = findRate(rates, "MATERIAL", "Cement");
        CostEstimatorRate masonRate = findRate(rates, "LABOUR", "Mason");
        CostEstimatorRate plumberRate = findRate(rates, "LABOUR", "Plumber");
        CostEstimatorRate elecRate = findRate(rates, "LABOUR", "Electrician");

        // Benchmark unit costs if rates available
        BigDecimal brickAvg = brickRate != null ? brickRate.getAverageRate() : new BigDecimal("7500.00"); // per CUM
        BigDecimal cementAvg = cementRate != null ? cementRate.getAverageRate() : new BigDecimal("360.00"); // per Bag
        BigDecimal masonAvg = masonRate != null ? masonRate.getAverageRate() : new BigDecimal("850.00"); // per day
        BigDecimal plumberAvg = plumberRate != null ? plumberRate.getAverageRate() : new BigDecimal("850.00");
        BigDecimal elecAvg = elecRate != null ? elecRate.getAverageRate() : new BigDecimal("850.00");

        // 1. Internal Partition Wall Masonry & Plaster Impact
        // Approx 180 sq ft net partition wall per enclosed room (length ~18ft, ht 10ft)
        BigDecimal partitionWallArea = BigDecimal.valueOf(totalEnclosedRooms).multiply(new BigDecimal("180.0"));
        // Brickwork volume = area * 0.115m (4.5" wall) ~ 0.035 CUM per sq ft wall
        BigDecimal brickworkCum = partitionWallArea.multiply(new BigDecimal("0.035")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal partitionMatAvg = brickworkCum.multiply(brickAvg).add(partitionWallArea.multiply(new BigDecimal("0.08")).multiply(cementAvg)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal partitionLabAvg = partitionWallArea.multiply(new BigDecimal("0.025")).multiply(masonAvg).setScale(2, RoundingMode.HALF_UP);

        impact.partitionLow = partitionMatAvg.add(partitionLabAvg).multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP);
        impact.partitionAvg = partitionMatAvg.add(partitionLabAvg).setScale(2, RoundingMode.HALF_UP);
        impact.partitionHigh = partitionMatAvg.add(partitionLabAvg).multiply(new BigDecimal("1.10")).setScale(2, RoundingMode.HALF_UP);

        // 2. Bathroom Sanitary & Waterproofing Package
        // Fixtures, CP fittings, wall tile dado up to 7ft, plumbing lines ~ ₹28,000 avg per bathroom
        if (totalBathrooms > 0) {
            BigDecimal bathPkgAvg = BigDecimal.valueOf(totalBathrooms).multiply(new BigDecimal("28000.00"));
            BigDecimal bathMatAvg = bathPkgAvg.multiply(new BigDecimal("0.70")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal bathLabAvg = bathPkgAvg.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP);

            impact.sanitaryLow = bathPkgAvg.multiply(new BigDecimal("0.88")).setScale(2, RoundingMode.HALF_UP);
            impact.sanitaryAvg = bathPkgAvg.setScale(2, RoundingMode.HALF_UP);
            impact.sanitaryHigh = bathPkgAvg.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP);

            impact.materialAvg = impact.materialAvg.add(bathMatAvg);
            impact.materialLow = impact.materialLow.add(bathMatAvg.multiply(new BigDecimal("0.88")).setScale(2, RoundingMode.HALF_UP));
            impact.materialHigh = impact.materialHigh.add(bathMatAvg.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP));

            impact.labourAvg = impact.labourAvg.add(bathLabAvg);
            impact.labourLow = impact.labourLow.add(bathLabAvg.multiply(new BigDecimal("0.88")).setScale(2, RoundingMode.HALF_UP));
            impact.labourHigh = impact.labourHigh.add(bathLabAvg.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP));
        }

        // 3. Electrical Points Package per Room
        // ~8-10 points per room @ ~₹750 per point (piping, wire, switchboard, labour)
        BigDecimal elecPkgAvg = BigDecimal.valueOf(totalEnclosedRooms).multiply(new BigDecimal("6500.00"));
        BigDecimal elecMatAvg = elecPkgAvg.multiply(new BigDecimal("0.65")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal elecLabAvg = elecPkgAvg.multiply(new BigDecimal("0.35")).setScale(2, RoundingMode.HALF_UP);

        impact.electricalLow = elecPkgAvg.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP);
        impact.electricalAvg = elecPkgAvg.setScale(2, RoundingMode.HALF_UP);
        impact.electricalHigh = elecPkgAvg.multiply(new BigDecimal("1.12")).setScale(2, RoundingMode.HALF_UP);

        impact.materialAvg = impact.materialAvg.add(partitionMatAvg).add(elecMatAvg);
        impact.materialLow = impact.materialLow.add(partitionMatAvg.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP)).add(elecMatAvg.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP));
        impact.materialHigh = impact.materialHigh.add(partitionMatAvg.multiply(new BigDecimal("1.10")).setScale(2, RoundingMode.HALF_UP)).add(elecMatAvg.multiply(new BigDecimal("1.12")).setScale(2, RoundingMode.HALF_UP));

        impact.labourAvg = impact.labourAvg.add(partitionLabAvg).add(elecLabAvg);
        impact.labourLow = impact.labourLow.add(partitionLabAvg.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP)).add(elecLabAvg.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP));
        impact.labourHigh = impact.labourHigh.add(partitionLabAvg.multiply(new BigDecimal("1.10")).setScale(2, RoundingMode.HALF_UP)).add(elecLabAvg.multiply(new BigDecimal("1.12")).setScale(2, RoundingMode.HALF_UP));

        return impact;
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
            return totalArea.multiply(new BigDecimal("0.42"));
        } else if (name.contains("tmt steel")) {
            BigDecimal coef = "COMMERCIAL_CONSTRUCTION".equals(projectType) ? new BigDecimal("5.50") : new BigDecimal("4.00");
            return totalArea.multiply(coef);
        } else if (name.contains("sand")) {
            return totalArea.multiply(new BigDecimal("0.045"));
        } else if (name.contains("aggregate")) {
            return totalArea.multiply(new BigDecimal("0.038"));
        } else if (name.contains("brick")) {
            return totalArea.multiply(new BigDecimal("0.036"));
        } else if (name.contains("aac block")) {
            return totalArea.multiply(new BigDecimal("0.035"));
        } else if (name.contains("ready mix concrete")) {
            return totalArea.multiply(new BigDecimal("0.025"));
        } else if (name.contains("structural steel")) {
            BigDecimal coef = "INDUSTRIAL_WAREHOUSE".equals(projectType) ? new BigDecimal("6.50") : new BigDecimal("2.50");
            return totalArea.multiply(coef);

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
