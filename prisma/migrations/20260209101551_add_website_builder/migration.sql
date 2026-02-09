-- Website Builder Migration SQL
-- Migration already applied manually in Neon SQL Editor
-- This file exists to sync Prisma migration state
-- All tables and enums already exist, so this migration uses IF NOT EXISTS checks

-- Create Enums (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteType') THEN
        CREATE TYPE "WebsiteType" AS ENUM ('REBUILT', 'SERVICE_TEMPLATE', 'PRODUCT_TEMPLATE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteStatus') THEN
        CREATE TYPE "WebsiteStatus" AS ENUM ('BUILDING', 'READY', 'PUBLISHED', 'FAILED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteBuildType') THEN
        CREATE TYPE "WebsiteBuildType" AS ENUM ('INITIAL', 'REBUILD', 'UPDATE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteBuildStatus') THEN
        CREATE TYPE "WebsiteBuildStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteIntegrationType') THEN
        CREATE TYPE "WebsiteIntegrationType" AS ENUM ('STRIPE', 'BOOKING', 'FORM', 'CTA', 'CHAT', 'ANALYTICS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationStatus') THEN
        CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChangeType') THEN
        CREATE TYPE "ChangeType" AS ENUM ('AI_MODIFICATION', 'MANUAL_EDIT');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalStatus') THEN
        CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteTemplateType') THEN
        CREATE TYPE "WebsiteTemplateType" AS ENUM ('SERVICE', 'PRODUCT');
    END IF;
END $$;

-- Create Website Table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Website" (
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

-- Create WebsiteBuild Table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "WebsiteBuild" (
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

-- Create WebsiteIntegration Table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "WebsiteIntegration" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" "WebsiteIntegrationType" NOT NULL,
    "config" JSONB NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteIntegration_pkey" PRIMARY KEY ("id")
);

-- Create WebsiteVisitor Table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "WebsiteVisitor" (
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

-- Create WebsiteChangeApproval Table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "WebsiteChangeApproval" (
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

-- Create WebsiteTemplate Table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "WebsiteTemplate" (
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

-- Create Indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS "Website_userId_idx" ON "Website"("userId");
CREATE INDEX IF NOT EXISTS "Website_status_idx" ON "Website"("status");
CREATE INDEX IF NOT EXISTS "Website_type_idx" ON "Website"("type");
CREATE INDEX IF NOT EXISTS "WebsiteBuild_websiteId_idx" ON "WebsiteBuild"("websiteId");
CREATE INDEX IF NOT EXISTS "WebsiteBuild_status_idx" ON "WebsiteBuild"("status");
CREATE INDEX IF NOT EXISTS "WebsiteIntegration_websiteId_idx" ON "WebsiteIntegration"("websiteId");
CREATE INDEX IF NOT EXISTS "WebsiteIntegration_type_idx" ON "WebsiteIntegration"("type");
CREATE INDEX IF NOT EXISTS "WebsiteVisitor_websiteId_idx" ON "WebsiteVisitor"("websiteId");
CREATE INDEX IF NOT EXISTS "WebsiteVisitor_sessionId_idx" ON "WebsiteVisitor"("sessionId");
CREATE INDEX IF NOT EXISTS "WebsiteVisitor_createdAt_idx" ON "WebsiteVisitor"("createdAt");
CREATE INDEX IF NOT EXISTS "WebsiteChangeApproval_websiteId_idx" ON "WebsiteChangeApproval"("websiteId");
CREATE INDEX IF NOT EXISTS "WebsiteChangeApproval_status_idx" ON "WebsiteChangeApproval"("status");
CREATE INDEX IF NOT EXISTS "WebsiteTemplate_type_idx" ON "WebsiteTemplate"("type");
CREATE INDEX IF NOT EXISTS "WebsiteTemplate_category_idx" ON "WebsiteTemplate"("category");

-- Add Foreign Keys (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Website_userId_fkey'
    ) THEN
        ALTER TABLE "Website" ADD CONSTRAINT "Website_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteBuild_websiteId_fkey'
    ) THEN
        ALTER TABLE "WebsiteBuild" ADD CONSTRAINT "WebsiteBuild_websiteId_fkey" 
        FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteIntegration_websiteId_fkey'
    ) THEN
        ALTER TABLE "WebsiteIntegration" ADD CONSTRAINT "WebsiteIntegration_websiteId_fkey" 
        FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteVisitor_websiteId_fkey'
    ) THEN
        ALTER TABLE "WebsiteVisitor" ADD CONSTRAINT "WebsiteVisitor_websiteId_fkey" 
        FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteChangeApproval_websiteId_fkey'
    ) THEN
        ALTER TABLE "WebsiteChangeApproval" ADD CONSTRAINT "WebsiteChangeApproval_websiteId_fkey" 
        FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
