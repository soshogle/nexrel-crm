-- CreateTable
CREATE TABLE "AIEmployeeTaskSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "industry" "Industry",
    "taskKey" TEXT NOT NULL,
    "runAtTime" TEXT NOT NULL,
    "runAtTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEmployeeTaskSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIEmployeeTaskSchedule_userId_source_industry_employeeType_taskKey_key" ON "AIEmployeeTaskSchedule"("userId", "source", "industry", "employeeType", "taskKey");

-- CreateIndex
CREATE INDEX "AIEmployeeTaskSchedule_userId_idx" ON "AIEmployeeTaskSchedule"("userId");

-- CreateIndex
CREATE INDEX "AIEmployeeTaskSchedule_employeeType_idx" ON "AIEmployeeTaskSchedule"("employeeType");

-- AddForeignKey
ALTER TABLE "AIEmployeeTaskSchedule" ADD CONSTRAINT "AIEmployeeTaskSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
