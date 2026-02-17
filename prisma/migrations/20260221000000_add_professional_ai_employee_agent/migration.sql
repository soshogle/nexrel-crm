-- CreateEnum
CREATE TYPE "ProfessionalAIEmployeeType" AS ENUM (
  'ACCOUNTANT',
  'DEVELOPER',
  'LEGAL_ASSISTANT',
  'RESEARCHER',
  'MARKETING_SPECIALIST',
  'SALES_REPRESENTATIVE',
  'CUSTOMER_SUPPORT',
  'HR_SPECIALIST',
  'DATA_ANALYST',
  'CONTENT_WRITER',
  'FINANCIAL_ADVISOR',
  'PROJECT_MANAGER'
);

-- CreateTable
CREATE TABLE "ProfessionalAIEmployeeAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeType" "ProfessionalAIEmployeeType" NOT NULL,
    "name" TEXT NOT NULL,
    "elevenLabsAgentId" TEXT NOT NULL,
    "twilioPhoneNumber" TEXT,
    "voiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "jurisdiction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalAIEmployeeAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalAIEmployeeAgent_userId_employeeType_key" ON "ProfessionalAIEmployeeAgent"("userId", "employeeType");

-- CreateIndex
CREATE INDEX "ProfessionalAIEmployeeAgent_userId_idx" ON "ProfessionalAIEmployeeAgent"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalAIEmployeeAgent_employeeType_idx" ON "ProfessionalAIEmployeeAgent"("employeeType");

-- CreateIndex
CREATE INDEX "ProfessionalAIEmployeeAgent_elevenLabsAgentId_idx" ON "ProfessionalAIEmployeeAgent"("elevenLabsAgentId");

-- AddForeignKey
ALTER TABLE "ProfessionalAIEmployeeAgent" ADD CONSTRAINT "ProfessionalAIEmployeeAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
