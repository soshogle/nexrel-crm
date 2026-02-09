# Website Workflow Triggers Migration Guide

## Overview
This migration adds comprehensive website-related workflow triggers, conditional logic support, and analytics integrations to the workflow builder.

## Database Changes

### 1. New WorkflowTriggerType Enum Values

Add these new enum values to the `WorkflowTriggerType` enum:

```sql
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
```

### 2. Website Model Updates

Add new fields to the `Website` model:

```sql
ALTER TABLE "Website" ADD COLUMN "googleAnalyticsId" TEXT;
ALTER TABLE "Website" ADD COLUMN "facebookPixelId" TEXT;
```

## Features Implemented

### 1. Website Triggers in Workflow Builder
- **Payment & Customer Triggers:**
  - Payment Received
  - Payment Amount Threshold (with smart presets + custom)
  - Customer Tier Changed
  - Repeat Customer
  - First Time Customer
  - Product Purchased
  - Cart Value Threshold

- **Visitor Behavior Triggers:**
  - Page Viewed
  - Time on Site
  - Pages Viewed
  - CTA Clicked
  - Returning Visitor
  - Cart Abandoned

- **Analytics & Stats Triggers:**
  - Revenue Milestone
  - Order Count Milestone
  - Daily Revenue Threshold

### 2. Conditional Logic Support
- AND/OR operators for multiple conditions
- Field-based conditions (paymentAmount, customerTier, cartValue, productId)
- Operators: equals, greater_than, less_than, contains

### 3. Smart Amount Thresholds
- Preset amounts: $25, $50, $100, $250, $500, $1,000, $2,500, $5,000
- Custom amount option
- Operator selection (greater than, less than, equals)

### 4. Analytics Integration
- Google Analytics integration (GA4 and Universal Analytics)
- Facebook Pixel integration
- Tracking code generation
- Settings UI in website editor

### 5. Visitor Tracking Service
- Works with both Google Analytics and basic tracking
- Tracks page views, CTA clicks, form submissions
- Detects returning visitors
- Cart abandonment detection

## UI Changes

### Workflow Builder (`components/workflows/create-workflow-dialog.tsx`)
- Website triggers shown only if user has websites
- Trigger configuration UI with:
  - Website selection dropdown
  - Amount threshold presets + custom input
  - Page path configuration
  - Time on site configuration
  - Product selection
  - Customer tier selection
- Conditional logic builder with AND/OR operators

### Website Editor (`app/dashboard/websites/[id]/page.tsx`)
- New "Analytics" tab added
- Analytics settings component for Google Analytics and Facebook Pixel

## Backend Changes

### Workflow Engine (`lib/workflow-engine.ts`)
- Enhanced `shouldExecuteWorkflow` to handle conditional logic
- New methods:
  - `checkAmountThreshold`: Validates amount thresholds
  - `evaluateConditionalLogic`: Evaluates AND/OR conditions
  - `evaluateCondition`: Evaluates single condition
  - `getFieldValue`: Extracts field values from trigger data

### AI Workflow Generator (`lib/ai-workflow-generator.ts`)
- Updated with all new website triggers
- Conditional logic documentation
- Trigger configuration examples

### New Services
- `lib/website-builder/visitor-tracking-service.ts`: Visitor tracking with GA + basic tracking
- `lib/website-builder/analytics-integration.ts`: Analytics configuration management

### New API Endpoints
- `GET/PATCH /api/websites/[id]/analytics/config`: Manage analytics configuration

## Migration Steps

1. **Run Database Migration:**
   ```bash
   # Execute the SQL commands above to add enum values and columns
   # Or use Prisma migrate (if network allows)
   npx prisma migrate dev --name add_website_workflow_triggers
   ```

2. **Deploy Code Changes:**
   - All code changes are backward compatible
   - No breaking changes to existing workflows
   - New triggers only visible to users with websites

3. **Test Workflow Creation:**
   - Create a website first
   - Go to AI Employee > Workflows tab
   - Create new workflow
   - Verify website triggers appear
   - Test conditional logic
   - Test amount thresholds

4. **Test Analytics Integration:**
   - Go to website editor
   - Click "Analytics" tab
   - Configure Google Analytics ID
   - Configure Facebook Pixel ID
   - Copy tracking codes
   - Verify codes are generated correctly

## Testing Checklist

- [ ] Website triggers appear in workflow builder (only if user has websites)
- [ ] Website triggers hidden if user has no websites
- [ ] Amount threshold presets work correctly
- [ ] Custom amount threshold works
- [ ] Conditional logic (AND/OR) evaluates correctly
- [ ] Google Analytics ID validation works
- [ ] Facebook Pixel ID validation works
- [ ] Tracking codes generated correctly
- [ ] Visitor tracking service tracks events
- [ ] Workflow engine triggers workflows with new triggers
- [ ] AI workflow generator suggests website triggers

## Notes

- All website triggers require a website to be created first
- Conditional logic supports complex multi-condition workflows
- Analytics integration works with both GA4 and Universal Analytics
- Visitor tracking works with or without Google Analytics installed
- All changes are backward compatible
