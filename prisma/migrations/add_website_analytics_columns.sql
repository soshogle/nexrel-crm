-- Add Google Analytics and Facebook Pixel columns to Website table
-- Run this migration manually in Neon SQL Editor if Prisma migrations fail

-- Add googleAnalyticsId column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Website' AND column_name = 'googleAnalyticsId'
    ) THEN
        ALTER TABLE "Website" ADD COLUMN "googleAnalyticsId" TEXT;
    END IF;
END $$;

-- Add facebookPixelId column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Website' AND column_name = 'facebookPixelId'
    ) THEN
        ALTER TABLE "Website" ADD COLUMN "facebookPixelId" TEXT;
    END IF;
END $$;
