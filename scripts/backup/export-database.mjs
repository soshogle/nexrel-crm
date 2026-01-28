import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// All tables to backup
const tables = [
  'account', 'session', 'agency', 'user', 'lead', 'note', 'message', 'apiKey',
  'campaign', 'campaignMessage', 'campaignLead', 'review', 'referral', 'voiceAgent',
  'purchasedPhoneNumber', 'callLog', 'outboundCall', 'calendarConnection', 'channelConnection',
  'conversation', 'conversationMessage', 'knowledgeBase', 'autoReplySettings', 'pipeline',
  'pipelineStage', 'deal', 'dealActivity', 'workflow', 'workflowAction', 'workflowEnrollment',
  'workflowActionExecution', 'emailCampaign', 'emailCampaignDeal', 'smsCampaign', 'smsSequence',
  'smsEnrollment', 'smsSequenceMessage', 'smsCampaignDeal', 'teamMember', 'appointmentType',
  'bookingAppointment', 'paymentProviderSettings', 'payment', 'invoice', 'bookingWidgetSettings',
  'auditLog', 'voiceUsage', 'userSubscription', 'soshoglePaymentCustomer', 'soshoglePaymentMerchant',
  'soshoglePaymentMethod', 'soshoglePaymentIntent', 'soshogleTransaction', 'soshogleWallet',
  'soshogleWalletTransaction', 'soshogleLoyaltyProgram', 'soshogleLoyaltyPoints', 'soshogleFinancingPlan',
  'soshogleFinancingPayment', 'soshogleDispute', 'soshogleWebhook', 'soshogleTrustScore',
  'soshoglefraudDetection', 'product', 'productCategory', 'storefront', 'order', 'orderItem',
  'creditScore', 'creditApplication', 'achSettlement', 'achSettlementTransaction', 'bnplApplication',
  'bnplInstallment', 'dataInsight', 'dataExport', 'widgetConfiguration', 'widgetEmbed',
  'cashTransaction', 'cashReconciliation', 'dataMonetizationConsent', 'dataMonetizationInsight',
  'dataMonetizationRevenue', 'ecommerceWidget', 'widgetAnalytics', 'fraudAlert', 'fraudPattern',
  'restaurantTable', 'tableLayout', 'reservation', 'reservationActivity', 'reservationReminder',
  'seatingPreference', 'reservationSettings', 'deliveryOrder', 'driver', 'driverLocation',
  'deliveryZone', 'driverZone', 'deliveryRating', 'driverEarning', 'staff', 'shift',
  'pOSOrder', 'pOSOrderItem', 'receipt', 'kitchenStation', 'kitchenOrderItem', 'prepLog',
  'inventoryItem', 'supplier', 'purchaseOrder', 'purchaseOrderItem', 'inventoryAdjustment',
  'stockAlert', 'recipe', 'recipeIngredient', 'userFeatureToggle', 'adminAction', 'clubOSHousehold',
  'clubOSMember', 'clubOSProgram', 'clubOSDivision', 'clubOSTeam', 'clubOSTeamMember',
  'clubOSRegistration', 'clubOSWaitlist', 'clubOSWaiver', 'clubOSVenue', 'clubOSSchedule',
  'clubOSStaffAssignment', 'clubOSPayment', 'clubOSInvoice', 'clubOSInvoicePayment',
  'clubOSCommunication', 'clubOSUserRelation', 'clubOSNotificationSetting', 'elevenLabsApiKey',
  'generalInventoryCategory', 'generalInventorySupplier', 'generalInventoryLocation', 'generalInventoryItem',
  'generalInventoryAdjustment', 'ecommerceSyncSettings', 'lowStockAlertSettings', 'task',
  'taskComment', 'taskAttachment', 'taskActivity', 'taskTemplate', 'taskAutomation',
  'userPermission', 'adminSession', 'bookingSettings', 'superAdminSession', 'knowledgeBaseFile',
  'voiceAgentKnowledgeBaseFile', 'relationshipGraph', 'relationshipMetrics', 'toolDefinition',
  'toolInstance', 'toolAction', 'aIWorkflowTemplate', 'aIWorkflowInstance', 'aIWorkflowExecution',
  'workflowOptimization', 'toolRelationship', 'toolUsagePattern', 'toolHealthMetric',
  'toolRecommendation', 'toolRetirement', 'leadGenerationCampaign', 'scrapedLead', 'leadEnrichment',
  'enrichmentCache', 'leadScore', 'outreachLog', 'leadEnrichmentCache', 'emailDripCampaign',
  'emailDripSequence', 'emailDripEnrollment', 'emailDripMessage', 'leadBlacklist', 'aBTest',
  'aBTestVariant', 'socialMediaSettings', 'aIEmployee', 'aIJob', 'aIJobLog', 'docpenSession',
  'docpenTranscription', 'docpenSOAPNote', 'docpenAssistantQuery', 'docpenVoiceAgent',
  'docpenConversation', 'docpenKnowledgeBaseFile', 'docpenAgentKnowledgeBaseFile', 'rEProperty',
  'rEFSBOListing', 'rEDNCEntry', 'rEScrapingJob', 'rEMarketStats', 'rEMarketReport',
  'rEStaleDiagnostic', 'rEListingPresentation', 'rESellerNetSheet', 'rECMAReport', 'rEComparable',
  'rETransaction', 'rETransactionActivity', 'rETransactionTask', 'rEBuyerCriteria', 'rEExpiredListing',
  'rEAIEmployeeExecution'
];

async function exportDatabase() {
  const today = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '../../backups', today);
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log(`Starting database export to ${backupDir}...`);
  
  let exportedCount = 0;
  let errorCount = 0;
  
  for (const table of tables) {
    try {
      const data = await prisma[table].findMany();
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✓ Exported ${table}: ${data.length} records`);
      exportedCount++;
    } catch (error) {
      console.error(`✗ Error exporting ${table}:`, error.message);
      errorCount++;
    }
  }
  
  // Create summary file
  const summary = {
    date: today,
    timestamp: new Date().toISOString(),
    tablesExported: exportedCount,
    tablesWithErrors: errorCount,
    totalTables: tables.length
  };
  
  fs.writeFileSync(
    path.join(backupDir, '_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\nBackup complete: ${exportedCount}/${tables.length} tables exported`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount} tables failed`);
  }
  
  await prisma.$disconnect();
  process.exit(errorCount > 0 ? 1 : 0);
}

exportDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
