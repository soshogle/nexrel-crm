# Darksword Armory — Vercel + Neon Deployment Guide

**Location:** `owner-websites/eyal-darksword/` in the nexrel-crm repo

## Quick Start

### 1. Create Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project and database named `darksword`
3. Copy the connection string: `postgresql://user:pass@ep-xxxxx.us-east-2.aws.neon.tech/darksword?sslmode=require`

### 2. Configure Environment

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://user:pass@ep-xxxxx.us-east-2.aws.neon.tech/darksword?sslmode=require
JWT_SECRET=<run: openssl rand -hex 32>
VITE_APP_TITLE=Darksword Armory
VITE_APP_LOGO=/darksword-logo.svg
```

### 3. Push Schema & Seed Database

```bash
pnpm install   # or: npm install --legacy-peer-deps
pnpm db:push   # or: npx drizzle-kit push
node seed-db.mjs
```

### 4. Deploy to Vercel

1. Push the project to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Build settings:
   - **Framework Preset:** Other
   - **Build Command:** `pnpm build` (or `npm run build`)
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install` (or `npm install --legacy-peer-deps`)
4. Add environment variables in Vercel Dashboard → Settings → Environment Variables
5. Deploy

### 5. Verify

- **Database:** `SELECT COUNT(*) FROM products;` → should return 367
- **Site:** Homepage loads, shop shows products, cart works, checkout submits

## Auth Note

This deployment uses **guest-only mode** (Option B): browsing, cart, and checkout work without user accounts. My Orders and Wishlist return empty when not logged in. To add email/password auth, see README.md Option A.
