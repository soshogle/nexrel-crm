
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

import * as crm from "./handlers/crm";
import * as voiceMessaging from "./handlers/voice-messaging";
import * as setupIntegrations from "./handlers/setup-integrations";
import * as website from "./handlers/website";
import * as tasksWorkflows from "./handlers/tasks-workflows";
import * as analyticsReports from "./handlers/analytics-reports";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AVAILABLE_ACTIONS = {
  // Setup & Configuration
  SETUP_STRIPE: "setup_stripe",
  SETUP_SQUARE: "setup_square",
  SETUP_PAYPAL: "setup_paypal",
  SETUP_TWILIO: "setup_twilio",
  SETUP_QUICKBOOKS: "setup_quickbooks",
  SETUP_WHATSAPP: "setup_whatsapp",
  PURCHASE_TWILIO_NUMBER: "purchase_twilio_number",
  CREATE_VOICE_AGENT: "create_voice_agent",
  CONFIGURE_AUTO_REPLY: "configure_auto_reply",
  CREATE_WORKFLOW: "create_workflow",
  CREATE_SMART_WORKFLOW: "create_smart_workflow",
  ADD_WORKFLOW_TASK: "add_workflow_task",
  CREATE_APPOINTMENT: "create_appointment",
  LIST_APPOINTMENTS: "list_appointments",
  UPDATE_APPOINTMENT: "update_appointment",
  CANCEL_APPOINTMENT: "cancel_appointment",
  
  // Voice Agent Debugging & Management
  DEBUG_VOICE_AGENT: "debug_voice_agent",
  FIX_VOICE_AGENT: "fix_voice_agent",
  GET_VOICE_AGENT: "get_voice_agent",
  LIST_VOICE_AGENTS: "list_voice_agents",
  UPDATE_VOICE_AGENT: "update_voice_agent",
  ASSIGN_PHONE_TO_VOICE_AGENT: "assign_phone_to_voice_agent",
  MAKE_OUTBOUND_CALL: "make_outbound_call",
  CALL_LEADS: "call_leads",
  
  // CRM Operations
  CREATE_LEAD: "create_lead",
  UPDATE_LEAD: "update_lead",
  GET_LEAD_DETAILS: "get_lead_details",
  DELETE_LEAD: "delete_lead",
  LIST_LEADS: "list_leads",
  CREATE_DEAL: "create_deal",
  UPDATE_DEAL: "update_deal",
  GET_DEAL_DETAILS: "get_deal_details",
  DELETE_DEAL: "delete_deal",
  CREATE_PIPELINE: "create_pipeline",
  CREATE_PIPELINE_STAGE: "create_pipeline_stage",
  LIST_DEALS: "list_deals",
  CREATE_CAMPAIGN: "create_campaign",
  UPDATE_CAMPAIGN: "update_campaign",
  GET_CAMPAIGN_DETAILS: "get_campaign_details",
  LIST_CAMPAIGNS: "list_campaigns",
  SEARCH_CONTACTS: "search_contacts",
  DRAFT_SMS: "draft_sms",
  SEND_SMS: "send_sms",
  SCHEDULE_SMS: "schedule_sms",
  DRAFT_EMAIL: "draft_email",
  SEND_EMAIL: "send_email",
  SCHEDULE_EMAIL: "schedule_email",
  SMS_LEADS: "sms_leads",
  EMAIL_LEADS: "email_leads",
  DELETE_DUPLICATE_CONTACTS: "delete_duplicate_contacts",
  CREATE_TASK: "create_task",
  LIST_TASKS: "list_tasks",
  CREATE_AI_EMPLOYEE: "create_ai_employee",
  LIST_AI_EMPLOYEES: "list_ai_employees",
  COMPLETE_TASK: "complete_task",
  UPDATE_TASK: "update_task",
  CANCEL_TASK: "cancel_task",
  ADD_NOTE: "add_note",
  UPDATE_DEAL_STAGE: "update_deal_stage",
  CREATE_INVOICE: "create_invoice",
  LIST_OVERDUE_INVOICES: "list_overdue_invoices",
  UPDATE_INVOICE_STATUS: "update_invoice_status",
  SEND_INVOICE: "send_invoice",
  GET_DAILY_BRIEFING: "get_daily_briefing",
  UPDATE_DEAL: "update_deal",
  GET_FOLLOW_UP_SUGGESTIONS: "get_follow_up_suggestions",
  GET_MEETING_PREP: "get_meeting_prep",
  CREATE_BULK_TASKS: "create_bulk_tasks",
  GET_STATISTICS: "get_statistics",
  CREATE_REPORT: "create_report",
  GET_RECENT_ACTIVITY: "get_recent_activity",
  IMPORT_CONTACTS: "import_contacts",
  UPDATE_PROFILE: "update_profile",
  UPDATE_COMPANY_PROFILE: "update_company_profile",
  
  // QuickBooks Operations
  CREATE_QUICKBOOKS_INVOICE: "create_quickbooks_invoice",
  SYNC_CONTACT_TO_QUICKBOOKS: "sync_contact_to_quickbooks",
  
  // WhatsApp Operations
  SEND_WHATSAPP_MESSAGE: "send_whatsapp_message",
  GET_WHATSAPP_CONVERSATIONS: "get_whatsapp_conversations",

  // Website Builder
  CLONE_WEBSITE: "clone_website",
  CREATE_WEBSITE: "create_website",
  LIST_WEBSITES: "list_websites",
  MODIFY_WEBSITE: "modify_website",
  GET_WEBSITE_STRUCTURE: "get_website_structure",
  UPDATE_HERO: "update_hero",
  ADD_SECTION: "add_section",
  UPDATE_SECTION_CONTENT: "update_section_content",
  ADD_CTA: "add_cta",
  ADD_LEAD_TAG: "add_lead_tag",
  UPDATE_LEAD_STATUS: "update_lead_status",
  LIST_NOTES: "list_notes",
  GET_PIPELINE_STAGES: "get_pipeline_stages",
  ASSIGN_DEAL_TO_LEAD: "assign_deal_to_lead",
  RESCHEDULE_TASK: "reschedule_task",
  REORDER_SECTION: "reorder_section",
  DELETE_SECTION: "delete_section",
  LIST_WEBSITE_MEDIA: "list_website_media",
  ADD_WEBSITE_IMAGE: "add_website_image",
  LIST_EMAIL_TEMPLATES: "list_email_templates",
  LIST_SMS_TEMPLATES: "list_sms_templates",
  GET_CUSTOM_REPORT: "get_custom_report",
  MAKE_IT_LOOK_LIKE: "make_it_look_like",
  SUGGEST_HERO_VARIANTS: "suggest_hero_variants",
  CHECK_WEBSITE_ACCESSIBILITY: "check_website_accessibility",
  CREATE_SCHEDULED_REPORT: "create_scheduled_report",
  DO_EVERYTHING_FOR_CONTACT: "do_everything_for_contact",
  LOG_EMAIL_TO_CONTACT: "log_email_to_contact",
  SUMMARIZE_CALL: "summarize_call",
  GET_SMART_REPLIES: "get_smart_replies",
  GET_FOLLOW_UP_PRIORITY: "get_follow_up_priority",
  GET_DEAL_RISK_ALERTS: "get_deal_risk_alerts",
  BULK_UPDATE_LEAD_STATUS: "bulk_update_lead_status",
  BULK_ADD_TAG: "bulk_add_tag",
  EXPORT_PIPELINE_CSV: "export_pipeline_csv",
  // Financial & Payment
  GET_PAYMENT_ANALYTICS: "get_payment_analytics",
  GET_REVENUE_BREAKDOWN: "get_revenue_breakdown",
  LIST_FRAUD_ALERTS: "list_fraud_alerts",
  CHECK_CASH_FLOW: "check_cash_flow",
  // Inventory & E-commerce
  CHECK_STOCK_LEVELS: "check_stock_levels",
  GET_BEST_SELLERS: "get_best_sellers",
  TRACK_ORDER: "track_order",
  GET_LOW_STOCK_ALERTS: "get_low_stock_alerts",
  // Analytics
  GET_WEBSITE_ANALYTICS: "get_website_analytics",
  GET_VOICE_AI_ANALYTICS: "get_voice_ai_analytics",
  GET_CONVERSATION_ANALYTICS: "get_conversation_analytics",
  GET_DELIVERY_ANALYTICS: "get_delivery_analytics",
  // Restaurant
  MANAGE_RESERVATIONS: "manage_reservations",
  MANAGE_TABLES: "manage_tables",
  // Team & Admin
  GET_TEAM_PERFORMANCE: "get_team_performance",
  GET_AUDIT_LOG: "get_audit_log",
  CHECK_INTEGRATIONS: "check_integrations",
  // Marketing & Content
  MANAGE_REVIEWS: "manage_reviews",
  GET_REFERRAL_STATS: "get_referral_stats",
  // Industry & Business Intelligence
  GET_INDUSTRY_ANALYTICS: "get_industry_analytics",
  GET_BUSINESS_SCORE: "get_business_score",
  GET_COST_OPTIMIZATION: "get_cost_optimization",
  GET_AUTO_ACTION_SUGGESTIONS: "get_auto_action_suggestions",
};

