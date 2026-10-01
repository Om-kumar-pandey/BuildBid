package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/seller/materials")
public class MaterialController {

    private final MaterialRepository materialRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final GeoLocationService geoLocationService;

    @Autowired
    public MaterialController(MaterialRepository materialRepository,
                              MarketplaceBackendApplication.UserRepository userRepository,
                              GeoLocationService geoLocationService) {
        this.materialRepository = materialRepository;
        this.userRepository = userRepository;
        this.geoLocationService = geoLocationService;
    }

    @PostMapping({"", "/"})
    public ResponseEntity<?> createMaterial(@RequestBody Map<String, Object> payload,
                                            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a seller."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Seller account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = userOpt.get();

        // 1. Validate Category
        String category = payload.get("category") != null ? payload.get("category").toString().trim() : "";
        if (category.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Category is required — श्रेणी आवश्यक है"));
        }

        // 2. Validate Material Name
        String materialName = payload.get("materialName") != null ? payload.get("materialName").toString().trim() : "";
        if (materialName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Material Name is required — सामग्री का नाम आवश्यक है"));
        }

        // 3. Optional fields
        String brand = payload.get("brand") != null ? payload.get("brand").toString().trim() : "";
        String specifications = payload.get("specifications") != null ? payload.get("specifications").toString().trim() : "";
        String description = payload.get("description") != null ? payload.get("description").toString().trim() : "";

        // 4. Validate Stock
        Double initialStock = parseDoubleSafe(payload.get("initialStock"));
        if (initialStock == null) {
            initialStock = parseDoubleSafe(payload.get("currentStock"));
        }
        if (initialStock == null || initialStock <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid stock quantity is required (> 0) — वैध स्टॉक मात्रा आवश्यक है"));
        }

        // 5. Validate Unit
        String unit = payload.get("unit") != null ? payload.get("unit").toString().trim() : "";
        if (unit.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unit is required — इकाई आवश्यक है"));
        }

        // 6. Validate Unit Price
        Double unitPrice = parseDoubleSafe(payload.get("unitPrice"));
        if (unitPrice == null || unitPrice <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid selling price is required (> 0) — वैध विक्रय मूल्य आवश्यक है"));
        }

        // 7. Validate and parse Reserved Stock
        Double reservedStock = parseDoubleSafe(payload.get("reservedStock"));
        if (reservedStock == null) {
            reservedStock = 0.0;
        }
        if (reservedStock < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Reserved Stock cannot be negative — आरक्षित स्टॉक नकारात्मक नहीं हो सकता"));
        }
        if (reservedStock > initialStock) {
            return ResponseEntity.badRequest().body(Map.of("error", "Reserved Stock cannot be greater than Current Stock. आरक्षित स्टॉक वर्तमान स्टॉक से अधिक नहीं हो सकता।"));
        }

        double availableStock = initialStock - reservedStock;

        String stockStatus;
        if (availableStock <= 0) {
            stockStatus = "OUT_OF_STOCK";
        } else if (availableStock <= 20.0) {
            stockStatus = "LOW_STOCK";
        } else {
            stockStatus = "IN_STOCK";
        }

        // 8. Transportation Policy Configuration
        String deliveryLocation = payload.get("deliveryLocation") != null ? payload.get("deliveryLocation").toString().trim() : "";
        if (deliveryLocation.isEmpty() && seller.getLocation() != null) {
            deliveryLocation = seller.getLocation().trim();
        }

        Double deliveryRadiusKm = parseDoubleSafe(payload.get("deliveryRadiusKm"));
        if (deliveryRadiusKm != null && deliveryRadiusKm < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Delivery radius cannot be negative — डिलीवरी का दायरा नकारात्मक नहीं हो सकता"));
        }

        String transportBasis = payload.get("transportationChargeBasis") != null ? payload.get("transportationChargeBasis").toString().trim() : null;
        Double transportRate = parseDoubleSafe(payload.get("transportationRate"));

        if (transportBasis != null && !transportBasis.isEmpty()) {
            if ("Free Delivery".equalsIgnoreCase(transportBasis)) {
                transportRate = 0.0;
            } else if (!"As Applicable".equalsIgnoreCase(transportBasis)) {
                if (transportRate == null || transportRate < 0) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Valid non-negative Transportation Rate is required for selected basis — चयनित आधार के लिए वैध परिवहन दर आवश्यक है"));
                }
            }
        }

