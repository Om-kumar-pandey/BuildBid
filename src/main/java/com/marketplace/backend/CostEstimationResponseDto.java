package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * BUILDBID COST ESTIMATOR - RESPONSE DTO (Step 3 & Phase 2)
 *
 * Detailed, transparent cost estimation response containing floor-by-floor breakdown,
 * component costs, category sums, structural benchmark validation, source provenance,
 * and structured validation errors.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CostEstimationResponseDto {

    private boolean success;
    private String message;
    private String errorCode;

    private String projectType;
    private String qualityTier;

    private LocationDto location;
    private AreaBreakdownDto area;

    private List<FloorCostDto> floors = new ArrayList<>();
    private BasementCostDto basement;
    private CostBreakdownDto breakdown;
    private List<ComponentItemDto> componentItems = new ArrayList<>();

    private BenchmarkCheckDto benchmarkCheck;
    private TotalEstimateDto total;

    private List<SourceProvenanceDto> sources = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    private List<ValidationErrorDto> validationErrors = new ArrayList<>();

    public CostEstimationResponseDto() {
    }

    public static CostEstimationResponseDto failure(String message, String errorCode) {
        CostEstimationResponseDto res = new CostEstimationResponseDto();
        res.setSuccess(false);
        res.setMessage(message);
        res.setErrorCode(errorCode);
        return res;
    }

    public static CostEstimationResponseDto validationFailure(String message, String errorCode, List<ValidationErrorDto> errors) {
        CostEstimationResponseDto res = new CostEstimationResponseDto();
        res.setSuccess(false);
        res.setMessage(message);
        res.setErrorCode(errorCode);
        if (errors != null) {
            res.setValidationErrors(errors);
        }
        return res;
    }

    // ========================================================
    // NESTED DTOS
    // ========================================================

    public static class ValidationErrorDto {
        private String field;
        private String code;
        private String message;
        private Integer floorNumber;

        public ValidationErrorDto() {}

        public ValidationErrorDto(String field, String code, String message) {
            this.field = field;
            this.code = code;
            this.message = message;
        }

        public ValidationErrorDto(String field, String code, String message, Integer floorNumber) {
            this.field = field;
            this.code = code;
            this.message = message;
            this.floorNumber = floorNumber;
        }

        public String getField() { return field; }
        public void setField(String field) { this.field = field; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public Integer getFloorNumber() { return floorNumber; }
        public void setFloorNumber(Integer floorNumber) { this.floorNumber = floorNumber; }
    }

    public static class LocationDto {
        private String state;
        private String city;
        private String district;
        private String pincode;
        private String resolutionTier; // CITY, DISTRICT, STATE_DEFAULT, NATIONAL_DEFAULT

        public LocationDto() {}

        public LocationDto(String state, String city, String district, String pincode, String resolutionTier) {
            this.state = state;
            this.city = city;
            this.district = district;
            this.pincode = pincode;
            this.resolutionTier = resolutionTier;
        }

        public String getState() { return state; }
        public void setState(String state) { this.state = state; }
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        public String getDistrict() { return district; }
        public void setDistrict(String district) { this.district = district; }
        public String getPincode() { return pincode; }
        public void setPincode(String pincode) { this.pincode = pincode; }
        public String getResolutionTier() { return resolutionTier; }
        public void setResolutionTier(String resolutionTier) { this.resolutionTier = resolutionTier; }
    }

    public static class AreaBreakdownDto {
        private BigDecimal typicalFloorAreaSqFt;
        private BigDecimal totalAboveGroundAreaSqFt;
        private BigDecimal basementAreaSqFt;
        private BigDecimal totalConstructedAreaSqFt;

        // Upgraded fields (Phase 2 & Phase 32)
        private BigDecimal declaredTotalBuildUpAreaSqFt;
        private BigDecimal declaredFloorsAggregateAreaSqFt;
        private BigDecimal totalRoomProgramAreaSqFt;
        private BigDecimal totalPlanningAllowanceSqFt;

        public AreaBreakdownDto() {}

        public AreaBreakdownDto(BigDecimal typicalFloorAreaSqFt, BigDecimal totalAboveGroundAreaSqFt,
                                BigDecimal basementAreaSqFt, BigDecimal totalConstructedAreaSqFt) {
            this.typicalFloorAreaSqFt = typicalFloorAreaSqFt;
            this.totalAboveGroundAreaSqFt = totalAboveGroundAreaSqFt;
            this.basementAreaSqFt = basementAreaSqFt;
            this.totalConstructedAreaSqFt = totalConstructedAreaSqFt;
        }

        public BigDecimal getTypicalFloorAreaSqFt() { return typicalFloorAreaSqFt; }
        public void setTypicalFloorAreaSqFt(BigDecimal typicalFloorAreaSqFt) { this.typicalFloorAreaSqFt = typicalFloorAreaSqFt; }
        public BigDecimal getTotalAboveGroundAreaSqFt() { return totalAboveGroundAreaSqFt; }
        public void setTotalAboveGroundAreaSqFt(BigDecimal totalAboveGroundAreaSqFt) { this.totalAboveGroundAreaSqFt = totalAboveGroundAreaSqFt; }
        public BigDecimal getBasementAreaSqFt() { return basementAreaSqFt; }
        public void setBasementAreaSqFt(BigDecimal basementAreaSqFt) { this.basementAreaSqFt = basementAreaSqFt; }
        public BigDecimal getTotalConstructedAreaSqFt() { return totalConstructedAreaSqFt; }
        public void setTotalConstructedAreaSqFt(BigDecimal totalConstructedAreaSqFt) { this.totalConstructedAreaSqFt = totalConstructedAreaSqFt; }
        public BigDecimal getDeclaredTotalBuildUpAreaSqFt() { return declaredTotalBuildUpAreaSqFt; }
        public void setDeclaredTotalBuildUpAreaSqFt(BigDecimal declaredTotalBuildUpAreaSqFt) { this.declaredTotalBuildUpAreaSqFt = declaredTotalBuildUpAreaSqFt; }
        public BigDecimal getDeclaredFloorsAggregateAreaSqFt() { return declaredFloorsAggregateAreaSqFt; }
        public void setDeclaredFloorsAggregateAreaSqFt(BigDecimal declaredFloorsAggregateAreaSqFt) { this.declaredFloorsAggregateAreaSqFt = declaredFloorsAggregateAreaSqFt; }
        public BigDecimal getTotalRoomProgramAreaSqFt() { return totalRoomProgramAreaSqFt; }
        public void setTotalRoomProgramAreaSqFt(BigDecimal totalRoomProgramAreaSqFt) { this.totalRoomProgramAreaSqFt = totalRoomProgramAreaSqFt; }
        public BigDecimal getTotalPlanningAllowanceSqFt() { return totalPlanningAllowanceSqFt; }
        public void setTotalPlanningAllowanceSqFt(BigDecimal totalPlanningAllowanceSqFt) { this.totalPlanningAllowanceSqFt = totalPlanningAllowanceSqFt; }
    }

    public static class CostRangeDto {
        private BigDecimal low;
        private BigDecimal average;
        private BigDecimal high;

        public CostRangeDto() {}

        public CostRangeDto(BigDecimal low, BigDecimal average, BigDecimal high) {
            this.low = low;
            this.average = average;
            this.high = high;
        }

        public BigDecimal getLow() { return low; }
        public void setLow(BigDecimal low) { this.low = low; }
        public BigDecimal getAverage() { return average; }
        public void setAverage(BigDecimal average) { this.average = average; }
        public BigDecimal getHigh() { return high; }
        public void setHigh(BigDecimal high) { this.high = high; }
    }

    public static class FloorCostDto {
        private int floorNumber;
        private String floorName;
        private BigDecimal areaSqFt;
        private BigDecimal low;
        private BigDecimal average;
        private BigDecimal high;
        private BigDecimal escalationFactor;

        // Upgraded fields (Phases 7, 8, 15, 31)
        private BigDecimal declaredAreaSqFt;
        private BigDecimal roomProgramAreaSqFt;
        private BigDecimal planningAllowanceSqFt;
        private BigDecimal requiredProgramAreaSqFt;
        private BigDecimal remainingCapacitySqFt;
        private String capacityStatus; // VALID, CAPACITY_EXCEEDED
        private String copyMode;
        private Integer sourceFloor;
        private Map<String, Integer> rooms;

        public FloorCostDto() {}

        public FloorCostDto(int floorNumber, String floorName, BigDecimal areaSqFt,
                            BigDecimal low, BigDecimal average, BigDecimal high, BigDecimal escalationFactor) {
            this.floorNumber = floorNumber;
            this.floorName = floorName;
            this.areaSqFt = areaSqFt;
            this.declaredAreaSqFt = areaSqFt;
            this.low = low;
            this.average = average;
            this.high = high;
            this.escalationFactor = escalationFactor;
        }

        public int getFloorNumber() { return floorNumber; }
        public void setFloorNumber(int floorNumber) { this.floorNumber = floorNumber; }
        public String getFloorName() { return floorName; }
        public void setFloorName(String floorName) { this.floorName = floorName; }
        public BigDecimal getAreaSqFt() { return areaSqFt; }
        public void setAreaSqFt(BigDecimal areaSqFt) {
            this.areaSqFt = areaSqFt;
            if (this.declaredAreaSqFt == null) this.declaredAreaSqFt = areaSqFt;
        }
        public BigDecimal getLow() { return low; }
        public void setLow(BigDecimal low) { this.low = low; }
        public BigDecimal getAverage() { return average; }
        public void setAverage(BigDecimal average) { this.average = average; }
        public BigDecimal getHigh() { return high; }
        public void setHigh(BigDecimal high) { this.high = high; }
        public BigDecimal getEscalationFactor() { return escalationFactor; }
        public void setEscalationFactor(BigDecimal escalationFactor) { this.escalationFactor = escalationFactor; }
        public BigDecimal getDeclaredAreaSqFt() { return declaredAreaSqFt; }
        public void setDeclaredAreaSqFt(BigDecimal declaredAreaSqFt) { this.declaredAreaSqFt = declaredAreaSqFt; }
        public BigDecimal getRoomProgramAreaSqFt() { return roomProgramAreaSqFt; }
        public void setRoomProgramAreaSqFt(BigDecimal roomProgramAreaSqFt) { this.roomProgramAreaSqFt = roomProgramAreaSqFt; }
        public BigDecimal getPlanningAllowanceSqFt() { return planningAllowanceSqFt; }
        public void setPlanningAllowanceSqFt(BigDecimal planningAllowanceSqFt) { this.planningAllowanceSqFt = planningAllowanceSqFt; }
        public BigDecimal getRequiredProgramAreaSqFt() { return requiredProgramAreaSqFt; }
        public void setRequiredProgramAreaSqFt(BigDecimal requiredProgramAreaSqFt) { this.requiredProgramAreaSqFt = requiredProgramAreaSqFt; }
        public BigDecimal getRemainingCapacitySqFt() { return remainingCapacitySqFt; }
        public void setRemainingCapacitySqFt(BigDecimal remainingCapacitySqFt) { this.remainingCapacitySqFt = remainingCapacitySqFt; }
        public String getCapacityStatus() { return capacityStatus; }
        public void setCapacityStatus(String capacityStatus) { this.capacityStatus = capacityStatus; }
        public String getCopyMode() { return copyMode; }
        public void setCopyMode(String copyMode) { this.copyMode = copyMode; }
        public Integer getSourceFloor() { return sourceFloor; }
        public void setSourceFloor(Integer sourceFloor) { this.sourceFloor = sourceFloor; }
        public Map<String, Integer> getRooms() { return rooms; }
        public void setRooms(Map<String, Integer> rooms) { this.rooms = rooms; }
    }

    public static class BasementCostDto {
        private BigDecimal areaSqFt;
        private BigDecimal low;
        private BigDecimal average;
        private BigDecimal high;
        private CostRangeDto excavationCost;
        private CostRangeDto waterproofingCost;
        private CostRangeDto structuralCost;

        public BasementCostDto() {}

        public BigDecimal getAreaSqFt() { return areaSqFt; }
        public void setAreaSqFt(BigDecimal areaSqFt) { this.areaSqFt = areaSqFt; }
        public BigDecimal getLow() { return low; }
        public void setLow(BigDecimal low) { this.low = low; }
        public BigDecimal getAverage() { return average; }
        public void setAverage(BigDecimal average) { this.average = average; }
        public BigDecimal getHigh() { return high; }
        public void setHigh(BigDecimal high) { this.high = high; }
        public CostRangeDto getExcavationCost() { return excavationCost; }
        public void setExcavationCost(CostRangeDto excavationCost) { this.excavationCost = excavationCost; }
        public CostRangeDto getWaterproofingCost() { return waterproofingCost; }
        public void setWaterproofingCost(CostRangeDto waterproofingCost) { this.waterproofingCost = waterproofingCost; }
        public CostRangeDto getStructuralCost() { return structuralCost; }
        public void setStructuralCost(CostRangeDto structuralCost) { this.structuralCost = structuralCost; }
    }

    public static class CostBreakdownDto {
        private CostRangeDto material;
        private CostRangeDto labour;
        private CostRangeDto transportation;
        private CostRangeDto machinery;
        private CostRangeDto structural;
        private CostRangeDto basement;
        private ContingencyCostDto contingency;

        // Upgraded: room-driven component additions (Phase 14 & 17)
        private CostRangeDto internalPartitions;
        private CostRangeDto sanitaryPlumbing;
        private CostRangeDto electricalPoints;

        public CostBreakdownDto() {}

        public CostRangeDto getMaterial() { return material; }
        public void setMaterial(CostRangeDto material) { this.material = material; }
        public CostRangeDto getLabour() { return labour; }
        public void setLabour(CostRangeDto labour) { this.labour = labour; }
        public CostRangeDto getTransportation() { return transportation; }
        public void setTransportation(CostRangeDto transportation) { this.transportation = transportation; }
        public CostRangeDto getMachinery() { return machinery; }
        public void setMachinery(CostRangeDto machinery) { this.machinery = machinery; }
        public CostRangeDto getStructural() { return structural; }
        public void setStructural(CostRangeDto structural) { this.structural = structural; }
        public CostRangeDto getBasement() { return basement; }
        public void setBasement(CostRangeDto basement) { this.basement = basement; }
        public ContingencyCostDto getContingency() { return contingency; }
        public void setContingency(ContingencyCostDto contingency) { this.contingency = contingency; }
        public CostRangeDto getInternalPartitions() { return internalPartitions; }
        public void setInternalPartitions(CostRangeDto internalPartitions) { this.internalPartitions = internalPartitions; }
        public CostRangeDto getSanitaryPlumbing() { return sanitaryPlumbing; }
        public void setSanitaryPlumbing(CostRangeDto sanitaryPlumbing) { this.sanitaryPlumbing = sanitaryPlumbing; }
        public CostRangeDto getElectricalPoints() { return electricalPoints; }
        public void setElectricalPoints(CostRangeDto electricalPoints) { this.electricalPoints = electricalPoints; }
    }

    public static class ContingencyCostDto {
        private BigDecimal factor;
        private BigDecimal percentage;
        private BigDecimal low;
        private BigDecimal average;
        private BigDecimal high;

        public ContingencyCostDto() {}

        public BigDecimal getFactor() { return factor; }
        public void setFactor(BigDecimal factor) { this.factor = factor; }
        public BigDecimal getPercentage() { return percentage; }
        public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }
        public BigDecimal getLow() { return low; }
        public void setLow(BigDecimal low) { this.low = low; }
        public BigDecimal getAverage() { return average; }
        public void setAverage(BigDecimal average) { this.average = average; }
        public BigDecimal getHigh() { return high; }
        public void setHigh(BigDecimal high) { this.high = high; }
    }

    public static class ComponentItemDto {
        private String componentName;
        private String category;
        private String unit;
        private BigDecimal quantity;
        private BigDecimal lowRate;
        private BigDecimal averageRate;
        private BigDecimal highRate;
        private BigDecimal lowCost;
        private BigDecimal averageCost;
        private BigDecimal highCost;
        private String source;
        private String sourceUrl;
        private LocalDate rateDate;
        private String geographicTier;

        public ComponentItemDto() {}

        public String getComponentName() { return componentName; }
        public void setComponentName(String componentName) { this.componentName = componentName; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }
        public BigDecimal getQuantity() { return quantity; }
        public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
        public BigDecimal getLowRate() { return lowRate; }
        public void setLowRate(BigDecimal lowRate) { this.lowRate = lowRate; }
        public BigDecimal getAverageRate() { return averageRate; }
        public void setAverageRate(BigDecimal averageRate) { this.averageRate = averageRate; }
        public BigDecimal getHighRate() { return highRate; }
        public void setHighRate(BigDecimal highRate) { this.highRate = highRate; }
        public BigDecimal getLowCost() { return lowCost; }
        public void setLowCost(BigDecimal lowCost) { this.lowCost = lowCost; }
        public BigDecimal getAverageCost() { return averageCost; }
        public void setAverageCost(BigDecimal averageCost) { this.averageCost = averageCost; }
        public BigDecimal getHighCost() { return highCost; }
        public void setHighCost(BigDecimal highCost) { this.highCost = highCost; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public String getSourceUrl() { return sourceUrl; }
        public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
        public LocalDate getRateDate() { return rateDate; }
        public void setRateDate(LocalDate rateDate) { this.rateDate = rateDate; }
        public String getGeographicTier() { return geographicTier; }
        public void setGeographicTier(String geographicTier) { this.geographicTier = geographicTier; }
    }

    public static class BenchmarkCheckDto {
        private String status; // ALIGNED, DIVERGENT, BENCHMARK_UNAVAILABLE
        private String message;
        private CostRangeDto benchmarkPerSqFt;
        private CostRangeDto benchmarkTotal;
        private CostRangeDto componentEstimate;
        private BigDecimal divergencePercentage;

        public BenchmarkCheckDto() {}

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public CostRangeDto getBenchmarkPerSqFt() { return benchmarkPerSqFt; }
        public void setBenchmarkPerSqFt(CostRangeDto benchmarkPerSqFt) { this.benchmarkPerSqFt = benchmarkPerSqFt; }
        public CostRangeDto getBenchmarkTotal() { return benchmarkTotal; }
        public void setBenchmarkTotal(CostRangeDto benchmarkTotal) { this.benchmarkTotal = benchmarkTotal; }
        public CostRangeDto getComponentEstimate() { return componentEstimate; }
        public void setComponentEstimate(CostRangeDto componentEstimate) { this.componentEstimate = componentEstimate; }
        public BigDecimal getDivergencePercentage() { return divergencePercentage; }
        public void setDivergencePercentage(BigDecimal divergencePercentage) { this.divergencePercentage = divergencePercentage; }
    }

    public static class TotalEstimateDto {
        private BigDecimal low;
        private BigDecimal average;
        private BigDecimal high;

        public TotalEstimateDto() {}

        public TotalEstimateDto(BigDecimal low, BigDecimal average, BigDecimal high) {
            this.low = low;
            this.average = average;
            this.high = high;
        }

        public BigDecimal getLow() { return low; }
        public void setLow(BigDecimal low) { this.low = low; }
        public BigDecimal getAverage() { return average; }
        public void setAverage(BigDecimal average) { this.average = average; }
        public BigDecimal getHigh() { return high; }
        public void setHigh(BigDecimal high) { this.high = high; }
    }

    public static class SourceProvenanceDto {
        private String componentName;
        private String category;
        private String rateSource;
        private String sourceUrl;
        private LocalDate rateDate;
        private String geographicTier;

        public SourceProvenanceDto() {}

        public SourceProvenanceDto(String componentName, String category, String rateSource, String sourceUrl, LocalDate rateDate, String geographicTier) {
            this.componentName = componentName;
            this.category = category;
            this.rateSource = rateSource;
            this.sourceUrl = sourceUrl;
            this.rateDate = rateDate;
            this.geographicTier = geographicTier;
        }

        public String getComponentName() { return componentName; }
        public void setComponentName(String componentName) { this.componentName = componentName; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getRateSource() { return rateSource; }
        public void setRateSource(String rateSource) { this.rateSource = rateSource; }
        public String getSourceUrl() { return sourceUrl; }
        public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
        public LocalDate getRateDate() { return rateDate; }
        public void setRateDate(LocalDate rateDate) { this.rateDate = rateDate; }
        public String getGeographicTier() { return geographicTier; }
        public void setGeographicTier(String geographicTier) { this.geographicTier = geographicTier; }
    }

    // ========================================================
    // ROOT GETTERS & SETTERS
    // ========================================================

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    public String getProjectType() { return projectType; }
    public void setProjectType(String projectType) { this.projectType = projectType; }
    public String getQualityTier() { return qualityTier; }
    public void setQualityTier(String qualityTier) { this.qualityTier = qualityTier; }
    public LocationDto getLocation() { return location; }
    public void setLocation(LocationDto location) { this.location = location; }
    public AreaBreakdownDto getArea() { return area; }
    public void setArea(AreaBreakdownDto area) { this.area = area; }
    public List<FloorCostDto> getFloors() { return floors; }
    public void setFloors(List<FloorCostDto> floors) { this.floors = floors; }
    public BasementCostDto getBasement() { return basement; }
    public void setBasement(BasementCostDto basement) { this.basement = basement; }
    public CostBreakdownDto getBreakdown() { return breakdown; }
    public void setBreakdown(CostBreakdownDto breakdown) { this.breakdown = breakdown; }
    public List<ComponentItemDto> getComponentItems() { return componentItems; }
    public void setComponentItems(List<ComponentItemDto> componentItems) { this.componentItems = componentItems; }
    public BenchmarkCheckDto getBenchmarkCheck() { return benchmarkCheck; }
    public void setBenchmarkCheck(BenchmarkCheckDto benchmarkCheck) { this.benchmarkCheck = benchmarkCheck; }
    public TotalEstimateDto getTotal() { return total; }
    public void setTotal(TotalEstimateDto total) { this.total = total; }
    public List<SourceProvenanceDto> getSources() { return sources; }
    public void setSources(List<SourceProvenanceDto> sources) { this.sources = sources; }
    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings; }
    public List<ValidationErrorDto> getValidationErrors() { return validationErrors; }
    public void setValidationErrors(List<ValidationErrorDto> validationErrors) { this.validationErrors = validationErrors; }
}
