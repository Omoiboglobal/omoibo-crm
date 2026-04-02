# Omoibo Global Limited — Enterprise CRM

A full-stack enterprise CRM system built with React + Node.js + PostgreSQL.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### 1. Clone & Install
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Setup Database
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run Development
```bash
# Terminal 1 - Backend (runs on port 5000)
cd backend && npm run dev

# Terminal 2 - Frontend (runs on port 3000)
cd frontend && npm run dev
```

### 5. Login
After seeding, use these credentials:
- **Admin:** admin@omoibo.com / Admin@1234
- **CEO:** ceo@omoibo.com / Admin@1234
- **Sales Manager:** salesmanager@omoibo.com / Admin@1234

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add a PostgreSQL plugin
4. Set environment variables (copy from .env.example)
5. Deploy — Railway auto-detects Node.js

## Project Structure
```
omoibo-crm/
├── backend/          # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── modules/  # Auth, Sales, Inventory, Finance, HR, etc.
│   │   ├── middleware/
│   │   └── utils/
│   └── prisma/       # Database schema + seed
└── frontend/         # React + Tailwind CRM UI
    └── src/
        ├── pages/    # One page per module
        ├── components/
        ├── api/      # API client functions
        └── store/    # Redux state
```
