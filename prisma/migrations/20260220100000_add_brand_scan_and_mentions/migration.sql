-- CreateTable
CREATE TABLE "BrandScan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "businessName" TEXT NOT NULL,
    "location" TEXT,
    "sources" JSONB,
    "reviewsFound" INTEGER NOT NULL DEFAULT 0,
    "mentionsFound" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanId" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "title" TEXT,
    "snippet" TEXT NOT NULL,
    "fullText" TEXT,
    "authorName" TEXT,
    "rating" INTEGER,
    "sentiment" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "themes" JSONB,
    "aiSummary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "importedAsReviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandScan_userId_idx" ON "BrandScan"("userId");
CREATE INDEX "BrandScan_status_idx" ON "BrandScan"("status");
CREATE INDEX "BrandMention_userId_idx" ON "BrandMention"("userId");
CREATE INDEX "BrandMention_scanId_idx" ON "BrandMention"("scanId");
CREATE INDEX "BrandMention_source_idx" ON "BrandMention"("source");
CREATE INDEX "BrandMention_sentiment_idx" ON "BrandMention"("sentiment");

-- AddForeignKey
ALTER TABLE "BrandScan" ADD CONSTRAINT "BrandScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandMention" ADD CONSTRAINT "BrandMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandMention" ADD CONSTRAINT "BrandMention_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "BrandScan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
