-- Add enhanced timing options to WorkflowTask model
-- Phase 2: Enhanced timing options and task delays for drip campaigns
-- This migration adds granular delay controls and preferred send times

-- Add enhanced timing fields to WorkflowTask
ALTER TABLE "WorkflowTask" 
ADD COLUMN IF NOT EXISTS "delayDays" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "delayHours" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "preferredSendTime" TEXT,
ADD COLUMN IF NOT EXISTS "skipConditions" JSONB;

-- Add comments explaining the new fields
COMMENT ON COLUMN "WorkflowTask"."delayDays" IS 'Number of days to delay before executing this task (for granular timing control)';
COMMENT ON COLUMN "WorkflowTask"."delayHours" IS 'Number of hours to delay before executing this task (for granular timing control)';
COMMENT ON COLUMN "WorkflowTask"."preferredSendTime" IS 'Preferred time of day to send/execute this task (HH:MM format, e.g., "09:00" for 9 AM)';
COMMENT ON COLUMN "WorkflowTask"."skipConditions" IS 'JSON array of conditions that will cause this task to be skipped (e.g., [{"field": "status", "operator": "equals", "value": "converted"}])';
