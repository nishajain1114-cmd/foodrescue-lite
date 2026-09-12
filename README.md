# FoodRescue Lite 🥗

> **"FoodRescue Lite is a surplus food coordination platform that allows food providers to post safe, unused food and allows recipients or volunteers to claim and collect it before it expires."**

---

## 1. Problem Statement
Every day, institutional kitchens—such as college canteens, hostel messes, office cafeterias, and event organizers—prepare large quantities of safe, edible food. Often, unexpected surplus food remains at the end of meal services. Without a direct, quick coordination channel, this good food is discarded into landfills, generating methane and wasting valuable community resources.

## 2. Solution
**FoodRescue Lite** is a lightweight, responsive web application focused strictly on solving this core coordination problem. It gives food providers a clean way to post surplus food with quantities and pickup deadlines, and allows local volunteers or recipients to quickly claim and collect the food before it spoils or expires.

---

## 3. Technology Stack (Strictly Vanilla & Minimalist)

### Frontend
- **HTML5**: Semantic tags, accessible forms, structured modals.
- **CSS3**: Responsive flexbox and CSS grid, design tokens / CSS variables, touch-friendly components (min 44px tap targets), mobile drawer menu.
- **Vanilla JavaScript (ES6+)**: Pure JS fetch API, modular state management, zero frontend frameworks.
- *No React, Angular, Vue, Tailwind, or Bootstrap used.*

### Backend
- **Node.js & Express.js**: Clean REST API architecture with modular routers, controllers, and middleware.
- **bcryptjs**: Secure password hashing with 10 salt rounds.
- **jsonwebtoken (JWT)**: Stateless Bearer authentication.
- **cors & dotenv**: Secure origin handling and environment configurations.

### Database
- **MySQL Relational Database**: Structured schema, primary keys, foreign keys with cascade constraints, optimized indexes.
- **mysql2/promise**: Connection pooling with parameterized SQL queries preventing SQL injection.

---

## 4. Architecture

```
       +-------------------------------------------------------------+
       |             Responsive Vanilla Frontend (HTML/CSS/JS)       |
       |  Desktop (1200px) | Tablet (768-1024px) | Mobile (<640px)   |
       +-------------------------------------------------------------+
                                      │
                        REST APIs (JSON / Bearer Token)
                                      ▼
       +-------------------------------------------------------------+
       |                  Express.js Backend Server                  |
       |  Auth Middleware | Role Middleware | Central Error Handler  |
       |  Controllers: Auth, Foods, Claims, Provider, Admin          |
       +-------------------------------------------------------------+
                                      │
                        Parameterized SQL Queries (mysql2)
                                      ▼
       +-------------------------------------------------------------+
       |                    MySQL Relational Database                |
       |  Tables: users, food_posts, claims, pickup_records          |
       |  Indexes: email, provider_id, status, category, deadline   |
       +-------------------------------------------------------------+
```

---

## 5. User Roles & Capabilities

| Role | Description | Core Capabilities |
|---|---|---|
| **PROVIDER** | Canteens, hostels, cafeterias, restaurants | Register/Login, Post surplus food, Edit/Delete own posts, View incoming claims, Confirm pickup handover (mark as COLLECTED), Track provider statistics. |
| **RECIPIENT** | Volunteers, community coordinators, shelters | Register/Login, Browse available food, Search by name/location, Filter by category & vegetarian status, Claim available food, View claimed food status & pickup deadlines. |
| **ADMIN** | Platform moderator | View platform statistics & rescued portions, View all registered users, Review all food posts, Remove inappropriate or expired postings, View audit trail of claims. |

---

## 6. Food Status Lifecycle

```
  [ Provider Posts Food ]
             │
             ▼
        AVAILABLE  ──────(Deadline Passes & Unclaimed)──────►  EXPIRED
             │
   (Recipient Claims Food)
             │
             ▼
         CLAIMED   ──────(Deadline Passes & Uncollected)────►  EXPIRED
             │
  (Provider Confirms Handover)
             │
             ▼
        COLLECTED  (Rescued Food Count Increments!)
```

