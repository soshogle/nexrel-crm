-- Enhance Review model with AI analysis, auto-response, and owner audit fields
-- Make campaignId and leadId optional, add userId for direct ownership

-- Add new columns to Review
ALTER TABLE "Review" ADD COLUMN "userId" TEXT;
ALTER TABLE "Review" ADD COLUMN "reviewerName" TEXT;
ALTER TABLE "Review" ADD COLUMN "reviewerAvatar" TEXT;
ALTER TABLE "Review" ADD COLUMN "platformReviewId" TEXT;
ALTER TABLE "Review" ADD COLUMN "sentiment" TEXT;
ALTER TABLE "Review" ADD COLUMN "sentimentScore" DOUBLE PRECISION;
ALTER TABLE "Review" ADD COLUMN "themes" JSONB;
ALTER TABLE "Review" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "Review" ADD COLUMN "aiResponseDraft" TEXT;
ALTER TABLE "Review" ADD COLUMN "aiResponseStatus" TEXT;
ALTER TABLE "Review" ADD COLUMN "ownerResponse" TEXT;
ALTER TABLE "Review" ADD COLUMN "respondedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "ownerScore" INTEGER;
ALTER TABLE "Review" ADD COLUMN "ownerNotes" TEXT;
ALTER TABLE "Review" ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false;

-- Backfill userId from campaign -> user relationship
UPDATE "Review" r
SET "userId" = c."userId"
FROM "Campaign" c
WHERE r."campaignId" = c."id" AND r."userId" IS NULL;

-- Make userId required after backfill
ALTER TABLE "Review" ALTER COLUMN "userId" SET NOT NULL;

-- Make campaignId optional
ALTER TABLE "Review" ALTER COLUMN "campaignId" DROP NOT NULL;

-- Make leadId optional
ALTER TABLE "Review" ALTER COLUMN "leadId" DROP NOT NULL;

-- Add indexes
CREATE INDEX "Review_userId_idx" ON "Review"("userId");
CREATE INDEX "Review_source_idx" ON "Review"("source");
CREATE INDEX "Review_sentiment_idx" ON "Review"("sentiment");

-- Add foreign key for userId
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new ReviewSource values
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'INSTAGRAM';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'LINKEDIN';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'TWITTER';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'BBB';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'ZILLOW';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'REALTOR_COM';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'HEALTHGRADES';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'ZOCDOC';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'ANGI';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'THUMBTACK';
ALTER TYPE "ReviewSource" ADD VALUE IF NOT EXISTS 'INTERNAL';

-- Add new WorkflowTriggerType values
ALTER TYPE "WorkflowTriggerType" ADD VALUE IF NOT EXISTS 'REVIEW_RECEIVED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE IF NOT EXISTS 'REVIEW_POSITIVE';
ALTER TYPE "WorkflowTriggerType" ADD VALUE IF NOT EXISTS 'REVIEW_NEGATIVE';
ALTER TYPE "WorkflowTriggerType" ADD VALUE IF NOT EXISTS 'FEEDBACK_POSITIVE';
ALTER TYPE "WorkflowTriggerType" ADD VALUE IF NOT EXISTS 'FEEDBACK_NEGATIVE';

-- Add new WorkflowActionType values
ALTER TYPE "WorkflowActionType" ADD VALUE IF NOT EXISTS 'REQUEST_REVIEW';
ALTER TYPE "WorkflowActionType" ADD VALUE IF NOT EXISTS 'RESPOND_TO_REVIEW';
ALTER TYPE "WorkflowActionType" ADD VALUE IF NOT EXISTS 'ANALYZE_REVIEWS';
