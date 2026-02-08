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

-- Add clinicId to User (optional - users can belong to multiple clinics via junction table)
CREATE TABLE "UserClinic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'MEMBER',
    "isPrimary" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserClinic_pkey" PRIMARY KEY ("id")
);

-- Add clinicId to all dental models
ALTER TABLE "DentalOdontogram" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalPeriodontalChart" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalTreatmentPlan" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalProcedure" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalForm" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalFormResponse" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalXRay" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalLabOrder" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "DentalInsuranceClaim" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "VnaConfiguration" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "PatientDocument" ADD COLUMN "clinicId" TEXT;

-- Create default clinic for existing users (migrate userId -> clinicId)
-- For now, create a clinic per user, then we can consolidate later
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

-- Add foreign keys
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
CREATE INDEX "Clinic_isActive_idx" ON "Clinic"("isActive");
CREATE INDEX "UserClinic_userId_idx" ON "UserClinic"("userId");
CREATE INDEX "UserClinic_clinicId_idx" ON "UserClinic"("clinicId");
CREATE INDEX "DentalOdontogram_clinicId_idx" ON "DentalOdontogram"("clinicId");
CREATE INDEX "DentalPeriodontalChart_clinicId_idx" ON "DentalPeriodontalChart"("clinicId");
CREATE INDEX "DentalTreatmentPlan_clinicId_idx" ON "DentalTreatmentPlan"("clinicId");
CREATE INDEX "DentalProcedure_clinicId_idx" ON "DentalProcedure"("clinicId");
CREATE INDEX "DentalForm_clinicId_idx" ON "DentalForm"("clinicId");
CREATE INDEX "DentalFormResponse_clinicId_idx" ON "DentalFormResponse"("clinicId");
CREATE INDEX "DentalXRay_clinicId_idx" ON "DentalXRay"("clinicId");
CREATE INDEX "DentalLabOrder_clinicId_idx" ON "DentalLabOrder"("clinicId");
CREATE INDEX "DentalInsuranceClaim_clinicId_idx" ON "DentalInsuranceClaim"("clinicId");
CREATE INDEX "VnaConfiguration_clinicId_idx" ON "VnaConfiguration"("clinicId");
CREATE INDEX "PatientDocument_clinicId_idx" ON "PatientDocument"("clinicId");

-- Make clinicId NOT NULL after migration (optional - can be done in separate migration)
-- For now, keep it nullable to allow gradual migration
