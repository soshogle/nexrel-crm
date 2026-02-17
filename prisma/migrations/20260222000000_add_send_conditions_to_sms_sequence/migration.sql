-- AlterTable
ALTER TABLE "SmsSequence" ADD COLUMN IF NOT EXISTS "sendConditions" JSONB;
