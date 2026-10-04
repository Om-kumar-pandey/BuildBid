package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientServiceRequestRepository extends JpaRepository<ClientServiceRequest, Long> {

    List<ClientServiceRequest> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);

    List<ClientServiceRequest> findByProfessional_IdAndStatusIgnoreCaseOrderByCreatedAtDesc(Long professionalId, String status);

    List<ClientServiceRequest> findByClient_IdOrderByCreatedAtDesc(Long clientId);

    List<ClientServiceRequest> findByClient_IdAndStatusIgnoreCaseOrderByCreatedAtDesc(Long clientId, String status);

    Optional<ClientServiceRequest> findByRequestId(String requestId);

    Optional<ClientServiceRequest> findByIdAndProfessional_Id(Long id, Long professionalId);

    Optional<ClientServiceRequest> findByRequestIdAndProfessional_Id(String requestId, Long professionalId);

    long countByProfessional_Id(Long professionalId);

    long countByProfessional_IdAndStatusIgnoreCase(Long professionalId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT csr FROM ClientServiceRequest csr WHERE csr.id = :id")
    Optional<ClientServiceRequest> findByIdForUpdate(@Param("id") Long id);
}
