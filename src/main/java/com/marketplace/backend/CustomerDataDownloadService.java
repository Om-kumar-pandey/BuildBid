package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 7
 * Customer Data Download Service
 *
 * Authoritative, read-only service that compiles the authenticated customer's own data
 * into a structured, versioned export model.
 *
 * STRICT SECURITY & INTEGRITY CONSTRAINTS:
 * - Read-only: never mutates customer or platform data.
 * - IDOR-proof: only queries datasets belonging to the passed authenticated MarketplaceUser.
 * - Secret exclusion: never exposes password hashes, passwords, JWT tokens, OTPs, or verification secrets.
 * - Minimization: only exports customer-authorized data without leaking third-party private metadata.
 */
@Service
@Transactional(readOnly = true)
public class CustomerDataDownloadService {

    private final CustomerProfileRepository profileRepository;
    private final CustomerConstructionPreferenceRepository constructionPreferenceRepository;
    private final CustomerSavedLocationRepository savedLocationRepository;
    private final CustomerRegionalPreferenceRepository regionalPreferenceRepository;
    private final ProjectRepository projectRepository;
    private final MaterialRequestRepository materialRequestRepository;
    private final ClientServiceRequestRepository clientServiceRequestRepository;
    private final MaterialOrderRepository materialOrderRepository;
    private final HiredProfessionalService hiredProfessionalService;

    @Autowired
    public CustomerDataDownloadService(
            CustomerProfileRepository profileRepository,
            CustomerConstructionPreferenceRepository constructionPreferenceRepository,
            CustomerSavedLocationRepository savedLocationRepository,
            CustomerRegionalPreferenceRepository regionalPreferenceRepository,
            ProjectRepository projectRepository,
            MaterialRequestRepository materialRequestRepository,
            ClientServiceRequestRepository clientServiceRequestRepository,
            @Autowired(required = false) MaterialOrderRepository materialOrderRepository,
            @Autowired(required = false) HiredProfessionalService hiredProfessionalService
    ) {
        this.profileRepository = profileRepository;
        this.constructionPreferenceRepository = constructionPreferenceRepository;
        this.savedLocationRepository = savedLocationRepository;
        this.regionalPreferenceRepository = regionalPreferenceRepository;
        this.projectRepository = projectRepository;
        this.materialRequestRepository = materialRequestRepository;
        this.clientServiceRequestRepository = clientServiceRequestRepository;
        this.materialOrderRepository = materialOrderRepository;
        this.hiredProfessionalService = hiredProfessionalService;
    }

    /**
     * Generates a complete, structured data export for the authenticated customer.
     *
     * @param user The authenticated MarketplaceUser (strictly resolved server-side)
     * @return Versioned CustomerDataExportDto
     */
    public CustomerDataExportDto generateCustomerDataExport(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null for data export.");
        }

        CustomerDataExportDto export = new CustomerDataExportDto();
        export.setExportVersion("1.0");
        export.setExportedAt(LocalDateTime.now().toString());

        // 1. Account Summary (Never password or secrets)
        CustomerDataExportDto.AccountData accountData = new CustomerDataExportDto.AccountData();
        accountData.setName(user.getName());
        accountData.setUsername(user.getUsername());
        accountData.setEmail(user.getEmail());
        accountData.setPhone(user.getPhone());
        accountData.setLocation(user.getLocation());
        accountData.setProfilePhotoUrl(user.getProfilePhotoUrl());
        if (user.getRoles() != null) {
            accountData.setRoles(user.getRoles().stream().map(Enum::name).collect(Collectors.toSet()));
        } else {
            accountData.setRoles(Collections.emptySet());
        }
        accountData.setMemberSince(user.getCreatedAt());
        export.setAccount(accountData);

