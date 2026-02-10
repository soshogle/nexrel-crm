-- AlterTable
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "googleSearchConsoleAccessToken" TEXT;
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "googleSearchConsoleRefreshToken" TEXT;
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "googleSearchConsoleTokenExpiry" TIMESTAMP(3);
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "googleSearchConsoleSiteUrl" TEXT;
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "googleSearchConsoleVerified" BOOLEAN NOT NULL DEFAULT false;
