package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerSavedLocationRepository extends JpaRepository<CustomerSavedLocation, Long> {
    List<CustomerSavedLocation> findByUserOrderByIsDefaultDescCreatedAtDesc(MarketplaceBackendApplication.MarketplaceUser user);
    List<CustomerSavedLocation> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);
    Optional<CustomerSavedLocation> findByIdAndUser(Long id, MarketplaceBackendApplication.MarketplaceUser user);
    Optional<CustomerSavedLocation> findByIdAndUserId(Long id, Long userId);
    Optional<CustomerSavedLocation> findByUserAndIsDefaultTrue(MarketplaceBackendApplication.MarketplaceUser user);
    List<CustomerSavedLocation> findByUser(MarketplaceBackendApplication.MarketplaceUser user);
    long countByUser(MarketplaceBackendApplication.MarketplaceUser user);
    void deleteByUser(MarketplaceBackendApplication.MarketplaceUser user);
}
