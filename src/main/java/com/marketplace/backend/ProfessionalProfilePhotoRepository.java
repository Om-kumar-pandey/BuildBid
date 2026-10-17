package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProfessionalProfilePhotoRepository extends JpaRepository<ProfessionalProfilePhoto, Long> {
    Optional<ProfessionalProfilePhoto> findByUser(MarketplaceBackendApplication.MarketplaceUser user);
    Optional<ProfessionalProfilePhoto> findByUserId(Long userId);
    void deleteByUser(MarketplaceBackendApplication.MarketplaceUser user);
    boolean existsByUser(MarketplaceBackendApplication.MarketplaceUser user);
}
