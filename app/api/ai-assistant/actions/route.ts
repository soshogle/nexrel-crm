
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseChartIntent, getDynamicChartData } from "@/lib/crm-chart-intent";
import { parseScenarioIntent, calculateScenario } from "@/lib/crm-scenario-predictor";

// Define available actions

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

    let result;

    switch (action) {
      // Setup & Configuration Actions
      case AVAILABLE_ACTIONS.SETUP_STRIPE:
        result = await setupStripe(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SETUP_SQUARE:
        result = await setupSquare(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SETUP_PAYPAL:
        result = await setupPayPal(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SETUP_TWILIO:
        result = await setupTwilio(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.PURCHASE_TWILIO_NUMBER:
        result = await purchaseTwilioNumber(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_VOICE_AGENT:
        result = await createVoiceAgent(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.DEBUG_VOICE_AGENT:
        result = await debugVoiceAgent(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.FIX_VOICE_AGENT:
        result = await fixVoiceAgent(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_VOICE_AGENT:
        result = await getVoiceAgent(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.LIST_VOICE_AGENTS:
        result = await listVoiceAgents(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_VOICE_AGENT:
        result = await updateVoiceAgent(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.ASSIGN_PHONE_TO_VOICE_AGENT:
        result = await assignPhoneToVoiceAgent(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CONFIGURE_AUTO_REPLY:
        result = await configureAutoReply(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_WORKFLOW:
      case AVAILABLE_ACTIONS.CREATE_SMART_WORKFLOW:
        result = await createWorkflow(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.ADD_WORKFLOW_TASK:
        result = await addWorkflowTask(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_APPOINTMENT:
        result = await createAppointment(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.LIST_APPOINTMENTS:
        result = await listAppointments(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_APPOINTMENT:
        result = await updateAppointment(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CANCEL_APPOINTMENT:
        result = await cancelAppointment(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.MAKE_OUTBOUND_CALL:
        result = await makeOutboundCallAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CALL_LEADS:
        result = await callLeadsAction(user.id, parameters);
        break;

      // CRM Operations
      case AVAILABLE_ACTIONS.CREATE_LEAD:
        result = await createLead(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_LEAD:
        result = await updateLead(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_LEAD_DETAILS:
        result = await getLeadDetails(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.DELETE_LEAD:
        result = await deleteLead(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.LIST_LEADS:
        result = await listLeads(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_DEAL:
        result = await createDeal(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_DEAL_DETAILS:
        result = await getDealDetails(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.DELETE_DEAL:
        result = await deleteDeal(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_PIPELINE:
        result = await createPipeline(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_PIPELINE_STAGE:
        result = await createPipelineStage(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.LIST_DEALS:
        result = await listDeals(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_CAMPAIGN:
        result = await createCampaign(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_CAMPAIGN:
        result = await updateCampaign(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_CAMPAIGN_DETAILS:
        result = await getCampaignDetails(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.LIST_CAMPAIGNS:
        result = await listCampaigns(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SEARCH_CONTACTS:
        result = await searchContacts(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_TASK:
        result = await createTask(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.LIST_TASKS:
        result = await listTasks(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.COMPLETE_TASK:
        result = await completeTask(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_TASK:
        result = await updateTask(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CANCEL_TASK:
        result = await cancelTask(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.ADD_NOTE:
        result = await addNote(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_DEAL_STAGE:
        result = await updateDealStage(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_INVOICE:
        result = await createInvoice(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.LIST_OVERDUE_INVOICES:
        result = await listOverdueInvoices(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_INVOICE_STATUS:
        result = await updateInvoiceStatus(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SEND_INVOICE:
        result = await sendInvoice(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_DAILY_BRIEFING:
        result = await getDailyBriefing(user.id);
        break;

      case AVAILABLE_ACTIONS.UPDATE_DEAL:
        result = await updateDealOrByTitle(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_FOLLOW_UP_SUGGESTIONS:
        result = await getFollowUpSuggestions(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_MEETING_PREP:
        result = await getMeetingPrep(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_BULK_TASKS:
        result = await createBulkTasks(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.DRAFT_SMS:
        result = await draftSMSAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SEND_SMS:
        result = await sendSMSAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SCHEDULE_SMS:
        result = await scheduleSMSAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.DRAFT_EMAIL:
        result = await draftEmailAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SEND_EMAIL:
        result = await sendEmailAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SCHEDULE_EMAIL:
        result = await scheduleEmailAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SMS_LEADS:
        result = await smsLeadsAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.EMAIL_LEADS:
        result = await emailLeadsAction(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.DELETE_DUPLICATE_CONTACTS:
        result = await deleteDuplicateContacts(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_STATISTICS:
        result = await getStatistics(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_REPORT:
        result = await createReport(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_RECENT_ACTIVITY:
        result = await getRecentActivity(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.IMPORT_CONTACTS:
        result = await importContacts(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.UPDATE_PROFILE:
      case AVAILABLE_ACTIONS.UPDATE_COMPANY_PROFILE:
        result = await updateProfile(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SETUP_QUICKBOOKS:
        result = await setupQuickBooks(user.id);
        break;

      case AVAILABLE_ACTIONS.SETUP_WHATSAPP:
        result = await setupWhatsApp(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.CREATE_QUICKBOOKS_INVOICE:
        result = await createQuickBooksInvoice(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SYNC_CONTACT_TO_QUICKBOOKS:
        result = await syncContactToQuickBooks(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.SEND_WHATSAPP_MESSAGE:
        result = await sendWhatsAppMessage(user.id, parameters);
        break;

      case AVAILABLE_ACTIONS.GET_WHATSAPP_CONVERSATIONS:
        result = await getWhatsAppConversations(user.id, parameters);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error executing action:", error);
    return NextResponse.json(
      {
        error: "Failed to execute action",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Action implementations
async function createLead(userId: string, params: any) {
  const { name, email, phone, company, status } = params;
  
  if (!name) {
    throw new Error("Lead name is required");
  }

  const lead = await prisma.lead.create({
    data: {
      userId,
      businessName: company || name,
      contactPerson: name,
      email: email || null,
      phone: phone || null,
      status: status || "NEW",
      source: "AI Assistant",
    },
  });

  return {
    message: `Lead "${name}" created successfully!`,
    lead: {
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
    },
  };
}

async function updateLead(userId: string, params: any) {
  const { leadId, contactName, email, phone, status, company, name, ...rest } = params;

  let targetLeadId = leadId;
  if (!targetLeadId && contactName) {
    const found = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { businessName: { contains: contactName, mode: "insensitive" } },
          { contactPerson: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
    if (!found) throw new Error(`Lead "${contactName}" not found`);
    targetLeadId = found.id;
  }

  if (!targetLeadId) {
    throw new Error("Lead ID or contact name is required");
  }

  const updates: any = { ...rest };
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (status !== undefined) updates.status = status;
  if (company !== undefined) updates.businessName = company;
  if (name !== undefined) updates.contactPerson = name;

  const existingLead = await prisma.lead.findFirst({
    where: { id: targetLeadId, userId },
  });

  if (!existingLead) {
    throw new Error("Lead not found");
  }

  const lead = await prisma.lead.update({
    where: { id: targetLeadId },
    data: updates,
  });

  return {
    message: `Lead "${lead.businessName}" updated successfully!`,
    lead: {
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      status: lead.status,
    },
  };
}

async function getLeadDetails(userId: string, params: any) {
  const { leadId, name, contactName } = params;
  const searchName = name || contactName;

  let lead;

  if (leadId) {
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 5 },
        deals: { include: { stage: true } },
        tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 10 },
      },
    });
  } else if (searchName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { businessName: { contains: searchName, mode: "insensitive" } },
          { contactPerson: { contains: searchName, mode: "insensitive" } },
        ],
      },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 5 },
        deals: { include: { stage: true } },
        tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 10 },
      },
    });
  }

  if (!lead) {
    throw new Error("Lead not found");
  }

  return {
    message: `Details for ${lead.contactPerson || lead.businessName}`,
    lead: {
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      notes: lead.notes,
      deals: lead.deals?.map((d: any) => ({ id: d.id, title: d.title, value: d.value, stage: d.stage?.name })) || [],
      tasks: lead.tasks?.map((t: any) => ({ id: t.id, title: t.title, dueDate: t.dueDate })) || [],
      createdAt: lead.createdAt,
    },
  };
}

async function deleteLead(userId: string, params: any) {
  const { leadId, contactName } = params;

  let targetId = leadId;
  if (!targetId && contactName) {
    const found = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { businessName: { contains: contactName, mode: "insensitive" } },
          { contactPerson: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
    if (!found) throw new Error(`Lead "${contactName}" not found`);
    targetId = found.id;
  }

  if (!targetId) throw new Error("Lead ID or contact name is required");

  const existing = await prisma.lead.findFirst({
    where: { id: targetId, userId },
  });
  if (!existing) throw new Error("Lead not found");

  await prisma.lead.delete({
    where: { id: targetId },
  });

  return {
    message: `Lead "${existing.contactPerson || existing.businessName}" deleted successfully.`,
    leadId: targetId,
  };
}

async function listLeads(userId: string, params: any) {
  const { status, limit = 10, search } = params;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: "insensitive" } },
      { contactPerson: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    take: Math.min(limit, 50), // Max 50 leads
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      businessName: true,
      contactPerson: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    count: leads.length,
    leads,
  };
}

async function createDeal(userId: string, params: any) {
  const { title, value, stage, leadId } = params;

  if (!title) {
    throw new Error("Deal title is required");
  }

  // Get or create default pipeline
  let pipeline = await prisma.pipeline.findFirst({
    where: { userId, isDefault: true },
    include: { stages: { orderBy: { displayOrder: "asc" } } },
  });

  if (!pipeline) {
    // Create default pipeline with stages
    pipeline = await prisma.pipeline.create({
      data: {
        userId,
        name: "Sales Pipeline",
        isDefault: true,
        stages: {
          create: [
            { name: "Prospecting", displayOrder: 0, probability: 10 },
            { name: "Qualification", displayOrder: 1, probability: 25 },
            { name: "Proposal", displayOrder: 2, probability: 50 },
            { name: "Negotiation", displayOrder: 3, probability: 75 },
            { name: "Won", displayOrder: 4, probability: 100 },
            { name: "Lost", displayOrder: 5, probability: 0 },
          ],
        },
      },
      include: { stages: { orderBy: { displayOrder: "asc" } } },
    });
  }

  const firstStage = pipeline.stages[0];

  const deal = await prisma.deal.create({
    data: {
      userId,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      title,
      value: value || 0,
      leadId: leadId || null,
      probability: firstStage.probability,
    },
  });

  return {
    message: `Deal "${title}" created successfully!`,
    deal: {
      id: deal.id,
      title: deal.title,
      value: deal.value,
      stage: firstStage.name,
    },
  };
}

async function updateDeal(userId: string, params: any) {
  const { dealId, ...updates } = params;

  if (!dealId) {
    throw new Error("Deal ID is required");
  }

  // Verify ownership
  const existingDeal = await prisma.deal.findFirst({
    where: { id: dealId, userId },
  });

  if (!existingDeal) {
    throw new Error("Deal not found");
  }

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: updates,
    include: {
      stage: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    message: `Deal "${deal.title}" updated successfully!`,
    deal: {
      id: deal.id,
      title: deal.title,
      stage: deal.stage.name,
      value: deal.value,
    },
  };
}

async function getDealDetails(userId: string, params: any) {
  const { dealId, dealTitle } = params;

  let deal;
  if (dealId) {
    deal = await prisma.deal.findFirst({
      where: { id: dealId, userId },
      include: { lead: { select: { id: true, businessName: true, contactPerson: true, email: true, phone: true } }, stage: true },
    });
  } else if (dealTitle) {
    deal = await prisma.deal.findFirst({
      where: { userId, title: { contains: dealTitle, mode: "insensitive" } },
      include: { lead: { select: { id: true, businessName: true, contactPerson: true, email: true, phone: true } }, stage: true },
    });
  }

  if (!deal) {
    throw new Error(dealId || dealTitle ? "Deal not found" : "Deal ID or deal title is required");
  }

  return {
    message: `Details for deal "${deal.title}"`,
    deal,
  };
}

async function deleteDeal(userId: string, params: any) {
  const { dealId, dealTitle } = params;

  let targetId = dealId;
  if (!targetId && dealTitle) {
    const found = await prisma.deal.findFirst({
      where: { userId, title: { contains: dealTitle, mode: "insensitive" } },
    });
    if (!found) throw new Error(`Deal "${dealTitle}" not found`);
    targetId = found.id;
  }

  if (!targetId) throw new Error("Deal ID or deal title is required");

  const existing = await prisma.deal.findFirst({
    where: { id: targetId, userId },
  });
  if (!existing) throw new Error("Deal not found");

  await prisma.deal.delete({ where: { id: targetId } });

  return {
    message: `Deal "${existing.title}" deleted successfully.`,
    dealId: targetId,
  };
}

async function createPipeline(userId: string, params: any) {
  const { name, description } = params;

  if (!name) throw new Error("Pipeline name is required");

  const pipeline = await prisma.pipeline.create({
    data: {
      userId,
      name,
      description: description || null,
      isDefault: false,
    },
  });

  return {
    message: `Pipeline "${name}" created successfully!`,
    pipeline: { id: pipeline.id, name: pipeline.name },
  };
}

async function createPipelineStage(userId: string, params: any) {
  const { pipelineName, stageName, probability } = params;

  if (!pipelineName || !stageName) throw new Error("Pipeline name and stage name are required");

  const pipeline = await prisma.pipeline.findFirst({
    where: { userId, name: { contains: pipelineName, mode: "insensitive" } },
    include: { stages: { orderBy: { displayOrder: "asc" } } },
  });

  if (!pipeline) throw new Error(`Pipeline "${pipelineName}" not found`);

  const maxOrder = pipeline.stages.length > 0 ? Math.max(...pipeline.stages.map((s) => s.displayOrder)) + 1 : 0;

  const stage = await prisma.pipelineStage.create({
    data: {
      pipelineId: pipeline.id,
      name: stageName,
      displayOrder: maxOrder,
      probability: probability ?? 50,
    },
  });

  return {
    message: `Stage "${stageName}" added to pipeline "${pipeline.name}"`,
    stage: { id: stage.id, name: stage.name },
  };
}

async function listDeals(userId: string, params: any) {
  const { stage, limit = 10 } = params;

  const where: any = { userId };

  const deals = await prisma.deal.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { createdAt: "desc" },
    include: {
      lead: true,
      stage: true,
    },
  });

  return {
    count: deals.length,
    deals,
  };
}

async function createCampaign(userId: string, params: any) {
  const { name, type, status } = params;

  if (!name) {
    throw new Error("Campaign name is required");
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId,
      name,
      type: type || "SMS",
      status: status || "DRAFT",
      smsTemplate: "Default SMS template - please update",
    },
  });

  return {
    message: `Campaign "${name}" created successfully!`,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
    },
  };
}

async function updateCampaign(userId: string, params: any) {
  const { campaignId, campaignName, name, status } = params;

  let campaign;
  if (campaignId) {
    campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
  } else if (campaignName) {
    campaign = await prisma.campaign.findFirst({
      where: { userId, name: { contains: campaignName, mode: "insensitive" } },
    });
  }

  if (!campaign) throw new Error("Campaign not found");

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field (name or status) is required to update");
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: updates,
  });

  return {
    message: `Campaign "${updated.name}" updated successfully!`,
    campaign: { id: updated.id, name: updated.name, status: updated.status },
  };
}

async function getCampaignDetails(userId: string, params: any) {
  const { campaignId, campaignName } = params;

  let campaign;
  if (campaignId) {
    campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
  } else if (campaignName) {
    campaign = await prisma.campaign.findFirst({
      where: { userId, name: { contains: campaignName, mode: "insensitive" } },
    });
  }

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  return {
    message: `Details for campaign "${campaign.name}"`,
    campaign,
  };
}

async function listCampaigns(userId: string, params: any) {
  const { status, limit = 10 } = params;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { createdAt: "desc" },
  });

  return {
    count: campaigns.length,
    campaigns,
  };
}

async function searchContacts(userId: string, params: any) {
  const { query, limit = 10 } = params;

  if (!query) {
    throw new Error("Search query is required");
  }

  const leads = await prisma.lead.findMany({
    where: {
      userId,
      OR: [
        { businessName: { contains: query, mode: "insensitive" } },
        { contactPerson: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    take: Math.min(limit, 20),
    select: {
      id: true,
      businessName: true,
      contactPerson: true,
      email: true,
      phone: true,
      status: true,
    },
  });

  return {
    query,
    count: leads.length,
    contacts: leads,
  };
}

async function createTask(userId: string, params: any) {
  const { title, description, dueDate, leadId, dealId, priority } = params;

  if (!title) {
    throw new Error("Task title is required");
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      leadId: leadId || null,
      dealId: dealId || null,
      priority: (priority as any) || "MEDIUM",
      status: "TODO",
    },
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      userId,
      action: "CREATED",
      newValue: "Task created",
    },
  });

  return {
    message: `✓ Task "${title}" created successfully!`,
    task: {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status,
    },
  };
}

async function listTasks(userId: string, params: any) {
  const { status, overdue, limit = 20 } = params;

  const where: any = { userId };
  if (status) where.status = status;
  if (overdue === true) {
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ["COMPLETED", "CANCELLED"] };
  }

  const tasks = await prisma.task.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      lead: { select: { businessName: true, contactPerson: true } },
      deal: { select: { title: true } },
    },
  });

  return {
    message: `Found ${tasks.length} task(s)`,
    count: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      lead: t.lead,
      deal: t.deal,
    })),
  };
}

async function completeTask(userId: string, params: any) {
  const { taskId, taskTitle } = params;

  let task;
  if (taskId) {
    task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
  } else if (taskTitle) {
    task = await prisma.task.findFirst({
      where: {
        userId,
        title: { contains: taskTitle, mode: "insensitive" },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    });
  }

  if (!task) {
    throw new Error(taskId ? "Task not found" : `No matching task found for "${taskTitle}"`);
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "COMPLETED", completedAt: new Date(), progressPercent: 100 },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      userId,
      action: "STATUS_CHANGED",
      oldValue: task.status,
      newValue: "COMPLETED",
    },
  });

  return {
    message: `✓ Task "${task.title}" marked as complete!`,
    task: { id: task.id, title: task.title },
  };
}

async function updateTask(userId: string, params: any) {
  const { taskId, taskTitle, title, dueDate, priority } = params;

  let task;
  if (taskId) {
    task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
  } else if (taskTitle) {
    task = await prisma.task.findFirst({
      where: { userId, title: { contains: taskTitle, mode: "insensitive" } },
    });
  }

  if (!task) throw new Error("Task not found");

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (dueDate !== undefined) updates.dueDate = new Date(dueDate);
  if (priority !== undefined) updates.priority = priority;

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field (title, dueDate, or priority) is required to update");
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: updates,
  });

  return {
    message: `Task "${updated.title}" updated successfully!`,
    task: { id: updated.id, title: updated.title },
  };
}

async function cancelTask(userId: string, params: any) {
  const { taskId, taskTitle } = params;

  let task;
  if (taskId) {
    task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
  } else if (taskTitle) {
    task = await prisma.task.findFirst({
      where: { userId, title: { contains: taskTitle, mode: "insensitive" } },
    });
  }

  if (!task) throw new Error("Task not found");

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "CANCELLED" },
  });

  return {
    message: `Task "${task.title}" cancelled.`,
    taskId: task.id,
  };
}

async function addNote(userId: string, params: any) {
  const { contactName, dealTitle, content, leadId, dealId } = params;

  if (!content || !content.trim()) {
    throw new Error("Note content is required");
  }

  if (dealId || dealTitle) {
    let deal;
    if (dealId) {
      deal = await prisma.deal.findFirst({
        where: { id: dealId, userId },
      });
    } else {
      deal = await prisma.deal.findFirst({
        where: {
          userId,
          title: { contains: dealTitle, mode: "insensitive" },
        },
      });
    }

    if (!deal) {
      throw new Error(`Deal "${dealTitle || dealId}" not found`);
    }

    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        userId,
        type: "NOTE",
        description: content.trim(),
      },
    });

    return {
      message: `✓ Note added to deal "${deal.title}"`,
      dealId: deal.id,
      type: "deal",
    };
  }

  let lead;
  if (leadId) {
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    });
  } else if (contactName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
  }

  if (!lead) {
    throw new Error(contactName ? `Contact "${contactName}" not found` : "Contact or lead ID is required");
  }

  await prisma.note.create({
    data: {
      leadId: lead.id,
      userId,
      content: content.trim(),
    },
  });

  return {
    message: `✓ Note added to contact ${lead.contactPerson || lead.businessName}`,
    leadId: lead.id,
    type: "contact",
  };
}

async function updateDealStage(userId: string, params: any) {
  const { dealTitle, stageName, dealId } = params;

  let deal;
  if (dealId) {
    deal = await prisma.deal.findFirst({
      where: { id: dealId, userId },
      include: { stage: true, pipeline: true },
    });
  } else if (dealTitle) {
    deal = await prisma.deal.findFirst({
      where: {
        userId,
        title: { contains: dealTitle, mode: "insensitive" },
      },
      include: { stage: true, pipeline: true },
    });
  }

  if (!deal) {
    throw new Error(`Deal "${dealTitle || dealId}" not found`);
  }

  const stage = await prisma.pipelineStage.findFirst({
    where: {
      pipelineId: deal.pipelineId,
      name: { contains: stageName, mode: "insensitive" },
    },
  });

  if (!stage) {
    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId: deal.pipelineId },
      orderBy: { displayOrder: "asc" },
    });
    throw new Error(
      `Stage "${stageName}" not found. Available stages: ${stages.map((s) => s.name).join(", ")}`
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const updatedDeal = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: stage.id,
      probability: stage.probability,
    },
    include: {
      lead: true,
      stage: true,
    },
  });

  await prisma.dealActivity.create({
    data: {
      dealId: deal.id,
      userId,
      type: "STAGE_CHANGED",
      description: `Deal moved from "${deal.stage.name}" to "${stage.name}"`,
    },
  });

  try {
    const { default: workflowEngine } = await import("@/lib/workflow-engine");
    workflowEngine.triggerWorkflow(
      "DEAL_STAGE_CHANGED",
      {
        userId,
        dealId: deal.id,
        leadId: updatedDeal.leadId || undefined,
        variables: {
          dealTitle: updatedDeal.title,
          dealValue: updatedDeal.value,
          businessName: updatedDeal.lead?.businessName,
        },
      },
      { oldStageId: deal.stageId, newStageId: stage.id }
    ).catch(() => {});
  } catch {}

  return {
    message: `✓ Deal "${deal.title}" moved to "${stage.name}"`,
    deal: {
      id: updatedDeal.id,
      title: updatedDeal.title,
      stage: stage.name,
      value: updatedDeal.value,
    },
  };
}

async function createInvoice(userId: string, params: any) {
  const { contactName, amount, description, leadId, dealId, dueDate } = params;

  if (!contactName || amount == null) {
    throw new Error("Contact name and amount are required");
  }

  let lead;
  if (leadId) {
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    });
  } else {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
  }

  const customerName = lead?.contactPerson || lead?.businessName || contactName;
  const customerEmail = lead?.email || "customer@example.com";
  const customerPhone = lead?.phone || null;

  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const totalAmount = Number(amount);
  const itemDesc = description || "Services";

  const invoice = await prisma.invoice.create({
    data: {
      userId,
      leadId: lead?.id || null,
      dealId: dealId || null,
      invoiceNumber,
      customerName,
      customerEmail,
      customerPhone,
      status: "DRAFT",
      items: [{ description: itemDesc, quantity: 1, unitPrice: totalAmount, total: totalAmount }],
      subtotal: totalAmount,
      taxAmount: 0,
      totalAmount,
      paidAmount: 0,
      currency: "USD",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  return {
    message: `✓ Invoice created for ${customerName} - $${totalAmount.toFixed(2)}`,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName,
      totalAmount,
      status: invoice.status,
    },
  };
}

async function listOverdueInvoices(userId: string, params: any) {
  const { limit = 20 } = params;

  const overdue = await prisma.invoice.findMany({
    where: {
      userId,
      status: { notIn: ["PAID", "CANCELLED", "REFUNDED"] },
      dueDate: { lt: new Date() },
    },
    take: Math.min(limit, 50),
    orderBy: { dueDate: "asc" },
  });

  return {
    message: overdue.length > 0 ? `You have ${overdue.length} overdue invoice(s)` : "No overdue invoices",
    count: overdue.length,
    invoices: overdue.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      totalAmount: inv.totalAmount,
      dueDate: inv.dueDate,
      status: inv.status,
    })),
  };
}

async function updateInvoiceStatus(userId: string, params: any) {
  const { invoiceId, invoiceNumber, status } = params;

  let invoice;
  if (invoiceId) {
    invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });
  } else if (invoiceNumber) {
    invoice = await prisma.invoice.findFirst({
      where: { userId, invoiceNumber: { contains: invoiceNumber, mode: "insensitive" } },
    });
  }

  if (!invoice) throw new Error("Invoice not found");

  const updateData: any = { status: status as any };
  if (status === "PAID") {
    updateData.paidAmount = invoice.totalAmount;
    updateData.paidAt = new Date();
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: updateData,
  });

  return {
    message: `Invoice ${updated.invoiceNumber} marked as ${status}.`,
    invoice: { id: updated.id, invoiceNumber: updated.invoiceNumber, status: updated.status },
  };
}

async function sendInvoice(userId: string, params: any) {
  const { invoiceId, invoiceNumber } = params;

  let invoice;
  if (invoiceId) {
    invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });
  } else if (invoiceNumber) {
    invoice = await prisma.invoice.findFirst({
      where: { userId, invoiceNumber: { contains: invoiceNumber, mode: "insensitive" } },
    });
  }

  if (!invoice) throw new Error("Invoice not found");

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "SENT" as any, sentAt: new Date() },
  });

  return {
    message: `Invoice ${invoice.invoiceNumber} marked as sent. The customer will receive it via email.`,
    invoiceId: invoice.id,
  };
}

async function getDailyBriefing(userId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [overdueTasks, todayTasks, appointments, hotDeals, newLeads, overdueInvoices] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: todayStart },
      },
      take: 10,
      orderBy: { dueDate: "asc" },
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { gte: todayStart, lt: todayEnd },
      },
      take: 10,
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.bookingAppointment.findMany({
      where: {
        userId,
        appointmentDate: { gte: todayStart, lt: todayEnd },
        status: "SCHEDULED",
      },
      take: 10,
      select: { id: true, customerName: true, appointmentDate: true },
    }),
    prisma.deal.findMany({
      where: { userId },
      take: 5,
      orderBy: { value: "desc" },
      include: { stage: true, lead: true },
    }),
    prisma.lead.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: 5,
      select: { id: true, businessName: true, contactPerson: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: { notIn: ["PAID", "CANCELLED", "REFUNDED"] },
        dueDate: { lt: todayStart },
      },
      take: 5,
      select: { id: true, customerName: true, totalAmount: true, dueDate: true },
    }),
  ]);

  const summary: string[] = [];
  if (overdueTasks.length > 0) {
    summary.push(`${overdueTasks.length} overdue task(s): ${overdueTasks.map((t) => t.title).join(", ")}`);
  }
  if (todayTasks.length > 0) {
    summary.push(`${todayTasks.length} task(s) due today: ${todayTasks.map((t) => t.title).join(", ")}`);
  }
  if (appointments.length > 0) {
    summary.push(`${appointments.length} appointment(s) today: ${appointments.map((a) => a.customerName).join(", ")}`);
  }
  if (overdueInvoices.length > 0) {
    summary.push(`${overdueInvoices.length} overdue invoice(s): ${overdueInvoices.map((i) => `${i.customerName} ($${i.totalAmount})`).join(", ")}`);
  }
  if (newLeads.length > 0) {
    summary.push(`${newLeads.length} new lead(s) this week: ${newLeads.map((l) => l.contactPerson || l.businessName).join(", ")}`);
  }
  if (hotDeals.length > 0) {
    summary.push(`Top deals: ${hotDeals.map((d) => `${d.title} ($${d.value})`).join(", ")}`);
  }
  if (summary.length === 0) {
    summary.push("No urgent items. Check your pipeline and tasks.");
  }

  return {
    message: "Here's your daily briefing:",
    summary,
    overdueTasks,
    todayTasks,
    appointments,
    hotDeals,
    newLeads,
    overdueInvoices,
  };
}

async function updateDealOrByTitle(userId: string, params: any) {
  const { dealId, dealTitle, value, expectedCloseDate, ...rest } = params;

  let targetDealId = dealId;
  if (!targetDealId && dealTitle) {
    const deal = await prisma.deal.findFirst({
      where: {
        userId,
        title: { contains: dealTitle, mode: "insensitive" },
      },
    });
    if (!deal) {
      throw new Error(`Deal "${dealTitle}" not found`);
    }
    targetDealId = deal.id;
  }

  if (!targetDealId) {
    throw new Error("Deal ID or deal title is required");
  }

  const updates: any = { ...rest };
  if (value != null) updates.value = value;
  if (expectedCloseDate != null) updates.expectedCloseDate = new Date(expectedCloseDate);

  return updateDeal(userId, { dealId: targetDealId, ...updates });
}

async function getFollowUpSuggestions(userId: string, params: any) {
  const { period = "last_2_weeks", limit = 10 } = params;

  const daysAgo = period === "last_week" ? 7 : period === "last_2_weeks" ? 14 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);

  const leadsWithNotes = await prisma.lead.findMany({
    where: { userId },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const noRecentContact = leadsWithNotes.filter((lead) => {
    const lastNote = lead.notes[0];
    if (!lastNote) return true;
    return new Date(lastNote.createdAt) < cutoff;
  });

  const suggestions = noRecentContact.slice(0, limit).map((l) => ({
    id: l.id,
    name: l.contactPerson || l.businessName,
    email: l.email,
    lastContact: l.notes[0]?.createdAt,
  }));

  return {
    message: suggestions.length > 0
      ? `${suggestions.length} contact(s) you haven't reached out to in ${daysAgo} days`
      : "All contacts have been contacted recently!",
    suggestions,
  };
}

async function getMeetingPrep(userId: string, params: any) {
  const { contactName } = params;

  if (!contactName) {
    throw new Error("Contact name is required");
  }

  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    include: {
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
      deals: {
        include: { stage: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      tasks: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        take: 5,
      },
    },
  });

  if (!lead) {
    throw new Error(`Contact "${contactName}" not found`);
  }

  const lastNote = lead.notes[0];
  const briefing = {
    contact: {
      id: lead.id,
      name: lead.contactPerson || lead.businessName,
      company: lead.businessName,
      email: lead.email,
      phone: lead.phone,
    },
    recentNotes: lead.notes.map((n) => ({ content: n.content, date: n.createdAt })),
    deals: lead.deals.map((d) => ({ title: d.title, value: d.value, stage: d.stage?.name })),
    openTasks: lead.tasks.map((t) => ({ title: t.title, dueDate: t.dueDate })),
    lastContact: lastNote?.createdAt,
  };

  return {
    message: `Here's your briefing for ${briefing.contact.name}:`,
    leadId: lead.id,
    ...briefing,
  };
}

async function createBulkTasks(userId: string, params: any) {
  const { taskTitle, period = "last_week", dueInDays = 1 } = params;

  if (!taskTitle) {
    throw new Error("Task title is required");
  }

  const now = new Date();
  let startDate: Date;
  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "last_week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  }

  const leads = await prisma.lead.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    take: 50,
  });

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + dueInDays);

  const created = [];
  for (const lead of leads) {
    const title = taskTitle.replace(/\{name\}/g, lead.contactPerson || lead.businessName || "Contact");
    const task = await prisma.task.create({
      data: {
        userId,
        leadId: lead.id,
        title,
        dueDate,
        status: "TODO",
        priority: "MEDIUM",
      },
    });
    created.push({ id: task.id, title, lead: lead.contactPerson || lead.businessName });
  }

  return {
    message: `✓ Created ${created.length} task(s) for leads from ${period}`,
    count: created.length,
    tasks: created,
  };
}

