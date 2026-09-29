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

    @Autowired
    public MaterialController(MaterialRepository materialRepository,
                              MarketplaceBackendApplication.UserRepository userRepository) {
        this.materialRepository = materialRepository;
        this.userRepository = userRepository;
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

        // 8. Persist material entity
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

        String stockStatus;
        if (availableStock <= 0) {
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

        Material updated = materialRepository.save(material);

        Map<String, Object> response = toMaterialMap(updated);
        response.put("message", "Material updated successfully — सामग्री सफलतापूर्वक अपडेट की गई");

        return ResponseEntity.ok(response);
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
        map.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : "");
        return map;
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
