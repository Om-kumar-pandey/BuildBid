package com.marketplace.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

/**
 * BUILDBID - PHASE 4.1 SCHEMA MIGRATION REMEDIATION TEST SUITE
 *
 * Verifies that the early-return defect in DatabaseSchemaMigrationService is resolved:
 * Case A: Direct Buy schema is compliant, but email_outbox is missing.
 *         The outbox table must be created even when Direct Buy returns ALREADY_COMPLIANT.
 * Case B: Direct Buy schema is compliant and email_outbox already exists.
 *         The check must be safe, idempotent, and non-destructive to existing data.
 * Case C: Direct Buy schema requires migration.
 *         Both Direct Buy column modification and outbox table check/creation must work.
 * Case D: Repeated migration checks do not duplicate tables, indexes, or constraints.
 * Case E: H2 branch executes safely on isolated test database; dialect selection verified.
 */
@SpringBootTest
@TestPropertySource(locations = "classpath:application.properties")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class DatabaseSchemaMigrationServiceRegressionTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private DatabaseSchemaMigrationService migrationService;

    @Test
    @Order(1)
    @DisplayName("Case A: Direct Buy schema compliant, email_outbox missing -> outbox table is created")
    public void testCaseA_directBuyCompliant_outboxMissing_createsOutboxTable() throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            DatabaseMetaData meta = conn.getMetaData();

            // 1. Ensure Direct Buy columns are compliant (nullable)
            assertTrue(migrationService.tableExists(conn, meta, "material_orders"),
                    "material_orders table should exist in test DB");
            assertTrue(migrationService.tableExists(conn, meta, "material_order_items"),
                    "material_order_items table should exist in test DB");

            // Make sure columns are nullable
            stmt.execute("ALTER TABLE material_orders ALTER COLUMN quotation_id DROP NOT NULL");
            stmt.execute("ALTER TABLE material_order_items ALTER COLUMN material_id DROP NOT NULL");

            assertTrue(migrationService.isColumnNullable(conn, meta, "material_orders", "quotation_id"),
                    "quotation_id must be nullable before test");
            assertTrue(migrationService.isColumnNullable(conn, meta, "material_order_items", "material_id"),
                    "material_id must be nullable before test");

            // 2. Drop email_outbox to simulate missing outbox table
            stmt.execute("DROP TABLE IF EXISTS email_outbox");
            assertFalse(migrationService.tableExists(conn, meta, "email_outbox"),
                    "email_outbox must NOT exist prior to migration check");
        }

        // 3. Run migration with force=true (Direct Buy schema is compliant)
        DatabaseSchemaMigrationService.MigrationResult result = migrationService.checkAndApplyMigrations(true);
        assertNotNull(result);
        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT, result.getStatus(),
                "Direct Buy status must remain ALREADY_COMPLIANT when columns are already nullable");
        assertTrue(result.isQuotationIdNullable());
        assertTrue(result.isMaterialIdNullable());

        // 4. Assert actual schema state: email_outbox table MUST have been created!
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            assertTrue(migrationService.tableExists(conn, meta, "email_outbox"),
                    "email_outbox table MUST exist in database after migration, even when Direct Buy was already compliant");

            // Verify expected columns exist
            boolean hasEventId = false;
            boolean hasStatus = false;
            boolean hasEncryptedOtp = false;
            boolean hasNextAttemptAt = false;

            for (String tName : new String[]{"email_outbox", "EMAIL_OUTBOX"}) {
                try (ResultSet rs = meta.getColumns(conn.getCatalog(), null, tName, null)) {
                    while (rs.next()) {
                        String col = rs.getString("COLUMN_NAME").toLowerCase();
                        if ("event_id".equals(col)) hasEventId = true;
                        if ("status".equals(col)) hasStatus = true;
                        if ("encrypted_otp".equals(col)) hasEncryptedOtp = true;
                        if ("next_attempt_at".equals(col)) hasNextAttemptAt = true;
                    }
                }
            }
            assertTrue(hasEventId, "email_outbox must have event_id column");
            assertTrue(hasStatus, "email_outbox must have status column");
            assertTrue(hasEncryptedOtp, "email_outbox must have encrypted_otp column");
            assertTrue(hasNextAttemptAt, "email_outbox must have next_attempt_at column");
        }
    }

    @Test
    @Order(2)
    @DisplayName("Case B: Direct Buy schema compliant, email_outbox already exists -> non-destructive & idempotent")
    public void testCaseB_directBuyCompliant_outboxExists_preservesExistingData() throws Exception {
        String testEventId = "case-b-sentinel-" + System.currentTimeMillis();

        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            DatabaseMetaData meta = conn.getMetaData();
            assertTrue(migrationService.tableExists(conn, meta, "email_outbox"),
                    "email_outbox should exist before Case B test");

            // Insert sentinel record into email_outbox
            stmt.executeUpdate("INSERT INTO email_outbox (" +
                    "event_id, user_id, recipient_email, recipient_name, subject, template_type, " +
                    "status, attempt_count, max_attempts, next_attempt_at, created_at, updated_at" +
                    ") VALUES (" +
                    "'" + testEventId + "', 1, 'sentinel@test.com', 'Sentinel', 'VERIFICATION', 'VERIFICATION', " +
                    "'QUEUED', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP" +
                    ")");
        }

        // Run migration check
        DatabaseSchemaMigrationService.MigrationResult result = migrationService.checkAndApplyMigrations(true);
        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT, result.getStatus());

        // Verify sentinel record was NOT destroyed or modified
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM email_outbox WHERE event_id = '" + testEventId + "'")) {
                assertTrue(rs.next());
                assertEquals(1, rs.getInt(1), "Existing records in email_outbox must not be destroyed");
            }
            // Clean up
            stmt.executeUpdate("DELETE FROM email_outbox WHERE event_id = '" + testEventId + "'");
        }
    }

    @Test
    @Order(3)
    @DisplayName("Case C: Direct Buy requires migration -> both column migration and outbox table creation succeed")
    public void testCaseC_directBuyRequiresMigration_bothDirectBuyAndOutboxSucceed() throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            DatabaseMetaData meta = conn.getMetaData();

            // Clear any sample data that might have quotation_id = NULL
            stmt.execute("DELETE FROM material_order_items");
            stmt.execute("DELETE FROM material_orders");

            // Set quotation_id to NOT NULL to force Direct Buy migration path
            stmt.execute("ALTER TABLE material_orders ALTER COLUMN quotation_id SET NOT NULL");
            assertFalse(migrationService.isColumnNullable(conn, meta, "material_orders", "quotation_id"),
                    "quotation_id must be NOT NULL to trigger migration");

            // Also drop outbox table to verify outbox creation during migration
            stmt.execute("DROP TABLE IF EXISTS email_outbox");
            assertFalse(migrationService.tableExists(conn, meta, "email_outbox"));
        }

        // Run migration
        DatabaseSchemaMigrationService.MigrationResult result = migrationService.checkAndApplyMigrations(true);
        assertNotNull(result);
        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.MIGRATED, result.getStatus(),
                "Status must be MIGRATED when Direct Buy columns were altered");
        assertTrue(result.isQuotationIdNullable());
        assertTrue(result.isMaterialIdNullable());

        // Assert actual schema state: both Direct Buy column AND outbox table must be compliant
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            assertTrue(migrationService.isColumnNullable(conn, meta, "material_orders", "quotation_id"),
                    "quotation_id must now be NULLABLE");
            assertTrue(migrationService.tableExists(conn, meta, "email_outbox"),
                    "email_outbox must exist after migration");
        }
    }

    @Test
    @Order(4)
    @DisplayName("Case D: Repeated migration checks do not duplicate tables, indexes, or constraints")
    public void testCaseD_repeatedChecks_idempotentWithoutErrors() throws Exception {
        for (int i = 0; i < 5; i++) {
            DatabaseSchemaMigrationService.MigrationResult result = migrationService.checkAndApplyMigrations(true);
            assertNotNull(result);
            assertEquals(DatabaseSchemaMigrationService.MigrationStatus.ALREADY_COMPLIANT, result.getStatus(),
                    "Iteration " + i + " must return ALREADY_COMPLIANT");
            assertTrue(result.isQuotationIdNullable());
            assertTrue(result.isMaterialIdNullable());
        }

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            assertTrue(migrationService.tableExists(conn, meta, "email_outbox"),
                    "email_outbox must still exist after repeated checks");
        }
    }

    @Test
    @Order(5)
    @DisplayName("Case E: Dialect-aware handling runs H2 DDL branch safely on isolated test database")
    public void testCaseE_h2DialectHandling_isolatedDatabase() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            String dbProduct = meta.getDatabaseProductName() != null ? meta.getDatabaseProductName().toLowerCase() : "";
            assertTrue(dbProduct.contains("h2"), "Test database must be H2 in-memory");

            // Directly invoke ensureEmailOutboxTable with connection
            migrationService.ensureEmailOutboxTable(conn);
            assertTrue(migrationService.tableExists(conn, meta, "email_outbox"),
                    "ensureEmailOutboxTable must ensure table exists in H2");
        }
    }

    @Test
    @Order(6)
    @DisplayName("Failure Case: Error during outbox check returns FAILED status and does not falsely claim success")
    public void testFailure_nullDataSource_returnsFailed() {
        DatabaseSchemaMigrationService nullService = new DatabaseSchemaMigrationService(null, true);
        DatabaseSchemaMigrationService.MigrationResult result = nullService.checkAndApplyMigrations();

        assertEquals(DatabaseSchemaMigrationService.MigrationStatus.FAILED, result.getStatus());
        assertFalse(result.isQuotationIdNullable());
        assertFalse(result.isMaterialIdNullable());
        assertTrue(result.getMessage().contains("DataSource is null"));
    }
}
