import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_ORTHODONTIST } },
});

async function main() {
  // Enums
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "OrthoTreatmentType" AS ENUM ('ALIGNER','BRACES','RETAINER','APPLIANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "OrthoTreatmentStatus" AS ENUM ('PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "OrthoArch" AS ENUM ('UPPER','LOWER','BOTH'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  console.log('Enums created');

  // Table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OrthoTreatment" (
      "id" TEXT NOT NULL,
      "leadId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "clinicId" TEXT NOT NULL,
      "treatmentType" "OrthoTreatmentType" NOT NULL,
      "status" "OrthoTreatmentStatus" NOT NULL DEFAULT 'ACTIVE',
      "startDate" TIMESTAMP(3) NOT NULL,
      "estimatedEndDate" TIMESTAMP(3),
      "actualEndDate" TIMESTAMP(3),
      "arch" "OrthoArch" NOT NULL DEFAULT 'BOTH',
      "notes" TEXT,
      "alignerBrand" TEXT,
      "alignerCaseNumber" TEXT,
      "totalAligners" INTEGER,
      "currentAligner" INTEGER,
      "wearSchedule" INTEGER DEFAULT 22,
      "changeFrequency" INTEGER DEFAULT 14,
      "nextChangeDate" TIMESTAMP(3),
      "refinementNumber" INTEGER DEFAULT 0,
      "clinCheckUrl" TEXT,
      "iprPlan" JSONB,
      "bracketSystem" TEXT,
      "upperWire" TEXT,
      "lowerWire" TEXT,
      "elasticConfig" TEXT,
      "ligatureType" TEXT,
      "bracketsPlaced" JSONB,
      "retainerType" TEXT,
      "wearInstructions" TEXT,
      "applianceType" TEXT,
      "applianceDetails" TEXT,
      "visits" JSONB,
      "treatmentPlanId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrthoTreatment_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log('Table created');

  // Indexes
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrthoTreatment_leadId_idx" ON "OrthoTreatment"("leadId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrthoTreatment_userId_idx" ON "OrthoTreatment"("userId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrthoTreatment_clinicId_idx" ON "OrthoTreatment"("clinicId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrthoTreatment_treatmentType_idx" ON "OrthoTreatment"("treatmentType")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrthoTreatment_status_idx" ON "OrthoTreatment"("status")`);
  console.log('Indexes created');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
