package com.marketplace.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit & Data Layer Test for Step 2 of Cost Estimator.
 *
 * Verifies:
 * 1. CostEstimatorRate entity fields, lifecycle hooks, and validations
 * 2. BigDecimals are strictly used for monetary rates and factors
 * 3. Seed dataset validity (no null sources, no inverted ranges, valid project types)
 * 4. CostEstimatorDataSeeder idempotency (does not duplicate records)
 */
public class CostEstimatorDataLayerTest {

    @Test
    @DisplayName("Verify CostEstimatorRate entity fields and lifecycle hooks")
    void testEntityLifecycleAndTypes() {
        CostEstimatorRate rate = new CostEstimatorRate();
        rate.setState("Delhi");
        rate.setCity("New Delhi");
        rate.setDistrict(null);
        rate.setProjectType("NEW_CONSTRUCTION");
        rate.setComponentCategory("MATERIAL");
        rate.setComponentName("OPC 43/53 Grade Cement");
        rate.setMaterialName("Cement");
        rate.setSpecification("IS 8112:2013 Grade 43/53");
        rate.setRateType("UNIT_RATE");
        rate.setFloorLevel("ALL");
        rate.setUnit("BAG");
        rate.setMinRate(new BigDecimal("330.00"));
        rate.setAverageRate(new BigDecimal("360.00"));
        rate.setMaxRate(new BigDecimal("390.00"));
        rate.setRateSource("CPWD DAR 2023");
        rate.setSourceUrl("https://cpwd.gov.in");
        rate.setRateDate(LocalDate.of(2023, 4, 1));
        rate.setEffectiveFrom(LocalDate.of(2023, 4, 1));

        // Test lifecycle hooks
        rate.onCreate();
        assertNotNull(rate.getCreatedAt());
        assertNotNull(rate.getUpdatedAt());
        assertTrue(rate.getIsActive());

        LocalDateTime createdBefore = rate.getCreatedAt();
        rate.onUpdate();
        assertNotNull(rate.getUpdatedAt());
        assertEquals(createdBefore, rate.getCreatedAt());

        // Test validation logic
        assertTrue(rate.isValid());
        assertEquals("Delhi", rate.getState());
        assertEquals("New Delhi", rate.getCity());
        assertEquals("NEW_CONSTRUCTION", rate.getProjectType());
        assertEquals("MATERIAL", rate.getComponentCategory());
        assertEquals(new BigDecimal("360.00"), rate.getAverageRate());
    }

    @Test
    @DisplayName("Verify Rate Validation: min_rate <= average_rate <= max_rate")
    void testRateValidationRules() {
        CostEstimatorRate rate = new CostEstimatorRate();
        rate.setRateType("UNIT_RATE");

        // Null rates fail validation
        assertFalse(rate.isValid());

        // Zero min_rate fails validation
        rate.setMinRate(BigDecimal.ZERO);
        rate.setAverageRate(new BigDecimal("100.00"));
        rate.setMaxRate(new BigDecimal("150.00"));
        assertFalse(rate.isValid());

        // Inverted range (min > avg) fails
        rate.setMinRate(new BigDecimal("120.00"));
        rate.setAverageRate(new BigDecimal("100.00"));
        rate.setMaxRate(new BigDecimal("150.00"));
        assertFalse(rate.isValid());

        // Inverted range (avg > max) fails
        rate.setMinRate(new BigDecimal("80.00"));
        rate.setAverageRate(new BigDecimal("160.00"));
        rate.setMaxRate(new BigDecimal("150.00"));
        assertFalse(rate.isValid());

        // Valid range passes
        rate.setMinRate(new BigDecimal("80.00"));
        rate.setAverageRate(new BigDecimal("100.00"));
        rate.setMaxRate(new BigDecimal("150.00"));
        assertTrue(rate.isValid());
    }

    @Test
    @DisplayName("Verify Factor validation logic")
    void testFactorValidation() {
        CostEstimatorRate factor = new CostEstimatorRate();
        factor.setRateType("MULTIPLIER");

        // Null factor value fails
        assertFalse(factor.isValid());

        // Negative factor fails
        factor.setFactorValue(new BigDecimal("-0.05"));
        assertFalse(factor.isValid());

        // Positive factor passes
        factor.setFactorValue(new BigDecimal("1.0400"));
        assertTrue(factor.isValid());
    }

    @Test
    @DisplayName("Verify Seed Dataset integrity: sources, URLs, dates, ranges")
    void testSeedDatasetIntegrity() {
        CostEstimatorRateRepository mockRepo = mock(CostEstimatorRateRepository.class);
        CostEstimatorDataSeeder seeder = new CostEstimatorDataSeeder(mockRepo);

        List<CostEstimatorRate> capturedRates = new ArrayList<>();
        when(mockRepo.save(any(CostEstimatorRate.class))).thenAnswer(invocation -> {
            CostEstimatorRate r = invocation.getArgument(0);
            capturedRates.add(r);
            return r;
        });

        // Run seeder with empty database
        when(mockRepo.existsByStateAndCityAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(false);
        when(mockRepo.existsByStateAndCityIsNullAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString())).thenReturn(false);

        seeder.run();

        // Verify dataset has been processed
        assertFalse(capturedRates.isEmpty());
        assertTrue(capturedRates.size() >= 40, "Expected at least 40 reference records");

        for (CostEstimatorRate rate : capturedRates) {
            // Verify mandatory source attribution
            assertNotNull(rate.getRateSource(), "Every record must have rate_source");
            assertFalse(rate.getRateSource().trim().isEmpty());
            assertNotNull(rate.getSourceUrl(), "Every record must have source_url");
            assertTrue(rate.getSourceUrl().startsWith("http"), "Source URL must be valid HTTP/HTTPS URL");
            assertNotNull(rate.getRateDate(), "Every record must have rate_date");

            // Verify active project types
            assertTrue(
                    "NEW_CONSTRUCTION".equals(rate.getProjectType()) ||
                    "COMMERCIAL_CONSTRUCTION".equals(rate.getProjectType()) ||
                    "INDUSTRIAL_WAREHOUSE".equals(rate.getProjectType()),
                    "Project type must be one of the three active types: " + rate.getProjectType()
            );

            // Verify valid rate numbers
            assertTrue(rate.isValid(), "Every seeded record must be valid: " + rate.getComponentName());

            // Verify floor levels
            assertTrue(
                    "ALL".equals(rate.getFloorLevel()) ||
                    "GROUND".equals(rate.getFloorLevel()) ||
                    "FIRST".equals(rate.getFloorLevel()) ||
                    "UPPER".equals(rate.getFloorLevel()) ||
                    "BASEMENT".equals(rate.getFloorLevel()),
                    "Floor level must be one of allowed values: " + rate.getFloorLevel()
            );
        }
    }

    @Test
    @DisplayName("Verify Seeder Idempotency: does NOT duplicate existing records")
    void testSeederIdempotency() {
        CostEstimatorRateRepository mockRepo = mock(CostEstimatorRateRepository.class);
        CostEstimatorDataSeeder seeder = new CostEstimatorDataSeeder(mockRepo);

        // Simulate all records already existing
        when(mockRepo.existsByStateAndCityAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(true);
        when(mockRepo.existsByStateAndCityIsNullAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString())).thenReturn(true);

        seeder.run();

        // Zero save calls because all exist
        verify(mockRepo, never()).save(any(CostEstimatorRate.class));
    }
}