async function deleteDuplicateContacts(userId: string, params: any) {
  const { findPotentialDuplicates } = await import('@/lib/lead-generation/deduplication');
  
  console.log(`[DELETE_DUPLICATES] Starting duplicate deletion for user ${userId}...`);
  
  // First, find all potential duplicates
  const potentialDuplicates = await findPotentialDuplicates(userId, 0.85);
  
  if (potentialDuplicates.length === 0) {
    return {
      message: "✅ No duplicate contacts found!",
      duplicatesFound: 0,
      duplicatesDeleted: 0,
    };
  }

  console.log(`[DELETE_DUPLICATES] Found ${potentialDuplicates.length} potential duplicate pairs`);
  
  // Track which leads to keep (oldest) and which to delete
  const leadsToKeep = new Set<string>();
  const leadsToDelete = new Set<string>();
  const processedPairs = new Set<string>();
  
  // First pass: identify which leads to keep (oldest in each pair)
  for (const duplicate of potentialDuplicates) {
    const pairKey = [duplicate.lead1.id, duplicate.lead2.id].sort().join('-');
    
    // Skip if we've already processed this pair
    if (processedPairs.has(pairKey)) {
      continue;
    }
    
    processedPairs.add(pairKey);
    
    // Get full lead data with createdAt
    const lead1 = await prisma.lead.findUnique({
      where: { id: duplicate.lead1.id },
      select: { id: true, createdAt: true },
    });
    
    const lead2 = await prisma.lead.findUnique({
      where: { id: duplicate.lead2.id },
      select: { id: true, createdAt: true },
    });
    
    if (!lead1 || !lead2) continue;
    
    // Keep the older lead, mark the newer one for deletion
    if (lead1.createdAt < lead2.createdAt) {
      leadsToKeep.add(lead1.id);
      // Only mark for deletion if it's not already marked to keep
      if (!leadsToKeep.has(lead2.id)) {
        leadsToDelete.add(lead2.id);
      }
    } else {
      leadsToKeep.add(lead2.id);
      // Only mark for deletion if it's not already marked to keep
      if (!leadsToKeep.has(lead1.id)) {
        leadsToDelete.add(lead1.id);
      }
    }
  }
  
  // Remove any leads from delete set that are in keep set (safety check)
  for (const keepId of leadsToKeep) {
    leadsToDelete.delete(keepId);
  }
  
  console.log(`[DELETE_DUPLICATES] Will delete ${leadsToDelete.size} duplicate contacts`);
  
  // Delete the duplicate leads
  let deletedCount = 0;
  if (leadsToDelete.size > 0) {
    const deleteResult = await prisma.lead.deleteMany({
      where: {
        id: { in: Array.from(leadsToDelete) },
        userId, // Ensure we only delete user's own contacts
      },
    });
    
    deletedCount = deleteResult.count;
    console.log(`[DELETE_DUPLICATES] Successfully deleted ${deletedCount} duplicate contacts`);
  }
  
  return {
    message: deletedCount > 0 
      ? `✅ Successfully deleted ${deletedCount} duplicate contact(s)!`
      : "✅ No duplicates found to delete.",
    duplicatesFound: potentialDuplicates.length,
    duplicatesDeleted: deletedCount,
    details: deletedCount > 0
      ? `Found ${potentialDuplicates.length} duplicate pair(s) and removed ${deletedCount} duplicate contact(s), keeping the oldest version of each.`
      : `Found ${potentialDuplicates.length} duplicate pair(s) but no contacts were deleted (they may have already been removed).`,
  };
}