        // 2. Verification & Security Status (No OTPs or hashes)
        CustomerDataExportDto.VerificationData verifData = new CustomerDataExportDto.VerificationData();
        verifData.setEmailVerified(user.isEmailVerified());
        verifData.setEmailVerifiedAt(user.getEmailVerifiedAt());
        verifData.setPhoneVerified(user.isPhoneVerified());
        verifData.setPhoneVerifiedAt(user.getPhoneVerifiedAt());
        verifData.setPasswordUpdatedAt(user.getPasswordUpdatedAt());
        verifData.setHasPassword(user.getPasswordHash() != null && !user.getPasswordHash().isBlank());
        export.setVerification(verifData);

        // 3. Customer Profile
        Optional<CustomerProfile> profileOpt = profileRepository.findByUser(user);
        String profileLang = "English";
        if (profileOpt.isPresent()) {
            CustomerProfile cp = profileOpt.get();
            CustomerDataExportDto.ProfileData pData = new CustomerDataExportDto.ProfileData();
            pData.setFullName(cp.getFullName());
            pData.setEmail(cp.getEmail());
            pData.setPhone(cp.getPhone());
            pData.setProfilePhoto(cp.getProfilePhoto());
            pData.setAddress(cp.getAddress());
            pData.setCity(cp.getCity());
            pData.setState(cp.getState());
            pData.setPincode(cp.getPincode());
            pData.setAboutMe(cp.getAboutMe());
            pData.setPreferredLanguage(cp.getPreferredLanguage());
            pData.setCreatedAt(cp.getCreatedAt());
            pData.setUpdatedAt(cp.getUpdatedAt());
            export.setProfile(pData);
            if (cp.getPreferredLanguage() != null && !cp.getPreferredLanguage().isBlank()) {
                profileLang = cp.getPreferredLanguage();
            }
        }

        // 4. Construction Preferences
        Optional<CustomerConstructionPreference> constPrefOpt = constructionPreferenceRepository.findByUser(user);
        if (constPrefOpt.isPresent()) {
            CustomerConstructionPreference ccp = constPrefOpt.get();
            CustomerDataExportDto.ConstructionPreferencesData cpData = new CustomerDataExportDto.ConstructionPreferencesData();
            cpData.setPreferredProjectType(ccp.getPreferredProjectType());
            cpData.setPreferredPropertyType(ccp.getPreferredPropertyType());
            cpData.setPreferredBuiltUpArea(ccp.getPreferredBuiltUpArea());
            cpData.setPreferredNumberOfFloors(ccp.getPreferredNumberOfFloors());
            cpData.setPreferredConstructionQuality(ccp.getPreferredConstructionQuality());
            cpData.setPreferredBudgetRange(ccp.getPreferredBudgetRange());
            cpData.setCreatedAt(ccp.getCreatedAt());
            cpData.setUpdatedAt(ccp.getUpdatedAt());
            export.setConstructionPreferences(cpData);
        }

