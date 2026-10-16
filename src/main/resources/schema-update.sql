-- ============================================================================
-- BUILDBID DIRECT BUY & MATERIAL ORDERS SCHEMA COMPATIBILITY MIGRATION
-- ============================================================================
-- Purpose:
-- Align live MySQL database schema with JPA entity definitions for Direct Buy:
-- 1. material_orders.quotation_id: Allow NULL (Direct Buy orders originate from
--    accepted MaterialRequest records, not Quotation records).
--    MySQL UNIQUE index permits multiple NULL values without conflict.
-- 2. material_order_items.material_id: Allow NULL (Direct Buy requirements can
--    specify custom materials or materials without exact catalog match).
--    Preserves foreign key integrity to materials(id) when not NULL.
--
-- Safety Guarantees:
-- - Non-destructive: No tables or columns are dropped. Existing data is preserved.
-- - Quotation Integrity: Existing quotation-based orders keep their quotation_id.
-- - Rollback Safe: Only alters column constraint from NOT NULL to NULL.
-- ============================================================================

-- Step 1: Pre-Migration Nullability Check
SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('material_orders', 'material_order_items')
  AND COLUMN_NAME IN ('quotation_id', 'material_id');

-- Step 2: Modify quotation_id column in material_orders to allow NULL values
ALTER TABLE material_orders MODIFY COLUMN quotation_id BIGINT NULL;

-- Step 3: Modify material_id column in material_order_items to allow NULL values
ALTER TABLE material_order_items MODIFY COLUMN material_id BIGINT NULL;

-- Step 4: Post-Migration Verification (Both MUST return IS_NULLABLE = 'YES')
SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('material_orders', 'material_order_items')
  AND COLUMN_NAME IN ('quotation_id', 'material_id');