- **Dynamic Auto-Expiration**: Whenever listings are queried or claims are attempted, the backend automatically flags posts past `available_until` as `EXPIRED` without requiring complex background cron workers.
- **Double-Claim Protection**: Backend verifies that the food post is currently in `AVAILABLE` status inside an atomic database lock before confirming a claim. If another user attempts to claim the same post, the API returns `409 Conflict`.

---

## 7. Database Schema & Relationships

### 1. `users`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `full_name` VARCHAR(100) NOT NULL
- `email` VARCHAR(150) NOT NULL UNIQUE (Indexed)
- `password_hash` VARCHAR(255) NOT NULL
- `role` ENUM('PROVIDER', 'RECIPIENT', 'ADMIN') NOT NULL DEFAULT 'RECIPIENT' (Indexed)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 2. `food_posts`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `provider_id` INT NOT NULL, FK -> users(id) ON DELETE CASCADE (Indexed)
- `food_name` VARCHAR(150) NOT NULL
- `category` ENUM('Meals', 'Snacks', 'Bakery', 'Fruits', 'Vegetables', 'Beverages', 'Other') NOT NULL (Indexed)
- `description` TEXT
- `quantity` INT NOT NULL
- `unit` VARCHAR(50) NOT NULL DEFAULT 'portions'
- `is_vegetarian` BOOLEAN DEFAULT TRUE
- `preparation_time` DATETIME NULL
- `pickup_location` VARCHAR(255) NOT NULL
- `available_until` DATETIME NOT NULL (Indexed)
- `image_url` VARCHAR(500) NULL
- `status` ENUM('AVAILABLE', 'CLAIMED', 'COLLECTED', 'EXPIRED') DEFAULT 'AVAILABLE' (Indexed)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 3. `claims`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `food_post_id` INT NOT NULL, FK -> food_posts(id) ON DELETE CASCADE (Indexed)
- `recipient_id` INT NOT NULL, FK -> users(id) ON DELETE CASCADE (Indexed)
- `status` ENUM('CLAIMED', 'COLLECTED', 'EXPIRED') DEFAULT 'CLAIMED' (Indexed)
- `claimed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `collected_at` DATETIME NULL

### 4. `pickup_records`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `claim_id` INT NOT NULL, FK -> claims(id) ON DELETE CASCADE
- `provider_id` INT NOT NULL, FK -> users(id) ON DELETE CASCADE
- `recipient_id` INT NOT NULL, FK -> users(id) ON DELETE CASCADE
- `food_post_id` INT NOT NULL, FK -> food_posts(id) ON DELETE CASCADE
- `pickup_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

---

## 8. REST API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new Provider or Recipient |
| POST | `/api/auth/login` | Public | Authenticate user & issue JWT |
| POST | `/api/auth/logout` | Public | Client token clear |
| GET | `/api/auth/me` | Authenticated | Retrieve current user profile |

### Surplus Food
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/foods` | Public | Browse surplus food with search and filters |
| GET | `/api/foods/:id` | Public | Get single food post details |
| POST | `/api/foods` | Provider | Post new surplus food |
| PUT | `/api/foods/:id` | Provider (Owner) / Admin | Update available surplus food post |
| DELETE | `/api/foods/:id` | Provider (Owner) / Admin | Delete food post |

### Claims & Collection
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/foods/:id/claim` | Recipient | Claim available surplus food |
| GET | `/api/claims/my` | Recipient | List all claims made by authenticated recipient |
| GET | `/api/foods/:id/claim` | Provider / Recipient / Admin | View claim record for a food post |
| PATCH | `/api/claims/:id/collect` | Provider (Owner) / Admin | Confirm handover & mark food as COLLECTED |

