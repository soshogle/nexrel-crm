-- CreateEnum
CREATE TYPE "VnaType" AS ENUM ('ORTHANC', 'AWS_S3', 'AZURE_BLOB', 'CLOUD_VNA', 'OTHER');

-- CreateTable
CREATE TABLE "VnaConfiguration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VnaType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "endpoint" TEXT,
    "aeTitle" TEXT,
    "host" TEXT,
    "port" INTEGER,
    "credentials" JSONB,
    "bucket" TEXT,
    "region" TEXT,
    "pathPrefix" TEXT,
    "routingRules" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VnaConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VnaConfiguration_userId_idx" ON "VnaConfiguration"("userId");

-- CreateIndex
CREATE INDEX "VnaConfiguration_isActive_idx" ON "VnaConfiguration"("isActive");

-- CreateIndex
CREATE INDEX "VnaConfiguration_type_idx" ON "VnaConfiguration"("type");

-- AddForeignKey
ALTER TABLE "VnaConfiguration" ADD CONSTRAINT "VnaConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
