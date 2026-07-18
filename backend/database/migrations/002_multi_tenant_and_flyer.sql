-- ============================================================
-- Migration: multi-tenant super admin + custom flyer support
-- Run against an EXISTING qr_ordering database:
--   mysql -u root -p qr_ordering < backend/database/migrations/002_multi_tenant_and_flyer.sql
-- Safe to run once; re-running will error harmlessly on columns/tables
-- that already exist (MariaDB 10.0.2+ supports IF NOT EXISTS here).
-- ============================================================

CREATE TABLE IF NOT EXISTS super_admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS status ENUM('active','suspended') NOT NULL DEFAULT 'active' AFTER opening_hours,
  ADD COLUMN IF NOT EXISTS flyer_mode ENUM('default','custom') NOT NULL DEFAULT 'default' AFTER status,
  ADD COLUMN IF NOT EXISTS custom_flyer_url VARCHAR(500) DEFAULT NULL AFTER flyer_mode,
  ADD COLUMN IF NOT EXISTS custom_flyer_public_id VARCHAR(255) DEFAULT NULL AFTER custom_flyer_url;
