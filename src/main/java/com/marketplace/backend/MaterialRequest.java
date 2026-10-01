package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "material_requests")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MaterialRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", unique = true, length = 50, nullable = false)
    private String requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private MarketplaceBackendApplication.MarketplaceUser buyer;

    @Column(name = "buyer_role", nullable = false, length = 50)
    private String buyerRole; // CUSTOMER or CONTRACTOR

    @Column(name = "project_id", length = 50)
    private String projectId;

    @Column(name = "project_name", length = 200)
    private String projectName;

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", nullable = false, length = 100)
    private String state;

    @Column(name = "pin_code", nullable = false, length = 20)
    private String pinCode;

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "expected_delivery_date", length = 50)
    private String expectedDeliveryDate;

    @Column(name = "unloading_by", length = 50)
    private String unloadingBy; // SUPPLIER or BUYER

    @Column(name = "truck_access", length = 50)
    private String truckAccess;

    @Column(name = "request_scope", nullable = false, length = 50)
    private String requestScope = "STATE"; // STATE, ALL_INDIA, LOCAL

    @Column(name = "local_radius")
    private Integer localRadius; // 25 or 50 when requestScope is LOCAL

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "NEW"; // NEW, VIEWED, RESPONDED, CLOSED

    @Column(name = "request_type", length = 50)
    private String requestType = "POSTED_REQUIREMENT"; // POSTED_REQUIREMENT or DIRECT_MATERIAL

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_seller_id")
    private MarketplaceBackendApplication.MarketplaceUser targetSeller;

    @Column(name = "material_price")
    private Double materialPrice;

    @Column(name = "transportation_cost")
    private Double transportationCost;

    @Column(name = "material_amount")
    private Double materialAmount;

    @Column(name = "estimated_total")
    private Double estimatedTotal;

    @Column(name = "verification_code", length = 50)
    private String verificationCode;

    @Column(name = "special_notes", columnDefinition = "TEXT")
    private String specialNotes;

    @OneToMany(mappedBy = "materialRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<MaterialRequestItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public MaterialRequest() {}

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "NEW";
        }
        if (this.requestScope == null || this.requestScope.isBlank()) {
            this.requestScope = "STATE";
        }
        if (this.requestType == null || this.requestType.isBlank()) {
            this.requestType = "POSTED_REQUIREMENT";
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addItem(MaterialRequestItem item) {
        items.add(item);
        item.setMaterialRequest(this);
    }

    public void removeItem(MaterialRequestItem item) {
        items.remove(item);
        item.setMaterialRequest(null);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public MarketplaceBackendApplication.MarketplaceUser getBuyer() { return buyer; }
    public void setBuyer(MarketplaceBackendApplication.MarketplaceUser buyer) { this.buyer = buyer; }

    public String getBuyerRole() { return buyerRole; }
    public void setBuyerRole(String buyerRole) { this.buyerRole = buyerRole; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }

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

    public String getUnloadingBy() { return unloadingBy; }
    public void setUnloadingBy(String unloadingBy) { this.unloadingBy = unloadingBy; }

    public String getTruckAccess() { return truckAccess; }
    public void setTruckAccess(String truckAccess) { this.truckAccess = truckAccess; }

    public String getRequestScope() { return requestScope; }
    public void setRequestScope(String requestScope) { this.requestScope = requestScope; }

    public Integer getLocalRadius() { return localRadius; }
    public void setLocalRadius(Integer localRadius) { this.localRadius = localRadius; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSpecialNotes() { return specialNotes; }
    public void setSpecialNotes(String specialNotes) { this.specialNotes = specialNotes; }

    public List<MaterialRequestItem> getItems() { return items; }
    public void setItems(List<MaterialRequestItem> items) { this.items = items; }

    public String getRequestType() { return requestType; }
    public void setRequestType(String requestType) { this.requestType = requestType; }

    public MarketplaceBackendApplication.MarketplaceUser getTargetSeller() { return targetSeller; }
    public void setTargetSeller(MarketplaceBackendApplication.MarketplaceUser targetSeller) { this.targetSeller = targetSeller; }

    public Double getMaterialPrice() { return materialPrice; }
    public void setMaterialPrice(Double materialPrice) { this.materialPrice = materialPrice; }

    public Double getTransportationCost() { return transportationCost; }
    public void setTransportationCost(Double transportationCost) { this.transportationCost = transportationCost; }

    public Double getMaterialAmount() { return materialAmount; }
    public void setMaterialAmount(Double materialAmount) { this.materialAmount = materialAmount; }

    public Double getEstimatedTotal() { return estimatedTotal; }
    public void setEstimatedTotal(Double estimatedTotal) { this.estimatedTotal = estimatedTotal; }

    public String getVerificationCode() { return verificationCode; }
    public void setVerificationCode(String verificationCode) { this.verificationCode = verificationCode; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
