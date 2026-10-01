package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProfessionalServiceRepository extends JpaRepository<ProfessionalService, Long> {

    List<ProfessionalService> findByProfessionalIdOrderByCreatedAtDesc(Long professionalId);

    Optional<ProfessionalService> findByIdAndProfessionalId(Long id, Long professionalId);

    List<ProfessionalService> findByProfessionalIdAndActiveTrue(Long professionalId);

    List<ProfessionalService> findByProfessionalIdAndActiveTrueAndVerificationStatusIn(
            Long professionalId,
            Collection<VerificationStatus> statuses
    );

    long countByProfessionalId(Long professionalId);

    long countByProfessionalIdAndActiveTrue(Long professionalId);
}
