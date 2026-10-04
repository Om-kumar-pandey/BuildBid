package com.marketplace.backend;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * BUILDBID — PROJECT PROFESSIONAL APPLICATION REPOSITORY
 * 
 * Handles query operations for professional applications/quotations under Post Requirements.
 */
@Repository
public interface ProjectProfessionalApplicationRepository extends JpaRepository<ProjectProfessionalApplication, Long> {

    Optional<ProjectProfessionalApplication> findByApplicationId(String applicationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ProjectProfessionalApplication a WHERE a.applicationId = :applicationId")
    Optional<ProjectProfessionalApplication> findByApplicationIdForUpdate(@Param("applicationId") String applicationId);

    Optional<ProjectProfessionalApplication> findByProjectIdAndProfessionalId(Long projectId, Long professionalId);

    boolean existsByProjectIdAndProfessionalId(Long projectId, Long professionalId);

    List<ProjectProfessionalApplication> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    List<ProjectProfessionalApplication> findByProjectIdAndStatusOrderByCreatedAtDesc(Long projectId, ProjectProfessionalApplication.Status status);

    List<ProjectProfessionalApplication> findByProjectIdAndTradeRoleIgnoreCaseOrderByCreatedAtDesc(Long projectId, String tradeRole);

    List<ProjectProfessionalApplication> findByProfessionalIdOrderByCreatedAtDesc(Long professionalId);

    List<ProjectProfessionalApplication> findByProfessionalIdAndStatusOrderByCreatedAtDesc(Long professionalId, ProjectProfessionalApplication.Status status);

    long countByProjectId(Long projectId);

    long countByProjectIdAndStatus(Long projectId, ProjectProfessionalApplication.Status status);

    long countByProjectIdAndTradeRoleIgnoreCase(Long projectId, String tradeRole);

    long countByProjectIdAndTradeRoleIgnoreCaseAndStatus(Long projectId, String tradeRole, ProjectProfessionalApplication.Status status);

    @Query("SELECT a FROM ProjectProfessionalApplication a JOIN FETCH a.project p JOIN FETCH a.professional pr WHERE p.customer.id = :customerId AND a.status = :status ORDER BY COALESCE(a.hiredAt, a.createdAt) DESC, a.id DESC")
    List<ProjectProfessionalApplication> findByProjectCustomerIdAndStatusOrderByHiredAtDesc(
            @Param("customerId") Long customerId,
            @Param("status") ProjectProfessionalApplication.Status status
    );
}
