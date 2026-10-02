package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for CostEstimatorRate.
 *
 * Implements lookup patterns supporting the 4-tier rate hierarchy:
 * Priority 1: Exact State + City + Project Type
 * Priority 2: State + District + Project Type
 * Priority 3: State Default + Project Type (City is NULL)
 * Priority 4: National Default + Project Type (State = 'NATIONAL_DEFAULT')
 */
@Repository
public interface CostEstimatorRateRepository extends JpaRepository<CostEstimatorRate, Long> {

    // ========================================================
    // TIER 1: EXACT STATE + CITY + PROJECT TYPE
    // ========================================================
    List<CostEstimatorRate> findByStateIgnoreCaseAndCityIgnoreCaseAndProjectTypeAndIsActiveTrue(
            String state, String city, String projectType);

    // ========================================================
    // TIER 2: STATE + DISTRICT + PROJECT TYPE
    // ========================================================
    List<CostEstimatorRate> findByStateIgnoreCaseAndDistrictIgnoreCaseAndProjectTypeAndIsActiveTrue(
            String state, String district, String projectType);

    // ========================================================
    // TIER 3: STATE DEFAULT (CITY IS NULL) + PROJECT TYPE
    // ========================================================
    List<CostEstimatorRate> findByStateIgnoreCaseAndCityIsNullAndProjectTypeAndIsActiveTrue(
            String state, String projectType);

    // ========================================================
    // TIER 4: NATIONAL DEFAULT (STATE = 'NATIONAL_DEFAULT') + PROJECT TYPE
    // ========================================================
    List<CostEstimatorRate> findByStateIgnoreCaseAndProjectTypeAndIsActiveTrue(
            String state, String projectType);

    // ========================================================
    // COMPONENT CATEGORY & FACTOR TYPE LOOKUPS
    // ========================================================
    List<CostEstimatorRate> findByProjectTypeAndComponentCategoryAndIsActiveTrue(
            String projectType, String componentCategory);

    List<CostEstimatorRate> findByProjectTypeAndFactorTypeAndIsActiveTrue(
            String projectType, String factorType);

    List<CostEstimatorRate> findByIsActiveTrue();

    List<CostEstimatorRate> findByStateIgnoreCaseAndIsActiveTrue(String state);

    // ========================================================
    // IDEMPOTENCY / DEDUPLICATION CHECKS
    // ========================================================
    boolean existsByStateAndCityAndProjectTypeAndComponentNameAndFloorLevel(
            String state, String city, String projectType, String componentName, String floorLevel);

    boolean existsByStateAndCityIsNullAndProjectTypeAndComponentNameAndFloorLevel(
            String state, String projectType, String componentName, String floorLevel);
}
