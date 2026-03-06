-- Normalize unique index state across environments.
-- These may already exist in some environments due prior manual/db-push syncs.

CREATE UNIQUE INDEX IF NOT EXISTS "TwilioAccount_envKey_key" ON "TwilioAccount"("envKey");

CREATE UNIQUE INDEX IF NOT EXISTS "UserClinic_userId_clinicId_key" ON "UserClinic"("userId", "clinicId");

CREATE UNIQUE INDEX IF NOT EXISTS "Website_websiteSecret_key" ON "Website"("websiteSecret");

CREATE UNIQUE INDEX IF NOT EXISTS "Website_userId_name_key" ON "Website"("userId", "name");
