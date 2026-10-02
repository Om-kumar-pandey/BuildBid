package com.marketplace.backend;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * BUILDBID - MY BID PROJECT LOCK REPOSITORY (Phase 2.1)
 *
 * Repository for acquiring database-level pessimistic write locks on project-level lock rows.
 * Guarantees serial execution of all assignment state transitions for a given project.
 */
@Repository
public interface MyBidProjectLockRepository extends JpaRepository<MyBidProjectLock, Long> {

    Optional<MyBidProjectLock> findByProjectId(Long projectId);

    boolean existsByProjectId(Long projectId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM MyBidProjectLock l WHERE l.projectId = :projectId")
    Optional<MyBidProjectLock> findByProjectIdForUpdate(@Param("projectId") Long projectId);
}
