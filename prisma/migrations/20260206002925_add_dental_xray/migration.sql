-- CreateTable
CREATE TABLE "DentalXRay" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dicomFile" TEXT,
    "imageFile" TEXT,
    "imageUrl" TEXT,
    "xrayType" TEXT NOT NULL,
    "teethIncluded" TEXT[],
    "dateTaken" TIMESTAMP(3) NOT NULL,
    "aiAnalysis" JSONB,
    "aiAnalyzedAt" TIMESTAMP(3),
    "aiModel" TEXT,
    "comparedToXRayId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalXRay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalXRay_leadId_idx" ON "DentalXRay"("leadId");

-- CreateIndex
CREATE INDEX "DentalXRay_userId_idx" ON "DentalXRay"("userId");

-- CreateIndex
CREATE INDEX "DentalXRay_dateTaken_idx" ON "DentalXRay"("dateTaken");

-- CreateIndex
CREATE INDEX "DentalXRay_xrayType_idx" ON "DentalXRay"("xrayType");

-- AddForeignKey
ALTER TABLE "DentalXRay" ADD CONSTRAINT "DentalXRay_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalXRay" ADD CONSTRAINT "DentalXRay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
