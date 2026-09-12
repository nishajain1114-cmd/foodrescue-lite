-- ==========================================================
-- FoodRescue Lite - Relational Database Schema
-- Database: MySQL
-- ==========================================================

CREATE DATABASE IF NOT EXISTS foodrescue;
USE foodrescue;

-- Drop in reverse dependency order for clean recreation
DROP TABLE IF EXISTS pickup_records;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS food_posts;
DROP TABLE IF EXISTS users;

-- 1. USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('PROVIDER', 'RECIPIENT', 'ADMIN') NOT NULL DEFAULT 'RECIPIENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. FOOD POSTS TABLE
CREATE TABLE food_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    food_name VARCHAR(150) NOT NULL,
    category ENUM('Meals', 'Snacks', 'Bakery', 'Fruits', 'Vegetables', 'Beverages', 'Other') NOT NULL,
    description TEXT,
    quantity INT NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'portions',
    is_vegetarian BOOLEAN DEFAULT TRUE,
    preparation_time DATETIME NULL,
    pickup_location VARCHAR(255) NOT NULL,
    available_until DATETIME NOT NULL,
    image_url VARCHAR(500) NULL,
    status ENUM('AVAILABLE', 'CLAIMED', 'COLLECTED', 'EXPIRED') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_food_posts_provider (provider_id),
    INDEX idx_food_posts_status (status),
    INDEX idx_food_posts_category (category),
    INDEX idx_food_posts_available_until (available_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CLAIMS TABLE
CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_post_id INT NOT NULL,
    recipient_id INT NOT NULL,
    status ENUM('CLAIMED', 'COLLECTED', 'EXPIRED') DEFAULT 'CLAIMED',
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    collected_at DATETIME NULL,
    FOREIGN KEY (food_post_id) REFERENCES food_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_claims_food_post (food_post_id),
    INDEX idx_claims_recipient (recipient_id),
    INDEX idx_claims_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PICKUP RECORDS TABLE
CREATE TABLE pickup_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    provider_id INT NOT NULL,
    recipient_id INT NOT NULL,
    food_post_id INT NOT NULL,
    pickup_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_post_id) REFERENCES food_posts(id) ON DELETE CASCADE,
    INDEX idx_pickup_provider (provider_id),
    INDEX idx_pickup_recipient (recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
