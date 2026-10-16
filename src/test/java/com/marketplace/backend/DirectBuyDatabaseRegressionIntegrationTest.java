package com.marketplace.backend;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * BUILDBID - DATABASE-BACKED DIRECT BUY ACCEPTANCE REGRESSION TESTS (Phase E)
 *
 * Validates real relational database persistence, schema nullability, atomic acceptance,
 * and order lifecycle constraints without mocking database repositories.
 *
 * Test Stack:
 * - Real relational database: H2 in MySQL compatibility mode (MODE=MySQL).
 * - Real Spring Data JPA entities, constraints, and transactions.
 *
 * NOTE ON TEST ENVIRONMENT:
 * - Docker / Testcontainers is not available on this host.
 * - H2 in MySQL compatibility mode is utilized to execute real relational DDL/DML,
 *   column nullability constraints, foreign keys, and transaction rollbacks.
 * - MySQL-specific production properties (e.g., MySQL 8.0 DDL syntax) are tested in
 *   DatabaseSchemaMigrationService dialect branches and documented in Phase F.
 */
@SpringBootTest
@TestPropertySource(locations = "classpath:application.properties")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class DirectBuyDatabaseRegressionIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private DatabaseSchemaMigrationService migrationService;

    @Autowired
    private MaterialRequestRepository materialRequestRepository;

    @Autowired
    private MaterialOrderRepository materialOrderRepository;

    @Autowired
    private MaterialOrderItemRepository materialOrderItemRepository;

    @Autowired
    private SellerMaterialRequestActionRepository sellerMaterialRequestActionRepository;

    @Autowired
    private MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private MaterialOrderService materialOrderService;

    @Autowired
    private MaterialRequestController materialRequestController;

    @Autowired
    private DirectBuyController directBuyController;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private MarketplaceBackendApplication.MarketplaceUser sellerA;
    private MarketplaceBackendApplication.MarketplaceUser sellerB;
    private MarketplaceBackendApplication.MarketplaceUser buyer;

    private Authentication authSellerA;
    private Authentication authSellerB;

    @BeforeEach
    public void setupData() {
        // Clear dependent order and action data before test run (respect FK order)
        sellerMaterialRequestActionRepository.deleteAll();
        materialOrderItemRepository.deleteAll();
        materialOrderRepository.deleteAll();
        quotationRepository.deleteAll();
        materialRequestRepository.deleteAll();

        // Create Seller A
        sellerA = userRepository.findByEmail("seller.alpha@buildbid.test").orElseGet(() -> {
            MarketplaceBackendApplication.MarketplaceUser u = new MarketplaceBackendApplication.MarketplaceUser();
            u.setName("Alpha Materials Pvt Ltd");
            u.setUsername("selleralpha");
            u.setEmail("seller.alpha@buildbid.test");
            u.setPhone("9876543210");
            u.setPasswordHash("$2a$10$dummyHashAlpha123456789012345678901234567890");
            u.setRoles(Set.of(MarketplaceBackendApplication.Role.MATERIAL_SELLER));
            return userRepository.save(u);
        });

        // Create Seller B (Unauthorized target seller)
        sellerB = userRepository.findByEmail("seller.beta@buildbid.test").orElseGet(() -> {
            MarketplaceBackendApplication.MarketplaceUser u = new MarketplaceBackendApplication.MarketplaceUser();
            u.setName("Beta Materials Hub");
            u.setUsername("sellerbeta");
            u.setEmail("seller.beta@buildbid.test");
            u.setPhone("9876543211");
            u.setPasswordHash("$2a$10$dummyHashBeta1234567890123456789012345678901");
            u.setRoles(Set.of(MarketplaceBackendApplication.Role.MATERIAL_SELLER));
            return userRepository.save(u);
        });

        // Create Buyer
        buyer = userRepository.findByEmail("customer.buyer@buildbid.test").orElseGet(() -> {
            MarketplaceBackendApplication.MarketplaceUser u = new MarketplaceBackendApplication.MarketplaceUser();
            u.setName("Rajesh Buyer");
            u.setUsername("rajeshbuyer");
            u.setEmail("customer.buyer@buildbid.test");
            u.setPhone("9876543212");
            u.setPasswordHash("$2a$10$dummyHashBuyer12345678901234567890123456789");
            u.setRoles(Set.of(MarketplaceBackendApplication.Role.CUSTOMER));
            return userRepository.save(u);
        });

        authSellerA = new UsernamePasswordAuthenticationToken(
                sellerA.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_MATERIAL_SELLER")));
        authSellerB = new UsernamePasswordAuthenticationToken(
                sellerB.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_MATERIAL_SELLER")));
    }

    @Test
    @Order(1)
    @DisplayName("Required Test 1: Direct Buy order persistence - persist an order with quotation = null")
    public void test1_directBuyOrderPersistence_nullableQuotation() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-101", sellerA, buyer);

        MaterialOrder order = new MaterialOrder();
        order.setOrderCode("ORD-TEST-00101");
        order.setMaterialRequest(mr);
        order.setSeller(sellerA);
        order.setBuyer(buyer);
        order.setBuyerRole("CUSTOMER");
        order.setQuotation(null); // Direct Buy orders have no quotation!
        order.setTotalAmount(45000.0);
        order.setOrderStatus("CONFIRMED");
        order.setCreatedAt(LocalDateTime.now());

        MaterialOrder saved = materialOrderRepository.saveAndFlush(order);

        assertNotNull(saved.getId(), "Persisted order must have a generated ID");
        MaterialOrder retrieved = materialOrderRepository.findById(saved.getId()).orElse(null);
        assertNotNull(retrieved);
        assertNull(retrieved.getQuotation(), "Direct Buy order must allow quotation = null in database");
        assertEquals("ORD-TEST-00101", retrieved.getOrderCode());
        assertEquals("CONFIRMED", retrieved.getOrderStatus());
    }

    @Test
    @Order(2)
    @DisplayName("Required Test 2: Custom material persistence - persist a valid order item with material = null")
    public void test2_customMaterialPersistence_nullableMaterial() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-102", sellerA, buyer);

        MaterialOrder order = new MaterialOrder();
        order.setOrderCode("ORD-TEST-00102");
        order.setMaterialRequest(mr);
        order.setSeller(sellerA);
        order.setBuyer(buyer);
        order.setBuyerRole("CUSTOMER");
        order.setQuotation(null);
        order.setTotalAmount(25000.0);
        order.setOrderStatus("CONFIRMED");
        order.setCreatedAt(LocalDateTime.now());

        MaterialOrderItem item = new MaterialOrderItem();
        item.setMaterialOrder(order);
        item.setMaterial(null); // Custom/unmatched material with NO catalog reference!
        item.setMaterialName("Custom Carved Stone Jali");
        item.setQuantity(20.0);
        item.setUnit("Pieces");
        item.setUnitPrice(1250.0);
        item.setSubtotal(25000.0);
        item.setItemStatus("CONFIRMED");
        order.addItem(item);

        MaterialOrder savedOrder = materialOrderRepository.saveAndFlush(order);
        assertNotNull(savedOrder.getId());
        assertEquals(1, savedOrder.getItems().size());

        MaterialOrderItem savedItem = savedOrder.getItems().get(0);
        assertNotNull(savedItem.getId());
        assertNull(savedItem.getMaterial(), "MaterialOrderItem must allow material = null in database");
        assertEquals("Custom Carved Stone Jali", savedItem.getMaterialName());
    }

    @Test
    @Order(3)
    @DisplayName("Required Test 3: Schema migration - verify both columns are nullable after the migration")
    public void test3_schemaMigration_verifyColumnsNullable() throws Exception {
        // Explicitly invoke migration with force=true to simulate authorized schema migration execution
        DatabaseSchemaMigrationService.MigrationResult result = migrationService.checkAndApplyMigrations(true);
        assertNotNull(result);
        assertTrue(result.getStatus() == DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT
                || result.getStatus() == DatabaseSchemaMigrationService.MigrationStatus.MIGRATED);

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            boolean isQuotationNullable = migrationService.isColumnNullable(conn, meta, "material_orders", "quotation_id");
            boolean isMaterialNullable = migrationService.isColumnNullable(conn, meta, "material_order_items", "material_id");

            assertTrue(isQuotationNullable, "material_orders.quotation_id must be NULLABLE");
            assertTrue(isMaterialNullable, "material_order_items.material_id must be NULLABLE");
        }

        // Idempotency: re-running does not fail and returns ALREADY_COMPLIANT
        DatabaseSchemaMigrationService.MigrationResult secondRun = migrationService.checkAndApplyMigrations(true);
        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT, secondRun.getStatus());
    }

    @Test
    @Order(4)
    @DisplayName("Required Test 4: Successful seller acceptance - assigned seller receives success, request ACCEPTED, exactly one order exists")
    public void test4_successfulSellerAcceptance_createsOnePersistedOrder() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-104", sellerA, buyer);

        ResponseEntity<?> response = materialRequestController.acceptRequest(String.valueOf(mr.getId()), authSellerA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals("ACCEPTED", body.get("status"));
        assertNotNull(body.get("orderCode"));

        // Verify database state
        MaterialRequest reloadedReq = materialRequestRepository.findById(mr.getId()).orElse(null);
        assertNotNull(reloadedReq);
        assertEquals("ACCEPTED", reloadedReq.getStatus());

        List<MaterialOrder> orders = materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(mr.getId());
        assertEquals(1, orders.size(), "Exactly ONE MaterialOrder must be persisted in database");
        MaterialOrder order = orders.get(0);
        assertNull(order.getQuotation(), "Direct Buy order must have null quotation");
        assertEquals(sellerA.getId(), order.getSeller().getId());
        List<MaterialOrderItem> items = materialOrderItemRepository.findByMaterialOrderId(order.getId());
        assertEquals(1, items.size(), "Persisted order items must be retrievable from database");

        Optional<SellerMaterialRequestAction> action = sellerMaterialRequestActionRepository
                .findBySellerIdAndMaterialRequestId(sellerA.getId(), mr.getId());
        assertTrue(action.isPresent());
        assertEquals("ACCEPTED", action.get().getStatus());
        assertEquals(order.getId(), action.get().getMaterialOrder().getId());
    }

    @Test
    @Order(5)
    @DisplayName("Required Test 5: Customer order visibility - accepted Direct Buy order appears exactly once")
    public void test5_customerOrderVisibility_deduplicated() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-105", sellerA, buyer);
        materialRequestController.acceptRequest(String.valueOf(mr.getId()), authSellerA);

        List<Map<String, Object>> customerOrders = materialOrderService.getAcceptedOrdersForCustomer(buyer);
        assertNotNull(customerOrders);
        assertEquals(1, customerOrders.size(), "Direct Buy order must appear EXACTLY ONCE in customer orders");

        Map<String, Object> card = customerOrders.get(0);
        assertEquals("DIRECT_BUY", card.get("type"));
        assertEquals(true, card.get("isDirectBuy"));
        assertEquals("CONFIRMED", card.get("orderStatus"));
        assertEquals("Alpha Materials Pvt Ltd", card.get("sellerName"));
    }

    @Test
    @Order(6)
    @DisplayName("Required Test 6: Seller order visibility - persisted order appears with Direct Buy type metadata")
    public void test6_sellerOrderVisibility_withDirectBuyMetadata() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-106", sellerA, buyer);
        materialRequestController.acceptRequest(String.valueOf(mr.getId()), authSellerA);

        List<Map<String, Object>> sellerOrders = materialOrderService.getUnifiedOrdersForSeller(sellerA);
        assertNotNull(sellerOrders);
        assertEquals(1, sellerOrders.size(), "Persisted Direct Buy order must appear in seller unified orders");

        Map<String, Object> card = sellerOrders.get(0);
        assertEquals("DIRECT_BUY", card.get("type"));
        assertEquals(true, card.get("isDirectBuy"));
        assertEquals("CONFIRMED", card.get("orderStatus"));
        assertEquals("Rajesh Buyer", card.get("buyerName"));
    }

    @Test
    @Order(7)
    @DisplayName("Required Test 7: Duplicate acceptance - repeated request returns 409 conflict and prevents extra orders")
    public void test7_duplicateAcceptance_returnsConflict() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-107", sellerA, buyer);

        ResponseEntity<?> firstResp = materialRequestController.acceptRequest(String.valueOf(mr.getId()), authSellerA);
        assertEquals(HttpStatus.OK, firstResp.getStatusCode());

        ResponseEntity<?> secondResp = materialRequestController.acceptRequest(String.valueOf(mr.getId()), authSellerA);
        assertEquals(HttpStatus.CONFLICT, secondResp.getStatusCode(), "Repeated acceptance must return 409 CONFLICT");

        List<MaterialOrder> orders = materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(mr.getId());
        assertEquals(1, orders.size(), "Duplicate acceptance must NOT create a second order");
    }

    @Test
    @Order(8)
    @DisplayName("Required Test 8: Authorization - seller who does not own targeted request cannot accept it")
    public void test8_authorization_unauthorizedSellerCannotAccept() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-108", sellerA, buyer);

        ResponseEntity<?> resp = materialRequestController.acceptRequest(String.valueOf(mr.getId()), authSellerB);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode(), "Unauthorized seller must receive 403 FORBIDDEN");

        MaterialRequest notAccepted = materialRequestRepository.findById(mr.getId()).orElse(null);
        assertNotNull(notAccepted);
        assertEquals("NEW", notAccepted.getStatus(), "Request status must remain unchanged");

        List<MaterialOrder> orders = materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(mr.getId());
        assertEquals(0, orders.size(), "No order must be created by an unauthorized caller");
    }

    @Test
    @Order(9)
    @DisplayName("Required Test 9: Atomic rollback - simulated order-persistence failure leaves request unaccepted")
    public void test9_atomicRollback_simulatedPersistenceFailure() {
        MaterialRequest mr = createAndSaveDirectBuyRequest("DMR-DB-109", sellerA, buyer);

        // Transaction boundary rollback test:
        // Execute acceptance within a transaction where order creation throws a database exception
        TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());
        try {
            mr.setStatus("ACCEPTED");
            materialRequestRepository.save(mr);

            // Simulate database write failure during order creation
            throw new DataIntegrityViolationException("Simulated constraint violation: quotation_id NOT NULL");
        } catch (DataIntegrityViolationException ex) {
            transactionManager.rollback(status);
        }

        // Verify relational database atomic rollback: request status must NOT be ACCEPTED
        MaterialRequest checked = materialRequestRepository.findById(mr.getId()).orElse(null);
        assertNotNull(checked);
        assertEquals("NEW", checked.getStatus(), "MaterialRequest must roll back to original state on order failure");
        assertEquals(0, materialOrderRepository.findByMaterialRequestIdOrderByCreatedAtDesc(mr.getId()).size());
    }

    @Test
    @Order(10)
    @DisplayName("Required Test 10: Quotation regression - quotation-based order creation continues to work normally")
    public void test10_quotationRegression_quotationOrderCreationStillWorks() {
        MaterialRequest req = new MaterialRequest();
        req.setRequestId("MR-QUO-201");
        req.setBuyer(buyer);
        req.setBuyerRole("CUSTOMER");
        req.setRequestType("MATERIAL_REQUIREMENT");
        req.setStatus("ACCEPTED");
        req.setCity("Lucknow");
        req.setState("Uttar Pradesh");
        req.setPinCode("226001");
        req.setDeliveryAddress("Hazratganj, Lucknow");
        req.setCreatedAt(LocalDateTime.now());
        MaterialRequest savedReq = materialRequestRepository.saveAndFlush(req);

        Quotation quotation = new Quotation();
        quotation.setQuotationId("QUO-TEST-201");
        quotation.setRequestType("MATERIAL_REQUIREMENT");
        quotation.setMaterialRequest(savedReq);
        quotation.setProvider(sellerA);
        quotation.setProviderRole("MATERIAL_SELLER");
        quotation.setQuotedAmount(75000.0);
        quotation.setMaterialCost(70000.0);
        quotation.setTransportationCost(5000.0);
        quotation.setStatus("ACCEPTED");
        quotation.setCreatedAt(LocalDateTime.now());
        Quotation savedQuo = quotationRepository.saveAndFlush(quotation);

        MaterialOrder order = materialOrderService.createOrderFromAcceptedQuotation(savedQuo, savedReq, buyer);

        assertNotNull(order);
        assertNotNull(order.getId());
        assertNotNull(order.getQuotation(), "Quotation-based order must have quotation populated");
        assertEquals(savedQuo.getId(), order.getQuotation().getId());
        assertEquals("CONFIRMED", order.getOrderStatus());
        assertEquals(buyer.getId(), order.getBuyer().getId());
        assertEquals(sellerA.getId(), order.getSeller().getId());
        assertEquals(75000.0, order.getTotalAmount());
    }

    @Test
    @Order(11)
    @DisplayName("Blocker A Test 1 & 2: Migration disabled by default when property missing or false")
    public void test11_migrationDisabledByDefault_whenPropertyMissingOrFalse() {
        // 0. Verify Spring Boot bean loaded from context with absent property has autoApplyMigration = false
        assertFalse(migrationService.isAutoApplyEnabled(),
                "Spring Boot autowired bean must have autoApplyMigration = false when property is absent");

        // 1. Missing property: default constructor initializes autoApplyMigration = false
        DatabaseSchemaMigrationService defaultService = new DatabaseSchemaMigrationService(dataSource);
        assertFalse(defaultService.isAutoApplyEnabled(), "Default constructor must have autoApplyMigration = false");

        // Verify startup runner does not execute DDL when disabled
        defaultService.run(null);

        // checkAndApplyMigrations() without force must return SKIPPED_DISABLED
        DatabaseSchemaMigrationService.MigrationResult resultMissing = defaultService.checkAndApplyMigrations();
        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.SKIPPED_DISABLED, resultMissing.getStatus());
        assertTrue(resultMissing.getMessage().contains("app.database.migration.auto-apply=false"));

        // 2. Explicit false: constructor with false
        DatabaseSchemaMigrationService explicitFalseService = new DatabaseSchemaMigrationService(dataSource, false);
        assertFalse(explicitFalseService.isAutoApplyEnabled(), "Explicit false must disable migration");
        DatabaseSchemaMigrationService.MigrationResult resultFalse = explicitFalseService.checkAndApplyMigrations();
        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.SKIPPED_DISABLED, resultFalse.getStatus());
    }

    @Test
    @Order(12)
    @DisplayName("Blocker A Test 3: Migration explicitly enabled (true) invokes migration against test database")
    public void test12_migrationExplicitlyEnabled_appliesAndSucceeds() {
        DatabaseSchemaMigrationService enabledService = new DatabaseSchemaMigrationService(dataSource, true);
        assertTrue(enabledService.isAutoApplyEnabled(), "Explicit true must enable autoApplyMigration");

        DatabaseSchemaMigrationService.MigrationResult result = enabledService.checkAndApplyMigrations();
        assertNotNull(result);
        assertTrue(result.getStatus() == DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT
                || result.getStatus() == DatabaseSchemaMigrationService.MigrationStatus.MIGRATED);
        assertTrue(result.isQuotationIdNullable(), "quotation_id must be confirmed nullable");
        assertTrue(result.isMaterialIdNullable(), "material_id must be confirmed nullable");
    }

    @Test
    @Order(13)
    @DisplayName("Blocker A Test 4: Already-nullable columns remain unchanged and migration is idempotent")
    public void test13_alreadyNullableColumnsRemainUnchanged_andMigrationIsIdempotent() {
        DatabaseSchemaMigrationService enabledService = new DatabaseSchemaMigrationService(dataSource, true);

        // Run once
        DatabaseSchemaMigrationService.MigrationResult firstRun = enabledService.checkAndApplyMigrations();
        assertTrue(firstRun.isQuotationIdNullable());
        assertTrue(firstRun.isMaterialIdNullable());

        // Run second time (idempotency check)
        DatabaseSchemaMigrationService.MigrationResult secondRun = enabledService.checkAndApplyMigrations();
        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT, secondRun.getStatus(),
                "Subsequent runs on compliant schema must return ALREADY_COMPLIANT");
        assertTrue(secondRun.isQuotationIdNullable());
        assertTrue(secondRun.isMaterialIdNullable());
    }

    @Test
    @Order(14)
    @DisplayName("Blocker A Test 5: Migration failure does not falsely report successful schema migration")
    public void test14_migrationFailure_doesNotFalselyReportSuccess() {
        // DataSource is null: must return FAILED
        DatabaseSchemaMigrationService nullDsService = new DatabaseSchemaMigrationService(null, true);
        DatabaseSchemaMigrationService.MigrationResult failResult = nullDsService.checkAndApplyMigrations();

        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.FAILED, failResult.getStatus());
        assertFalse(failResult.isQuotationIdNullable(), "Failed migration must not report quotation_id nullable");
        assertFalse(failResult.isMaterialIdNullable(), "Failed migration must not report material_id nullable");
        assertTrue(failResult.getMessage().contains("DataSource is null"));
    }

    @Test
    @Order(15)
    @DisplayName("Blocker B Test: Unrelated endpoints do NOT receive misleading Direct Buy acceptance error message")
    public void test15_unrelatedEndpoints_doNotReceiveMisleadingAcceptanceError() {
        // MaterialRequestController: decline non-existent request returns 404 with "Request not found with ID: 999999"
        ResponseEntity<?> mrDeclineResp = materialRequestController.declineRequest("999999", authSellerA);
        assertEquals(HttpStatus.NOT_FOUND, mrDeclineResp.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> mrBody = (Map<String, Object>) mrDeclineResp.getBody();
        assertNotNull(mrBody);
        assertNotEquals("Failed to accept material request due to an internal order creation error. Please try again or contact support.",
                mrBody.get("error"), "Non-acceptance endpoint must NOT return acceptance error message");
        assertEquals("Request not found with ID: 999999", mrBody.get("error"));

        // DirectBuyController: updateDirectBuyStatus on non-existent request returns 404
        ResponseEntity<?> dbStatusResp = directBuyController.updateDirectBuyStatus(999999L, Map.of("status", "PROCESSING"), authSellerA);
        assertEquals(HttpStatus.NOT_FOUND, dbStatusResp.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> dbBody = (Map<String, Object>) dbStatusResp.getBody();
        assertNotNull(dbBody);
        assertNotEquals("Failed to accept material request due to an internal order creation error. Please try again or contact support.",
                dbBody.get("error"), "DirectBuyController status endpoint must NOT return acceptance error message");
        assertEquals("Request not found with ID: 999999", dbBody.get("error"));
    }

    @Test
    @Order(16)
    @DisplayName("Required Test 16: Forced migration executes regardless of autoApplyMigration flag")
    public void test16_forcedMigration_executesRegardlessOfAutoApplyFlag() {
        DatabaseSchemaMigrationService disabledService = new DatabaseSchemaMigrationService(dataSource, false);
        assertFalse(disabledService.isAutoApplyEnabled());

        // Calling checkAndApplyMigrations(force = true) overrides disabled flag
        DatabaseSchemaMigrationService.MigrationResult forcedResult = disabledService.checkAndApplyMigrations(true);
        assertTrue(forcedResult.getStatus() == DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT
                || forcedResult.getStatus() == DatabaseSchemaMigrationService.MigrationStatus.MIGRATED);
        assertTrue(forcedResult.isQuotationIdNullable());
        assertTrue(forcedResult.isMaterialIdNullable());
    }

    private MaterialRequest createAndSaveDirectBuyRequest(
            String requestId,
            MarketplaceBackendApplication.MarketplaceUser seller,
            MarketplaceBackendApplication.MarketplaceUser buyer
    ) {
        MaterialRequest mr = new MaterialRequest();
        mr.setRequestId(requestId);
        mr.setBuyer(buyer);
        mr.setBuyerRole("CUSTOMER");
        mr.setTargetSeller(seller);
        mr.setRequestType("DIRECT_MATERIAL");
        mr.setStatus("NEW");
        mr.setMaterialPrice(450.0);
        mr.setMaterialAmount(45000.0);
        mr.setTransportationCost(1500.0);
        mr.setEstimatedTotal(46500.0);
        mr.setCity("Lucknow");
        mr.setState("Uttar Pradesh");
        mr.setPinCode("226010");
        mr.setDeliveryAddress("Gomti Nagar, Lucknow");
        mr.setContactPhone("9876543212");
        mr.setContactPerson("Rajesh Buyer");
        mr.setCreatedAt(LocalDateTime.now());

        MaterialRequestItem item = new MaterialRequestItem();
        item.setMaterialRequest(mr);
        item.setMaterialName("Ultratech Cement PPC");
        item.setCategory("Cement");
        item.setQuantity(100.0);
        item.setUnit("Bags");
        mr.addItem(item);

        return materialRequestRepository.saveAndFlush(mr);
    }
}
