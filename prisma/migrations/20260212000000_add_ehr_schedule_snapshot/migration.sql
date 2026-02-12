-- CreateTable
CREATE TABLE "EhrScheduleSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT,
    "ehrType" TEXT NOT NULL,
    "captureDate" TIMESTAMP(3) NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availability" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'screenshot',

    CONSTRAINT "EhrScheduleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EhrScheduleSnapshot_userId_idx" ON "EhrScheduleSnapshot"("userId");

-- CreateIndex
CREATE INDEX "EhrScheduleSnapshot_userId_captureDate_idx" ON "EhrScheduleSnapshot"("userId", "captureDate");

-- AddForeignKey
ALTER TABLE "EhrScheduleSnapshot" ADD CONSTRAINT "EhrScheduleSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
