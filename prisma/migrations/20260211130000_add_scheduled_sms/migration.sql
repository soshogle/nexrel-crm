-- CreateTable
CREATE TABLE "ScheduledSms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "toName" TEXT,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledSms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledSms_userId_idx" ON "ScheduledSms"("userId");

-- CreateIndex
CREATE INDEX "ScheduledSms_status_idx" ON "ScheduledSms"("status");

-- CreateIndex
CREATE INDEX "ScheduledSms_scheduledFor_idx" ON "ScheduledSms"("scheduledFor");

-- AddForeignKey
ALTER TABLE "ScheduledSms" ADD CONSTRAINT "ScheduledSms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledSms" ADD CONSTRAINT "ScheduledSms_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