type HandlerFn = (userId: string, params: any) => Promise<any>;

const ACTION_HANDLERS: Record<string, HandlerFn> = {
  // Setup & Integrations
  [AVAILABLE_ACTIONS.SETUP_STRIPE]: setupIntegrations.setupStripe,
  [AVAILABLE_ACTIONS.SETUP_SQUARE]: setupIntegrations.setupSquare,
  [AVAILABLE_ACTIONS.SETUP_PAYPAL]: setupIntegrations.setupPayPal,
  [AVAILABLE_ACTIONS.SETUP_TWILIO]: voiceMessaging.setupTwilio,
  [AVAILABLE_ACTIONS.SETUP_QUICKBOOKS]: setupIntegrations.setupQuickBooks,
  [AVAILABLE_ACTIONS.SETUP_WHATSAPP]: voiceMessaging.setupWhatsApp,
  [AVAILABLE_ACTIONS.UPDATE_PROFILE]: setupIntegrations.updateProfile,
  [AVAILABLE_ACTIONS.UPDATE_COMPANY_PROFILE]: setupIntegrations.updateCompanyProfile,
  [AVAILABLE_ACTIONS.CREATE_QUICKBOOKS_INVOICE]: setupIntegrations.createQuickBooksInvoice,
  [AVAILABLE_ACTIONS.SYNC_CONTACT_TO_QUICKBOOKS]: setupIntegrations.syncContactToQuickBooks,

  // Voice & Messaging
  [AVAILABLE_ACTIONS.PURCHASE_TWILIO_NUMBER]: voiceMessaging.purchaseTwilioNumber,
  [AVAILABLE_ACTIONS.CREATE_VOICE_AGENT]: voiceMessaging.createVoiceAgent,
  [AVAILABLE_ACTIONS.DEBUG_VOICE_AGENT]: voiceMessaging.debugVoiceAgent,
  [AVAILABLE_ACTIONS.FIX_VOICE_AGENT]: voiceMessaging.fixVoiceAgent,
  [AVAILABLE_ACTIONS.GET_VOICE_AGENT]: voiceMessaging.getVoiceAgent,
  [AVAILABLE_ACTIONS.LIST_VOICE_AGENTS]: voiceMessaging.listVoiceAgents,
  [AVAILABLE_ACTIONS.UPDATE_VOICE_AGENT]: voiceMessaging.updateVoiceAgent,
  [AVAILABLE_ACTIONS.ASSIGN_PHONE_TO_VOICE_AGENT]: voiceMessaging.assignPhoneToVoiceAgent,
  [AVAILABLE_ACTIONS.CONFIGURE_AUTO_REPLY]: voiceMessaging.configureAutoReply,
  [AVAILABLE_ACTIONS.MAKE_OUTBOUND_CALL]: voiceMessaging.makeOutboundCallAction,
  [AVAILABLE_ACTIONS.CALL_LEADS]: voiceMessaging.callLeadsAction,
  [AVAILABLE_ACTIONS.DRAFT_SMS]: voiceMessaging.draftSMSAction,
  [AVAILABLE_ACTIONS.SEND_SMS]: voiceMessaging.sendSMSAction,
  [AVAILABLE_ACTIONS.SCHEDULE_SMS]: voiceMessaging.scheduleSMSAction,
  [AVAILABLE_ACTIONS.DRAFT_EMAIL]: voiceMessaging.draftEmailAction,
  [AVAILABLE_ACTIONS.SEND_EMAIL]: voiceMessaging.sendEmailAction,
  [AVAILABLE_ACTIONS.SCHEDULE_EMAIL]: voiceMessaging.scheduleEmailAction,
  [AVAILABLE_ACTIONS.SMS_LEADS]: voiceMessaging.smsLeadsAction,
  [AVAILABLE_ACTIONS.EMAIL_LEADS]: voiceMessaging.emailLeadsAction,
  [AVAILABLE_ACTIONS.SEND_WHATSAPP_MESSAGE]: voiceMessaging.sendWhatsAppMessage,
  [AVAILABLE_ACTIONS.GET_WHATSAPP_CONVERSATIONS]: voiceMessaging.getWhatsAppConversations,
  [AVAILABLE_ACTIONS.SUMMARIZE_CALL]: voiceMessaging.summarizeCall,
  [AVAILABLE_ACTIONS.GET_SMART_REPLIES]: voiceMessaging.getSmartReplies,

  // CRM — Leads, Deals, Pipelines, Campaigns, Contacts
  [AVAILABLE_ACTIONS.CREATE_LEAD]: crm.createLead,
  [AVAILABLE_ACTIONS.UPDATE_LEAD]: crm.updateLead,
  [AVAILABLE_ACTIONS.GET_LEAD_DETAILS]: crm.getLeadDetails,
  [AVAILABLE_ACTIONS.DELETE_LEAD]: crm.deleteLead,
  [AVAILABLE_ACTIONS.LIST_LEADS]: crm.listLeads,
  [AVAILABLE_ACTIONS.CREATE_DEAL]: crm.createDeal,
  [AVAILABLE_ACTIONS.UPDATE_DEAL]: crm.updateDeal,
  [AVAILABLE_ACTIONS.GET_DEAL_DETAILS]: crm.getDealDetails,
  [AVAILABLE_ACTIONS.DELETE_DEAL]: crm.deleteDeal,
  [AVAILABLE_ACTIONS.CREATE_PIPELINE]: crm.createPipeline,
  [AVAILABLE_ACTIONS.CREATE_PIPELINE_STAGE]: crm.createPipelineStage,
  [AVAILABLE_ACTIONS.LIST_DEALS]: crm.listDeals,
  [AVAILABLE_ACTIONS.CREATE_CAMPAIGN]: crm.createCampaign,
  [AVAILABLE_ACTIONS.UPDATE_CAMPAIGN]: crm.updateCampaign,
  [AVAILABLE_ACTIONS.GET_CAMPAIGN_DETAILS]: crm.getCampaignDetails,
  [AVAILABLE_ACTIONS.LIST_CAMPAIGNS]: crm.listCampaigns,
  [AVAILABLE_ACTIONS.SEARCH_CONTACTS]: crm.searchContacts,
  [AVAILABLE_ACTIONS.ADD_LEAD_TAG]: crm.addLeadTag,
  [AVAILABLE_ACTIONS.UPDATE_LEAD_STATUS]: crm.updateLeadStatus,
  [AVAILABLE_ACTIONS.LIST_NOTES]: crm.listNotes,
  [AVAILABLE_ACTIONS.ADD_NOTE]: crm.addNote,
  [AVAILABLE_ACTIONS.GET_PIPELINE_STAGES]: crm.getPipelineStages,
  [AVAILABLE_ACTIONS.ASSIGN_DEAL_TO_LEAD]: crm.assignDealToLead,
  [AVAILABLE_ACTIONS.UPDATE_DEAL_STAGE]: crm.updateDealStage,
  [AVAILABLE_ACTIONS.BULK_UPDATE_LEAD_STATUS]: crm.bulkUpdateLeadStatus,
  [AVAILABLE_ACTIONS.BULK_ADD_TAG]: crm.bulkAddTag,
  [AVAILABLE_ACTIONS.EXPORT_PIPELINE_CSV]: crm.exportPipelineCsv,
  [AVAILABLE_ACTIONS.GET_DEAL_RISK_ALERTS]: crm.getDealRiskAlerts,
  [AVAILABLE_ACTIONS.DO_EVERYTHING_FOR_CONTACT]: crm.doEverythingForContact,
  [AVAILABLE_ACTIONS.LOG_EMAIL_TO_CONTACT]: crm.logEmailToContact,
  [AVAILABLE_ACTIONS.DELETE_DUPLICATE_CONTACTS]: crm.deleteDuplicateContacts,
  [AVAILABLE_ACTIONS.IMPORT_CONTACTS]: crm.importContacts,

  // Tasks, Workflows, Appointments, AI Employees
  [AVAILABLE_ACTIONS.CREATE_TASK]: tasksWorkflows.createTask,
  [AVAILABLE_ACTIONS.LIST_TASKS]: tasksWorkflows.listTasks,
  [AVAILABLE_ACTIONS.COMPLETE_TASK]: tasksWorkflows.completeTask,
  [AVAILABLE_ACTIONS.UPDATE_TASK]: tasksWorkflows.updateTask,
  [AVAILABLE_ACTIONS.CANCEL_TASK]: tasksWorkflows.cancelTask,
  [AVAILABLE_ACTIONS.RESCHEDULE_TASK]: tasksWorkflows.rescheduleTask,
  [AVAILABLE_ACTIONS.CREATE_BULK_TASKS]: tasksWorkflows.createBulkTasks,
  [AVAILABLE_ACTIONS.CREATE_WORKFLOW]: tasksWorkflows.createWorkflow,
  [AVAILABLE_ACTIONS.CREATE_SMART_WORKFLOW]: tasksWorkflows.createWorkflow,
  [AVAILABLE_ACTIONS.ADD_WORKFLOW_TASK]: tasksWorkflows.addWorkflowTask,
  [AVAILABLE_ACTIONS.CREATE_APPOINTMENT]: tasksWorkflows.createAppointment,
  [AVAILABLE_ACTIONS.LIST_APPOINTMENTS]: tasksWorkflows.listAppointments,
  [AVAILABLE_ACTIONS.UPDATE_APPOINTMENT]: tasksWorkflows.updateAppointment,
  [AVAILABLE_ACTIONS.CANCEL_APPOINTMENT]: tasksWorkflows.cancelAppointment,
  [AVAILABLE_ACTIONS.CREATE_AI_EMPLOYEE]: tasksWorkflows.createAIEmployee,
  [AVAILABLE_ACTIONS.LIST_AI_EMPLOYEES]: tasksWorkflows.listAIEmployees,

  // Website Builder
  [AVAILABLE_ACTIONS.CLONE_WEBSITE]: website.cloneWebsite,
  [AVAILABLE_ACTIONS.CREATE_WEBSITE]: website.createWebsite,
  [AVAILABLE_ACTIONS.LIST_WEBSITES]: website.listWebsites,
  [AVAILABLE_ACTIONS.MODIFY_WEBSITE]: website.modifyWebsite,
  [AVAILABLE_ACTIONS.GET_WEBSITE_STRUCTURE]: website.getWebsiteStructure,
  [AVAILABLE_ACTIONS.UPDATE_HERO]: website.updateHero,
  [AVAILABLE_ACTIONS.ADD_SECTION]: website.addSection,
  [AVAILABLE_ACTIONS.UPDATE_SECTION_CONTENT]: website.updateSectionContent,
  [AVAILABLE_ACTIONS.ADD_CTA]: website.addCTA,
  [AVAILABLE_ACTIONS.REORDER_SECTION]: website.reorderSection,
  [AVAILABLE_ACTIONS.DELETE_SECTION]: website.deleteSection,
  [AVAILABLE_ACTIONS.LIST_WEBSITE_MEDIA]: website.listWebsiteMedia,
  [AVAILABLE_ACTIONS.ADD_WEBSITE_IMAGE]: website.addWebsiteImage,
  [AVAILABLE_ACTIONS.MAKE_IT_LOOK_LIKE]: website.makeItLookLike,
  [AVAILABLE_ACTIONS.SUGGEST_HERO_VARIANTS]: website.suggestHeroVariants,
  [AVAILABLE_ACTIONS.CHECK_WEBSITE_ACCESSIBILITY]: website.checkWebsiteAccessibility,

  // Analytics, Reports, Financial, Inventory, Industry
  [AVAILABLE_ACTIONS.GET_STATISTICS]: analyticsReports.getStatistics,
  [AVAILABLE_ACTIONS.CREATE_REPORT]: analyticsReports.createReport,
  [AVAILABLE_ACTIONS.GET_RECENT_ACTIVITY]: analyticsReports.getRecentActivity,
  [AVAILABLE_ACTIONS.GET_CUSTOM_REPORT]: analyticsReports.getCustomReport,
  [AVAILABLE_ACTIONS.CREATE_SCHEDULED_REPORT]: analyticsReports.createScheduledReport,
  [AVAILABLE_ACTIONS.GET_FOLLOW_UP_PRIORITY]: analyticsReports.getFollowUpPriority,
  [AVAILABLE_ACTIONS.GET_FOLLOW_UP_SUGGESTIONS]: analyticsReports.getFollowUpSuggestions,
  [AVAILABLE_ACTIONS.GET_MEETING_PREP]: analyticsReports.getMeetingPrep,
  [AVAILABLE_ACTIONS.GET_DAILY_BRIEFING]: analyticsReports.getDailyBriefing,
  [AVAILABLE_ACTIONS.GET_AUTO_ACTION_SUGGESTIONS]: analyticsReports.getAutoActionSuggestions,
  [AVAILABLE_ACTIONS.LIST_EMAIL_TEMPLATES]: analyticsReports.listEmailTemplates,
  [AVAILABLE_ACTIONS.LIST_SMS_TEMPLATES]: analyticsReports.listSMSTemplates,
  [AVAILABLE_ACTIONS.CREATE_INVOICE]: analyticsReports.createInvoice,
  [AVAILABLE_ACTIONS.LIST_OVERDUE_INVOICES]: analyticsReports.listOverdueInvoices,
  [AVAILABLE_ACTIONS.UPDATE_INVOICE_STATUS]: analyticsReports.updateInvoiceStatus,
  [AVAILABLE_ACTIONS.SEND_INVOICE]: analyticsReports.sendInvoice,
  [AVAILABLE_ACTIONS.GET_PAYMENT_ANALYTICS]: analyticsReports.getPaymentAnalytics,
  [AVAILABLE_ACTIONS.GET_REVENUE_BREAKDOWN]: analyticsReports.getRevenueBreakdown,
  [AVAILABLE_ACTIONS.LIST_FRAUD_ALERTS]: analyticsReports.listFraudAlerts,
  [AVAILABLE_ACTIONS.CHECK_CASH_FLOW]: analyticsReports.checkCashFlow,
  [AVAILABLE_ACTIONS.CHECK_STOCK_LEVELS]: analyticsReports.checkStockLevels,
  [AVAILABLE_ACTIONS.GET_BEST_SELLERS]: analyticsReports.getBestSellers,
  [AVAILABLE_ACTIONS.TRACK_ORDER]: analyticsReports.trackOrder,
  [AVAILABLE_ACTIONS.GET_LOW_STOCK_ALERTS]: analyticsReports.getLowStockAlerts,
  [AVAILABLE_ACTIONS.GET_WEBSITE_ANALYTICS]: analyticsReports.getWebsiteAnalytics,
  [AVAILABLE_ACTIONS.GET_VOICE_AI_ANALYTICS]: analyticsReports.getVoiceAIAnalytics,
  [AVAILABLE_ACTIONS.GET_CONVERSATION_ANALYTICS]: analyticsReports.getConversationAnalytics,
  [AVAILABLE_ACTIONS.GET_DELIVERY_ANALYTICS]: analyticsReports.getDeliveryAnalytics,
  [AVAILABLE_ACTIONS.MANAGE_RESERVATIONS]: analyticsReports.manageReservations,
  [AVAILABLE_ACTIONS.MANAGE_TABLES]: analyticsReports.manageTables,
  [AVAILABLE_ACTIONS.GET_TEAM_PERFORMANCE]: analyticsReports.getTeamPerformance,
  [AVAILABLE_ACTIONS.GET_AUDIT_LOG]: analyticsReports.getAuditLog,
  [AVAILABLE_ACTIONS.CHECK_INTEGRATIONS]: analyticsReports.checkIntegrations,
  [AVAILABLE_ACTIONS.MANAGE_REVIEWS]: analyticsReports.manageReviews,
  [AVAILABLE_ACTIONS.GET_REFERRAL_STATS]: analyticsReports.getReferralStats,
  [AVAILABLE_ACTIONS.GET_INDUSTRY_ANALYTICS]: analyticsReports.getIndustryAnalytics,
  [AVAILABLE_ACTIONS.GET_BUSINESS_SCORE]: analyticsReports.getBusinessScore,
  [AVAILABLE_ACTIONS.GET_COST_OPTIMIZATION]: analyticsReports.getCostOptimization,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { action, parameters, userId: bodyUserId } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // Support server-side calls (e.g. from voice agent) with userId in body - skip session check
    let user;
    if (bodyUserId) {
      user = await prisma.user.findUnique({
        where: { id: bodyUserId },
        select: { id: true, language: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } else {
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, language: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    const handler = ACTION_HANDLERS[action];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    const result = await handler(user.id, parameters || {});

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error executing action:", error);
    const message = error?.message || "";
    const userFriendly =
      message.includes("not found") ? "We couldn't find what you're looking for."
      : message.includes("required") ? "Some required information is missing."
      : message.includes("permission") || message.includes("Unauthorized") ? "You don't have permission to do that."
      : message.includes("JSON") || message.includes("parse") ? "We received an unexpected response. Please try again."
      : message.length > 100 ? "Something went wrong. Please try again."
      : message || "Something went wrong. Please try again.";
    return NextResponse.json(
      {
        error: userFriendly,
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
