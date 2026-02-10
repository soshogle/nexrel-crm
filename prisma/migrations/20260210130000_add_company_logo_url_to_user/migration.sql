-- Company logo URL (from onboarding); used in CRM and website builder
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyLogoUrl" TEXT;
