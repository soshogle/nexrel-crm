-- Add Google Search Console OAuth columns to Website table
-- Generated: 2026-02-10
-- This migration adds columns for Google Search Console integration

-- Add columns if they don't exist
DO $$ 
BEGIN
  -- Add googleSearchConsoleAccessToken
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Website' 
    AND column_name = 'googleSearchConsoleAccessToken'
  ) THEN
    ALTER TABLE "Website" ADD COLUMN "googleSearchConsoleAccessToken" TEXT;
  END IF;

  -- Add googleSearchConsoleRefreshToken
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Website' 
    AND column_name = 'googleSearchConsoleRefreshToken'
  ) THEN
    ALTER TABLE "Website" ADD COLUMN "googleSearchConsoleRefreshToken" TEXT;
  END IF;

  -- Add googleSearchConsoleTokenExpiry
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Website' 
    AND column_name = 'googleSearchConsoleTokenExpiry'
  ) THEN
    ALTER TABLE "Website" ADD COLUMN "googleSearchConsoleTokenExpiry" TIMESTAMP(3);
  END IF;

  -- Add googleSearchConsoleSiteUrl
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Website' 
    AND column_name = 'googleSearchConsoleSiteUrl'
  ) THEN
    ALTER TABLE "Website" ADD COLUMN "googleSearchConsoleSiteUrl" TEXT;
  END IF;

  -- Add googleSearchConsoleVerified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Website' 
    AND column_name = 'googleSearchConsoleVerified'
  ) THEN
    ALTER TABLE "Website" ADD COLUMN "googleSearchConsoleVerified" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
