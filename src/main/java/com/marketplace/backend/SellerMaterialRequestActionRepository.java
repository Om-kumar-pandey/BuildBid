package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SellerMaterialRequestActionRepository extends JpaRepository<SellerMaterialRequestAction, Long> {

    Optional<SellerMaterialRequestAction> findBySellerIdAndMaterialRequestId(Long sellerId, Long materialRequestId);

    List<SellerMaterialRequestAction> findBySellerId(Long sellerId);

    List<SellerMaterialRequestAction> findByMaterialRequestId(Long materialRequestId);

    boolean existsBySellerIdAndMaterialRequestId(Long sellerId, Long materialRequestId);

    boolean existsBySellerIdAndMaterialRequestIdAndStatus(Long sellerId, Long materialRequestId, String status);
}
