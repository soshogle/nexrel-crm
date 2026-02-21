/**
 * API Route: Handle CRM Voice Agent Function Calls
 * 
 * POST - Process custom function calls from ElevenLabs CRM voice agent
 * These are called via webhook when the agent uses custom functions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseChartIntent, getDynamicChartData } from '@/lib/crm-chart-intent';
import { parseScenarioIntent, calculateScenario } from '@/lib/crm-scenario-predictor';
import { makeOutboundCall, makeBulkOutboundCalls } from '@/lib/outbound-call-service';
import { sendSMS, sendEmail, sendSMSToLeads, sendEmailToLeads } from '@/lib/messaging-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function proxyToActionsAPI(
  action: string,
  parameters: any,
  userId: string,
  req: NextRequest
): Promise<any> {
  const baseUrl = process.env.NEXTAUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000';
  const url = `${baseUrl}/api/ai-assistant/actions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, parameters, userId }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Action failed' };
  }
  return data.result || data;
}

/**
 * Handle function calls from ElevenLabs CRM voice agent
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { function_name, parameters, user_id } = body;

    console.log(`🧰 [CRM Voice Functions] Received call: ${function_name}`, parameters);

    // Get user from session or user_id
    let userId = user_id;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized - user_id required or valid session' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    let result: any;

    switch (function_name) {
      case 'get_statistics':
        result = await getStatistics(userId, parameters || {});
        break;

      case 'create_lead':
        result = await createLead(userId, parameters);
        break;

      case 'create_deal':
        result = await createDeal(userId, parameters);
        break;

      case 'list_leads':
        result = await listLeads(userId, parameters);
        break;

      case 'list_deals':
        result = await listDeals(userId, parameters);
        break;

      case 'search_contacts':
        result = await searchContacts(userId, parameters);
        break;

      case 'get_recent_activity':
        result = await getRecentActivity(userId, parameters);
        break;

      case 'predict_scenario':
        result = await predictScenario(userId, parameters || {});
        break;

      case 'make_outbound_call':
        result = await handleMakeOutboundCall(userId, parameters || {});
        break;

      case 'call_leads':
        result = await handleCallLeads(userId, parameters || {});
        break;

      case 'list_voice_agents':
        result = await handleListVoiceAgents(userId);
        break;

      case 'draft_sms':
        result = await handleDraftSMS(userId, parameters || {});
        break;

      case 'send_sms':
        result = await handleSendSMS(userId, parameters || {});
        break;

      case 'schedule_sms':
        result = await handleScheduleSMS(userId, parameters || {});
        break;

      case 'draft_email':
        result = await handleDraftEmail(userId, parameters || {});
        break;

      case 'send_email':
        result = await handleSendEmail(userId, parameters || {});
        break;

      case 'schedule_email':
        result = await handleScheduleEmail(userId, parameters || {});
        break;

      case 'sms_leads':
        result = await handleSMSLeads(userId, parameters || {});
        break;

      case 'email_leads':
        result = await handleEmailLeads(userId, parameters || {});
        break;

      case 'add_workflow_task':
        result = await handleAddWorkflowTask(userId, parameters || {});
        break;

      case 'create_task':
      case 'list_tasks':
      case 'complete_task':
      case 'create_ai_employee':
      case 'list_ai_employees':
      case 'add_note':
      case 'update_deal_stage':
      case 'create_invoice':
      case 'list_overdue_invoices':
        result = await proxyToActionsAPI(function_name, parameters || {}, userId, req);
        break;

      case 'get_daily_briefing':
      case 'update_deal':
      case 'get_follow_up_suggestions':
        result = await proxyToActionsAPI(function_name, parameters || {}, userId, req);
        break;

      case 'get_meeting_prep':
      case 'create_bulk_tasks':
        result = await proxyToActionsAPI(function_name, parameters || {}, userId, req);
        break;

      case 'create_report':
      case 'navigate_to':
        result = await proxyToActionsAPI(function_name, parameters || {}, userId, req);
        break;

      case 'create_appointment':
      case 'list_appointments':
      case 'update_appointment':
      case 'cancel_appointment':
        result = await proxyToActionsAPI(function_name, parameters || {}, userId, req);
        break;

      case 'clone_website':
      case 'create_website':
      case 'list_websites':
      case 'modify_website':
      case 'get_website_structure':
      case 'update_hero':
      case 'add_section':
      case 'update_section_content':
      case 'add_cta':
        result = await proxyToActionsAPI(function_name, parameters || {}, userId, req);
        break;

      case 'add_lead_tag':
      case 'update_lead_status':
      case 'list_notes':
      case 'get_pipeline_stages':
      case 'assign_deal_to_lead':
      case 'reschedule_task':
      case 'reorder_section':
      case 'delete_section':
      case 'list_website_media':
      case 'add_website_image':
      case 'get_follow_up_priority':
      case 'get_deal_risk_alerts':
      case 'bulk_update_lead_status':
      case 'bulk_add_tag':
      case 'export_pipeline_csv':
        result = await proxyToActionsAPI(function_name, parameters || {}, userId, req);
        break;

      default:
        result = { error: `Unknown function: ${function_name}` };
    }

    console.log(`✅ [CRM Voice Functions] ${function_name} result:`, result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[CRM Voice Functions] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Function execution failed' },
      { status: 500 }
    );
  }
}

/**
 * Get CRM statistics with time-based queries and comparison support
 */
