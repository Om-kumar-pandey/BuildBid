package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class MaterialTransportationTest {

    private MaterialRepository materialRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private GeoLocationService geoLocationService;
    private MaterialController materialController;

    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser seller2;
    private Authentication authSeller1;
    private Authentication authSeller2;

    @BeforeEach
    public void setup() {
        materialRepository = mock(MaterialRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        geoLocationService = new GeoLocationService();
        materialController = new MaterialController(materialRepository, userRepository, geoLocationService);

        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(seller1, "id", 101L);
        seller1.setEmail("seller1@buildbid.com");
        seller1.setUsername("seller1");
        seller1.setName("Gupta Cement & Steel");
        seller1.setLocation("Sector 62, Noida, Uttar Pradesh");

        seller2 = new MarketplaceBackendApplication.MarketplaceUser();
        org.springframework.test.util.ReflectionTestUtils.setField(seller2, "id", 202L);
        seller2.setEmail("seller2@buildbid.com");
        seller2.setUsername("seller2");
        seller2.setName("Other Seller");
        seller2.setLocation("Greater Noida, Uttar Pradesh");

        authSeller1 = mock(Authentication.class);
        when(authSeller1.getName()).thenReturn("seller1@buildbid.com");

        authSeller2 = mock(Authentication.class);
        when(authSeller2.getName()).thenReturn("seller2@buildbid.com");

        when(userRepository.findByEmail("seller1@buildbid.com")).thenReturn(Optional.of(seller1));
        when(userRepository.findByEmail("seller2@buildbid.com")).thenReturn(Optional.of(seller2));
    }

    @Test
    public void testEntityDefaultsAndBackwardCompatibility() {
        Material m = new Material();
        m.setCategory("Cement — सीमेंट");
        m.setMaterialName("UltraTech OPC 53");
        m.setCurrentStock(100.0);
        m.setReservedStock(10.0);
        m.setAvailableStock(90.0);
        m.setUnit("Bags");
        m.setUnitPrice(420.0);

        // PrePersist simulation
        m.onCreate();

        assertNotNull(m.getCreatedAt());
        assertEquals("Fair transportation amount will be charged.", m.getBeyondRadiusPolicy());
        assertFalse(m.getTransportationPolicyEnabled());
        assertNull(m.getTransportationRate());
        assertNull(m.getDeliveryRadiusKm());
    }

    @Test
    public void testCreateMaterialWithTransportationPolicy_Cement() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("category", "Cement — सीमेंट");
        payload.put("materialName", "UltraTech Cement 53 Grade");
        payload.put("initialStock", 500);
        payload.put("reservedStock", 0);
        payload.put("unit", "Bag — बोरी");
        payload.put("unitPrice", 420.0);
        payload.put("deliveryLocation", "Sector 62, Noida, Uttar Pradesh");
        payload.put("deliveryRadiusKm", 20.0);
        payload.put("transportationChargeBasis", "Per Bag");
        payload.put("transportationRate", 15.0);
        payload.put("beyondRadiusPolicy", "Fair transportation amount will be charged.");

        when(materialRepository.save(any(Material.class))).thenAnswer(invocation -> {
            Material saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        ResponseEntity<?> response = materialController.createMaterial(payload, authSeller1);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(20.0, body.get("deliveryRadiusKm"));
        assertEquals("Per Bag", body.get("transportationChargeBasis"));
        assertEquals(15.0, body.get("transportationRate"));
        assertEquals("Fair transportation amount will be charged.", body.get("beyondRadiusPolicy"));
        assertEquals(true, body.get("transportationPolicyEnabled"));
    }

    @Test
    public void testCreateMaterial_FreeDelivery() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("category", "Steel — स्टील");
        payload.put("materialName", "Tata Tiscon Fe 500D");
        payload.put("initialStock", 50);
        payload.put("unit", "Metric Ton — मीट्रिक टन");
        payload.put("unitPrice", 54000.0);
        payload.put("deliveryRadiusKm", 30.0);
        payload.put("transportationChargeBasis", "Free Delivery");

        when(materialRepository.save(any(Material.class))).thenAnswer(invocation -> {
            Material saved = invocation.getArgument(0);
            saved.setId(2L);
            return saved;
        });

        ResponseEntity<?> response = materialController.createMaterial(payload, authSeller1);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(0.0, body.get("transportationRate"));
        assertEquals("Free Delivery", body.get("transportationChargeBasis"));
    }

    @Test
    public void testUpdateMaterial_ModifyTransportationPolicy() {
        Material existing = new Material();
        existing.setId(10L);
        existing.setSeller(seller1);
        existing.setCategory("Cement — सीमेंट");
        existing.setMaterialName("OPC Cement 53 Grade");
        existing.setCurrentStock(200.0);
        existing.setReservedStock(0.0);
        existing.setAvailableStock(200.0);
        existing.setUnit("Bags");
        existing.setUnitPrice(420.0);
        existing.setDeliveryRadiusKm(20.0);
        existing.setTransportationChargeBasis("Per Bag");
        existing.setTransportationRate(15.0);

        when(materialRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(materialRepository.save(any(Material.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Seller updates radius to 30 KM and rate to 18 / Bag
        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("currentStock", 200.0);
        updatePayload.put("reservedStock", 0.0);
        updatePayload.put("unitPrice", 420.0);
        updatePayload.put("deliveryRadiusKm", 30.0);
        updatePayload.put("transportationRate", 18.0);
        updatePayload.put("transportationChargeBasis", "Per Bag");

        ResponseEntity<?> response = materialController.updateMaterial(10L, updatePayload, authSeller1);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(30.0, body.get("deliveryRadiusKm"));
        assertEquals(18.0, body.get("transportationRate"));
    }

    @Test
    public void testSecurity_CannotUpdateAnotherSellerMaterial() {
        Material existing = new Material();
        existing.setId(10L);
        existing.setSeller(seller1); // Owned by seller1
        existing.setCurrentStock(200.0);
        existing.setUnitPrice(420.0);

        when(materialRepository.findById(10L)).thenReturn(Optional.of(existing));

        // Seller2 attempts to edit seller1's material
        Map<String, Object> payload = new HashMap<>();
        payload.put("currentStock", 200.0);
        payload.put("reservedStock", 0.0);
        payload.put("unitPrice", 420.0);

        ResponseEntity<?> response = materialController.updateMaterial(10L, payload, authSeller2);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    public void testCalculateTransportation_CementWithinRadius() {
        Material cement = new Material();
        cement.setId(1L);
        cement.setSeller(seller1);
        cement.setMaterialName("OPC Cement 53 Grade");
        cement.setUnitPrice(420.0);
        cement.setUnit("Bags");
        cement.setDeliveryRadiusKm(20.0);
        cement.setTransportationChargeBasis("Per Bag");
        cement.setTransportationRate(15.0);
        cement.setTransportationPolicyEnabled(true);

        when(materialRepository.findById(1L)).thenReturn(Optional.of(cement));

        // Buyer orders 100 Bags within 15 KM
        Map<String, Object> payload = new HashMap<>();
        payload.put("materialId", 1L);
        payload.put("quantity", 100);
        payload.put("distanceKm", 15.0);

        ResponseEntity<?> response = materialController.calculateTransportation(payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("withinRadius"));
        assertEquals(false, body.get("beyondRadius"));
        assertEquals(42000.0, body.get("materialTotal"));
        assertEquals(1500.0, body.get("transportationAmount"));
        assertEquals(43500.0, body.get("grandTotal"));
        assertNull(body.get("customerMessage"));
    }

    @Test
    public void testCalculateTransportation_CementBeyondRadius() {
        Material cement = new Material();
        cement.setId(1L);
        cement.setSeller(seller1);
        cement.setMaterialName("OPC Cement 53 Grade");
        cement.setUnitPrice(420.0);
        cement.setUnit("Bags");
        cement.setDeliveryRadiusKm(20.0);
        cement.setTransportationChargeBasis("Per Bag");
        cement.setTransportationRate(15.0);
        cement.setBeyondRadiusPolicy("Fair transportation amount will be charged.");

        when(materialRepository.findById(1L)).thenReturn(Optional.of(cement));

        // Buyer distance is 28 KM (Beyond 20 KM radius)
        Map<String, Object> payload = new HashMap<>();
        payload.put("materialId", 1L);
        payload.put("quantity", 100);
        payload.put("distanceKm", 28.0);

        ResponseEntity<?> response = materialController.calculateTransportation(payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(false, body.get("withinRadius"));
        assertEquals(true, body.get("beyondRadius"));
        assertEquals(28.0, body.get("distanceKm"));
        assertEquals(20.0, body.get("standardRadiusKm"));
        assertEquals(0.0, body.get("transportationAmount")); // No hidden or incorrect automatic amount
        assertEquals(42000.0, body.get("grandTotal"));
        assertEquals("Fair transportation amount will be charged.", body.get("customerMessage"));
        assertFalse(body.get("customerMessage").toString().contains("Custom Quotation Required"));
    }

    @Test
    public void testCalculateTransportation_SteelPerTon() {
        Material steel = new Material();
        steel.setId(2L);
        steel.setMaterialName("TMT Steel Rebars Fe 500");
        steel.setUnitPrice(54000.0);
        steel.setUnit("Tons");
        steel.setDeliveryRadiusKm(25.0);
        steel.setTransportationChargeBasis("Per Ton");
        steel.setTransportationRate(1500.0);

        when(materialRepository.findById(2L)).thenReturn(Optional.of(steel));

        // Buyer orders 2 Tons at 10 KM
        Map<String, Object> payload = new HashMap<>();
        payload.put("materialId", 2L);
        payload.put("quantity", 2);
        payload.put("distanceKm", 10.0);

        ResponseEntity<?> response = materialController.calculateTransportation(payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(108000.0, body.get("materialTotal"));
        assertEquals(3000.0, body.get("transportationAmount")); // 2 * 1500 = 3000
        assertEquals(111000.0, body.get("grandTotal"));
    }

    @Test
    public void testCalculateTransportation_BricksPer1000Pieces() {
        Material bricks = new Material();
        bricks.setId(3L);
        bricks.setMaterialName("Red Bricks First Class");
        bricks.setUnitPrice(8.0);
        bricks.setUnit("Pieces");
        bricks.setDeliveryRadiusKm(25.0);
        bricks.setTransportationChargeBasis("Per 1000 Pieces");
        bricks.setTransportationRate(1500.0);

        when(materialRepository.findById(3L)).thenReturn(Optional.of(bricks));

        // Buyer orders 5000 Pieces at 12 KM
        Map<String, Object> payload = new HashMap<>();
        payload.put("materialId", 3L);
        payload.put("quantity", 5000);
        payload.put("distanceKm", 12.0);

        ResponseEntity<?> response = materialController.calculateTransportation(payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(40000.0, body.get("materialTotal"));
        assertEquals(7500.0, body.get("transportationAmount")); // (5000/1000) * 1500 = 7500
        assertEquals(47500.0, body.get("grandTotal"));
    }

    @Test
    public void testCalculateTransportation_AllRemainingBases() {
        // 1. Per Piece
        Material pieceMat = new Material();
        pieceMat.setId(4L);
        pieceMat.setDeliveryRadiusKm(20.0);
        pieceMat.setUnitPrice(10.0);
        pieceMat.setTransportationChargeBasis("Per Piece");
        pieceMat.setTransportationRate(1.5);
        when(materialRepository.findById(4L)).thenReturn(Optional.of(pieceMat));

        Map<String, Object> p1 = new HashMap<>();
        p1.put("materialId", 4L);
        p1.put("quantity", 200);
        p1.put("distanceKm", 5.0);
        Map<?, ?> r1 = (Map<?, ?>) materialController.calculateTransportation(p1).getBody();
        assertEquals(300.0, r1.get("transportationAmount")); // 200 * 1.5 = 300

        // 2. Per 100 Pieces
        pieceMat.setTransportationChargeBasis("Per 100 Pieces");
        pieceMat.setTransportationRate(50.0);
        Map<?, ?> r2 = (Map<?, ?>) materialController.calculateTransportation(p1).getBody();
        assertEquals(100.0, r2.get("transportationAmount")); // (200 / 100) * 50 = 100

        // 3. Per 500 Pieces
        pieceMat.setTransportationChargeBasis("Per 500 Pieces");
        pieceMat.setTransportationRate(200.0);
        p1.put("quantity", 1000);
        Map<?, ?> r3 = (Map<?, ?>) materialController.calculateTransportation(p1).getBody();
        assertEquals(400.0, r3.get("transportationAmount")); // (1000 / 500) * 200 = 400

        // 4. Per KG
        Material kgMat = new Material();
        kgMat.setId(5L);
        kgMat.setDeliveryRadiusKm(15.0);
        kgMat.setUnitPrice(50.0);
        kgMat.setTransportationChargeBasis("Per KG");
        kgMat.setTransportationRate(2.0);
        when(materialRepository.findById(5L)).thenReturn(Optional.of(kgMat));

        Map<String, Object> p4 = new HashMap<>();
        p4.put("materialId", 5L);
        p4.put("quantity", 50);
        p4.put("distanceKm", 10.0);
        Map<?, ?> r4 = (Map<?, ?>) materialController.calculateTransportation(p4).getBody();
        assertEquals(100.0, r4.get("transportationAmount")); // 50 * 2 = 100

        // 5. Per CFT (Sand)
        Material sandMat = new Material();
        sandMat.setId(6L);
        sandMat.setDeliveryRadiusKm(25.0);
        sandMat.setUnitPrice(45.0);
        sandMat.setTransportationChargeBasis("Per CFT");
        sandMat.setTransportationRate(5.0);
        when(materialRepository.findById(6L)).thenReturn(Optional.of(sandMat));

        Map<String, Object> p5 = new HashMap<>();
        p5.put("materialId", 6L);
        p5.put("quantity", 300);
        p5.put("distanceKm", 15.0);
        Map<?, ?> r5 = (Map<?, ?>) materialController.calculateTransportation(p5).getBody();
        assertEquals(1500.0, r5.get("transportationAmount")); // 300 * 5 = 1500

        // 6. Per Cubic Meter (RMC)
        sandMat.setTransportationChargeBasis("Per Cubic Meter");
        sandMat.setTransportationRate(250.0);
        p5.put("quantity", 10);
        Map<?, ?> r6 = (Map<?, ?>) materialController.calculateTransportation(p5).getBody();
        assertEquals(2500.0, r6.get("transportationAmount")); // 10 * 250 = 2500

        // 7. Per Order
        sandMat.setTransportationChargeBasis("Per Order");
        sandMat.setTransportationRate(750.0);
        Map<?, ?> r7 = (Map<?, ?>) materialController.calculateTransportation(p5).getBody();
        assertEquals(750.0, r7.get("transportationAmount")); // 750 flat

        // 8. Per KM
        sandMat.setTransportationChargeBasis("Per KM");
        sandMat.setTransportationRate(30.0); // 30 / km
        p5.put("distanceKm", 20.0);
        Map<?, ?> r8 = (Map<?, ?>) materialController.calculateTransportation(p5).getBody();
        assertEquals(600.0, r8.get("transportationAmount")); // 20 * 30 = 600

        // 9. As Applicable
        sandMat.setTransportationChargeBasis("As Applicable");
        Map<?, ?> r9 = (Map<?, ?>) materialController.calculateTransportation(p5).getBody();
        assertEquals(0.0, r9.get("transportationAmount"));
        assertEquals("Fair transportation amount will be charged.", r9.get("customerMessage"));
    }
}
