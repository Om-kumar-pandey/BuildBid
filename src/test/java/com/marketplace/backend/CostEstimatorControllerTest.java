package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * UNIT TESTS FOR COST ESTIMATOR REST CONTROLLER (Step 3)
 *
 * Verifies:
 * 1. HTTP 200 OK on successful estimate calculation
 * 2. HTTP 400 Bad Request on frozen or unsupported project types
 * 3. HTTP 404 Not Found on missing/unavailable rate data
 * 4. HTTP 400 Bad Request on validation failures
 * 5. Controller preserves server-side authoritative responses
 */
public class CostEstimatorControllerTest {

    private CostEstimatorService mockService;
    private CostEstimatorController controller;

    @BeforeEach
    void setUp() {
        mockService = mock(CostEstimatorService.class);
        controller = new CostEstimatorController(mockService);
    }

    @Test
    @DisplayName("Verify HTTP 200 OK on successful calculation")
    void testCalculateSuccess() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, "110001",
                new BigDecimal("2000"), BigDecimal.ZERO, 2, "STANDARD");

        CostEstimationResponseDto mockResponse = new CostEstimationResponseDto();
        mockResponse.setSuccess(true);
        mockResponse.setProjectType("NEW_CONSTRUCTION");
        mockResponse.setTotal(new CostEstimationResponseDto.TotalEstimateDto(
                new BigDecimal("3000000.00"), new BigDecimal("3600000.00"), new BigDecimal("4200000.00")));

        when(mockService.calculate(any(CostEstimationRequestDto.class))).thenReturn(mockResponse);

        ResponseEntity<CostEstimationResponseDto> entity = controller.calculateEstimate(req);

        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertTrue(entity.getBody().isSuccess());
        assertEquals("NEW_CONSTRUCTION", entity.getBody().getProjectType());
        assertEquals(new BigDecimal("3600000.00"), entity.getBody().getTotal().getAverage());
    }

    @Test
    @DisplayName("Verify HTTP 400 Bad Request on unsupported project type")
    void testCalculateUnsupportedProjectType() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "RENOVATION", "Delhi", "New Delhi", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto mockResponse = CostEstimationResponseDto.failure(
                "Cost estimation is currently available only for New Construction, Commercial Construction, and Industrial/Warehouse.",
                "PROJECT_TYPE_UNSUPPORTED");

        when(mockService.calculate(any(CostEstimationRequestDto.class))).thenReturn(mockResponse);

        ResponseEntity<CostEstimationResponseDto> entity = controller.calculateEstimate(req);

        assertEquals(HttpStatus.BAD_REQUEST, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertFalse(entity.getBody().isSuccess());
        assertEquals("PROJECT_TYPE_UNSUPPORTED", entity.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Verify HTTP 404 Not Found when rates are unavailable")
    void testCalculateRatesUnavailable() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "RemoteState", "RemoteCity", null, null,
                new BigDecimal("1500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto mockResponse = CostEstimationResponseDto.failure(
                "Cost estimation rates unavailable for location", "RATES_UNAVAILABLE");

        when(mockService.calculate(any(CostEstimationRequestDto.class))).thenReturn(mockResponse);

        ResponseEntity<CostEstimationResponseDto> entity = controller.calculateEstimate(req);

        assertEquals(HttpStatus.NOT_FOUND, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertFalse(entity.getBody().isSuccess());
        assertEquals("RATES_UNAVAILABLE", entity.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Verify HTTP 400 Bad Request on validation failure")
    void testCalculateValidationFailure() {
        CostEstimationRequestDto req = new CostEstimationRequestDto(
                "NEW_CONSTRUCTION", "Delhi", "New Delhi", null, null,
                new BigDecimal("-500"), BigDecimal.ZERO, 1, "STANDARD");

        CostEstimationResponseDto mockResponse = CostEstimationResponseDto.failure(
                "Built-up area must be greater than zero.", "INVALID_BUILT_UP_AREA");

        when(mockService.calculate(any(CostEstimationRequestDto.class))).thenReturn(mockResponse);

        ResponseEntity<CostEstimationResponseDto> entity = controller.calculateEstimate(req);

        assertEquals(HttpStatus.BAD_REQUEST, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertFalse(entity.getBody().isSuccess());
        assertEquals("INVALID_BUILT_UP_AREA", entity.getBody().getErrorCode());
    }
}
