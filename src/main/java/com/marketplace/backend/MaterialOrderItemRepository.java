package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BUILDBID - MATERIAL ORDER ITEM REPOSITORY (Phase 4C)
 */
@Repository
public interface MaterialOrderItemRepository extends JpaRepository<MaterialOrderItem, Long> {

    List<MaterialOrderItem> findByMaterialOrderId(Long materialOrderId);

    List<MaterialOrderItem> findByMaterialOrderOrderByCreatedAtAsc(MaterialOrder materialOrder);

    void deleteByMaterialOrderId(Long materialOrderId);
}
