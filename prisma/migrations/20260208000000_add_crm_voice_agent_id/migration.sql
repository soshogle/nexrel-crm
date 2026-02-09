-- Migration already applied in database
-- This migration was applied directly via Neon SQL Editor
-- Adding crmVoiceAgentId column to User table

-- AlterTable
-- Add column only if it doesn't exist (safe for re-running)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'crmVoiceAgentId'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "crmVoiceAgentId" TEXT;
    END IF;
END $$;
