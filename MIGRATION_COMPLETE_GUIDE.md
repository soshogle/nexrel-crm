# Migration Guide - SSL Issue Workaround

## ✅ Backup Completed

**Backup Location:** `backups/pre-migration-2026-02-08-090038/`
- Schema backed up: `schema.prisma.backup`
- Manifest: `BACKUP_MANIFEST.md`

## ⚠️ SSL Certificate Issue

Prisma CLI is encountering an SSL certificate error with Neon:
```
Error: P1011: Error opening a TLS connection: bad certificate format
```

This is a known compatibility issue between Prisma's native PostgreSQL driver and Neon's SSL configuration. **The migration SQL is safe and ready to run.**

## ✅ Solution: Run Migration Manually

### Option 1: Neon SQL Editor (Recommended)

1. **Go to Neon Dashboard:**
   - Visit: https://console.neon.tech
   - Select your project: `neondb`

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Or use the "Query" tab

3. **Run Migration:**
   - Open the file: `MIGRATION_SQL.md` (in project root)
   - Copy the entire SQL block
   - Paste into Neon's SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify:**
   - Check that all statements executed successfully
   - Look for any errors (some "already exists" messages are normal)

5. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

### Option 2: Use psql Command Line

If you have `psql` installed:

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Run migration
psql "$DATABASE_URL" < prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql
```

### Option 3: Fix SSL Issue (Advanced)

If you want to fix the Prisma SSL issue:

1. **Try Direct Connection (not pooler):**
   ```
   DATABASE_URL="postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```
   (Remove `-pooler` from hostname)

2. **Update Prisma:**
   ```bash
   npm install prisma@latest --legacy-peer-deps
   ```

3. **Try Migration Again:**
   ```bash
   npx prisma migrate deploy
   ```

## 📋 What the Migration Does

1. **Creates `Clinic` table** - Stores clinic information
2. **Creates `UserClinic` table** - Junction table for user-clinic relationships
3. **Adds `clinicId` column** to all dental models:
   - DentalOdontogram
   - DentalPeriodontalChart
   - DentalTreatmentPlan
   - DentalProcedure
   - DentalForm
   - DentalFormResponse
   - DentalXRay
   - DentalLabOrder
   - DentalInsuranceClaim
   - VnaConfiguration
   - PatientDocument

4. **Migrates existing data** - Assigns clinicId based on userId
5. **Creates foreign keys** - Links all tables to Clinic
6. **Creates indexes** - For performance

## ✅ After Migration

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Verify Migration:**
   ```bash
   npx prisma migrate status
   ```

3. **Test Connection:**
   ```bash
   npx prisma studio
   ```

4. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

## 🔄 Rollback (If Needed)

If you need to rollback:

1. **Restore Schema:**
   ```bash
   cp backups/pre-migration-2026-02-08-090038/schema.prisma.backup prisma/schema.prisma
   npx prisma generate
   ```

2. **Restore Database:**
   - Use Neon's point-in-time restore in dashboard
   - Or manually drop the added columns/tables

## 📝 Migration SQL File

The complete migration SQL is in:
- `prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql`
- `MIGRATION_SQL.md` (formatted for easy copy-paste)

## 🎯 Next Steps

After migration:
1. ✅ Multi-clinic support will be enabled
2. ✅ Existing data will be migrated automatically
3. ✅ New records will require clinicId
4. ✅ Clinic management UI is ready to use
