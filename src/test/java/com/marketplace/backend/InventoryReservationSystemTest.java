package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - PHASE 4D: INVENTORY RESERVATION & STOCK SAFETY TEST SUITE
 * 
 * Comprehensive automated test suite validating:
 * - Deterministic row-level pessimistic locking (deadlock prevention)
 * - Available-stock protection & multi-material atomicity
 * - Current stock immutability (currentStock is NEVER modified)
 * - Invariant enforcement (reservedStock <= currentStock, availableStock >= 0)
 * - Duplicate quotation acceptance idempotency
 * - Cross-seller security & ownership isolation
 * - Numeric validation (!NaN, !Infinity, qty > 0)
 * - Concurrency safety under contending demand
 * - Backward compatibility with legacy Phase 4A quotations
 * - Isolation from Direct Buy, Direct Hire, and Project bidding
 */
public class InventoryReservationSystemTest {

    private QuotationRepository quotationRepository;
    private MaterialRequestRepository materialRequestRepository;
    private ClientServiceRequestRepository clientServiceRequestRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private GeoLocationService geoLocationService;
    private MaterialOrderRepository materialOrderRepository;
    private MaterialOrderItemRepository materialOrderItemRepository;
    private QuotationItemRepository quotationItemRepository;
    private MaterialRepository materialRepository;
    private MaterialRequestItemRepository materialRequestItemRepository;

    private MaterialOrderService materialOrderService;
    private QuotationService quotationService;
    private QuotationController quotationController;

    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorBuyer;
    private MarketplaceBackendApplication.MarketplaceUser proBuyer;
    private MarketplaceBackendApplication.MarketplaceUser seller1;
    private MarketplaceBackendApplication.MarketplaceUser seller2;

    private Authentication authCustomerA;
    private Authentication authCustomerB;
    private Authentication authContractorBuyer;
    private Authentication authProBuyer;

    private MaterialRequest materialReq;
    private Material catalogMatCement;
    private Material catalogMatSteel;
    private Material catalogMatBricks;
    private Material catalogMatSeller2;

    @BeforeEach
    public void setup() {
        quotationRepository = mock(QuotationRepository.class);
        materialRequestRepository = mock(MaterialRequestRepository.class);
        clientServiceRequestRepository = mock(ClientServiceRequestRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        geoLocationService = new GeoLocationService();
        materialOrderRepository = mock(MaterialOrderRepository.class);
        materialOrderItemRepository = mock(MaterialOrderItemRepository.class);
        quotationItemRepository = mock(QuotationItemRepository.class);
        materialRepository = mock(MaterialRepository.class);
        materialRequestItemRepository = mock(MaterialRequestItemRepository.class);

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

        quotationController = new QuotationController(quotationService, userRepository);

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

        authContractorBuyer = mock(Authentication.class);
        when(authContractorBuyer.getName()).thenReturn("contractor@buildbid.com");
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractorBuyer));

        authProBuyer = mock(Authentication.class);
        when(authProBuyer.getName()).thenReturn("architect@buildbid.com");
        when(userRepository.findByEmail("architect@buildbid.com")).thenReturn(Optional.of(proBuyer));

        // 2. MaterialRequest setup
        materialReq = new MaterialRequest();
        ReflectionTestUtils.setField(materialReq, "id", 500L);
        materialReq.setRequestId("MR-500");
        materialReq.setBuyer(customerA);
        materialReq.setBuyerRole("CUSTOMER");
        materialReq.setRequestType("MATERIAL_REQUIREMENT");
        materialReq.setStatus("NEW");

        when(materialRequestRepository.findById(500L)).thenReturn(Optional.of(materialReq));
        when(materialRequestRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(materialReq));

        // 3. Catalog Materials setup (Seller 1)
        catalogMatCement = new Material();
        ReflectionTestUtils.setField(catalogMatCement, "id", 401L);
        catalogMatCement.setMaterialName("UltraTech OPC Cement 53 Grade");
        catalogMatCement.setUnit("Bags");
        catalogMatCement.setUnitPrice(420.0);
        catalogMatCement.setCurrentStock(1000.0);
        catalogMatCement.setReservedStock(100.0);
        catalogMatCement.setAvailableStock(900.0);
        catalogMatCement.setStockStatus("IN_STOCK");
        catalogMatCement.setSeller(seller1);

        catalogMatSteel = new Material();
        ReflectionTestUtils.setField(catalogMatSteel, "id", 402L);
        catalogMatSteel.setMaterialName("Tata Tiscon 500D TMT Rebars");
        catalogMatSteel.setUnit("KG");
        catalogMatSteel.setUnitPrice(72.0);
        catalogMatSteel.setCurrentStock(5000.0);
        catalogMatSteel.setReservedStock(500.0);
        catalogMatSteel.setAvailableStock(4500.0);
        catalogMatSteel.setStockStatus("IN_STOCK");
        catalogMatSteel.setSeller(seller1);

