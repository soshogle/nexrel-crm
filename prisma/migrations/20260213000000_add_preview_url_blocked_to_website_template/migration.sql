-- Add previewUrlBlocked to WebsiteTemplate for templates with blocked preview URLs
ALTER TABLE "WebsiteTemplate" ADD COLUMN IF NOT EXISTS "previewUrlBlocked" BOOLEAN NOT NULL DEFAULT false;
