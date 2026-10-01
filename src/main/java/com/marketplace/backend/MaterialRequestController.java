package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/material-requests")
public class MaterialRequestController {

    private final MaterialRequestRepository materialRequestRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final GeoLocationService geoLocationService;

    @Autowired
    public MaterialRequestController(
            MaterialRequestRepository materialRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService
    ) {
        this.materialRequestRepository = materialRequestRepository;
        this.userRepository = userRepository;
        this.geoLocationService = geoLocationService;
    }

    /**
     * Submit a new Material Request with multiple items.
     * Accessible by authenticated CUSTOMER or CONTRACTOR.
     */
    @PostMapping({"", "/"})
    public ResponseEntity<?> createMaterialRequest(
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login to send a material request. — कृपया लॉगिन करें।"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "User account not found. Please log in again."));
        }

        MarketplaceBackendApplication.MarketplaceUser buyer = userOpt.get();

        // Determine buyer role strictly from authenticated user entity (never trust frontend role)
        String buyerRole = "CUSTOMER";
        if (buyer.getRoles() != null) {
            for (MarketplaceBackendApplication.Role r : buyer.getRoles()) {
                if (r == MarketplaceBackendApplication.Role.CONTRACTOR) {
                    buyerRole = "CONTRACTOR";
                    break;
                }
            }
        }

