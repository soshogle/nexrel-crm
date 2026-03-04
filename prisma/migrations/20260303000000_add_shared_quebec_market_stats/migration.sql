-- Add isShared column for Quebec-wide Centris data (shared across all RE users)
ALTER TABLE "REMarketStats" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;

-- Make userId optional (null when isShared=true)
ALTER TABLE "REMarketStats" ALTER COLUMN "userId" DROP NOT NULL;

-- Index for efficient shared-stats queries
CREATE INDEX "REMarketStats_isShared_idx" ON "REMarketStats"("isShared");

-- Composite index for shared stats by region/category
CREATE INDEX "REMarketStats_isShared_region_propertyCategory_periodType_idx" ON "REMarketStats"("isShared", "region", "propertyCategory", "periodType");
