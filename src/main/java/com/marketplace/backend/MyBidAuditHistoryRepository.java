package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BUILDBID - MY BID AUDIT HISTORY REPOSITORY (Phase 1)
 *
 * Append-only repository for My Bid lifecycle audit entries.
 * Strict design: no destructive update or deletion methods.
 */
@Repository
public interface MyBidAuditHistoryRepository extends JpaRepository<MyBidAuditHistory, Long> {

    // History by project in chronological order
    List<MyBidAuditHistory> findByProjectIdOrderByCreatedAtAsc(Long projectId);

    // History by project ordered newest first
    List<MyBidAuditHistory> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    // History by specific bid in chronological order
    List<MyBidAuditHistory> findByBidIdOrderByCreatedAtAsc(Long bidId);

    // History by actor ordered newest first
    List<MyBidAuditHistory> findByActorIdOrderByCreatedAtDesc(Long actorId);

    // History by project and event type
    List<MyBidAuditHistory> findByProjectIdAndEventTypeOrderByCreatedAtAsc(
            Long projectId,
            MyBidAuditHistory.EventType eventType
    );
}
