-- Phase 5: Add index on User.industry for migration and industry-scoped queries
CREATE INDEX IF NOT EXISTS "User_industry_idx" ON "User"("industry");
