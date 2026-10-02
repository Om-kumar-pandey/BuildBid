package com.marketplace.backend;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * Floor Requirement model for floor-wise area, room program, and copy modes.
 */
public class FloorRequirementDto {

    public static final String COPY_MODE_MANUAL = "MANUAL";
    public static final String COPY_MODE_SAME_AS_FIRST = "SAME_AS_FIRST_FLOOR";
    public static final String COPY_MODE_SAME_AS_PREVIOUS = "SAME_AS_PREVIOUS_FLOOR";

    private Integer floorNumber; // 0 = Ground Floor, 1 = 1st Floor, etc.
    private String floorName;
    private BigDecimal declaredAreaSqFt;
    private String copyMode = COPY_MODE_MANUAL;
    private Integer sourceFloor;
    private Map<String, Integer> rooms = new HashMap<>();
    private Map<String, CustomRoomDimensionDto> customDimensions = new HashMap<>();
    private String specialRequirements;

    public FloorRequirementDto() {}

    public FloorRequirementDto(Integer floorNumber, String floorName, BigDecimal declaredAreaSqFt) {
        this.floorNumber = floorNumber;
        this.floorName = floorName;
        this.declaredAreaSqFt = declaredAreaSqFt;
        this.copyMode = COPY_MODE_MANUAL;
    }

    /**
     * Creates a deep-copy of this FloorRequirementDto to prevent source mutation.
     */
    public FloorRequirementDto deepCopy(int targetFloorNumber, String targetFloorName, String targetCopyMode, Integer sourceFloorIndex) {
        FloorRequirementDto copy = new FloorRequirementDto();
        copy.setFloorNumber(targetFloorNumber);
        copy.setFloorName(targetFloorName != null ? targetFloorName : this.floorName);
        copy.setDeclaredAreaSqFt(this.declaredAreaSqFt);
        copy.setCopyMode(targetCopyMode != null ? targetCopyMode : COPY_MODE_MANUAL);
        copy.setSourceFloor(sourceFloorIndex);

        if (this.rooms != null) {
            copy.setRooms(new HashMap<>(this.rooms));
        }

        if (this.customDimensions != null) {
            Map<String, CustomRoomDimensionDto> cdCopy = new HashMap<>();
            for (Map.Entry<String, CustomRoomDimensionDto> entry : this.customDimensions.entrySet()) {
                CustomRoomDimensionDto dim = entry.getValue();
                if (dim != null) {
                    cdCopy.put(entry.getKey(), new CustomRoomDimensionDto(dim.getLengthFt(), dim.getWidthFt(), dim.getAreaSqFt()));
                }
            }
            copy.setCustomDimensions(cdCopy);
        }

        copy.setSpecialRequirements(this.specialRequirements);
        return copy;
    }

    public Integer getFloorNumber() { return floorNumber; }
    public void setFloorNumber(Integer floorNumber) { this.floorNumber = floorNumber; }

    public String getFloorName() { return floorName; }
    public void setFloorName(String floorName) { this.floorName = floorName; }

    public BigDecimal getDeclaredAreaSqFt() { return declaredAreaSqFt; }
    public void setDeclaredAreaSqFt(BigDecimal declaredAreaSqFt) { this.declaredAreaSqFt = declaredAreaSqFt; }

    public String getCopyMode() { return copyMode; }
    public void setCopyMode(String copyMode) { this.copyMode = copyMode; }

    public Integer getSourceFloor() { return sourceFloor; }
    public void setSourceFloor(Integer sourceFloor) { this.sourceFloor = sourceFloor; }

    public Map<String, Integer> getRooms() { return rooms; }
    public void setRooms(Map<String, Integer> rooms) { this.rooms = rooms; }

    public Map<String, CustomRoomDimensionDto> getCustomDimensions() { return customDimensions; }
    public void setCustomDimensions(Map<String, CustomRoomDimensionDto> customDimensions) { this.customDimensions = customDimensions; }

    public String getSpecialRequirements() { return specialRequirements; }
    public void setSpecialRequirements(String specialRequirements) { this.specialRequirements = specialRequirements; }
}