async function getStatistics(userId: string, params: any = {}) {
  try {
    const { period = 'all_time', compareWith, chartIntent } = params;
    
    // Calculate date ranges based on period
    const now = new Date();
    let startDate: Date | null = null;
    let compareStartDate: Date | null = null;
    let compareEndDate: Date | null = null;
    
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'last_7_months') {
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

    // Prepare chart-ready data formats
    const chartData = {
      // Line/Bar chart data for monthly revenue
      monthlyRevenueChart: {
        labels: Object.keys(monthlyRevenue).map(month => 
          new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })
        ),
        datasets: [{
          label: 'Revenue',
          data: Object.values(monthlyRevenue),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
        }],
      },
      // Pie chart data for CRM metrics distribution
      metricsPieChart: {
        labels: ['Leads', 'Deals', 'Open Deals', 'Campaigns'],
        datasets: [{
          label: 'CRM Metrics',
          data: [leads, deals, openDeals.length, campaigns],
          backgroundColor: [
            'rgba(139, 92, 246, 0.8)',  // Purple for Leads
            'rgba(59, 130, 246, 0.8)',  // Blue for Deals
            'rgba(16, 185, 129, 0.8)',  // Green for Open Deals
            'rgba(245, 158, 11, 0.8)',  // Amber for Campaigns
          ],
        }],
      },
      // Bar chart data for metrics comparison
      metricsBarChart: {
        labels: ['Leads', 'Deals', 'Open Deals', 'Campaigns'],
        datasets: [{
          label: 'Count',
          data: [leads, deals, openDeals.length, campaigns],
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
        }],
      },
    };

    // Parse chart intent and fetch dynamic chart data if user requested a specific chart
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

    // "What if" scenario prediction when user asks for projections
    let scenarioResult: any = null;
    if (chartIntent) {
      const scenarioIntent = parseScenarioIntent(chartIntent);
      if (scenarioIntent) {
        scenarioResult = await calculateScenario(userId, scenarioIntent.type, scenarioIntent.params);
      }
    }

    return {
      success: true,
      navigateTo: '/dashboard/business-ai?mode=voice',
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
        // Chart-ready data formats
        charts: chartData,
        // Dynamic charts based on user request
        dynamicCharts,
        // "What if" scenario projection
        scenarioResult,
      },
      message: scenarioResult
        ? `Scenario: ${scenarioResult.scenario}. ${scenarioResult.assumption} → $${scenarioResult.impact.toLocaleString()} ${scenarioResult.unit === 'revenue' ? 'additional revenue' : 'potential'}.`
        : `You have ${leads} leads, ${deals} deals, ${openDeals.length} open deals worth $${totalRevenue.toLocaleString()}, and ${campaigns} campaigns.`,
    };
  } catch (error: any) {
    console.error('Error getting statistics:', error);
    return { error: 'Failed to get statistics', details: error.message };
  }
}

/**
 * Create a new lead
 */
async function createLead(userId: string, params: any) {
  try {
    const { name, email, phone, company, status = 'NEW' } = params;

    if (!name) {
      return { error: 'Name is required' };
    }

    const lead = await prisma.lead.create({
      data: {
        contactPerson: name,
        businessName: company || name,
        email,
        phone,
        status: status as any,
        userId,
        source: 'Voice AI',
      },
    });

    return {
      success: true,
      navigateTo: '/dashboard/contacts',
      lead: {
        id: lead.id,
        contactPerson: lead.contactPerson,
        businessName: lead.businessName,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
      },
      message: `Created contact ${name}${email ? ` (${email})` : ''}`,
    };
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return { error: 'Failed to create lead', details: error.message };
  }
}

/**
 * Create a new deal
 */
