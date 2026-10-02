package com.marketplace.backend;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * BUILDBID - MY BID REPOSITORY (Phase 1)
 *
 * Repository for contractor bids submitted on customer projects.
 * Provides query capabilities for bid listing, authorization validation,
 * status filtering, and concurrency safety.
 */
@Repository
public interface MyBidRepository extends JpaRepository<MyBid, Long> {

    // All bids for a project ordered newest first
    List<MyBid> findByProjectIdOrderBySubmittedAtDesc(Long projectId);

    // All bids for a customer-owned project
    List<MyBid> findByProjectIdAndCustomerIdOrderBySubmittedAtDesc(Long projectId, Long customerId);

    // Bids submitted by a specific contractor
    List<MyBid> findByContractorIdOrderBySubmittedAtDesc(Long contractorId);

    // Bids submitted by a contractor with specific status
    List<MyBid> findByContractorIdAndStatusOrderBySubmittedAtDesc(Long contractorId, MyBid.Status status);

    // Verification queries
    boolean existsByIdAndProjectId(Long id, Long projectId);

    Optional<MyBid> findByIdAndProjectId(Long id, Long projectId);

    // Status-filtered bid queries
    List<MyBid> findByProjectIdAndStatus(Long projectId, MyBid.Status status);

    List<MyBid> findByProjectIdAndStatusIn(Long projectId, Collection<MyBid.Status> statuses);

    // Rejected / not-selected queries (supports 7-day visibility rule in later service phase)
    List<MyBid> findByStatus(MyBid.Status status);

    List<MyBid> findByStatusAndRejectedAtBefore(MyBid.Status status, LocalDateTime threshold);

    List<MyBid> findByContractorIdAndStatusAndRejectedAtAfter(Long contractorId, MyBid.Status status, LocalDateTime threshold);

    // Counting bids
    long countByProjectId(Long projectId);

    @Query("SELECT COUNT(b) FROM MyBid b WHERE b.customer.id = :customerId")
    long countByCustomerId(@Param("customerId") Long customerId);

    // Pessimistic lock query for concurrency safety during state transitions
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM MyBid b WHERE b.id = :id")
    Optional<MyBid> findByIdForUpdate(@Param("id") Long id);
}
