package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProfessionalServiceRepository extends JpaRepository<ProfessionalService, Long> {

    List<ProfessionalService> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);

    Optional<ProfessionalService> findByIdAndProfessional_Id(Long id, Long professionalId);

    List<ProfessionalService> findByProfessional_IdAndActiveTrue(Long professionalId);

    List<ProfessionalService> findByProfessional_IdAndActiveTrueAndVerificationStatusIn(
            Long professionalId,
            Collection<VerificationStatus> statuses
    );

    long countByProfessional_Id(Long professionalId);

    long countByProfessional_IdAndActiveTrue(Long professionalId);
}
