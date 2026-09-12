package com.marketplace.backend;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String type;
    private String city;
    private String state;
    private String pincode;
    private String address; // <--- फ्रंटएंड के एड्रेस के लिए जोड़ा गया
    private Double plotArea;
    private Double builtUpArea;
    private Integer floors;
    private String qualityTier;
    private String estimatedCost;
    
    // बजट और टाइमलाइन जो फ्रंटएंड से आ रहे हैं
    private Double budgetMin;
    private Double budgetMax;
    private String targetStartDate;

    @ElementCollection
    @CollectionTable(name = "project_requirements", joinColumns = @JoinColumn(name = "project_id"))
    @MapKeyColumn(name = "requirement_name")
    @Column(name = "is_required")
    private Map<String, Boolean> requirements;

    private String status = "OPEN";

    // पूरा डायनेमिक JSON डेटा सेव करने के लिए
    @Column(columnDefinition = "TEXT")
    private String completeDataJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private MarketplaceBackendApplication.MarketplaceUser customer;

    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Project() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getPlotArea() { return plotArea; }
    public void setPlotArea(Double plotArea) { this.plotArea = plotArea; }

    public Double getBuiltUpArea() { return builtUpArea; }
    public void setBuiltUpArea(Double builtUpArea) { this.builtUpArea = builtUpArea; }

    public Integer getFloors() { return floors; }
    public void setFloors(Integer floors) { this.floors = floors; }

    public String getQualityTier() { return qualityTier; }
    public void setQualityTier(String qualityTier) { this.qualityTier = qualityTier; }

    public String getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(String estimatedCost) { this.estimatedCost = estimatedCost; }

    public Double getBudgetMin() { return budgetMin; }
    public void setBudgetMin(Double budgetMin) { this.budgetMin = budgetMin; }

    public Double getBudgetMax() { return budgetMax; }
    public void setBudgetMax(Double budgetMax) { this.budgetMax = budgetMax; }

    public String getTargetStartDate() { return targetStartDate; }
    public void setTargetStartDate(String targetStartDate) { this.targetStartDate = targetStartDate; }

    public Map<String, Boolean> getRequirements() { return requirements; }
    public void setRequirements(Map<String, Boolean> requirements) { this.requirements = requirements; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getCompleteDataJson() { return completeDataJson; }
    public void setCompleteDataJson(String completeDataJson) { this.completeDataJson = completeDataJson; }

    public MarketplaceBackendApplication.MarketplaceUser getCustomer() { return customer; }
    public void setCustomer(MarketplaceBackendApplication.MarketplaceUser customer) { this.customer = customer; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
