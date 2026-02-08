# Run Migration Now - Quick Guide

## ⚠️ SSL Certificate Issue Detected

The automated migration script encountered an SSL certificate issue. This is common with Neon databases and sandbox environments.

## ✅ Solution: Run Migration Manually

**The migration file is ready and safe to run.** Execute these commands in your **local terminal** (not in Cursor's sandbox):

### Step 1: Navigate to Project

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
```

### Step 2: Load Environment Variables

```bash
# Option A: Using source (bash/zsh)
source .env.local

# Option B: Using export
export DATABASE_URL="your_database_url_from_env_local"
```

### Step 3: Run Migration

```bash
npx prisma migrate dev --name add_vna_configuration
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

## ✅ Verify Migration Success

After running, verify it worked:

```bash
# Option 1: Check migration status
npx prisma migrate status

# Option 2: Open Prisma Studio
npx prisma studio
# Look for "VnaConfiguration" table
```

## 🔧 If SSL Issues Persist

If you still get SSL errors, try adding SSL parameters to your DATABASE_URL:

```bash
# Add ?sslmode=require to your connection string
export DATABASE_URL="postgresql://...?sslmode=require"
```

Or modify `.env.local` temporarily:
```
DATABASE_URL="postgresql://...?sslmode=require"
```

## 📋 What the Migration Does

The migration will:
1. ✅ Create `VnaType` enum (ORTHANC, AWS_S3, AZURE_BLOB, CLOUD_VNA, OTHER)
2. ✅ Create `VnaConfiguration` table with all fields
3. ✅ Add 3 indexes for performance
4. ✅ Add foreign key to User table

**No existing tables or data are modified** - completely safe!

## 🎯 After Migration

1. Restart your dev server: `npm run dev`
2. Navigate to Admin Dashboard → VNA Configuration
3. Create test VNA configurations
4. Test routing rules
5. Verify workflow actions

See `docs/MANUAL_TESTING_STEPS.md` for detailed testing instructions.