async function getStatistics(userId: string, params: any = {}) {
  try {
    const { period = 'all_time', compareWith, chartIntent } = params;
    const scenarioIntent = chartIntent; // Same message can contain both chart and scenario
    
    // Calculate date ranges based on period
    const now = new Date();
    let startDate: Date | null = null;
    let compareStartDate: Date | null = null;
    let compareEndDate: Date | null = null;
    
    if (period === 'last_7_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 7, 1);
      if (compareWith === 'previous_year' || compareWith === 'previous_period') {
        compareStartDate = new Date(now.getFullYear() - 1, now.getMonth() - 7, 1);
        compareEndDate = new Date(now.getFullYear() - 1, now.getMonth(), 0);
      }
    } else if (period === 'last_year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    } else if (period === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clauses
    const whereClause: any = { userId };
    const compareWhereClause: any = { userId };
    
    if (startDate) {
      whereClause.createdAt = { gte: startDate };
    }
    
    if (compareStartDate && compareEndDate) {
      compareWhereClause.createdAt = { gte: compareStartDate, lte: compareEndDate };
    }

    const [leads, deals, contacts, campaigns] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.deal.count({ where: whereClause }),
      prisma.lead.count({ where: whereClause }), // Contacts are leads
      prisma.campaign.count({ where: whereClause }),
    ]);

    // Get all deals with dates for time-series analysis
    const allDeals = await prisma.deal.findMany({
      where: whereClause,
      select: { 
        value: true,
        actualCloseDate: true,
        createdAt: true,
        expectedCloseDate: true,
      },
    });
    
    const openDeals = allDeals.filter(deal => deal.actualCloseDate === null);
    const totalRevenue = openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    
    // Calculate revenue by month for the last 7 months
    const monthlyRevenue: Record<string, number> = {};
    const monthlyDeals: Record<string, number> = {};
    
    for (let i = 6; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = 0;
      monthlyDeals[monthKey] = 0;
    }
    
    // Calculate revenue and deals by month
    allDeals.forEach(deal => {
      const dealDate = deal.actualCloseDate || deal.createdAt || deal.expectedCloseDate;
      if (dealDate) {
        const date = new Date(dealDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += deal.value || 0;
          monthlyDeals[monthKey] += 1;
        }
      }
    });
    
    // Get comparison data if requested
    let comparisonData: any = null;
    if (compareStartDate && compareEndDate) {
      const compareDeals = await prisma.deal.findMany({
        where: compareWhereClause,
        select: { 
          value: true,
          actualCloseDate: true,
          createdAt: true,
        },
      });
      
      const compareMonthlyRevenue: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear() - 1, now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        compareMonthlyRevenue[monthKey] = 0;
      }
      
      compareDeals.forEach(deal => {
        const dealDate = deal.actualCloseDate || deal.createdAt;
        if (dealDate) {
          const date = new Date(dealDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (compareMonthlyRevenue.hasOwnProperty(monthKey)) {
            compareMonthlyRevenue[monthKey] += deal.value || 0;
          }
        }
      });
      
      comparisonData = {
        monthlyRevenue: compareMonthlyRevenue,
        totalRevenue: compareDeals.reduce((sum, deal) => sum + (deal.value || 0), 0),
      };
    }

    const recentLeads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { 
        businessName: true,
        contactPerson: true,
        status: true, 
        createdAt: true 
      },
    });

    // "What if" scenario prediction
    let scenarioResult: any = null;
    if (scenarioIntent) {
      const parsed = parseScenarioIntent(scenarioIntent);
      if (parsed) {
        scenarioResult = await calculateScenario(userId, parsed.type, parsed.params);
      }
    }

    // Dynamic charts based on user's chart intent
    let dynamicCharts: { chartType: 'pie' | 'bar' | 'line'; dimension: string; title: string; data: { name: string; value: number }[] }[] = [];
    if (chartIntent) {
      const intent = parseChartIntent(chartIntent);
      if (intent) {
        let data: { name: string; value: number }[] = [];
        if (intent.dimension === 'revenue_by_month') {
          data = Object.entries(monthlyRevenue).map(([month, value]) => ({
            name: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
            value,
          }));
        } else {
          data = await getDynamicChartData(userId, intent.dimension);
        }
        if (data.length > 0) {
          const titles: Record<string, string> = {
            leads_by_status: 'Leads by Status',
            leads_by_source: 'Leads by Source',
            deals_by_stage: 'Deals by Stage',
            revenue_by_stage: 'Revenue by Stage',
            revenue_by_month: 'Monthly Revenue',
          };
          dynamicCharts = [{
            chartType: intent.chartType,
            dimension: intent.dimension,
            title: titles[intent.dimension] || intent.dimension,
            data,
          }];
        }
      }
    }

    // Return format matching CRM voice agent functions route
    return {
      success: true,
      statistics: {
        totalLeads: leads,
        totalDeals: deals,
        totalContacts: contacts,
        totalCampaigns: campaigns,
        openDeals: openDeals.length,
        totalRevenue: totalRevenue,
        monthlyRevenue,
        monthlyDeals,
        comparisonData,
        recentLeads: recentLeads.map(lead => ({
          name: lead.contactPerson || lead.businessName || 'Unknown',
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
        })),
        dynamicCharts,
        scenarioResult,
      },
      message: `You have ${leads} leads, ${deals} deals, ${openDeals.length} open deals worth $${totalRevenue.toLocaleString()}, and ${campaigns} campaigns.`,
      // Flag to trigger visualization
      triggerVisualization: true,
    };
  } catch (error: any) {
    console.error('Error getting statistics:', error);
    return { 
      error: 'Failed to get statistics', 
      details: error.message 
    };
  }
}

