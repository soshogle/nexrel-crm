# SSL Certificate Error Fix Guide

## Problem
```
Error: P1011: Error opening a TLS connection: bad certificate format
```

This error occurs when Prisma's native PostgreSQL driver cannot parse Neon's SSL certificate format. This is a known compatibility issue between Prisma and Neon on certain systems (especially macOS ARM).

## ✅ Solution 1: Run Migration SQL Directly in Neon Console (RECOMMENDED)

Since you've migrated before, the most reliable way is to run the SQL directly:

1. **Copy Migration SQL:**
   ```bash
   cat prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql
   ```
   Or open: `MIGRATION_SQL.md`

2. **Run in Neon Dashboard:**
   - Go to https://console.neon.tech
   - Select your project
   - Click "SQL Editor" in left sidebar
   - Paste the SQL
   - Click "Run" (or Cmd/Ctrl + Enter)

3. **Mark Migration as Applied:**
   ```bash
   cd /Users/cyclerun/Desktop/nexrel-crm
   npx prisma migrate resolve --applied 20260208000000_add_multi_clinic_support
   npx prisma generate
   ```

This bypasses Prisma's SSL issue entirely and is the most reliable method.

## ✅ Solution 2: Use `prisma db push` (If Solution 1 doesn't work)

Since you've migrated before, you can use `db push` which uses a different connection method:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx prisma db push
npx prisma generate
```

**Note:** `db push` applies schema changes directly without creating migration files. This is fine if you're okay with that approach.

## ✅ Solution 3: Update Prisma (May Fix SSL Issue)

The SSL issue may be resolved in newer Prisma versions:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npm install prisma@latest @prisma/client@latest --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
```

## ✅ Solution 4: Use Neon SQL Editor (Already covered in Solution 1)

1. **Get Migration SQL:**
   ```bash
   cat prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql
   ```

2. **Run in Neon Console:**
   - Go to https://console.neon.tech
   - Select your project
   - Open SQL Editor
   - Paste the SQL
   - Run it

3. **Mark Migration as Applied:**
   ```bash
   npx prisma migrate resolve --applied 20260208000000_add_multi_clinic_support
   npx prisma generate
   ```

## ✅ Solution 5: Use psql Directly

If you have `psql` installed:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm

# Load environment
export DATABASE_URL="postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Run migration SQL
psql "$DATABASE_URL" < prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql

# Mark as applied
npx prisma migrate resolve --applied 20260208000000_add_multi_clinic_support
npx prisma generate
```

## ✅ Solution 6: Fix OpenSSL on macOS

If you're on macOS, the issue might be with OpenSSL:

```bash
# Check OpenSSL version
openssl version

# If using Homebrew, update OpenSSL
brew update
brew upgrade openssl

# Then try migration again
npx prisma migrate deploy
```

## ✅ Solution 7: Use Different Binary Target

Try updating your `prisma/schema.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "darwin-arm64"]
}
```

Then:
```bash
npx prisma generate
npx prisma migrate deploy
```

## 🔍 Diagnostic Steps

1. **Test Connection:**
   ```bash
   npx prisma db pull --print
   ```
   If this works, the issue is specific to migrations.

2. **Check Prisma Version:**
   ```bash
   npx prisma --version
   ```

3. **Verify DATABASE_URL:**
   ```bash
   echo $DATABASE_URL
   ```
   Make sure it doesn't have `channel_binding=require` (remove it if present).

## 🎯 Recommended Approach

Since you've migrated before successfully, **use Solution 1** (Neon SQL Editor) - it's the most reliable and bypasses the SSL issue entirely. After running the SQL, mark the migration as applied with `prisma migrate resolve --applied`.

If you prefer a command-line approach, try **Solution 2** (`prisma db push`), but note it won't create migration history.

## After Migration

Once the migration is applied:

```bash
# Verify migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate

# Test the connection
npx prisma studio
```
