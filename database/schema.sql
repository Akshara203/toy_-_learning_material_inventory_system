-- Database creation
CREATE DATABASE IF NOT EXISTS `toy_inventory_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `toy_inventory_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `role` ENUM('Admin', 'Teacher', 'Store Manager') NOT NULL DEFAULT 'Teacher',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  INDEX `idx_categories_name` (`name`)
) ENGINE=InnoDB;

-- 3. Inventory Items Table
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `category_id` INT NOT NULL,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT,
  `quantity` INT NOT NULL DEFAULT 0,
  `min_required` INT NOT NULL DEFAULT 5,
  `location` VARCHAR(100),
  `supplier` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_items_sku` (`sku`),
  INDEX `idx_items_category` (`category_id`)
) ENGINE=InnoDB;

-- 4. Stock Movements Table
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `type` ENUM('In', 'Out') NOT NULL,
  `quantity` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_movements_item` (`item_id`),
  INDEX `idx_movements_user` (`user_id`),
  CONSTRAINT `chk_movement_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB;

-- 5. Damaged Items Table
CREATE TABLE IF NOT EXISTS `damaged_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `reported_by` INT NOT NULL,
  `notes` VARCHAR(255),
  `status` ENUM('Reported', 'Repaired', 'Discarded') NOT NULL DEFAULT 'Reported',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_damaged_item` (`item_id`),
  INDEX `idx_damaged_reporter` (`reported_by`),
  CONSTRAINT `chk_damaged_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB;

-- 6. Reorder Alerts Table
CREATE TABLE IF NOT EXISTS `reorder_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `status` ENUM('Active', 'Resolved') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_alerts_item` (`item_id`)
) ENGINE=InnoDB;

-- 7. Activity Logs Table
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_logs_user` (`user_id`)
) ENGINE=InnoDB;