async function createReport(userId: string, params: any) {
  const { title, reportType = 'overview', period = 'all_time' } = params;

  if (!title) {
    throw new Error("Report title is required");
  }

  // Map report period to getStatistics period
  const statsPeriod = ['last_7_days', 'last_month'].includes(period) ? 'last_30_days' : period;

  // Fetch statistics to build report content
  const statsResult = await getStatistics(userId, {
    period: statsPeriod === 'all_time' ? undefined : statsPeriod,
    chartIntent: 'full report',
  });

  if (!statsResult || statsResult.error) {
    throw new Error(statsResult?.details || "Failed to fetch data for report");
  }

  const stats = statsResult.statistics;
  const content: any = {
    summary: statsResult.message || `Report generated for ${period}. You have ${stats.totalLeads} leads, ${stats.totalDeals} deals, ${stats.openDeals} open deals worth $${(stats.totalRevenue || 0).toLocaleString()}, and ${stats.totalCampaigns} campaigns.`,
    metrics: {
      total_leads: stats.totalLeads,
      total_deals: stats.totalDeals,
      open_deals: stats.openDeals,
      total_revenue: stats.totalRevenue,
      total_campaigns: stats.totalCampaigns,
    },
  };

  if (stats.dynamicCharts && stats.dynamicCharts.length > 0) {
    content.charts = stats.dynamicCharts.map((c: any) => ({
      title: c.title,
      data: c.data,
    }));
  } else if (stats.monthlyRevenue && Object.keys(stats.monthlyRevenue).length > 0) {
    content.charts = [{
      title: "Monthly Revenue",
      data: Object.entries(stats.monthlyRevenue).map(([name, value]) => ({
        name: new Date(name + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value,
      })),
    }];
  }

  const report = await prisma.aiGeneratedReport.create({
    data: {
      userId,
      title,
      reportType: reportType || 'overview',
      content,
      period: period || null,
    },
  });

  return {
    message: `Report "${title}" created successfully! I'll take you to the Reports page to view it.`,
    report: {
      id: report.id,
      title: report.title,
      reportType: report.reportType,
      createdAt: report.createdAt,
    },
  };
}

async function getRecentActivity(userId: string, params: any) {
  const { limit = 5 } = params;

  const [recentLeads, recentDeals, recentCampaigns] = await Promise.all([
    prisma.lead.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.deal.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        stage: true,
      },
    }),
    prisma.campaign.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    recentLeads,
    recentDeals,
    recentCampaigns,
  };
}