        String beyondRadiusPolicy = payload.get("beyondRadiusPolicy") != null ? payload.get("beyondRadiusPolicy").toString().trim() : "";
        if (beyondRadiusPolicy.isEmpty()) {
            beyondRadiusPolicy = "Fair transportation amount will be charged.";
        }

        Boolean transportEnabled = null;
        if (payload.get("transportationPolicyEnabled") != null) {
            transportEnabled = Boolean.parseBoolean(payload.get("transportationPolicyEnabled").toString());
        } else {
            transportEnabled = (transportBasis != null && !transportBasis.isEmpty()) || (deliveryRadiusKm != null && deliveryRadiusKm > 0);
        }

        // 9. Persist material entity
        Material material = new Material();
        material.setSeller(seller);
        material.setCategory(category);
        material.setMaterialName(materialName);
        material.setBrand(brand);
        material.setSpecifications(specifications);
        material.setDescription(description);
        material.setCurrentStock(initialStock);
        material.setReservedStock(reservedStock);
        material.setAvailableStock(availableStock);
        material.setUnit(unit);
        material.setUnitPrice(unitPrice);
        material.setStockStatus(stockStatus);
        material.setDeliveryLocation(deliveryLocation);
        material.setDeliveryRadiusKm(deliveryRadiusKm);
        material.setTransportationChargeBasis(transportBasis);
        material.setTransportationRate(transportRate);
        material.setBeyondRadiusPolicy(beyondRadiusPolicy);
        material.setTransportationPolicyEnabled(transportEnabled);

        Material saved = materialRepository.save(material);

