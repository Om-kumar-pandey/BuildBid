package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaterialRepository extends JpaRepository<Material, Long> {

    List<Material> findBySellerOrderByCreatedAtDesc(MarketplaceBackendApplication.MarketplaceUser seller);

    List<Material> findBySellerAndCategoryOrderByCreatedAtDesc(MarketplaceBackendApplication.MarketplaceUser seller, String category);
}
