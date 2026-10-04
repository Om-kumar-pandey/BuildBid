package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ClientServiceRequestService {

    private final ClientServiceRequestRepository requestRepository;
    private final NotificationService notificationService;

    @Autowired
    public ClientServiceRequestService(
            ClientServiceRequestRepository requestRepository,
            @Autowired(required = false) NotificationService notificationService
    ) {
        this.requestRepository = requestRepository;
        this.notificationService = notificationService;
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

    public Optional<ClientServiceRequest> findByIdOrRequestIdGlobal(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return Optional.empty();
        }
        String cleanId = identifier.trim();
        Optional<ClientServiceRequest> byReqId = requestRepository.findByRequestId(cleanId);
        if (byReqId.isPresent()) {
            return byReqId;
        }

        try {
            Long numericId = Long.parseLong(cleanId);
            return requestRepository.findById(numericId);
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    @Transactional
    public ClientServiceRequest updateStatus(String identifier, String newStatus, MarketplaceBackendApplication.MarketplaceUser professional) {
        ClientServiceRequest req = findByIdOrRequestId(identifier, professional.getId())
                .orElseThrow(() -> new IllegalArgumentException("Request not found for this professional: " + identifier));

        String normalizedStatus = newStatus != null ? newStatus.trim() : "Pending";
        if ("Accepted".equalsIgnoreCase(normalizedStatus)) {
            normalizedStatus = "Accepted";
        } else if ("Declined".equalsIgnoreCase(normalizedStatus)) {
            normalizedStatus = "Declined";
        }

        if ("Accepted".equals(normalizedStatus)) {
            if ("Declined".equalsIgnoreCase(req.getStatus()) || "Cancelled".equalsIgnoreCase(req.getStatus())) {
                throw new IllegalStateException("Cannot accept a request that has already been declined or cancelled.");
            }
        }

        String oldStatus = req.getStatus();
        req.setStatus(normalizedStatus);
        ClientServiceRequest saved = requestRepository.save(req);

        if (notificationService != null && saved.getClient() != null) {
            String proName = professional.getName() != null && !professional.getName().isBlank()
                    ? professional.getName()
                    : "Professional";
            String requestedService = saved.getRequestedService() != null && !saved.getRequestedService().isBlank()
                    ? saved.getRequestedService()
                    : "service";

            if ("Accepted".equals(normalizedStatus) && !"Accepted".equalsIgnoreCase(oldStatus)) {
                notificationService.createNotification(
                        saved.getClient(),
                        "Hiring Request Accepted",
                        "हायरिंग अनुरोध स्वीकार किया गया",
                        "Professional " + proName + " has accepted your direct hire request for " + requestedService + ".",
                        "प्रोफेशनल " + proName + " ने " + requestedService + " के लिए आपका डायरेक्ट हायर अनुरोध स्वीकार कर लिया है।",
                        "HIRING_REQUEST_ACCEPTED",
                        saved.getRequestId()
                );
            } else if ("Declined".equals(normalizedStatus) && !"Declined".equalsIgnoreCase(oldStatus)) {
                notificationService.createNotification(
                        saved.getClient(),
                        "Hiring Request Declined",
                        "हायरिंग अनुरोध अस्वीकार किया गया",
                        "Professional " + proName + " has declined your direct hire request for " + requestedService + ".",
                        "प्रोफेशनल " + proName + " ने " + requestedService + " के लिए आपका डायरेक्ट हायर अनुरोध अस्वीकार कर दिया है।",
                        "HIRING_REQUEST_DECLINED",
                        saved.getRequestId()
                );
            }
        }

        return saved;
    }

    @Transactional
    public ClientServiceRequest createRequest(ClientServiceRequest request) {
        ClientServiceRequest saved = requestRepository.save(request);

        if (notificationService != null && saved.getProfessional() != null) {
            String clientName = saved.getClientName() != null && !saved.getClientName().isBlank()
                    ? saved.getClientName()
                    : "A client";
            String requestedService = saved.getRequestedService() != null && !saved.getRequestedService().isBlank()
                    ? saved.getRequestedService()
                    : "service";

            notificationService.createNotification(
                    saved.getProfessional(),
                    "New Direct Hire Request",
                    "नया डायरेक्ट हायर अनुरोध",
                    "Client " + clientName + " has sent a direct hire request for " + requestedService + ".",
                    "ग्राहक " + clientName + " ने " + requestedService + " के लिए डायरेक्ट हायर अनुरोध भेजा है।",
                    "DIRECT_HIRE_REQUEST",
                    saved.getRequestId()
            );
        }

        return saved;
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
