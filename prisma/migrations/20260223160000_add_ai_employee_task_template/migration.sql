-- CreateTable
CREATE TABLE "AIEmployeeTaskTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "industry" "Industry",
    "employeeType" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "smsTemplate" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEmployeeTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIEmployeeTaskTemplate_userId_source_industry_employeeType_taskKey_key" ON "AIEmployeeTaskTemplate"("userId", "source", "industry", "employeeType", "taskKey");

-- CreateIndex
CREATE INDEX "AIEmployeeTaskTemplate_userId_idx" ON "AIEmployeeTaskTemplate"("userId");

-- AddForeignKey
ALTER TABLE "AIEmployeeTaskTemplate" ADD CONSTRAINT "AIEmployeeTaskTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
