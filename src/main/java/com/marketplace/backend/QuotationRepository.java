package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * BUILDBID - QUOTATION REPOSITORY
 * 
 * Persistent repository for quotations submitted by Material Sellers
 * and Professionals for genuine customer requests.
 */
@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long> {

    Optional<Quotation> findByQuotationId(String quotationId);

    List<Quotation> findByMaterialRequestIdOrderByCreatedAtDesc(Long materialRequestId);

    List<Quotation> findByServiceRequestIdOrderByCreatedAtDesc(Long serviceRequestId);

    List<Quotation> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    List<Quotation> findByMaterialRequestIdAndProviderId(Long materialRequestId, Long providerId);

    List<Quotation> findByServiceRequestIdAndProviderId(Long serviceRequestId, Long providerId);

    // Duplicate active quotation detection
    List<Quotation> findByMaterialRequestIdAndProviderIdAndStatusIn(
            Long materialRequestId,
            Long providerId,
            Collection<String> statuses
    );

    List<Quotation> findByServiceRequestIdAndProviderIdAndStatusIn(
            Long serviceRequestId,
            Long providerId,
            Collection<String> statuses
    );

    long countByMaterialRequestId(Long materialRequestId);

    long countByServiceRequestId(Long serviceRequestId);

    // Acceptance & status queries
    boolean existsByMaterialRequestIdAndStatus(Long materialRequestId, String status);

    boolean existsByServiceRequestIdAndStatus(Long serviceRequestId, String status);

    List<Quotation> findByMaterialRequestIdAndStatusIn(Long materialRequestId, Collection<String> statuses);

    List<Quotation> findByServiceRequestIdAndStatusIn(Long serviceRequestId, Collection<String> statuses);

    @Query("SELECT MAX(q.id) FROM Quotation q")
    Long findMaxId();
}
