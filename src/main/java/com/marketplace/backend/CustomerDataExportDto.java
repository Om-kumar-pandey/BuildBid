package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * BUILDBID — ACCOUNT SETTINGS — STEP 7
 * Customer Data Export Transfer Object (V1.0)
 *
 * Dedicated export model for customer-owned and customer-visible data.
 * STRICT SECURITY CONSTRAINTS:
 * - NEVER includes password hashes, passwords, JWT tokens, OTPs, or verification secrets.
 * - Empty collections serialize cleanly as [] rather than causing nulls or errors.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CustomerDataExportDto {

    private String exportVersion = "1.0";
    private String exportedAt;
    private AccountData account;
    private ProfileData profile;
    private VerificationData verification;
    private ConstructionPreferencesData constructionPreferences;
    private List<SavedLocationData> savedLocations = new ArrayList<>();
    private RegionalPreferencesData regionalPreferences;
    private List<ProjectData> projects = new ArrayList<>();
    private List<RequestData> requests = new ArrayList<>();
    private List<OrderData> orders = new ArrayList<>();
    private List<DirectHireData> directHire = new ArrayList<>();

    public CustomerDataExportDto() {}

    public String getExportVersion() { return exportVersion; }
    public void setExportVersion(String exportVersion) { this.exportVersion = exportVersion; }

    public String getExportedAt() { return exportedAt; }
    public void setExportedAt(String exportedAt) { this.exportedAt = exportedAt; }

    public AccountData getAccount() { return account; }
    public void setAccount(AccountData account) { this.account = account; }

    public ProfileData getProfile() { return profile; }
    public void setProfile(ProfileData profile) { this.profile = profile; }

    public VerificationData getVerification() { return verification; }
    public void setVerification(VerificationData verification) { this.verification = verification; }

    public ConstructionPreferencesData getConstructionPreferences() { return constructionPreferences; }
    public void setConstructionPreferences(ConstructionPreferencesData constructionPreferences) { this.constructionPreferences = constructionPreferences; }

    public List<SavedLocationData> getSavedLocations() {
        return savedLocations != null ? savedLocations : new ArrayList<>();
    }
    public void setSavedLocations(List<SavedLocationData> savedLocations) {
        this.savedLocations = savedLocations != null ? savedLocations : new ArrayList<>();
    }

    public RegionalPreferencesData getRegionalPreferences() { return regionalPreferences; }
    public void setRegionalPreferences(RegionalPreferencesData regionalPreferences) { this.regionalPreferences = regionalPreferences; }

    public List<ProjectData> getProjects() {
        return projects != null ? projects : new ArrayList<>();
    }
    public void setProjects(List<ProjectData> projects) {
        this.projects = projects != null ? projects : new ArrayList<>();
    }

    public List<RequestData> getRequests() {
        return requests != null ? requests : new ArrayList<>();
    }
    public void setRequests(List<RequestData> requests) {
        this.requests = requests != null ? requests : new ArrayList<>();
    }

    public List<OrderData> getOrders() {
        return orders != null ? orders : new ArrayList<>();
    }
    public void setOrders(List<OrderData> orders) {
        this.orders = orders != null ? orders : new ArrayList<>();
    }

    public List<DirectHireData> getDirectHire() {
        return directHire != null ? directHire : new ArrayList<>();
    }
    public void setDirectHire(List<DirectHireData> directHire) {
        this.directHire = directHire != null ? directHire : new ArrayList<>();
    }

    // ============================================================
    // 1. ACCOUNT DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AccountData {
        private String name;
        private String username;
        private String email;
        private String phone;
        private String location;
        private String profilePhotoUrl;
        private Set<String> roles;
        private LocalDateTime memberSince;

        public AccountData() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public String getProfilePhotoUrl() { return profilePhotoUrl; }
        public void setProfilePhotoUrl(String profilePhotoUrl) { this.profilePhotoUrl = profilePhotoUrl; }

        public Set<String> getRoles() { return roles; }
        public void setRoles(Set<String> roles) { this.roles = roles; }

        public LocalDateTime getMemberSince() { return memberSince; }
        public void setMemberSince(LocalDateTime memberSince) { this.memberSince = memberSince; }
    }

    // ============================================================
    // 2. PROFILE DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ProfileData {
        private String fullName;
        private String email;
        private String phone;
        private String profilePhoto;
        private String address;
        private String city;
        private String state;
        private String pincode;
        private String aboutMe;
        private String preferredLanguage;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public ProfileData() {}

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getProfilePhoto() { return profilePhoto; }
        public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public String getState() { return state; }
        public void setState(String state) { this.state = state; }

        public String getPincode() { return pincode; }
        public void setPincode(String pincode) { this.pincode = pincode; }

        public String getAboutMe() { return aboutMe; }
        public void setAboutMe(String aboutMe) { this.aboutMe = aboutMe; }

        public String getPreferredLanguage() { return preferredLanguage; }
        public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }

    // ============================================================
    // 3. VERIFICATION & SECURITY STATUS
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class VerificationData {
        private boolean emailVerified;
        private LocalDateTime emailVerifiedAt;
        private boolean phoneVerified;
        private LocalDateTime phoneVerifiedAt;
        private LocalDateTime passwordUpdatedAt;
        private boolean hasPassword;

        public VerificationData() {}

        public boolean isEmailVerified() { return emailVerified; }
        public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

        public LocalDateTime getEmailVerifiedAt() { return emailVerifiedAt; }
        public void setEmailVerifiedAt(LocalDateTime emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; }

        public boolean isPhoneVerified() { return phoneVerified; }
        public void setPhoneVerified(boolean phoneVerified) { this.phoneVerified = phoneVerified; }

        public LocalDateTime getPhoneVerifiedAt() { return phoneVerifiedAt; }
        public void setPhoneVerifiedAt(LocalDateTime phoneVerifiedAt) { this.phoneVerifiedAt = phoneVerifiedAt; }

        public LocalDateTime getPasswordUpdatedAt() { return passwordUpdatedAt; }
        public void setPasswordUpdatedAt(LocalDateTime passwordUpdatedAt) { this.passwordUpdatedAt = passwordUpdatedAt; }

        public boolean isHasPassword() { return hasPassword; }
        public void setHasPassword(boolean hasPassword) { this.hasPassword = hasPassword; }
    }

    // ============================================================
    // 4. CONSTRUCTION PREFERENCES DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ConstructionPreferencesData {
        private String preferredProjectType;
        private String preferredPropertyType;
        private Double preferredBuiltUpArea;
        private String preferredNumberOfFloors;
        private String preferredConstructionQuality;
        private String preferredBudgetRange;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public ConstructionPreferencesData() {}

        public String getPreferredProjectType() { return preferredProjectType; }
        public void setPreferredProjectType(String preferredProjectType) { this.preferredProjectType = preferredProjectType; }

        public String getPreferredPropertyType() { return preferredPropertyType; }
        public void setPreferredPropertyType(String preferredPropertyType) { this.preferredPropertyType = preferredPropertyType; }

        public Double getPreferredBuiltUpArea() { return preferredBuiltUpArea; }
        public void setPreferredBuiltUpArea(Double preferredBuiltUpArea) { this.preferredBuiltUpArea = preferredBuiltUpArea; }

        public String getPreferredNumberOfFloors() { return preferredNumberOfFloors; }
        public void setPreferredNumberOfFloors(String preferredNumberOfFloors) { this.preferredNumberOfFloors = preferredNumberOfFloors; }

        public String getPreferredConstructionQuality() { return preferredConstructionQuality; }
        public void setPreferredConstructionQuality(String preferredConstructionQuality) { this.preferredConstructionQuality = preferredConstructionQuality; }

        public String getPreferredBudgetRange() { return preferredBudgetRange; }
        public void setPreferredBudgetRange(String preferredBudgetRange) { this.preferredBudgetRange = preferredBudgetRange; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }

    // ============================================================
    // 5. SAVED LOCATION DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SavedLocationData {
        private Long id;
        private String label;
        private String addressLine1;
        private String addressLine2;
        private String city;
        private String state;
        private String pincode;
        private String landmark;
        private boolean isDefault;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public SavedLocationData() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }

        public String getAddressLine1() { return addressLine1; }
        public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }

        public String getAddressLine2() { return addressLine2; }
        public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public String getState() { return state; }
        public void setState(String state) { this.state = state; }

        public String getPincode() { return pincode; }
        public void setPincode(String pincode) { this.pincode = pincode; }

        public String getLandmark() { return landmark; }
        public void setLandmark(String landmark) { this.landmark = landmark; }

        public boolean isDefault() { return isDefault; }
        public void setDefault(boolean aDefault) { isDefault = aDefault; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }

    // ============================================================
    // 6. REGIONAL PREFERENCES DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class RegionalPreferencesData {
        private String preferredLanguage;
        private String timeZone;
        private String currency;
        private String areaUnit;
        private String dateFormat;
        private String numberFormat;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public RegionalPreferencesData() {}

        public String getPreferredLanguage() { return preferredLanguage; }
        public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

        public String getTimeZone() { return timeZone; }
        public void setTimeZone(String timeZone) { this.timeZone = timeZone; }

        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }

        public String getAreaUnit() { return areaUnit; }
        public void setAreaUnit(String areaUnit) { this.areaUnit = areaUnit; }

        public String getDateFormat() { return dateFormat; }
        public void setDateFormat(String dateFormat) { this.dateFormat = dateFormat; }

        public String getNumberFormat() { return numberFormat; }
        public void setNumberFormat(String numberFormat) { this.numberFormat = numberFormat; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }

    // ============================================================
    // 7. PROJECT DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ProjectData {
        private String projectId;
        private String projectTitle;
        private String projectType;
        private String city;
        private String state;
        private String pincode;
        private String address;
        private String location;
        private Double plotArea;
        private Double builtUpArea;
        private Double totalArea;
        private String floors;
        private String qualityTier;
        private String estimatedCost;
        private String budget;
        private Double budgetMin;
        private Double budgetMax;
        private String timeline;
        private String targetStartDate;
        private String paymentPreference;
        private String privacyPreference;
        private String description;
        private String scopeOfWork;
        private String status;
        private Map<String, Boolean> requirements;
        private LocalDateTime createdAt;

        public ProjectData() {}

        public String getProjectId() { return projectId; }
        public void setProjectId(String projectId) { this.projectId = projectId; }

        public String getProjectTitle() { return projectTitle; }
        public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }

        public String getProjectType() { return projectType; }
        public void setProjectType(String projectType) { this.projectType = projectType; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public String getState() { return state; }
        public void setState(String state) { this.state = state; }

        public String getPincode() { return pincode; }
        public void setPincode(String pincode) { this.pincode = pincode; }

        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public Double getPlotArea() { return plotArea; }
        public void setPlotArea(Double plotArea) { this.plotArea = plotArea; }

        public Double getBuiltUpArea() { return builtUpArea; }
        public void setBuiltUpArea(Double builtUpArea) { this.builtUpArea = builtUpArea; }

        public Double getTotalArea() { return totalArea; }
        public void setTotalArea(Double totalArea) { this.totalArea = totalArea; }

        public String getFloors() { return floors; }
        public void setFloors(String floors) { this.floors = floors; }

        public String getQualityTier() { return qualityTier; }
        public void setQualityTier(String qualityTier) { this.qualityTier = qualityTier; }

        public String getEstimatedCost() { return estimatedCost; }
        public void setEstimatedCost(String estimatedCost) { this.estimatedCost = estimatedCost; }

        public String getBudget() { return budget; }
        public void setBudget(String budget) { this.budget = budget; }

        public Double getBudgetMin() { return budgetMin; }
        public void setBudgetMin(Double budgetMin) { this.budgetMin = budgetMin; }

        public Double getBudgetMax() { return budgetMax; }
        public void setBudgetMax(Double budgetMax) { this.budgetMax = budgetMax; }

        public String getTimeline() { return timeline; }
        public void setTimeline(String timeline) { this.timeline = timeline; }

        public String getTargetStartDate() { return targetStartDate; }
        public void setTargetStartDate(String targetStartDate) { this.targetStartDate = targetStartDate; }

        public String getPaymentPreference() { return paymentPreference; }
        public void setPaymentPreference(String paymentPreference) { this.paymentPreference = paymentPreference; }

        public String getPrivacyPreference() { return privacyPreference; }
        public void setPrivacyPreference(String privacyPreference) { this.privacyPreference = privacyPreference; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getScopeOfWork() { return scopeOfWork; }
        public void setScopeOfWork(String scopeOfWork) { this.scopeOfWork = scopeOfWork; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Map<String, Boolean> getRequirements() { return requirements; }
        public void setRequirements(Map<String, Boolean> requirements) { this.requirements = requirements; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    // ============================================================
    // 8. REQUEST DATA (MATERIAL & SERVICE REQUESTS)
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class RequestData {
        private String requestId;
        private String requestType; // MATERIAL_REQUIREMENT, DIRECT_BUY, DIRECT_HIRE, SERVICE_REQUEST
        private String projectName;
        private String requestedService;
        private String deliveryAddress;
        private String city;
        private String state;
        private String pinCode;
        private String contactPerson;
        private String contactPhone;
        private String expectedDeliveryDate;
        private String status;
        private Double estimatedTotal;
        private LocalDateTime createdAt;

        public RequestData() {}

        public String getRequestId() { return requestId; }
        public void setRequestId(String requestId) { this.requestId = requestId; }

        public String getRequestType() { return requestType; }
        public void setRequestType(String requestType) { this.requestType = requestType; }

        public String getProjectName() { return projectName; }
        public void setProjectName(String projectName) { this.projectName = projectName; }

        public String getRequestedService() { return requestedService; }
        public void setRequestedService(String requestedService) { this.requestedService = requestedService; }

        public String getDeliveryAddress() { return deliveryAddress; }
        public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public String getState() { return state; }
        public void setState(String state) { this.state = state; }

        public String getPinCode() { return pinCode; }
        public void setPinCode(String pinCode) { this.pinCode = pinCode; }

        public String getContactPerson() { return contactPerson; }
        public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

        public String getContactPhone() { return contactPhone; }
        public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

        public String getExpectedDeliveryDate() { return expectedDeliveryDate; }
        public void setExpectedDeliveryDate(String expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Double getEstimatedTotal() { return estimatedTotal; }
        public void setEstimatedTotal(Double estimatedTotal) { this.estimatedTotal = estimatedTotal; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    // ============================================================
    // 9. MATERIAL ORDER DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class OrderData {
        private String orderCode;
        private Double materialAmount;
        private Double transportationAmount;
        private Double taxGst;
        private Double totalAmount;
        private String currency;
        private String deliveryAddress;
        private String contactNumber;
        private String expectedDeliveryDate;
        private String paymentTerms;
        private String orderStatus;
        private String paymentStatus;
        private String deliveryStatus;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public OrderData() {}

        public String getOrderCode() { return orderCode; }
        public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

        public Double getMaterialAmount() { return materialAmount; }
        public void setMaterialAmount(Double materialAmount) { this.materialAmount = materialAmount; }

        public Double getTransportationAmount() { return transportationAmount; }
        public void setTransportationAmount(Double transportationAmount) { this.transportationAmount = transportationAmount; }

        public Double getTaxGst() { return taxGst; }
        public void setTaxGst(Double taxGst) { this.taxGst = taxGst; }

        public Double getTotalAmount() { return totalAmount; }
        public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }

        public String getDeliveryAddress() { return deliveryAddress; }
        public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

        public String getContactNumber() { return contactNumber; }
        public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

        public String getExpectedDeliveryDate() { return expectedDeliveryDate; }
        public void setExpectedDeliveryDate(String expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }

        public String getPaymentTerms() { return paymentTerms; }
        public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

        public String getOrderStatus() { return orderStatus; }
        public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

        public String getPaymentStatus() { return paymentStatus; }
        public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

        public String getDeliveryStatus() { return deliveryStatus; }
        public void setDeliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }

    // ============================================================
    // 10. DIRECT HIRE / HIRED PROFESSIONALS DATA
    // ============================================================
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DirectHireData {
        private String hiringId;
        private String requestId;
        private String professionalName;
        private String serviceType;
        private String service;
        private String location;
        private String phone;
        private String email;
        private LocalDateTime hiringDate;
        private String status;
        private String hiredVia;
        private Double agreedBudget;
        private String projectTitle;

        public DirectHireData() {}

        public String getHiringId() { return hiringId; }
        public void setHiringId(String hiringId) { this.hiringId = hiringId; }

        public String getRequestId() { return requestId; }
        public void setRequestId(String requestId) { this.requestId = requestId; }

        public String getProfessionalName() { return professionalName; }
        public void setProfessionalName(String professionalName) { this.professionalName = professionalName; }

        public String getServiceType() { return serviceType; }
        public void setServiceType(String serviceType) { this.serviceType = serviceType; }

        public String getService() { return service; }
        public void setService(String service) { this.service = service; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public LocalDateTime getHiringDate() { return hiringDate; }
        public void setHiringDate(LocalDateTime hiringDate) { this.hiringDate = hiringDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getHiredVia() { return hiredVia; }
        public void setHiredVia(String hiredVia) { this.hiredVia = hiredVia; }

        public Double getAgreedBudget() { return agreedBudget; }
        public void setAgreedBudget(Double agreedBudget) { this.agreedBudget = agreedBudget; }

        public String getProjectTitle() { return projectTitle; }
        public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }
    }
}
