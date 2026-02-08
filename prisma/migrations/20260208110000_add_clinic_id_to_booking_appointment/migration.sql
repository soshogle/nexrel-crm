-- Add clinicId to BookingAppointment for multi-clinic support

-- Add clinicId column
ALTER TABLE "BookingAppointment" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;

-- Create index for clinicId
CREATE INDEX IF NOT EXISTS "BookingAppointment_clinicId_idx" ON "BookingAppointment"("clinicId");

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BookingAppointment_clinicId_fkey'
    ) THEN
        ALTER TABLE "BookingAppointment" ADD CONSTRAINT "BookingAppointment_clinicId_fkey"
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Migrate existing data: assign clinicId based on userId's primary clinic
UPDATE "BookingAppointment" ba
SET "clinicId" = (
    SELECT uc."clinicId"
    FROM "UserClinic" uc
    WHERE uc."userId" = ba."userId"
    AND uc."isPrimary" = true
    LIMIT 1
)
WHERE "clinicId" IS NULL;