        // 1. Validate Material Items (MANDATORY: AT LEAST ONE MATERIAL)
        Object itemsObj = payload.get("items");
        if (!(itemsObj instanceof List) || ((List<?>) itemsObj).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Please add at least one material to your request. — कृपया कम से कम एक सामग्री जोड़ें।"
            ));
        }

        List<?> rawItems = (List<?>) itemsObj;
        List<MaterialRequestItem> itemsToPersist = new ArrayList<>();

        for (int i = 0; i < rawItems.size(); i++) {
            Object itemObj = rawItems.get(i);
            if (!(itemObj instanceof Map)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid item structure at index " + (i + 1)));
            }
            Map<?, ?> itemMap = (Map<?, ?>) itemObj;

            String category = itemMap.get("category") != null ? itemMap.get("category").toString().trim() : "";
            if (category.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Category is required for item #" + (i + 1) + " — सामग्री श्रेणी आवश्यक है।"
                ));
            }

            String materialName = itemMap.get("materialName") != null ? itemMap.get("materialName").toString().trim() : "";
            boolean isCustom = Boolean.TRUE.equals(itemMap.get("isCustomMaterial"))
                    || category.toLowerCase().contains("other")
                    || category.contains("अन्य")
                    || materialName.toLowerCase().contains("other")
                    || materialName.contains("अन्य");

            String customMaterialName = itemMap.get("customMaterialName") != null ? itemMap.get("customMaterialName").toString().trim() : "";
            if (isCustom && !customMaterialName.isEmpty()) {
                materialName = customMaterialName;
            }

            if (materialName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Material Name is required for item #" + (i + 1) + " — सामग्री का नाम आवश्यक है।"
                ));
            }

            Double quantity = parseDoubleSafe(itemMap.get("quantity"));
            if (quantity == null || quantity <= 0) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Valid quantity (> 0) is required for item #" + (i + 1) + " — वैध मात्रा आवश्यक है।"
                ));
            }

            String unit = itemMap.get("unit") != null ? itemMap.get("unit").toString().trim() : "";
            String customUnit = itemMap.get("customUnit") != null ? itemMap.get("customUnit").toString().trim() : "";
            if (unit.toLowerCase().contains("other") || unit.contains("अन्य")) {
                if (!customUnit.isEmpty()) {
                    unit = customUnit;
                }
            }
            if (unit.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Unit is required for item #" + (i + 1) + " — इकाई आवश्यक है।"
                ));
            }

            String brand = itemMap.get("brand") != null ? itemMap.get("brand").toString().trim() : "";
            String customBrand = itemMap.get("customBrand") != null ? itemMap.get("customBrand").toString().trim() : "";
            if (brand.toLowerCase().contains("other") || brand.contains("अन्य")) {
                if (!customBrand.isEmpty()) brand = customBrand;
            }

            String spec = itemMap.get("specification") != null ? itemMap.get("specification").toString().trim() : "";
            String customSpec = itemMap.get("customSpecification") != null ? itemMap.get("customSpecification").toString().trim() : "";
            if (spec.toLowerCase().contains("other") || spec.contains("अन्य")) {
                if (!customSpec.isEmpty()) spec = customSpec;
            }

            String notes = itemMap.get("notes") != null ? itemMap.get("notes").toString().trim() : "";

            MaterialRequestItem reqItem = new MaterialRequestItem();
            reqItem.setCategory(category);
            reqItem.setMaterialName(materialName);
            reqItem.setQuantity(quantity);
            reqItem.setUnit(unit);
            reqItem.setBrand(brand);
            reqItem.setSpecification(spec);
            reqItem.setIsCustomMaterial(isCustom);
            reqItem.setCustomMaterialName(customMaterialName);
            reqItem.setCustomBrand(customBrand);
            reqItem.setCustomSpecification(customSpec);
            reqItem.setCustomUnit(customUnit);
            reqItem.setNotes(notes);

            itemsToPersist.add(reqItem);
        }

        // 2. Validate Delivery Location & Routing
        String deliveryAddress = payload.get("deliveryAddress") != null ? payload.get("deliveryAddress").toString().trim() : "";
        String city = payload.get("city") != null ? payload.get("city").toString().trim() : "";
        String state = payload.get("state") != null ? payload.get("state").toString().trim() : "";
        String pinCode = payload.get("pinCode") != null ? payload.get("pinCode").toString().trim() : "";

        if (state.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Delivery State is required — डिलीवरी राज्य आवश्यक है।"
            ));
        }

        if (pinCode.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "PIN Code is required — पिन कोड आवश्यक है।"
            ));
        }

        // 3. Validate Request Scope (DEFAULT: STATE)
        String requestScope = payload.get("requestScope") != null ? payload.get("requestScope").toString().trim().toUpperCase() : "STATE";
        if (!requestScope.equals("STATE") && !requestScope.equals("ALL_INDIA") && !requestScope.equals("LOCAL")) {
            requestScope = "STATE"; // Fallback to required default
        }

        Integer localRadius = null;
        if (requestScope.equals("LOCAL")) {
            Object radObj = payload.get("localRadius");
            if (radObj != null) {
                try {
                    localRadius = Integer.parseInt(radObj.toString().trim());
                } catch (Exception ignored) {}
            }
            if (localRadius == null || (localRadius != 25 && localRadius != 50)) {
                localRadius = 25; // Default local radius
            }
        }

        // Resolve coordinates using in-house GeoLocationService
        Double latitude = parseDoubleSafe(payload.get("latitude"));
        Double longitude = parseDoubleSafe(payload.get("longitude"));

        if (latitude == null || longitude == null) {
            String combinedLoc = (city + " " + pinCode + " " + state).trim();
            GeoLocationService.GeoLocation resolved = geoLocationService.resolveLocation(combinedLoc);
            if (resolved != null && resolved.hasCoordinates()) {
                latitude = resolved.latitude();
                longitude = resolved.longitude();
            }
        }

        // Optional project & commercial info
        String projectId = payload.get("projectId") != null ? payload.get("projectId").toString().trim() : null;
        String projectName = payload.get("projectName") != null ? payload.get("projectName").toString().trim() : null;
        String contactPerson = payload.get("contactPerson") != null ? payload.get("contactPerson").toString().trim() : (buyer.getName() != null ? buyer.getName() : "");
        String contactPhone = payload.get("contactPhone") != null ? payload.get("contactPhone").toString().trim() : (buyer.getPhone() != null ? buyer.getPhone() : "");
        String expectedDeliveryDate = payload.get("expectedDeliveryDate") != null ? payload.get("expectedDeliveryDate").toString().trim() : "";
        String unloadingBy = payload.get("unloadingBy") != null ? payload.get("unloadingBy").toString().trim() : "SUPPLIER";
        String truckAccess = payload.get("truckAccess") != null ? payload.get("truckAccess").toString().trim() : "HEAVY_TRUCK";
        String specialNotes = payload.get("specialNotes") != null ? payload.get("specialNotes").toString().trim() : "";

        // Build unique human-readable Request ID (e.g. MR-1001 or MR-202610-XXX)
        long count = materialRequestRepository.count();
        String generatedRequestId = "MR-" + (1001 + count);

        MaterialRequest request = new MaterialRequest();
        request.setRequestId(generatedRequestId);
        request.setBuyer(buyer);
        request.setBuyerRole(buyerRole);
        request.setProjectId(projectId);
        request.setProjectName(projectName);
        request.setDeliveryAddress(deliveryAddress);
        request.setCity(city);
        request.setState(state);
        request.setPinCode(pinCode);
        request.setContactPerson(contactPerson);
        request.setContactPhone(contactPhone);
        request.setExpectedDeliveryDate(expectedDeliveryDate);
        request.setUnloadingBy(unloadingBy);
        request.setTruckAccess(truckAccess);
        request.setRequestScope(requestScope);
        request.setLocalRadius(localRadius);
        request.setLatitude(latitude);
        request.setLongitude(longitude);
        request.setStatus("NEW");
        request.setSpecialNotes(specialNotes);

        for (MaterialRequestItem item : itemsToPersist) {
            request.addItem(item);
        }

        MaterialRequest saved = materialRequestRepository.save(request);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("id", saved.getId());
        response.put("requestId", saved.getRequestId());
        response.put("itemCount", saved.getItems().size());
        response.put("buyerRole", saved.getBuyerRole());
        response.put("requestScope", saved.getRequestScope());
        response.put("localRadius", saved.getLocalRadius());
        response.put("state", saved.getState());
        response.put("pinCode", saved.getPinCode());
        response.put("status", saved.getStatus());
        response.put("createdAt", saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : "");
        response.put("message", "Material request sent successfully — सामग्री अनुरोध सफलतापूर्वक भेज दिया गया है");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all material requests submitted by the logged-in buyer (Customer or Contractor).
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyMaterialRequests(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "User not found"));
        }

        MarketplaceBackendApplication.MarketplaceUser buyer = userOpt.get();
        List<MaterialRequest> requests = materialRequestRepository.findByBuyerOrderByCreatedAtDesc(buyer);

        List<Map<String, Object>> result = new ArrayList<>();
        for (MaterialRequest r : requests) {
            result.add(toMap(r, false));
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Get a single material request by database ID or business Request ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getMaterialRequestById(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        MaterialRequest found = null;
        try {
            Long numericId = Long.parseLong(id);
            found = materialRequestRepository.findById(numericId).orElse(null);
        } catch (NumberFormatException ignored) {}

        if (found == null) {
            found = materialRequestRepository.findByRequestId(id).orElse(null);
        }

        if (found == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Material Request not found with ID: " + id));
        }

        return ResponseEntity.ok(toMap(found, true));
    }

    /**
     * Get material requests eligible for the authenticated seller based on the routing rules:
     * - STATE: seller state matches request state
     * - ALL_INDIA: visible to all registered sellers across India
     * - LOCAL: seller distance <= local radius (or PIN/city match)
     */
    @GetMapping("/seller")
    public ResponseEntity<?> getSellerEligibleRequests(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please log in as a seller."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Seller account not found"));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = userOpt.get();
        String sellerLocation = seller.getLocation() != null ? seller.getLocation().trim() : "";

        // Resolve seller geographical details
        GeoLocationService.GeoLocation sellerGeo = geoLocationService.resolveLocation(sellerLocation);
        String sellerState = "";
        Double sellerLat = null;
        Double sellerLon = null;

        if (sellerGeo != null) {
            if (sellerGeo.state() != null && !sellerGeo.state().isBlank()) {
                sellerState = sellerGeo.state();
            }
            if (sellerGeo.hasCoordinates()) {
                sellerLat = sellerGeo.latitude();
                sellerLon = sellerGeo.longitude();
            }
        }
        if (sellerState.isEmpty()) {
            sellerState = geoLocationService.normalizeStateName(sellerLocation);
        }

        List<MaterialRequest> allRequests = materialRequestRepository.findAllByOrderByCreatedAtDesc();
        List<Map<String, Object>> matching = new ArrayList<>();

        for (MaterialRequest req : allRequests) {
            // Closed requests are not shown in active pool
            if ("CLOSED".equalsIgnoreCase(req.getStatus())) {
                continue;
            }

            boolean isEligible = false;
            String scope = req.getRequestScope() != null ? req.getRequestScope().toUpperCase() : "STATE";

            if (scope.equals("ALL_INDIA")) {
                // All India scope is available to all registered sellers
                isEligible = true;
            } else if (scope.equals("STATE")) {
                // Must match the delivery location state
                String reqState = req.getState() != null ? req.getState().trim() : "";
                if (matchesState(sellerState, sellerLocation, reqState)) {
                    isEligible = true;
                }
            } else if (scope.equals("LOCAL")) {
                int radius = req.getLocalRadius() != null ? req.getLocalRadius() : 25;

                if (sellerLat != null && sellerLon != null && req.getLatitude() != null && req.getLongitude() != null) {
                    double distKm = geoLocationService.calculateHaversineDistanceKm(
                            sellerLat, sellerLon, req.getLatitude(), req.getLongitude()
                    );
                    if (distKm <= radius) {
                        isEligible = true;
                    }
                } else {
                    // Fallback to district, city or PIN matching
                    String reqCombined = (req.getCity() + " " + req.getPinCode() + " " + req.getState()).trim();
                    if (geoLocationService.areLocationsEquivalent(sellerLocation, reqCombined)) {
                        isEligible = true;
                    } else if (sellerGeo != null && sellerGeo.pincode() != null && sellerGeo.pincode().equals(req.getPinCode())) {
                        isEligible = true;
                    }
                }
            }

            if (isEligible) {
                matching.add(toMap(req, true));
            }
        }

        return ResponseEntity.ok(matching);
    }

    /**
     * Update request status (e.g. NEW -> VIEWED -> RESPONDED -> CLOSED).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<MaterialRequest> reqOpt = materialRequestRepository.findById(id);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found"));
        }

        MaterialRequest req = reqOpt.get();
        String newStatus = payload.get("status") != null ? payload.get("status").toString().trim().toUpperCase() : "";
        if (!newStatus.isEmpty()) {
            req.setStatus(newStatus);
            req.setUpdatedAt(LocalDateTime.now());
            materialRequestRepository.save(req);
        }

        return ResponseEntity.ok(Map.of("success", true, "status", req.getStatus()));
    }

    private boolean matchesState(String sellerState, String sellerLocation, String reqState) {
        if (reqState == null || reqState.isBlank()) return true;
        if (sellerState != null && !sellerState.isBlank()) {
            if (sellerState.equalsIgnoreCase(reqState)) return true;
            String normSeller = sellerState.toLowerCase().replace(" ", "");
            String normReq = reqState.toLowerCase().replace(" ", "");
            if (normSeller.contains(normReq) || normReq.contains(normSeller)) return true;
        }
        if (sellerLocation != null && !sellerLocation.isBlank()) {
            String lowerLoc = sellerLocation.toLowerCase();
            String lowerReq = reqState.toLowerCase();
            if (lowerLoc.contains(lowerReq)) return true;
        }
        return false;
    }

    private Map<String, Object> toMap(MaterialRequest req, boolean includeItems) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", req.getId());
        map.put("requestId", req.getRequestId());
        map.put("buyerRole", req.getBuyerRole());
        map.put("projectId", req.getProjectId());
        map.put("projectName", req.getProjectName() != null ? req.getProjectName() : "");
        map.put("deliveryAddress", req.getDeliveryAddress() != null ? req.getDeliveryAddress() : "");
        map.put("city", req.getCity() != null ? req.getCity() : "");
        map.put("state", req.getState());
        map.put("pinCode", req.getPinCode());
        map.put("contactPerson", req.getContactPerson() != null ? req.getContactPerson() : "");
        map.put("contactPhone", req.getContactPhone() != null ? req.getContactPhone() : "");
        map.put("expectedDeliveryDate", req.getExpectedDeliveryDate() != null ? req.getExpectedDeliveryDate() : "");
        map.put("unloadingBy", req.getUnloadingBy() != null ? req.getUnloadingBy() : "SUPPLIER");
        map.put("truckAccess", req.getTruckAccess() != null ? req.getTruckAccess() : "HEAVY_TRUCK");
        map.put("requestScope", req.getRequestScope());
        map.put("localRadius", req.getLocalRadius());
        map.put("status", req.getStatus());
        map.put("specialNotes", req.getSpecialNotes() != null ? req.getSpecialNotes() : "");
        map.put("createdAt", req.getCreatedAt() != null ? req.getCreatedAt().toString() : "");

        // Build brief summary of items for table listings
        StringBuilder summaryBuilder = new StringBuilder();
        int totalQuantity = 0;
        List<Map<String, Object>> itemsList = new ArrayList<>();

        if (req.getItems() != null) {
            for (MaterialRequestItem it : req.getItems()) {
                if (summaryBuilder.length() > 0) summaryBuilder.append(", ");
                summaryBuilder.append(it.getMaterialName())
                        .append(" (")
                        .append(formatNum(it.getQuantity()))
                        .append(" ")
                        .append(it.getUnit().split("—")[0].trim())
                        .append(")");

                totalQuantity += it.getQuantity();

                if (includeItems) {
                    Map<String, Object> itemMap = new LinkedHashMap<>();
                    itemMap.put("id", it.getId());
                    itemMap.put("category", it.getCategory());
                    itemMap.put("materialName", it.getMaterialName());
                    itemMap.put("quantity", it.getQuantity());
                    itemMap.put("unit", it.getUnit());
                    itemMap.put("brand", it.getBrand() != null ? it.getBrand() : "");
                    itemMap.put("specification", it.getSpecification() != null ? it.getSpecification() : "");
                    itemMap.put("isCustomMaterial", it.getIsCustomMaterial());
                    itemMap.put("customMaterialName", it.getCustomMaterialName());
                    itemMap.put("notes", it.getNotes() != null ? it.getNotes() : "");
                    itemsList.add(itemMap);
                }
            }
        }

        map.put("materialSummary", summaryBuilder.toString());
        map.put("itemCount", req.getItems() != null ? req.getItems().size() : 0);
        map.put("totalQuantity", totalQuantity);

        if (includeItems) {
            map.put("items", itemsList);
        }

        return map;
    }

    private String formatNum(Double d) {
        if (d == null) return "0";
        if (d == d.longValue()) {
            return String.valueOf(d.longValue());
        }
        return String.valueOf(d);
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
