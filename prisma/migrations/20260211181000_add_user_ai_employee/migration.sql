-- CreateTable
CREATE TABLE "UserAIEmployee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "voiceAgentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAIEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAIEmployee_userId_idx" ON "UserAIEmployee"("userId");

-- CreateIndex
CREATE INDEX "UserAIEmployee_profession_idx" ON "UserAIEmployee"("profession");

-- AddForeignKey
ALTER TABLE "UserAIEmployee" ADD CONSTRAINT "UserAIEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
