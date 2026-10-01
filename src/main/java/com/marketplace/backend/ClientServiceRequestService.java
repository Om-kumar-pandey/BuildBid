package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ClientServiceRequestService {

    private final ClientServiceRequestRepository requestRepository;

    @Autowired
    public ClientServiceRequestService(ClientServiceRequestRepository requestRepository) {
        this.requestRepository = requestRepository;
    }

    public List<ClientServiceRequest> getRequestsForProfessional(MarketplaceBackendApplication.MarketplaceUser professional) {
        if (professional == null || professional.getId() == null) {
            return List.of();
        }
        return requestRepository.findByProfessional_IdOrderByCreatedAtDesc(professional.getId());
    }

    public long getRequestCount(MarketplaceBackendApplication.MarketplaceUser professional) {
        if (professional == null || professional.getId() == null) {
            return 0;
        }
        return requestRepository.countByProfessional_Id(professional.getId());
    }

    public long getNewRequestCount(MarketplaceBackendApplication.MarketplaceUser professional) {
        if (professional == null || professional.getId() == null) {
            return 0;
        }
        return requestRepository.countByProfessional_IdAndStatusIgnoreCase(professional.getId(), "New");
    }

    public Optional<ClientServiceRequest> findByIdOrRequestId(String identifier, Long professionalId) {
        if (identifier == null || identifier.trim().isEmpty() || professionalId == null) {
            return Optional.empty();
        }
        String cleanId = identifier.trim();
        Optional<ClientServiceRequest> byReqId = requestRepository.findByRequestIdAndProfessional_Id(cleanId, professionalId);
        if (byReqId.isPresent()) {
            return byReqId;
        }

        try {
            Long numericId = Long.parseLong(cleanId);
            return requestRepository.findByIdAndProfessional_Id(numericId, professionalId);
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    @Transactional
    public ClientServiceRequest updateStatus(String identifier, String newStatus, MarketplaceBackendApplication.MarketplaceUser professional) {
        ClientServiceRequest req = findByIdOrRequestId(identifier, professional.getId())
                .orElseThrow(() -> new IllegalArgumentException("Request not found for this professional: " + identifier));

        req.setStatus(newStatus != null ? newStatus.trim() : "Pending");
        return requestRepository.save(req);
    }

    @Transactional
    public ClientServiceRequest createRequest(ClientServiceRequest request) {
        return requestRepository.save(request);
    }

    /**
     * Seeds sample requests for demo/test purposes for the specified professional if empty.
     */
    @Transactional
    public List<ClientServiceRequest> seedDemoRequestsIfEmpty(MarketplaceBackendApplication.MarketplaceUser professional) {
        if (requestRepository.countByProfessional_Id(professional.getId()) > 0) {
            return requestRepository.findByProfessional_IdOrderByCreatedAtDesc(professional.getId());
        }

        String trade = "Civil Engineer";

        ClientServiceRequest r1 = new ClientServiceRequest(
                professional,
                null,
                "Amit Kumar",
                "CUSTOMER",
                "Duplex Villa Structural Consultation",
                trade,
                "Sector 44, Noida",
                "8.4 km",
                "10 Oct 2026",
                null, // Explicitly null to verify "--" display per instructions
                "New",
                "Need structural engineer to inspect lintel and beam placement for a 3-storey independent duplex."
        );
        r1.setRequestId("REQ-7101");

        ClientServiceRequest r2 = new ClientServiceRequest(
                professional,
                null,
                "Sunil Narang",
                "CONTRACTOR",
                "BOQ for Commercial Warehouse",
                trade,
                "Greater Noida West",
                "14.2 km",
                "14 Oct 2026",
                null, // Explicitly null to verify "--" display
                "Pending",
                "Complete material quantity estimation needed prior to vendor tendering."
        );
        r2.setRequestId("REQ-7092");

        ClientServiceRequest r3 = new ClientServiceRequest(
                professional,
                null,
                "Vikas Mehra",
                "CUSTOMER",
                "Slab Casting Quality Audit",
                trade,
                "Indirapuram, Ghaziabad",
                "11.0 km",
                "18 Oct 2026",
                null, // Explicitly null to verify "--" display
                "Accepted",
                "On-site sampling and slump test supervision for second-floor roof slab."
        );
        r3.setRequestId("REQ-7080");

        requestRepository.save(r1);
        requestRepository.save(r2);
        requestRepository.save(r3);

        return requestRepository.findByProfessional_IdOrderByCreatedAtDesc(professional.getId());
    }
}
