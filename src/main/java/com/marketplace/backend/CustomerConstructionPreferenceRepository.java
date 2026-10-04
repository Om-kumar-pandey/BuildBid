package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerConstructionPreferenceRepository extends JpaRepository<CustomerConstructionPreference, Long> {
    Optional<CustomerConstructionPreference> findByUser(MarketplaceBackendApplication.MarketplaceUser user);
    Optional<CustomerConstructionPreference> findByUserId(Long userId);
    void deleteByUser(MarketplaceBackendApplication.MarketplaceUser user);
}
