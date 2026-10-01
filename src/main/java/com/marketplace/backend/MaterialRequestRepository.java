package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