        catalogMatBricks = new Material();
        ReflectionTestUtils.setField(catalogMatBricks, "id", 403L);
        catalogMatBricks.setMaterialName("Red Clay Bricks Class A");
        catalogMatBricks.setUnit("Pieces");
        catalogMatBricks.setUnitPrice(9.5);
        catalogMatBricks.setCurrentStock(2000.0);
        catalogMatBricks.setReservedStock(200.0);
        catalogMatBricks.setAvailableStock(1800.0);
        catalogMatBricks.setStockStatus("IN_STOCK");
        catalogMatBricks.setSeller(seller1);

        // Catalog Material setup (Seller 2)
        catalogMatSeller2 = new Material();
        ReflectionTestUtils.setField(catalogMatSeller2, "id", 999L);
        catalogMatSeller2.setMaterialName("Rival Cement");
        catalogMatSeller2.setUnit("Bags");
        catalogMatSeller2.setUnitPrice(410.0);
        catalogMatSeller2.setCurrentStock(500.0);
        catalogMatSeller2.setReservedStock(0.0);
        catalogMatSeller2.setAvailableStock(500.0);
        catalogMatSeller2.setStockStatus("IN_STOCK");
        catalogMatSeller2.setSeller(seller2);

        // Default mock stubs for materials
        when(materialRepository.findById(401L)).thenReturn(Optional.of(catalogMatCement));
        when(materialRepository.findByIdForUpdate(401L)).thenReturn(Optional.of(catalogMatCement));
        when(materialRepository.findById(402L)).thenReturn(Optional.of(catalogMatSteel));
        when(materialRepository.findByIdForUpdate(402L)).thenReturn(Optional.of(catalogMatSteel));
        when(materialRepository.findById(403L)).thenReturn(Optional.of(catalogMatBricks));
        when(materialRepository.findByIdForUpdate(403L)).thenReturn(Optional.of(catalogMatBricks));
        when(materialRepository.findById(999L)).thenReturn(Optional.of(catalogMatSeller2));
        when(materialRepository.findByIdForUpdate(999L)).thenReturn(Optional.of(catalogMatSeller2));

