package com.marketplace.backend;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Custom dimensions for an individual room instance (e.g. Bedrooms_1).
 */
public class CustomRoomDimensionDto {
    private BigDecimal lengthFt;
    private BigDecimal widthFt;
    private BigDecimal areaSqFt;

    public CustomRoomDimensionDto() {}

    public CustomRoomDimensionDto(BigDecimal lengthFt, BigDecimal widthFt, BigDecimal areaSqFt) {
        this.lengthFt = lengthFt;
        this.widthFt = widthFt;
        this.areaSqFt = areaSqFt;
    }

    public BigDecimal getLengthFt() { return lengthFt; }
    public void setLengthFt(BigDecimal lengthFt) { this.lengthFt = lengthFt; }

    public BigDecimal getWidthFt() { return widthFt; }
    public void setWidthFt(BigDecimal widthFt) { this.widthFt = widthFt; }

    public BigDecimal getAreaSqFt() {
        if (areaSqFt != null && areaSqFt.compareTo(BigDecimal.ZERO) > 0) {
            return areaSqFt;
        }
        if (lengthFt != null && widthFt != null
                && lengthFt.compareTo(BigDecimal.ZERO) > 0 && widthFt.compareTo(BigDecimal.ZERO) > 0) {
            return lengthFt.multiply(widthFt).setScale(2, RoundingMode.HALF_UP);
        }
        return null;
    }

    public void setAreaSqFt(BigDecimal areaSqFt) { this.areaSqFt = areaSqFt; }
}
