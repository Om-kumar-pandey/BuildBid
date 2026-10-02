package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - PHASE 4C TEST SUITE
 * SKU-Level Quotation + Material Order Item Architecture Tests
 */
public class SkuQuotationAndMaterialOrderItemTest {

    private QuotationRepository quotationRepository;
    private QuotationItemRepository quotationItemRepository;
    private MaterialRequestRepository materialRequestRepository;
    private MaterialRequestItemRepository materialRequestItemRepository;
    private ClientServiceRequestRepository clientServiceRequestRepository;
    private MaterialOrderRepository materialOrderRepository;
    private MaterialOrderItemRepository materialOrderItemRepository;
    private MaterialRepository materialRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private GeoLocationService geoLocationService;

    private MaterialOrderService materialOrderService;
    private QuotationService quotationService;
    private MaterialOrderController materialOrderController;
    private QuotationController quotationController;
    private MaterialRequestController materialRequestController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorBuyer;
    private MarketplaceBackendApplication.MarketplaceUser proBuyer;
    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser seller2;

    private MaterialRequest materialReq;
    private MaterialRequestItem reqItemCement;
    private MaterialRequestItem reqItemSteel;
    private MaterialRequestItem reqItemBricks;

    private Material catalogMatCementSeller1;
    private Material catalogMatSteelSeller1;
    private Material catalogMatCementSeller2;

    private Authentication authCustomerA;
    private Authentication authCustomerB;
    private Authentication authSeller1;
    private Authentication authSeller2;
    private Authentication authPro;

    @BeforeEach
    public void setup() {
        quotationRepository = mock(QuotationRepository.class);
        quotationItemRepository = mock(QuotationItemRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        materialRequestItemRepository = mock(MaterialRequestItemRepository.class);
        clientServiceRequestRepository = mock(ClientServiceRequestRepository.class);
        materialOrderRepository = mock(MaterialOrderRepository.class);
        materialOrderItemRepository = mock(MaterialOrderItemRepository.class);
        materialRepository = mock(MaterialRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        geoLocationService = new GeoLocationService();

        materialOrderService = new MaterialOrderService(
                materialOrderRepository,
                materialOrderItemRepository,
                quotationItemRepository
        );

        quotationService = new QuotationService(
                quotationRepository,
                materialRequestRepository,
                clientServiceRequestRepository,
                userRepository,
                geoLocationService,
                materialOrderService,
                materialRepository,
                materialRequestItemRepository,
                quotationItemRepository
        );

        materialOrderController = new MaterialOrderController(materialOrderService, userRepository);
        quotationController = new QuotationController(quotationService, userRepository);
        materialRequestController = new MaterialRequestController(
                materialRequestRepository,
                userRepository,
                geoLocationService
        );

        // 1. Users setup
        customerA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerA, "id", 1L);
        customerA.setEmail("alice@buildbid.com");
        customerA.setName("Alice Customer");
        customerA.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        customerB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerB, "id", 2L);
        customerB.setEmail("bob@buildbid.com");
        customerB.setName("Bob Customer");
        customerB.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        contractorBuyer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractorBuyer, "id", 3L);
        contractorBuyer.setEmail("contractor@buildbid.com");
        contractorBuyer.setName("BuildCo Contractor");
        contractorBuyer.getRoles().add(MarketplaceBackendApplication.Role.CONTRACTOR);

        proBuyer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(proBuyer, "id", 4L);
        proBuyer.setEmail("architect@buildbid.com");
        proBuyer.setName("Dave Architect");
        proBuyer.getRoles().add(MarketplaceBackendApplication.Role.PROFESSIONAL);

