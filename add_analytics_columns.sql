-- Add Google Analytics and Facebook Pixel columns to Website table
-- Run this in Neon SQL Editor if columns don't exist

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Website' AND column_name = 'googleAnalyticsId'
    ) THEN
        ALTER TABLE "Website" ADD COLUMN "googleAnalyticsId" TEXT;
        RAISE NOTICE 'Added googleAnalyticsId column';
    ELSE
        RAISE NOTICE 'googleAnalyticsId column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Website' AND column_name = 'facebookPixelId'
    ) THEN
        ALTER TABLE "Website" ADD COLUMN "facebookPixelId" TEXT;
        RAISE NOTICE 'Added facebookPixelId column';
    ELSE
        RAISE NOTICE 'facebookPixelId column already exists';
    END IF;
END $$;
