-- CreateTable
CREATE TABLE "AIEmployeeAutoRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeType" TEXT NOT NULL,
    "industry" "Industry",
    "autoRunEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEmployeeAutoRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIEmployeeAutoRun_userId_employeeType_industry_key" ON "AIEmployeeAutoRun"("userId", "employeeType", "industry");

-- CreateIndex
CREATE INDEX "AIEmployeeAutoRun_userId_idx" ON "AIEmployeeAutoRun"("userId");

-- CreateIndex
CREATE INDEX "AIEmployeeAutoRun_employeeType_idx" ON "AIEmployeeAutoRun"("employeeType");

-- AddForeignKey
ALTER TABLE "AIEmployeeAutoRun" ADD CONSTRAINT "AIEmployeeAutoRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