### Provider Dashboard
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/provider/foods` | Provider | List all posts by this provider with claimant info |
| GET | `/api/provider/stats` | Provider | Get provider metrics (Active, Claimed, Collected, Expired, Rescued) |

### Admin Control
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | Admin | Get platform metrics & total rescued portions |
| GET | `/api/admin/users` | Admin | List all registered users with post/claim counts |
| GET | `/api/admin/foods` | Admin | List all platform food posts |
| GET | `/api/admin/claims` | Admin | List all claims |
| DELETE | `/api/admin/foods/:id` | Admin | Remove inappropriate or expired post |

---

## 9. Folder Structure

```
foodrescue-lite/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js     # User registration & login
│   │   ├── foodController.js     # Food posts CRUD & auto-expiry
│   │   ├── claimController.js    # Claiming & handover collection
│   │   ├── providerController.js # Provider metrics & listings
│   │   └── adminController.js    # Platform stats & moderation
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & role authorization
│   │   └── errorMiddleware.js    # Centralized JSON error handling
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth routes
│   │   ├── foodRoutes.js         # /api/foods routes
│   │   ├── claimRoutes.js        # /api/claims routes
│   │   ├── providerRoutes.js     # /api/provider routes
│   │   └── adminRoutes.js        # /api/admin routes
│   ├── scripts/
│   │   ├── setup-db.js           # Automated MySQL schema & seed runner
│   │   └── test-api.js           # Automated REST API test suite
│   ├── server.js                 # Express server entry point & static frontend
│   └── package.json
├── frontend/
│   ├── index.html                # Modern landing page
│   ├── login.html                # Login page with demo autofill buttons
│   ├── register.html             # Registration for Providers and Recipients
│   ├── foods.html                # "Find Surplus Food" discovery catalog
│   ├── food-details.html         # Food details view with safety disclaimer
│   ├── create-food.html          # Post surplus food form (and edit mode)
│   ├── provider-dashboard.html   # Provider stats, my food posts & handover actions
│   ├── recipient-dashboard.html  # Recipient "My Claims" dashboard
│   ├── admin-dashboard.html      # Minimal admin panel
│   ├── css/
│   │   └── style.css             # Nature-inspired responsive stylesheet
│   └── js/
│       ├── api.js                # Reusable fetch client with auth & toasts
│       ├── auth.js               # Auth state & responsive navbar
│       ├── foods.js              # Food discovery, filtering & claim modal
│       ├── provider.js           # Provider dashboard & food post form
│       ├── recipient.js          # Recipient claims rendering
│       └── admin.js              # Admin statistics & user list
├── database/
│   ├── schema.sql                # Table definitions, foreign keys, indexes
│   └── seed.sql                  # Realistic sample dataset
├── .env.example                  # Environment configuration template
├── .env                          # Local environment variables
├── .gitignore
└── README.md
```

---

## 10. Environment Configuration

Create a `.env` file in the project root:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=foodrescue
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=super_secret_jwt_key_for_foodrescue_lite_12345
JWT_EXPIRES_IN=7d
```

---

## 11. Local Setup & Running

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Set up MySQL Database & Seed Data
Ensure MySQL service is running on your machine (e.g., via XAMPP, WAMP, or MySQL Workbench).
Then run the automated database setup script:
```bash
npm run db:setup
```
*Alternatively, you can import `database/schema.sql` and `database/seed.sql` directly using the MySQL CLI or phpMyAdmin:*
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p foodrescue < database/seed.sql
```

### Step 3: Start the Application
```bash
npm start
```
Open **`http://localhost:3000`** in any web browser!

---

## 12. Seed Demo Accounts

All sample users are pre-configured with password: **`password123`**
You can also click the quick-fill buttons on the login page for instant sign-in:

