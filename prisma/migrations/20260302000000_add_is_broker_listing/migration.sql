-- Add isBrokerListing flag to REProperty
ALTER TABLE "REProperty" ADD COLUMN "isBrokerListing" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark existing properties that have a sellerLeadId as broker listings
UPDATE "REProperty" SET "isBrokerListing" = true WHERE "sellerLeadId" IS NOT NULL;

-- Index for efficient broker-scoped queries
CREATE INDEX "REProperty_userId_isBrokerListing_idx" ON "REProperty"("userId", "isBrokerListing");
