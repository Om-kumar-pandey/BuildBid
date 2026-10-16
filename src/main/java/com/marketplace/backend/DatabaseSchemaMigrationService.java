package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;

/**
 * BUILDBID - DIRECT BUY SCHEMA COMPATIBILITY MIGRATION SERVICE (Phase B)
 *
 * Inspects live relational database tables and safely migrates column definitions for Direct Buy
 * order compatibility when explicitly enabled by configuration:
 * 1. material_orders.quotation_id -> Allow NULL (Direct Buy orders originate from MaterialRequest, not Quotation)
 * 2. material_order_items.material_id -> Allow NULL (Direct Buy custom or unmatched items)
 *
 * Safety properties:
 * - Disabled by default: app.database.migration.auto-apply=false (never runs DDL in production unless explicitly enabled).
 * - Non-destructive: preserves all existing data, indexes, and relationships.
 * - Idempotent: checks DatabaseMetaData and information_schema before attempting DDL.
 * - Dialect-aware: supports both production MySQL and test/in-memory H2.
 * - Verified post-condition: confirms column nullability after execution.
 * - Clear diagnostics: logs explicit administrator instructions if DDL permissions fail.
 */
@Component
public class DatabaseSchemaMigrationService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaMigrationService.class);

    private final DataSource dataSource;
    private boolean autoApplyMigration;

    public enum MigrationStatus {
        ALREADY_COMPLIANT,
        MIGRATED,
        SKIPPED_DISABLED,
        SKIPPED_TABLES_NOT_FOUND,
        FAILED
    }

    public static class MigrationResult {
        private final MigrationStatus status;
        private final boolean quotationIdNullable;
        private final boolean materialIdNullable;
        private final String message;

        public MigrationResult(MigrationStatus status, boolean quotationIdNullable, boolean materialIdNullable, String message) {
            this.status = status;
            this.quotationIdNullable = quotationIdNullable;
            this.materialIdNullable = materialIdNullable;
            this.message = message;
        }

        public MigrationStatus getStatus() { return status; }
        public boolean isQuotationIdNullable() { return quotationIdNullable; }
        public boolean isMaterialIdNullable() { return materialIdNullable; }
        public String getMessage() { return message; }
    }

    @Autowired
    public DatabaseSchemaMigrationService(
            DataSource dataSource,
            @Value("${app.database.migration.auto-apply:${AUTO_MIGRATE_SCHEMA:false}}") boolean autoApplyMigration) {
        this.dataSource = dataSource;
        this.autoApplyMigration = autoApplyMigration;
    }

    public DatabaseSchemaMigrationService(DataSource dataSource) {
        this(dataSource, false);
    }

    public boolean isAutoApplyEnabled() {
        return autoApplyMigration;
    }

    public void setAutoApplyEnabled(boolean autoApplyMigration) {
        this.autoApplyMigration = autoApplyMigration;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!autoApplyMigration) {
            log.info("Direct Buy schema automatic migration is disabled by default (app.database.migration.auto-apply=false). Skipping startup DDL.");
            return;
        }
        log.info("Checking Direct Buy schema compatibility for material_orders and material_order_items...");
        try {
            MigrationResult result = checkAndApplyMigrations();
            log.info("Direct Buy schema compatibility check result: status={}, quotationIdNullable={}, materialIdNullable={}, message={}",
                    result.getStatus(), result.isQuotationIdNullable(), result.isMaterialIdNullable(), result.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during Direct Buy schema compatibility verification: {}", e.getMessage(), e);
        }
    }

    /**
     * Inspects column nullability and applies the necessary ALTER statements if needed.
     * Evaluates autoApplyMigration configuration before executing DDL.
     * Safe to invoke multiple times (idempotent).
     */
    public synchronized MigrationResult checkAndApplyMigrations() {
        return checkAndApplyMigrations(false);
    }

    /**
     * Inspects column nullability and applies the necessary ALTER statements if needed.
     * When force is false, respects the autoApplyMigration property.
     * When force is true, applies migration regardless of property (used by explicit administrator/test invocations).
     */
    public synchronized MigrationResult checkAndApplyMigrations(boolean force) {
        if (!force && !autoApplyMigration) {
            log.info("Direct Buy schema migration skipped: automatic migration is disabled by configuration (app.database.migration.auto-apply=false).");
            return new MigrationResult(
                    MigrationStatus.SKIPPED_DISABLED,
                    false,
                    false,
                    "Automatic schema migration is disabled by configuration (app.database.migration.auto-apply=false)."
            );
        }

        if (dataSource == null) {
            return new MigrationResult(MigrationStatus.FAILED, false, false, "DataSource is null");
        }

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            String dbProduct = metaData.getDatabaseProductName() != null ? metaData.getDatabaseProductName().toLowerCase() : "";

            boolean ordersTableExists = tableExists(conn, metaData, "material_orders");
            boolean itemsTableExists = tableExists(conn, metaData, "material_order_items");

            if (!ordersTableExists && !itemsTableExists) {
                return new MigrationResult(
                        MigrationStatus.SKIPPED_TABLES_NOT_FOUND,
                        true,
                        true,
                        "Neither material_orders nor material_order_items table exists yet; skipped migration."
                );
            }

            boolean quotationNullable = !ordersTableExists || isColumnNullable(conn, metaData, "material_orders", "quotation_id");
            boolean materialNullable = !itemsTableExists || isColumnNullable(conn, metaData, "material_order_items", "material_id");

            if (quotationNullable && materialNullable) {
                return new MigrationResult(
                        MigrationStatus.ALREADY_COMPLIANT,
                        true,
                        true,
                        "Schema is already compatible: material_orders.quotation_id and material_order_items.material_id permit NULL."
                );
            }

            log.info("Direct Buy schema requires modification: quotation_id nullable={}, material_id nullable={}. Applying DDL...",
                    quotationNullable, materialNullable);

            boolean isH2 = dbProduct.contains("h2");

            try (Statement stmt = conn.createStatement()) {
                if (!quotationNullable && ordersTableExists) {
                    if (isH2) {
                        executeH2AlterNullable(stmt, "material_orders", "quotation_id");
                    } else {
                        stmt.execute("ALTER TABLE material_orders MODIFY COLUMN quotation_id BIGINT NULL");
                    }
                    log.info("Executed ALTER TABLE material_orders to make quotation_id NULLABLE.");
                }

                if (!materialNullable && itemsTableExists) {
                    if (isH2) {
                        executeH2AlterNullable(stmt, "material_order_items", "material_id");
                    } else {
                        stmt.execute("ALTER TABLE material_order_items MODIFY COLUMN material_id BIGINT NULL");
                    }
                    log.info("Executed ALTER TABLE material_order_items to make material_id NULLABLE.");
                }
            } catch (SQLException ddlEx) {
                log.error("Direct Buy schema migration DDL failed [SQLState: {}, ErrorCode: {}]: {}. " +
                          "If the database user lacks ALTER privileges, run src/main/resources/schema-update.sql manually.",
                        ddlEx.getSQLState(), ddlEx.getErrorCode(), ddlEx.getMessage(), ddlEx);
                return new MigrationResult(MigrationStatus.FAILED, quotationNullable, materialNullable,
                        "DDL execution failed: " + ddlEx.getMessage());
            }

            // Post-migration verification
            boolean postQuotationNullable = !ordersTableExists || isColumnNullable(conn, metaData, "material_orders", "quotation_id");
            boolean postMaterialNullable = !itemsTableExists || isColumnNullable(conn, metaData, "material_order_items", "material_id");

            if (postQuotationNullable && postMaterialNullable) {
                return new MigrationResult(
                        MigrationStatus.MIGRATED,
                        true,
                        true,
                        "Successfully migrated material_orders.quotation_id and material_order_items.material_id to NULLABLE."
                );
            } else {
                return new MigrationResult(
                        MigrationStatus.FAILED,
                        postQuotationNullable,
                        postMaterialNullable,
                        "Post-migration check failed: columns are still NOT NULL after ALTER TABLE execution."
                );
            }

        } catch (SQLException e) {
            log.error("Direct Buy schema inspection/migration encountered database error: {}", e.getMessage(), e);
            return new MigrationResult(MigrationStatus.FAILED, false, false, "Database error: " + e.getMessage());
        }
    }

    private void executeH2AlterNullable(Statement stmt, String tableName, String columnName) throws SQLException {
        // H2 supports: ALTER TABLE <table> ALTER COLUMN <column> DROP NOT NULL; or SET NULL;
        try {
            stmt.execute("ALTER TABLE " + tableName + " ALTER COLUMN " + columnName + " DROP NOT NULL");
        } catch (SQLException e) {
            try {
                stmt.execute("ALTER TABLE " + tableName + " ALTER COLUMN " + columnName + " SET NULL");
            } catch (SQLException e2) {
                stmt.execute("ALTER TABLE " + tableName + " ALTER COLUMN " + columnName + " BIGINT NULL");
            }
        }
    }

    public boolean tableExists(Connection conn, DatabaseMetaData meta, String tableName) throws SQLException {
        String catalog = conn.getCatalog();
        try (ResultSet rs = meta.getTables(catalog, null, tableName, new String[]{"TABLE"})) {
            if (rs.next()) return true;
        }
        try (ResultSet rs = meta.getTables(catalog, null, tableName.toUpperCase(), new String[]{"TABLE"})) {
            if (rs.next()) return true;
        }
        try (ResultSet rs = meta.getTables(catalog, null, tableName.toLowerCase(), new String[]{"TABLE"})) {
            if (rs.next()) return true;
        }
        return false;
    }

    public boolean isColumnNullable(Connection conn, DatabaseMetaData meta, String tableName, String columnName) throws SQLException {
        String catalog = conn.getCatalog();

        // 1. Check via DatabaseMetaData.getColumns
        for (String tName : new String[]{tableName, tableName.toUpperCase(), tableName.toLowerCase()}) {
            for (String cName : new String[]{columnName, columnName.toUpperCase(), columnName.toLowerCase()}) {
                try (ResultSet rs = meta.getColumns(catalog, null, tName, cName)) {
                    if (rs.next()) {
                        int nullable = rs.getInt("NULLABLE");
                        if (nullable == DatabaseMetaData.columnNullable) {
                            return true;
                        } else if (nullable == DatabaseMetaData.columnNoNulls) {
                            return false;
                        }
                        String isNullableStr = rs.getString("IS_NULLABLE");
                        if ("YES".equalsIgnoreCase(isNullableStr)) {
                            return true;
                        } else if ("NO".equalsIgnoreCase(isNullableStr)) {
                            return false;
                        }
                    }
                }
            }
        }

        // 2. Fallback check via information_schema
        String dbProduct = meta.getDatabaseProductName() != null ? meta.getDatabaseProductName().toLowerCase() : "";
        String sql;
        if (dbProduct.contains("mysql")) {
            sql = "SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND LOWER(COLUMN_NAME) = LOWER(?)";
        } else {
            sql = "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE LOWER(TABLE_NAME) = LOWER(?) AND LOWER(COLUMN_NAME) = LOWER(?)";
        }

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, tableName);
            ps.setString(2, columnName);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String isNullable = rs.getString("IS_NULLABLE");
                    return "YES".equalsIgnoreCase(isNullable);
                }
            }
        } catch (SQLException ignored) {
            // If information_schema query fails, default to assuming nullable to avoid blocking startup
        }

        return true;
    }
}
