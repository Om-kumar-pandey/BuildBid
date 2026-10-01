package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MasterServiceRepository extends JpaRepository<MasterService, Long> {
    List<MasterService> findByActiveTrueOrderByIdAsc();
    List<MasterService> findByCategoryIdAndActiveTrueOrderByIdAsc(Long categoryId);
    Optional<MasterService> findByTitleEn(String titleEn);
    boolean existsByTitleEn(String titleEn);
}
