-- CreateTable
CREATE TABLE "IndustryAIEmployeeExecution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "employeeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndustryAIEmployeeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEmployeeTaskConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "industry" "Industry",
    "employeeType" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL DEFAULT 'run',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEmployeeTaskConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndustryAIEmployeeExecution_userId_idx" ON "IndustryAIEmployeeExecution"("userId");

-- CreateIndex
CREATE INDEX "IndustryAIEmployeeExecution_industry_idx" ON "IndustryAIEmployeeExecution"("industry");

-- CreateIndex
CREATE INDEX "IndustryAIEmployeeExecution_employeeType_idx" ON "IndustryAIEmployeeExecution"("employeeType");

-- CreateIndex
CREATE INDEX "IndustryAIEmployeeExecution_createdAt_idx" ON "IndustryAIEmployeeExecution"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIEmployeeTaskConfig_userId_source_industry_employeeType_taskKey_key" ON "AIEmployeeTaskConfig"("userId", "source", "industry", "employeeType", "taskKey");

-- CreateIndex
CREATE INDEX "AIEmployeeTaskConfig_userId_idx" ON "AIEmployeeTaskConfig"("userId");

-- CreateIndex
CREATE INDEX "AIEmployeeTaskConfig_employeeType_idx" ON "AIEmployeeTaskConfig"("employeeType");

-- AddForeignKey
ALTER TABLE "IndustryAIEmployeeExecution" ADD CONSTRAINT "IndustryAIEmployeeExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEmployeeTaskConfig" ADD CONSTRAINT "AIEmployeeTaskConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