        when(materialRepository.save(any(Material.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(materialRequestRepository.save(any(MaterialRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(i -> {
            MaterialOrder o = i.getArgument(0);
            if (o.getId() == null) {
                ReflectionTestUtils.setField(o, "id", 7001L);
            }
            return o;
        });
    }

    private Quotation createSampleQuotation(Long id, String code) {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", id);
        q.setQuotationId(code);
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setStatus("SUBMITTED");
        q.setProvider(seller1);
        q.setProviderRole("MATERIAL_SELLER");
        q.setMaterialRequest(materialReq);
        q.setMaterialCost(42000.0);
        q.setTransportationCost(1500.0);
        q.setTaxGst(7830.0);
        q.setQuotedAmount(51330.0);

        when(quotationRepository.findById(id)).thenReturn(Optional.of(q));
        when(quotationRepository.findByQuotationId(code)).thenReturn(Optional.of(q));
        return q;
    }

    // =========================================================================
    // SECTION 34 REQUIRED TESTS
    // =========================================================================

    // Test 1: Successful single-material reservation
    @Test
    public void test01_SuccessfulSingleMaterialReservation() {
        Quotation q = createSampleQuotation(101L, "QT-101");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setMaterialName(catalogMatCement.getMaterialName());
        qi.setQuotedQuantity(200.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(84000.0);
        q.addItem(qi);

        // Before state
        assertEquals(1000.0, catalogMatCement.getCurrentStock());
        assertEquals(100.0, catalogMatCement.getReservedStock());
        assertEquals(900.0, catalogMatCement.getAvailableStock());

        Map<String, Object> resp = quotationService.acceptQuotation("QT-101", customerA);

        assertEquals("ACCEPTED", resp.get("status"));
        assertEquals("ACCEPTED", q.getStatus());
        assertEquals("ACCEPTED", materialReq.getStatus());

        // After state: reservedStock + 200 = 300, availableStock = 700, currentStock unchanged at 1000
        assertEquals(1000.0, catalogMatCement.getCurrentStock());
        assertEquals(300.0, catalogMatCement.getReservedStock());
        assertEquals(700.0, catalogMatCement.getAvailableStock());
        verify(materialRepository, times(1)).save(catalogMatCement);
    }

    // Test 2: Successful multi-material reservation
    @Test
    public void test02_SuccessfulMultiMaterialReservation() {
        Quotation q = createSampleQuotation(102L, "QT-102");

        QuotationItem qi1 = new QuotationItem();
        qi1.setQuotation(q);
        qi1.setMaterial(catalogMatCement);
        qi1.setMaterialName(catalogMatCement.getMaterialName());
        qi1.setQuotedQuantity(200.0);
        qi1.setQuotedUnit("Bags");
        qi1.setUnitPrice(420.0);
        qi1.setLineTotal(84000.0);
        q.addItem(qi1);

        QuotationItem qi2 = new QuotationItem();
        qi2.setQuotation(q);
        qi2.setMaterial(catalogMatSteel);
        qi2.setMaterialName(catalogMatSteel.getMaterialName());
        qi2.setQuotedQuantity(500.0);
        qi2.setQuotedUnit("KG");
        qi2.setUnitPrice(72.0);
        qi2.setLineTotal(36000.0);
        q.addItem(qi2);

        quotationService.acceptQuotation("QT-102", customerA);

        // Cement: reserved 100 -> 300, available 900 -> 700, currentStock 1000
        assertEquals(1000.0, catalogMatCement.getCurrentStock());
        assertEquals(300.0, catalogMatCement.getReservedStock());
        assertEquals(700.0, catalogMatCement.getAvailableStock());

        // Steel: reserved 500 -> 1000, available 4500 -> 4000, currentStock 5000
        assertEquals(5000.0, catalogMatSteel.getCurrentStock());
        assertEquals(1000.0, catalogMatSteel.getReservedStock());
        assertEquals(4000.0, catalogMatSteel.getAvailableStock());
    }

    // Test 3: Current stock remains unchanged
    @Test
    public void test03_CurrentStockRemainsUnchanged() {
        Quotation q = createSampleQuotation(103L, "QT-103");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(150.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(63000.0);
        q.addItem(qi);

        Double stockBefore = catalogMatCement.getCurrentStock();
        quotationService.acceptQuotation("QT-103", customerA);
        Double stockAfter = catalogMatCement.getCurrentStock();

        assertEquals(stockBefore, stockAfter, "Current stock must NEVER change during inventory reservation");
    }

    // Test 4: Available stock decreases correctly
    @Test
    public void test04_AvailableStockDecreasesCorrectly() {
        Quotation q = createSampleQuotation(104L, "QT-104");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(300.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(126000.0);
        q.addItem(qi);

        Double initialAvailable = catalogMatCement.getAvailableStock(); // 900.0
        quotationService.acceptQuotation("QT-104", customerA);

        assertEquals(initialAvailable - 300.0, catalogMatCement.getAvailableStock());
        assertEquals(catalogMatCement.getCurrentStock() - catalogMatCement.getReservedStock(), catalogMatCement.getAvailableStock());
    }

    // Test 5: Insufficient stock returns conflict (409 CONFLICT)
    @Test
    public void test05_InsufficientStockReturnsConflict() {
        Quotation q = createSampleQuotation(105L, "QT-105");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setMaterialName(catalogMatCement.getMaterialName());
        qi.setQuotedQuantity(950.0); // Available is only 900.0!
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(399000.0);
        q.addItem(qi);

        ResponseEntity<?> response = quotationController.acceptQuotation("QT-105", authCustomerA);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue(body.get("error").toString().contains("Insufficient stock for material"));
        assertTrue(body.get("error").toString().contains("Requested: 950 Bags"));
        assertTrue(body.get("error").toString().contains("Available: 900 Bags"));
    }

    // Test 6: Insufficient stock causes zero reservation
    @Test
    public void test06_InsufficientStockCausesZeroReservation() {
        Quotation q = createSampleQuotation(106L, "QT-106");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(9999.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(4199580.0);
        q.addItem(qi);

        assertThrows(IllegalStateException.class, () -> quotationService.acceptQuotation("QT-106", customerA));

        // Invariants: Zero reservation committed
        assertEquals(100.0, catalogMatCement.getReservedStock());
        assertEquals(900.0, catalogMatCement.getAvailableStock());
        assertEquals(1000.0, catalogMatCement.getCurrentStock());
        assertEquals("SUBMITTED", q.getStatus());
        assertEquals("NEW", materialReq.getStatus());
    }

    // Test 7: Multi-item failure rolls back earlier possible reservations
    @Test
    public void test07_MultiItemFailureRollsBackEarlierPossibleReservations() {
        Quotation q = createSampleQuotation(107L, "QT-107");

        // Item 1: Cement has sufficient stock (avail 900, req 200)
        QuotationItem qi1 = new QuotationItem();
        qi1.setQuotation(q);
        qi1.setMaterial(catalogMatCement);
        qi1.setQuotedQuantity(200.0);
        qi1.setQuotedUnit("Bags");
        qi1.setUnitPrice(420.0);
        qi1.setLineTotal(84000.0);
        q.addItem(qi1);

        // Item 2: Bricks has INSUFFICIENT stock (avail 1800, req 2500)
        QuotationItem qi2 = new QuotationItem();
        qi2.setQuotation(q);
        qi2.setMaterial(catalogMatBricks);
        qi2.setQuotedQuantity(2500.0);
        qi2.setQuotedUnit("Pieces");
        qi2.setUnitPrice(9.5);
        qi2.setLineTotal(23750.0);
        q.addItem(qi2);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                quotationService.acceptQuotation("QT-107", customerA)
        );
        assertTrue(ex.getMessage().contains("Insufficient stock for material: Red Clay Bricks"));

        // Cement must NOT have been reserved!
        assertEquals(100.0, catalogMatCement.getReservedStock(), "Item 1 must not be partially reserved on multi-item failure");
        assertEquals(900.0, catalogMatCement.getAvailableStock());

        // Bricks must NOT have been reserved!
        assertEquals(200.0, catalogMatBricks.getReservedStock());
        assertEquals(1800.0, catalogMatBricks.getAvailableStock());

        // Lifecycle statuses must remain active/original
        assertEquals("SUBMITTED", q.getStatus());
        assertEquals("NEW", materialReq.getStatus());
        verify(materialOrderRepository, never()).save(any());
    }

    // Test 8: Duplicate acceptance does not reserve twice (Idempotency)
    @Test
    public void test08_DuplicateAcceptanceDoesNotReserveTwice() {
        Quotation q = createSampleQuotation(108L, "QT-108");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(100.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(42000.0);
        q.addItem(qi);

        // 1st acceptance succeeds
        quotationService.acceptQuotation("QT-108", customerA);
        assertEquals(200.0, catalogMatCement.getReservedStock());
        assertEquals(800.0, catalogMatCement.getAvailableStock());

        // 2nd acceptance attempt fails
        assertThrows(IllegalStateException.class, () ->
                quotationService.acceptQuotation("QT-108", customerA)
        );

        // Stock MUST NOT have been reserved twice
        assertEquals(200.0, catalogMatCement.getReservedStock(), "Reserved stock must NOT double on duplicate acceptance attempt");
        assertEquals(800.0, catalogMatCement.getAvailableStock());
    }

    // Test 9: Duplicate acceptance does not create duplicate order
    @Test
    public void test09_DuplicateAcceptanceDoesNotCreateDuplicateOrder() {
        Quotation q = createSampleQuotation(109L, "QT-109");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(50.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(21000.0);
        q.addItem(qi);

        // 1st acceptance
        quotationService.acceptQuotation("QT-109", customerA);
        verify(materialOrderRepository, times(1)).save(any(MaterialOrder.class));

        // 2nd acceptance attempt
        assertThrows(IllegalStateException.class, () ->
                quotationService.acceptQuotation("QT-109", customerA)
        );

        // Order save count remains 1
        verify(materialOrderRepository, times(1)).save(any(MaterialOrder.class));
    }

    // Test 10: Seller cannot reserve another seller's material (Cross-seller isolation)
    @Test
    public void test10_SellerCannotReserveAnotherSellersMaterial() {
        Quotation q = createSampleQuotation(110L, "QT-110");

        // Provider is seller1, but QuotationItem maliciously references Seller 2's catalog material
        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatSeller2);
        qi.setMaterialName(catalogMatSeller2.getMaterialName());
        qi.setQuotedQuantity(50.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(410.0);
        qi.setLineTotal(20500.0);
        q.addItem(qi);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                quotationService.acceptQuotation("QT-110", customerA)
        );
        assertTrue(ex.getMessage().contains("Unauthorized inventory reservation"));

        // Seller 2's material stock must be completely untouched
        assertEquals(0.0, catalogMatSeller2.getReservedStock());
        assertEquals(500.0, catalogMatSeller2.getAvailableStock());
    }

    // Test 11: Zero quantity rejected
    @Test
    public void test11_ZeroQuantityRejected() {
        Quotation q = createSampleQuotation(111L, "QT-111");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(0.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(0.0);
        q.addItem(qi);

        assertThrows(IllegalArgumentException.class, () ->
                quotationService.acceptQuotation("QT-111", customerA)
        );
        assertEquals(100.0, catalogMatCement.getReservedStock());
    }

    // Test 12: Negative quantity rejected
    @Test
    public void test12_NegativeQuantityRejected() {
        Quotation q = createSampleQuotation(112L, "QT-112");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(-50.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(-21000.0);
        q.addItem(qi);

        assertThrows(IllegalArgumentException.class, () ->
                quotationService.acceptQuotation("QT-112", customerA)
        );
        assertEquals(100.0, catalogMatCement.getReservedStock());
    }

    // Test 13: NaN / Infinity rejected
    @Test
    public void test13_NanOrInfinityQuantityRejected() {
        Quotation qNaN = createSampleQuotation(113L, "QT-113A");
        QuotationItem qiNaN = new QuotationItem();
        qiNaN.setQuotation(qNaN);
        qiNaN.setMaterial(catalogMatCement);
        qiNaN.setQuotedQuantity(Double.NaN);
        qiNaN.setQuotedUnit("Bags");
        qiNaN.setUnitPrice(420.0);
        qiNaN.setLineTotal(0.0);
        qNaN.addItem(qiNaN);

        assertThrows(IllegalArgumentException.class, () ->
                quotationService.acceptQuotation("QT-113A", customerA)
        );

        Quotation qInf = createSampleQuotation(114L, "QT-113B");
        QuotationItem qiInf = new QuotationItem();
        qiInf.setQuotation(qInf);
        qiInf.setMaterial(catalogMatCement);
        qiInf.setQuotedQuantity(Double.POSITIVE_INFINITY);
        qiInf.setQuotedUnit("Bags");
        qiInf.setUnitPrice(420.0);
        qiInf.setLineTotal(0.0);
        qInf.addItem(qiInf);

        assertThrows(IllegalArgumentException.class, () ->
                quotationService.acceptQuotation("QT-113B", customerA)
        );
        assertEquals(100.0, catalogMatCement.getReservedStock());
    }

    // Test 14: Reserved stock never exceeds current stock
    @Test
    public void test14_ReservedStockNeverExceedsCurrentStock() {
        Quotation q = createSampleQuotation(115L, "QT-114");

        // Requested 901 Bags (available is 900, currentStock is 1000, reserved is 100)
        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(901.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(378420.0);
        q.addItem(qi);

        assertThrows(IllegalStateException.class, () ->
                quotationService.acceptQuotation("QT-114", customerA)
        );
        assertTrue(catalogMatCement.getReservedStock() <= catalogMatCement.getCurrentStock(),
                "Reserved stock must never exceed current stock");
    }

    // Test 15: Available stock never becomes negative
    @Test
    public void test15_AvailableStockNeverBecomesNegative() {
        Quotation q = createSampleQuotation(116L, "QT-115");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(900.1);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(378042.0);
        q.addItem(qi);

        assertThrows(IllegalStateException.class, () ->
                quotationService.acceptQuotation("QT-115", customerA)
        );
        assertTrue(catalogMatCement.getAvailableStock() >= 0.0,
                "Available stock must never become negative");
    }

    // Test 16: Concurrent acceptance against limited stock (No Overselling)
    @Test
    public void test16_ConcurrentAcceptanceAgainstLimitedStock() throws Exception {
        // Material with currentStock = 100, reservedStock = 0, availableStock = 100
        Material limitedMat = new Material();
        ReflectionTestUtils.setField(limitedMat, "id", 777L);
        limitedMat.setMaterialName("Limited Edition Granite");
        limitedMat.setUnit("Slab");
        limitedMat.setUnitPrice(1500.0);
        limitedMat.setCurrentStock(100.0);
        limitedMat.setReservedStock(0.0);
        limitedMat.setAvailableStock(100.0);
        limitedMat.setStockStatus("IN_STOCK");
        limitedMat.setSeller(seller1);

        // Synchronized locking simulation for findByIdForUpdate
        ReentrantLock dbRowLock = new ReentrantLock();
        when(materialRepository.findByIdForUpdate(777L)).thenAnswer(inv -> {
            dbRowLock.lock();
            return Optional.of(limitedMat);
        });
        when(materialRepository.save(any(Material.class))).thenAnswer(inv -> {
            Material m = inv.getArgument(0);
            if (dbRowLock.isHeldByCurrentThread()) {
                dbRowLock.unlock();
            }
            return m;
        });

        // Request 1 for Customer A
        MaterialRequest req1 = new MaterialRequest();
        ReflectionTestUtils.setField(req1, "id", 601L);
        req1.setRequestId("MR-601");
        req1.setBuyer(customerA);
        req1.setRequestType("MATERIAL_REQUIREMENT");
        req1.setStatus("NEW");
        when(materialRequestRepository.findByIdForUpdate(601L)).thenReturn(Optional.of(req1));

        // Request 2 for Customer B
        MaterialRequest req2 = new MaterialRequest();
        ReflectionTestUtils.setField(req2, "id", 602L);
        req2.setRequestId("MR-602");
        req2.setBuyer(customerB);
        req2.setRequestType("MATERIAL_REQUIREMENT");
        req2.setStatus("NEW");
        when(materialRequestRepository.findByIdForUpdate(602L)).thenReturn(Optional.of(req2));

        // Quotation A requesting 80 units
        Quotation qA = new Quotation();
        ReflectionTestUtils.setField(qA, "id", 201L);
        qA.setQuotationId("QT-201");
        qA.setRequestType("MATERIAL_REQUIREMENT");
        qA.setStatus("SUBMITTED");
        qA.setProvider(seller1);
        qA.setMaterialRequest(req1);
        QuotationItem qiA = new QuotationItem();
        qiA.setQuotation(qA);
        qiA.setMaterial(limitedMat);
        qiA.setQuotedQuantity(80.0);
        qiA.setUnitPrice(1500.0);
        qiA.setLineTotal(120000.0);
        qA.addItem(qiA);
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(qA));
        when(quotationRepository.findByQuotationId("QT-201")).thenReturn(Optional.of(qA));

        // Quotation B requesting 80 units
        Quotation qB = new Quotation();
        ReflectionTestUtils.setField(qB, "id", 202L);
        qB.setQuotationId("QT-202");
        qB.setRequestType("MATERIAL_REQUIREMENT");
        qB.setStatus("SUBMITTED");
        qB.setProvider(seller1);
        qB.setMaterialRequest(req2);
        QuotationItem qiB = new QuotationItem();
        qiB.setQuotation(qB);
        qiB.setMaterial(limitedMat);
        qiB.setQuotedQuantity(80.0);
        qiB.setUnitPrice(1500.0);
        qiB.setLineTotal(120000.0);
        qB.addItem(qiB);
        when(quotationRepository.findById(202L)).thenReturn(Optional.of(qB));
        when(quotationRepository.findByQuotationId("QT-202")).thenReturn(Optional.of(qB));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        Future<?> f1 = executor.submit(() -> {
            try {
                startLatch.await();
                quotationService.acceptQuotation("QT-201", customerA);
                successCount.incrementAndGet();
            } catch (IllegalStateException e) {
                if (dbRowLock.isHeldByCurrentThread()) dbRowLock.unlock();
                conflictCount.incrementAndGet();
            } catch (Exception e) {
                if (dbRowLock.isHeldByCurrentThread()) dbRowLock.unlock();
            }
        });

        Future<?> f2 = executor.submit(() -> {
            try {
                startLatch.await();
                quotationService.acceptQuotation("QT-202", customerB);
                successCount.incrementAndGet();
            } catch (IllegalStateException e) {
                if (dbRowLock.isHeldByCurrentThread()) dbRowLock.unlock();
                conflictCount.incrementAndGet();
            } catch (Exception e) {
                if (dbRowLock.isHeldByCurrentThread()) dbRowLock.unlock();
            }
        });

        startLatch.countDown();
        f1.get(5, TimeUnit.SECONDS);
        f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        // One acceptance succeeds, one fails with insufficient stock conflict
        assertEquals(1, successCount.get(), "Exactly one quotation acceptance must succeed");
        assertEquals(1, conflictCount.get(), "Exactly one quotation acceptance must fail with conflict");

        // INVARIANTS: NO OVERSELLING
        assertEquals(100.0, limitedMat.getCurrentStock(), "Current stock must remain 100");
        assertEquals(80.0, limitedMat.getReservedStock(), "Reserved stock must be exactly 80 (not 160)");
        assertEquals(20.0, limitedMat.getAvailableStock(), "Available stock must be exactly 20 (never negative)");
    }

    // Test 17: Direct Buy creates no inventory reservation
    @Test
    public void test17_DirectBuyCreatesNoInventoryReservation() {
        // Direct Buy flow uses DirectBuyService/DirectBuyController, not quotation acceptance
        // Verify QuotationService rejects DIRECT_BUY if ever passed
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 301L);
        q.setRequestType("DIRECT_BUY");
        when(quotationRepository.findById(301L)).thenReturn(Optional.of(q));

        assertThrows(Exception.class, () -> quotationService.acceptQuotation("301", customerA));
        // Verify materialRepository findByIdForUpdate is never called
        verify(materialRepository, never()).findByIdForUpdate(any());
    }

    // Test 18: Direct Hire creates no inventory reservation
    @Test
    public void test18_DirectHireCreatesNoInventoryReservation() {
        ClientServiceRequest csr = new ClientServiceRequest();
        ReflectionTestUtils.setField(csr, "id", 801L);
        csr.setClient(customerA);
        csr.setStatus("Pending");
        when(clientServiceRequestRepository.findById(801L)).thenReturn(Optional.of(csr));
        when(clientServiceRequestRepository.findByIdForUpdate(801L)).thenReturn(Optional.of(csr));

        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 302L);
        q.setQuotationId("QT-302");
        q.setRequestType("DIRECT_HIRE");
        q.setStatus("SUBMITTED");
        q.setServiceRequest(csr);
        when(quotationRepository.findById(302L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByQuotationId("QT-302")).thenReturn(Optional.of(q));

        Map<String, Object> resp = quotationService.acceptQuotation("QT-302", customerA);
        assertEquals("ACCEPTED", resp.get("status"));
        assertEquals("DIRECT_HIRE", resp.get("requestType"));

        // No material row is locked or saved
        verify(materialRepository, never()).findByIdForUpdate(any());
        verify(materialRepository, never()).save(any());
    }

    // Test 19: Project bidding creates no inventory reservation
    @Test
    public void test19_ProjectBiddingCreatesNoInventoryReservation() {
        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 303L);
        q.setQuotationId("QT-303");
        q.setRequestType("PROJECT_BID");
        when(quotationRepository.findById(303L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByQuotationId("QT-303")).thenReturn(Optional.of(q));

        assertThrows(Exception.class, () -> quotationService.acceptQuotation("QT-303", customerA));
        verify(materialRepository, never()).findByIdForUpdate(any());
    }

    // Test 20: Universal buyer roles still work (Contractor & Professional)
    @Test
    public void test20_UniversalBuyerRolesStillWork() {
        // Universal buyer acting as buyer with CUSTOMER purchasing capability
        contractorBuyer.getRoles().add(MarketplaceBackendApplication.Role.CUSTOMER);

        // MaterialRequest owned by Contractor
        MaterialRequest contractorReq = new MaterialRequest();
        ReflectionTestUtils.setField(contractorReq, "id", 550L);
        contractorReq.setRequestId("MR-550");
        contractorReq.setBuyer(contractorBuyer);
        contractorReq.setBuyerRole("CONTRACTOR");
        contractorReq.setRequestType("MATERIAL_REQUIREMENT");
        contractorReq.setStatus("NEW");

        when(materialRequestRepository.findById(550L)).thenReturn(Optional.of(contractorReq));
        when(materialRequestRepository.findByIdForUpdate(550L)).thenReturn(Optional.of(contractorReq));

        Quotation q = new Quotation();
        ReflectionTestUtils.setField(q, "id", 304L);
        q.setQuotationId("QT-304");
        q.setRequestType("MATERIAL_REQUIREMENT");
        q.setStatus("SUBMITTED");
        q.setProvider(seller1);
        q.setMaterialRequest(contractorReq);

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(50.0);
        qi.setUnitPrice(420.0);
        qi.setLineTotal(21000.0);
        q.addItem(qi);

        when(quotationRepository.findById(304L)).thenReturn(Optional.of(q));
        when(quotationRepository.findByQuotationId("QT-304")).thenReturn(Optional.of(q));

        // When contractor accepts as customer/buyer
        Map<String, Object> resp = quotationService.acceptQuotation("QT-304", contractorBuyer);
        assertEquals("ACCEPTED", resp.get("status"));
        assertEquals(150.0, catalogMatCement.getReservedStock());
        assertEquals(850.0, catalogMatCement.getAvailableStock());
    }

    // Test 21: MaterialOrderItem commercial snapshots remain unchanged
    @Test
    public void test21_MaterialOrderItemCommercialSnapshotsRemainUnchanged() {
        Quotation q = createSampleQuotation(121L, "QT-121");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setMaterialName(catalogMatCement.getMaterialName());
        qi.setQuotedQuantity(100.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(420.0);
        qi.setLineTotal(42000.0);
        q.addItem(qi);

        quotationService.acceptQuotation("QT-121", customerA);

        MaterialOrder createdOrder = materialOrderService.createOrderFromAcceptedQuotation(q, materialReq, customerA);
        assertNotNull(createdOrder);
        assertFalse(createdOrder.getItems().isEmpty());

        MaterialOrderItem itemSnapshot = createdOrder.getItems().get(0);
        assertEquals("UltraTech OPC Cement 53 Grade", itemSnapshot.getMaterialName());
        assertEquals(100.0, itemSnapshot.getQuantity());
        assertEquals("Bags", itemSnapshot.getUnit());
        assertEquals(420.0, itemSnapshot.getUnitPrice());
        assertEquals(42000.0, itemSnapshot.getSubtotal());

        // Modifying catalog material post-acceptance must not alter commercial snapshot
        catalogMatCement.setMaterialName("Modified Name");
        catalogMatCement.setUnitPrice(999.0);

        assertEquals("UltraTech OPC Cement 53 Grade", itemSnapshot.getMaterialName());
        assertEquals(420.0, itemSnapshot.getUnitPrice());
    }

    // Test 22: Legacy aggregate-only quotation remains backward compatible
    @Test
    public void test22_LegacyAggregateOnlyQuotationRemainsBackwardCompatible() {
        // Legacy quotation created without any QuotationItems (Phase 4A style)
        Quotation legacyQ = createSampleQuotation(122L, "QT-122");
        // items is empty
        assertTrue(legacyQ.getItems().isEmpty());

        Double cementReservedBefore = catalogMatCement.getReservedStock();

        Map<String, Object> resp = quotationService.acceptQuotation("QT-122", customerA);
        assertEquals("ACCEPTED", resp.get("status"));
        assertEquals("ACCEPTED", legacyQ.getStatus());
        assertEquals("ACCEPTED", materialReq.getStatus());

        // Zero inventory reservation fabricated for legacy quotation
        assertEquals(cementReservedBefore, catalogMatCement.getReservedStock());
        verify(materialRepository, never()).findByIdForUpdate(any());
    }

    // Test 23: Duplicate material IDs within single quotation aggregates properly
    @Test
    public void test23_DuplicateMaterialIdsInSingleQuotationAggregatesProperly() {
        Quotation q = createSampleQuotation(123L, "QT-123");

        // Two items referencing the SAME material (Cement ID 401)
        QuotationItem qi1 = new QuotationItem();
        qi1.setQuotation(q);
        qi1.setMaterial(catalogMatCement);
        qi1.setQuotedQuantity(100.0);
        qi1.setUnitPrice(420.0);
        qi1.setLineTotal(42000.0);
        q.addItem(qi1);

        QuotationItem qi2 = new QuotationItem();
        qi2.setQuotation(q);
        qi2.setMaterial(catalogMatCement);
        qi2.setQuotedQuantity(150.0);
        qi2.setUnitPrice(420.0);
        qi2.setLineTotal(63000.0);
        q.addItem(qi2);

        // Before: reserved=100, available=900
        quotationService.acceptQuotation("QT-123", customerA);

        // After: total reservation is 100 + 150 = 250 -> reserved=350, available=650, currentStock=1000
        assertEquals(1000.0, catalogMatCement.getCurrentStock());
        assertEquals(350.0, catalogMatCement.getReservedStock(), "Must aggregate quantities for duplicate material references");
        assertEquals(650.0, catalogMatCement.getAvailableStock());
    }

    // Test 24: Deterministic lock order sorting prevents deadlock
    @Test
    public void test24_DeterministicLockOrderSortingPreventsDeadlock() {
        Quotation q = createSampleQuotation(124L, "QT-124");

        // Items added in non-sorted order: Material 403, Material 401, Material 402
        QuotationItem qi3 = new QuotationItem();
        qi3.setQuotation(q);
        qi3.setMaterial(catalogMatBricks); // 403
        qi3.setQuotedQuantity(100.0);
        qi3.setUnitPrice(9.5);
        qi3.setLineTotal(950.0);
        q.addItem(qi3);

        QuotationItem qi1 = new QuotationItem();
        qi1.setQuotation(q);
        qi1.setMaterial(catalogMatCement); // 401
        qi1.setQuotedQuantity(50.0);
        qi1.setUnitPrice(420.0);
        qi1.setLineTotal(21000.0);
        q.addItem(qi1);

        QuotationItem qi2 = new QuotationItem();
        qi2.setQuotation(q);
        qi2.setMaterial(catalogMatSteel); // 402
        qi2.setQuotedQuantity(100.0);
        qi2.setUnitPrice(72.0);
        qi2.setLineTotal(7200.0);
        q.addItem(qi2);

        quotationService.acceptQuotation("QT-124", customerA);

        // Verify deterministic ascending lock order: 401 -> 402 -> 403
        InOrder inOrder = inOrder(materialRepository);
        inOrder.verify(materialRepository).findByIdForUpdate(401L);
        inOrder.verify(materialRepository).findByIdForUpdate(402L);
        inOrder.verify(materialRepository).findByIdForUpdate(403L);
    }

    // Test 25: Release reservation restores inventory without altering currentStock
    @Test
    public void test25_ReleaseReservationRestoresInventoryWithoutAlteringCurrentStock() {
        Quotation q = createSampleQuotation(125L, "QT-125");

        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(catalogMatCement);
        qi.setQuotedQuantity(200.0);
        qi.setUnitPrice(420.0);
        qi.setLineTotal(84000.0);
        q.addItem(qi);

        // Reserve stock via acceptance
        quotationService.acceptQuotation("QT-125", customerA);
        assertEquals(300.0, catalogMatCement.getReservedStock());
        assertEquals(700.0, catalogMatCement.getAvailableStock());

        // Execute isolated reservation release primitive (Phase 4D)
        quotationService.releaseReservation(q);

        // Invariant: reservedStock restored to 100, availableStock restored to 900, currentStock unchanged at 1000
        assertEquals(1000.0, catalogMatCement.getCurrentStock());
        assertEquals(100.0, catalogMatCement.getReservedStock());
        assertEquals(900.0, catalogMatCement.getAvailableStock());
    }

    // Test 26: Disabled / Out of stock material rejected
    @Test
    public void test26_DisabledOrOutOfStockMaterialRejected() {
        // Material with availableStock = 0 and stockStatus = OUT_OF_STOCK
        Material outOfStockMat = new Material();
        ReflectionTestUtils.setField(outOfStockMat, "id", 444L);
        outOfStockMat.setMaterialName("White Marble Powder");
        outOfStockMat.setUnit("Bags");
        outOfStockMat.setUnitPrice(250.0);
        outOfStockMat.setCurrentStock(50.0);
        outOfStockMat.setReservedStock(50.0);
        outOfStockMat.setAvailableStock(0.0);
        outOfStockMat.setStockStatus("OUT_OF_STOCK");
        outOfStockMat.setSeller(seller1);

        when(materialRepository.findById(444L)).thenReturn(Optional.of(outOfStockMat));
        when(materialRepository.findByIdForUpdate(444L)).thenReturn(Optional.of(outOfStockMat));

        Quotation q = createSampleQuotation(126L, "QT-126");
        QuotationItem qi = new QuotationItem();
        qi.setQuotation(q);
        qi.setMaterial(outOfStockMat);
        qi.setMaterialName(outOfStockMat.getMaterialName());
        qi.setQuotedQuantity(10.0);
        qi.setQuotedUnit("Bags");
        qi.setUnitPrice(250.0);
        qi.setLineTotal(2500.0);
        q.addItem(qi);

        ResponseEntity<?> response = quotationController.acceptQuotation("QT-126", authCustomerA);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue(body.get("error").toString().contains("Insufficient stock for material"));
    }
}
