-- Twilio Failover System Migration
-- Copy this entire file and run in Neon SQL Editor
-- Safe to run - only adds new tables and columns, doesn't delete anything

-- Create Enums
CREATE TYPE "TwilioFailoverTriggerType" AS ENUM ('CRITICAL', 'DEGRADED', 'MANUAL');
CREATE TYPE "TwilioFailoverStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'COMPLETED', 'CANCELLED', 'ROLLED_BACK');
CREATE TYPE "TwilioHealthCheckType" AS ENUM ('API', 'WEBHOOK', 'PHONE_NUMBER', 'AGENT', 'ACCOUNT_STATUS');
CREATE TYPE "TwilioHealthCheckStatus" AS ENUM ('PASS', 'FAIL', 'DEGRADED');

-- Create TwilioAccount Table
CREATE TABLE "TwilioAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountSid" TEXT NOT NULL UNIQUE,
    "authToken" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastHealthCheck" TIMESTAMP(3),
    "healthStatus" TEXT,
    "phoneNumbersCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwilioAccount_pkey" PRIMARY KEY ("id")
);

-- Create TwilioFailoverEvent Table
CREATE TABLE "TwilioFailoverEvent" (
    "id" TEXT NOT NULL,
    "triggerType" "TwilioFailoverTriggerType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalWindowStarted" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "status" "TwilioFailoverStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "affectedAgentsCount" INTEGER NOT NULL,
    "totalActiveAgentsCount" INTEGER NOT NULL,
    "testResultsDuringWindow" JSONB,
    "failoverExecutedAt" TIMESTAMP(3),
    "rollbackAt" TIMESTAMP(3),
    "rollbackBy" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "notes" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "TwilioFailoverEvent_pkey" PRIMARY KEY ("id")
);

-- Create TwilioHealthCheck Table
CREATE TABLE "TwilioHealthCheck" (
    "id" TEXT NOT NULL,
    "twilioAccountId" TEXT NOT NULL,
    "checkType" "TwilioHealthCheckType" NOT NULL,
    "status" "TwilioHealthCheckStatus" NOT NULL,
    "details" JSONB,
    "responseTime" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwilioHealthCheck_pkey" PRIMARY KEY ("id")
);

