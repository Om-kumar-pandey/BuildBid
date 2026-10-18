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

-- ============================================================================
-- BUILDBID PROFESSIONAL ACCOUNT SETTINGS — PROFILE PHOTO PERSISTENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS professional_profile_photos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    photo_data LONGBLOB NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NULL,
    file_size BIGINT NOT NULL,
    width INT NULL,
    height INT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    CONSTRAINT fk_pro_photo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- BUILDBID PROFESSIONAL ACCOUNT SETTINGS — PERSONAL INFORMATION COLUMNS
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(150) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NULL;

-- ============================================================================
-- BUILDBID SECURE TRANSACTIONAL EMAIL OUTBOX (PHASE 4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_outbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    verification_id BIGINT NULL,
    recipient_email VARCHAR(150) NOT NULL,
    recipient_name VARCHAR(150) NULL,
    subject VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    encrypted_otp TEXT NULL,
    encryption_key_version INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    next_attempt_at DATETIME(6) NOT NULL,
    lease_owner VARCHAR(100) NULL,
    lease_expires_at DATETIME(6) NULL,
    last_error TEXT NULL,
    provider_message_id VARCHAR(150) NULL,
    payload_cleared_at DATETIME(6) NULL,
    sent_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_email_outbox_event_id UNIQUE (event_id),
    INDEX idx_email_outbox_poll (status, next_attempt_at, lease_expires_at),
    INDEX idx_email_outbox_user_status (user_id, status),
    INDEX idx_email_outbox_recipient (recipient_email),
    CONSTRAINT fk_email_outbox_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_email_outbox_verif FOREIGN KEY (verification_id) REFERENCES user_verifications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

