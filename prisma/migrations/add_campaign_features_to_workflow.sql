-- Add campaign features to WorkflowTemplate model
-- This migration adds fields to support campaign mode in workflows

ALTER TABLE "WorkflowTemplate" 
ADD COLUMN IF NOT EXISTS "executionMode" TEXT DEFAULT 'WORKFLOW',
ADD COLUMN IF NOT EXISTS "audience" JSONB,
ADD COLUMN IF NOT EXISTS "campaignSettings" JSONB,
ADD COLUMN IF NOT EXISTS "analytics" JSONB,
ADD COLUMN IF NOT EXISTS "totalRecipients" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "sentCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "deliveredCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "openedCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "clickedCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "repliedCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "failedCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "openRate" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "clickRate" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "deliveryRate" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "replyRate" DOUBLE PRECISION;

-- Add index for execution mode filtering
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_executionMode_idx" ON "WorkflowTemplate"("executionMode");

-- Add index for campaign status filtering
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_isActive_executionMode_idx" ON "WorkflowTemplate"("isActive", "executionMode");

-- Add comment explaining the new fields
COMMENT ON COLUMN "WorkflowTemplate"."executionMode" IS 'WORKFLOW for single recipient, CAMPAIGN for batch execution';
COMMENT ON COLUMN "WorkflowTemplate"."audience" IS 'JSON object with audience targeting filters (minLeadScore, statuses, tags, etc.)';
COMMENT ON COLUMN "WorkflowTemplate"."campaignSettings" IS 'JSON object with campaign settings (scheduledFor, frequency, dailyLimit, weeklyLimit)';
COMMENT ON COLUMN "WorkflowTemplate"."analytics" IS 'JSON object with detailed campaign analytics';
