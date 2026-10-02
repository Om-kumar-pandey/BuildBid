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
 * BUILDBID - MY BID ASSIGNMENT REPOSITORY (Phase 1)
 *
 * Repository for project contractor assignments.
 * Supports single active assignment lookup, contractor assignment queries,
 * customer assignment histories, and pessimistic locking for atomic transitions.
 */
@Repository
public interface MyBidAssignmentRepository extends JpaRepository<MyBidAssignment, Long> {

    // Current assignment lookup for a project
    Optional<MyBidAssignment> findByProjectIdAndIsCurrentTrue(Long projectId);

    // Current assignment lookup with pessimistic locking for concurrency safety
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mba FROM MyBidAssignment mba WHERE mba.project.id = :projectId AND mba.isCurrent = true")
    Optional<MyBidAssignment> findCurrentAssignmentForUpdate(@Param("projectId") Long projectId);

    // Lock assignment by id for update
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mba FROM MyBidAssignment mba WHERE mba.id = :id")
    Optional<MyBidAssignment> findByIdForUpdate(@Param("id") Long id);

    // Historical assignments for a project
    List<MyBidAssignment> findByProjectIdOrderByAcceptedAtDesc(Long projectId);

    // Current assignments for a contractor
    List<MyBidAssignment> findByContractorIdAndIsCurrentTrueOrderByAcceptedAtDesc(Long contractorId);

    // All assignments (current + historical) for a contractor
    List<MyBidAssignment> findByContractorIdOrderByAcceptedAtDesc(Long contractorId);

    // Assignments for a customer
    List<MyBidAssignment> findByCustomerIdOrderByAcceptedAtDesc(Long customerId);

    List<MyBidAssignment> findByCustomerIdAndIsCurrentTrueOrderByAcceptedAtDesc(Long customerId);

    // Existence checks
    boolean existsByProjectIdAndIsCurrentTrue(Long projectId);

    boolean existsByProjectIdAndContractorIdAndIsCurrentTrue(Long projectId, Long contractorId);

    Optional<MyBidAssignment> findByAcceptedBidId(Long acceptedBidId);
}
