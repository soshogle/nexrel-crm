# Migration SQL - Run Manually in Neon SQL Editor

Due to SSL certificate issues with Prisma CLI, please run this migration manually in Neon's SQL Editor.

## Steps

1. Go to your Neon dashboard: https://console.neon.tech
2. Select your project: `neondb`
3. Click on "SQL Editor"
4. Copy and paste the SQL below
5. Click "Run" to execute

## Migration SQL

```sql
-- Multi-Clinic Support Migration
-- Adds Clinic model and clinicId to all dental models

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable: Clinic
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT DEFAULT 'Canada',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "timezone" TEXT DEFAULT 'America/Toronto',
    "currency" TEXT DEFAULT 'CAD',
    "language" TEXT DEFAULT 'en',
    "logo" TEXT,
    "primaryColor" TEXT DEFAULT '#9333ea',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserClinic (junction table)
CREATE TABLE "UserClinic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'MEMBER',
    "isPrimary" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserClinic_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserClinic_userId_clinicId_key" UNIQUE ("userId", "clinicId")
);

-- Add clinicId columns to dental models
ALTER TABLE "DentalOdontogram" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalPeriodontalChart" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalTreatmentPlan" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalProcedure" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalForm" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalFormResponse" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalXRay" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalLabOrder" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "DentalInsuranceClaim" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "VnaConfiguration" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "PatientDocument" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;

-- Create default clinic for existing users
INSERT INTO "Clinic" ("id", "name", "createdAt", "updatedAt")
SELECT 
    'clinic_' || "id",
    COALESCE("name", "email", 'Practice') || ' Clinic',
    NOW(),
    NOW()
FROM "User"
WHERE "industry" = 'DENTIST'
ON CONFLICT DO NOTHING;

-- Migrate existing data: assign clinicId based on userId
UPDATE "DentalOdontogram" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalPeriodontalChart" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalTreatmentPlan" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalProcedure" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalForm" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalFormResponse" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalXRay" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalLabOrder" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "DentalInsuranceClaim" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "VnaConfiguration" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

UPDATE "PatientDocument" 
SET "clinicId" = 'clinic_' || "userId"
WHERE "clinicId" IS NULL;

-- Add foreign key constraints
ALTER TABLE "UserClinic" ADD CONSTRAINT "UserClinic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserClinic" ADD CONSTRAINT "UserClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DentalOdontogram" ADD CONSTRAINT "DentalOdontogram_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalPeriodontalChart" ADD CONSTRAINT "DentalPeriodontalChart_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalProcedure" ADD CONSTRAINT "DentalProcedure_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalForm" ADD CONSTRAINT "DentalForm_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalFormResponse" ADD CONSTRAINT "DentalFormResponse_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalXRay" ADD CONSTRAINT "DentalXRay_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalLabOrder" ADD CONSTRAINT "DentalLabOrder_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DentalInsuranceClaim" ADD CONSTRAINT "DentalInsuranceClaim_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VnaConfiguration" ADD CONSTRAINT "VnaConfiguration_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "UserClinic_userId_idx" ON "UserClinic"("userId");
CREATE INDEX IF NOT EXISTS "UserClinic_clinicId_idx" ON "UserClinic"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalOdontogram_clinicId_idx" ON "DentalOdontogram"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalPeriodontalChart_clinicId_idx" ON "DentalPeriodontalChart"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalTreatmentPlan_clinicId_idx" ON "DentalTreatmentPlan"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalProcedure_clinicId_idx" ON "DentalProcedure"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalForm_clinicId_idx" ON "DentalForm"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalFormResponse_clinicId_idx" ON "DentalFormResponse"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalXRay_clinicId_idx" ON "DentalXRay"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalLabOrder_clinicId_idx" ON "DentalLabOrder"("clinicId");
CREATE INDEX IF NOT EXISTS "DentalInsuranceClaim_clinicId_idx" ON "DentalInsuranceClaim"("clinicId");
CREATE INDEX IF NOT EXISTS "VnaConfiguration_clinicId_idx" ON "VnaConfiguration"("clinicId");
CREATE INDEX IF NOT EXISTS "PatientDocument_clinicId_idx" ON "PatientDocument"("clinicId");

-- Mark migration as applied
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
    gen_random_uuid()::text,
    '',
    NOW(),
    '20260208000000_add_multi_clinic_support',
    NULL,
    NULL,
    NOW(),
    1
)
ON CONFLICT DO NOTHING;
```

## After Running Migration

1. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

2. Verify migration:
   ```bash
   npx prisma migrate status
   ```

3. Test the connection:
   ```bash
   npx prisma studio
   ```

## Troubleshooting SSL Issue

The SSL certificate error is a known issue with Prisma and Neon. Possible solutions:

1. **Update Prisma**: `npm install prisma@latest`
2. **Use Neon's direct connection** (not pooler) in DATABASE_URL
3. **Run migration via Neon SQL Editor** (recommended - what we're doing now)
4. **Check Node.js version** - ensure you're using a compatible version