async function createDeal(userId: string, params: any) {
  try {
    const { title, value, leadId } = params;

    if (!title) {
      return { error: 'Title is required' };
    }

    const deal = await prisma.deal.create({
      data: {
        title,
        value: value ? parseFloat(value) : null,
        leadId,
        userId,
        status: 'OPEN',
      },
    });

    return {
      success: true,
      deal: {
        id: deal.id,
        title: deal.title,
        value: deal.value,
        status: deal.status,
      },
      message: `Created deal "${title}"${value ? ` worth $${value.toLocaleString()}` : ''}`,
    };
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return { error: 'Failed to create deal', details: error.message };
  }
}

/**
 * List leads
 * When user has active workflow draft, do NOT navigate - they're building a workflow and "contacts" means a step.
 */
async function listLeads(userId: string, params: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    });
    if (user?.activeWorkflowDraftId) {
      return {
        success: true,
        message: "Keeping you in the workflow builder. Did you mean to add a step? Say 'add step to email contacts' or 'add trigger when lead is created'.",
        inWorkflowBuilder: true,
      };
    }

    const { status, limit = 10, period } = params;

    const now = new Date();
    let startOfToday: Date | undefined;
    if (period === 'today') {
      startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const where: any = { userId };
    if (status) where.status = status;
    if (startOfToday) where.createdAt = { gte: startOfToday };

    const leads = await prisma.lead.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        contactPerson: true,
        businessName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    const periodLabel = period === 'today' ? ' created today' : '';
    return {
      success: true,
      leads: leads,
      count: leads.length,
      navigateTo: '/dashboard/contacts',
      message: `You have ${leads.length} ${status ? status.toLowerCase() : ''} lead${leads.length !== 1 ? 's' : ''}${periodLabel}.`,
    };
  } catch (error: any) {
    console.error('Error listing leads:', error);
    return { error: 'Failed to list leads', details: error.message };
  }
}

/**
 * List deals
 * When user has active workflow draft, do NOT navigate - they're building a workflow and "pipeline" means a step.
 */
async function listDeals(userId: string, params: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    });
    if (user?.activeWorkflowDraftId) {
      return {
        success: true,
        message: "Keeping you in the workflow builder. Did you mean to add a step? Say 'add step to move deal to next stage' or 'add trigger when deal is won'.",
        inWorkflowBuilder: true,
      };
    }

    const { limit = 10 } = params;

    const deals = await prisma.deal.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        value: true,
        status: true,
      },
    });

    return {
      success: true,
      navigateTo: '/dashboard/pipeline',
      deals: deals,
      count: deals.length,
      message: `Found ${deals.length} deal${deals.length !== 1 ? 's' : ''}`,
    };
  } catch (error: any) {
    console.error('Error listing deals:', error);
    return { error: 'Failed to list deals', details: error.message };
  }
}

/**
 * Search contacts
 * When user has active workflow draft, do NOT navigate - they're building a workflow.
 */
async function searchContacts(userId: string, params: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    });
    if (user?.activeWorkflowDraftId) {
      return {
        success: true,
        message: "Keeping you in the workflow builder. Did you mean to add a step involving contacts? Say 'add step to email contacts' or 'add trigger when contact is created'.",
        inWorkflowBuilder: true,
      };
    }

    const { query } = params;

    if (!query) {
      return { error: 'Search query is required' };
    }

    const leads = await prisma.lead.findMany({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: query, mode: 'insensitive' } },
          { businessName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true,
        contactPerson: true,
        businessName: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    return {
      success: true,
      navigateTo: '/dashboard/contacts',
      contacts: leads,
      count: leads.length,
      message: `Found ${leads.length} contact${leads.length !== 1 ? 's' : ''} matching "${query}"`,
    };
  } catch (error: any) {
    console.error('Error searching contacts:', error);
    return { error: 'Failed to search contacts', details: error.message };
  }
}

/**
 * Get recent activity
 */
