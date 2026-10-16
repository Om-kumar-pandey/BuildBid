package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/material-requests")
public class MaterialRequestController {

    private final MaterialRequestRepository materialRequestRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final GeoLocationService geoLocationService;
    private final NotificationService notificationService;
    private final QuotationRepository quotationRepository;
    private SellerMaterialRequestActionRepository sellerMaterialRequestActionRepository;
    private MaterialOrderService materialOrderService;

    private static final Logger log = LoggerFactory.getLogger(MaterialRequestController.class);
    private static final java.time.ZoneId IST_ZONE = java.time.ZoneId.of("Asia/Kolkata");
    private static final java.time.format.DateTimeFormatter DISPLAY_DATE_FORMATTER =
            java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);

    @Autowired
    public MaterialRequestController(
            MaterialRequestRepository materialRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService,
            @Autowired(required = false) NotificationService notificationService,
            @Autowired(required = false) QuotationRepository quotationRepository,
            @Autowired(required = false) SellerMaterialRequestActionRepository sellerMaterialRequestActionRepository,
            @Autowired(required = false) MaterialOrderService materialOrderService
    ) {
        this.materialRequestRepository = materialRequestRepository;
        this.userRepository = userRepository;
        this.geoLocationService = geoLocationService;
        this.notificationService = notificationService;
        this.quotationRepository = quotationRepository;
        this.sellerMaterialRequestActionRepository = sellerMaterialRequestActionRepository;
        this.materialOrderService = materialOrderService;
    }

    public MaterialRequestController(
            MaterialRequestRepository materialRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService,
            NotificationService notificationService,
            QuotationRepository quotationRepository
    ) {
        this(materialRequestRepository, userRepository, geoLocationService, notificationService, quotationRepository, null, null);
    }

    public MaterialRequestController(
            MaterialRequestRepository materialRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService,
            NotificationService notificationService
    ) {
        this(materialRequestRepository, userRepository, geoLocationService, notificationService, null, null, null);
    }

    public MaterialRequestController(
            MaterialRequestRepository materialRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService
    ) {
        this(materialRequestRepository, userRepository, geoLocationService, null, null, null, null);
    }

    @Autowired(required = false)
    public void setSellerMaterialRequestActionRepository(SellerMaterialRequestActionRepository sellerMaterialRequestActionRepository) {
        this.sellerMaterialRequestActionRepository = sellerMaterialRequestActionRepository;
    }

    @Autowired(required = false)
    public void setMaterialOrderService(MaterialOrderService materialOrderService) {
        this.materialOrderService = materialOrderService;
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
                } else if (r == MarketplaceBackendApplication.Role.PROFESSIONAL || r == MarketplaceBackendApplication.Role.SERVICE_PROVIDER) {
                    buyerRole = "PROFESSIONAL";
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
        LocalDateTime reqCreatedAt = saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now(IST_ZONE);
        response.put("createdAt", reqCreatedAt.toString());
        response.put("submittedDate", reqCreatedAt.format(DISPLAY_DATE_FORMATTER));
        response.put("submittedTimestamp", reqCreatedAt.atZone(IST_ZONE).toInstant().toEpochMilli());
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
            result.add(toMap(r, false, buyer));
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Get a single material request by database ID or business Request ID.
     * Enforces strict authorization: only buyer or target seller can access direct purchase requests.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getMaterialRequestById(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> callerOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "User not found"));
        }
        MarketplaceBackendApplication.MarketplaceUser caller = callerOpt.get();

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

        // Section 5: Strict Security Authorization
        boolean isBuyer = found.getBuyer() != null && found.getBuyer().getId().equals(caller.getId());
        boolean isTargetSeller = found.getTargetSeller() != null && found.getTargetSeller().getId().equals(caller.getId());

        if ("DIRECT_MATERIAL".equalsIgnoreCase(found.getRequestType())) {
            if (!isBuyer && !isTargetSeller) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You are not authorized to view this direct material request."));
            }
        } else {
            String status = found.getStatus() != null ? found.getStatus().toUpperCase() : "NEW";
            if ("ALLOCATED".equals(status) || "ACCEPTED".equals(status) || "ORDER_ACCEPTED".equals(status)) {
                if (!isBuyer && !isTargetSeller) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Forbidden: This material requirement has already been allocated."));
                }
            } else {
                boolean isSeller = caller.getRoles() != null && (
                        caller.getRoles().contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER) ||
                        caller.getRoles().contains(MarketplaceBackendApplication.Role.SELLER)
                );
                if (!isBuyer && !isSeller) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Forbidden: You are not authorized to view this request."));
                }
            }
        }

        return ResponseEntity.ok(toMap(found, true, caller));
    }

    /**
     * Get material requests eligible for the authenticated seller based on the routing rules:
     * - STATE: seller state matches request state
     * - ALL_INDIA: visible to all registered sellers across India
     * - LOCAL: seller distance <= local radius (or PIN/city match)
     * 
     * Section 9 & 11 Rule:
     * Once a material requirement is allocated or accepted, it is immediately removed from Active Material Requests
     * for all other sellers.
     */
    @GetMapping({"/seller", "/seller-eligible"})
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
        if (allRequests == null || allRequests.isEmpty()) {
            allRequests = materialRequestRepository.findAll();
        }
        List<Map<String, Object>> matching = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now(IST_ZONE);

        for (MaterialRequest req : allRequests) {
            if (!isRequestEligibleForSeller(req, seller, sellerState, sellerLocation, sellerLat, sellerLon, sellerGeo)) {
                continue;
            }

            // Check isolated seller action if repository is available
            SellerMaterialRequestAction action = null;
            if (sellerMaterialRequestActionRepository != null) {
                action = sellerMaterialRequestActionRepository
                        .findBySellerIdAndMaterialRequestId(seller.getId(), req.getId()).orElse(null);
            }

            if (action != null) {
                if ("DECLINED".equalsIgnoreCase(action.getStatus())) {
                    // 24-hour expiry check
                    if (action.getExpiryAt() != null && !now.isBefore(action.getExpiryAt())) {
                        // Expiry reached: exclude from active results for this declining seller
                        continue;
                    }
                    // Before expiry: show Request Declined with live countdown
                    Map<String, Object> map = toMap(req, true, seller);
                    map.put("sellerStatus", "DECLINED");
                    map.put("declinedAt", action.getDeclinedAt() != null ? action.getDeclinedAt().toString() : now.toString());
                    map.put("expiryAt", action.getExpiryAt() != null ? action.getExpiryAt().toString() : now.plusHours(24).toString());
                    long remainingSecs = action.getExpiryAt() != null ? Math.max(0, java.time.Duration.between(now, action.getExpiryAt()).getSeconds()) : 0L;
                    map.put("remainingSeconds", remainingSecs);
                    matching.add(map);
                    continue;
                } else if ("ACCEPTED".equalsIgnoreCase(action.getStatus())) {
                    // Seller accepted: persist accepted state on reload for this seller
                    Map<String, Object> map = toMap(req, true, seller);
                    map.put("sellerStatus", "ACCEPTED");
                    map.put("acceptedAt", action.getActionAt() != null ? action.getActionAt().toString() : now.toString());
                    matching.add(map);
                    continue;
                }
            }

            // Fallback for requests without explicit action record
            String status = req.getStatus() != null ? req.getStatus().toUpperCase() : "NEW";

            if ("CLOSED".equals(status) || "CANCELLED".equals(status)) {
                continue;
            }

            if ("DECLINED".equals(status)) {
                // If targeted exclusively to this seller (legacy fallback), apply 24h rule
                if (req.getTargetSeller() != null && req.getTargetSeller().getId().equals(seller.getId())) {
                    LocalDateTime refTime = req.getUpdatedAt() != null ? req.getUpdatedAt() : req.getCreatedAt();
                    if (refTime == null) refTime = now;
                    LocalDateTime expiry = refTime.plusHours(24);
                    if (!now.isBefore(expiry)) {
                        continue; // Expired
                    }
                    Map<String, Object> map = toMap(req, true, seller);
                    map.put("sellerStatus", "DECLINED");
                    map.put("declinedAt", refTime.toString());
                    map.put("expiryAt", expiry.toString());
                    map.put("remainingSeconds", Math.max(0, java.time.Duration.between(now, expiry).getSeconds()));
                    matching.add(map);
                    continue;
                } else {
                    // For other sellers, broadcast request is still active
                }
            }

            // Exclude already accepted/allocated requests if this seller did not accept it
            if ("POSTED_REQUIREMENT".equalsIgnoreCase(req.getRequestType()) || req.getRequestType() == null) {
                if ("ALLOCATED".equals(status) || "ACCEPTED".equals(status) || "ORDER_ACCEPTED".equals(status) || "COMPLETED".equals(status)) {
                    continue;
                }
            } else if ("DIRECT_MATERIAL".equalsIgnoreCase(req.getRequestType())) {
                if ("ALLOCATED".equals(status) || "COMPLETED".equals(status)) {
                    continue;
                }
            }

            Map<String, Object> map = toMap(req, true, seller);
            map.put("sellerStatus", "PENDING");
            matching.add(map);
        }

        return ResponseEntity.ok(matching);
    }

    private boolean isRequestEligibleForSeller(
            MaterialRequest req,
            MarketplaceBackendApplication.MarketplaceUser seller,
            String sellerState,
            String sellerLocation,
            Double sellerLat,
            Double sellerLon,
            GeoLocationService.GeoLocation sellerGeo
    ) {
        if ("DIRECT_MATERIAL".equalsIgnoreCase(req.getRequestType())) {
            return req.getTargetSeller() != null && req.getTargetSeller().getId().equals(seller.getId());
        }
        String scope = req.getRequestScope() != null ? req.getRequestScope().toUpperCase() : "STATE";

        if (scope.equals("ALL_INDIA")) {
            return true;
        } else if (scope.equals("STATE")) {
            String reqState = req.getState() != null ? req.getState().trim() : "";
            return matchesState(sellerState, sellerLocation, reqState);
        } else if (scope.equals("LOCAL")) {
            int radius = req.getLocalRadius() != null ? req.getLocalRadius() : 25;

            if (sellerLat != null && sellerLon != null && req.getLatitude() != null && req.getLongitude() != null) {
                double distKm = geoLocationService.calculateHaversineDistanceKm(
                        sellerLat, sellerLon, req.getLatitude(), req.getLongitude()
                );
                return distKm <= radius;
            } else {
                String reqCombined = (req.getCity() + " " + req.getPinCode() + " " + req.getState()).trim();
                if (geoLocationService.areLocationsEquivalent(sellerLocation, reqCombined)) {
                    return true;
                } else if (sellerGeo != null && sellerGeo.pincode() != null && sellerGeo.pincode().equals(req.getPinCode())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Accept a Material Request.
     * Section 3, 9, 10: State validated, atomic, prevents multiple seller allocation,
     * persists seller action and integrates with Orders.
     */
    @PutMapping("/{id}/accept")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> acceptRequest(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> sellerOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));
        if (sellerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Seller not found"));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = sellerOpt.get();
        if (!hasSellerRole(seller)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only registered material sellers can accept orders."));
        }

        MaterialRequest req = null;
        try {
            Long numericId = Long.parseLong(id);
            req = materialRequestRepository.findByIdForUpdate(numericId)
                    .orElseGet(() -> materialRequestRepository.findById(numericId).orElse(null));
        } catch (NumberFormatException ignored) {}

        if (req == null) {
            req = materialRequestRepository.findByRequestId(id).orElse(null);
        }

        if (req == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found with ID: " + id));
        }

        // Validate seller ownership if targeted direct request
        if (req.getTargetSeller() != null && !req.getTargetSeller().getId().equals(seller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: You are not authorized to accept this direct request."));
        }

        // Check seller-specific action state
        SellerMaterialRequestAction existingAction = null;
        if (sellerMaterialRequestActionRepository != null) {
            existingAction = sellerMaterialRequestActionRepository
                    .findBySellerIdAndMaterialRequestId(seller.getId(), req.getId()).orElse(null);
        }

        if (existingAction != null && "DECLINED".equalsIgnoreCase(existingAction.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", "Cannot accept a material request that was previously declined.",
                    "message", "Cannot accept a material request that was previously declined."
            ));
        }

        if (existingAction != null && "ACCEPTED".equalsIgnoreCase(existingAction.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "error", "This material requirement has already been accepted.",
                    "message", "This material requirement has already been accepted."
            ));
        }

        // Section 9 & 10: Single allocation guard & prevent duplicate allocation
        String currentStatus = req.getStatus() != null ? req.getStatus().toUpperCase() : "NEW";
        if ("ALLOCATED".equals(currentStatus) || "ACCEPTED".equals(currentStatus) || "ORDER_ACCEPTED".equals(currentStatus)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "error", "This material requirement has already been allocated.",
                    "message", "This material requirement has already been allocated."
            ));
        }
        if ("CLOSED".equals(currentStatus) || "DECLINED".equals(currentStatus) || "CANCELLED".equals(currentStatus)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", "This material requirement is " + currentStatus + " and cannot be accepted.",
                    "message", "This material requirement is " + currentStatus + " and cannot be accepted."
            ));
        }

        req.setStatus("ACCEPTED");
        if (req.getTargetSeller() == null) {
            req.setTargetSeller(seller);
        }
        if (req.getVerificationCode() == null || req.getVerificationCode().isBlank()) {
            req.setVerificationCode(String.format("BB-DM-%06d", new Random().nextInt(900000) + 100000));
        }

        MaterialRequest saved = materialRequestRepository.save(req);

        // Record seller-specific acceptance
        SellerMaterialRequestAction action = existingAction != null ? existingAction : new SellerMaterialRequestAction();
        action.setSeller(seller);
        action.setMaterialRequest(saved);
        action.setStatus("ACCEPTED");
        action.setActionAt(LocalDateTime.now(IST_ZONE));

        // Create or retrieve integrated MaterialOrder
        MaterialOrder createdOrder = null;
        if (materialOrderService != null) {
            try {
                createdOrder = materialOrderService.createOrderForAcceptedMaterialRequest(saved, seller);
                action.setMaterialOrder(createdOrder);
            } catch (Exception e) {
                log.error("MaterialOrder creation failed for accepted MaterialRequest {}: {}", saved.getId(), e.getMessage(), e);
                throw e;
            }
        }

        if (sellerMaterialRequestActionRepository != null) {
            sellerMaterialRequestActionRepository.save(action);
        }

        // Section 2 & 12: Targeted notification exclusively to buyer
        if (notificationService != null && saved.getBuyer() != null) {
            try {
                notificationService.createNotification(
                        saved.getBuyer(),
                        "Order Accepted",
                        "ऑर्डर स्वीकार किया गया",
                        "Seller " + seller.getName() + " has accepted your material order.",
                        "विक्रेता " + seller.getName() + " ने आपका सामग्री ऑर्डर स्वीकार कर लिया है।",
                        "DIRECT_BUY_ACCEPTED",
                        saved.getRequestId()
                );
            } catch (Exception ignored) {}
        }

        Map<String, Object> resp = toMap(saved, true, seller);
        resp.put("success", true);
        resp.put("requestId", saved.getRequestId());
        resp.put("status", "ACCEPTED");
        resp.put("sellerStatus", "ACCEPTED");
        resp.put("statusEn", "Order Accepted");
        resp.put("statusHi", "ऑर्डर स्वीकार किया गया");
        resp.put("verificationCode", saved.getVerificationCode());
        if (createdOrder != null) {
            resp.put("orderId", createdOrder.getOrderCode());
            resp.put("orderCode", createdOrder.getOrderCode());
        }
        resp.put("message", "Direct Buy request accepted — ऑर्डर स्वीकार कर लिया गया");

        return ResponseEntity.ok(resp);
    }

    public ResponseEntity<?> acceptRequest(Long id, Authentication authentication) {
        return acceptRequest(id != null ? id.toString() : null, authentication);
    }

    /**
     * Decline a Material Request.
     * Persists server-side 24-hour decline expiry and enforces seller isolation.
     */
    @PutMapping("/{id}/decline")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> declineRequest(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> sellerOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));
        if (sellerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Seller not found"));
        }

        MarketplaceBackendApplication.MarketplaceUser seller = sellerOpt.get();
        if (!hasSellerRole(seller)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only registered material sellers can decline requests."));
        }

        MaterialRequest req = null;
        try {
            Long numericId = Long.parseLong(id);
            req = materialRequestRepository.findByIdForUpdate(numericId)
                    .orElseGet(() -> materialRequestRepository.findById(numericId).orElse(null));
        } catch (NumberFormatException ignored) {}

        if (req == null) {
            req = materialRequestRepository.findByRequestId(id).orElse(null);
        }

        if (req == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found with ID: " + id));
        }

        if (req.getTargetSeller() != null && !req.getTargetSeller().getId().equals(seller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
        }

        // Check if already accepted
        SellerMaterialRequestAction existingAction = null;
        if (sellerMaterialRequestActionRepository != null) {
            existingAction = sellerMaterialRequestActionRepository
                    .findBySellerIdAndMaterialRequestId(seller.getId(), req.getId()).orElse(null);
        }

        if (existingAction != null && "ACCEPTED".equalsIgnoreCase(existingAction.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", "Cannot decline a request that has already been accepted.",
                    "message", "Cannot decline a request that has already been accepted."
            ));
        }

        LocalDateTime now = LocalDateTime.now(IST_ZONE);

        // If already declined by this seller, return existing state without resetting expiry
        if (existingAction != null && "DECLINED".equalsIgnoreCase(existingAction.getStatus())) {
            LocalDateTime expiryAt = existingAction.getExpiryAt() != null ? existingAction.getExpiryAt() : now.plusHours(24);
            long remainingSecs = Math.max(0, java.time.Duration.between(now, expiryAt).getSeconds());
            Map<String, Object> resp = toMap(req, true, seller);
            resp.put("success", true);
            resp.put("status", "DECLINED");
            resp.put("sellerStatus", "DECLINED");
            resp.put("declinedAt", existingAction.getDeclinedAt() != null ? existingAction.getDeclinedAt().toString() : now.toString());
            resp.put("expiryAt", expiryAt.toString());
            resp.put("remainingSeconds", remainingSecs);
            resp.put("message", "Direct Buy request declined — अनुरोध अस्वीकार कर दिया गया");
            return ResponseEntity.ok(resp);
        }

        // Persist new 24-hour decline expiry
        LocalDateTime expiryAt = now.plusHours(24);
        SellerMaterialRequestAction action = existingAction != null ? existingAction : new SellerMaterialRequestAction();
        action.setSeller(seller);
        action.setMaterialRequest(req);
        action.setStatus("DECLINED");
        action.setActionAt(now);
        action.setDeclinedAt(now);
        action.setExpiryAt(expiryAt);

        if (sellerMaterialRequestActionRepository != null) {
            sellerMaterialRequestActionRepository.save(action);
        }

        // For direct buy requests targeted to this seller, also record DECLINED status
        if (req.getTargetSeller() != null && req.getTargetSeller().getId().equals(seller.getId())) {
            req.setStatus("DECLINED");
            MaterialRequest savedDirectReq = materialRequestRepository.save(req);
            MarketplaceBackendApplication.MarketplaceUser notifyBuyer = (savedDirectReq != null && savedDirectReq.getBuyer() != null)
                    ? savedDirectReq.getBuyer() : req.getBuyer();
            String notifyReqId = (savedDirectReq != null && savedDirectReq.getRequestId() != null)
                    ? savedDirectReq.getRequestId() : req.getRequestId();
            if (notificationService != null && notifyBuyer != null) {
                try {
                    notificationService.createNotification(
                            notifyBuyer,
                            "Order Declined",
                            "ऑर्डर अस्वीकार किया गया",
                            "Seller " + seller.getName() + " has declined your material order.",
                            "विक्रेता " + seller.getName() + " ने आपका सामग्री ऑर्डर अस्वीकार कर दिया है।",
                            "DIRECT_BUY_DECLINED",
                            notifyReqId
                    );
                } catch (Exception ignored) {}
            }
        }

        Map<String, Object> resp = toMap(req, true, seller);
        resp.put("success", true);
        resp.put("status", "DECLINED");
        resp.put("sellerStatus", "DECLINED");
        resp.put("declinedAt", now.toString());
        resp.put("expiryAt", expiryAt.toString());
        resp.put("remainingSeconds", 86400L);
        resp.put("message", "Direct Buy request declined — अनुरोध अस्वीकार कर दिया गया");
        return ResponseEntity.ok(resp);
    }

    public ResponseEntity<?> declineRequest(Long id, Authentication authentication) {
        return declineRequest(id != null ? id.toString() : null, authentication);
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
        if (newStatus.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }

        if ("DIRECT_MATERIAL".equalsIgnoreCase(req.getRequestType())) {
            String principal = authentication.getName();
            Optional<MarketplaceBackendApplication.MarketplaceUser> sellerOpt =
                    userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));
            if (sellerOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Seller account not found"));
            }
            MarketplaceBackendApplication.MarketplaceUser seller = sellerOpt.get();
            if (!hasSellerRole(seller)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Only registered material sellers can update order status."));
            }
            if (req.getTargetSeller() == null || !req.getTargetSeller().getId().equals(seller.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: Not your direct material order."));
            }

            String rawCurrent = req.getStatus() != null ? req.getStatus().trim().toUpperCase() : "WAITING_FOR_ACCEPTANCE";
            String normalizedCurrent = normalizeOrderStatus(rawCurrent);
            String normalizedTarget = normalizeOrderStatus(newStatus);

            if (!isValidOrderTransition(normalizedCurrent, normalizedTarget)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Invalid status transition from " + rawCurrent + " to " + newStatus + ".",
                        "message", "Invalid status transition from " + rawCurrent + " to " + newStatus + "."
                ));
            }
            newStatus = normalizedTarget;
        }

        req.setStatus(newStatus);
        req.setUpdatedAt(LocalDateTime.now());
        materialRequestRepository.save(req);

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

    private Map<String, Object> toMap(MaterialRequest req, boolean includeItems, MarketplaceBackendApplication.MarketplaceUser caller) {
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
        map.put("expectedDeliveryDate", req.getExpectedDeliveryDate() != null ? req.getExpectedDeliveryDate() : "");
        map.put("unloadingBy", req.getUnloadingBy() != null ? req.getUnloadingBy() : "SUPPLIER");
        map.put("truckAccess", req.getTruckAccess() != null ? req.getTruckAccess() : "HEAVY_TRUCK");
        map.put("requestScope", req.getRequestScope());
        map.put("localRadius", req.getLocalRadius());
        map.put("status", req.getStatus());
        map.put("requestType", req.getRequestType() != null ? req.getRequestType() : "POSTED_REQUIREMENT");
        map.put("targetSellerId", req.getTargetSeller() != null ? req.getTargetSeller().getId() : null);
        map.put("targetSellerName", req.getTargetSeller() != null ? req.getTargetSeller().getName() : null);
        map.put("materialPrice", req.getMaterialPrice());
        map.put("transportationCost", req.getTransportationCost());
        map.put("materialAmount", req.getMaterialAmount());
        map.put("estimatedTotal", req.getEstimatedTotal());
        map.put("verificationCode", req.getVerificationCode() != null ? req.getVerificationCode() : "");
        map.put("specialNotes", req.getSpecialNotes() != null ? req.getSpecialNotes() : "");

        LocalDateTime createdAt = req.getCreatedAt() != null ? req.getCreatedAt() : LocalDateTime.now(IST_ZONE);
        map.put("createdAt", createdAt.toString());
        map.put("submittedDate", createdAt.format(DISPLAY_DATE_FORMATTER));
        map.put("submittedTimestamp", createdAt.atZone(IST_ZONE).toInstant().toEpochMilli());

        String status = req.getStatus() != null ? req.getStatus().toUpperCase() : "NEW";
        boolean isAccepted = "ACCEPTED".equals(status) || "ORDER_ACCEPTED".equals(status) ||
                "PROCESSING".equals(status) || "READY_FOR_DISPATCH".equals(status) ||
                "OUT_FOR_DELIVERY".equals(status) || "DELIVERED".equals(status) || "COMPLETED".equals(status);

        // Section 4 & 5: Contact details security isolation
        if (caller != null) {
            boolean isBuyer = req.getBuyer() != null && req.getBuyer().getId().equals(caller.getId());
            boolean isTargetSeller = req.getTargetSeller() != null && req.getTargetSeller().getId().equals(caller.getId());

            // If caller is the authorized buyer and order is accepted, share seller contact details
            if (isBuyer && isAccepted && req.getTargetSeller() != null) {
                MarketplaceBackendApplication.MarketplaceUser s = req.getTargetSeller();
                map.put("sellerId", s.getId());
                map.put("sellerName", s.getName());
                map.put("sellerBusinessName", s.getName());
                map.put("sellerPhone", s.getPhone() != null ? s.getPhone() : "");
                map.put("sellerAlternatePhone", "");
                map.put("sellerEmail", s.getEmail() != null ? s.getEmail() : "");
                map.put("sellerLocation", s.getLocation() != null ? s.getLocation() : "");
                map.put("sellerAddress", s.getLocation() != null ? s.getLocation() : "");
            }

            // If caller is the authorized seller and order is accepted, share customer transaction details
            if (isTargetSeller && isAccepted) {
                map.put("buyerId", req.getBuyer() != null ? req.getBuyer().getId() : null);
                map.put("buyerName", req.getBuyer() != null ? req.getBuyer().getName() : "");
                map.put("buyerPhone", req.getContactPhone() != null ? req.getContactPhone() : (req.getBuyer() != null ? req.getBuyer().getPhone() : ""));
                map.put("contactPhone", req.getContactPhone() != null ? req.getContactPhone() : (req.getBuyer() != null ? req.getBuyer().getPhone() : ""));
            } else if (isBuyer) {
                map.put("contactPhone", req.getContactPhone() != null ? req.getContactPhone() : "");
            }
        } else {
            if (req.getContactPhone() != null) {
                map.put("contactPhone", req.getContactPhone());
            }
        }

        // Persistent quotation submission state for seller callers (Phase 3)
        if (caller != null && hasSellerRole(caller) && quotationRepository != null && req.getId() != null) {
            List<Quotation> activeQuotes = quotationRepository.findByMaterialRequestIdAndProviderIdAndStatusIn(
                    req.getId(), caller.getId(), List.of("SUBMITTED", "UNDER_REVIEW", "ACCEPTED")
            );
            if (!activeQuotes.isEmpty()) {
                Quotation aq = activeQuotes.get(0);
                map.put("quotationSubmitted", true);
                map.put("hasSubmittedQuotation", true);
                map.put("existingQuotationId", aq.getQuotationId());
                map.put("existingQuotationStatus", aq.getStatus());
            } else {
                map.put("quotationSubmitted", false);
                map.put("hasSubmittedQuotation", false);
                map.put("existingQuotationId", null);
                map.put("existingQuotationStatus", null);
            }
        } else {
            map.put("quotationSubmitted", false);
            map.put("hasSubmittedQuotation", false);
            map.put("existingQuotationId", null);
            map.put("existingQuotationStatus", null);
        }

        // Persistent seller-specific request action state (Phase 2 & Phase 5)
        if (caller != null && hasSellerRole(caller) && sellerMaterialRequestActionRepository != null && req.getId() != null) {
            Optional<SellerMaterialRequestAction> smraOpt = sellerMaterialRequestActionRepository
                    .findBySellerIdAndMaterialRequestId(caller.getId(), req.getId());
            if (smraOpt.isPresent()) {
                SellerMaterialRequestAction smra = smraOpt.get();
                map.put("sellerStatus", smra.getStatus());
                if (smra.getActionAt() != null) {
                    map.put("actionAt", smra.getActionAt().toString());
                }
                if (smra.getDeclinedAt() != null) {
                    map.put("declinedAt", smra.getDeclinedAt().toString());
                }
                if (smra.getExpiryAt() != null) {
                    map.put("expiryAt", smra.getExpiryAt().toString());
                    long rem = java.time.Duration.between(LocalDateTime.now(IST_ZONE), smra.getExpiryAt()).getSeconds();
                    map.put("remainingSeconds", Math.max(0, rem));
                }
            } else if (!map.containsKey("sellerStatus")) {
                map.put("sellerStatus", "PENDING");
            }
        } else if (!map.containsKey("sellerStatus")) {
            map.put("sellerStatus", "PENDING");
        }

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

    private boolean hasSellerRole(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().contains(MarketplaceBackendApplication.Role.MATERIAL_SELLER)
                || user.getRoles().contains(MarketplaceBackendApplication.Role.SELLER);
    }

    private String normalizeOrderStatus(String status) {
        if (status == null) return "WAITING_FOR_ACCEPTANCE";
        String s = status.trim().toUpperCase();
        if ("NEW".equals(s) || "PENDING".equals(s)) return "WAITING_FOR_ACCEPTANCE";
        if ("ACCEPTED".equals(s)) return "ORDER_ACCEPTED";
        if ("DISPATCHED".equals(s)) return "READY_FOR_DISPATCH";
        if ("COMPLETED".equals(s)) return "DELIVERED";
        if ("REJECTED".equals(s)) return "DECLINED";
        return s;
    }

    private boolean isValidOrderTransition(String current, String target) {
        if (current.equals(target)) return true; // idempotent
        return switch (current) {
            case "WAITING_FOR_ACCEPTANCE" -> "ORDER_ACCEPTED".equals(target) || "DECLINED".equals(target) || "CANCELLED".equals(target);
            case "ORDER_ACCEPTED" -> "PROCESSING".equals(target) || "CANCELLED".equals(target);
            case "PROCESSING" -> "READY_FOR_DISPATCH".equals(target) || "CANCELLED".equals(target);
            case "READY_FOR_DISPATCH" -> "OUT_FOR_DELIVERY".equals(target) || "CANCELLED".equals(target);
            case "OUT_FOR_DELIVERY" -> "DELIVERED".equals(target) || "CANCELLED".equals(target);
            case "DELIVERED", "DECLINED", "CANCELLED" -> false; // Terminal states
            default -> false;
        };
    }
}