-- Create TwilioBackupPhoneNumber Table
CREATE TABLE "TwilioBackupPhoneNumber" (
    "id" TEXT NOT NULL,
    "twilioAccountId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL UNIQUE,
    "countryCode" TEXT NOT NULL,
    "isAssigned" BOOLEAN NOT NULL DEFAULT false,
    "assignedToAgentId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwilioBackupPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- Add columns to VoiceAgent table (safe - uses IF NOT EXISTS)
ALTER TABLE "VoiceAgent" ADD COLUMN IF NOT EXISTS "twilioAccountId" TEXT;
ALTER TABLE "VoiceAgent" ADD COLUMN IF NOT EXISTS "backupPhoneNumber" TEXT;
ALTER TABLE "VoiceAgent" ADD COLUMN IF NOT EXISTS "lastHealthCheck" TIMESTAMP(3);
ALTER TABLE "VoiceAgent" ADD COLUMN IF NOT EXISTS "healthStatus" TEXT;

-- Create Indexes (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "TwilioAccount_isPrimary_idx" ON "TwilioAccount"("isPrimary");
CREATE INDEX IF NOT EXISTS "TwilioAccount_isActive_idx" ON "TwilioAccount"("isActive");
CREATE INDEX IF NOT EXISTS "TwilioAccount_status_idx" ON "TwilioAccount"("status");
CREATE INDEX IF NOT EXISTS "TwilioAccount_healthStatus_idx" ON "TwilioAccount"("healthStatus");
CREATE INDEX IF NOT EXISTS "TwilioFailoverEvent_status_idx" ON "TwilioFailoverEvent"("status");
CREATE INDEX IF NOT EXISTS "TwilioFailoverEvent_triggerType_idx" ON "TwilioFailoverEvent"("triggerType");
CREATE INDEX IF NOT EXISTS "TwilioFailoverEvent_detectedAt_idx" ON "TwilioFailoverEvent"("detectedAt");
CREATE INDEX IF NOT EXISTS "TwilioFailoverEvent_fromAccountId_idx" ON "TwilioFailoverEvent"("fromAccountId");
CREATE INDEX IF NOT EXISTS "TwilioFailoverEvent_toAccountId_idx" ON "TwilioFailoverEvent"("toAccountId");
CREATE INDEX IF NOT EXISTS "TwilioHealthCheck_twilioAccountId_idx" ON "TwilioHealthCheck"("twilioAccountId");
CREATE INDEX IF NOT EXISTS "TwilioHealthCheck_checkType_idx" ON "TwilioHealthCheck"("checkType");
CREATE INDEX IF NOT EXISTS "TwilioHealthCheck_status_idx" ON "TwilioHealthCheck"("status");
CREATE INDEX IF NOT EXISTS "TwilioHealthCheck_checkedAt_idx" ON "TwilioHealthCheck"("checkedAt");
CREATE INDEX IF NOT EXISTS "TwilioBackupPhoneNumber_twilioAccountId_idx" ON "TwilioBackupPhoneNumber"("twilioAccountId");
CREATE INDEX IF NOT EXISTS "TwilioBackupPhoneNumber_isAssigned_idx" ON "TwilioBackupPhoneNumber"("isAssigned");
CREATE INDEX IF NOT EXISTS "TwilioBackupPhoneNumber_assignedToAgentId_idx" ON "TwilioBackupPhoneNumber"("assignedToAgentId");
CREATE INDEX IF NOT EXISTS "VoiceAgent_twilioAccountId_idx" ON "VoiceAgent"("twilioAccountId");
CREATE INDEX IF NOT EXISTS "VoiceAgent_healthStatus_idx" ON "VoiceAgent"("healthStatus");

-- Add Foreign Keys (safe - checks if constraint exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwilioFailoverEvent_fromAccountId_fkey') THEN
        ALTER TABLE "TwilioFailoverEvent" ADD CONSTRAINT "TwilioFailoverEvent_fromAccountId_fkey" 
        FOREIGN KEY ("fromAccountId") REFERENCES "TwilioAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwilioFailoverEvent_toAccountId_fkey') THEN
        ALTER TABLE "TwilioFailoverEvent" ADD CONSTRAINT "TwilioFailoverEvent_toAccountId_fkey" 
        FOREIGN KEY ("toAccountId") REFERENCES "TwilioAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwilioHealthCheck_twilioAccountId_fkey') THEN
        ALTER TABLE "TwilioHealthCheck" ADD CONSTRAINT "TwilioHealthCheck_twilioAccountId_fkey" 
        FOREIGN KEY ("twilioAccountId") REFERENCES "TwilioAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwilioBackupPhoneNumber_twilioAccountId_fkey') THEN
        ALTER TABLE "TwilioBackupPhoneNumber" ADD CONSTRAINT "TwilioBackupPhoneNumber_twilioAccountId_fkey" 
        FOREIGN KEY ("twilioAccountId") REFERENCES "TwilioAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VoiceAgent_twilioAccountId_fkey') THEN
        ALTER TABLE "VoiceAgent" ADD CONSTRAINT "VoiceAgent_twilioAccountId_fkey" 
        FOREIGN KEY ("twilioAccountId") REFERENCES "TwilioAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Mark migration as applied in Prisma migrations table
INSERT INTO "_prisma_migrations" (
    id,
    checksum,
    finished_at,
    migration_name,
    logs,
    rolled_back_at,
    started_at,
    applied_steps_count
)
SELECT 
    gen_random_uuid()::text,
    '',
    NOW(),
    '20260209120000_add_twilio_failover',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE migration_name = '20260209120000_add_twilio_failover'
);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Twilio Failover migration applied successfully!';
    RAISE NOTICE '📊 New tables created: TwilioAccount, TwilioFailoverEvent, TwilioHealthCheck, TwilioBackupPhoneNumber';
    RAISE NOTICE '🔧 VoiceAgent table updated with new columns';
END $$;
