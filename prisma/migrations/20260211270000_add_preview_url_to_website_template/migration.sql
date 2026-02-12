-- Add previewUrl to WebsiteTemplate for live demo iframe preview
ALTER TABLE "WebsiteTemplate" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
