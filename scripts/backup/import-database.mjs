#!/usr/bin/env node
/**
 * Database Restore Script
 * Restores data from JSON backup files. Use after a migration reset or data loss.
 * 
 * Usage: npx tsx scripts/backup/import-database.mjs [backup-dir]
 * Example: npx tsx scripts/backup/import-database.mjs backups/2026-02-12
 * 
 * Requires: DATABASE_URL in .env.local
 * Does NOT require: PostgreSQL installed locally
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Import order: parent tables before child tables (respects foreign keys)
const IMPORT_ORDER = [
  'agency',
  'user',
  'account',
  'session',
  'apiKey',
  'appointmentType',
  'bookingWidgetSettings',
  'knowledgeBase',
  'autoReplySettings',
  'elevenLabsApiKey',
  'paymentProviderSettings',
  'bookingSettings',
  'pipeline',
  'pipelineStage',
  'lead',
  'note',
  'campaign',
  'campaignMessage',
  'campaignLead',
  'review',
  'referral',
  'voiceAgent',
  'purchasedPhoneNumber',
  'callLog',
  'outboundCall',
  'calendarConnection',
  'channelConnection',
  'conversation',
  'conversationMessage',
  'deal',
  'dealActivity',
  'workflow',
  'workflowAction',
  'workflowEnrollment',
  'workflowActionExecution',
  'emailCampaign',
  'emailCampaignDeal',
  'smsCampaign',
  'smsSequence',
  'smsEnrollment',
  'smsSequenceMessage',
  'smsCampaignDeal',
  'teamMember',
  'bookingAppointment',
  'payment',
  'invoice',
  'auditLog',
  'voiceUsage',
  'userSubscription',
  'message',
  'soshoglePaymentCustomer',
  'soshoglePaymentMerchant',
  'soshoglePaymentMethod',
  'soshoglePaymentIntent',
  'soshogleTransaction',
  'soshogleWallet',
  'soshogleWalletTransaction',
  'soshogleLoyaltyProgram',
  'soshogleLoyaltyPoints',
  'soshogleFinancingPlan',
  'soshogleFinancingPayment',
  'soshogleDispute',
  'soshogleWebhook',
  'soshogleTrustScore',
  'soshoglefraudDetection',
  'product',
  'productCategory',
  'storefront',
  'order',
  'orderItem',
  'creditScore',
  'creditApplication',
  'achSettlement',
  'achSettlementTransaction',
  'bnplApplication',
  'bnplInstallment',
  'dataInsight',
  'dataExport',
  'widgetConfiguration',
  'widgetEmbed',
  'cashTransaction',
  'cashReconciliation',
  'dataMonetizationConsent',
  'dataMonetizationInsight',
  'dataMonetizationRevenue',
  'ecommerceWidget',
  'widgetAnalytics',
  'fraudAlert',
  'fraudPattern',
  'restaurantTable',
  'tableLayout',
  'reservation',
  'reservationActivity',
  'reservationReminder',
  'seatingPreference',
  'reservationSettings',
  'deliveryOrder',
  'driver',
  'driverLocation',
  'deliveryZone',
  'driverZone',
  'deliveryRating',
  'driverEarning',
  'staff',
  'shift',
  'pOSOrder',
  'pOSOrderItem',
  'receipt',
  'kitchenStation',
  'kitchenOrderItem',
  'prepLog',
  'inventoryItem',
  'supplier',
  'purchaseOrder',
  'purchaseOrderItem',
  'inventoryAdjustment',
  'stockAlert',
  'recipe',
  'recipeIngredient',
  'userFeatureToggle',
  'adminAction',
  'clubOSHousehold',
  'clubOSMember',
  'clubOSProgram',
  'clubOSDivision',
  'clubOSTeam',
  'clubOSTeamMember',
  'clubOSRegistration',
  'clubOSWaitlist',
  'clubOSWaiver',
  'clubOSVenue',
  'clubOSSchedule',
  'clubOSStaffAssignment',
  'clubOSPayment',
  'clubOSInvoice',
  'clubOSInvoicePayment',
  'clubOSCommunication',
  'clubOSUserRelation',
  'clubOSNotificationSetting',
  'generalInventoryCategory',
  'generalInventorySupplier',
  'generalInventoryLocation',
  'generalInventoryItem',
  'generalInventoryAdjustment',
  'ecommerceSyncSettings',
  'lowStockAlertSettings',
  'task',
  'taskComment',
  'taskAttachment',
  'taskActivity',
  'taskTemplate',
  'taskAutomation',
  'userPermission',
  'adminSession',
  'superAdminSession',
  'knowledgeBaseFile',
  'voiceAgentKnowledgeBaseFile',
  'relationshipGraph',
  'relationshipMetrics',
  'toolDefinition',
  'toolInstance',
  'toolAction',
  'aIWorkflowTemplate',
  'aIWorkflowInstance',
  'aIWorkflowExecution',
  'workflowOptimization',
  'toolRelationship',
  'toolUsagePattern',
  'toolHealthMetric',
  'toolRecommendation',
  'toolRetirement',
  'leadGenerationCampaign',
  'scrapedLead',
  'leadEnrichment',
  'enrichmentCache',
  'leadScore',
  'outreachLog',
  'leadEnrichmentCache',
  'emailDripCampaign',
  'emailDripSequence',
  'emailDripEnrollment',
  'emailDripMessage',
  'leadBlacklist',
  'aBTest',
  'aBTestVariant',
  'socialMediaSettings',
  'aIEmployee',
  'aIJob',
  'aIJobLog',
  'docpenSession',
  'docpenTranscription',
  'docpenSOAPNote',
  'docpenAssistantQuery',
  'docpenVoiceAgent',
  'docpenConversation',
  'docpenKnowledgeBaseFile',
  'docpenAgentKnowledgeBaseFile',
  'rEProperty',
  'rEFSBOListing',
  'rEDNCEntry',
  'rEScrapingJob',
  'rEMarketStats',
  'rEMarketReport',
  'rEStaleDiagnostic',
  'rEListingPresentation',
  'rESellerNetSheet',
  'rECMAReport',
  'rEComparable',
  'rETransaction',
  'rETransactionActivity',
  'rETransactionTask',
  'rEBuyerCriteria',
  'rEExpiredListing',
  'rEAIEmployeeExecution',
];

function parseJsonWithDates(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(parseJsonWithDates);
  if (typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const str = String(v);
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
        result[k] = new Date(v);
      } else {
        result[k] = parseJsonWithDates(v);
      }
    }
    return result;
  }
  return obj;
}

function askConfirmation(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer?.toLowerCase() === 'yes' || answer?.toLowerCase() === 'y');
    });
  });
}

async function restoreDatabase(backupDir, skipConfirmation = false) {
  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  const summaryPath = path.join(backupDir, '_summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error(`❌ No _summary.json found. Is this a valid backup? ${backupDir}`);
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  console.log('\n📦 Database Restore');
  console.log('==================');
  console.log(`Backup date: ${summary.date}`);
  console.log(`Tables in backup: ${summary.tablesExported}`);
  console.log(`Target: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'DATABASE_URL'}`);
  console.log('\n⚠️  WARNING: This will INSERT data into your database.');
  console.log('   For a full restore after reset: run this on an EMPTY database.');
  console.log('   For a database with existing data: duplicate keys may cause errors.\n');

  if (!skipConfirmation) {
    const confirmed = await askConfirmation('Type "yes" to continue: ');
    if (!confirmed) {
      console.log('Restore cancelled.');
      process.exit(0);
    }
  }

  console.log('\n🔄 Starting restore...\n');

  let restored = 0;
  let failed = 0;
  const batchSize = 100;

  for (const table of IMPORT_ORDER) {
    const filePath = path.join(backupDir, `${table}.json`);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = parseJsonWithDates(JSON.parse(raw));

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`✓ ${table}: 0 records (empty)`);
        restored++;
        continue;
      }

      const model = prisma[table];
      if (!model || typeof model.createMany !== 'function') {
        console.log(`⊘ ${table}: skipped (no createMany)`);
        continue;
      }

      for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        await model.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }

      console.log(`✓ ${table}: ${data.length} records`);
      restored++;
    } catch (error) {
      console.error(`✗ ${table}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Restore complete: ${restored} tables restored, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

const backupDir = process.argv[2] || path.join(__dirname, '../../backups/2026-02-12');
const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y');

restoreDatabase(backupDir, skipConfirmation).catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
