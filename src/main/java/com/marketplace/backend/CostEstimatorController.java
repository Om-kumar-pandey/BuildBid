package com.marketplace.backend;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller for the BuildBid Cost Estimator (Step 3 & Phase 5).
 *
 * Exposes:
 * 1. POST /api/cost-estimator/calculate & POST /api/public/cost-estimator/calculate:
 *    Authoritative construction cost calculation endpoint.
 * 2. GET /api/cost-estimator/room-standards & GET /api/public/cost-estimator/room-standards:
 *    Authoritative room planning benchmarks and allowance factors.
 */
@RestController
@RequestMapping({"/api/cost-estimator", "/api/public/cost-estimator"})
@CrossOrigin(origins = "*")
public class CostEstimatorController {

    private static final Logger log = LoggerFactory.getLogger(CostEstimatorController.class);

    private final CostEstimatorService costEstimatorService;

    public CostEstimatorController(CostEstimatorService costEstimatorService) {
        this.costEstimatorService = costEstimatorService;
    }

    /**
     * Calculates project construction cost estimate.
     */
    @PostMapping("/calculate")
    public ResponseEntity<CostEstimationResponseDto> calculateEstimate(
            @Valid @RequestBody CostEstimationRequestDto request) {

        log.info("Received cost estimation request: projectType={}, state={}, city={}, floors={}, totalArea={}",
                request.getProjectType(), request.getState(), request.getCity(),
                request.getNumberOfFloors(), request.getTotalBuildUpAreaSqFt());

        CostEstimationResponseDto response = costEstimatorService.calculate(request);

        if (!response.isSuccess()) {
            if ("RATES_UNAVAILABLE".equals(response.getErrorCode())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Exposes authoritative standard room planning dimensions and benchmarks (Phase 5).
     */
    @GetMapping("/room-standards")
    public ResponseEntity<Map<String, Object>> getRoomStandards() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "standards", StandardRoomPlanningConfig.getAllBenchmarks(),
                "defaultPlanningAllowanceRatio", StandardRoomPlanningConfig.DEFAULT_PLANNING_ALLOWANCE_RATIO,
                "description", "BuildBid standard room planning benchmarks and circulation allowances"
        ));
    }
}
