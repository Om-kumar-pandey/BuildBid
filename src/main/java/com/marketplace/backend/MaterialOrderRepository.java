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
 * BUILDBID - MATERIAL ORDER REPOSITORY (Phase 4A)
 */
@Repository
public interface MaterialOrderRepository extends JpaRepository<MaterialOrder, Long> {

    Optional<MaterialOrder> findByQuotationId(Long quotationId);

    boolean existsByQuotationId(Long quotationId);

    Optional<MaterialOrder> findByOrderCode(String orderCode);

    List<MaterialOrder> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<MaterialOrder> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    @Query("SELECT MAX(o.id) FROM MaterialOrder o")
    Long findMaxId();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM MaterialOrder o WHERE o.id = :id")
    Optional<MaterialOrder> findByIdForUpdate(@Param("id") Long id);
}