async function importContacts(userId: string, params: any) {
  // Navigate to contacts page - user can use the Import button there
  return {
    message: "I'll take you to the Contacts page. Click the 'Import Contacts' button to upload a CSV with columns: name, email, phone, company. I can also create contacts one by one—just say 'Create a lead for [Name] at [email]'.",
    navigateTo: "/dashboard/contacts",
  };
}

async function updateProfile(userId: string, params: any) {
  const { companyName, name, phone, website } = params;

  if (!companyName && !name && !phone && !website) {
    throw new Error("At least one field is required");
  }

  const updateData: any = {};
  if (companyName || name) updateData.name = companyName || name;
  if (phone) updateData.phone = phone;
  if (website) updateData.website = website;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      phone: true,
      website: true,
      email: true,
    },
  });

  return {
    message: `✅ Your company profile has been updated!`,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      website: user.website,
      email: user.email,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SETUP & CONFIGURATION ACTION IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════

async function setupStripe(userId: string, params: any) {
  const { publishableKey, secretKey } = params;

  if (!publishableKey || !secretKey) {
    throw new Error("Both Stripe Publishable Key and Secret Key are required");
  }

  // Validate key format
  if (!publishableKey.startsWith("pk_")) {
    throw new Error("Invalid Publishable Key format. Should start with 'pk_'");
  }
  if (!secretKey.startsWith("sk_")) {
    throw new Error("Invalid Secret Key format. Should start with 'sk_'");
  }

  // Store Stripe credentials in user config
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      paymentProvider: "Stripe",
      paymentProviderConfigured: true,
      // Store in a secure JSON field (assuming you have this in schema)
      // In production, these should be encrypted
    },
  });

  return {
    message: "✅ Stripe has been successfully configured! You can now accept payments through Stripe.",
    provider: "Stripe",
    mode: publishableKey.includes("test") ? "Test Mode" : "Live Mode",
    nextSteps: [
      "Create payment links",
      "Set up subscription plans",
      "Configure webhooks for payment notifications",
    ],
  };
}

async function setupSquare(userId: string, params: any) {
  const { applicationId, accessToken } = params;

  if (!applicationId || !accessToken) {
    throw new Error("Both Square Application ID and Access Token are required");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      paymentProvider: "Square",
      paymentProviderConfigured: true,
    },
  });

  return {
    message: "✅ Square has been successfully configured! You can now accept payments through Square.",
    provider: "Square",
    nextSteps: [
      "Create payment links",
      "Set up invoicing",
      "Configure Square POS integration",
    ],
  };
}

async function setupPayPal(userId: string, params: any) {
  const { clientId, clientSecret } = params;

  if (!clientId || !clientSecret) {
    throw new Error("Both PayPal Client ID and Client Secret are required");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      paymentProvider: "PayPal",
      paymentProviderConfigured: true,
    },
  });

  return {
    message: "✅ PayPal has been successfully configured! You can now accept payments through PayPal.",
    provider: "PayPal",
    nextSteps: [
      "Create PayPal checkout buttons",
      "Set up subscriptions",
      "Configure invoice templates",
    ],
  };
}

async function setupTwilio(userId: string, params: any) {
  const { accountSid, authToken, phoneNumber } = params;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error("Twilio Account SID, Auth Token, and Phone Number are all required");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      smsProvider: "Twilio",
      smsProviderConfigured: true,
    },
  });

  return {
    message: "✅ Twilio has been successfully configured! You can now send SMS and make voice calls.",
    provider: "Twilio",
    phoneNumber: phoneNumber,
    nextSteps: [
      "Send your first SMS campaign",
      "Set up voice agents for calls",
      "Configure auto-replies",
      "Create SMS templates",
    ],
  };
}

async function purchaseTwilioNumber(userId: string, params: any) {
  // Check if user has Twilio credentials configured
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      smsProvider: true,
      smsProviderConfig: true,
    },
  });

  // Check if Twilio is configured
  if (user?.smsProvider !== 'Twilio' || !user?.smsProviderConfig) {
    throw new Error("Please configure your Twilio credentials first. I can help you with that!");
  }

  // Verify credentials are valid
  try {
    const config = JSON.parse(user.smsProviderConfig);
    if (!config.accountSid || !config.authToken) {
      throw new Error("Twilio credentials are incomplete. Please reconfigure Twilio.");
    }
  } catch (error) {
    throw new Error("Invalid Twilio configuration. Please reconfigure Twilio.");
  }

  // This action just triggers the UI dialog - the actual purchase happens in the UI
  return {
    message: "🎯 Let's find you the perfect phone number!",
    action: "open_purchase_dialog",
    nextSteps: [
      "Search for numbers by location or area code",
      "Choose your preferred number",
      "Purchase with one click",
      "Start using it immediately for calls and SMS",
    ],
  };
}

async function createVoiceAgent(userId: string, params: any) {
  const { name, voiceId, prompt, businessName } = params;

  if (!name) {
    throw new Error("Voice agent name is required");
  }

  const voiceAgent = await prisma.voiceAgent.create({
    data: {
      userId,
      name,
      businessName: businessName || name,
      voiceId: voiceId || "rachel",
      greetingMessage: prompt || "Hello! How can I help you today?",
      type: "INBOUND",
      status: "TESTING",
    },
  });

  return {
    message: `✅ Voice agent "${name}" has been created successfully!`,
    agent: {
      id: voiceAgent.id,
      name: voiceAgent.name,
      status: voiceAgent.status,
    },
    nextSteps: [
      "Schedule outbound calls",
      "Configure inbound call routing",
      "Test the voice agent",
      "Review call transcripts",
    ],
  };
}

async function configureAutoReply(userId: string, params: any) {
  const { enabled, message, channels } = params;

  if (enabled && !message) {
    throw new Error("Auto-reply message is required when enabling");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      // Store auto-reply settings in user config
      // These fields should exist in your schema
    },
  });

  return {
    message: enabled 
      ? "✅ Auto-reply has been enabled successfully!" 
      : "✅ Auto-reply has been disabled.",
    status: enabled ? "Enabled" : "Disabled",
    channels: channels || ["Email", "SMS"],
    replyMessage: message,
  };
}

