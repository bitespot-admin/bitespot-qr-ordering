-- ============================================================
-- Migration: per-restaurant Cloudinary credentials
-- Run against an EXISTING qr_ordering database:
--   mysql -u root -p qr_ordering < backend/database/migrations/003_per_restaurant_cloudinary.sql
--
-- IMPORTANT: after this migration, every restaurant needs its own
-- Cloudinary credentials set (via the super admin panel or Settings)
-- before it can upload menu images, logos, or generate QR flyers —
-- there is no shared fallback account anymore.
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS cloudinary_cloud_name VARCHAR(120) DEFAULT NULL AFTER custom_flyer_public_id,
  ADD COLUMN IF NOT EXISTS cloudinary_api_key VARCHAR(120) DEFAULT NULL AFTER cloudinary_cloud_name,
  ADD COLUMN IF NOT EXISTS cloudinary_api_secret_encrypted VARCHAR(500) DEFAULT NULL AFTER cloudinary_api_key;
