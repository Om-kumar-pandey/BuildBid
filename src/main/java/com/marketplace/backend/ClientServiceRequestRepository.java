package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientServiceRequestRepository extends JpaRepository<ClientServiceRequest, Long> {

    List<ClientServiceRequest> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);

    Optional<ClientServiceRequest> findByRequestId(String requestId);

    Optional<ClientServiceRequest> findByIdAndProfessional_Id(Long id, Long professionalId);

    Optional<ClientServiceRequest> findByRequestIdAndProfessional_Id(String requestId, Long professionalId);

    long countByProfessional_Id(Long professionalId);

    long countByProfessional_IdAndStatusIgnoreCase(Long professionalId, String status);
}
