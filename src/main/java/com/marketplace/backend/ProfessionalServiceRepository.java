package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProfessionalServiceRepository extends JpaRepository<ProfessionalService, Long> {

    List<ProfessionalService> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);

    Optional<ProfessionalService> findByIdAndProfessional_Id(Long id, Long professionalId);

    List<ProfessionalService> findByProfessional_IdAndActiveTrue(Long professionalId);

    List<ProfessionalService> findByActiveTrue();

    List<ProfessionalService> findByProfessional_IdAndActiveTrueAndVerificationStatusIn(
            Long professionalId,
            Collection<VerificationStatus> statuses
    );

    long countByProfessional_Id(Long professionalId);

    long countByProfessional_IdAndActiveTrue(Long professionalId);

    @Query("SELECT ps FROM ProfessionalService ps " +
           "WHERE ps.active = true " +
           "AND ps.verificationStatus IN :statuses " +
           "AND (:masterServiceId IS NULL OR ps.masterService.id = :masterServiceId) " +
           "AND (:categoryId IS NULL OR ps.masterService.category.id = :categoryId) " +
           "ORDER BY ps.price ASC, ps.createdAt DESC")
    List<ProfessionalService> findEligibleDirectHireServices(
            @Param("statuses") Collection<VerificationStatus> statuses,
            @Param("masterServiceId") Long masterServiceId,
            @Param("categoryId") Long categoryId
    );

    /**
     * Searches all active and eligible services across all professionals for Direct Hire.
     * Supports optional filtering by MasterService ID, Category ID, and location substring.
     */
    @Query("SELECT ps FROM ProfessionalService ps " +
           "WHERE ps.active = true " +
           "AND ps.verificationStatus IN :statuses " +
           "AND (:masterServiceId IS NULL OR ps.masterService.id = :masterServiceId) " +
           "AND (:categoryId IS NULL OR ps.masterService.category.id = :categoryId) " +
           "AND (:location IS NULL OR LOWER(ps.professional.location) LIKE LOWER(CONCAT('%', :location, '%'))) " +
           "ORDER BY ps.price ASC, ps.createdAt DESC")
    List<ProfessionalService> searchDirectHireServices(
            @Param("statuses") Collection<VerificationStatus> statuses,
            @Param("masterServiceId") Long masterServiceId,
            @Param("categoryId") Long categoryId,
            @Param("location") String location
    );
}