        Map<String, Object> response = toMaterialMap(saved);
        response.put("message", "Material added successfully — सामग्री सफलतापूर्वक जोड़ दी गई");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping({"", "/"})
    public ResponseEntity<?> getSellerMaterials(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a seller."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Seller account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = userOpt.get();
        List<Material> materials = materialRepository.findBySellerOrderByCreatedAtDesc(seller);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Material m : materials) {
            result.add(toMaterialMap(m));
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMaterialById(@PathVariable("id") Long id,
                                            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a seller."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Seller account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = userOpt.get();
        Optional<Material> matOpt = materialRepository.findById(id);

        if (matOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Material not found with ID: " + id));
        }

        Material material = matOpt.get();
        if (material.getSeller() == null || !material.getSeller().getId().equals(seller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: You are not authorized to view another seller's material."));
        }

        return ResponseEntity.ok(toMaterialMap(material));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMaterial(@PathVariable("id") Long id,
                                           @RequestBody Map<String, Object> payload,
                                           Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a seller."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Seller account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = userOpt.get();
        Optional<Material> matOpt = materialRepository.findById(id);

        if (matOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Material not found with ID: " + id));
        }

        Material material = matOpt.get();

        // Security check: Must belong to authenticated seller
        if (material.getSeller() == null || !material.getSeller().getId().equals(seller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: You cannot modify another seller's material."));
        }

        // 1. Current Stock Validation
        Double currentStock = parseDoubleSafe(payload.get("currentStock"));
        if (currentStock == null || currentStock < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid Current Stock (>= 0) is required — वैध वर्तमान स्टॉक आवश्यक है"));
        }

        // 2. Reserved Stock Validation
        Double reservedStock = parseDoubleSafe(payload.get("reservedStock"));
        if (reservedStock == null || reservedStock < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid Reserved Stock (>= 0) is required — वैध आरक्षित स्टॉक आवश्यक है"));
        }

        // 3. Reserved vs Current Stock Rule
        if (reservedStock > currentStock) {
            return ResponseEntity.badRequest().body(Map.of("error", "Reserved Stock cannot be greater than Current Stock. आरक्षित स्टॉक वर्तमान स्टॉक से अधिक नहीं हो सकता।"));
        }

        // 4. Unit Price Validation
        Double unitPrice = parseDoubleSafe(payload.get("unitPrice"));
        if (unitPrice == null || unitPrice <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid Unit Price (> 0) is required — वैध विक्रय मूल्य आवश्यक है"));
        }

        // 5. Calculate Available Stock & Status
        double availableStock = currentStock - reservedStock;

        Double oldCurrentStock = material.getCurrentStock();
        Double oldReservedStock = material.getReservedStock() != null ? material.getReservedStock() : 0.0;
        boolean stockQuantityUnchanged = oldCurrentStock != null
                && Double.compare(oldCurrentStock, currentStock) == 0
                && Double.compare(oldReservedStock, reservedStock) == 0;

        String stockStatus;
        if (payload.get("stockStatus") != null && "OUT_OF_STOCK".equalsIgnoreCase(payload.get("stockStatus").toString().trim())) {
            stockStatus = "OUT_OF_STOCK";
        } else if ("OUT_OF_STOCK".equalsIgnoreCase(material.getStockStatus()) && stockQuantityUnchanged) {
            stockStatus = "OUT_OF_STOCK";
        } else if (availableStock <= 0) {
            stockStatus = "OUT_OF_STOCK";
        } else if (availableStock <= 20.0) {
            stockStatus = "LOW_STOCK";
        } else {
            stockStatus = "IN_STOCK";
        }

        // 6. Update allowed fields (Material Name and Category remain strictly immutable)
        material.setCurrentStock(currentStock);
        material.setReservedStock(reservedStock);
        material.setAvailableStock(availableStock);
        material.setUnitPrice(unitPrice);
        material.setStockStatus(stockStatus);

        if (payload.get("brand") != null) {
            material.setBrand(payload.get("brand").toString().trim());
        }
        if (payload.get("specifications") != null) {
            material.setSpecifications(payload.get("specifications").toString().trim());
        }
        if (payload.get("description") != null) {
            material.setDescription(payload.get("description").toString().trim());
        }

        // 7. Update Transportation Policy fields
        if (payload.containsKey("deliveryLocation")) {
            material.setDeliveryLocation(payload.get("deliveryLocation") != null ? payload.get("deliveryLocation").toString().trim() : "");
        }
        if (payload.containsKey("deliveryRadiusKm")) {
            Double radius = parseDoubleSafe(payload.get("deliveryRadiusKm"));
            if (radius != null && radius < 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Delivery radius cannot be negative — डिलीवरी का दायरा नकारात्मक नहीं हो सकता"));
            }
            material.setDeliveryRadiusKm(radius);
        }
        if (payload.containsKey("transportationChargeBasis")) {
            String basis = payload.get("transportationChargeBasis") != null ? payload.get("transportationChargeBasis").toString().trim() : "";
            material.setTransportationChargeBasis(basis.isEmpty() ? null : basis);
        }
        if (payload.containsKey("transportationRate")) {
            Double rate = parseDoubleSafe(payload.get("transportationRate"));
            String currentBasis = material.getTransportationChargeBasis();
            if (currentBasis != null && !"Free Delivery".equalsIgnoreCase(currentBasis) && !"As Applicable".equalsIgnoreCase(currentBasis)) {
                if (rate == null || rate < 0) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Valid non-negative Transportation Rate is required — वैध परिवहन दर आवश्यक है"));
                }
            } else if ("Free Delivery".equalsIgnoreCase(currentBasis)) {
                rate = 0.0;
            }
            material.setTransportationRate(rate);
        }
        if (payload.containsKey("beyondRadiusPolicy")) {
            String beyond = payload.get("beyondRadiusPolicy") != null ? payload.get("beyondRadiusPolicy").toString().trim() : "";
            material.setBeyondRadiusPolicy(beyond.isEmpty() ? "Fair transportation amount will be charged." : beyond);
        }
        if (payload.containsKey("transportationPolicyEnabled")) {
            material.setTransportationPolicyEnabled(Boolean.parseBoolean(payload.get("transportationPolicyEnabled").toString()));
        } else if (material.getTransportationChargeBasis() != null || material.getDeliveryRadiusKm() != null) {
            material.setTransportationPolicyEnabled(true);
        }

        Material updated = materialRepository.save(material);

        Map<String, Object> response = toMaterialMap(updated);
        response.put("message", "Material updated successfully — सामग्री सफलतापूर्वक अपडेट की गई");

        return ResponseEntity.ok(response);
    }

    @RequestMapping(value = "/{id}/out-of-stock", method = {RequestMethod.PATCH, RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<?> markOutOfStock(@PathVariable("id") Long id,
                                            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a seller."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Seller account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = userOpt.get();
        Optional<Material> matOpt = materialRepository.findById(id);

        if (matOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Material not found with ID: " + id));
        }

        Material material = matOpt.get();

        // Security check: Must belong to authenticated seller
        if (material.getSeller() == null || !material.getSeller().getId().equals(seller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: You cannot modify another seller's material."));
        }

        material.setStockStatus("OUT_OF_STOCK");
        Material updated = materialRepository.save(material);

        Map<String, Object> response = toMaterialMap(updated);
        response.put("message", "Material marked as Out of Stock — सामग्री आउट ऑफ स्टॉक के रूप में चिह्नित की गई");

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMaterial(@PathVariable("id") Long id,
                                            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a seller."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Seller account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = userOpt.get();
        Optional<Material> matOpt = materialRepository.findById(id);

        if (matOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Material not found with ID: " + id));
        }

        Material material = matOpt.get();

        // Security check: Must belong to authenticated seller
        if (material.getSeller() == null || !material.getSeller().getId().equals(seller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: You are not authorized to delete another seller's material."));
        }

        materialRepository.delete(material);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Material deleted successfully — सामग्री सफलतापूर्वक हटाई गई"
        ));
    }

    private Map<String, Object> toMaterialMap(Material m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("category", m.getCategory());
        map.put("materialName", m.getMaterialName());
        map.put("brand", m.getBrand() != null ? m.getBrand() : "");
        map.put("specifications", m.getSpecifications() != null ? m.getSpecifications() : "");
        map.put("description", m.getDescription() != null ? m.getDescription() : "");
        map.put("currentStock", m.getCurrentStock());
        map.put("reservedStock", m.getReservedStock());
        map.put("availableStock", m.getAvailableStock());
        map.put("unit", m.getUnit());
        map.put("unitPrice", m.getUnitPrice());
        map.put("stockStatus", m.getStockStatus());
        map.put("deliveryLocation", m.getDeliveryLocation() != null ? m.getDeliveryLocation() : "");
        map.put("deliveryRadiusKm", m.getDeliveryRadiusKm());
        map.put("transportationChargeBasis", m.getTransportationChargeBasis() != null ? m.getTransportationChargeBasis() : "");
        map.put("transportationRate", m.getTransportationRate());
        map.put("beyondRadiusPolicy", m.getBeyondRadiusPolicy() != null ? m.getBeyondRadiusPolicy() : "Fair transportation amount will be charged.");
        map.put("transportationPolicyEnabled", m.getTransportationPolicyEnabled() != null ? m.getTransportationPolicyEnabled() : false);
        map.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : "");
        return map;
    }

    @PostMapping("/calculate-transportation")
    public ResponseEntity<?> calculateTransportation(@RequestBody Map<String, Object> payload) {
        Long materialId = null;
        if (payload.get("materialId") != null) {
            try {
                materialId = Long.parseLong(payload.get("materialId").toString());
            } catch (Exception ignored) {}
        }
        if (materialId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "materialId is required"));
        }

        Optional<Material> matOpt = materialRepository.findById(materialId);
        if (matOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Material not found with ID: " + materialId));
        }

        Material material = matOpt.get();
        Double quantity = parseDoubleSafe(payload.get("quantity"));
        if (quantity == null || quantity <= 0) {
            quantity = 1.0;
        }

        Double distanceKm = parseDoubleSafe(payload.get("distanceKm"));
        String buyerLocation = payload.get("buyerLocation") != null ? payload.get("buyerLocation").toString().trim() : "";

        // If distance not provided explicitly, compute from buyerLocation and seller location
        if (distanceKm == null && !buyerLocation.isEmpty()) {
            String origin = material.getDeliveryLocation();
            if ((origin == null || origin.isBlank()) && material.getSeller() != null) {
                origin = material.getSeller().getLocation();
            }

            if (origin != null && !origin.isBlank()) {
                GeoLocationService.GeoLocation originGeo = geoLocationService.resolveLocation(origin);
                GeoLocationService.GeoLocation buyerGeo = geoLocationService.resolveLocation(buyerLocation);

                if (originGeo != null && originGeo.hasCoordinates() && buyerGeo != null && buyerGeo.hasCoordinates()) {
                    distanceKm = geoLocationService.calculateHaversineDistanceKm(
                            originGeo.latitude(), originGeo.longitude(),
                            buyerGeo.latitude(), buyerGeo.longitude()
                    );
                } else if (geoLocationService.areLocationsEquivalent(origin, buyerLocation)) {
                    distanceKm = 10.0;
                }
            }
        }

        if (distanceKm == null) {
            distanceKm = 0.0;
        }

        Double standardRadius = material.getDeliveryRadiusKm() != null ? material.getDeliveryRadiusKm() : 25.0;
        boolean withinRadius = (material.getDeliveryRadiusKm() == null) || (distanceKm <= standardRadius);

        String basis = material.getTransportationChargeBasis() != null ? material.getTransportationChargeBasis().trim() : "Free Delivery";
        Double rate = material.getTransportationRate() != null ? material.getTransportationRate() : 0.0;

        Double transportationAmount = 0.0;
        boolean fairAmountMessage = false;

        if (withinRadius) {
            if ("Free Delivery".equalsIgnoreCase(basis)) {
                transportationAmount = 0.0;
            } else if ("As Applicable".equalsIgnoreCase(basis)) {
                transportationAmount = 0.0;
                fairAmountMessage = true;
            } else if ("Per Order".equalsIgnoreCase(basis)) {
                transportationAmount = rate;
            } else if ("Per KM".equalsIgnoreCase(basis)) {
                transportationAmount = Math.round((distanceKm * rate) * 100.0) / 100.0;
            } else if ("Per 100 Pieces".equalsIgnoreCase(basis)) {
                transportationAmount = Math.round(((quantity / 100.0) * rate) * 100.0) / 100.0;
            } else if ("Per 500 Pieces".equalsIgnoreCase(basis)) {
                transportationAmount = Math.round(((quantity / 500.0) * rate) * 100.0) / 100.0;
            } else if ("Per 1000 Pieces".equalsIgnoreCase(basis)) {
                transportationAmount = Math.round(((quantity / 1000.0) * rate) * 100.0) / 100.0;
            } else {
                // Per Bag, Per Piece, Per KG, Per Ton, Per CFT, Per Cubic Meter
                transportationAmount = Math.round((quantity * rate) * 100.0) / 100.0;
            }
        } else {
            // Beyond radius: DO NOT charge automatic transportation, show fair transportation message!
            transportationAmount = 0.0;
            fairAmountMessage = true;
        }

        double unitPrice = material.getUnitPrice() != null ? material.getUnitPrice() : 0.0;
        double materialTotal = Math.round((quantity * unitPrice) * 100.0) / 100.0;
        double grandTotal = Math.round((materialTotal + transportationAmount) * 100.0) / 100.0;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("materialId", material.getId());
        res.put("materialName", material.getMaterialName());
        res.put("quantity", quantity);
        res.put("unit", material.getUnit());
        res.put("unitPrice", unitPrice);
        res.put("materialTotal", materialTotal);
        res.put("distanceKm", distanceKm);
        res.put("standardRadiusKm", standardRadius);
        res.put("withinRadius", withinRadius);
        res.put("beyondRadius", !withinRadius);
        res.put("transportationChargeBasis", basis);
        res.put("transportationRate", rate);
        res.put("transportationAmount", transportationAmount);
        res.put("grandTotal", grandTotal);
        res.put("beyondRadiusPolicy", material.getBeyondRadiusPolicy() != null ? material.getBeyondRadiusPolicy() : "Fair transportation amount will be charged.");
        res.put("customerMessage", (!withinRadius || fairAmountMessage) ? "Fair transportation amount will be charged." : null);

        return ResponseEntity.ok(res);
    }

    private Double parseDoubleSafe(Object obj) {
        if (obj == null) return null;
        try {
            if (obj instanceof Number) return ((Number) obj).doubleValue();
            String clean = obj.toString().replace(",", "").replace("₹", "").trim();
            if (clean.isEmpty()) return null;
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return null;
        }
    }
}
