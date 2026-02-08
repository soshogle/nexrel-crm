# Migration Instructions: Add VNA Configuration

## Migration Status

✅ **Migration file created**: `prisma/migrations/20260206010000_add_vna_configuration/migration.sql`

## How to Run the Migration

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Make sure DATABASE_URL is set in your environment
export DATABASE_URL="your_database_url_here"

# Or load from .env.local
source .env.local  # if using bash
# or
set -a && source .env.local && set +a  # if using sh

# Run the migration
cd /Users/cyclerun/Desktop/nexrel-crm
npx prisma migrate dev --name add_vna_configuration

# Generate Prisma Client
npx prisma generate
```

### Option 2: Manual SQL Execution

If Prisma migrate doesn't work, you can run the SQL directly:

1. Connect to your PostgreSQL database
2. Run the SQL from: `prisma/migrations/20260206010000_add_vna_configuration/migration.sql`

```sql
-- CreateEnum
CREATE TYPE "VnaType" AS ENUM ('ORTHANC', 'AWS_S3', 'AZURE_BLOB', 'CLOUD_VNA', 'OTHER');

-- CreateTable
CREATE TABLE "VnaConfiguration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VnaType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "endpoint" TEXT,
    "aeTitle" TEXT,
    "host" TEXT,
    "port" INTEGER,
    "credentials" JSONB,
    "bucket" TEXT,
    "region" TEXT,
    "pathPrefix" TEXT,
    "routingRules" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VnaConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VnaConfiguration_userId_idx" ON "VnaConfiguration"("userId");
CREATE INDEX "VnaConfiguration_isActive_idx" ON "VnaConfiguration"("isActive");
CREATE INDEX "VnaConfiguration_type_idx" ON "VnaConfiguration"("type");

-- AddForeignKey
ALTER TABLE "VnaConfiguration" ADD CONSTRAINT "VnaConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

3. After running SQL, mark migration as applied:
```bash
npx prisma migrate resolve --applied 20260206010000_add_vna_configuration
```

4. Generate Prisma Client:
```bash
npx prisma generate
```

### Option 3: Using Prisma Studio or Database GUI

1. Open your database management tool (pgAdmin, DBeaver, etc.)
2. Copy the SQL from `prisma/migrations/20260206010000_add_vna_configuration/migration.sql`
3. Execute it in your database
4. Run `npx prisma generate` to update Prisma Client

## Verify Migration Success

After running the migration, verify it worked:

```bash
# Check if table exists (if you have psql access)
psql $DATABASE_URL -c "\d \"VnaConfiguration\""

# Or check via Prisma Studio
npx prisma studio
# Navigate to VnaConfiguration table
```

## Post-Migration Steps

1. ✅ Run `npx prisma generate` to update Prisma Client
2. ✅ Restart your development server
3. ✅ Test VNA configuration creation via UI
4. ✅ Test routing rules functionality
5. ✅ Verify workflow actions work correctly

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"
- Make sure `.env.local` or `.env` file exists
- Verify DATABASE_URL is set correctly
- Try: `export DATABASE_URL="your_url"` before running migrate

### Error: "Table already exists"
- Migration was already applied
- Run: `npx prisma migrate resolve --applied 20260206010000_add_vna_configuration`
- Then: `npx prisma generate`

### Error: "Enum already exists"
- The enum was created manually
- You can skip the enum creation and just create the table
- Or drop and recreate: `DROP TYPE IF EXISTS "VnaType" CASCADE;`

## Rollback (if needed)

If you need to rollback:

```sql
-- Drop table and enum
DROP TABLE IF EXISTS "VnaConfiguration" CASCADE;
DROP TYPE IF EXISTS "VnaType" CASCADE;
```

Then mark migration as rolled back:
```bash
npx prisma migrate resolve --rolled-back 20260206010000_add_vna_configuration
```
