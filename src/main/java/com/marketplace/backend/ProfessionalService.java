package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Entity representing a published service offered by an authenticated Professional.
 * 
 * Supports both:
 * 1. Basic trade / labour services (verification_required = false, status = NOT_REQUIRED)
 * 2. High-level credential-based services (verification_required = true, status = PENDING until admin verification)
 */
@Entity
@Table(name = "professional_services")
public class ProfessionalService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "professional_id", nullable = false)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser professional;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "master_service_id", nullable = false)
    private MasterService masterService;

    @Column(name = "service_title_en", nullable = false, length = 200)
    private String serviceTitleEn;

    @Column(name = "service_title_hi", nullable = false, length = 200)
    private String serviceTitleHi;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "detailed_description", columnDefinition = "TEXT")
    private String detailedDescription;

    @Column(name = "whats_included", columnDefinition = "TEXT")
    private String whatsIncluded;

    @Column(name = "whats_not_included", columnDefinition = "TEXT")
    private String whatsNotIncluded;

    @Column(name = "price", nullable = false)
    private Double price;

    @Column(name = "pricing_unit", nullable = false, length = 100)
    private String pricingUnit;

    @Column(name = "turnaround_time", length = 100)
    private String turnaroundTime;

    @Column(name = "service_area_radius_km")
    private Integer serviceAreaRadiusKm;

    @Column(name = "service_mode", length = 50)
    private String serviceMode; // ON_SITE, REMOTE, BOTH

    @Column(name = "verification_required", nullable = false)
    private boolean verificationRequired = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 50)
    private VerificationStatus verificationStatus = VerificationStatus.NOT_REQUIRED;

    @Column(name = "qualification_title", length = 250)
    private String qualificationTitle;

    @Column(name = "license_number", length = 150)
    private String licenseNumber;

    @Column(name = "issuing_authority", length = 250)
    private String issuingAuthority;

    @Column(name = "document_name", length = 250)
    private String documentName;

    @Column(name = "document_type", length = 100)
    private String documentType;

    @Lob
    @Column(name = "document_data", columnDefinition = "LONGTEXT")
    @JsonIgnore
    private String documentData;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ProfessionalService() {}

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper getters for JSON serialization
    @JsonProperty("professionalId")
    public Long getProfessionalId() {
        return professional != null ? professional.getId() : null;
    }

    @JsonProperty("professionalName")
    public String getProfessionalName() {
        return professional != null ? professional.getName() : null;
    }

    @JsonProperty("professionalLocation")
    public String getProfessionalLocation() {
        return professional != null ? professional.getLocation() : null;
    }

    @JsonProperty("hasDocument")
    public boolean hasDocument() {
        return documentData != null && !documentData.isBlank();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MarketplaceBackendApplication.MarketplaceUser getProfessional() {
        return professional;
    }

    public void setProfessional(MarketplaceBackendApplication.MarketplaceUser professional) {
        this.professional = professional;
    }

    public MasterService getMasterService() {
        return masterService;
    }

    public void setMasterService(MasterService masterService) {
        this.masterService = masterService;
    }

    public String getServiceTitleEn() {
        return serviceTitleEn;
    }

    public void setServiceTitleEn(String serviceTitleEn) {
        this.serviceTitleEn = serviceTitleEn;
    }

    public String getServiceTitleHi() {
        return serviceTitleHi;
    }

    public void setServiceTitleHi(String serviceTitleHi) {
        this.serviceTitleHi = serviceTitleHi;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getDetailedDescription() {
        return detailedDescription;
    }

    public void setDetailedDescription(String detailedDescription) {
        this.detailedDescription = detailedDescription;
    }

    public String getWhatsIncluded() {
        return whatsIncluded;
    }

    public void setWhatsIncluded(String whatsIncluded) {
        this.whatsIncluded = whatsIncluded;
    }

    public String getWhatsNotIncluded() {
        return whatsNotIncluded;
    }

    public void setWhatsNotIncluded(String whatsNotIncluded) {
        this.whatsNotIncluded = whatsNotIncluded;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public String getPricingUnit() {
        return pricingUnit;
    }

    public void setPricingUnit(String pricingUnit) {
        this.pricingUnit = pricingUnit;
    }

    public String getTurnaroundTime() {
        return turnaroundTime;
    }

    public void setTurnaroundTime(String turnaroundTime) {
        this.turnaroundTime = turnaroundTime;
    }

    public Integer getServiceAreaRadiusKm() {
        return serviceAreaRadiusKm;
    }

    public void setServiceAreaRadiusKm(Integer serviceAreaRadiusKm) {
        this.serviceAreaRadiusKm = serviceAreaRadiusKm;
    }

    public String getServiceMode() {
        return serviceMode;
    }

    public void setServiceMode(String serviceMode) {
        this.serviceMode = serviceMode;
    }

    public boolean isVerificationRequired() {
        return verificationRequired;
    }

    public void setVerificationRequired(boolean verificationRequired) {
        this.verificationRequired = verificationRequired;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(VerificationStatus verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public String getQualificationTitle() {
        return qualificationTitle;
    }

    public void setQualificationTitle(String qualificationTitle) {
        this.qualificationTitle = qualificationTitle;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public String getIssuingAuthority() {
        return issuingAuthority;
    }

    public void setIssuingAuthority(String issuingAuthority) {
        this.issuingAuthority = issuingAuthority;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public String getDocumentType() {
        return documentType;
    }

    public void setDocumentType(String documentType) {
        this.documentType = documentType;
    }

    public String getDocumentData() {
        return documentData;
    }

    public void setDocumentData(String documentData) {
        this.documentData = documentData;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
