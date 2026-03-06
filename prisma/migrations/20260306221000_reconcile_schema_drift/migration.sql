-- CreateEnum
CREATE TYPE "RERentalStatus" AS ENUM ('ACTIVE', 'RENTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RecallStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'SCHEDULED', 'COMPLETED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "PaymentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'DEFAULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrthoTreatmentType" AS ENUM ('ALIGNER', 'BRACES', 'RETAINER', 'APPLIANCE');

-- CreateEnum
CREATE TYPE "OrthoTreatmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrthoArch" AS ENUM ('UPPER', 'LOWER', 'BOTH');

-- CreateEnum
CREATE TYPE "OrthoCaptureSource" AS ENUM ('PATIENT_APP', 'IN_CLINIC', 'MANUAL_UPLOAD');

-- CreateEnum
CREATE TYPE "OrthoCaptureType" AS ENUM ('GUIDED_PHOTO_SET');

-- CreateEnum
CREATE TYPE "OrthoCaptureStatus" AS ENUM ('PENDING_UPLOAD', 'READY_FOR_ANALYSIS', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrthoCaptureViewType" AS ENUM ('FRONTAL', 'LEFT_BUCCAL', 'RIGHT_BUCCAL', 'UPPER_OCCLUSAL', 'LOWER_OCCLUSAL');

-- CreateEnum
CREATE TYPE "OrthoAssessmentUrgency" AS ENUM ('ROUTINE', 'SOON', 'URGENT');

-- CreateEnum
CREATE TYPE "OrthoRecommendationAction" AS ENUM ('REINFORCE_WEAR', 'RECAPTURE', 'EARLY_VISIT', 'ELASTIC_PROTOCOL_REVIEW', 'REFINEMENT_REVIEW');

-- CreateEnum
CREATE TYPE "OrthoRecommendationStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DISMISSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OrthoComplianceSource" AS ENUM ('PATIENT_SELF_REPORT', 'DEVICE_SYNC', 'STAFF_ENTRY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DripTriggerType" ADD VALUE 'WEBSITE_SECRET_REPORT_LEAD';
ALTER TYPE "DripTriggerType" ADD VALUE 'WEBSITE_CONTACT_FORM_LEAD';

-- AlterEnum
ALTER TYPE "Industry" ADD VALUE 'RETAIL';

-- AlterEnum
ALTER TYPE "SmsCampaignStatus" ADD VALUE 'ACTIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowActionType" ADD VALUE 'CREATE_WEBSITE';
ALTER TYPE "WorkflowActionType" ADD VALUE 'UPDATE_WEBSITE_CONTENT';
ALTER TYPE "WorkflowActionType" ADD VALUE 'ADD_PAYMENT_SECTION';
ALTER TYPE "WorkflowActionType" ADD VALUE 'ADD_BOOKING_WIDGET';
ALTER TYPE "WorkflowActionType" ADD VALUE 'ADD_LEAD_FORM';
ALTER TYPE "WorkflowActionType" ADD VALUE 'ADD_CTA_BUTTON';
ALTER TYPE "WorkflowActionType" ADD VALUE 'PUBLISH_WEBSITE';

-- AlterEnum
ALTER TYPE "WorkflowEnrollmentStatus" ADD VALUE 'PAUSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_VISITOR';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_FORM_SUBMITTED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_PAYMENT_RECEIVED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_BOOKING_CREATED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_CTA_CLICKED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_PAGE_VIEWED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_PRODUCT_LOW_STOCK';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_PRODUCT_OUT_OF_STOCK';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_PRODUCT_BACK_IN_STOCK';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_ORDER_CREATED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_PAYMENT_AMOUNT_THRESHOLD';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_CUSTOMER_TIER_CHANGED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_REPEAT_CUSTOMER';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_FIRST_TIME_CUSTOMER';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_PRODUCT_PURCHASED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_CART_VALUE_THRESHOLD';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_VISITOR_PAGE_VIEWED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_VISITOR_TIME_ON_SITE';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_VISITOR_PAGES_VIEWED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_VISITOR_CTA_CLICKED';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_VISITOR_RETURNING';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_VISITOR_ABANDONED_CART';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_REVENUE_MILESTONE';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_ORDER_COUNT_MILESTONE';
ALTER TYPE "WorkflowTriggerType" ADD VALUE 'WEBSITE_DAILY_REVENUE_THRESHOLD';

-- AlterTable
ALTER TABLE "DentalForm" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalFormResponse" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalInsuranceClaim" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalLabOrder" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalOdontogram" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalPeriodontalChart" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalProcedure" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalTreatmentPlan" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DentalXRay" ADD COLUMN     "compressedSize" INTEGER,
ADD COLUMN     "compressionRatio" DOUBLE PRECISION,
ADD COLUMN     "fullUrl" TEXT,
ADD COLUMN     "originalSize" INTEGER,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "storagePaths" JSONB,
ADD COLUMN     "thumbnailUrl" TEXT,
ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PatientDocument" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "REDNCEntry" ALTER COLUMN "country" SET DEFAULT 'CA';

-- AlterTable
ALTER TABLE "REMarketStats" ADD COLUMN     "avgAskingPrice" DOUBLE PRECISION,
ADD COLUMN     "buildingType" TEXT,
ADD COLUMN     "closePriceToAskingRatio" DOUBLE PRECISION,
ADD COLUMN     "closePriceToOriginalRatio" DOUBLE PRECISION,
ADD COLUMN     "expiredListings" INTEGER,
ADD COLUMN     "medianAskingPrice" DOUBLE PRECISION,
ADD COLUMN     "numberOfSales" INTEGER,
ADD COLUMN     "priceRange" TEXT,
ADD COLUMN     "propertyType" TEXT,
ADD COLUMN     "sampleSize" INTEGER,
ADD COLUMN     "sellingTimeMedian" INTEGER,
ADD COLUMN     "sourceFile" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "periodType" SET DEFAULT 'MONTHLY',
ALTER COLUMN "country" SET DEFAULT 'CA';

-- AlterTable
ALTER TABLE "REProperty" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ALTER COLUMN "country" SET DEFAULT 'CA';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeWorkflowDraftId" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'CA';

-- AlterTable
ALTER TABLE "UserClinic" ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "isPrimary" SET NOT NULL;

-- AlterTable
ALTER TABLE "VnaConfiguration" ALTER COLUMN "clinicId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "facebookPixelId" TEXT,
ADD COLUMN     "googleAnalyticsId" TEXT;

-- AlterTable
ALTER TABLE "WorkflowTask" ADD COLUMN     "abTestGroup" TEXT,
ADD COLUMN     "delayDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "delayHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isAbTestVariant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWhatIfBranch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredSendTime" TEXT,
ADD COLUMN     "skipConditions" JSONB,
ADD COLUMN     "variantOf" TEXT;

-- AlterTable
ALTER TABLE "WorkflowTemplate" ADD COLUMN     "abTestConfig" JSONB,
ADD COLUMN     "analytics" JSONB,
ADD COLUMN     "audience" JSONB,
ADD COLUMN     "campaignSettings" JSONB,
ADD COLUMN     "clickRate" DOUBLE PRECISION,
ADD COLUMN     "clickedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveredCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryRate" DOUBLE PRECISION,
ADD COLUMN     "enableAbTesting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enrollmentMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enrollmentTriggers" JSONB,
ADD COLUMN     "executionMode" TEXT,
ADD COLUMN     "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openRate" DOUBLE PRECISION,
ADD COLUMN     "openedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repliedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replyRate" DOUBLE PRECISION,
ADD COLUMN     "sentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRecipients" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "ClinicStatus";

-- CreateTable
CREATE TABLE "AiGeneratedReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "period" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RERentalListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "unit" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'CA',
    "beds" INTEGER,
    "baths" DOUBLE PRECISION,
    "sqft" INTEGER,
    "propertyType" "REPropertyType" NOT NULL DEFAULT 'CONDO',
    "listingStatus" "RERentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "rentPrice" DOUBLE PRECISION,
    "rentPriceLabel" TEXT,
    "mlsNumber" TEXT,
    "daysOnMarket" INTEGER NOT NULL DEFAULT 0,
    "photos" JSONB,
    "description" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "listingDate" TIMESTAMP(3),
    "rentedDate" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RERentalListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "REPriceChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "rentalId" TEXT,
    "mlsNumber" TEXT,
    "address" TEXT NOT NULL,
    "oldPrice" DOUBLE PRECISION,
    "newPrice" DOUBLE PRECISION,
    "changeType" TEXT NOT NULL,
    "changePercent" DOUBLE PRECISION,
    "listingType" TEXT NOT NULL DEFAULT 'sale',
    "source" TEXT,
    "sourceUrl" TEXT,
    "syncedToWebsite" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "REPriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplateEnrollment" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "WorkflowEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "nextSendAt" TIMESTAMP(3),
    "abTestGroup" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "WorkflowTemplateEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalRecall" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "recallType" TEXT NOT NULL,
    "intervalWeeks" INTEGER NOT NULL,
    "status" "RecallStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastVisitDate" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "daysOverdue" INTEGER,
    "autoSchedule" BOOLEAN NOT NULL DEFAULT false,
    "preferredDay" TEXT,
    "preferredTime" TEXT,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "appointmentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalRecall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalPaymentPlan" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numberOfPayments" INTEGER NOT NULL,
    "paymentAmount" DOUBLE PRECISION NOT NULL,
    "paymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextPaymentDate" TIMESTAMP(3),
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "treatmentPlanId" TEXT,
    "orthoTreatmentId" TEXT,
    "installments" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalPaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrthoTreatment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "treatmentType" "OrthoTreatmentType" NOT NULL,
    "status" "OrthoTreatmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "estimatedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "arch" "OrthoArch" NOT NULL DEFAULT 'BOTH',
    "notes" TEXT,
    "alignerBrand" TEXT,
    "alignerCaseNumber" TEXT,
    "totalAligners" INTEGER,
    "currentAligner" INTEGER,
    "wearSchedule" INTEGER DEFAULT 22,
    "changeFrequency" INTEGER DEFAULT 14,
    "nextChangeDate" TIMESTAMP(3),
    "refinementNumber" INTEGER DEFAULT 0,
    "clinCheckUrl" TEXT,
    "iprPlan" JSONB,
    "bracketSystem" TEXT,
    "upperWire" TEXT,
    "lowerWire" TEXT,
    "elasticConfig" TEXT,
    "ligatureType" TEXT,
    "bracketsPlaced" JSONB,
    "retainerType" TEXT,
    "wearInstructions" TEXT,
    "applianceType" TEXT,
    "applianceDetails" TEXT,
    "visits" JSONB,
    "treatmentPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthoTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrthoCaptureSession" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "orthoTreatmentId" TEXT,
    "source" "OrthoCaptureSource" NOT NULL DEFAULT 'PATIENT_APP',
    "captureType" "OrthoCaptureType" NOT NULL DEFAULT 'GUIDED_PHOTO_SET',
    "status" "OrthoCaptureStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "qualityScore" DOUBLE PRECISION,
    "qualityIssues" TEXT[],
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthoCaptureSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrthoCaptureAsset" (
    "id" TEXT NOT NULL,
    "captureSessionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "viewType" "OrthoCaptureViewType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthoCaptureAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrthoProgressAssessment" (
    "id" TEXT NOT NULL,
    "captureSessionId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "orthoTreatmentId" TEXT,
    "modelVersion" TEXT NOT NULL,
    "overallRiskScore" DOUBLE PRECISION NOT NULL,
    "driftScore" DOUBLE PRECISION NOT NULL,
    "complianceScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "urgency" "OrthoAssessmentUrgency" NOT NULL DEFAULT 'ROUTINE',
    "predictedDelayDays" INTEGER,
    "driverTags" TEXT[],
    "findings" JSONB NOT NULL,
    "recommendedActions" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthoProgressAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrthoRecommendation" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "actionType" "OrthoRecommendationAction" NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "expectedImpact" TEXT,
    "status" "OrthoRecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "clinicianNote" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "linkedTaskId" TEXT,
    "linkedAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthoRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrthoComplianceSignal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "orthoTreatmentId" TEXT,
    "source" "OrthoComplianceSource" NOT NULL,
    "wearHours" DOUBLE PRECISION,
    "elasticsAdherence" DOUBLE PRECISION,
    "painScore" INTEGER,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrthoComplianceSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteProduct" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "displayOrder" INTEGER,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteOrder" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteStockSettings" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "outOfStockAction" TEXT NOT NULL DEFAULT 'HIDE',
    "syncInventory" BOOLEAN NOT NULL DEFAULT true,
    "autoHideOutOfStock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteStockSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteRouting" (
    "websiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteRouting_pkey" PRIMARY KEY ("websiteId")
);

-- CreateIndex
CREATE INDEX "AiGeneratedReport_userId_idx" ON "AiGeneratedReport"("userId");

-- CreateIndex
CREATE INDEX "AiGeneratedReport_createdAt_idx" ON "AiGeneratedReport"("createdAt");

-- CreateIndex
CREATE INDEX "RERentalListing_userId_idx" ON "RERentalListing"("userId");

-- CreateIndex
CREATE INDEX "RERentalListing_city_state_idx" ON "RERentalListing"("city", "state");

-- CreateIndex
CREATE INDEX "RERentalListing_listingStatus_idx" ON "RERentalListing"("listingStatus");

-- CreateIndex
CREATE INDEX "RERentalListing_mlsNumber_idx" ON "RERentalListing"("mlsNumber");

-- CreateIndex
CREATE INDEX "REPriceChange_userId_idx" ON "REPriceChange"("userId");

-- CreateIndex
CREATE INDEX "REPriceChange_propertyId_idx" ON "REPriceChange"("propertyId");

-- CreateIndex
CREATE INDEX "REPriceChange_rentalId_idx" ON "REPriceChange"("rentalId");

-- CreateIndex
CREATE INDEX "REPriceChange_mlsNumber_idx" ON "REPriceChange"("mlsNumber");

-- CreateIndex
CREATE INDEX "REPriceChange_detectedAt_idx" ON "REPriceChange"("detectedAt");

-- CreateIndex
CREATE INDEX "WorkflowTemplateEnrollment_workflowId_idx" ON "WorkflowTemplateEnrollment"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowTemplateEnrollment_leadId_idx" ON "WorkflowTemplateEnrollment"("leadId");

-- CreateIndex
CREATE INDEX "WorkflowTemplateEnrollment_status_idx" ON "WorkflowTemplateEnrollment"("status");

-- CreateIndex
CREATE INDEX "WorkflowTemplateEnrollment_nextSendAt_idx" ON "WorkflowTemplateEnrollment"("nextSendAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTemplateEnrollment_workflowId_leadId_key" ON "WorkflowTemplateEnrollment"("workflowId", "leadId");

-- CreateIndex
CREATE INDEX "DentalRecall_leadId_idx" ON "DentalRecall"("leadId");

-- CreateIndex
CREATE INDEX "DentalRecall_userId_idx" ON "DentalRecall"("userId");

-- CreateIndex
CREATE INDEX "DentalRecall_clinicId_idx" ON "DentalRecall"("clinicId");

-- CreateIndex
CREATE INDEX "DentalRecall_status_idx" ON "DentalRecall"("status");

-- CreateIndex
CREATE INDEX "DentalRecall_nextDueDate_idx" ON "DentalRecall"("nextDueDate");

-- CreateIndex
CREATE INDEX "DentalPaymentPlan_leadId_idx" ON "DentalPaymentPlan"("leadId");

-- CreateIndex
CREATE INDEX "DentalPaymentPlan_userId_idx" ON "DentalPaymentPlan"("userId");

-- CreateIndex
CREATE INDEX "DentalPaymentPlan_clinicId_idx" ON "DentalPaymentPlan"("clinicId");

-- CreateIndex
CREATE INDEX "DentalPaymentPlan_status_idx" ON "DentalPaymentPlan"("status");

-- CreateIndex
CREATE INDEX "OrthoTreatment_leadId_idx" ON "OrthoTreatment"("leadId");

-- CreateIndex
CREATE INDEX "OrthoTreatment_userId_idx" ON "OrthoTreatment"("userId");

-- CreateIndex
CREATE INDEX "OrthoTreatment_clinicId_idx" ON "OrthoTreatment"("clinicId");

-- CreateIndex
CREATE INDEX "OrthoTreatment_treatmentType_idx" ON "OrthoTreatment"("treatmentType");

-- CreateIndex
CREATE INDEX "OrthoTreatment_status_idx" ON "OrthoTreatment"("status");

-- CreateIndex
CREATE INDEX "OrthoCaptureSession_leadId_idx" ON "OrthoCaptureSession"("leadId");

-- CreateIndex
CREATE INDEX "OrthoCaptureSession_userId_idx" ON "OrthoCaptureSession"("userId");

-- CreateIndex
CREATE INDEX "OrthoCaptureSession_clinicId_idx" ON "OrthoCaptureSession"("clinicId");

-- CreateIndex
CREATE INDEX "OrthoCaptureSession_orthoTreatmentId_idx" ON "OrthoCaptureSession"("orthoTreatmentId");

-- CreateIndex
CREATE INDEX "OrthoCaptureSession_capturedAt_idx" ON "OrthoCaptureSession"("capturedAt");

-- CreateIndex
CREATE INDEX "OrthoCaptureSession_status_idx" ON "OrthoCaptureSession"("status");

-- CreateIndex
CREATE INDEX "OrthoCaptureAsset_captureSessionId_idx" ON "OrthoCaptureAsset"("captureSessionId");

-- CreateIndex
CREATE INDEX "OrthoCaptureAsset_documentId_idx" ON "OrthoCaptureAsset"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "OrthoCaptureAsset_captureSessionId_viewType_key" ON "OrthoCaptureAsset"("captureSessionId", "viewType");

-- CreateIndex
CREATE INDEX "OrthoProgressAssessment_leadId_generatedAt_idx" ON "OrthoProgressAssessment"("leadId", "generatedAt");

-- CreateIndex
CREATE INDEX "OrthoProgressAssessment_userId_generatedAt_idx" ON "OrthoProgressAssessment"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "OrthoProgressAssessment_urgency_idx" ON "OrthoProgressAssessment"("urgency");

-- CreateIndex
CREATE INDEX "OrthoProgressAssessment_captureSessionId_idx" ON "OrthoProgressAssessment"("captureSessionId");

-- CreateIndex
CREATE INDEX "OrthoRecommendation_leadId_status_idx" ON "OrthoRecommendation"("leadId", "status");

-- CreateIndex
CREATE INDEX "OrthoRecommendation_userId_status_idx" ON "OrthoRecommendation"("userId", "status");

-- CreateIndex
CREATE INDEX "OrthoRecommendation_assessmentId_idx" ON "OrthoRecommendation"("assessmentId");

-- CreateIndex
CREATE INDEX "OrthoComplianceSignal_leadId_recordedAt_idx" ON "OrthoComplianceSignal"("leadId", "recordedAt");

-- CreateIndex
CREATE INDEX "OrthoComplianceSignal_userId_recordedAt_idx" ON "OrthoComplianceSignal"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "OrthoComplianceSignal_clinicId_recordedAt_idx" ON "OrthoComplianceSignal"("clinicId", "recordedAt");

-- CreateIndex
CREATE INDEX "WebsiteProduct_websiteId_idx" ON "WebsiteProduct"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteProduct_productId_idx" ON "WebsiteProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteProduct_websiteId_productId_key" ON "WebsiteProduct"("websiteId", "productId");

-- CreateIndex
CREATE INDEX "WebsiteOrder_websiteId_idx" ON "WebsiteOrder"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteOrder_orderId_idx" ON "WebsiteOrder"("orderId");

-- CreateIndex
CREATE INDEX "WebsiteOrder_customerId_idx" ON "WebsiteOrder"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteOrder_websiteId_orderId_key" ON "WebsiteOrder"("websiteId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteStockSettings_websiteId_key" ON "WebsiteStockSettings"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteStockSettings_websiteId_idx" ON "WebsiteStockSettings"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteRouting_userId_idx" ON "WebsiteRouting"("userId");

-- CreateIndex
CREATE INDEX "WebsiteRouting_industry_idx" ON "WebsiteRouting"("industry");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_claimNumber_idx" ON "DentalInsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "DentalLabOrder_orderNumber_idx" ON "DentalLabOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "REMarketStats_propertyCategory_idx" ON "REMarketStats"("propertyCategory");

-- CreateIndex
CREATE INDEX "REMarketStats_userId_region_propertyCategory_periodType_idx" ON "REMarketStats"("userId", "region", "propertyCategory", "periodType");

-- CreateIndex
CREATE INDEX "UserClinic_isPrimary_idx" ON "UserClinic"("isPrimary");

-- CreateIndex
CREATE INDEX "WorkflowTemplate_executionMode_idx" ON "WorkflowTemplate"("executionMode");

-- CreateIndex
CREATE INDEX "WorkflowTemplate_enrollmentMode_idx" ON "WorkflowTemplate"("enrollmentMode");

-- AddForeignKey
ALTER TABLE "AiGeneratedReport" ADD CONSTRAINT "AiGeneratedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RERentalListing" ADD CONSTRAINT "RERentalListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "REPriceChange" ADD CONSTRAINT "REPriceChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "REPriceChange" ADD CONSTRAINT "REPriceChange_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "REProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "REPriceChange" ADD CONSTRAINT "REPriceChange_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "RERentalListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplateEnrollment" ADD CONSTRAINT "WorkflowTemplateEnrollment_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplateEnrollment" ADD CONSTRAINT "WorkflowTemplateEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalRecall" ADD CONSTRAINT "DentalRecall_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalRecall" ADD CONSTRAINT "DentalRecall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalRecall" ADD CONSTRAINT "DentalRecall_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPaymentPlan" ADD CONSTRAINT "DentalPaymentPlan_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPaymentPlan" ADD CONSTRAINT "DentalPaymentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPaymentPlan" ADD CONSTRAINT "DentalPaymentPlan_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoTreatment" ADD CONSTRAINT "OrthoTreatment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoTreatment" ADD CONSTRAINT "OrthoTreatment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoTreatment" ADD CONSTRAINT "OrthoTreatment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoTreatment" ADD CONSTRAINT "OrthoTreatment_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoCaptureSession" ADD CONSTRAINT "OrthoCaptureSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoCaptureSession" ADD CONSTRAINT "OrthoCaptureSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoCaptureSession" ADD CONSTRAINT "OrthoCaptureSession_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoCaptureSession" ADD CONSTRAINT "OrthoCaptureSession_orthoTreatmentId_fkey" FOREIGN KEY ("orthoTreatmentId") REFERENCES "OrthoTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoCaptureAsset" ADD CONSTRAINT "OrthoCaptureAsset_captureSessionId_fkey" FOREIGN KEY ("captureSessionId") REFERENCES "OrthoCaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoProgressAssessment" ADD CONSTRAINT "OrthoProgressAssessment_captureSessionId_fkey" FOREIGN KEY ("captureSessionId") REFERENCES "OrthoCaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoProgressAssessment" ADD CONSTRAINT "OrthoProgressAssessment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoProgressAssessment" ADD CONSTRAINT "OrthoProgressAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoProgressAssessment" ADD CONSTRAINT "OrthoProgressAssessment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoProgressAssessment" ADD CONSTRAINT "OrthoProgressAssessment_orthoTreatmentId_fkey" FOREIGN KEY ("orthoTreatmentId") REFERENCES "OrthoTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoRecommendation" ADD CONSTRAINT "OrthoRecommendation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "OrthoProgressAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoRecommendation" ADD CONSTRAINT "OrthoRecommendation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoRecommendation" ADD CONSTRAINT "OrthoRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoRecommendation" ADD CONSTRAINT "OrthoRecommendation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoComplianceSignal" ADD CONSTRAINT "OrthoComplianceSignal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoComplianceSignal" ADD CONSTRAINT "OrthoComplianceSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoComplianceSignal" ADD CONSTRAINT "OrthoComplianceSignal_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthoComplianceSignal" ADD CONSTRAINT "OrthoComplianceSignal_orthoTreatmentId_fkey" FOREIGN KEY ("orthoTreatmentId") REFERENCES "OrthoTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProduct" ADD CONSTRAINT "WebsiteProduct_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProduct" ADD CONSTRAINT "WebsiteProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteOrder" ADD CONSTRAINT "WebsiteOrder_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteOrder" ADD CONSTRAINT "WebsiteOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteOrder" ADD CONSTRAINT "WebsiteOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteStockSettings" ADD CONSTRAINT "WebsiteStockSettings_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "AIEmployeeCustomTask_userId_source_industry_employeeType_taskKe" RENAME TO "AIEmployeeCustomTask_userId_source_industry_employeeType_ta_key";

-- RenameIndex
ALTER INDEX "AIEmployeeTaskConfig_userId_source_industry_employeeType_taskKe" RENAME TO "AIEmployeeTaskConfig_userId_source_industry_employeeType_ta_key";

-- RenameIndex
ALTER INDEX "AIEmployeeTaskSchedule_userId_source_industry_employeeType_task" RENAME TO "AIEmployeeTaskSchedule_userId_source_industry_employeeType__key";

-- RenameIndex
ALTER INDEX "AIEmployeeTaskTemplate_userId_source_industry_employeeType_task" RENAME TO "AIEmployeeTaskTemplate_userId_source_industry_employeeType__key";
