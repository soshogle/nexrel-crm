-- Add A/B testing features to WorkflowTemplate and WorkflowTask models
-- Phase 3: A/B Testing and advanced features for drip campaigns
-- This migration adds A/B testing capabilities to workflows

-- Add A/B testing fields to WorkflowTemplate
ALTER TABLE "WorkflowTemplate" 
ADD COLUMN IF NOT EXISTS "enableAbTesting" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "abTestConfig" JSONB;

-- Add A/B testing fields to WorkflowTask
ALTER TABLE "WorkflowTask" 
ADD COLUMN IF NOT EXISTS "isAbTestVariant" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "abTestGroup" TEXT,
ADD COLUMN IF NOT EXISTS "variantOf" TEXT;

-- Add index for A/B test variant lookups
CREATE INDEX IF NOT EXISTS "WorkflowTask_variantOf_idx" ON "WorkflowTask"("variantOf");
CREATE INDEX IF NOT EXISTS "WorkflowTask_abTestGroup_idx" ON "WorkflowTask"("abTestGroup");

-- Add comments explaining the new fields
COMMENT ON COLUMN "WorkflowTemplate"."enableAbTesting" IS 'When true, workflow uses A/B testing to compare variants';
COMMENT ON COLUMN "WorkflowTemplate"."abTestConfig" IS 'JSON object with A/B test configuration (e.g., {"splitPercentage": 50, "testType": "subject" | "content" | "timing"})';
COMMENT ON COLUMN "WorkflowTask"."isAbTestVariant" IS 'True if this task is an A/B test variant (not the original)';
COMMENT ON COLUMN "WorkflowTask"."abTestGroup" IS 'A/B test group assignment: "A" or "B"';
COMMENT ON COLUMN "WorkflowTask"."variantOf" IS 'ID of the original task this variant is based on (for A/B testing)';