async function getRecentActivity(userId: string, params: any) {
  try {
    const { limit = 10 } = params;

    const [recentLeads, recentDeals] = await Promise.all([
      prisma.lead.findMany({
        where: { userId },
        take: Math.floor(limit / 2),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          contactPerson: true,
          businessName: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.deal.findMany({
        where: { userId },
        take: Math.floor(limit / 2),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          value: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      success: true,
      activity: {
        recentLeads,
        recentDeals,
      },
      message: `Recent activity: ${recentLeads.length} new leads and ${recentDeals.length} new deals`,
    };
  } catch (error: any) {
    console.error('Error getting recent activity:', error);
    return { error: 'Failed to get recent activity', details: error.message };
  }
}

/**
 * Predict "what if" scenario - standalone for direct predict_scenario calls
 */
async function predictScenario(userId: string, params: any) {
  try {
    const { scenarioIntent } = params;
    const text = scenarioIntent || params.text || '';
    const intent = parseScenarioIntent(text);
    if (!intent) {
      return {
        success: false,
        error: 'Could not parse scenario. Try: "What if I convert 10 more leads?" or "What if I get 50 more leads?"',
      };
    }
    const scenarioResult = await calculateScenario(userId, intent.type, intent.params);
    if (!scenarioResult) {
      return { success: false, error: 'Could not calculate scenario.' };
    }
    return {
      success: true,
      navigateTo: '/dashboard/business-ai?mode=voice',
      scenarioResult,
      statistics: { scenarioResult },
      triggerVisualization: true,
      message: `${scenarioResult.scenario}. ${scenarioResult.assumption} → $${scenarioResult.impact.toLocaleString()} ${scenarioResult.unit === 'revenue' ? 'additional revenue' : 'potential'}.`,
    };
  } catch (error: any) {
    console.error('Error predicting scenario:', error);
    return { error: 'Failed to predict scenario', details: error.message };
  }
}

/**
 * Make outbound call to a single contact (voice + chat)
 */
async function handleMakeOutboundCall(userId: string, params: any) {
  const { contactName, phoneNumber, purpose, notes, voiceAgentId, voiceAgentName, immediate = true, scheduledFor } = params;
  if (!contactName || !purpose) {
    return { error: 'contactName and purpose are required' };
  }
  const result = await makeOutboundCall({
    userId,
    contactName,
    phoneNumber,
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName,
    immediate,
    scheduledFor,
  });
  if (!result.success) {
    return { error: result.error };
  }
  return {
    success: true,
    message: result.message || `Calling ${contactName} now`,
    navigateTo: '/dashboard/voice-agents',
  };
}

/**
 * Call multiple leads by criteria (bulk calls)
 */
async function handleCallLeads(userId: string, params: any) {
  const { purpose, notes, voiceAgentId, voiceAgentName, period, status, limit = 50 } = params;
  if (!purpose) {
    return { error: 'purpose is required' };
  }
  const result = await makeBulkOutboundCalls({
    userId,
    criteria: { period: period || 'today', status, limit },
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName,
    immediate: true,
  });
  if (!result.success && result.scheduled === 0) {
    return { error: result.error || 'No calls could be initiated' };
  }
  return {
    success: true,
    message: result.message || `Initiated ${result.scheduled} calls`,
    scheduled: result.scheduled,
    failed: result.failed,
    navigateTo: '/dashboard/voice-agents',
  };
}

/**
 * List user's voice agents for selection/confirmation
 */
async function handleListVoiceAgents(userId: string) {
  const agents = await prisma.voiceAgent.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      elevenLabsAgentId: { not: null },
    },
    select: { id: true, name: true, description: true },
  });
  return {
    success: true,
    agents: agents.map((a) => ({ id: a.id, name: a.name, description: a.description })),
    message: agents.length === 0
      ? 'No voice agents configured'
      : `You have ${agents.length} agent${agents.length !== 1 ? 's' : ''}: ${agents.map((a) => a.name).join(', ')}`,
  };
}

async function handleDraftSMS(userId: string, params: any) {
  const { contactName, message, phoneNumber } = params;
  if (!contactName || !message) return { error: 'contactName and message are required' };
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: 'insensitive' } },
        { businessName: { contains: contactName, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  const toPhone = phoneNumber || lead?.phone;
  if (!toPhone) return { error: `Contact "${contactName}" not found or has no phone number.` };
  return {
    success: true,
    message: "I've drafted an SMS for you to review. Should I send it now or schedule it for later?",
    smsDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toPhone,
      message,
      leadId: lead?.id,
    },
    navigateTo: '/dashboard/messages',
  };
}

async function handleSendSMS(userId: string, params: any) {
  const { contactName, message, phoneNumber } = params;
  if (!contactName || !message) return { error: 'contactName and message are required' };
  const result = await sendSMS({ userId, contactName, message, phoneNumber });
  if (!result.success) return { error: result.error };
  return { success: true, message: result.message, navigateTo: '/dashboard/messages' };
}

async function handleScheduleSMS(userId: string, params: any) {
  const { contactName, message, scheduledFor } = params;
  if (!contactName || !message || !scheduledFor) {
    return { error: 'contactName, message, and scheduledFor are required' };
  }
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: 'insensitive' } },
        { businessName: { contains: contactName, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!lead?.phone) return { error: `Contact "${contactName}" not found or has no phone number.` };
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) return { error: 'Scheduled time must be in the future.' };
  await prisma.scheduledSms.create({
    data: {
      userId,
      leadId: lead.id,
      toPhone: lead.phone,
      toName: lead.contactPerson || lead.businessName,
      message,
      scheduledFor: scheduledDate,
      status: 'PENDING',
    },
  });
  return {
    success: true,
    message: `SMS scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
    navigateTo: '/dashboard/messages',
  };
}

async function handleDraftEmail(userId: string, params: any) {
  const { contactName, subject, body, email } = params;
  if (!contactName || !subject || !body) return { error: 'contactName, subject, and body are required' };
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: 'insensitive' } },
        { businessName: { contains: contactName, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  const toEmail = email || lead?.email;
  if (!toEmail) return { error: `Contact "${contactName}" not found or has no email.` };
  return {
    success: true,
    message: "I've drafted an email for you to review. Should I send it now or schedule it for later?",
    emailDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toEmail,
      subject,
      body,
      leadId: lead?.id,
    },
    navigateTo: '/dashboard/messages',
  };
}

async function handleSendEmail(userId: string, params: any) {
  const { contactName, subject, body, email } = params;
  if (!contactName || !subject || !body) return { error: 'contactName, subject, and body are required' };
  const result = await sendEmail({ userId, contactName, subject, body, email });
  if (!result.success) return { error: result.error };
  return { success: true, message: result.message, navigateTo: '/dashboard/messages' };
}

async function handleScheduleEmail(userId: string, params: any) {
  const { contactName, subject, body, scheduledFor } = params;
  if (!contactName || !subject || !body || !scheduledFor) {
    return { error: 'contactName, subject, body, and scheduledFor are required' };
  }
  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: contactName, mode: 'insensitive' } },
        { businessName: { contains: contactName, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!lead?.email) return { error: `Contact "${contactName}" not found or has no email.` };
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) return { error: 'Scheduled time must be in the future.' };
  await prisma.scheduledEmail.create({
    data: {
      userId,
      leadId: lead.id,
      toEmail: lead.email,
      toName: lead.contactPerson || lead.businessName,
      subject,
      body,
      scheduledFor: scheduledDate,
      status: 'PENDING',
    },
  });
  return {
    success: true,
    message: `Email scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
    navigateTo: '/dashboard/messages',
  };
}

