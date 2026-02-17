-- CreateTable
CREATE TABLE "REWebsiteReport" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT,
    "content" JSONB NOT NULL,
    "executiveSummary" TEXT,
    "pdfUrl" TEXT,
    "sourceReportId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "REWebsiteReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "REWebsiteReport_websiteId_idx" ON "REWebsiteReport"("websiteId");
CREATE INDEX "REWebsiteReport_userId_idx" ON "REWebsiteReport"("userId");
CREATE INDEX "REWebsiteReport_reportType_idx" ON "REWebsiteReport"("reportType");

-- AddForeignKey
ALTER TABLE "REWebsiteReport" ADD CONSTRAINT "REWebsiteReport_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "REWebsiteReport" ADD CONSTRAINT "REWebsiteReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
