-- Website Builder Migration SQL
-- Generated: 2026-02-08
-- This migration adds all tables and enums for the website builder feature

-- Create Enums
CREATE TYPE "WebsiteType" AS ENUM ('REBUILT', 'SERVICE_TEMPLATE', 'PRODUCT_TEMPLATE');
CREATE TYPE "WebsiteStatus" AS ENUM ('BUILDING', 'READY', 'PUBLISHED', 'FAILED');
CREATE TYPE "WebsiteBuildType" AS ENUM ('INITIAL', 'REBUILD', 'UPDATE');
CREATE TYPE "WebsiteBuildStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE "WebsiteIntegrationType" AS ENUM ('STRIPE', 'BOOKING', 'FORM', 'CTA', 'CHAT', 'ANALYTICS');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
CREATE TYPE "ChangeType" AS ENUM ('AI_MODIFICATION', 'MANUAL_EDIT');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED');
CREATE TYPE "WebsiteTemplateType" AS ENUM ('SERVICE', 'PRODUCT');

-- Create Website Table
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WebsiteType" NOT NULL,
    "sourceUrl" TEXT,
    "templateType" "WebsiteTemplateType",
    "status" "WebsiteStatus" NOT NULL DEFAULT 'BUILDING',
    "buildProgress" INTEGER NOT NULL DEFAULT 0,
    "structure" JSONB NOT NULL,
    "seoData" JSONB NOT NULL,
    "extractedData" JSONB,
    "questionnaireAnswers" JSONB,
    "stripeConnectAccountId" TEXT,
    "elevenLabsAgentId" TEXT,
    "integrationsConfig" JSONB NOT NULL DEFAULT '{}',
    "githubRepoUrl" TEXT,
    "neonDatabaseUrl" TEXT,
    "vercelProjectId" TEXT,
    "vercelDeploymentUrl" TEXT,
    "voiceAIEnabled" BOOLEAN NOT NULL DEFAULT false,
    "voiceAIConfig" JSONB,
    "pendingChanges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- Create WebsiteBuild Table
CREATE TABLE "WebsiteBuild" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "buildType" "WebsiteBuildType" NOT NULL,
    "status" "WebsiteBuildStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "buildData" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteBuild_pkey" PRIMARY KEY ("id")
);

-- Create WebsiteIntegration Table
CREATE TABLE "WebsiteIntegration" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" "WebsiteIntegrationType" NOT NULL,
    "config" JSONB NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteIntegration_pkey" PRIMARY KEY ("id")
);

-- Create WebsiteVisitor Table
CREATE TABLE "WebsiteVisitor" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "pagesVisited" JSONB NOT NULL DEFAULT '[]',
    "interactions" JSONB NOT NULL DEFAULT '{}',
    "formData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteVisitor_pkey" PRIMARY KEY ("id")
);

-- Create WebsiteChangeApproval Table
CREATE TABLE "WebsiteChangeApproval" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changes" JSONB NOT NULL,
    "preview" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteChangeApproval_pkey" PRIMARY KEY ("id")
);

-- Create WebsiteTemplate Table
CREATE TABLE "WebsiteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WebsiteTemplateType" NOT NULL,
    "category" TEXT,
    "previewImage" TEXT,
    "structure" JSONB NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteTemplate_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE INDEX "Website_userId_idx" ON "Website"("userId");
CREATE INDEX "Website_status_idx" ON "Website"("status");
CREATE INDEX "Website_type_idx" ON "Website"("type");
CREATE INDEX "WebsiteBuild_websiteId_idx" ON "WebsiteBuild"("websiteId");
CREATE INDEX "WebsiteBuild_status_idx" ON "WebsiteBuild"("status");
CREATE INDEX "WebsiteIntegration_websiteId_idx" ON "WebsiteIntegration"("websiteId");
CREATE INDEX "WebsiteIntegration_type_idx" ON "WebsiteIntegration"("type");
CREATE INDEX "WebsiteVisitor_websiteId_idx" ON "WebsiteVisitor"("websiteId");
CREATE INDEX "WebsiteVisitor_sessionId_idx" ON "WebsiteVisitor"("sessionId");
CREATE INDEX "WebsiteVisitor_createdAt_idx" ON "WebsiteVisitor"("createdAt");
CREATE INDEX "WebsiteChangeApproval_websiteId_idx" ON "WebsiteChangeApproval"("websiteId");
CREATE INDEX "WebsiteChangeApproval_status_idx" ON "WebsiteChangeApproval"("status");
CREATE INDEX "WebsiteTemplate_type_idx" ON "WebsiteTemplate"("type");
CREATE INDEX "WebsiteTemplate_category_idx" ON "WebsiteTemplate"("category");

-- Add Foreign Keys
ALTER TABLE "Website" ADD CONSTRAINT "Website_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteBuild" ADD CONSTRAINT "WebsiteBuild_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteIntegration" ADD CONSTRAINT "WebsiteIntegration_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteVisitor" ADD CONSTRAINT "WebsiteVisitor_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteChangeApproval" ADD CONSTRAINT "WebsiteChangeApproval_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
