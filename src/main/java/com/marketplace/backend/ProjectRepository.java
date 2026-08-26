package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    
    // इस मेथड से यूजर के सभी प्रोजेक्ट्स डेटाबेस से फेच किए जाएंगे
    List<Project> findByCustomer(MarketplaceBackendApplication.MarketplaceUser customer);
    
}
