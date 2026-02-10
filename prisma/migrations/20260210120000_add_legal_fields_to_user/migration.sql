-- Add legal entity and jurisdiction fields to User for website builder and legal pages
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legalEntityName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legalJurisdiction" TEXT;
