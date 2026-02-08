# Step-by-Step: Run Migration in Neon SQL Editor

## ✅ Step 1: Open Neon SQL Editor

1. Go to **https://console.neon.tech**
2. Log in to your account
3. Select your project: **`neondb`**
4. Click **"SQL Editor"** in the left sidebar (or click the "Query" tab)

## ✅ Step 2: Copy the Migration SQL

Open the file **`MIGRATION_SQL.md`** in your project (or copy from below) and copy the entire SQL block.

**Quick access:**
```bash
# View the SQL file
cat MIGRATION_SQL.md

# Or open it in your editor
open MIGRATION_SQL.md
```

## ✅ Step 3: Paste and Run SQL

1. In Neon's SQL Editor, **paste the entire SQL** from `MIGRATION_SQL.md`
2. Click the **"Run"** button (or press `Cmd+Enter` on Mac / `Ctrl+Enter` on Windows)
3. Wait for execution to complete

**Expected results:**
- ✅ You should see "Success" or "Query executed successfully"
- ⚠️ Some "already exists" warnings are normal if you've run parts before
- ❌ If you see errors, note them and we can troubleshoot

## ✅ Step 4: Mark Migration as Applied

After the SQL runs successfully, mark the migration as applied in Prisma:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx prisma migrate resolve --applied 20260208000000_add_multi_clinic_support
```

**Note:** The SQL in `MIGRATION_SQL.md` already includes a step to mark it as applied in the database, but running this command ensures Prisma CLI knows about it too.

## ✅ Step 5: Generate Prisma Client

```bash
npx prisma generate
```

This updates your Prisma Client with the new schema changes.

## ✅ Step 6: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Should show: "Database schema is up to date!"
```

## ✅ Step 7: Test Connection

```bash
# Open Prisma Studio to verify tables
npx prisma studio
```

Look for:
- ✅ New `Clinic` table
- ✅ New `UserClinic` table  
- ✅ `clinicId` columns added to dental tables

## 🎯 What This Migration Does

1. **Creates `Clinic` table** - Stores clinic information
2. **Creates `UserClinic` table** - Links users to clinics
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
4. **Migrates existing data** - Assigns `clinicId` based on `userId`
5. **Creates foreign keys** - Links all tables to Clinic
6. **Creates indexes** - For performance

## 🚨 Troubleshooting

### If SQL execution fails:

1. **Check for existing objects:**
   - If you see "already exists" errors, that's okay - the migration uses `IF NOT EXISTS` where possible
   - If you see constraint errors, the migration may have partially run before

2. **Common issues:**
   - **"relation already exists"** → Some parts already ran, continue anyway
   - **"column already exists"** → The column was added before, skip that part
   - **"constraint already exists"** → Foreign keys already exist, skip

3. **Partial migration:**
   - If migration partially ran, you can run individual statements
   - Or rollback and start fresh (use Neon's point-in-time restore)

### If `prisma migrate resolve` fails:

The migration might already be marked. Check with:
```bash
npx prisma migrate status
```

If it shows the migration as applied, you're good to go!

## 📋 Quick Reference

**Files to reference:**
- `MIGRATION_SQL.md` - Complete SQL to run
- `prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql` - Original migration file

**After migration:**
```bash
npx prisma generate
npx prisma migrate status
npm run dev  # Restart your dev server
```

---

**Ready?** Open `MIGRATION_SQL.md`, copy the SQL, paste it in Neon SQL Editor, and run it! 🚀