        // 5. Saved Locations
        List<CustomerSavedLocation> locations = savedLocationRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user);
        List<CustomerDataExportDto.SavedLocationData> locationList = new ArrayList<>();
        if (locations != null) {
            for (CustomerSavedLocation loc : locations) {
                CustomerDataExportDto.SavedLocationData sld = new CustomerDataExportDto.SavedLocationData();
                sld.setId(loc.getId());
                sld.setLabel(loc.getLabel());
                sld.setAddressLine1(loc.getAddressLine1());
                sld.setAddressLine2(loc.getAddressLine2());
                sld.setCity(loc.getCity());
                sld.setState(loc.getState());
                sld.setPincode(loc.getPincode());
                sld.setLandmark(loc.getLandmark());
                sld.setDefault(loc.isDefault());
                sld.setCreatedAt(loc.getCreatedAt());
                sld.setUpdatedAt(loc.getUpdatedAt());
                locationList.add(sld);
            }
        }
        export.setSavedLocations(locationList);

        // 6. Regional Preferences
        Optional<CustomerRegionalPreference> regPrefOpt = regionalPreferenceRepository.findByUser(user);
        CustomerDataExportDto.RegionalPreferencesData regData = new CustomerDataExportDto.RegionalPreferencesData();
        regData.setPreferredLanguage(profileLang);
        if (regPrefOpt.isPresent()) {
            CustomerRegionalPreference crp = regPrefOpt.get();
            regData.setTimeZone(crp.getTimeZone() != null ? crp.getTimeZone() : "Asia/Kolkata");
            regData.setCurrency(crp.getCurrency() != null ? crp.getCurrency() : "INR");
            regData.setAreaUnit(crp.getAreaUnit() != null ? crp.getAreaUnit() : "sq ft");
            regData.setDateFormat(crp.getDateFormat() != null ? crp.getDateFormat() : "DD/MM/YYYY");
            regData.setNumberFormat(crp.getNumberFormat() != null ? crp.getNumberFormat() : "Indian");
            regData.setCreatedAt(crp.getCreatedAt());
            regData.setUpdatedAt(crp.getUpdatedAt());
        } else {
            regData.setTimeZone("Asia/Kolkata");
            regData.setCurrency("INR");
            regData.setAreaUnit("sq ft");
            regData.setDateFormat("DD/MM/YYYY");
            regData.setNumberFormat("Indian");
        }
        export.setRegionalPreferences(regData);

        // 7. Customer Projects
        List<Project> customerProjects = projectRepository.findByCustomer(user);
        List<CustomerDataExportDto.ProjectData> projectList = new ArrayList<>();
        if (customerProjects != null) {
            for (Project p : customerProjects) {
                CustomerDataExportDto.ProjectData pd = new CustomerDataExportDto.ProjectData();
                pd.setProjectId(p.getProjectId());
                pd.setProjectTitle(p.getProjectTitle() != null ? p.getProjectTitle() : p.getTitle());
                pd.setProjectType(p.getProjectType() != null ? p.getProjectType() : p.getType());
                pd.setCity(p.getCity());
                pd.setState(p.getState());
                pd.setPincode(p.getPincode());
                pd.setAddress(p.getAddress());
                pd.setLocation(p.getLocation());
                pd.setPlotArea(p.getPlotArea());
                pd.setBuiltUpArea(p.getBuiltUpArea());
                pd.setTotalArea(p.getTotalArea());
                pd.setFloors(p.getFloors());
                pd.setQualityTier(p.getQualityTier());
                pd.setEstimatedCost(p.getEstimatedCost());
                pd.setBudget(p.getBudget());
                pd.setBudgetMin(p.getBudgetMin());
                pd.setBudgetMax(p.getBudgetMax());
                pd.setTimeline(p.getTimeline());
                pd.setTargetStartDate(p.getTargetStartDate());
                pd.setPaymentPreference(p.getPaymentPreference());
                pd.setPrivacyPreference(p.getPrivacyPreference());
                pd.setDescription(p.getDescription());
                pd.setScopeOfWork(p.getScopeOfWork());
                pd.setStatus(p.getStatus());
                if (p.getRequirements() != null) {
                    pd.setRequirements(new HashMap<>(p.getRequirements()));
                }
                pd.setCreatedAt(p.getCreatedAt());
                projectList.add(pd);
            }
        }
        export.setProjects(projectList);

        // 8. Customer Requests (Material & Client Service Requests)
        List<CustomerDataExportDto.RequestData> requestList = new ArrayList<>();

        if (materialRequestRepository != null) {
            List<MaterialRequest> matRequests = materialRequestRepository.findByBuyerOrderByCreatedAtDesc(user);
            if (matRequests != null) {
                for (MaterialRequest mr : matRequests) {
                    CustomerDataExportDto.RequestData rd = new CustomerDataExportDto.RequestData();
                    rd.setRequestId(mr.getRequestId());
                    rd.setRequestType(mr.getRequestType() != null ? mr.getRequestType() : "MATERIAL_REQUEST");
                    rd.setProjectName(mr.getProjectName());
                    rd.setDeliveryAddress(mr.getDeliveryAddress());
                    rd.setCity(mr.getCity());
                    rd.setState(mr.getState());
                    rd.setPinCode(mr.getPinCode());
                    rd.setContactPerson(mr.getContactPerson());
                    rd.setContactPhone(mr.getContactPhone());
                    rd.setExpectedDeliveryDate(mr.getExpectedDeliveryDate());
                    rd.setStatus(mr.getStatus());
                    rd.setEstimatedTotal(mr.getEstimatedTotal());
                    rd.setCreatedAt(mr.getCreatedAt());
                    requestList.add(rd);
                }
            }
        }

        if (clientServiceRequestRepository != null && user.getId() != null) {
            List<ClientServiceRequest> svcRequests = clientServiceRequestRepository.findByClient_IdOrderByCreatedAtDesc(user.getId());
            if (svcRequests != null) {
                for (ClientServiceRequest csr : svcRequests) {
                    CustomerDataExportDto.RequestData rd = new CustomerDataExportDto.RequestData();
                    rd.setRequestId(csr.getRequestId());
                    rd.setRequestType("SERVICE_REQUEST");
                    rd.setProjectName(csr.getProjectName());
                    rd.setRequestedService(csr.getRequestedService());
                    rd.setDeliveryAddress(csr.getLocation());
                    rd.setStatus(csr.getStatus());
                    rd.setEstimatedTotal(csr.getClientBudget());
                    rd.setCreatedAt(csr.getCreatedAt());
                    requestList.add(rd);
                }
            }
        }
        export.setRequests(requestList);

        // 9. Customer Material Orders
        List<CustomerDataExportDto.OrderData> orderList = new ArrayList<>();
        if (materialOrderRepository != null && user.getId() != null) {
            List<MaterialOrder> orders = materialOrderRepository.findByBuyerIdOrderByCreatedAtDesc(user.getId());
            if (orders != null) {
                for (MaterialOrder mo : orders) {
                    CustomerDataExportDto.OrderData od = new CustomerDataExportDto.OrderData();
                    od.setOrderCode(mo.getOrderCode());
                    od.setMaterialAmount(mo.getMaterialAmount());
                    od.setTransportationAmount(mo.getTransportationAmount());
                    od.setTaxGst(mo.getTaxGst());
                    od.setTotalAmount(mo.getTotalAmount());
                    od.setCurrency(mo.getCurrency());
                    od.setDeliveryAddress(mo.getDeliveryAddress());
                    od.setContactNumber(mo.getContactNumber());
                    od.setExpectedDeliveryDate(mo.getExpectedDeliveryDate());
                    od.setPaymentTerms(mo.getPaymentTerms());
                    od.setOrderStatus(mo.getOrderStatus());
                    od.setPaymentStatus(mo.getPaymentStatus());
                    od.setDeliveryStatus(mo.getDeliveryStatus());
                    od.setCreatedAt(mo.getCreatedAt());
                    od.setUpdatedAt(mo.getUpdatedAt());
                    orderList.add(od);
                }
            }
        }
        export.setOrders(orderList);

        // 10. Direct Hire / Hired Professionals
        List<CustomerDataExportDto.DirectHireData> directHireList = new ArrayList<>();
        if (hiredProfessionalService != null) {
            List<HiredProfessionalDto> hiredDtos = hiredProfessionalService.getHiredProfessionalsForUser(user);
            if (hiredDtos != null) {
                for (HiredProfessionalDto hd : hiredDtos) {
                    CustomerDataExportDto.DirectHireData dhd = new CustomerDataExportDto.DirectHireData();
                    dhd.setHiringId(hd.getHiringId());
                    dhd.setRequestId(hd.getRequestId());
                    dhd.setProfessionalName(hd.getProfessionalName());
                    dhd.setServiceType(hd.getServiceType());
                    dhd.setService(hd.getService());
                    dhd.setLocation(hd.getLocation());
                    dhd.setPhone(hd.getPhone());
                    dhd.setEmail(hd.getEmail());
                    dhd.setHiringDate(hd.getHiringDate());
                    dhd.setStatus(hd.getStatus());
                    dhd.setHiredVia(hd.getHiredVia());
                    dhd.setAgreedBudget(hd.getAgreedBudget());
                    dhd.setProjectTitle(hd.getProjectTitle());
                    directHireList.add(dhd);
                }
            }
        }
        export.setDirectHire(directHireList);

        return export;
    }
}
