# Quick Start: Run VNA Configuration Migration

## ✅ Migration File Ready

The migration file has been created and is ready to run:
- **Location**: `prisma/migrations/20260206010000_add_vna_configuration/migration.sql`
- **Status**: ✅ Safe to run (no breaking changes)

## 🚀 Run Migration (Choose One Method)

### Method 1: Using the Script (Easiest)

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
./scripts/run-migration.sh
```

This script will:
1. Load your `.env.local` file
2. Run the migration
3. Generate Prisma Client

### Method 2: Manual Command

```bash
cd /Users/cyclerun/Desktop/nexrel-crm

# Load environment (if using bash)
source .env.local

# Or export directly
export DATABASE_URL="your_database_url_here"

# Run migration
npx prisma migrate dev --name add_vna_configuration

# Generate Prisma Client
npx prisma generate
```

### Method 3: Direct SQL (If Prisma CLI Issues)

If you have direct database access:

1. Connect to your PostgreSQL database
2. Run the SQL from: `prisma/migrations/20260206010000_add_vna_configuration/migration.sql`
3. Mark as applied:
   ```bash
   npx prisma migrate resolve --applied 20260206010000_add_vna_configuration
   ```
4. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

## ✅ Verify Migration

After running, verify the migration worked:

```bash
# Option 1: Check via Prisma Studio
npx prisma studio
# Look for "VnaConfiguration" table

# Option 2: Check migration status
npx prisma migrate status
```

## 📋 What the Migration Does

1. ✅ Creates `VnaType` enum (ORTHANC, AWS_S3, AZURE_BLOB, CLOUD_VNA, OTHER)
2. ✅ Creates `VnaConfiguration` table with all fields
3. ✅ Adds indexes for performance
4. ✅ Adds foreign key to User table

**No existing tables or data are modified** - completely safe!

## 🧪 After Migration

1. Restart your dev server: `npm run dev`
2. Navigate to Admin Dashboard → VNA Configuration
3. Create test VNA configurations
4. Test routing rules
5. Verify workflow actions

See `docs/TESTING_GUIDE.md` for detailed testing instructions.
