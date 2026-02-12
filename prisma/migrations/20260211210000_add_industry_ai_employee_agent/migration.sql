-- CreateTable
CREATE TABLE "IndustryAIEmployeeAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "employeeType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "elevenLabsAgentId" TEXT NOT NULL,
    "twilioPhoneNumber" TEXT,
    "voiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryAIEmployeeAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndustryAIEmployeeAgent_userId_industry_employeeType_key" ON "IndustryAIEmployeeAgent"("userId", "industry", "employeeType");

-- CreateIndex
CREATE INDEX "IndustryAIEmployeeAgent_userId_idx" ON "IndustryAIEmployeeAgent"("userId");

-- CreateIndex
CREATE INDEX "IndustryAIEmployeeAgent_industry_idx" ON "IndustryAIEmployeeAgent"("industry");

-- CreateIndex
CREATE INDEX "IndustryAIEmployeeAgent_elevenLabsAgentId_idx" ON "IndustryAIEmployeeAgent"("elevenLabsAgentId");

-- AddForeignKey
ALTER TABLE "IndustryAIEmployeeAgent" ADD CONSTRAINT "IndustryAIEmployeeAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
