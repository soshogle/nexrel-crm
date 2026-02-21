-- AlterEnum
ALTER TYPE "DocpenProfession" ADD VALUE IF NOT EXISTS 'ORTHODONTIC';

-- AlterEnum (DripTriggerType - one value per statement for compatibility)
ALTER TYPE "DripTriggerType" ADD VALUE IF NOT EXISTS 'TRIAL_ENDED';
ALTER TYPE "DripTriggerType" ADD VALUE IF NOT EXISTS 'DEAL_WON';
ALTER TYPE "DripTriggerType" ADD VALUE IF NOT EXISTS 'WORKFLOW_TASK_COMPLETED';

-- AlterEnum
ALTER TYPE "RETaskType" ADD VALUE IF NOT EXISTS 'LISTING_VISIT_CONFIRMED';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TwilioAccount_envKey_key" ON "TwilioAccount"("envKey");