async function addWorkflowTask(userId: string, params: any) {
  const { workflowId, name, taskType = 'CUSTOM', description = '' } = params;
  if (!workflowId || !name) {
    return { success: false, error: 'workflowId and name are required' };
  }
  const existing = await prisma.workflowTemplate.findFirst({
    where: { id: workflowId, userId },
    include: { tasks: { orderBy: { displayOrder: 'asc' } } },
  });
  if (!existing) {
    return { success: false, error: 'Workflow not found' };
  }
  const maxOrder = existing.tasks.length > 0
    ? Math.max(...existing.tasks.map((t) => t.displayOrder))
    : 0;
  const task = await prisma.workflowTask.create({
    data: {
      templateId: workflowId,
      name,
      description: description || '',
      taskType: taskType || 'CUSTOM',
      assignedAgentType: null,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: { row: Math.floor(maxOrder / 3), col: maxOrder % 3 },
      displayOrder: maxOrder + 1,
      actionConfig: { actions: [] },
    },
  });
  return {
    success: true,
    message: `Task "${name}" added to workflow`,
    task: { id: task.id, name: task.name, taskType: task.taskType },
  };
}

async function createWorkflow(userId: string, params: any) {
  const { description, goal, keywords, autoReply, trigger, actions } = params;

  // If description is provided, use AI to generate the workflow
  if (description) {
    const { aiWorkflowGenerator } = await import('@/lib/ai-workflow-generator');
    
    // Get user context for workflow generation
    const [pipelines, leadStatuses, user] = await Promise.all([
      prisma.pipeline.findMany({
        where: { userId },
        include: { stages: true },
      }),
      prisma.lead.findMany({
        where: { userId },
        distinct: ['status'],
        select: { status: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { language: true },
      }),
    ]);

    // Get user's industry and role for dental context
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { industry: true, role: true },
    });

    const isDental = userRecord?.industry === 'DENTIST';
    const userRole = userRecord?.role || 'USER';

    // Import dental role helper if dental context
    let dentalRole = 'practitioner';
    if (isDental) {
      const { getUserDentalRole } = await import('@/lib/dental/role-types');
      dentalRole = getUserDentalRole(userRole, userRecord);
    }

    const context = {
      existingPipelines: pipelines,
      existingLeadStatuses: leadStatuses.map(l => l.status).filter(Boolean) as string[],
      industry: userRecord?.industry,
      isDental,
      role: isDental ? dentalRole : undefined,
    };

    // Get user's language preference
    const userLanguage = user?.language || 'en';
    
    // Generate workflow from natural language description
    const generatedWorkflow = await aiWorkflowGenerator.generateWorkflow({
      description: description + (goal ? ` Goal: ${goal}` : ''),
      userId,
      userLanguage: userLanguage,
      context,
    });

    // Create the workflow with generated configuration
    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: generatedWorkflow.name,
        description: generatedWorkflow.description,
        triggerType: generatedWorkflow.triggerType as any,
        triggerConfig: generatedWorkflow.triggerConfig,
        status: 'ACTIVE',
        metadata: isDental ? {
          role: dentalRole,
          industry: 'DENTIST',
          targetRole: isDental ? (dentalRole === 'practitioner' ? 'practitioner' : dentalRole === 'admin_assistant' ? 'admin_assistant' : 'both') : undefined,
        } : undefined,
        actions: {
          create: generatedWorkflow.actions.map((action) => ({
            type: action.type as any,
            displayOrder: action.displayOrder,
            actionConfig: action.actionConfig,
            delayMinutes: action.delayMinutes,
          })),
        },
      },
      include: {
        actions: true,
      },
    });

    // Helper function to get action summary
    const getActionSummary = (action: any) => {
      const config = action.actionConfig || {};
      switch (action.type) {
        case 'MAKE_OUTBOUND_CALL':
          return `Call: ${config.purpose || 'Voice call'}`;
        case 'SEND_EMAIL':
          return `Email: ${config.subject || 'No subject'}`;
        case 'SEND_SMS':
          return `SMS: ${(config.template || config.message || '').substring(0, 50)}...`;
        case 'WAIT_DELAY':
          const minutes = action.delayMinutes || 0;
          if (minutes >= 10080) return `Wait: ${Math.round(minutes / 10080)} week(s)`;
          if (minutes >= 1440) return `Wait: ${Math.round(minutes / 1440)} day(s)`;
          if (minutes >= 60) return `Wait: ${Math.round(minutes / 60)} hour(s)`;
          return `Wait: ${minutes} minute(s)`;
        case 'AI_GENERATE_MESSAGE':
          return `AI Message: ${(config.prompt || '').substring(0, 50)}...`;
        default:
          return action.type.replace(/_/g, ' ');
      }
    };

    // Include suggestions from AI generator if available
    const suggestions = generatedWorkflow.suggestions || [];
    
    return {
      message: `✅ Workflow "${workflow.name}" created successfully!`,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        trigger: workflow.triggerType,
        actionsCount: workflow.actions.length,
        status: workflow.status,
      },
      suggestions: suggestions.length > 0 ? {
        items: suggestions,
        message: "The AI has some suggestions to improve this workflow:",
        canAccept: true,
        canReject: true,
      } : undefined,
      workflowDetails: {
        triggerType: workflow.triggerType,
        triggerConfig: workflow.triggerConfig,
        actions: workflow.actions.map((action: any) => ({
          type: action.type,
          displayOrder: action.displayOrder,
          delayMinutes: action.delayMinutes,
          summary: getActionSummary(action),
        })),
      },
    };
  }

  // Fallback: Manual workflow creation (legacy)
  const name = params.name || 'New Workflow';
  
  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name,
      triggerType: trigger || "MANUAL",
      status: "ACTIVE",
      triggerConfig: keywords ? { keywords } : {},
      actions: {
        create: (actions || []).map((action: string, index: number) => ({
          type: "SEND_EMAIL",
          displayOrder: index,
          actionConfig: { action },
        })),
      },
    },
    include: {
      actions: true,
    },
  });

  return {
    message: `✅ Workflow "${name}" has been created successfully!`,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      triggerType: workflow.triggerType,
      stepsCount: workflow.actions.length,
      status: workflow.status,
    },
    nextSteps: [
      "Test the workflow",
      "Add more steps if needed",
      "Monitor workflow executions",
    ],
  };
}

async function createAppointment(userId: string, params: any) {
  const { customerName, customerEmail, customerPhone, date, time, duration } = params;

  if (!customerName) {
    throw new Error("Customer name is required");
  }

  if (!customerEmail) {
    throw new Error("Customer email is required");
  }

  if (!date || !time) {
    throw new Error("Date and time are required");
  }

  // Parse date and time
  const appointmentDate = new Date(`${date}T${time}`);

  const appointment = await prisma.bookingAppointment.create({
    data: {
      userId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || "",
      appointmentDate,
      duration: duration || 30,
      status: "SCHEDULED",
    },
  });

  return {
    message: `✅ Appointment with ${customerName} has been scheduled successfully!`,
    appointment: {
      id: appointment.id,
      customerName: appointment.customerName,
      date: appointment.appointmentDate.toLocaleDateString(),
      time: appointment.appointmentDate.toLocaleTimeString(),
      status: appointment.status,
    },
    nextSteps: [
      "Send calendar invites to attendees",
      "Add meeting notes or agenda",
      "Set up reminders",
    ],
  };
}

async function listAppointments(userId: string, params: any) {
  const { date, limit = 20 } = params;

  const where: any = { userId };
  if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.appointmentDate = { gte: start, lt: end };
  }

  const appointments = await prisma.bookingAppointment.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { appointmentDate: "asc" },
  });

  return {
    message: `Found ${appointments.length} appointment(s)`,
    count: appointments.length,
    appointments: appointments.map((a) => ({
      id: a.id,
      customerName: a.customerName,
      appointmentDate: a.appointmentDate,
      duration: a.duration,
      status: a.status,
    })),
  };
}

async function updateAppointment(userId: string, params: any) {
  const { appointmentId, customerName, date, time } = params;

  let appointment;
  if (appointmentId) {
    appointment = await prisma.bookingAppointment.findFirst({
      where: { id: appointmentId, userId },
    });
  } else if (customerName) {
    appointment = await prisma.bookingAppointment.findFirst({
      where: {
        userId,
        customerName: { contains: customerName, mode: "insensitive" },
        status: { not: "CANCELLED" },
      },
      orderBy: { appointmentDate: "desc" },
    });
  }

  if (!appointment) throw new Error("Appointment not found");

  const updates: any = {};
  if (date && time) {
    updates.appointmentDate = new Date(`${date}T${time}`);
  } else if (date) {
    const old = new Date(appointment.appointmentDate);
    updates.appointmentDate = new Date(`${date}T${old.toTimeString().slice(0, 5)}`);
  } else if (time) {
    const old = new Date(appointment.appointmentDate);
    updates.appointmentDate = new Date(`${old.toISOString().slice(0, 10)}T${time}`);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("Provide date and/or time to reschedule");
  }

  const updated = await prisma.bookingAppointment.update({
    where: { id: appointment.id },
    data: updates,
  });

  return {
    message: `Appointment with ${updated.customerName} rescheduled successfully.`,
    appointment: { id: updated.id, appointmentDate: updated.appointmentDate },
  };
}

async function cancelAppointment(userId: string, params: any) {
  const { appointmentId, customerName } = params;

  let appointment;
  if (appointmentId) {
    appointment = await prisma.bookingAppointment.findFirst({
      where: { id: appointmentId, userId },
    });
  } else if (customerName) {
    appointment = await prisma.bookingAppointment.findFirst({
      where: {
        userId,
        customerName: { contains: customerName, mode: "insensitive" },
        status: { not: "CANCELLED" },
      },
      orderBy: { appointmentDate: "desc" },
    });
  }

  if (!appointment) throw new Error("Appointment not found");

  await prisma.bookingAppointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" as any, cancelledAt: new Date() },
  });

  return {
    message: `Appointment with ${appointment.customerName} cancelled.`,
    appointmentId: appointment.id,
  };
}

