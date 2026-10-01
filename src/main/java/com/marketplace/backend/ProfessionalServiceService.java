package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service handling business logic for:
 * 1. Master Construction Service Catalog (Bilingual categories & master services).
 * 2. Professional Services management (CRUD, strict ownership, role validation).
 * 3. Dynamic verification workflow (Basic vs Credential-based services).
 * 4. Admin verification hooks (PENDING -> VERIFIED / REJECTED).
 */
@Service
public class ProfessionalServiceService {

    private final ProfessionalServiceRepository professionalServiceRepository;
    private final MasterServiceRepository masterServiceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public ProfessionalServiceService(
            ProfessionalServiceRepository professionalServiceRepository,
            MasterServiceRepository masterServiceRepository,
            ServiceCategoryRepository serviceCategoryRepository,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.professionalServiceRepository = professionalServiceRepository;
        this.masterServiceRepository = masterServiceRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.userRepository = userRepository;
    }

    // ========================================================
    // DTO DEFINITION
    // ========================================================
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProfessionalServiceRequest(
            Long masterServiceId,
            String serviceTitleEn,
            String serviceTitleHi,
            String shortDescription,
            String detailedDescription,
            String whatsIncluded,
            String whatsNotIncluded,
            Double price,
            String pricingUnit,
            String turnaroundTime,
            Integer serviceAreaRadiusKm,
            String serviceMode,
            String qualificationTitle,
            String licenseNumber,
            String issuingAuthority,
            String documentName,
            String documentType,
            String documentData
    ) {}

    // ========================================================
    // 1. MASTER CATALOG INITIALIZATION & SEEDING
    // ========================================================
    @PostConstruct
    @Transactional
    public void seedMasterCatalogIfEmpty() {
        if (serviceCategoryRepository.count() > 0 && masterServiceRepository.count() > 0) {
            return;
        }

        // 1. Labour & Trades (Basic services - verification NOT required)
        ServiceCategory labourTrades = getOrCreateCategory(
                "LABOUR_TRADES",
                "Labour & Construction Trades",
                "श्रमिक एवं निर्माण कारीगर",
                "fa-person-digging"
        );
        createMasterServiceIfMissing(labourTrades, "Labour", "श्रमिक", false, "Per Day");
        createMasterServiceIfMissing(labourTrades, "Mason", "राजमिस्त्री", false, "Per Day");
        createMasterServiceIfMissing(labourTrades, "Plumber", "प्लंबर", false, "Per Visit");
        createMasterServiceIfMissing(labourTrades, "Electrician", "इलेक्ट्रिशियन", false, "Per Visit");
        createMasterServiceIfMissing(labourTrades, "Tile Mason", "टाइल मिस्त्री", false, "Per Sq Ft");
        createMasterServiceIfMissing(labourTrades, "Gardener", "माली", false, "Per Day");
        createMasterServiceIfMissing(labourTrades, "Painter", "पेंटर", false, "Per Day");
        createMasterServiceIfMissing(labourTrades, "Carpenter", "बढ़ई", false, "Per Day");
        createMasterServiceIfMissing(labourTrades, "Basic Technician", "बुनियादी तकनीशियन", false, "Per Visit");
        createMasterServiceIfMissing(labourTrades, "Basic Maintenance", "सामान्य रखरखाव", false, "Per Visit");

        // 2. Civil & Structural Engineering (High-level - verification REQUIRED)
        ServiceCategory civilEng = getOrCreateCategory(
                "CIVIL_STRUCTURAL",
                "Civil & Structural Engineering",
                "सिविल और स्ट्रक्चरल इंजीनियरिंग",
                "fa-building-columns"
        );
        createMasterServiceIfMissing(civilEng, "Civil Engineer", "सिविल इंजीनियर", true, "Per Month");
        createMasterServiceIfMissing(civilEng, "Site Engineer", "साइट इंजीनियर", true, "Per Month");
        createMasterServiceIfMissing(civilEng, "Structural Engineer", "स्ट्रक्चरल इंजीनियर", true, "Per Project");
        createMasterServiceIfMissing(civilEng, "Structural Inspection & Audit", "स्ट्रक्चरल निरीक्षण एवं ऑडिट", true, "Per Visit");

        // 3. Architecture & Design (Credential-based & technical)
        ServiceCategory archDesign = getOrCreateCategory(
                "ARCHITECTURE_DESIGN",
                "Architecture & Design",
                "आर्किटेक्चर और डिज़ाइन",
                "fa-compass-drafting"
        );
        createMasterServiceIfMissing(archDesign, "Architectural Design", "आर्किटेक्चरल डिज़ाइन", true, "Per Project");
        createMasterServiceIfMissing(archDesign, "Interior Design", "इंटीरियर डिज़ाइन", true, "Per Room");
        createMasterServiceIfMissing(archDesign, "Landscape Design", "लैंडस्केप डिज़ाइन", true, "Per Project");
        createMasterServiceIfMissing(archDesign, "3D Elevation & Walkthrough", "3D एलिवेशन एवं वॉकथ्रू", false, "Per Project");

        // 4. Surveying & Geotechnical (Credential-based)
        ServiceCategory surveyGeo = getOrCreateCategory(
                "SURVEY_GEOTECHNICAL",
                "Surveying & Geotechnical",
                "सर्वेक्षण और भू-तकनीकी",
                "fa-map-location-dot"
        );
        createMasterServiceIfMissing(surveyGeo, "Land Survey", "भूमि सर्वेक्षण", true, "Per Project");
        createMasterServiceIfMissing(surveyGeo, "Geotechnical Soil Testing", "भू-तकनीकी मिट्टी परीक्षण", true, "Per Project");

        // 5. Estimation & Project Management (Credential-based)
        ServiceCategory estimMgmt = getOrCreateCategory(
                "ESTIMATION_MGMT",
                "Estimation & Project Management",
                "अनुमान और परियोजना प्रबंधन",
                "fa-calculator"
        );
        createMasterServiceIfMissing(estimMgmt, "Quantity Surveyor (BOQ)", "मात्रा सर्वेक्षक (BOQ)", true, "Per Project");
        createMasterServiceIfMissing(estimMgmt, "Construction Project Management", "निर्माण परियोजना प्रबंधन", true, "Per Month");
        createMasterServiceIfMissing(estimMgmt, "Construction Safety Auditor", "पेशेवर सुरक्षा ऑडिटर", true, "Per Visit");
    }

