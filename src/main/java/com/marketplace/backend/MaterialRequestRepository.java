package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialRequestRepository extends JpaRepository<MaterialRequest, Long> {

    List<MaterialRequest> findByBuyerOrderByCreatedAtDesc(MarketplaceBackendApplication.MarketplaceUser buyer);

    List<MaterialRequest> findAllByOrderByCreatedAtDesc();

    Optional<MaterialRequest> findByRequestId(String requestId);

    List<MaterialRequest> findByStateIgnoreCaseOrderByCreatedAtDesc(String state);

    List<MaterialRequest> findByRequestScopeOrderByCreatedAtDesc(String requestScope);

    List<MaterialRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<MaterialRequest> findByTargetSellerOrderByCreatedAtDesc(MarketplaceBackendApplication.MarketplaceUser targetSeller);

    List<MaterialRequest> findByTargetSellerAndRequestTypeOrderByCreatedAtDesc(MarketplaceBackendApplication.MarketplaceUser targetSeller, String requestType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mr FROM MaterialRequest mr WHERE mr.id = :id")
    Optional<MaterialRequest> findByIdForUpdate(@Param("id") Long id);
}
