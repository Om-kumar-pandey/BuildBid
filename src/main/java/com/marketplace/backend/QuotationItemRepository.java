package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BUILDBID - QUOTATION ITEM REPOSITORY (Phase 4C)
 */
@Repository
public interface QuotationItemRepository extends JpaRepository<QuotationItem, Long> {

    List<QuotationItem> findByQuotationId(Long quotationId);

    List<QuotationItem> findByQuotationOrderByCreatedAtAsc(Quotation quotation);

    void deleteByQuotationId(Long quotationId);
}