    private ServiceCategory getOrCreateCategory(String code, String nameEn, String nameHi, String icon) {
        return serviceCategoryRepository.findByCode(code)
                .orElseGet(() -> serviceCategoryRepository.save(new ServiceCategory(code, nameEn, nameHi, icon, true)));
    }

    private void createMasterServiceIfMissing(ServiceCategory category, String titleEn, String titleHi,
                                              boolean verificationRequired, String defaultPricingUnit) {
        if (!masterServiceRepository.existsByTitleEn(titleEn)) {
            masterServiceRepository.save(new MasterService(category, titleEn, titleHi, verificationRequired, defaultPricingUnit, true));
        }
    }

    // ========================================================
    // 2. MASTER CATALOG QUERY METHODS
    // ========================================================
    public List<ServiceCategory> getAllActiveCategories() {
        return serviceCategoryRepository.findByActiveTrueOrderByIdAsc();
    }

    public List<MasterService> getAllActiveMasterServices() {
        return masterServiceRepository.findByActiveTrueOrderByIdAsc();
    }

    public List<MasterService> getMasterServicesByCategory(Long categoryId) {
        return masterServiceRepository.findByCategoryIdAndActiveTrueOrderByIdAsc(categoryId);
    }

    public List<Map<String, Object>> getFullMasterCatalogHierarchy() {
        List<ServiceCategory> categories = serviceCategoryRepository.findByActiveTrueOrderByIdAsc();
        List<MasterService> allServices = masterServiceRepository.findByActiveTrueOrderByIdAsc();

        Map<Long, List<MasterService>> servicesByCategory = new HashMap<>();
        for (MasterService ms : allServices) {
            servicesByCategory.computeIfAbsent(ms.getCategory().getId(), k -> new ArrayList<>()).add(ms);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (ServiceCategory cat : categories) {
            Map<String, Object> catMap = new LinkedHashMap<>();
            catMap.put("id", cat.getId());
            catMap.put("code", cat.getCode());
            catMap.put("nameEn", cat.getNameEn());
            catMap.put("nameHi", cat.getNameHi());
            catMap.put("icon", cat.getIcon());
            catMap.put("services", servicesByCategory.getOrDefault(cat.getId(), Collections.emptyList()));
            result.add(catMap);
        }
        return result;
    }

    // ========================================================
    // 3. PROFESSIONAL SERVICE MANAGEMENT
    // ========================================================

    /**
     * Retrieves all published services for the authenticated professional.
     */
    public List<ProfessionalService> getServicesForProfessional(MarketplaceBackendApplication.MarketplaceUser user) {
        return professionalServiceRepository.findByProfessional_IdOrderByCreatedAtDesc(user.getId());
    }

    /**
     * Publishes a new service for the authenticated professional.
     * Enforces role validation, input validation, and automatic verification status assignment.
     */
    @Transactional
    public ProfessionalService createService(MarketplaceBackendApplication.MarketplaceUser user, ProfessionalServiceRequest request) {
        // 1. Role verification
        if (!hasProfessionalRole(user)) {
            throw new SecurityException("Only registered professionals can publish services — केवल पंजीकृत पेशेवर ही सेवाएँ जोड़ सकते हैं");
        }

        // 2. Master service lookup
        if (request.masterServiceId() == null) {
            throw new IllegalArgumentException("Master service ID is required — मास्टर सेवा आईडी आवश्यक है");
        }
        MasterService masterService = masterServiceRepository.findById(request.masterServiceId())
                .orElseThrow(() -> new IllegalArgumentException("Selected service not found in Master Catalog — चयनित सेवा मास्टर सूची में नहीं मिली"));

        if (!masterService.isActive()) {
            throw new IllegalArgumentException("Selected service is currently inactive — चयनित सेवा वर्तमान में निष्क्रिय है");
        }

        // 3. Price validation
        if (request.price() == null || request.price() <= 0) {
            throw new IllegalArgumentException("Valid service price (> 0) is required — मान्य सेवा मूल्य (> 0) आवश्यक है");
        }

        // 4. Pricing unit validation
        String pricingUnit = request.pricingUnit() != null ? request.pricingUnit().trim() : "";
        if (pricingUnit.isEmpty()) {
            pricingUnit = masterService.getDefaultPricingUnit() != null ? masterService.getDefaultPricingUnit() : "Per Visit";
        }

        // 5. Bilingual titles
        String titleEn = request.serviceTitleEn() != null && !request.serviceTitleEn().trim().isEmpty()
                ? request.serviceTitleEn().trim()
                : masterService.getTitleEn();

        String titleHi = request.serviceTitleHi() != null && !request.serviceTitleHi().trim().isEmpty()
                ? request.serviceTitleHi().trim()
                : masterService.getTitleHi();

        ProfessionalService service = new ProfessionalService();
        service.setProfessional(user);
        service.setMasterService(masterService);
        service.setServiceTitleEn(titleEn);
        service.setServiceTitleHi(titleHi);
        service.setShortDescription(request.shortDescription() != null ? request.shortDescription().trim() : "");
        service.setDetailedDescription(request.detailedDescription() != null ? request.detailedDescription().trim() : "");
        service.setWhatsIncluded(request.whatsIncluded() != null ? request.whatsIncluded().trim() : "");
        service.setWhatsNotIncluded(request.whatsNotIncluded() != null ? request.whatsNotIncluded().trim() : "");
        service.setPrice(request.price());
        service.setPricingUnit(pricingUnit);
        service.setTurnaroundTime(request.turnaroundTime() != null ? request.turnaroundTime().trim() : "1-3 Days");
        service.setServiceAreaRadiusKm(request.serviceAreaRadiusKm() != null ? request.serviceAreaRadiusKm() : 25);
        service.setServiceMode(request.serviceMode() != null && !request.serviceMode().trim().isEmpty() ? request.serviceMode().trim() : "ON_SITE");
        service.setActive(true);

        // 6. BACKEND-CONTROLLED VERIFICATION STATUS LOGIC
        // Rule: NEVER trust client-supplied verification status.
        if (!masterService.isVerificationRequired()) {
            // Basic trade / labour service -> verification NOT required
            service.setVerificationRequired(false);
            service.setVerificationStatus(VerificationStatus.NOT_REQUIRED);
        } else {
            // High-level credential-based service -> verification REQUIRED
            service.setVerificationRequired(true);
            service.setVerificationStatus(VerificationStatus.PENDING); // Automatically PENDING

            // Credential field validations
            String qualTitle = request.qualificationTitle() != null ? request.qualificationTitle().trim() : "";
            if (qualTitle.isEmpty()) {
                throw new IllegalArgumentException("Professional qualification title is required for this service — इस सेवा के लिए पेशेवर योग्यता शीर्षक आवश्यक है");
            }
            service.setQualificationTitle(qualTitle);

            String licNumber = request.licenseNumber() != null ? request.licenseNumber().trim() : "";
            if (licNumber.isEmpty()) {
                throw new IllegalArgumentException("Registration or License number is required — पंजीकरण या लाइसेंस नंबर आवश्यक है");
            }
            service.setLicenseNumber(licNumber);

            String issAuth = request.issuingAuthority() != null ? request.issuingAuthority().trim() : "";
            if (issAuth.isEmpty()) {
                throw new IllegalArgumentException("Issuing authority is required — जारी करने वाला प्राधिकरण आवश्यक है");
            }
            service.setIssuingAuthority(issAuth);

            // Document validation (optional upload during initial creation, but must validate if provided)
            if (request.documentData() != null && !request.documentData().trim().isEmpty()) {
                String docData = request.documentData().trim();
                // Base64 limit check: ~5MB document = ~7MB base64 string
                if (docData.length() > 7_000_000) {
                    throw new IllegalArgumentException("Uploaded document exceeds 5 MB limit — अपलोड किया गया दस्तावेज़ 5 एमबी की सीमा से अधिक है");
                }
                service.setDocumentData(docData);
                service.setDocumentName(request.documentName() != null ? request.documentName().trim() : "verification_document");
                service.setDocumentType(request.documentType() != null ? request.documentType().trim() : "application/pdf");
            }
        }

        return professionalServiceRepository.save(service);
    }

    /**
     * Toggles active state of a professional's published service.
     * Enforces strict multi-tenant ownership check.
     */
    @Transactional
    public ProfessionalService toggleServiceStatus(MarketplaceBackendApplication.MarketplaceUser user, Long serviceId) {
        ProfessionalService service = professionalServiceRepository.findById(serviceId)
                .orElseThrow(() -> new NoSuchElementException("Service not found — सेवा नहीं मिली"));

        if (!service.getProfessional().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized: You can only modify your own services — अनधिकृत: आप केवल अपनी सेवाओं में बदलाव कर सकते हैं");
        }

        service.setActive(!service.isActive());
        return professionalServiceRepository.save(service);
    }

    /**
     * Deletes a published service belonging to the authenticated professional.
     * Enforces strict multi-tenant ownership check.
     */
    @Transactional
    public void deleteService(MarketplaceBackendApplication.MarketplaceUser user, Long serviceId) {
        ProfessionalService service = professionalServiceRepository.findById(serviceId)
                .orElseThrow(() -> new NoSuchElementException("Service not found — सेवा नहीं मिली"));

        if (!service.getProfessional().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized: You can only delete your own services — अनधिकृत: आप केवल अपनी सेवाओं को हटा सकते हैं");
        }

        professionalServiceRepository.delete(service);
    }

    /**
     * Public endpoint query: returns active services published by a professional.
     * Credential services are ONLY shown if VERIFIED. Basic services are shown if NOT_REQUIRED.
     */
    public List<ProfessionalService> getPublicServicesForProfessional(Long professionalId) {
        return professionalServiceRepository.findByProfessional_IdAndActiveTrueAndVerificationStatusIn(
                professionalId,
                Set.of(VerificationStatus.NOT_REQUIRED, VerificationStatus.VERIFIED)
        );
    }

    /**
     * Searches active and verified professional services across all providers for Direct Hire.
     * Enforces that basic trades (NOT_REQUIRED) and verified credential services (VERIFIED) are returned.
     * Inactive, pending, and rejected services are strictly excluded.
     */
    public List<ProfessionalService> searchDirectHireServices(Long masterServiceId, Long categoryId, String location) {
        String cleanLoc = (location != null && !location.trim().isEmpty()) ? location.trim() : null;
        Set<VerificationStatus> eligibleStatuses = Set.of(VerificationStatus.NOT_REQUIRED, VerificationStatus.VERIFIED);
        return professionalServiceRepository.searchDirectHireServices(eligibleStatuses, masterServiceId, categoryId, cleanLoc);
    }


    /**
     * Admin-only verification pipeline method.
     * Transition PENDING -> VERIFIED or PENDING -> REJECTED.
     */
    @Transactional
    public ProfessionalService adminVerifyService(Long serviceId, boolean approved, String adminNotes) {
        ProfessionalService service = professionalServiceRepository.findById(serviceId)
                .orElseThrow(() -> new NoSuchElementException("Service not found with ID: " + serviceId));

        if (approved) {
            service.setVerificationStatus(VerificationStatus.VERIFIED);
        } else {
            service.setVerificationStatus(VerificationStatus.REJECTED);
        }
        return professionalServiceRepository.save(service);
    }

    private boolean hasProfessionalRole(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().contains(MarketplaceBackendApplication.Role.PROFESSIONAL)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SERVICE_PROVIDER);
    }
}
