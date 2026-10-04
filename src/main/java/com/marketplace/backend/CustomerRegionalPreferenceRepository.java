package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRegionalPreferenceRepository extends JpaRepository<CustomerRegionalPreference, Long> {

    Optional<CustomerRegionalPreference> findByUser(MarketplaceBackendApplication.MarketplaceUser user);

    void deleteByUser(MarketplaceBackendApplication.MarketplaceUser user);
}