- **Admin Account**: `admin@foodrescue.org`
- **Provider 1 (Cafe & Canteen)**: `provider@greenleaf.com`
- **Provider 2 (Hostel Mess)**: `mess@campushostel.edu`
- **Recipient 1 (Community Volunteer)**: `rahul@communitycare.org`
- **Recipient 2 (Shelter Coordinator)**: `sneha.volunteer@gmail.com`

---

## 13. Example Walkthrough / User Flow

1. **Provider Posts Surplus Food**:
   - Log in as `provider@greenleaf.com`.
   - Click **+ Post Surplus Food**.
   - Fill in: Food Name ("Vegetable Pulao"), Category ("Meals"), Quantity (25), Unit ("Meal Boxes"), Location ("Canteen Gate 2"), Deadline (set to a future hour).
   - Submit. Post becomes `AVAILABLE`.
2. **Recipient Discovers & Claims Food**:
   - Log in as `rahul@communitycare.org`.
   - Visit **Find Food** (`/foods.html`).
   - Filter by "Meals" and click **Claim Food**.
   - Confirmation modal opens. Click **Confirm Claim**.
   - Post status updates to `CLAIMED`.
3. **Provider Handover Confirmation**:
   - Provider visits **Provider Dashboard** (`/provider-dashboard.html`).
   - The post now lists Rahul Verma as the claimant.
   - Upon physical pickup, provider clicks **Mark as Collected**.
   - Both Food and Claim status update to `COLLECTED`.
   - The Rescued Meals statistic immediately increments!

---

## 14. Responsive Design & Accessibility

- **Mobile Viewports (<640px)**: Single-column food cards, stacked form inputs, full-width touch-friendly buttons (minimum 44px tap targets), hamburger menu navigation drawer.
- **Tablet Viewports (640px - 1024px)**: 2-column food grid, optimized search filters, scrollable responsive data tables.
- **Desktop (1024px+)**: Max 1200px centered container, 3-column value grid, multi-column statistics banner.
- **Accessibility**: Semantic HTML5 elements, clear focus outlines, high-contrast badges for statuses (`AVAILABLE` green, `CLAIMED` amber, `COLLECTED` blue, `EXPIRED` red).

---

## 15. Security Considerations

- **Password Protection**: Passwords are never stored in plaintext; hashed with `bcryptjs` with a work factor of 10.
- **SQL Injection Prevention**: All queries utilize parameterized placeholders (`?`) through `mysql2`.
- **Role-Based Authorization**: Endpoints verify user roles (`PROVIDER`, `RECIPIENT`, `ADMIN`) before executing operations.
- **Secret Isolation**: Database credentials and JWT signing secret are isolated in `.env`.
- **Sensitive Field Omission**: Password hashes are stripped before returning user data in API responses.

---

## 16. Future Scope (Non-MVP Enhancements)

- Real-time push notifications via WebSockets or Web Push API.
- Interactive map integration (Leaflet or OpenStreetMap) for visual pickup navigation.
- SMS / WhatsApp alerts for urgent impending deadlines.
- Multi-recipient partial quantity claims.
- Cloud image uploads (AWS S3 or Cloudinary).
- Native mobile applications (React Native or Flutter).

---

## 17. Deploying to Vercel 🚀

FoodRescue Lite is pre-configured for seamless serverless deployment on **Vercel**:

- **Serverless Entry**: `api/index.js` exports the Express app.
- **Routing Rules**: `vercel.json` routes `/api/*` to the serverless function and `/*` to static frontend files.
- **Root `package.json`**: Pre-configured so Vercel auto-installs dependencies on build.
- **Cloud Database Ready**: Supports `DB_SSL=true` for free cloud MySQL providers (e.g., TiDB Cloud, Aiven, Railway).

For a complete step-by-step tutorial on deploying to Vercel with a free cloud MySQL database, see **[VERCEL_DEPLOYMENT.md](file:///C:/Users/sales/.gemini/antigravity/scratch/foodrescue-lite/VERCEL_DEPLOYMENT.md)**.
