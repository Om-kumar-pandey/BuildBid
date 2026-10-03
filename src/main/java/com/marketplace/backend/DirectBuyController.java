package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/direct-buy")
public class DirectBuyController {

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final MaterialRepository materialRepository;
    private final MaterialRequestRepository materialRequestRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final GeoLocationService geoLocationService;
    private final NotificationService notificationService;

    @Autowired
    public DirectBuyController(
            MaterialRepository materialRepository,
            MaterialRequestRepository materialRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService,
            @Autowired(required = false) NotificationService notificationService
    ) {
        this.materialRepository = materialRepository;
        this.materialRequestRepository = materialRequestRepository;
        this.userRepository = userRepository;
        this.geoLocationService = geoLocationService;
        this.notificationService = notificationService;
    }

    public DirectBuyController(
            MaterialRepository materialRepository,
            MaterialRequestRepository materialRequestRepository,
            MarketplaceBackendApplication.UserRepository userRepository,
            GeoLocationService geoLocationService
    ) {
        this(materialRepository, materialRequestRepository, userRepository, geoLocationService, null);
    }

    /**
     * 1. GET /api/direct-buy/materials
     * Returns dynamic list of materials currently in active seller inventory.
     * Adds 'Other — अन्य' option.
     */
    @GetMapping("/materials")
    public ResponseEntity<?> getAvailableMaterials() {
        List<Material> allMaterials = materialRepository.findAll();
        Map<String, Map<String, Object>> distinctMaterials = new LinkedHashMap<>();

        for (Material m : allMaterials) {
            String name = m.getMaterialName();
            if (name == null || name.isBlank()) continue;
            name = name.trim();

            if (m.getSeller() != null && !m.getSeller().isEnabled()) {
                continue;
            }

            double avail = 0.0;
            if (m.getAvailableStock() != null && m.getAvailableStock() > 0) {
                avail = m.getAvailableStock();
            } else if (m.getCurrentStock() != null) {
                avail = m.getCurrentStock() - (m.getReservedStock() != null ? m.getReservedStock() : 0.0);
            }

            if (avail <= 0 || "OUT_OF_STOCK".equalsIgnoreCase(m.getStockStatus())) {
                continue; // only show materials with active stock
            }

            String key = name.toLowerCase();
            if (!distinctMaterials.containsKey(key)) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", name);
                item.put("category", m.getCategory() != null ? m.getCategory() : "General");
                item.put("unit", m.getUnit() != null ? m.getUnit() : "Units");
                item.put("typicalPrice", m.getUnitPrice() != null ? m.getUnitPrice() : 0.0);
                distinctMaterials.put(key, item);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>(distinctMaterials.values());
        // Sort alphabetically
        result.sort(Comparator.comparing(a -> a.get("name").toString(), String.CASE_INSENSITIVE_ORDER));

        // Always append 'Other' option at the very end
        Map<String, Object> otherOption = new LinkedHashMap<>();
        otherOption.put("name", "Other — अन्य");
        otherOption.put("category", "Other — अन्य");
        otherOption.put("unit", "Units");
        otherOption.put("typicalPrice", 0.0);
        otherOption.put("isOther", true);
        result.add(otherOption);

        return ResponseEntity.ok(result);
    }

    /**
     * 2. POST /api/direct-buy/matching-sellers
     * Searches for matching sellers who have the requested material in stock.
     * Applies primary matching on Pincode, fallback on City and State.
     * CRITICAL RULE: Card contains ONLY the requested material information.
     */
    @PostMapping("/matching-sellers")
    public ResponseEntity<?> findMatchingSellers(@RequestBody Map<String, Object> payload) {
        String materialName = payload.get("materialName") != null ? payload.get("materialName").toString().trim() : "";
        Double quantity = parseDoubleSafe(payload.get("quantity"));
        String state = payload.get("state") != null ? payload.get("state").toString().trim() : "";
        String city = payload.get("city") != null ? payload.get("city").toString().trim() : "";
        String pincode = payload.get("pincode") != null ? payload.get("pincode").toString().trim() : "";
        String address = payload.get("address") != null ? payload.get("address").toString().trim() : "";

        if (materialName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please select a material — कृपया सामग्री चुनें"));
        }
        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid quantity (> 0) — मान्य मात्रा दर्ज करें"));
        }
        if (state.isEmpty() || city.isEmpty() || pincode.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "State, City, and PIN code are required — राज्य, शहर और पिन कोड आवश्यक हैं"));
        }

        boolean isOther = materialName.toLowerCase().contains("other") || materialName.contains("अन्य");
        String customMaterialName = payload.get("customMaterialName") != null ? payload.get("customMaterialName").toString().trim() : "";
        if (isOther && customMaterialName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please specify the custom material name — सामग्री का नाम दर्ज करें"));
        }

        List<Material> allMaterials = materialRepository.findAll();
        List<Map<String, Object>> matchingSellerCards = new ArrayList<>();
        Set<Long> processedSellerIds = new HashSet<>();

        String buyerFullLocation = (address + " " + city + " " + pincode + " " + state).trim();
        GeoLocationService.GeoLocation buyerGeo = geoLocationService.resolveLocation(buyerFullLocation);

        for (Material mat : allMaterials) {
            MarketplaceBackendApplication.MarketplaceUser seller = mat.getSeller();
            if (seller == null || !seller.isEnabled()) continue;
            if (processedSellerIds.contains(seller.getId())) continue;

            // 1. PRIMARY FILTER: Material must match the requested material
            String targetMaterial = isOther ? customMaterialName : materialName;
            if (!matchesMaterialName(mat.getMaterialName(), targetMaterial)) {
                continue;
            }

            // 2. STOCK CHECK: Must have sufficient available stock
            double availableStock = 0.0;
            if (mat.getAvailableStock() != null && mat.getAvailableStock() > 0) {
                availableStock = mat.getAvailableStock();
            } else if (mat.getCurrentStock() != null) {
                availableStock = mat.getCurrentStock() - (mat.getReservedStock() != null ? mat.getReservedStock() : 0.0);
            }

            if (availableStock <= 0 || "OUT_OF_STOCK".equalsIgnoreCase(mat.getStockStatus())) {
                continue;
            }
            if (availableStock < quantity) {
                continue; // Insufficient stock for the requested quantity
            }

            // 3. LOCATION MATCHING
            String sellerLoc = mat.getDeliveryLocation();
            if (sellerLoc == null || sellerLoc.isBlank()) {
                sellerLoc = seller.getLocation() != null ? seller.getLocation() : "";
            }
            GeoLocationService.GeoLocation sellerGeo = geoLocationService.resolveLocation(sellerLoc);

            // Compute distance
            Double distanceKm = null;
            if (sellerGeo != null && sellerGeo.hasCoordinates() && buyerGeo != null && buyerGeo.hasCoordinates()) {
                distanceKm = geoLocationService.calculateHaversineDistanceKm(
                        sellerGeo.latitude(), sellerGeo.longitude(),
                        buyerGeo.latitude(), buyerGeo.longitude()
                );
            } else if (geoLocationService.areLocationsEquivalent(sellerLoc, buyerFullLocation)) {
                distanceKm = 10.0;
            } else {
                distanceKm = 25.0; // conservative default
            }

            // 4. TRANSPORTATION COST CALCULATION
            Double radius = mat.getDeliveryRadiusKm() != null ? mat.getDeliveryRadiusKm() : 25.0;
            boolean withinRadius = (distanceKm <= radius);
            String basis = mat.getTransportationChargeBasis() != null ? mat.getTransportationChargeBasis().trim() : "Free Delivery";
            Double rate = mat.getTransportationRate() != null ? mat.getTransportationRate() : 0.0;
            Double transportCost = 0.0;
            boolean fairMessage = false;

            if (withinRadius) {
                if ("Free Delivery".equalsIgnoreCase(basis)) {
                    transportCost = 0.0;
                } else if ("As Applicable".equalsIgnoreCase(basis)) {
                    transportCost = 0.0;
                    fairMessage = true;
                } else if ("Per Order".equalsIgnoreCase(basis) || "Fixed Flat".equalsIgnoreCase(basis) || "Fixed".equalsIgnoreCase(basis)) {
                    transportCost = rate;
                } else if ("Per KM".equalsIgnoreCase(basis)) {
                    transportCost = Math.round((distanceKm * rate) * 100.0) / 100.0;
                } else if ("Per 100 Pieces".equalsIgnoreCase(basis)) {
                    transportCost = Math.round(((quantity / 100.0) * rate) * 100.0) / 100.0;
                } else if ("Per 500 Pieces".equalsIgnoreCase(basis)) {
                    transportCost = Math.round(((quantity / 500.0) * rate) * 100.0) / 100.0;
                } else if ("Per 1000 Pieces".equalsIgnoreCase(basis)) {
                    transportCost = Math.round(((quantity / 1000.0) * rate) * 100.0) / 100.0;
                } else {
                    transportCost = Math.round((quantity * rate) * 100.0) / 100.0;
                }
            } else {
                transportCost = 0.0;
                fairMessage = true;
            }

            double unitPrice = mat.getUnitPrice() != null ? mat.getUnitPrice() : 0.0;
            double materialAmount = Math.round((quantity * unitPrice) * 100.0) / 100.0;
            double estimatedTotal = Math.round((materialAmount + transportCost) * 100.0) / 100.0;

            // Score seller location priority (Pincode = 100, City = 50, State = 20)
            int matchScore = 0;
            if (sellerGeo != null && sellerGeo.pincode() != null && sellerGeo.pincode().equals(pincode)) {
                matchScore += 100;
            }
            if (sellerGeo != null && sellerGeo.city() != null && sellerGeo.city().equalsIgnoreCase(city)) {
                matchScore += 50;
            } else if (sellerLoc.toLowerCase().contains(city.toLowerCase())) {
                matchScore += 30;
            }
            if (sellerGeo != null && sellerGeo.state() != null && sellerGeo.state().equalsIgnoreCase(state)) {
                matchScore += 20;
            } else if (sellerLoc.toLowerCase().contains(state.toLowerCase())) {
                matchScore += 10;
            }

            // CRITICAL RULE: Card contains ONLY selected material details!
            Map<String, Object> card = new LinkedHashMap<>();
            card.put("sellerId", seller.getId());
            card.put("sellerName", seller.getName());
            card.put("sellerLocation", sellerLoc);
            card.put("sellerCity", sellerGeo != null && sellerGeo.city() != null ? sellerGeo.city() : city);
            card.put("sellerState", sellerGeo != null && sellerGeo.state() != null ? sellerGeo.state() : state);
            card.put("sellerPincode", sellerGeo != null && sellerGeo.pincode() != null ? sellerGeo.pincode() : pincode);

            card.put("materialId", mat.getId());
            card.put("materialName", mat.getMaterialName());
            card.put("category", mat.getCategory());
            card.put("unitPrice", unitPrice);
            card.put("unit", mat.getUnit() != null ? mat.getUnit() : "Units");
            card.put("availableStock", availableStock);
            card.put("requestedQuantity", quantity);

            card.put("transportationCost", transportCost);
            card.put("transportationChargeBasis", basis);
            card.put("transportationRate", rate);
            card.put("deliveryRadiusKm", radius);
            card.put("distanceKm", Math.round(distanceKm * 10.0) / 10.0);
            card.put("withinRadius", withinRadius);
            card.put("beyondRadius", !withinRadius);
            card.put("fairTransportationNotice", fairMessage ? "Fair transportation amount will be charged." : null);

            card.put("materialAmount", materialAmount);
            card.put("estimatedTotal", estimatedTotal);
            card.put("matchScore", matchScore);

            matchingSellerCards.add(card);
            processedSellerIds.add(seller.getId());
        }

        // Sort by match score (highest first), then by distance (closest first)
        matchingSellerCards.sort((a, b) -> {
            int scoreA = (int) a.get("matchScore");
            int scoreB = (int) b.get("matchScore");
            if (scoreA != scoreB) return Integer.compare(scoreB, scoreA);
            double distA = (double) a.get("distanceKm");
            double distB = (double) b.get("distanceKm");
            return Double.compare(distA, distB);
        });

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("materialName", isOther ? customMaterialName : materialName);
        response.put("quantity", quantity);
        response.put("matchingCount", matchingSellerCards.size());
        response.put("sellers", matchingSellerCards);

        return ResponseEntity.ok(response);
    }

    /**
     * 3. POST /api/direct-buy/create-request
     * Creates point-in-time snapshot and stores DIRECT_MATERIAL request.
     * ONLY called when the user explicitly clicks "Send Request to Buy Material".
     */
    @PostMapping("/create-request")
    public ResponseEntity<?> createDirectBuyRequest(
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please login to send a Direct Buy request."));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> buyerOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));

        if (buyerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Buyer account not found in system."));
        }

        MarketplaceBackendApplication.MarketplaceUser buyer = buyerOpt.get();

        // Validate Buyer Role: MUST BE CUSTOMER, CONTRACTOR, OR PROFESSIONAL
        String buyerRole = "CUSTOMER";
        boolean hasEligibleRole = false;
        if (buyer.getRoles() != null) {
            for (MarketplaceBackendApplication.Role r : buyer.getRoles()) {
                if (r == MarketplaceBackendApplication.Role.CONTRACTOR) {
                    buyerRole = "CONTRACTOR";
                    hasEligibleRole = true;
                    break;
                } else if (r == MarketplaceBackendApplication.Role.PROFESSIONAL) {
                    buyerRole = "PROFESSIONAL";
                    hasEligibleRole = true;
                    break;
                } else if (r == MarketplaceBackendApplication.Role.CUSTOMER) {
                    buyerRole = "CUSTOMER";
                    hasEligibleRole = true;
                }
            }
        }

        if (!hasEligibleRole) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only Customers, Contractors, and Professionals can place Direct Buy requests."));
        }

        // Validate Target Seller
        Long sellerId = parseLongSafe(payload.get("sellerId"));
        if (sellerId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Seller ID is required"));
        }
        Optional<MarketplaceBackendApplication.MarketplaceUser> sellerOpt = userRepository.findById(sellerId);
        if (sellerOpt.isEmpty() || !sellerOpt.get().isEnabled()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Selected seller is not available"));
        }
        MarketplaceBackendApplication.MarketplaceUser seller = sellerOpt.get();

        // Validate Material
        Long materialId = parseLongSafe(payload.get("materialId"));
        Double quantity = parseDoubleSafe(payload.get("quantity"));
        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid quantity (> 0) is required"));
        }

        String state = payload.get("state") != null ? payload.get("state").toString().trim() : "";
        String city = payload.get("city") != null ? payload.get("city").toString().trim() : "";
        String pincode = payload.get("pincode") != null ? payload.get("pincode").toString().trim() : "";
        String deliveryAddress = payload.get("deliveryAddress") != null ? payload.get("deliveryAddress").toString().trim()
                : (payload.get("address") != null ? payload.get("address").toString().trim() : "");
        String contactPerson = payload.get("contactPerson") != null ? payload.get("contactPerson").toString().trim() : buyer.getName();
        String contactPhone = payload.get("contactPhone") != null ? payload.get("contactPhone").toString().trim() : (buyer.getPhone() != null ? buyer.getPhone() : "");
        String expectedDate = payload.get("expectedDeliveryDate") != null ? payload.get("expectedDeliveryDate").toString().trim() : "";
        String specialNotes = payload.get("specialNotes") != null ? payload.get("specialNotes").toString().trim() : "";

        if (state.isEmpty() || pincode.isEmpty() || deliveryAddress.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "State, PIN code, and Delivery address are required"));
        }

        String materialName;
        String category;
        String unit;
        String brand = "";
        String spec = "";
        double unitPrice = 0.0;
        double transportationCost = 0.0;

        if (materialId != null) {
            Optional<Material> matOpt = materialRepository.findById(materialId);
            if (matOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Material item not found in seller inventory"));
            }
            Material mat = matOpt.get();

            // Security check: Material must strictly belong to the selected seller
            if (mat.getSeller() == null || !mat.getSeller().getId().equals(seller.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Material does not belong to the selected seller"));
            }

            // CONCURRENCY & STOCK SAFETY CHECK: Re-verify stock before creating request
            double avail = (mat.getCurrentStock() != null ? mat.getCurrentStock() : 0.0)
                    - (mat.getReservedStock() != null ? mat.getReservedStock() : 0.0);
            if (avail < quantity) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Insufficient stock. Only " + avail + " " + mat.getUnit() + " currently available from this seller."
                ));
            }

            materialName = mat.getMaterialName();
            category = mat.getCategory();
            unit = mat.getUnit() != null ? mat.getUnit() : "Units";
            brand = mat.getBrand() != null ? mat.getBrand() : "";
            spec = mat.getSpecifications() != null ? mat.getSpecifications() : "";
            unitPrice = mat.getUnitPrice() != null ? mat.getUnitPrice() : 0.0;

            // Re-calculate transportation cost based on seller policy
            String sellerLoc = mat.getDeliveryLocation();
            if (sellerLoc == null || sellerLoc.isBlank()) {
                sellerLoc = seller.getLocation() != null ? seller.getLocation() : "";
            }
            String buyerLoc = (deliveryAddress + " " + city + " " + pincode + " " + state).trim();
            GeoLocationService.GeoLocation sGeo = geoLocationService.resolveLocation(sellerLoc);
            GeoLocationService.GeoLocation bGeo = geoLocationService.resolveLocation(buyerLoc);

            Double distKm = 20.0;
            if (sGeo != null && sGeo.hasCoordinates() && bGeo != null && bGeo.hasCoordinates()) {
                distKm = geoLocationService.calculateHaversineDistanceKm(
                        sGeo.latitude(), sGeo.longitude(), bGeo.latitude(), bGeo.longitude()
                );
            }

            Double rad = mat.getDeliveryRadiusKm() != null ? mat.getDeliveryRadiusKm() : 25.0;
            String basis = mat.getTransportationChargeBasis() != null ? mat.getTransportationChargeBasis().trim() : "Free Delivery";
            Double rate = mat.getTransportationRate() != null ? mat.getTransportationRate() : 0.0;

            if (distKm <= rad) {
                if ("Free Delivery".equalsIgnoreCase(basis) || "As Applicable".equalsIgnoreCase(basis)) {
                    transportationCost = 0.0;
                } else if ("Per Order".equalsIgnoreCase(basis) || "Fixed Flat".equalsIgnoreCase(basis) || "Fixed".equalsIgnoreCase(basis)) {
                    transportationCost = rate;
                } else if ("Per KM".equalsIgnoreCase(basis)) {
                    transportationCost = Math.round((distKm * rate) * 100.0) / 100.0;
                } else if ("Per 100 Pieces".equalsIgnoreCase(basis)) {
                    transportationCost = Math.round(((quantity / 100.0) * rate) * 100.0) / 100.0;
                } else if ("Per 500 Pieces".equalsIgnoreCase(basis)) {
                    transportationCost = Math.round(((quantity / 500.0) * rate) * 100.0) / 100.0;
                } else if ("Per 1000 Pieces".equalsIgnoreCase(basis)) {
                    transportationCost = Math.round(((quantity / 1000.0) * rate) * 100.0) / 100.0;
                } else {
                    transportationCost = Math.round((quantity * rate) * 100.0) / 100.0;
                }
            } else {
                transportationCost = 0.0; // Fair charge notice applied
            }
        } else {
            // Other material
            materialName = payload.get("customMaterialName") != null ? payload.get("customMaterialName").toString().trim() : "Custom Material";
            category = "Other — अन्य";
            unit = payload.get("unit") != null ? payload.get("unit").toString().trim() : "Units";
            unitPrice = parseDoubleSafe(payload.get("unitPrice")) != null ? parseDoubleSafe(payload.get("unitPrice")) : 0.0;
            transportationCost = 0.0;
        }

        double materialAmount = Math.round((quantity * unitPrice) * 100.0) / 100.0;
        double estimatedTotal = Math.round((materialAmount + transportationCost) * 100.0) / 100.0;

        // Generate identifiers
        long count = materialRequestRepository.count() + 1;
        String requestId = "DMR-" + (1000 + count);
        String verificationCode = String.format("BB-DM-%06d", new Random().nextInt(900000) + 100000);

        // Build and Persist Point-in-time Snapshot
        MaterialRequest req = new MaterialRequest();
        req.setRequestId(requestId);
        req.setBuyer(buyer);
        req.setBuyerRole(buyerRole);
        req.setRequestType("DIRECT_MATERIAL"); // CRITICAL: distinguishable from POSTED_REQUIREMENT
        req.setTargetSeller(seller);
        req.setMaterialPrice(unitPrice);
        req.setTransportationCost(transportationCost);
        req.setMaterialAmount(materialAmount);
        req.setEstimatedTotal(estimatedTotal);
        req.setVerificationCode(verificationCode);
        req.setStatus("WAITING_FOR_ACCEPTANCE"); // Flow A initial status

        req.setDeliveryAddress(deliveryAddress);
        req.setCity(city);
        req.setState(state);
        req.setPinCode(pincode);
        req.setContactPerson(contactPerson);
        req.setContactPhone(contactPhone);
        req.setExpectedDeliveryDate(expectedDate);
        req.setSpecialNotes(specialNotes);
        req.setRequestScope("DIRECT");

        // Add single material item
        MaterialRequestItem item = new MaterialRequestItem();
        item.setCategory(category);
        item.setMaterialName(materialName);
        item.setQuantity(quantity);
        item.setUnit(unit);
        item.setBrand(brand);
        item.setSpecification(spec);
        item.setIsCustomMaterial(materialId == null);
        if (materialId == null) item.setCustomMaterialName(materialName);

        req.addItem(item);

        MaterialRequest saved = materialRequestRepository.save(req);

        // Send notification to seller
        if (notificationService != null) {
            try {
                notificationService.createNotification(
                        seller,
                        "New Material Order",
                        "नया सामग्री ऑर्डर",
                        "Buyer " + buyer.getName() + " has sent a Direct Buy material request for " + materialName + " (" + quantity + " " + unit + ").",
                        buyer.getName() + " ने " + materialName + " (" + quantity + " " + unit + ") के लिए सीधा सामग्री खरीद अनुरोध भेजा है।",
                        "NEW_DIRECT_BUY_ORDER",
                        saved.getRequestId()
                );
            } catch (Exception ignored) {}
        }

        LocalDateTime createdAt = saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now(IST_ZONE);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("requestId", saved.getRequestId());
        resp.put("id", saved.getId());
        resp.put("requestType", "DIRECT_MATERIAL");
        resp.put("buyerRole", buyerRole);
        resp.put("buyerName", buyer.getName());
        resp.put("verificationCode", verificationCode);
        resp.put("sellerName", seller.getName());
        resp.put("materialName", materialName);
        resp.put("quantity", quantity);
        resp.put("unit", unit);
        resp.put("materialPrice", unitPrice);
        resp.put("materialAmount", materialAmount);
        resp.put("transportationCost", transportationCost);
        resp.put("estimatedTotal", estimatedTotal);
        resp.put("createdAt", createdAt.toString());
        resp.put("submittedDate", createdAt.format(DISPLAY_DATE_FORMATTER));
        resp.put("submittedTimestamp", createdAt.atZone(IST_ZONE).toInstant().toEpochMilli());
        resp.put("status", "WAITING_FOR_ACCEPTANCE");
        resp.put("statusEn", "Waiting for Acceptance");
        resp.put("statusHi", "विक्रेता की स्वीकृति की प्रतीक्षा");
        resp.put("message", "Direct Buy request sent to seller successfully — सामग्री खरीद अनुरोध सफलतापूर्वक भेजा गया");

        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    /**
     * 4. PUT /api/direct-buy/requests/{id}/accept
     * Seller accepts Direct Buy request.
     * Sets status = ACCEPTED and notifies buyer.
     * Enforces atomic single allocation to prevent duplicate acceptance.
     */
    @PutMapping("/requests/{id}/accept")
    @Transactional
    public ResponseEntity<?> acceptDirectBuyRequest(@PathVariable("id") Long id, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> sellerOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));
        if (sellerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Seller account not found"));
        }

        MaterialRequest req = materialRequestRepository.findByIdForUpdate(id)
                .orElseGet(() -> materialRequestRepository.findById(id).orElse(null));
        if (req == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found with ID: " + id));
        }

        // Validate seller ownership
        if (req.getTargetSeller() == null || !req.getTargetSeller().getId().equals(sellerOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: You are not authorized to accept this direct request."));
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
        if (req.getVerificationCode() == null || req.getVerificationCode().isBlank()) {
            req.setVerificationCode(String.format("BB-DM-%06d", new Random().nextInt(900000) + 100000));
        }

        MaterialRequest saved = materialRequestRepository.save(req);

        // Notify buyer
        if (notificationService != null && saved.getBuyer() != null) {
            try {
                notificationService.createNotification(
                        saved.getBuyer(),
                        "Order Accepted",
                        "ऑर्डर स्वीकार किया गया",
                        "Seller " + sellerOpt.get().getName() + " has accepted your material order.",
                        "विक्रेता " + sellerOpt.get().getName() + " ने आपका सामग्री ऑर्डर स्वीकार कर लिया है।",
                        "DIRECT_BUY_ACCEPTED",
                        saved.getRequestId()
                );
            } catch (Exception ignored) {}
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("requestId", saved.getRequestId());
        resp.put("status", "ACCEPTED");
        resp.put("statusEn", "Order Accepted");
        resp.put("statusHi", "ऑर्डर स्वीकार किया गया");
        resp.put("verificationCode", saved.getVerificationCode());
        resp.put("message", "Direct Buy request accepted — ऑर्डर स्वीकार कर लिया गया");

        return ResponseEntity.ok(resp);
    }

    /**
     * PUT /api/direct-buy/requests/{id}/status
     * Allows seller to transition direct buy order status:
     * PROCESSING -> READY_FOR_DISPATCH -> OUT_FOR_DELIVERY -> DELIVERED
     */
    @PutMapping("/requests/{id}/status")
    public ResponseEntity<?> updateDirectBuyStatus(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> sellerOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));
        if (sellerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Seller account not found"));
        }

        Optional<MaterialRequest> reqOpt = materialRequestRepository.findById(id);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found with ID: " + id));
        }

        MaterialRequest req = reqOpt.get();
        if (req.getTargetSeller() == null || !req.getTargetSeller().getId().equals(sellerOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: Not your direct buy order."));
        }

        String targetStatus = body != null && body.get("status") != null ? body.get("status").toString().trim().toUpperCase() : null;
        if (targetStatus == null || targetStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }

        // Normalize
        if ("ACCEPTED".equalsIgnoreCase(targetStatus)) targetStatus = "ORDER_ACCEPTED";
        if ("DISPATCHED".equalsIgnoreCase(targetStatus)) targetStatus = "READY_FOR_DISPATCH";

        req.setStatus(targetStatus);
        MaterialRequest saved = materialRequestRepository.save(req);

        // Bilingual notifications to buyer
        if (notificationService != null && saved.getBuyer() != null) {
            String titleEn = "Order Update";
            String titleHi = "ऑर्डर अपडेट";
            String msgEn = "Order " + saved.getRequestId() + " status updated to " + targetStatus;
            String msgHi = "ऑर्डर " + saved.getRequestId() + " की स्थिति अपडेट की गई: " + targetStatus;

            if ("PROCESSING".equals(targetStatus)) {
                titleEn = "Processing";
                titleHi = "प्रक्रिया में";
                msgEn = "Seller " + sellerOpt.get().getName() + " is now processing your material order.";
                msgHi = "विक्रेता " + sellerOpt.get().getName() + " आपके सामग्री ऑर्डर को तैयार कर रहे हैं।";
            } else if ("READY_FOR_DISPATCH".equals(targetStatus)) {
                titleEn = "Ready for Dispatch";
                titleHi = "भेजने के लिए तैयार";
                msgEn = "Your material order " + saved.getRequestId() + " is packed and ready for dispatch.";
                msgHi = "आपका सामग्री ऑर्डर " + saved.getRequestId() + " भेजने के लिए तैयार है।";
            } else if ("OUT_FOR_DELIVERY".equals(targetStatus)) {
                titleEn = "Out for Delivery";
                titleHi = "डिलीवरी के लिए रवाना";
                msgEn = "Your material order " + saved.getRequestId() + " is out for delivery.";
                msgHi = "आपका सामग्री ऑर्डर " + saved.getRequestId() + " डिलीवरी के लिए निकल चुका है।";
            } else if ("DELIVERED".equals(targetStatus)) {
                titleEn = "Delivered";
                titleHi = "डिलीवर हो गया";
                msgEn = "Your material order " + saved.getRequestId() + " has been marked as delivered.";
                msgHi = "आपका सामग्री ऑर्डर " + saved.getRequestId() + " डिलीवर हो चुका है।";
            }

            try {
                notificationService.createNotification(
                        saved.getBuyer(),
                        titleEn,
                        titleHi,
                        msgEn,
                        msgHi,
                        "DIRECT_BUY_STATUS_UPDATE",
                        saved.getRequestId()
                );
            } catch (Exception ignored) {}
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("requestId", saved.getRequestId());
        resp.put("status", saved.getStatus());
        resp.put("message", "Order status updated successfully — स्थिति सफलतापूर्वक अपडेट की गई");
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/requests/{id}/process")
    public ResponseEntity<?> processDirectBuyOrder(@PathVariable("id") Long id, Authentication authentication) {
        return updateDirectBuyStatus(id, Map.of("status", "PROCESSING"), authentication);
    }

    @PutMapping("/requests/{id}/dispatch")
    public ResponseEntity<?> dispatchDirectBuyOrder(@PathVariable("id") Long id, Authentication authentication) {
        return updateDirectBuyStatus(id, Map.of("status", "READY_FOR_DISPATCH"), authentication);
    }

    @PutMapping("/requests/{id}/out-for-delivery")
    public ResponseEntity<?> outForDeliveryDirectBuyOrder(@PathVariable("id") Long id, Authentication authentication) {
        return updateDirectBuyStatus(id, Map.of("status", "OUT_FOR_DELIVERY"), authentication);
    }

    @PutMapping("/requests/{id}/delivered")
    public ResponseEntity<?> deliverDirectBuyOrder(@PathVariable("id") Long id, Authentication authentication) {
        return updateDirectBuyStatus(id, Map.of("status", "DELIVERED"), authentication);
    }

    @PutMapping("/requests/{id}/expected-delivery")
    public ResponseEntity<?> updateExpectedDelivery(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String dateStr = body != null && body.get("expectedDeliveryDate") != null
                ? body.get("expectedDeliveryDate").toString().trim() : "";
        if (dateStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "expectedDeliveryDate is required"));
        }

        Optional<MaterialRequest> reqOpt = materialRequestRepository.findById(id);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found with ID: " + id));
        }

        MaterialRequest req = reqOpt.get();
        req.setExpectedDeliveryDate(dateStr);
        MaterialRequest saved = materialRequestRepository.save(req);

        if (notificationService != null && saved.getBuyer() != null) {
            try {
                notificationService.createNotification(
                        saved.getBuyer(),
                        "Delivery Date Updated",
                        "डिलीवरी की तारीख अपडेट की गई",
                        "Expected delivery date for order " + saved.getRequestId() + " is now " + dateStr + ".",
                        "ऑर्डर " + saved.getRequestId() + " की अनुमानित डिलीवरी तिथि अब " + dateStr + " है।",
                        "DELIVERY_DATE_UPDATED",
                        saved.getRequestId()
                );
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "requestId", saved.getRequestId(),
                "expectedDeliveryDate", saved.getExpectedDeliveryDate(),
                "message", "Expected delivery date updated — डिलीवरी की तारीख अपडेट की गई"
        ));
    }

    /**
     * 5. PUT /api/direct-buy/requests/{id}/decline
     * Seller declines Direct Buy request.
     */
    @PutMapping("/requests/{id}/decline")
    public ResponseEntity<?> declineDirectBuyRequest(@PathVariable("id") Long id, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String principal = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> sellerOpt =
                userRepository.findByEmail(principal).or(() -> userRepository.findByUsername(principal));
        if (sellerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Seller account not found"));
        }

        Optional<MaterialRequest> reqOpt = materialRequestRepository.findById(id);
        if (reqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found with ID: " + id));
        }

        MaterialRequest req = reqOpt.get();

        // Validate seller ownership
        if (req.getTargetSeller() == null || !req.getTargetSeller().getId().equals(sellerOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: You are not authorized to decline this direct request."));
        }

        req.setStatus("DECLINED");
        MaterialRequest saved = materialRequestRepository.save(req);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("requestId", saved.getRequestId());
        resp.put("status", "DECLINED");
        resp.put("message", "Direct Buy request declined — अनुरोध अस्वीकार कर दिया गया");

        return ResponseEntity.ok(resp);
    }

    private boolean matchesMaterialName(String inventoryName, String requestedName) {
        if (inventoryName == null || requestedName == null) return false;
        String a = normalizeMaterialName(inventoryName);
        String b = normalizeMaterialName(requestedName);
        if (a.isEmpty() || b.isEmpty()) return false;
        return a.contains(b) || b.contains(a);
    }

    private String normalizeMaterialName(String s) {
        if (s == null) return "";
        // remove bilingual suffix after '—'
        String clean = s.split("—")[0].trim().toLowerCase();
        return clean.replaceAll("[^\\p{L}\\p{N}]", "");
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

    private Long parseLongSafe(Object obj) {
        if (obj == null) return null;
        try {
            if (obj instanceof Number) return ((Number) obj).longValue();
            String clean = obj.toString().trim();
            if (clean.isEmpty()) return null;
            return Long.parseLong(clean);
        } catch (Exception e) {
            return null;
        }
    }
}
