-- Add enrollment mode (drip campaign) features to WorkflowTemplate model
-- Phase 1: Basic enrollment tracking
-- This migration adds fields to support enrollment-based workflows (drip campaigns)

-- Add enrollment mode fields to WorkflowTemplate
ALTER TABLE "WorkflowTemplate" 
ADD COLUMN IF NOT EXISTS "enrollmentMode" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "enrollmentTriggers" JSONB;

-- Create WorkflowTemplateEnrollment model table (separate from WorkflowEnrollment which is for older Workflow model)
CREATE TABLE IF NOT EXISTS "WorkflowTemplateEnrollment" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "nextSendAt" TIMESTAMP(3),
  "abTestGroup" TEXT,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "metadata" JSONB,
  
  CONSTRAINT "WorkflowTemplateEnrollment_pkey" PRIMARY KEY ("id")
);

-- Create indexes for WorkflowTemplateEnrollment
CREATE INDEX IF NOT EXISTS "WorkflowTemplateEnrollment_workflowId_idx" ON "WorkflowTemplateEnrollment"("workflowId");
CREATE INDEX IF NOT EXISTS "WorkflowTemplateEnrollment_leadId_idx" ON "WorkflowTemplateEnrollment"("leadId");
CREATE INDEX IF NOT EXISTS "WorkflowTemplateEnrollment_status_idx" ON "WorkflowTemplateEnrollment"("status");
CREATE INDEX IF NOT EXISTS "WorkflowTemplateEnrollment_nextSendAt_idx" ON "WorkflowTemplateEnrollment"("nextSendAt");
CREATE INDEX IF NOT EXISTS "WorkflowTemplateEnrollment_workflowId_leadId_idx" ON "WorkflowTemplateEnrollment"("workflowId", "leadId");

-- Create unique constraint for workflow-lead pair
CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowTemplateEnrollment_workflowId_leadId_key" ON "WorkflowTemplateEnrollment"("workflowId", "leadId");

-- Add foreign key constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkflowTemplateEnrollment_workflowId_fkey'
  ) THEN
    ALTER TABLE "WorkflowTemplateEnrollment" 
    ADD CONSTRAINT "WorkflowTemplateEnrollment_workflowId_fkey" 
    FOREIGN KEY ("workflowId") REFERENCES "WorkflowTemplate"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkflowTemplateEnrollment_leadId_fkey'
  ) THEN
    ALTER TABLE "WorkflowTemplateEnrollment" 
    ADD CONSTRAINT "WorkflowTemplateEnrollment_leadId_fkey" 
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Update WorkflowEnrollmentStatus enum to include PAUSED
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'PAUSED' AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'WorkflowEnrollmentStatus'
    )
  ) THEN
    ALTER TYPE "WorkflowEnrollmentStatus" ADD VALUE 'PAUSED';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN "WorkflowTemplate"."enrollmentMode" IS 'When true, workflow uses enrollment-based progression (drip campaign mode)';
COMMENT ON COLUMN "WorkflowTemplate"."enrollmentTriggers" IS 'JSON array of trigger conditions for auto-enrollment (e.g., [{"type": "LEAD_CREATED", "conditions": {...}}])';
COMMENT ON TABLE "WorkflowTemplateEnrollment" IS 'Tracks individual lead enrollments in enrollment-mode WorkflowTemplate workflows (drip campaigns)';
