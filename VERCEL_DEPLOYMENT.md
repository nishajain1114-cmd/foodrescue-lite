# Vercel Deployment Guide for FoodRescue Lite 🚀

This guide explains how to deploy **FoodRescue Lite** to Vercel in just a few minutes.

---

## 1. How the Vercel Architecture Works

- **Frontend**: The static files in `frontend/` (HTML, CSS, Vanilla JS) are served at the edge with high performance via Vercel's global CDN.
- **Backend API**: The Express.js application is automatically deployed as a **Serverless Function** via `api/index.js` and `vercel.json`. All requests to `/api/*` are routed to the Express REST API.
- **Database**: Because Vercel is a serverless platform, `localhost:3306` cannot be used in production. You will connect the backend to a cloud-hosted MySQL database.

---

## 2. Cloud MySQL Database Options (Free Tiers Available)

You can get a free cloud-hosted MySQL database from any of these providers:

1. **TiDB Cloud (Recommended - Free Serverless MySQL)**:
   - Website: https://tidbcloud.com
   - Fully MySQL 8.0 compatible, 5GB free storage, supports SSL.
2. **Aiven for MySQL (Free Tier)**:
   - Website: https://aiven.io/mysql
3. **Railway.app (MySQL Service)**:
   - Website: https://railway.app
4. **Clever Cloud (Free MySQL)**:
   - Website: https://www.clever-cloud.com

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Initialize Your Cloud Database Schema
Once you create your free database on TiDB, Aiven, or Railway, copy your database credentials (Host, Port, User, Password, Database Name).

Temporarily put those credentials into your local `.env` file or run:
```bash
npm run db:setup
```
This will automatically execute `database/schema.sql` and `database/seed.sql` on your cloud MySQL database, creating all tables and sample users!

---

### Step 2: Push Your Code to GitHub
1. Initialize git in the project root:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of FoodRescue Lite"
   ```
2. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/foodrescue-lite.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 3: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Select your `foodrescue-lite` repository and click **Import**.
4. Leave the **Build and Output Settings** as default (Vercel automatically detects `vercel.json` and `api/index.js`).
5. Under **Environment Variables**, add the following:

| Variable Name | Value Example | Description |
|---|---|---|
| `DB_HOST` | `gateway01.us-east-1.prod.aws.tidbcloud.com` | Cloud MySQL Host |
| `DB_PORT` | `4000` (or `3306`) | Cloud MySQL Port |
| `DB_NAME` | `foodrescue` | Database Name |
| `DB_USER` | `your_cloud_username` | Database Username |
| `DB_PASSWORD` | `your_cloud_password` | Database Password |
| `DB_SSL` | `true` | Enables SSL for cloud database connection |
| `JWT_SECRET` | `your_custom_secure_jwt_secret_998877` | Secret for signing auth tokens |
| `JWT_EXPIRES_IN` | `7d` | Token lifespan |

6. Click **Deploy**!

---

## 4. Testing Your Vercel Deployment

Once deployment completes (typically ~30 seconds):
1. Open your Vercel deployment URL (e.g., `https://foodrescue-lite.vercel.app`).
2. Test the health endpoint:
   ```
   https://your-app.vercel.app/api/health
   ```
   You should see:
   ```json
   {
     "status": "OK",
     "app": "FoodRescue Lite API",
     "environment": "Vercel Serverless",
     "timestamp": "..."
   }
   ```
3. Visit the login page (`/login.html`) and log in with the demo accounts:
   - Provider: `provider@greenleaf.com` / `password123`
   - Recipient: `rahul@communitycare.org` / `password123`
   - Admin: `admin@foodrescue.org` / `password123`
