-- CreateTable
CREATE TABLE "AIEmployeeDailySchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "industry" "Industry",
    "runAtTime" TEXT NOT NULL,
    "runAtTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "taskKeys" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEmployeeDailySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIEmployeeDailySchedule_userId_source_industry_employeeType_key" ON "AIEmployeeDailySchedule"("userId", "source", "industry", "employeeType");

-- CreateIndex
CREATE INDEX "AIEmployeeDailySchedule_userId_idx" ON "AIEmployeeDailySchedule"("userId");

-- CreateIndex
CREATE INDEX "AIEmployeeDailySchedule_employeeType_idx" ON "AIEmployeeDailySchedule"("employeeType");

-- CreateIndex
CREATE INDEX "AIEmployeeDailySchedule_enabled_idx" ON "AIEmployeeDailySchedule"("enabled");

-- AddForeignKey
ALTER TABLE "AIEmployeeDailySchedule" ADD CONSTRAINT "AIEmployeeDailySchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
