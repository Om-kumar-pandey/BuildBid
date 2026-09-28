package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {
    Optional<CustomerProfile> findByUser(MarketplaceBackendApplication.MarketplaceUser user);
    Optional<CustomerProfile> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
