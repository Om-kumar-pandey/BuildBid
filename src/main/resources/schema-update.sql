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
-- ============================================================================

-- 1. Modify quotation_id column in material_orders to allow NULL values
ALTER TABLE material_orders MODIFY COLUMN quotation_id BIGINT NULL;

-- 2. Modify material_id column in material_order_items to allow NULL values
ALTER TABLE material_order_items MODIFY COLUMN material_id BIGINT NULL;
