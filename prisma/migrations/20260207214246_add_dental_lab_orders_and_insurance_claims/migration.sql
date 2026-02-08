-- CreateEnum
CREATE TYPE "LabOrderType" AS ENUM ('CROWN', 'BRIDGE', 'DENTURE', 'IMPLANT', 'ORTHODONTIC', 'RETAINER', 'NIGHT_GUARD', 'OTHER');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('PENDING', 'SUBMITTED', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InsuranceProviderType" AS ENUM ('RAMQ', 'PRIVATE', 'BOTH');

-- CreateEnum
CREATE TYPE "InsuranceClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'PROCESSING', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'PAID', 'APPEALED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DentalLabOrder" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "treatmentPlanId" TEXT,
    "procedureId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "labContact" JSONB,
    "orderType" "LabOrderType" NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "patientInfo" JSONB NOT NULL,
    "impressionDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "status" "LabOrderStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "inProgressAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cost" DOUBLE PRECISION DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "shippingMethod" TEXT,
    "attachments" JSONB,
    "prescriptionUrl" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalLabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalInsuranceClaim" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "treatmentPlanId" TEXT,
    "procedureId" TEXT,
    "claimNumber" TEXT NOT NULL,
    "insuranceType" "InsuranceProviderType" NOT NULL,
    "providerName" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "groupNumber" TEXT,
    "subscriberId" TEXT,
    "patientInfo" JSONB NOT NULL,
    "subscriberInfo" JSONB,
    "procedures" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "submittedAmount" DOUBLE PRECISION NOT NULL,
    "estimatedCoverage" DOUBLE PRECISION,
    "patientResponsibility" DOUBLE PRECISION,
    "status" "InsuranceClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "deniedAt" TIMESTAMP(3),
    "appealDeadline" TIMESTAMP(3),
    "responseData" JSONB,
    "eobUrl" TEXT,
    "paymentAmount" DOUBLE PRECISION,
    "paymentDate" TIMESTAMP(3),
    "ramqClaimId" TEXT,
    "ramqStatus" TEXT,
    "claimFormUrl" TEXT,
    "preAuthNumber" TEXT,
    "notes" TEXT,
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalInsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DentalLabOrder_orderNumber_key" ON "DentalLabOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "DentalLabOrder_leadId_idx" ON "DentalLabOrder"("leadId");

-- CreateIndex
CREATE INDEX "DentalLabOrder_userId_idx" ON "DentalLabOrder"("userId");

-- CreateIndex
CREATE INDEX "DentalLabOrder_treatmentPlanId_idx" ON "DentalLabOrder"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalLabOrder_procedureId_idx" ON "DentalLabOrder"("procedureId");

-- CreateIndex
CREATE INDEX "DentalLabOrder_status_idx" ON "DentalLabOrder"("status");

-- CreateIndex
CREATE INDEX "DentalLabOrder_orderType_idx" ON "DentalLabOrder"("orderType");

-- CreateIndex
CREATE UNIQUE INDEX "DentalInsuranceClaim_claimNumber_key" ON "DentalInsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_leadId_idx" ON "DentalInsuranceClaim"("leadId");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_userId_idx" ON "DentalInsuranceClaim"("userId");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_treatmentPlanId_idx" ON "DentalInsuranceClaim"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_procedureId_idx" ON "DentalInsuranceClaim"("procedureId");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_status_idx" ON "DentalInsuranceClaim"("status");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_insuranceType_idx" ON "DentalInsuranceClaim"("insuranceType");

-- CreateIndex
CREATE INDEX "DentalInsuranceClaim_providerName_idx" ON "DentalInsuranceClaim"("providerName");

-- AddForeignKey
ALTER TABLE "DentalLabOrder" ADD CONSTRAINT "DentalLabOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalLabOrder" ADD CONSTRAINT "DentalLabOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalLabOrder" ADD CONSTRAINT "DentalLabOrder_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalLabOrder" ADD CONSTRAINT "DentalLabOrder_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "DentalProcedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalInsuranceClaim" ADD CONSTRAINT "DentalInsuranceClaim_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalInsuranceClaim" ADD CONSTRAINT "DentalInsuranceClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalInsuranceClaim" ADD CONSTRAINT "DentalInsuranceClaim_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalInsuranceClaim" ADD CONSTRAINT "DentalInsuranceClaim_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "DentalProcedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
