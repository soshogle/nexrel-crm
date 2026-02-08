-- Multi-Clinic Support Migration
-- Copy and paste this entire block into Neon SQL Editor

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable: Clinic
CREATE TABLE IF NOT EXISTS "Clinic" (
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
CREATE TABLE IF NOT EXISTS "UserClinic" (
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

-- Create UserClinic relationships for existing users
INSERT INTO "UserClinic" ("id", "userId", "clinicId", "role", "isPrimary")
SELECT 
    'uc_' || "id",
    "id",
    'clinic_' || "id",
    'OWNER',
    true
FROM "User"
WHERE "industry" = 'DENTIST'
ON CONFLICT DO NOTHING;

-- Add foreign key constraints (with IF NOT EXISTS check)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserClinic_userId_fkey'
    ) THEN
        ALTER TABLE "UserClinic" ADD CONSTRAINT "UserClinic_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserClinic_clinicId_fkey'
    ) THEN
        ALTER TABLE "UserClinic" ADD CONSTRAINT "UserClinic_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalOdontogram_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalOdontogram" ADD CONSTRAINT "DentalOdontogram_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalPeriodontalChart_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalPeriodontalChart" ADD CONSTRAINT "DentalPeriodontalChart_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalTreatmentPlan_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalProcedure_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalProcedure" ADD CONSTRAINT "DentalProcedure_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalForm_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalForm" ADD CONSTRAINT "DentalForm_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalFormResponse_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalFormResponse" ADD CONSTRAINT "DentalFormResponse_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalXRay_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalXRay" ADD CONSTRAINT "DentalXRay_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalLabOrder_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalLabOrder" ADD CONSTRAINT "DentalLabOrder_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DentalInsuranceClaim_clinicId_fkey'
    ) THEN
        ALTER TABLE "DentalInsuranceClaim" ADD CONSTRAINT "DentalInsuranceClaim_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'VnaConfiguration_clinicId_fkey'
    ) THEN
        ALTER TABLE "VnaConfiguration" ADD CONSTRAINT "VnaConfiguration_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PatientDocument_clinicId_fkey'
    ) THEN
        ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_clinicId_fkey" 
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Clinic_isActive_idx" ON "Clinic"("isActive");
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

-- Mark migration as applied in Prisma migrations table
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
