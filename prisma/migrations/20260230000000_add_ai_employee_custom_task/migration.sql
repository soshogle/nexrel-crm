-- CreateTable
CREATE TABLE "AIEmployeeCustomTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'industry',
    "industry" "Industry",
    "employeeType" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEmployeeCustomTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIEmployeeCustomTask_userId_source_industry_employeeType_taskKey_key" ON "AIEmployeeCustomTask"("userId", "source", "industry", "employeeType", "taskKey");

-- CreateIndex
CREATE INDEX "AIEmployeeCustomTask_userId_idx" ON "AIEmployeeCustomTask"("userId");

-- CreateIndex
CREATE INDEX "AIEmployeeCustomTask_employeeType_idx" ON "AIEmployeeCustomTask"("employeeType");

-- AddForeignKey
ALTER TABLE "AIEmployeeCustomTask" ADD CONSTRAINT "AIEmployeeCustomTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