async function handleSMSLeads(userId: string, params: any) {
  const { message, period, status, limit } = params;
  if (!message) return { error: 'message is required' };
  const result = await sendSMSToLeads({
    userId,
    purpose: message,
    message,
    criteria: { period: period || 'today', status, limit },
  });
  if (!result.success && result.sent === 0) return { error: result.error };
  return { success: true, message: result.message, sent: result.sent, failed: result.failed, navigateTo: '/dashboard/messages' };
}

async function handleEmailLeads(userId: string, params: any) {
  const { subject, message, period, status, limit } = params;
  if (!subject || !message) return { error: 'subject and message are required' };
  const result = await sendEmailToLeads({
    userId,
    purpose: subject,
    message,
    subject,
    criteria: { period: period || 'today', status, limit },
  });
  if (!result.success && result.sent === 0) return { error: result.error };
  return { success: true, message: result.message, sent: result.sent, failed: result.failed, navigateTo: '/dashboard/messages' };
}

async function handleAddWorkflowTask(userId: string, params: any) {
  const { workflowId: paramWorkflowId, name, taskType = 'CUSTOM', description = '' } = params;
  let workflowId = paramWorkflowId;
  if (!workflowId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    });
    workflowId = user?.activeWorkflowDraftId || undefined;
  }
  if (!workflowId || !name) {
    return { error: 'No active workflow. Say "create workflow" first to start a new one, or provide workflowId.' };
  }
  const existing = await prisma.workflowTemplate.findFirst({
    where: { id: workflowId, userId },
    include: { tasks: { orderBy: { displayOrder: 'asc' } } },
  });
  if (!existing) return { error: 'Workflow not found' };
  const maxOrder = existing.tasks.length > 0 ? Math.max(...existing.tasks.map((t) => t.displayOrder)) : 0;
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
    message: `Added "${name}" to the workflow. What's the next step?`,
    task: { id: task.id, name: task.name, taskType: task.taskType },
    navigateTo: '/dashboard/workflows',
  };
}
