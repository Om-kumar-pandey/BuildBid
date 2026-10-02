package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BUILDBID - MATERIAL REQUEST ITEM REPOSITORY (Phase 4C)
 */
@Repository
public interface MaterialRequestItemRepository extends JpaRepository<MaterialRequestItem, Long> {

    List<MaterialRequestItem> findByMaterialRequestId(Long materialRequestId);
}