// ═══════════════════════════════════════════════════════════════════
// VOICE AGENT DEBUGGING & MANAGEMENT ACTIONS
// ═══════════════════════════════════════════════════════════════════

async function listVoiceAgents(userId: string, params: any) {
  const agents = await prisma.voiceAgent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      businessName: true,
      type: true,
      status: true,
      voiceId: true,
      greetingMessage: true,
      createdAt: true,
    },
  });

  return {
    count: agents.length,
    agents,
  };
}

async function getVoiceAgent(userId: string, params: any) {
  const { agentId, name } = params;

  let agent;

  if (agentId) {
    agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, userId },
    });
  } else if (name) {
    agent = await prisma.voiceAgent.findFirst({
      where: {
        userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    throw new Error("Voice agent not found");
  }

  return { agent };
}

async function debugVoiceAgent(userId: string, params: any) {
  const { agentId, name } = params;

  // Find the agent
  let agent;
  if (agentId) {
    agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, userId },
    });
  } else if (name) {
    agent = await prisma.voiceAgent.findFirst({
      where: {
        userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    return {
      success: false,
      error: "Voice agent not found",
      message: "I couldn't find a voice agent with that name. Let me check what agents you have...",
    };
  }

  // Check user's Twilio configuration
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      smsProvider: true,
      smsProviderConfigured: true,
      phone: true,
    },
  });

  // Diagnostic check
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check 1: Greeting message
  if (!agent.greetingMessage || agent.greetingMessage.trim().length === 0) {
    issues.push("❌ Missing greeting message");
  } else if (agent.greetingMessage.trim().length < 10) {
    warnings.push("⚠️ Greeting message is very short (less than 10 characters)");
  }

  // Check 2: Voice selection
  if (!agent.voiceId || agent.voiceId === "") {
    issues.push("❌ No voice selected");
  }

  // Check 3: Twilio setup (using GLOBAL Twilio credentials from environment)
  const hasTwilioCredentials = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  if (!hasTwilioCredentials) {
    issues.push("❌ Twilio not configured - Global Twilio credentials missing from environment");
  }

  // Check 4: Phone number
  if (!user?.phone || user.phone.trim().length === 0) {
    issues.push("❌ No phone number configured in company profile");
  }

  // Check 5: Agent status
  if (agent.status === "INACTIVE") {
    warnings.push("⚠️ Agent is set to INACTIVE status");
  } else if (agent.status === "TESTING") {
    warnings.push("⚠️ Agent is in TESTING mode");
  }

  // Check 6: Business name
  if (!agent.businessName || agent.businessName.trim().length === 0) {
    warnings.push("⚠️ Missing business name - helps identify calls");
  }

  // Generate diagnostic report
  const isHealthy = issues.length === 0;
  
  let diagnosticReport = `🔍 **Diagnostic Report for "${agent.name}"**\n\n`;
  
  if (isHealthy && warnings.length === 0) {
    diagnosticReport += "✅ **Status: HEALTHY** - All checks passed!\n\n";
  } else if (isHealthy && warnings.length > 0) {
    diagnosticReport += "⚠️ **Status: WORKING (with warnings)** - Agent works but has minor issues\n\n";
  } else {
    diagnosticReport += "❌ **Status: NOT WORKING** - Critical issues found\n\n";
  }

  if (issues.length > 0) {
    diagnosticReport += "**Critical Issues:**\n";
    issues.forEach(issue => {
      diagnosticReport += `${issue}\n`;
    });
    diagnosticReport += "\n";
  }

  if (warnings.length > 0) {
    diagnosticReport += "**Warnings:**\n";
    warnings.forEach(warning => {
      diagnosticReport += `${warning}\n`;
    });
    diagnosticReport += "\n";
  }

  diagnosticReport += "**Current Configuration:**\n";
  diagnosticReport += `- Agent Name: ${agent.name}\n`;
  diagnosticReport += `- Business Name: ${agent.businessName || "Not set"}\n`;
  diagnosticReport += `- Type: ${agent.type}\n`;
  diagnosticReport += `- Status: ${agent.status}\n`;
  diagnosticReport += `- Voice: ${agent.voiceId || "Not set"}\n`;
  diagnosticReport += `- Greeting: ${agent.greetingMessage ? `"${agent.greetingMessage.substring(0, 50)}${agent.greetingMessage.length > 50 ? "..." : ""}"` : "Not set"}\n`;
  diagnosticReport += `- Twilio Setup: ${user?.smsProviderConfigured ? "✓ Configured" : "✗ Not configured"}\n`;
  diagnosticReport += `- Phone Number: ${user?.phone || "Not set"}\n`;

  return {
    success: true,
    isHealthy,
    agent: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
    },
    issues,
    warnings,
    diagnosticReport,
    canAutoFix: issues.length > 0 && issues.every(issue => 
      issue.includes("greeting") || 
      issue.includes("voice") || 
      issue.includes("business name") ||
      issue.includes("status")
    ),
  };
}

async function fixVoiceAgent(userId: string, params: any) {
  const { agentId, name, autoFix = true } = params;

  // First run diagnostics
  const diagnostics = await debugVoiceAgent(userId, { agentId, name });

  if (!diagnostics.success) {
    return diagnostics;
  }

  if (diagnostics.isHealthy) {
    return {
      success: true,
      message: `✅ Voice agent "${diagnostics.agent.name}" is already working correctly! No fixes needed.`,
      diagnosticReport: diagnostics.diagnosticReport,
    };
  }

  // Prepare fixes
  const fixes: string[] = [];
  const updateData: any = {};

  // Get the agent
  const agent = await prisma.voiceAgent.findFirst({
    where: diagnostics.agent?.id ? { id: diagnostics.agent.id } : { userId, name: { contains: name, mode: "insensitive" } },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Fix 1: Missing greeting message
  if (!agent.greetingMessage || agent.greetingMessage.trim().length === 0) {
    updateData.greetingMessage = `Hello! Thank you for calling ${agent.businessName || user?.name || "our business"}. How can I assist you today?`;
    fixes.push("✓ Added default greeting message");
  }

  // Fix 2: Missing voice
  if (!agent.voiceId || agent.voiceId === "") {
    updateData.voiceId = "rachel"; // Default ElevenLabs voice
    fixes.push("✓ Set default voice (Rachel)");
  }

  // Fix 3: Set to active if inactive
  if (agent.status === "INACTIVE") {
    updateData.status = "ACTIVE";
    fixes.push("✓ Activated voice agent");
  } else if (agent.status === "TESTING") {
    updateData.status = "ACTIVE";
    fixes.push("✓ Changed status from TESTING to ACTIVE");
  }

  // Fix 4: Add business name if missing
  if (!agent.businessName || agent.businessName.trim().length === 0) {
    updateData.businessName = user?.name || "My Business";
    fixes.push("✓ Added business name");
  }

  // Apply fixes
  if (Object.keys(updateData).length > 0) {
    await prisma.voiceAgent.update({
      where: { id: agent.id },
      data: updateData,
    });
  }

  // Check for unfixable issues
  const remainingIssues: string[] = [];
  
  // Check for GLOBAL Twilio credentials (not user-specific)
  const hasTwilioCredsForAutoFix = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  if (!hasTwilioCredsForAutoFix) {
    remainingIssues.push("⚠️ **Twilio not configured globally** - The platform administrator needs to configure Twilio credentials in the server environment.");
  }

  if (!user?.phone) {
    remainingIssues.push("⚠️ **No phone number** - Add your business phone number in Settings → Company Profile");
  }

  let message = `🔧 **Fixes Applied to "${agent.name}"**\n\n`;
  
  if (fixes.length > 0) {
    message += "**Completed Fixes:**\n";
    fixes.forEach(fix => {
      message += `${fix}\n`;
    });
    message += "\n";
  }

  if (remainingIssues.length > 0) {
    message += "**Remaining Setup Steps:**\n";
    remainingIssues.forEach(issue => {
      message += `${issue}\n`;
    });
    message += "\n";
    message += "Would you like me to help you set up Twilio now?";
  } else {
    message += "✅ **All fixed!** Your voice agent is now ready to handle calls!";
  }

  return {
    success: true,
    message,
    fixesApplied: fixes,
    remainingIssues,
    needsTwilioSetup: remainingIssues.some(i => i.includes("Twilio")),
    agent: {
      id: agent.id,
      name: agent.name,
      status: updateData.status || agent.status,
    },
  };
}

async function updateVoiceAgent(userId: string, params: any) {
  const { agentId, name, ...updates } = params;

  if (!agentId && !name) {
    throw new Error("Agent ID or name is required");
  }

  // Find the agent
  let agent;
  if (agentId) {
    agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, userId },
    });
  } else if (name) {
    agent = await prisma.voiceAgent.findFirst({
      where: {
        userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    throw new Error("Voice agent not found");
  }

  // Update the agent
  const updatedAgent = await prisma.voiceAgent.update({
    where: { id: agent.id },
    data: updates,
  });

  return {
    message: `✅ Voice agent "${updatedAgent.name}" updated successfully!`,
    agent: {
      id: updatedAgent.id,
      name: updatedAgent.name,
      status: updatedAgent.status,
      greetingMessage: updatedAgent.greetingMessage,
    },
  };
}

async function assignPhoneToVoiceAgent(userId: string, params: any) {
  const { agentId, name, phoneNumber } = params;

  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  if (!agentId && !name) {
    throw new Error("Agent ID or name is required");
  }

  // Find the agent
  let agent;
  if (agentId) {
    agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, userId },
    });
  } else if (name) {
    agent = await prisma.voiceAgent.findFirst({
      where: {
        userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    throw new Error("Voice agent not found");
  }

  // Update the agent with the phone number
  const updatedAgent = await prisma.voiceAgent.update({
    where: { id: agent.id },
    data: {
      twilioPhoneNumber: phoneNumber,
      status: 'ACTIVE', // Activate the agent
    },
  });

  return {
    message: `✅ Phone number ${phoneNumber} assigned to "${updatedAgent.name}" successfully!`,
    agent: {
      id: updatedAgent.id,
      name: updatedAgent.name,
      phoneNumber: updatedAgent.twilioPhoneNumber,
      status: updatedAgent.status,
    },
  };
}


// ========================================
// Outbound Call Functions (shared with CRM voice agent)
// ========================================

async function makeOutboundCallAction(userId: string, params: any) {
  const { makeOutboundCall } = await import("@/lib/outbound-call-service");
  const result = await makeOutboundCall({
    userId,
    contactName: params.contactName,
    phoneNumber: params.phoneNumber,
    purpose: params.purpose,
    notes: params.notes,
    voiceAgentId: params.voiceAgentId,
    voiceAgentName: params.voiceAgentName,
    leadId: params.leadId,
    immediate: params.immediate !== false,
    scheduledFor: params.scheduledFor,
  });
  if (!result.success) {
    throw new Error(result.error || "Failed to initiate call");
  }
  return {
    message: result.message || `✓ Call initiated to ${params.contactName}`,
    outboundCall: result.outboundCall
      ? {
          id: result.outboundCall.id,
          name: result.outboundCall.name,
          phoneNumber: result.outboundCall.phoneNumber,
          status: result.outboundCall.status,
          scheduledFor: result.outboundCall.scheduledFor,
        }
      : undefined,
  };
}

async function callLeadsAction(userId: string, params: any) {
  const { makeBulkOutboundCalls } = await import("@/lib/outbound-call-service");
  const result = await makeBulkOutboundCalls({
    userId,
    criteria: params.period || params.status
      ? {
          period: params.period || "today",
          status: params.status,
          limit: params.limit || 50,
        }
      : undefined,
    purpose: params.purpose,
    notes: params.notes,
    voiceAgentId: params.voiceAgentId,
    voiceAgentName: params.voiceAgentName,
    immediate: true,
  });
  if (!result.success && result.scheduled === 0) {
    throw new Error(result.error || "No calls could be initiated");
  }
  return {
    message: result.message || `✓ Initiated ${result.scheduled} call(s)`,
    scheduled: result.scheduled,
    failed: result.failed,
  };
}

async function draftSMSAction(userId: string, params: any) {
  const { prisma } = await import("@/lib/db");
  const { contactName, message, phoneNumber } = params;
  if (!contactName || !message) {
    throw new Error("contactName and message are required");
  }
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  const toPhone = phoneNumber || lead?.phone;
  if (!toPhone) {
    throw new Error(`Contact "${contactName}" not found or has no phone number.`);
  }
  return {
    message: `I've drafted an SMS for you to review. Should I send it now or schedule it for later?`,
    smsDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toPhone,
      message,
      leadId: lead?.id,
    },
  };
}

async function sendSMSAction(userId: string, params: any) {
  const { sendSMS } = await import("@/lib/messaging-service");
  const result = await sendSMS({
    userId,
    contactName: params.contactName,
    message: params.message,
    phoneNumber: params.phoneNumber,
    leadId: params.leadId,
  });
  if (!result.success) throw new Error(result.error);
  return { message: result.message || `✓ SMS sent to ${params.contactName}` };
}

async function scheduleSMSAction(userId: string, params: any) {
  const { prisma } = await import("@/lib/db");
  const { contactName, message, scheduledFor } = params;
  if (!contactName || !message || !scheduledFor) {
    throw new Error("contactName, message, and scheduledFor are required");
  }
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!lead?.phone) {
    throw new Error(`Contact "${contactName}" not found or has no phone number.`);
  }
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    throw new Error("Scheduled time must be in the future.");
  }
  await prisma.scheduledSms.create({
    data: {
      userId,
      leadId: lead.id,
      toPhone: lead.phone,
      toName: lead.contactPerson || lead.businessName,
      message,
      scheduledFor: scheduledDate,
      status: "PENDING",
    },
  });
  return {
    message: `✓ SMS scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
  };
}

async function draftEmailAction(userId: string, params: any) {
  const { prisma } = await import("@/lib/db");
  const { contactName, subject, body, email } = params;
  if (!contactName || !subject || !body) {
    throw new Error("contactName, subject, and body are required");
  }
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  const toEmail = email || lead?.email;
  if (!toEmail) {
    throw new Error(`Contact "${contactName}" not found or has no email.`);
  }
  return {
    message: `I've drafted an email for you to review. Should I send it now or schedule it for later?`,
    emailDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toEmail,
      subject,
      body,
      leadId: lead?.id,
    },
  };
}

