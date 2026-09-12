-- ==========================================================
-- FoodRescue Lite - Sample / Seed Data
-- Passwords for all sample users: password123
-- ==========================================================

USE foodrescue;

-- Disable foreign key checks for clean truncation
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE pickup_records;
TRUNCATE TABLE claims;
TRUNCATE TABLE food_posts;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS
-- 1 Admin, 2 Providers, 4 Recipients
INSERT INTO users (id, full_name, email, password_hash, role, created_at) VALUES
(1, 'System Administrator', 'admin@foodrescue.org', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', NOW()),
(2, 'Green Leaf Cafe & Canteen', 'provider@greenleaf.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'PROVIDER', NOW()),
(3, 'Campus North Hostel Mess', 'mess@campushostel.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'PROVIDER', NOW()),
(4, 'Rahul Verma (Community Volunteer)', 'rahul@communitycare.org', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'RECIPIENT', NOW()),
(5, 'Sneha Patel (Shelter Coordinator)', 'sneha.volunteer@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'RECIPIENT', NOW()),
(6, 'Amit Kumar (Student Welfare)', 'amit.k@shelteraid.org', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'RECIPIENT', NOW()),
(7, 'Ananya Sen (Local NGO Lead)', 'ananya@studenthelp.org', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'RECIPIENT', NOW());

-- 2. FOOD POSTS (10 posts across various categories and statuses)
INSERT INTO food_posts (id, provider_id, food_name, category, description, quantity, unit, is_vegetarian, preparation_time, pickup_location, available_until, image_url, status, created_at) VALUES
(1, 2, 'Vegetable Rice & Curry', 'Meals', 'Freshly prepared vegetable pulao with mild spices and mixed vegetable curry. Packaged in clean food-grade containers.', 20, 'Meal Boxes', TRUE, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'Green Leaf Cafe, Gate 3, Tech Park', DATE_ADD(NOW(), INTERVAL 6 HOUR), 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80', 'AVAILABLE', NOW()),

(2, 3, 'Fresh Bakery Breads & Buns', 'Bakery', 'Surplus bakery batch of whole-wheat sandwich loaves and dinner rolls baked this morning.', 15, 'Packs', TRUE, DATE_SUB(NOW(), INTERVAL 4 HOUR), 'Hostel 4 Ground Floor Pantry', DATE_ADD(NOW(), INTERVAL 8 HOUR), 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80', 'AVAILABLE', NOW()),

(3, 2, 'Seasonal Fresh Fruit Crates', 'Fruits', 'Assorted apples, bananas, and oranges surplus from breakfast buffet. Clean and sorted.', 10, 'Crates (5kg each)', TRUE, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'Green Leaf Kitchen Dispatch', DATE_ADD(NOW(), INTERVAL 12 HOUR), 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80', 'AVAILABLE', NOW()),

(4, 3, 'Steamed Idli & Sambar', 'Meals', 'Hot soft idlis with lentil sambar and roasted coconut chutney.', 30, 'Portions (4 idlis + sambar)', TRUE, DATE_SUB(NOW(), INTERVAL 1 HOUR), 'Central Campus Dining Hall', DATE_ADD(NOW(), INTERVAL 4 HOUR), 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80', 'AVAILABLE', NOW()),

(5, 2, 'Assorted Vegetable Sandwiches', 'Snacks', 'Fresh coleslaw and grilled cucumber-tomato sandwiches wrapped in foil.', 25, 'Sandwich Packs', TRUE, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'Green Leaf Cafe - Front Counter', DATE_ADD(NOW(), INTERVAL 5 HOUR), 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80', 'AVAILABLE', NOW()),

(6, 2, 'Fresh Mango & Mint Smoothies', 'Beverages', 'Refreshing dairy-free chilled mango smoothies in sealed takeaway bottles.', 18, 'Bottles (300ml)', TRUE, DATE_SUB(NOW(), INTERVAL 1 HOUR), 'Green Leaf Juice Counter', DATE_ADD(NOW(), INTERVAL 7 HOUR), 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&auto=format&fit=crop&q=80', 'AVAILABLE', NOW()),

(7, 3, 'Packed Chicken Lunch Boxes', 'Meals', 'Steamed rice, chicken curry, and sautéed beans. Kept warm in catering warmers.', 12, 'Lunch Boxes', FALSE, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'North Mess Food Counter 2', DATE_ADD(NOW(), INTERVAL 3 HOUR), 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80', 'AVAILABLE', NOW()),

(8, 2, 'Fragrant Vegetable Biryani', 'Meals', 'Aromatic basmati rice with paneer and vegetables. Claimed by Rahul Verma for evening shelter distribution.', 20, 'Meal Boxes', TRUE, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'Green Leaf Cafe, Gate 3, Tech Park', DATE_ADD(NOW(), INTERVAL 4 HOUR), 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80', 'CLAIMED', NOW()),

(9, 3, 'Assorted Evening Tea Cakes', 'Bakery', 'Vanilla and fruit sponge cakes leftover from alumni afternoon reception. Collected by Sneha Patel.', 14, 'Boxes', TRUE, DATE_SUB(NOW(), INTERVAL 26 HOUR), 'Hostel 4 Ground Floor Pantry', DATE_SUB(NOW(), INTERVAL 20 HOUR), 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80', 'COLLECTED', DATE_SUB(NOW(), INTERVAL 1 DAY)),

(10, 3, 'Crispy Vegetable Samosas', 'Snacks', 'Surplus from previous evening event. Reached expiration before claim.', 40, 'Pieces', TRUE, DATE_SUB(NOW(), INTERVAL 30 HOUR), 'Hostel Mess Side Gate', DATE_SUB(NOW(), INTERVAL 24 HOUR), 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80', 'EXPIRED', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- 3. CLAIMS
INSERT INTO claims (id, food_post_id, recipient_id, status, claimed_at, collected_at) VALUES
(1, 8, 4, 'CLAIMED', DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL),
(2, 9, 5, 'COLLECTED', DATE_SUB(NOW(), INTERVAL 22 HOUR), DATE_SUB(NOW(), INTERVAL 20 HOUR));

-- 4. PICKUP RECORDS
INSERT INTO pickup_records (id, claim_id, provider_id, recipient_id, food_post_id, pickup_time, created_at) VALUES
(1, 2, 3, 5, 9, DATE_SUB(NOW(), INTERVAL 20 HOUR), DATE_SUB(NOW(), INTERVAL 20 HOUR));
