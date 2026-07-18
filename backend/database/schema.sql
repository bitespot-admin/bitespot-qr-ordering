-- ============================================================
-- QR Table Ordering System — MariaDB Schema
-- ============================================================
-- Run with: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS qr_ordering CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qr_ordering;

-- ------------------------------------------------------------
-- users  (restaurant owner / admin accounts — one per restaurant)
-- ------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- restaurants  (profile data, one-to-one with users)
-- ------------------------------------------------------------
CREATE TABLE restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  logo_url VARCHAR(500) DEFAULT NULL,
  logo_public_id VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  opening_hours VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_restaurants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- tables  (physical restaurant tables, each with its own QR)
-- ------------------------------------------------------------
CREATE TABLE tables_ (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  label VARCHAR(50) NOT NULL,          -- e.g. "Table 1"
  slug VARCHAR(60) NOT NULL,           -- e.g. "table-1", unique per restaurant
  qr_code_url VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tables_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_table_per_restaurant (restaurant_id, slug)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- categories  (menu categories, e.g. Pizza, Burgers, Drinks)
-- ------------------------------------------------------------
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- menu_items
-- ------------------------------------------------------------
CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  category_id INT DEFAULT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL,        -- stored in Naira
  image_url VARCHAR(500) DEFAULT NULL,
  image_public_id VARCHAR(255) DEFAULT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  is_popular TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_menu_items_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  table_id INT NOT NULL,
  order_number VARCHAR(20) NOT NULL,
  status ENUM('new','preparing','ready','served','cancelled') NOT NULL DEFAULT 'new',
  special_instructions VARCHAR(500) DEFAULT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables_(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- order_items
-- ------------------------------------------------------------
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT DEFAULT NULL,
  item_name VARCHAR(120) NOT NULL,     -- snapshot, survives menu edits
  item_price DECIMAL(10,2) NOT NULL,   -- snapshot price at order time
  quantity INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- waiter_calls
-- ------------------------------------------------------------
CREATE TABLE waiter_calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  table_id INT NOT NULL,
  status ENUM('pending','acknowledged') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_waiter_calls_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  CONSTRAINT fk_waiter_calls_table FOREIGN KEY (table_id) REFERENCES tables_(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------
CREATE INDEX idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id, is_available);
CREATE INDEX idx_waiter_calls_status ON waiter_calls(restaurant_id, status);
