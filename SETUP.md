# Omoibo Global CRM — Setup Guide

## ──────────────────────────────────────
## A. RUN LOCALLY (Your Computer)
## ──────────────────────────────────────

### Prerequisites
- Node.js 18+ → https://nodejs.org
- PostgreSQL 15+ → https://postgresql.org/download
- npm (comes with Node.js)

### Step 1: Create the Database
Open pgAdmin or psql and run:
```sql
CREATE DATABASE omoibo_crm;
```

### Step 2: Configure Backend Environment
Edit `backend/.env`:
```
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/omoibo_crm"
JWT_SECRET="any-long-random-string-here"
JWT_REFRESH_SECRET="another-long-random-string-here"
PORT=5000
FRONTEND_URL=http://localhost:3000
```

Replace YOUR_USERNAME and YOUR_PASSWORD with your PostgreSQL credentials.

### Step 3: Install & Setup
```bash
# Install backend
cd backend
npm install

# Run database migrations (creates all tables)
npx prisma migrate dev --name init

# Seed demo data (creates 17 users + sample records)
node prisma/seed.js

# Install frontend
cd ../frontend
npm install
```

### Step 4: Start the App
Open TWO terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
# API running at http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
# App opens at http://localhost:3000
```

### Step 5: Login
Open http://localhost:3000 and use any of these accounts:
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@omoibo.com | Admin@1234 |
| CEO | ceo@omoibo.com | Admin@1234 |
| Sales Manager | salesmanager@omoibo.com | Admin@1234 |
| Finance Manager | financemanager@omoibo.com | Admin@1234 |
| HR Manager | hrmanager@omoibo.com | Admin@1234 |

---

## ──────────────────────────────────────
## B. DEPLOY TO RAILWAY (Live on Internet)
## ──────────────────────────────────────

### Step 1: Push to GitHub
```bash
cd omoibo-crm
git init
git add .
git commit -m "Initial CRM commit"
git remote add origin https://github.com/YOUR_USERNAME/omoibo-crm.git
git push -u origin main
```

### Step 2: Deploy Backend on Railway
1. Go to https://railway.app → Sign up / Login
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `omoibo-crm` repo
4. Set **Root Directory** to `backend`
5. Railway auto-detects Node.js ✅

### Step 3: Add PostgreSQL Database
1. In your Railway project → Click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway creates the DB and gives you `DATABASE_URL` automatically ✅

### Step 4: Set Environment Variables (Backend Service)
In Railway → your backend service → **Variables** tab, add:
```
JWT_SECRET=your-super-secret-key-here-make-it-long
JWT_REFRESH_SECRET=your-refresh-secret-key-here
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.up.railway.app
```
DATABASE_URL is auto-injected by Railway from the PostgreSQL plugin ✅

### Step 5: Run Migrations & Seed
In Railway → backend service → **Settings** → **Deploy** section:
Set Start Command to:
```
npx prisma migrate deploy && node prisma/seed.js && node src/index.js
```
(Only for first deploy. After seeding, change back to: `node src/index.js`)

### Step 6: Deploy Frontend on Railway
1. Click **+ New** → **Deploy from GitHub repo** (same repo)
2. Set **Root Directory** to `frontend`
3. Add environment variable:
```
REACT_APP_API_URL=https://YOUR-BACKEND-URL.up.railway.app/api/v1
```

### Step 7: Connect Your Domain (Namecheap)
1. In Railway → your service → **Settings** → **Networking** → **Custom Domain**
2. Enter your domain e.g. `crm.omobiglobal.com`
3. Railway gives you a CNAME value
4. In Namecheap → Advanced DNS → Add CNAME record:
   - Host: `crm`
   - Value: (paste Railway CNAME)
   - TTL: Automatic
5. Wait 5–30 minutes for DNS to propagate ✅

---

## ──────────────────────────────────────
## C. ALL LOGIN ACCOUNTS (after seeding)
## ──────────────────────────────────────

All passwords: **Admin@1234**

| Role | Email |
|------|-------|
| Admin | admin@omoibo.com |
| CEO | ceo@omoibo.com |
| COO | coo@omoibo.com |
| Sales Manager | salesmanager@omoibo.com |
| Sales Team Lead | salesteamlead@omoibo.com |
| Sales Agent | salesagent@omoibo.com |
| Inventory Manager | inventorymanager@omoibo.com |
| Inventory Officer | inventoryofficer@omoibo.com |
| Logistics Manager | logisticsmanager@omoibo.com |
| Logistics Officer | logisticsofficer@omoibo.com |
| Finance Manager | financemanager@omoibo.com |
| Finance Officer | financeofficer@omoibo.com |
| Accountant | accountant@omoibo.com |
| HR Manager | hrmanager@omoibo.com |
| HR Officer | hrofficer@omoibo.com |
| Facility Manager | facilitymanager@omoibo.com |
| Facility Officer | facilityofficer@omoibo.com |

---

## ──────────────────────────────────────
## D. ESTIMATED MONTHLY HOSTING COST
## ──────────────────────────────────────

| Service | Plan | Cost |
|---------|------|------|
| Railway Backend (Node.js) | Hobby | ~$5–10/mo |
| Railway Frontend (React) | Hobby | ~$5/mo |
| Railway PostgreSQL | Starter | ~$5/mo |
| Namecheap Domain | .com | ~$12/yr |
| **Total** | | **~$15–20/mo** |

Railway Hobby plan: $5/mo flat + usage.
Much cheaper than DigitalOcean for getting started.

---

## ──────────────────────────────────────
## E. TECH STACK SUMMARY
## ──────────────────────────────────────

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + React Router |
| Styling | Custom CSS (no Tailwind needed) |
| Charts | Recharts |
| Backend | Node.js + Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Deployment | Railway |
| DNS/Domain | Namecheap |
