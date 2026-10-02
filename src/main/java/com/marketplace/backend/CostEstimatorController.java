package com.marketplace.backend;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for the BuildBid Cost Estimator (Step 3).
 *
 * Exposes the server-side authoritative calculation endpoint:
 * POST /api/cost-estimator/calculate
 * (Also accessible via /api/public/cost-estimator/calculate for unauthenticated estimation)
 *
 * Read-only with respect to rate and project databases:
 * Never alters cost_estimator_rates or projects tables.
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

        log.info("Received cost estimation request: projectType={}, state={}, city={}, floors={}, builtUpAreaSqFt={}",
                request.getProjectType(), request.getState(), request.getCity(),
                request.getNumberOfFloors(), request.getBuiltUpAreaSqFt());

        CostEstimationResponseDto response = costEstimatorService.calculate(request);

        if (!response.isSuccess()) {
            if ("RATES_UNAVAILABLE".equals(response.getErrorCode())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }
}
