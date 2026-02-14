-- Add envKey to TwilioAccount for env-based credentials (TWILIO_PRIMARY_*, TWILIO_BACKUP_*)
ALTER TABLE "TwilioAccount" ADD COLUMN IF NOT EXISTS "envKey" TEXT;
ALTER TABLE "TwilioAccount" ALTER COLUMN "authToken" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "TwilioAccount_envKey_key" ON "TwilioAccount"("envKey") WHERE "envKey" IS NOT NULL;

-- Add twilioAccountId to PurchasedPhoneNumber to track which account owns each number
ALTER TABLE "PurchasedPhoneNumber" ADD COLUMN IF NOT EXISTS "twilioAccountId" TEXT;
CREATE INDEX IF NOT EXISTS "PurchasedPhoneNumber_twilioAccountId_idx" ON "PurchasedPhoneNumber"("twilioAccountId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PurchasedPhoneNumber_twilioAccountId_fkey'
  ) THEN
    ALTER TABLE "PurchasedPhoneNumber" ADD CONSTRAINT "PurchasedPhoneNumber_twilioAccountId_fkey"
      FOREIGN KEY ("twilioAccountId") REFERENCES "TwilioAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