        seller1 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller1, "id", 10L);
        seller1.setEmail("seller1@buildbid.com");
        seller1.setName("Apex Building Supplies");
        seller1.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        seller2 = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(seller2, "id", 20L);
        seller2.setEmail("seller2@buildbid.com");
        seller2.setName("Rival Building Supplies");
        seller2.getRoles().add(MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        // Authentication mocks
        authCustomerA = mock(Authentication.class);
        when(authCustomerA.getName()).thenReturn("alice@buildbid.com");
        when(userRepository.findByEmail("alice@buildbid.com")).thenReturn(Optional.of(customerA));

        authCustomerB = mock(Authentication.class);
        when(authCustomerB.getName()).thenReturn("bob@buildbid.com");
        when(userRepository.findByEmail("bob@buildbid.com")).thenReturn(Optional.of(customerB));

        authSeller1 = mock(Authentication.class);
        when(authSeller1.getName()).thenReturn("seller1@buildbid.com");
        when(userRepository.findByEmail("seller1@buildbid.com")).thenReturn(Optional.of(seller1));

        authSeller2 = mock(Authentication.class);
        when(authSeller2.getName()).thenReturn("seller2@buildbid.com");
        when(userRepository.findByEmail("seller2@buildbid.com")).thenReturn(Optional.of(seller2));

        authPro = mock(Authentication.class);
        when(authPro.getName()).thenReturn("architect@buildbid.com");
        when(userRepository.findByEmail("architect@buildbid.com")).thenReturn(Optional.of(proBuyer));

        // 2. MaterialRequest & Items setup
        materialReq = new MaterialRequest();
        ReflectionTestUtils.setField(materialReq, "id", 500L);
        materialReq.setRequestId("MR-500");
        materialReq.setBuyer(customerA);
        materialReq.setBuyerRole("CUSTOMER");
        materialReq.setRequestType("MATERIAL_REQUIREMENT");
        materialReq.setRequestScope("ALL_INDIA");
        materialReq.setStatus("NEW");

        reqItemCement = new MaterialRequestItem();
        ReflectionTestUtils.setField(reqItemCement, "id", 501L);
        reqItemCement.setMaterialRequest(materialReq);
        reqItemCement.setMaterialName("Cement");
        reqItemCement.setQuantity(100.0);
        reqItemCement.setUnit("Bags");

        reqItemSteel = new MaterialRequestItem();
        ReflectionTestUtils.setField(reqItemSteel, "id", 502L);
        reqItemSteel.setMaterialRequest(materialReq);
        reqItemSteel.setMaterialName("Steel");
        reqItemSteel.setQuantity(500.0);
        reqItemSteel.setUnit("KG");

        reqItemBricks = new MaterialRequestItem();
        ReflectionTestUtils.setField(reqItemBricks, "id", 503L);
        reqItemBricks.setMaterialRequest(materialReq);
        reqItemBricks.setMaterialName("Bricks");
        reqItemBricks.setQuantity(5000.0);
        reqItemBricks.setUnit("Pieces");

        materialReq.getItems().add(reqItemCement);
        materialReq.getItems().add(reqItemSteel);
        materialReq.getItems().add(reqItemBricks);

        when(materialRequestRepository.findById(500L)).thenReturn(Optional.of(materialReq));
        when(materialRequestItemRepository.findById(501L)).thenReturn(Optional.of(reqItemCement));
        when(materialRequestItemRepository.findById(502L)).thenReturn(Optional.of(reqItemSteel));
        when(materialRequestItemRepository.findById(503L)).thenReturn(Optional.of(reqItemBricks));

        // 3. Catalog Materials setup
        catalogMatCementSeller1 = new Material();
        ReflectionTestUtils.setField(catalogMatCementSeller1, "id", 401L);
        catalogMatCementSeller1.setMaterialName("UltraTech OPC Cement 53 Grade");
        catalogMatCementSeller1.setUnit("Bags");
        catalogMatCementSeller1.setUnitPrice(420.0);
        catalogMatCementSeller1.setCurrentStock(1000.0);
        catalogMatCementSeller1.setReservedStock(100.0);
        catalogMatCementSeller1.setAvailableStock(900.0);
        catalogMatCementSeller1.setSeller(seller1);

        catalogMatSteelSeller1 = new Material();
        ReflectionTestUtils.setField(catalogMatSteelSeller1, "id", 402L);
        catalogMatSteelSeller1.setMaterialName("Tata Tiscon 500D TMT Rebars");
        catalogMatSteelSeller1.setUnit("KG");
        catalogMatSteelSeller1.setUnitPrice(72.0);
        catalogMatSteelSeller1.setCurrentStock(5000.0);
        catalogMatSteelSeller1.setReservedStock(500.0);
        catalogMatSteelSeller1.setAvailableStock(4500.0);
        catalogMatSteelSeller1.setSeller(seller1);

        catalogMatCementSeller2 = new Material();
        ReflectionTestUtils.setField(catalogMatCementSeller2, "id", 403L);
        catalogMatCementSeller2.setMaterialName("Ambuja Cement");
        catalogMatCementSeller2.setUnit("Bags");
        catalogMatCementSeller2.setUnitPrice(410.0);
        catalogMatCementSeller2.setCurrentStock(800.0);
        catalogMatCementSeller2.setReservedStock(0.0);
        catalogMatCementSeller2.setAvailableStock(800.0);
        catalogMatCementSeller2.setSeller(seller2);

        when(materialRepository.findById(401L)).thenReturn(Optional.of(catalogMatCementSeller1));
        when(materialRepository.findById(402L)).thenReturn(Optional.of(catalogMatSteelSeller1));
        when(materialRepository.findById(403L)).thenReturn(Optional.of(catalogMatCementSeller2));

        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> {
            Quotation q = i.getArgument(0);
            if (q.getId() == null) {
                ReflectionTestUtils.setField(q, "id", 1001L);
            }
            return q;
        });

        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> {
            MaterialOrder o = i.getArgument(0);
            if (o.getId() == null) {
                ReflectionTestUtils.setField(o, "id", 2001L);
            }
            return o;
        });
    }

    // 1. Single-item quotation creates one QuotationItem
    @Test
    public void test01_SingleItemQuotationCreatesOneQuotationItem() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of(
                        "materialRequestItemId", 501L,
                        "materialId", 401L,
                        "quantity", 100.0,
                        "unit", "Bags",
                        "unitPrice", 420.0
                )
        ));

        Quotation q = quotationService.submitQuotation(payload, seller1);
        assertNotNull(q);
        assertEquals(1, q.getItems().size());
        QuotationItem item = q.getItems().get(0);
        assertEquals(401L, item.getMaterial().getId());
        assertEquals(100.0, item.getQuotedQuantity());
        assertEquals(420.0, item.getUnitPrice());
        assertEquals(42000.0, item.getLineTotal());
    }

    // 2. Multi-item quotation creates multiple QuotationItems
    @Test
    public void test02_MultiItemQuotationCreatesMultipleQuotationItems() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 100.0, "unit", "Bags", "unitPrice", 420.0),
                Map.of("materialRequestItemId", 502L, "materialId", 402L, "quantity", 500.0, "unit", "KG", "unitPrice", 72.0)
        ));

        Quotation q = quotationService.submitQuotation(payload, seller1);
        assertEquals(2, q.getItems().size());
        assertEquals(42000.0, q.getItems().get(0).getLineTotal());
        assertEquals(36000.0, q.getItems().get(1).getLineTotal());
        assertEquals(78000.0, q.getMaterialCost());
    }

    // 3. QuotationItem links correct MaterialRequestItem
    @Test
    public void test03_QuotationItemLinksCorrectMaterialRequestItem() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 50.0, "unitPrice", 400.0)
        ));

        Quotation q = quotationService.submitQuotation(payload, seller1);
        assertEquals(reqItemCement.getId(), q.getItems().get(0).getMaterialRequestItem().getId());
    }

    // 4. QuotationItem links correct Material
    @Test
    public void test04_QuotationItemLinksCorrectMaterial() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 50.0, "unitPrice", 400.0)
        ));

        Quotation q = quotationService.submitQuotation(payload, seller1);
        assertEquals(catalogMatCementSeller1.getId(), q.getItems().get(0).getMaterial().getId());
        assertEquals(catalogMatCementSeller1.getMaterialName(), q.getItems().get(0).getMaterialName());
    }

    // 5. Seller can quote own Material
    @Test
    public void test05_SellerCanQuoteOwnMaterial() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 10.0, "unitPrice", 400.0)
        ));

        assertDoesNotThrow(() -> quotationService.submitQuotation(payload, seller1));
    }

    // 6. Seller cannot quote another seller's Material (HTTP 403 / SecurityException)
    @Test
    public void test06_SellerCannotQuoteAnotherSellersMaterial_ThrowsSecurityException() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        // seller1 attempts to quote catalogMatCementSeller2 (belongs to seller2)
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 403L, "quantity", 10.0, "unitPrice", 400.0)
        ));

        SecurityException ex = assertThrows(SecurityException.class, () -> quotationService.submitQuotation(payload, seller1));
        assertTrue(ex.getMessage().contains("does not belong to your catalog"));

        // Verify controller returns 403 FORBIDDEN
        ResponseEntity<?> resp = quotationController.submitQuotation(payload, authSeller1);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
    }

    // 7. Invalid Material ID rejected
    @Test
    public void test07_InvalidMaterialIdRejected() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 9999L, "quantity", 10.0, "unitPrice", 400.0)
        ));

        assertThrows(IllegalArgumentException.class, () -> quotationService.submitQuotation(payload, seller1));
    }

    // 8. Invalid MaterialRequestItem rejected (cross-request item rejected)
    @Test
    public void test08_InvalidMaterialRequestItemRejected() {
        MaterialRequest otherReq = new MaterialRequest();
        ReflectionTestUtils.setField(otherReq, "id", 600L);
        MaterialRequestItem crossReqItem = new MaterialRequestItem();
        ReflectionTestUtils.setField(crossReqItem, "id", 601L);
        crossReqItem.setMaterialRequest(otherReq);
        when(materialRequestItemRepository.findById(601L)).thenReturn(Optional.of(crossReqItem));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 601L, "materialId", 401L, "quantity", 10.0, "unitPrice", 400.0)
        ));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> quotationService.submitQuotation(payload, seller1));
        assertTrue(ex.getMessage().contains("does not belong to material request"));
    }

    // 9. Duplicate request-item mapping rejected
    @Test
    public void test09_DuplicateRequestItemMappingRejected() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 10.0, "unitPrice", 400.0),
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 20.0, "unitPrice", 400.0)
        ));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> quotationService.submitQuotation(payload, seller1));
        assertTrue(ex.getMessage().contains("Duplicate"));
    }

    // 10. Invalid quantity rejected (<= 0)
    @Test
    public void test10_InvalidQuantityRejected() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 0.0, "unitPrice", 400.0)
        ));

        assertThrows(IllegalArgumentException.class, () -> quotationService.submitQuotation(payload, seller1));
    }

    // 11. Invalid unit price rejected (< 0)
    @Test
    public void test11_InvalidUnitPriceRejected() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 10.0, "unitPrice", -50.0)
        ));

        assertThrows(IllegalArgumentException.class, () -> quotationService.submitQuotation(payload, seller1));
    }

    // 12. Backend calculates lineTotal authoritatively
    @Test
    public void test12_BackendCalculatesLineTotalAuthoritatively() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        // Frontend attempts to send spoofed lineTotal = 999999
        payload.put("items", List.of(
                Map.of(
                        "materialRequestItemId", 501L,
                        "materialId", 401L,
                        "quantity", 100.0,
                        "unitPrice", 420.0,
                        "lineTotal", 999999.0
                )
        ));

        Quotation q = quotationService.submitQuotation(payload, seller1);
        assertEquals(42000.0, q.getItems().get(0).getLineTotal());
    }

    // 13. Quotation + items rollback together (simulated by transactional exception)
    @Test
    public void test13_QuotationAndItemsRollbackTogether() {
        when(quotationRepository.save(any(Quotation.class))).thenThrow(new RuntimeException("Database error during save"));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 10.0, "unitPrice", 400.0)
        ));

        assertThrows(RuntimeException.class, () -> quotationService.submitQuotation(payload, seller1));
        verify(quotationItemRepository, never()).save(any());
    }

    // 14. Accepted quotation creates MaterialOrderItems
    @Test
    public void test14_AcceptedQuotationCreatesMaterialOrderItems() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);
        q.setQuotedAmount(42000.0);
        q.setMaterialCost(42000.0);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setMaterialName(catalogMatCementSeller1.getMaterialName());
        qi.setQuotedQuantity(100.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(42000.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertNotNull(order);
        assertEquals(1, order.getItems().size());
        MaterialOrderItem oi = order.getItems().get(0);
        assertEquals("UltraTech OPC Cement 53 Grade", oi.getMaterialName());
        assertEquals(100.0, oi.getQuantity());
        assertEquals(420.0, oi.getUnitPrice());
        assertEquals(42000.0, oi.getSubtotal());
    }

    // 15. One QuotationItem creates one MaterialOrderItem
    @Test
    public void test15_OneQuotationItemCreatesOneMaterialOrderItem() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setMaterialName("Single Item");
        qi.setQuotedQuantity(5.0);
        qi.setUnitPrice(100.0);
        qi.setLineTotal(500.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals(1, order.getItems().size());
    }

    // 16. Multiple QuotationItems create multiple MaterialOrderItems
    @Test
    public void test16_MultipleQuotationItemsCreateMultipleMaterialOrderItems() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi1 = new QuotationItem();
        qi1.setMaterial(catalogMatCementSeller1);
        qi1.setMaterialName("Cement");
        qi1.setQuotedQuantity(100.0);
        qi1.setUnitPrice(420.0);
        qi1.setLineTotal(42000.0);
        q.addItem(qi1);

        QuotationItem qi2 = new QuotationItem();
        qi2.setMaterial(catalogMatSteelSeller1);
        qi2.setMaterialName("Steel");
        qi2.setQuotedQuantity(500.0);
        qi2.setUnitPrice(72.0);
        qi2.setLineTotal(36000.0);
        q.addItem(qi2);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals(2, order.getItems().size());
        assertEquals("Cement", order.getItems().get(0).getMaterialName());
        assertEquals("Steel", order.getItems().get(1).getMaterialName());
    }

    // 17. MaterialOrderItem snapshots material name
    @Test
    public void test17_MaterialOrderItemSnapshotsMaterialName() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setMaterialName("UltraTech OPC Cement 53 Grade");
        qi.setQuotedQuantity(10.0);
        qi.setUnitPrice(400.0);
        qi.setLineTotal(4000.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals("UltraTech OPC Cement 53 Grade", order.getItems().get(0).getMaterialName());
    }

    // 18. MaterialOrderItem snapshots quantity
    @Test
    public void test18_MaterialOrderItemSnapshotsQuantity() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setQuotedQuantity(250.5);
        qi.setUnitPrice(400.0);
        qi.setLineTotal(100200.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals(250.5, order.getItems().get(0).getQuantity());
    }

    // 19. MaterialOrderItem snapshots unit
    @Test
    public void test19_MaterialOrderItemSnapshotsUnit() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setQuotedQuantity(10.0);
        qi.setQuotedUnit("Metric Ton");
        qi.setUnitPrice(5000.0);
        qi.setLineTotal(50000.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals("Metric Ton", order.getItems().get(0).getUnit());
    }

    // 20. MaterialOrderItem snapshots unit price
    @Test
    public void test20_MaterialOrderItemSnapshotsUnitPrice() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setQuotedQuantity(10.0);
        qi.setUnitPrice(425.50);
        qi.setLineTotal(4255.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals(425.50, order.getItems().get(0).getUnitPrice());
    }

    // 21. MaterialOrderItem snapshots subtotal
    @Test
    public void test21_MaterialOrderItemSnapshotsSubtotal() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setQuotedQuantity(10.0);
        qi.setUnitPrice(420.0);
        qi.setLineTotal(4200.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals(4200.0, order.getItems().get(0).getSubtotal());
    }

    // 22. MaterialOrderItem retains material ID
    @Test
    public void test22_MaterialOrderItemRetainsMaterialId() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setQuotedQuantity(10.0);
        qi.setUnitPrice(400.0);
        qi.setLineTotal(4000.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals(401L, order.getItems().get(0).getMaterial().getId());
    }

    // 23. Later catalog price changes do not change order item snapshot (immutability)
    @Test
    public void test23_LaterCatalogPriceChangesDoNotChangeOrderItemSnapshot() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        QuotationItem qi = new QuotationItem();
        qi.setMaterial(catalogMatCementSeller1);
        qi.setMaterialName(catalogMatCementSeller1.getMaterialName());
        qi.setQuotedQuantity(100.0);
        qi.setUnitPrice(420.0);
        qi.setLineTotal(42000.0);
        q.addItem(qi);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        MaterialOrderItem orderItem = order.getItems().get(0);
        assertEquals(420.0, orderItem.getUnitPrice());
        assertEquals(42000.0, orderItem.getSubtotal());

        // Seller later changes catalog price and name in their inventory
        catalogMatCementSeller1.setUnitPrice(999.0);
        catalogMatCementSeller1.setMaterialName("Super Luxury Cement");

        // The snapshot on MaterialOrderItem MUST NOT change
        assertEquals(420.0, orderItem.getUnitPrice());
        assertEquals(42000.0, orderItem.getSubtotal());
        assertEquals("UltraTech OPC Cement 53 Grade", orderItem.getMaterialName());
    }

    // 24. Order + items rollback together
    @Test
    public void test24_OrderAndItemsRollbackTogether() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        when(materialOrderRepository.save(any(MaterialOrder.class)))
                .thenThrow(new RuntimeException("Order save failure"));

        assertThrows(RuntimeException.class, () -> materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA));
        verify(materialOrderItemRepository, never()).save(any());
    }

    // 25. Buyer can access own order
    @Test
    public void test25_BuyerCanAccessOwnOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 2001L);
        order.setBuyer(customerA);
        order.setSeller(seller1);

        when(materialOrderRepository.findById(2001L)).thenReturn(Optional.of(order));

        ResponseEntity<?> resp = materialOrderController.getOrderById(2001L, authCustomerA);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
    }

    // 26. Seller can access own order
    @Test
    public void test26_SellerCanAccessOwnOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 2001L);
        order.setBuyer(customerA);
        order.setSeller(seller1);

        when(materialOrderRepository.findById(2001L)).thenReturn(Optional.of(order));

        ResponseEntity<?> resp = materialOrderController.getOrderById(2001L, authSeller1);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
    }

    // 27. Unrelated user cannot access order (403 Forbidden)
    @Test
    public void test27_UnrelatedUserCannotAccessOrder() {
        MaterialOrder order = new MaterialOrder();
        ReflectionTestUtils.setField(order, "id", 2001L);
        order.setBuyer(customerA);
        order.setSeller(seller1);

        when(materialOrderRepository.findById(2001L)).thenReturn(Optional.of(order));

        // CustomerB is unrelated to order
        ResponseEntity<?> resp = materialOrderController.getOrderById(2001L, authCustomerB);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
    }

    // 28. Unauthenticated access rejected (401 Unauthorized)
    @Test
    public void test28_UnauthenticatedAccessRejected() {
        ResponseEntity<?> resp = materialOrderController.getOrderById(2001L, null);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    // 29. CUSTOMER buyer role preserved
    @Test
    public void test29_CustomerBuyerRolePreserved() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertEquals("CUSTOMER", order.getBuyerRole());
    }

    // 30. CONTRACTOR buyer role preserved
    @Test
    public void test30_ContractorBuyerRolePreserved() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        materialReq.setBuyer(contractorBuyer);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, contractorBuyer);
        assertEquals("CONTRACTOR", order.getBuyerRole());
    }

    // 31. PROFESSIONAL buyer role correctly persisted (Phase 4B Audit Fix)
    @Test
    public void test31_ProfessionalBuyerRoleCorrectlyPersisted() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setProvider(seller1);
        materialReq.setBuyer(proBuyer);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, proBuyer);
        assertEquals("PROFESSIONAL", order.getBuyerRole());

        // Also verify MaterialRequestController creates PROFESSIONAL buyerRole
        Map<String, Object> reqPayload = new HashMap<>();
        reqPayload.put("items", List.of(Map.of(
                "category", "Tiles",
                "materialName", "Tile Adhesive",
                "quantity", 50.0,
                "unit", "Bags"
        )));
        reqPayload.put("deliveryAddress", "123 Architect Avenue");
        reqPayload.put("city", "Mumbai");
        reqPayload.put("state", "Maharashtra");
        reqPayload.put("pinCode", "400001");
        reqPayload.put("requestScope", "STATE");

        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> reqResp = materialRequestController.createMaterialRequest(reqPayload, authPro);
        assertEquals(HttpStatus.CREATED, reqResp.getStatusCode());
        ArgumentCaptor<MaterialRequest> captor = ArgumentCaptor.forClass(MaterialRequest.class);
        verify(materialRequestRepository).save(captor.capture());
        assertEquals("PROFESSIONAL", captor.getValue().getBuyerRole());
    }

    // 32. Direct Buy does not create QuotationItem
    @Test
    public void test32_DirectBuyDoesNotCreateQuotationItem() {
        // Direct Buy requests are rejected by QuotationService
        Map<String, Object> payload = Map.of(
                "requestType", "DIRECT_BUY",
                "materialRequestId", 500L
        );
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> quotationService.submitQuotation(payload, seller1));
        assertTrue(ex.getMessage().contains("Direct Buy is a fixed-price catalog purchase"));
        verify(quotationItemRepository, never()).save(any());
    }

    // 33. Direct Buy does not create MaterialOrderItem
    @Test
    public void test33_DirectBuyDoesNotCreateMaterialOrderItem() {
        Quotation directBuyQuote = new Quotation();
        ReflectionTestUtils.setField(directBuyQuote, "id", 999L);
        directBuyQuote.setRequestType("DIRECT_BUY");
        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(directBuyQuote, materialReq, customerA);
        assertNull(order);
        verify(materialOrderItemRepository, never()).save(any());
    }

    // 34. Direct Hire does not create QuotationItem
    @Test
    public void test34_DirectHireDoesNotCreateQuotationItem() {
        ClientServiceRequest csr = new ClientServiceRequest();
        ReflectionTestUtils.setField(csr, "id", 700L);
        csr.setStatus("New");
        csr.setProfessional(proBuyer);
        csr.setClient(customerA);
        when(clientServiceRequestRepository.findById(700L)).thenReturn(Optional.of(csr));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "DIRECT_HIRE");
        payload.put("serviceRequestId", 700L);
        payload.put("quotedAmount", 25000.0);
        // Even if items were sent, no QuotationItem is created for DIRECT_HIRE
        payload.put("items", List.of(Map.of("materialId", 401L, "quantity", 10.0, "unitPrice", 400.0)));

        Quotation q = quotationService.submitQuotation(payload, proBuyer);
        assertTrue(q.getItems().isEmpty());
    }

    // 35. Project quotation does not create QuotationItem
    @Test
    public void test35_ProjectQuotationDoesNotCreateQuotationItem() {
        Map<String, Object> payload = Map.of(
                "requestType", "PROJECT",
                "materialRequestId", 500L
        );
        assertThrows(IllegalArgumentException.class, () -> quotationService.submitQuotation(payload, seller1));
        verify(quotationItemRepository, never()).save(any());
    }

    // 36. Existing quotation without items remains readable
    @Test
    public void test36_ExistingQuotationWithoutItemsRemainsReadable() {
        Quotation legacyQuote = new Quotation();
        ReflectionTestUtils.setField(legacyQuote, "id", 1001L);
        legacyQuote.setQuotationId("QT-1001");
        legacyQuote.setRequestType("MATERIAL_REQUIREMENT");
        legacyQuote.setQuotedAmount(50000.0);
        legacyQuote.setMaterialCost(45000.0);
        legacyQuote.setTransportationCost(5000.0);
        legacyQuote.setProvider(seller1);
        legacyQuote.setMaterialRequest(materialReq);

        Map<String, Object> map = quotationService.toResponseMap(legacyQuote);
        assertNotNull(map);
        assertEquals("QT-1001", map.get("quotationId"));
        assertNotNull(map.get("items"));
        assertTrue(((List<?>) map.get("items")).isEmpty());
    }

    // 37. Existing MaterialOrder without items remains readable
    @Test
    public void test37_ExistingMaterialOrderWithoutItemsRemainsReadable() {
        MaterialOrder legacyOrder = new MaterialOrder();
        ReflectionTestUtils.setField(legacyOrder, "id", 2001L);
        legacyOrder.setOrderCode("ORD-2026-00001");
        legacyOrder.setTotalAmount(50000.0);
        legacyOrder.setOrderStatus("CONFIRMED");

        Map<String, Object> map = materialOrderService.toResponseMap(legacyOrder);
        assertNotNull(map);
        assertEquals("ORD-2026-00001", map.get("orderCode"));
        assertNotNull(map.get("items"));
        assertTrue(((List<?>) map.get("items")).isEmpty());
    }

    // 38. Existing Phase 4A acceptance still works where applicable
    @Test
    public void test38_ExistingPhase4AAcceptanceStillWorks() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 1001L);
        q.setQuotationId("QT-1001");
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setStatus("SUBMITTED");
        q.setQuotedAmount(35000.0);
        q.setMaterialCost(30000.0);
        q.setTransportationCost(5000.0);
        q.setProvider(seller1);
        q.setMaterialRequest(materialReq);

        when(quotationRepository.findById(1001L)).thenReturn(Optional.of(q));
        when(materialRequestRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(materialReq));
        when(quotationRepository.findByMaterialRequestIdAndStatusIn(eq(500L), any())).thenReturn(List.of(q));

        ResponseEntity<?> response = quotationController.acceptQuotation("1001", authCustomerA);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertTrue((Boolean) body.get("success"));
        assertEquals("ACCEPTED", body.get("status"));
        assertNotNull(body.get("orderId"));
    }

    // 39. Strict Phase 4C constraint: Stock fields remain completely untouched
    @Test
    public void test39_NoInventorySideEffects_StockRemainsUnchanged() {
        Double initialCurrent = catalogMatCementSeller1.getCurrentStock();
        Double initialReserved = catalogMatCementSeller1.getReservedStock();
        Double initialAvailable = catalogMatCementSeller1.getAvailableStock();

        // 1. Submit structured quote
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestType", "MATERIAL_REQUIREMENT");
        payload.put("materialRequestId", 500L);
        payload.put("items", List.of(
                Map.of("materialRequestItemId", 501L, "materialId", 401L, "quantity", 100.0, "unitPrice", 420.0)
        ));

        Quotation q = quotationService.submitQuotation(payload, seller1);

        // Verify stock untouched after quote submission
        assertEquals(initialCurrent, catalogMatCementSeller1.getCurrentStock());
        assertEquals(initialReserved, catalogMatCementSeller1.getReservedStock());
        assertEquals(initialAvailable, catalogMatCementSeller1.getAvailableStock());

        // 2. Accept quotation and create MaterialOrder
        materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);

        // Verify stock untouched after quotation acceptance & order creation
        assertEquals(initialCurrent, catalogMatCementSeller1.getCurrentStock());
        assertEquals(initialReserved, catalogMatCementSeller1.getReservedStock());
        assertEquals(initialAvailable, catalogMatCementSeller1.getAvailableStock());
    }
}
