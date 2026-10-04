package com.marketplace.backend;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    // इस मेथड से यूजर के सभी प्रोजेक्ट्स डेटाबेस से फेच किए जाएंगे
    List<Project> findByCustomer(MarketplaceBackendApplication.MarketplaceUser customer);

    // Contractor discovery: fetch only OPEN projects ordered newest first
    List<Project> findByStatusOrderByCreatedAtDesc(String status);

    // Direct lookup by business project ID
    Optional<Project> findByProjectId(String projectId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findByIdForUpdate(@Param("id") Long id);
}