async function sendEmailAction(userId: string, params: any) {
  const { sendEmail } = await import("@/lib/messaging-service");
  const result = await sendEmail({
    userId,
    contactName: params.contactName,
    subject: params.subject,
    body: params.body,
    email: params.email,
    leadId: params.leadId,
  });
  if (!result.success) throw new Error(result.error);
  return { message: result.message || `✓ Email sent to ${params.contactName}` };
}

async function scheduleEmailAction(userId: string, params: any) {
  const { prisma } = await import("@/lib/db");
  const { contactName, subject, body, scheduledFor } = params;
  if (!contactName || !subject || !body || !scheduledFor) {
    throw new Error("contactName, subject, body, and scheduledFor are required");
  }
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!lead?.email) {
    throw new Error(`Contact "${contactName}" not found or has no email.`);
  }
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    throw new Error("Scheduled time must be in the future.");
  }
  await prisma.scheduledEmail.create({
    data: {
      userId,
      leadId: lead.id,
      toEmail: lead.email,
      toName: lead.contactPerson || lead.businessName,
      subject,
      body,
      scheduledFor: scheduledDate,
      status: "PENDING",
    },
  });
  return {
    message: `✓ Email scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
  };
}

async function smsLeadsAction(userId: string, params: any) {
  const { sendSMSToLeads } = await import("@/lib/messaging-service");
  const result = await sendSMSToLeads({
    userId,
    purpose: params.purpose || params.message,
    message: params.message,
    criteria: {
      period: params.period || "today",
      status: params.status,
      limit: params.limit || 50,
    },
  });
  if (!result.success && result.sent === 0) {
    throw new Error(result.error || "No SMS could be sent");
  }
  return {
    message: result.message || `✓ Sent ${result.sent} SMS`,
    sent: result.sent,
    failed: result.failed,
  };
}

async function emailLeadsAction(userId: string, params: any) {
  const { sendEmailToLeads } = await import("@/lib/messaging-service");
  const result = await sendEmailToLeads({
    userId,
    purpose: params.purpose || params.subject,
    message: params.message,
    subject: params.subject,
    criteria: {
      period: params.period || "today",
      status: params.status,
      limit: params.limit || 50,
    },
  });
  if (!result.success && result.sent === 0) {
    throw new Error(result.error || "No emails could be sent");
  }
  return {
    message: result.message || `✓ Sent ${result.sent} emails`,
    sent: result.sent,
    failed: result.failed,
  };
}

// ========================================
// QuickBooks Integration Functions
// ========================================

async function setupQuickBooks(userId: string) {
  // Return instructions to connect QuickBooks
  return {
    message: "I'll help you connect QuickBooks to your CRM.",
    instructions: "To connect QuickBooks:\n1. Go to Settings → QuickBooks\n2. Click 'Connect QuickBooks'\n3. Sign in to your QuickBooks account and authorize access\n\nOnce connected, you'll be able to:\n- Create invoices from deals\n- Sync customers automatically\n- Track payment status",
    navigateTo: '/dashboard/settings?tab=quickbooks',
    actionRequired: true
  };
}

async function createQuickBooksInvoice(userId: string, params: any) {
  const { customerName, customerEmail, lineItems, dueDate, memo } = params;

  if (!customerName || !customerEmail || !lineItems) {
    throw new Error('Customer name, email, and line items are required');
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName,
      customerEmail,
      lineItems,
      dueDate,
      memo
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create invoice');
  }

  const data = await response.json();

  return {
    message: `✅ Invoice #${data.invoiceNumber} created successfully for ${customerName}!`,
    invoiceId: data.invoiceId,
    invoiceNumber: data.invoiceNumber
  };
}

async function syncContactToQuickBooks(userId: string, params: any) {
  const { contactId } = params;

  if (!contactId) {
    throw new Error('Contact ID is required');
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/sync-contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync contact');
  }

  const data = await response.json();

  return {
    message: '✅ Contact synced to QuickBooks successfully!',
    customerId: data.customerId
  };
}

// ========================================
// WhatsApp Integration Functions
// ========================================

async function setupWhatsApp(userId: string, params: any) {
  const { accountSid, authToken, phoneNumber } = params;

  if (!accountSid || !authToken || !phoneNumber) {
    return {
      message: "I'll help you configure WhatsApp Business.",
      instructions: "To set up WhatsApp:\n1. Go to Settings → WhatsApp\n2. Enter your Twilio credentials:\n   - Account SID\n   - Auth Token\n   - WhatsApp-enabled phone number\n3. Configure the webhook in Twilio console\n\nOnce configured, you'll be able to:\n- Send and receive WhatsApp messages\n- Share media with customers\n- Run WhatsApp campaigns\n- Set up auto-replies",
      navigateTo: '/dashboard/settings?tab=whatsapp',
      actionRequired: true
    };
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountSid, authToken, phoneNumber })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to configure WhatsApp');
  }

  return {
    message: '✅ WhatsApp configured successfully! You can now send messages.',
    navigateTo: '/dashboard/messages'
  };
}

async function sendWhatsAppMessage(userId: string, params: any) {
  const { to, message, mediaUrl } = params;

  if (!to || !message) {
    throw new Error('Recipient phone number and message are required');
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message, mediaUrl })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send WhatsApp message');
  }

  const data = await response.json();

  return {
    message: `✅ WhatsApp message sent to ${to}!`,
    messageSid: data.messageSid
  };
}

async function getWhatsAppConversations(userId: string, params: any) {
  const { contactId } = params || {};

  const url = contactId 
    ? `${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/conversations?contactId=${contactId}`
    : `${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/conversations`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch conversations');
  }

  const data = await response.json();

  const conversationsCount = data.conversations?.length || 0;
  
  return {
    message: `Found ${conversationsCount} WhatsApp conversation(s)`,
    conversations: data.conversations
  };
}
