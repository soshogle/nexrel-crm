-- CreateTable
CREATE TABLE "DocpenSessionAuditLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocpenSessionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocpenSessionAuditLog_sessionId_idx" ON "DocpenSessionAuditLog"("sessionId");

-- CreateIndex
CREATE INDEX "DocpenSessionAuditLog_event_idx" ON "DocpenSessionAuditLog"("event");

-- AddForeignKey
ALTER TABLE "DocpenSessionAuditLog" ADD CONSTRAINT "DocpenSessionAuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DocpenSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
