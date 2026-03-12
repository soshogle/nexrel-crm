/**
 * API Route: Handle CRM Voice Agent Function Calls
 *
 * POST - Process custom function calls from ElevenLabs CRM voice agent
 * These are called via webhook when the agent uses custom functions
 */

import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import {
  getCrmDb,
  leadService,
  dealService,
  campaignService,
  workflowTemplateService,
} from "@/lib/dal";
import {
  createDalContext,
  getDalContextFromSession,
} from "@/lib/context/industry-context";
import type { Industry } from "@/lib/dal";
import { syncLeadCreatedToPipeline } from "@/lib/lead-pipeline-sync";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseChartIntent, getDynamicChartData } from "@/lib/crm-chart-intent";
import {
  parseScenarioIntent,
  calculateScenario,
} from "@/lib/crm-scenario-predictor";
import {
  makeOutboundCall,
  makeBulkOutboundCalls,
} from "@/lib/outbound-call-service";
import { getMarketContext } from "@/lib/real-estate/market-data";
import {
  sendSMS,
  sendEmail,
  sendSMSToLeads,
  sendEmailToLeads,
} from "@/lib/messaging-service";
import { apiErrors } from "@/lib/api-error";
import {
  collectAIBrainOperationalMetrics,
  collectCrmOutcomeMetrics,
  correlateWithBaseline,
  getLatestGovernanceBaselineSnapshot,
} from "@/lib/nexrel-ai-brain/governance-analytics";
import {
  OPENCLAW_MODES,
  buildOpenClawRecoverySuggestion,
  getCustomerWorkflowSteps,
  getSalesSquadSteps,
  getSocialMediaLoopSteps,
  getVerticalPlaybookSteps,
} from "@/lib/openclaw-voice";
import {
  buildAssetFactoryManifest,
  buildCampaignCommanderPlan,
  buildContentPublisherPlan,
  buildMasterOfferDocument,
  buildCompetitorDossiers,
  buildGtmPlaybook,
  canRunWorkAiPhase,
  computePricingRecommendation,
  createWorkAiLaunchState,
  getNextPendingWorkAiPhase,
  getWorkAiPhaseDefinition,
  scoreOfferValidation,
  upsertWorkAiPhaseOutput,
  type WorkAiLaunchState,
} from "@/lib/work-ai-marketing";
import {
  evaluateAutonomyGate,
  getAutonomyControlPolicy,
} from "@/lib/agent-command-center-control";
import { generateGoViralAsset } from "@/lib/go-viral";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const DEBUG_CRM_VOICE_FUNCTIONS =
  process.env.DEBUG_CRM_VOICE_FUNCTIONS === "true";

async function proxyToActionsAPI(
  action: string,
  parameters: any,
  userId: string,
  req: NextRequest,
): Promise<any> {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  const url = `${baseUrl}/api/ai-assistant/actions`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, parameters, userId }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Action failed" };
  }

  if (!data?.success || data?.error || data?.result?.error) {
    return {
      success: false,
      error:
        data?.error ||
        data?.result?.error ||
        "Action failed to complete successfully.",
      result: data?.result,
    };
  }

  return {
    success: true,
    action,
    ...(data?.result ?? {}),
  };
}

async function saveVoiceNavigationIntent(input: {
  userId: string;
  industry: Industry | null;
  functionName: string;
  path: string;
}) {
  try {
    const ctx = createDalContext(input.userId, input.industry);
    const db = getCrmDb(ctx);
    await db.auditLog.create({
      data: {
        userId: input.userId,
        action: "SETTINGS_MODIFIED",
        severity: "LOW",
        entityType: "VOICE_NAVIGATION_INTENT",
        entityId: crypto.randomUUID(),
        metadata: {
          path: input.path,
          functionName: input.functionName,
          consumed: false,
          createdAt: new Date().toISOString(),
        },
        success: true,
      },
    });
  } catch (error) {
    console.error("[CRM Voice Functions] Failed to save navigation intent", {
      functionName: input.functionName,
      path: input.path,
      error,
    });
  }
}

/**
 * Handle function calls from ElevenLabs CRM voice agent
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { function_name, parameters, user_id } = body;
    // ElevenLabs may pass user_id at top level or inside parameters (from dynamic variables)
    const params = parameters || {};
    const userIdFromBody = user_id ?? params.user_id ?? body.user_id;

    console.log(
      `🧰 [CRM Voice Functions] Received call: ${function_name}`,
      parameters,
    );
    if (DEBUG_CRM_VOICE_FUNCTIONS) {
      const safeHeaders = {
        "user-agent": req.headers.get("user-agent"),
        "content-type": req.headers.get("content-type"),
        "x-forwarded-for": req.headers.get("x-forwarded-for"),
        "x-real-ip": req.headers.get("x-real-ip"),
        "x-elevenlabs-signature": req.headers.get("x-elevenlabs-signature")
          ? "present"
          : null,
      };
      console.log("🔎 [CRM Voice Functions][DEBUG] Incoming payload shape", {
        function_name,
        topLevelKeys: Object.keys(body || {}),
        parameterKeys: Object.keys(params || {}),
        userIdCandidates: {
          topLevelUserId: user_id ?? null,
          parameterUserId: params.user_id ?? null,
          resolvedUserId: userIdFromBody ?? null,
        },
        headers: safeHeaders,
      });
    }

    // Get user from session or user_id, and resolve industry for DB routing
    let userId = userIdFromBody;
    let industry: Industry | null = null;
    const session = await getServerSession(authOptions);
    if (!userId) {
      if (!session?.user?.id) {
        return apiErrors.unauthorized(
          "Unauthorized - user_id required or valid session",
        );
      }
      userId = session.user.id;
    }
    industry = ((session?.user as any)?.industry as Industry) ?? null;
    if (!industry) {
      const user = await getMetaDb().user.findUnique({
        where: { id: userId },
        select: { industry: true },
      });
      industry = (user?.industry as Industry) ?? null;
    }

    let result: any;

    switch (function_name) {
      case "get_statistics":
        result = await getStatistics(userId, parameters || {}, industry);
        break;

      case "create_lead":
        result = await createLead(userId, parameters, industry);
        break;

      case "create_deal":
        result = await createDeal(userId, parameters, industry);
        break;

      case "list_leads":
        result = await listLeads(userId, parameters, industry);
        break;

      case "list_deals":
        result = await listDeals(userId, parameters, industry);
        break;

      case "search_contacts":
        result = await searchContacts(userId, parameters, industry);
        break;

      case "get_recent_activity":
        result = await getRecentActivity(userId, parameters, industry);
        break;

      case "predict_scenario":
        result = await predictScenario(userId, parameters || {}, industry);
        break;

      case "make_outbound_call":
        result = await handleMakeOutboundCall(userId, parameters || {});
        break;

      case "call_leads":
        result = await handleCallLeads(userId, parameters || {});
        break;

      case "list_voice_agents":
        result = await handleListVoiceAgents(userId);
        break;

      case "draft_sms":
        result = await handleDraftSMS(userId, parameters || {}, industry);
        break;

      case "send_sms":
        result = await handleSendSMS(userId, parameters || {});
        break;

      case "schedule_sms":
        result = await handleScheduleSMS(userId, parameters || {}, industry);
        break;

      case "draft_email":
        result = await handleDraftEmail(userId, parameters || {}, industry);
        break;

      case "send_email":
        result = await handleSendEmail(userId, parameters || {});
        break;

      case "schedule_email":
        result = await handleScheduleEmail(userId, parameters || {}, industry);
        break;

      case "sms_leads":
        result = await handleSMSLeads(userId, parameters || {});
        break;

      case "email_leads":
        result = await handleEmailLeads(userId, parameters || {});
        break;

      case "add_workflow_task":
        result = await handleAddWorkflowTask(
          userId,
          parameters || {},
          industry,
        );
        break;

      case "openclaw_operate":
      case "automation_operate":
        result = await handleOpenClawOperate(
          userId,
          parameters || {},
          industry,
          req,
        );
        break;

      case "create_task":
      case "list_tasks":
      case "complete_task":
      case "create_ai_employee":
      case "list_ai_employees":
      case "add_note":
      case "update_deal_stage":
      case "create_invoice":
      case "list_overdue_invoices":
        result = await proxyToActionsAPI(
          function_name,
          parameters || {},
          userId,
          req,
        );
        break;

      case "get_daily_briefing":
      case "update_deal":
      case "get_follow_up_suggestions":
        result = await proxyToActionsAPI(
          function_name,
          parameters || {},
          userId,
          req,
        );
        break;

      case "get_meeting_prep":
      case "create_bulk_tasks":
        result = await proxyToActionsAPI(
          function_name,
          parameters || {},
          userId,
          req,
        );
        break;

      case "create_report":
      case "navigate_to":
        result = await proxyToActionsAPI(
          function_name,
          parameters || {},
          userId,
          req,
        );
        break;

      case "create_appointment":
      case "list_appointments":
      case "update_appointment":
      case "cancel_appointment":
        result = await proxyToActionsAPI(
          function_name,
          parameters || {},
          userId,
          req,
        );
        break;

      case "clone_website":
      case "create_website":
      case "list_websites":
      case "modify_website":
      case "get_website_structure":
      case "update_hero":
      case "add_section":
      case "update_section_content":
      case "add_cta":
        result = await proxyToActionsAPI(
          function_name,
          parameters || {},
          userId,
          req,
        );
        break;

      case "add_lead_tag":
      case "update_lead_status":
      case "list_notes":
      case "get_pipeline_stages":
      case "assign_deal_to_lead":
      case "reschedule_task":
      case "reorder_section":
      case "delete_section":
      case "list_website_media":
      case "add_website_image":
      case "get_follow_up_priority":
      case "get_deal_risk_alerts":
      case "bulk_update_lead_status":
      case "bulk_add_tag":
      case "export_pipeline_csv":
        result = await proxyToActionsAPI(
          function_name,
          parameters || {},
          userId,
          req,
        );
        break;

      default:
        result = { error: `Unknown function: ${function_name}` };
    }

    console.log(`✅ [CRM Voice Functions] ${function_name} result:`, result);

    if (
      function_name === "openclaw_operate" ||
      function_name === "automation_operate"
    ) {
      try {
        const logCtx = createDalContext(userId, industry);
        await getCrmDb(logCtx).auditLog.create({
          data: {
            userId,
            action: "SETTINGS_MODIFIED",
            severity: result?.success ? "LOW" : "MEDIUM",
            entityType: "OPENCLAW_OPERATION",
            entityId: crypto.randomUUID(),
            metadata: {
              mode: params?.mode || null,
              success: !!result?.success,
              error: result?.error || null,
              createdAt: new Date().toISOString(),
            },
            success: !!result?.success,
          },
        });
      } catch (logError) {
        console.error(
          "[CRM Voice Functions] Failed to log OpenClaw operation",
          logError,
        );
      }
    }

    const navigationPath =
      typeof result?.navigateTo === "string" && result.navigateTo.trim()
        ? result.navigateTo
        : null;
    if (navigationPath) {
      await saveVoiceNavigationIntent({
        userId,
        industry,
        functionName: function_name,
        path: navigationPath,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[CRM Voice Functions] Error:", error);
    return apiErrors.internal(error.message || "Function execution failed");
  }
}

/**
 * Get CRM statistics with time-based queries and comparison support
 */
async function getStatistics(
  userId: string,
  params: any = {},
  industry: Industry | null = null,
) {
  try {
    const { period = "all_time", compareWith, chartIntent } = params;

    // Calculate date ranges based on period
    const now = new Date();
    let startDate: Date | null = null;
    let compareStartDate: Date | null = null;
    let compareEndDate: Date | null = null;

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "last_7_months") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 7, 1);
      if (
        compareWith === "previous_year" ||
        compareWith === "previous_period"
      ) {
        compareStartDate = new Date(
          now.getFullYear() - 1,
          now.getMonth() - 7,
          1,
        );
        compareEndDate = new Date(now.getFullYear() - 1, now.getMonth(), 0);
      }
    } else if (period === "last_year") {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    } else if (period === "last_30_days") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clauses
    const whereClause: any = { userId };
    const compareWhereClause: any = { userId };

    if (startDate) {
      whereClause.createdAt = { gte: startDate };
    }

    if (compareStartDate && compareEndDate) {
      compareWhereClause.createdAt = {
        gte: compareStartDate,
        lte: compareEndDate,
      };
    }

    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);

    const [leads, deals, contacts, campaigns] = await Promise.all([
      leadService.count(ctx, whereClause),
      dealService.count(ctx, whereClause),
      leadService.count(ctx, whereClause), // Contacts are leads
      campaignService.count(ctx, whereClause),
    ]);

    const userForDemoCheck = await getMetaDb().user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const isOrthoDemo =
      String(userForDemoCheck?.email || "")
        .toLowerCase()
        .trim() === "orthodontist@nexrel.com";

    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && leads === 0 && deals === 0 && campaigns === 0) {
      const { MOCK_CRM_STATISTICS } = await import("@/lib/mock-data");
      return {
        success: true,
        navigateTo: "/dashboard/business-ai?mode=voice",
        statistics: {
          totalLeads: MOCK_CRM_STATISTICS.leads,
          totalDeals: MOCK_CRM_STATISTICS.deals,
          totalContacts: MOCK_CRM_STATISTICS.leads,
          totalCampaigns: MOCK_CRM_STATISTICS.campaigns,
          openDeals: MOCK_CRM_STATISTICS.openDeals,
          totalRevenue: MOCK_CRM_STATISTICS.totalRevenue,
          monthlyRevenue: MOCK_CRM_STATISTICS.monthlyRevenue,
          monthlyDeals: {},
          comparisonData: null,
          recentLeads: MOCK_CRM_STATISTICS.recentLeads.map((l: any) => ({
            name: l.contactPerson || l.businessName || "Unknown",
            status: l.status,
            createdAt: l.createdAt,
          })),
          charts: MOCK_CRM_STATISTICS.chartData,
          dynamicCharts: [],
          scenarioResult: null,
        },
        message: `You have ${MOCK_CRM_STATISTICS.leads} leads, ${MOCK_CRM_STATISTICS.deals} deals, ${MOCK_CRM_STATISTICS.openDeals} open deals worth $${MOCK_CRM_STATISTICS.totalRevenue.toLocaleString()}, and ${MOCK_CRM_STATISTICS.campaigns} campaigns.`,
      };
    }

    // Get all deals with dates for time-series analysis
    const allDeals = await db.deal.findMany({
      where: whereClause,
      select: {
        value: true,
        actualCloseDate: true,
        createdAt: true,
        expectedCloseDate: true,
      },
    });

    const openDeals = allDeals.filter((deal) => deal.actualCloseDate === null);
    const totalRevenue = openDeals.reduce(
      (sum, deal) => sum + (deal.value || 0),
      0,
    );

    // Calculate revenue by month for the last 7 months
    const monthlyRevenue: Record<string, number> = {};
    const monthlyDeals: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[monthKey] = 0;
      monthlyDeals[monthKey] = 0;
    }

    // Calculate revenue and deals by month
    allDeals.forEach((deal) => {
      const dealDate =
        deal.actualCloseDate || deal.createdAt || deal.expectedCloseDate;
      if (dealDate) {
        const date = new Date(dealDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += deal.value || 0;
          monthlyDeals[monthKey] += 1;
        }
      }
    });

    // Get comparison data if requested
    let comparisonData: any = null;
    if (compareStartDate && compareEndDate) {
      const compareDeals = await db.deal.findMany({
        where: compareWhereClause,
        select: {
          value: true,
          actualCloseDate: true,
          createdAt: true,
        },
      });

      const compareMonthlyRevenue: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const monthDate = new Date(
          now.getFullYear() - 1,
          now.getMonth() - i,
          1,
        );
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        compareMonthlyRevenue[monthKey] = 0;
      }

      compareDeals.forEach((deal) => {
        const dealDate = deal.actualCloseDate || deal.createdAt;
        if (dealDate) {
          const date = new Date(dealDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          if (compareMonthlyRevenue.hasOwnProperty(monthKey)) {
            compareMonthlyRevenue[monthKey] += deal.value || 0;
          }
        }
      });

      comparisonData = {
        monthlyRevenue: compareMonthlyRevenue,
        totalRevenue: compareDeals.reduce(
          (sum, deal) => sum + (deal.value || 0),
          0,
        ),
      };
    }

    const recentLeads = await leadService.findMany(ctx, {
      take: 5,
      select: {
        businessName: true,
        contactPerson: true,
        status: true,
        createdAt: true,
      },
    });

    // Prepare chart-ready data formats
    const chartData = {
      // Line/Bar chart data for monthly revenue
      monthlyRevenueChart: {
        labels: Object.keys(monthlyRevenue).map((month) =>
          new Date(month + "-01").toLocaleDateString("en-US", {
            month: "short",
          }),
        ),
        datasets: [
          {
            label: "Revenue",
            data: Object.values(monthlyRevenue),
            borderColor: "rgb(139, 92, 246)",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
          },
        ],
      },
      // Pie chart data for CRM metrics distribution
      metricsPieChart: {
        labels: ["Leads", "Deals", "Open Deals", "Campaigns"],
        datasets: [
          {
            label: "CRM Metrics",
            data: [leads, deals, openDeals.length, campaigns],
            backgroundColor: [
              "rgba(139, 92, 246, 0.8)", // Purple for Leads
              "rgba(59, 130, 246, 0.8)", // Blue for Deals
              "rgba(16, 185, 129, 0.8)", // Green for Open Deals
              "rgba(245, 158, 11, 0.8)", // Amber for Campaigns
            ],
          },
        ],
      },
      // Bar chart data for metrics comparison
      metricsBarChart: {
        labels: ["Leads", "Deals", "Open Deals", "Campaigns"],
        datasets: [
          {
            label: "Count",
            data: [leads, deals, openDeals.length, campaigns],
            backgroundColor: "rgba(139, 92, 246, 0.8)",
          },
        ],
      },
    };

    // Parse chart intent and fetch dynamic chart data if user requested a specific chart
    let dynamicCharts: {
      chartType: "pie" | "bar" | "line";
      dimension: string;
      title: string;
      data: { name: string; value: number }[];
    }[] = [];
    if (chartIntent) {
      const intent = parseChartIntent(chartIntent);
      if (intent) {
        let data: { name: string; value: number }[] = [];
        if (intent.dimension === "revenue_by_month") {
          data = Object.entries(monthlyRevenue).map(([month, value]) => ({
            name: new Date(month + "-01").toLocaleDateString("en-US", {
              month: "short",
            }),
            value,
          }));
        } else {
          data = await getDynamicChartData(userId, intent.dimension, industry);
        }
        if (data.length > 0) {
          const titles: Record<string, string> = {
            leads_by_status: "Leads by Status",
            leads_by_source: "Leads by Source",
            deals_by_stage: "Deals by Stage",
            revenue_by_stage: "Revenue by Stage",
            revenue_by_month: "Monthly Revenue",
          };
          dynamicCharts = [
            {
              chartType: intent.chartType,
              dimension: intent.dimension,
              title: titles[intent.dimension] || intent.dimension,
              data,
            },
          ];
        }
      }
    }

    // "What if" scenario prediction when user asks for projections
    let scenarioResult: any = null;
    if (chartIntent) {
      const scenarioIntent = parseScenarioIntent(chartIntent);
      if (scenarioIntent) {
        scenarioResult = await calculateScenario(
          userId,
          scenarioIntent.type,
          scenarioIntent.params,
          industry,
        );
      }
    }

    // Market stats for REAL_ESTATE (median price, sales volume) for voice/analytics
    let marketStats: {
      medianPrice?: number;
      salesVolume?: number;
      dom?: number;
      region?: string;
    } | null = null;
    if (industry === "REAL_ESTATE") {
      try {
        const db = getCrmDb(ctx);
        const topCity = await db.rEProperty.findFirst({
          where: { userId },
          select: { city: true },
          orderBy: { createdAt: "desc" },
        });
        const region = topCity?.city || "Montreal";
        const marketCtx = await getMarketContext(userId, {
          region,
          city: region,
          months: 6,
        });
        const curr = marketCtx.current;
        if (curr) {
          marketStats = {
            medianPrice: curr.medianSalePrice ?? undefined,
            salesVolume: curr.numberOfSales ?? undefined,
            dom: curr.domAvg ?? curr.sellingTimeMedian ?? undefined,
            region: curr.region,
          };
        }
      } catch (e) {
        console.warn("[CRM Voice] Market stats fetch failed:", e);
      }
    }

    return {
      success: true,
      navigateTo: "/dashboard/business-ai?mode=voice",
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
        recentLeads: recentLeads.map((lead) => ({
          name: lead.contactPerson || lead.businessName || "Unknown",
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
        })),
        // Chart-ready data formats
        charts: chartData,
        // Dynamic charts based on user request
        dynamicCharts,
        // "What if" scenario projection
        scenarioResult,
        // Market stats for REAL_ESTATE (median price, sales volume)
        marketStats,
      },
      message: scenarioResult
        ? `Scenario: ${scenarioResult.scenario}. ${scenarioResult.assumption} → $${scenarioResult.impact.toLocaleString()} ${scenarioResult.unit === "revenue" ? "additional revenue" : "potential"}.`
        : marketStats?.medianPrice != null
          ? `You have ${leads} leads, ${deals} deals, ${openDeals.length} open deals worth $${totalRevenue.toLocaleString()}, and ${campaigns} campaigns. In ${marketStats.region || "your market"}, median sale price is $${marketStats.medianPrice.toLocaleString()}${marketStats.salesVolume != null ? ` with ${marketStats.salesVolume} recent sales` : ""}.`
          : `You have ${leads} leads, ${deals} deals, ${openDeals.length} open deals worth $${totalRevenue.toLocaleString()}, and ${campaigns} campaigns.`,
    };
  } catch (error: any) {
    console.error("Error getting statistics:", error);
    return { error: "Failed to get statistics", details: error.message };
  }
}

/**
 * Create a new lead
 */
async function createLead(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  try {
    const { name, email, phone, company, status = "NEW", source } = params;

    if (!name) {
      return {
        error:
          "Name is required to create a lead. Please provide the contact's name.",
      };
    }

    const ctx = createDalContext(userId, industry);
    const lead = await leadService.create(ctx, {
      contactPerson: name,
      businessName: company || name,
      email,
      phone,
      status: status as any,
      source: source || "Voice AI",
    } as any);

    syncLeadCreatedToPipeline(userId, lead).catch((err) => {
      console.error(
        "[LeadPipelineSync] Failed on Voice AI lead creation:",
        err,
      );
    });

    return {
      success: true,
      navigateTo: `/dashboard/contacts?id=${lead.id}`,
      lead: {
        id: lead.id,
        contactPerson: lead.contactPerson,
        businessName: lead.businessName,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
      },
      message: `Created contact ${name}${email ? ` (${email})` : ""}`,
    };
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return { error: "Failed to create lead", details: error.message };
  }
}

/**
 * Create a new deal
 */
async function createDeal(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  try {
    const { title, value, leadId } = params;

    if (!title) {
      return { error: "Title is required" };
    }

    const ctx = createDalContext(userId, industry);
    const deal = await dealService.create(ctx, {
      title,
      value: value ? parseFloat(value) : null,
      leadId,
      status: "OPEN",
    } as any);

    return {
      success: true,
      deal: {
        id: deal.id,
        title: deal.title,
        value: deal.value,
        status: (deal as any).status,
      },
      message: `Created deal "${title}"${value ? ` worth $${value.toLocaleString()}` : ""}`,
    };
  } catch (error: any) {
    console.error("Error creating deal:", error);
    return { error: "Failed to create deal", details: error.message };
  }
}

/**
 * List leads
 * When user has active workflow draft, do NOT navigate - they're building a workflow and "contacts" means a step.
 */
async function listLeads(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  try {
    const user: any = await getMetaDb().user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    } as any);
    if (user?.activeWorkflowDraftId) {
      return {
        success: true,
        message:
          "Keeping you in the workflow builder. Did you mean to add a step? Say 'add step to email contacts' or 'add trigger when lead is created'.",
        inWorkflowBuilder: true,
      };
    }

    const { status, source, limit = 10, period } = params;

    const now = new Date();
    let startOfToday: Date | undefined;
    if (period === "today") {
      startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const where: any = { userId };
    if (status) where.status = status;
    if (startOfToday) where.createdAt = { gte: startOfToday };
    // Filter by source: "website" = any website lead, or specific source
    if (source) {
      if (source.toLowerCase() === "website") {
        where.OR = [
          { source: { contains: "website", mode: "insensitive" } },
          { source: { contains: "Website Form", mode: "insensitive" } },
          { source: { contains: "Embedded Widget", mode: "insensitive" } },
          { source: { contains: "Website Voice AI", mode: "insensitive" } },
        ];
      } else {
        where.source = { contains: source, mode: "insensitive" };
      }
    }

    const ctx = createDalContext(userId, industry);
    const leads = await leadService.findMany(ctx, {
      where,
      take: limit,
      select: {
        id: true,
        contactPerson: true,
        businessName: true,
        email: true,
        phone: true,
        status: true,
        source: true,
        createdAt: true,
      },
    });

    const periodLabel = period === "today" ? " created today" : "";
    const sourceLabel = source ? ` from ${source}` : "";
    return {
      success: true,
      leads: leads,
      count: leads.length,
      navigateTo: "/dashboard/contacts",
      message: `You have ${leads.length} ${status ? status.toLowerCase() : ""} lead${leads.length !== 1 ? "s" : ""}${sourceLabel}${periodLabel}.`,
    };
  } catch (error: any) {
    console.error("Error listing leads:", error);
    return { error: "Failed to list leads", details: error.message };
  }
}

/**
 * List deals
 * When user has active workflow draft, do NOT navigate - they're building a workflow and "pipeline" means a step.
 */
async function listDeals(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  try {
    const user: any = await getMetaDb().user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    } as any);
    if (user?.activeWorkflowDraftId) {
      return {
        success: true,
        message:
          "Keeping you in the workflow builder. Did you mean to add a step? Say 'add step to move deal to next stage' or 'add trigger when deal is won'.",
        inWorkflowBuilder: true,
      };
    }

    const { limit = 10 } = params;

    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);
    const deals = await db.deal.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        value: true,
        status: true,
      },
    } as any);

    return {
      success: true,
      navigateTo: "/dashboard/pipeline",
      deals: deals,
      count: deals.length,
      message: `Found ${deals.length} deal${deals.length !== 1 ? "s" : ""}`,
    };
  } catch (error: any) {
    console.error("Error listing deals:", error);
    return { error: "Failed to list deals", details: error.message };
  }
}

/**
 * Search contacts
 * When user has active workflow draft, do NOT navigate - they're building a workflow.
 */
async function searchContacts(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  try {
    const user: any = await getMetaDb().user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    } as any);
    if (user?.activeWorkflowDraftId) {
      return {
        success: true,
        message:
          "Keeping you in the workflow builder. Did you mean to add a step involving contacts? Say 'add step to email contacts' or 'add trigger when contact is created'.",
        inWorkflowBuilder: true,
      };
    }

    const { query } = params;

    if (!query) {
      return { error: "Search query is required" };
    }

    const ctx = createDalContext(userId, industry);
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { contactPerson: { contains: query, mode: "insensitive" } },
          { businessName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
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
      navigateTo: "/dashboard/contacts",
      contacts: leads,
      count: leads.length,
      message: `Found ${leads.length} contact${leads.length !== 1 ? "s" : ""} matching "${query}"`,
    };
  } catch (error: any) {
    console.error("Error searching contacts:", error);
    return { error: "Failed to search contacts", details: error.message };
  }
}

/**
 * Get recent activity
 */
async function getRecentActivity(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  try {
    const { limit = 10 } = params;

    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);
    const [recentLeads, recentDeals] = await Promise.all([
      leadService.findMany(ctx, {
        take: Math.floor(limit / 2),
        select: {
          id: true,
          contactPerson: true,
          businessName: true,
          status: true,
          createdAt: true,
        },
      }),
      db.deal.findMany({
        where: { userId },
        take: Math.floor(limit / 2),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          value: true,
          status: true,
          createdAt: true,
        },
      } as any),
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
    console.error("Error getting recent activity:", error);
    return { error: "Failed to get recent activity", details: error.message };
  }
}

/**
 * Predict "what if" scenario - standalone for direct predict_scenario calls
 */
async function predictScenario(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  try {
    const { scenarioIntent } = params;
    const text = scenarioIntent || params.text || "";
    const intent = parseScenarioIntent(text);
    if (!intent) {
      return {
        success: false,
        error:
          'Could not parse scenario. Try: "What if I convert 10 more leads?" or "What if I get 50 more leads?"',
      };
    }
    const scenarioResult = await calculateScenario(
      userId,
      intent.type,
      intent.params,
      industry,
    );
    if (!scenarioResult) {
      return { success: false, error: "Could not calculate scenario." };
    }
    return {
      success: true,
      navigateTo: "/dashboard/business-ai?mode=voice",
      scenarioResult,
      statistics: { scenarioResult },
      triggerVisualization: true,
      message: `${scenarioResult.scenario}. ${scenarioResult.assumption} → $${scenarioResult.impact.toLocaleString()} ${scenarioResult.unit === "revenue" ? "additional revenue" : "potential"}.`,
    };
  } catch (error: any) {
    console.error("Error predicting scenario:", error);
    return { error: "Failed to predict scenario", details: error.message };
  }
}

/**
 * Make outbound call to a single contact (voice + chat)
 */
async function handleMakeOutboundCall(userId: string, params: any) {
  const {
    contactName,
    phoneNumber,
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName,
    immediate = true,
    scheduledFor,
  } = params;
  if (!contactName || !purpose) {
    return { error: "contactName and purpose are required" };
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
    navigateTo: "/dashboard/voice-agents",
  };
}

/**
 * Call multiple leads by criteria (bulk calls)
 */
async function handleCallLeads(userId: string, params: any) {
  const {
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName,
    period,
    status,
    limit = 50,
  } = params;
  if (!purpose) {
    return { error: "purpose is required" };
  }
  const result = await makeBulkOutboundCalls({
    userId,
    criteria: { period: period || "today", status, limit },
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName,
    immediate: true,
  });
  if (!result.success && result.scheduled === 0) {
    return { error: result.error || "No calls could be initiated" };
  }
  return {
    success: true,
    message: result.message || `Initiated ${result.scheduled} calls`,
    scheduled: result.scheduled,
    failed: result.failed,
    navigateTo: "/dashboard/voice-agents",
  };
}

/**
 * List user's voice agents for selection/confirmation
 */
async function handleListVoiceAgents(userId: string) {
  const ctx = createDalContext(userId, null);
  const agents = await getCrmDb(ctx).voiceAgent.findMany({
    where: {
      userId,
      status: "ACTIVE",
      elevenLabsAgentId: { not: null },
    },
    select: { id: true, name: true, description: true },
  });
  return {
    success: true,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
    })),
    message:
      agents.length === 0
        ? "No voice agents configured"
        : `You have ${agents.length} agent${agents.length !== 1 ? "s" : ""}: ${agents.map((a) => a.name).join(", ")}`,
  };
}

async function handleDraftSMS(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  const { contactName, message, phoneNumber } = params;
  if (!contactName || !message)
    return { error: "contactName and message are required" };
  const ctx = createDalContext(userId, industry);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0] ?? null;
  const toPhone = phoneNumber || lead?.phone;
  if (!toPhone)
    return {
      error: `Contact "${contactName}" not found or has no phone number.`,
    };
  return {
    success: true,
    message:
      "I've drafted an SMS for you to review. Should I send it now or schedule it for later?",
    smsDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toPhone,
      message,
      leadId: lead?.id,
    },
    navigateTo: "/dashboard/messages",
  };
}

async function handleSendSMS(userId: string, params: any) {
  const { contactName, message, phoneNumber } = params;
  if (!contactName || !message)
    return { error: "contactName and message are required" };
  const result = await sendSMS({ userId, contactName, message, phoneNumber });
  if (!result.success) return { error: result.error };
  return {
    success: true,
    message: result.message,
    navigateTo: "/dashboard/messages",
  };
}

async function handleScheduleSMS(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  const { contactName, message, scheduledFor } = params;
  if (!contactName || !message || !scheduledFor) {
    return { error: "contactName, message, and scheduledFor are required" };
  }
  const ctx = createDalContext(userId, industry);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0] ?? null;
  if (!lead?.phone)
    return {
      error: `Contact "${contactName}" not found or has no phone number.`,
    };
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date())
    return { error: "Scheduled time must be in the future." };
  await (getCrmDb(ctx) as any).scheduledSms.create({
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
    success: true,
    message: `SMS scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
    navigateTo: "/dashboard/messages",
  };
}

async function handleDraftEmail(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  const { contactName, subject, body, email } = params;
  if (!contactName || !subject || !body)
    return { error: "contactName, subject, and body are required" };
  const ctx = createDalContext(userId, industry);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0] ?? null;
  const toEmail = email || lead?.email;
  if (!toEmail)
    return { error: `Contact "${contactName}" not found or has no email.` };
  return {
    success: true,
    message:
      "I've drafted an email for you to review. Should I send it now or schedule it for later?",
    emailDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toEmail,
      subject,
      body,
      leadId: lead?.id,
    },
    navigateTo: "/dashboard/messages",
  };
}

async function handleSendEmail(userId: string, params: any) {
  const { contactName, subject, body, email } = params;
  if (!contactName || !subject || !body)
    return { error: "contactName, subject, and body are required" };
  const result = await sendEmail({ userId, contactName, subject, body, email });
  if (!result.success) return { error: result.error };
  return {
    success: true,
    message: result.message,
    navigateTo: "/dashboard/messages",
  };
}

async function handleScheduleEmail(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  const { contactName, subject, body, scheduledFor } = params;
  if (!contactName || !subject || !body || !scheduledFor) {
    return {
      error: "contactName, subject, body, and scheduledFor are required",
    };
  }
  const ctx = createDalContext(userId, industry);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0] ?? null;
  if (!lead?.email)
    return { error: `Contact "${contactName}" not found or has no email.` };
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date())
    return { error: "Scheduled time must be in the future." };
  await (getCrmDb(ctx) as any).scheduledEmail.create({
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
    success: true,
    message: `Email scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
    navigateTo: "/dashboard/messages",
  };
}

async function handleSMSLeads(userId: string, params: any) {
  const { message, period, status, limit } = params;
  if (!message) return { error: "message is required" };
  const result = await sendSMSToLeads({
    userId,
    purpose: message,
    message,
    criteria: { period: period || "today", status, limit },
  });
  if (!result.success && result.sent === 0) return { error: result.error };
  return {
    success: true,
    message: result.message,
    sent: result.sent,
    failed: result.failed,
    navigateTo: "/dashboard/messages",
  };
}

async function handleEmailLeads(userId: string, params: any) {
  const { subject, message, period, status, limit } = params;
  if (!subject || !message)
    return { error: "subject and message are required" };
  const result = await sendEmailToLeads({
    userId,
    purpose: subject,
    message,
    subject,
    criteria: { period: period || "today", status, limit },
  });
  if (!result.success && result.sent === 0) return { error: result.error };
  return {
    success: true,
    message: result.message,
    sent: result.sent,
    failed: result.failed,
    navigateTo: "/dashboard/messages",
  };
}

async function handleAddWorkflowTask(
  userId: string,
  params: any,
  industry: Industry | null = null,
) {
  const {
    workflowId: paramWorkflowId,
    name,
    taskType = "CUSTOM",
    description = "",
  } = params;
  let workflowId = paramWorkflowId;
  if (!workflowId) {
    const user: any = await getMetaDb().user.findUnique({
      where: { id: userId },
      select: { activeWorkflowDraftId: true },
    } as any);
    workflowId = user?.activeWorkflowDraftId || undefined;
  }
  if (!workflowId || !name) {
    return {
      error:
        'No active workflow. Say "create workflow" first to start a new one, or provide workflowId.',
    };
  }
  const ctx = createDalContext(userId, industry);
  const db = getCrmDb(ctx);
  const existing = await workflowTemplateService.findUnique(ctx, workflowId);
  if (!existing) return { error: "Workflow not found" };
  const tasks = (existing as any).tasks || [];
  const maxOrder =
    tasks.length > 0 ? Math.max(...tasks.map((t: any) => t.displayOrder)) : 0;
  const task = await db.workflowTask.create({
    data: {
      templateId: workflowId,
      name,
      description: description || "",
      taskType: taskType || "CUSTOM",
      assignedAgentType: null,
      delayValue: 0,
      delayUnit: "MINUTES",
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
    navigateTo: "/dashboard/workflows",
  };
}

const WORK_AI_ENTITY_TYPE = "WORK_AI_OFFER_LAUNCH";

async function getLatestWorkAiLaunch(
  db: ReturnType<typeof getCrmDb>,
  userId: string,
  launchId?: string,
): Promise<WorkAiLaunchState | null> {
  const row = await db.auditLog.findFirst({
    where: {
      userId,
      entityType: WORK_AI_ENTITY_TYPE,
      ...(launchId ? { entityId: launchId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      metadata: true,
    },
  });
  const metadata = row?.metadata as any;
  if (!metadata?.launchId || !metadata?.phaseStatus) return null;
  return metadata as WorkAiLaunchState;
}

async function persistWorkAiLaunch(
  db: ReturnType<typeof getCrmDb>,
  userId: string,
  state: WorkAiLaunchState,
) {
  await db.auditLog.create({
    data: {
      userId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: WORK_AI_ENTITY_TYPE,
      entityId: state.launchId,
      metadata: state as any,
      success: true,
    },
  });
}

async function handleOpenClawOperate(
  userId: string,
  params: any,
  industry: Industry | null,
  req: NextRequest,
) {
  const mode = String(params?.mode || "execution_chain");
  const ctx = createDalContext(userId, industry);
  const db = getCrmDb(ctx);

  if (mode === "work_ai_orchestrator") {
    const action = String(params?.action || "status");
    const requestedLaunchId =
      typeof params?.launchId === "string" ? params.launchId : undefined;

    if (action === "initialize") {
      const state = createWorkAiLaunchState({
        launchId: crypto.randomUUID(),
        ownerUserId: userId,
        offerName: String(params?.offerName || "Untitled Offer"),
        selectedNiche:
          typeof params?.selectedNiche === "string"
            ? params.selectedNiche
            : null,
      });
      await persistWorkAiLaunch(db, userId, state);
      return {
        success: true,
        mode,
        action,
        launch: state,
        message:
          "Work AI launch initialized. Start with phase 1 (Truth Engine) using run_phase.",
        navigateTo: "/dashboard/business-ai?mode=voice",
      };
    }

    const current = await getLatestWorkAiLaunch(db, userId, requestedLaunchId);
    if (!current) {
      return {
        success: false,
        mode,
        error:
          "No Work AI launch found. Initialize first with action=initialize.",
      };
    }

    if (action === "status") {
      return {
        success: true,
        mode,
        action,
        launch: current,
        nextPhase: getNextPendingWorkAiPhase(current),
      };
    }

    if (action !== "run_phase") {
      return {
        success: false,
        mode,
        error: "action must be initialize, status, or run_phase",
      };
    }

    const phaseId = Number(params?.phaseId || current.currentPhase || 1);
    const phase = getWorkAiPhaseDefinition(phaseId);
    if (!phase) {
      return {
        success: false,
        mode,
        error: `Unknown phase ${phaseId}`,
      };
    }

    const gate = canRunWorkAiPhase(current, phaseId);
    if (!gate.ok) {
      return {
        success: false,
        mode,
        action,
        phaseId,
        error: gate.reason,
      };
    }

    if (phaseId === 1) {
      const skills = Array.isArray(params?.skills)
        ? params.skills.filter(Boolean)
        : [];
      const interests = Array.isArray(params?.interests)
        ? params.interests.filter(Boolean)
        : [];
      const businessModels = Array.isArray(params?.businessModels)
        ? params.businessModels.filter(Boolean)
        : ["services", "digital products"];
      if (skills.length === 0 && interests.length === 0) {
        return {
          success: false,
          mode,
          action,
          phaseId,
          error:
            "Phase 1 needs skills or interests. Provide skills[] and interests[] to continue.",
        };
      }

      const niche = String(
        params?.selectedNiche ||
          `${skills[0] || interests[0]} automation services`,
      );
      const recommendation = {
        niche,
        rationale:
          "Demand and pain alignment indicate this niche is monetizable and suitable for offer construction.",
        businessModels,
      };
      const shouldLock = params?.lockIn === true;
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: shouldLock ? "completed" : "in_progress",
        output: recommendation,
        currentPhase: shouldLock ? 2 : 1,
        selectedNiche: shouldLock ? niche : current.selectedNiche,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        lockedIn: shouldLock,
        message: shouldLock
          ? `Phase 1 completed. Niche locked: ${niche}`
          : `Phase 1 drafted. Say 'lock it in' with selectedNiche=${niche} to complete.`,
        output: recommendation,
        launch: updated,
      };
    }

    if (phaseId === 2) {
      const niche = current.selectedNiche || params?.selectedNiche;
      if (!niche) {
        return {
          success: false,
          mode,
          action,
          phaseId,
          error: "Phase 2 requires a locked niche from Phase 1.",
        };
      }
      const rawPains = Array.isArray(params?.painSignals)
        ? params.painSignals
        : [
            "Leads go cold due to slow follow-up",
            "Ad spend is wasted on low-intent prospects",
            "No repeatable system for conversion",
          ];
      const synthesizedPains = rawPains
        .slice(0, 10)
        .map((pain: string, index: number) => ({
          rank: index + 1,
          pain,
        }));
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output: { niche, synthesizedPains },
        currentPhase: 3,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output: { niche, synthesizedPains },
        launch: updated,
      };
    }

    if (phaseId === 3) {
      const pains = current.phaseOutputs?.[2]?.synthesizedPains || [];
      const mechanisms = [
        {
          name: "Predictable Pipeline Engine",
          pillars: [
            "Speed-to-lead automation",
            "Intent scoring and prioritization",
            "Automated follow-up sequence",
          ],
        },
        {
          name: "Offer Conversion Accelerator",
          pillars: [
            "Pain-aligned messaging",
            "Objection-aware scripts",
            "High-ticket qualification flow",
          ],
        },
        {
          name: "Revenue Recovery Loop",
          pillars: [
            "Database reactivation",
            "No-show rescue automation",
            "Renewal and upsell prompts",
          ],
        },
      ];
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output: { sourcePains: pains, mechanisms },
        currentPhase: 4,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output: { mechanisms },
        launch: updated,
      };
    }

    if (phaseId === 4) {
      const icps = [
        {
          name: "The Growth-Focused Operator",
          demographics: "Owner/operator with active demand but weak conversion",
          psychographics:
            "Wants predictable growth, distrusts generic agencies",
          behaviors: "Consumes tactical marketing content, values ROI proofs",
        },
        {
          name: "The Capacity-Constrained Team",
          demographics: "Small team with limited sales bandwidth",
          psychographics: "Overwhelmed by follow-up and process complexity",
          behaviors: "Responds to automation and done-for-you implementation",
        },
        {
          name: "The Performance Optimizer",
          demographics: "Already advertising but underperforming funnels",
          psychographics: "Data-driven and benchmark-oriented",
          behaviors: "Seeks split-test plans and measurable lift",
        },
      ];
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output: { icps },
        currentPhase: 5,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output: { icps },
        launch: updated,
      };
    }

    if (phaseId === 5) {
      const niche = current.selectedNiche || "General";
      const icpNames = Array.isArray(current.phaseOutputs?.[4]?.icps)
        ? current.phaseOutputs[4].icps.map((icp: any) => String(icp.name))
        : [];
      const dossiers = buildCompetitorDossiers({
        niche,
        icpNames,
        competitors: Array.isArray(params?.competitors)
          ? params.competitors
          : undefined,
      });
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output: { dossiers },
        currentPhase: 6,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output: { dossiers },
        launch: updated,
      };
    }

    if (phaseId === 6) {
      const niche = current.selectedNiche || "General";
      const competitors = Array.isArray(current.phaseOutputs?.[5]?.dossiers)
        ? current.phaseOutputs[5].dossiers
        : [];
      const playbook = buildGtmPlaybook({ niche, competitors });
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output: { playbook },
        currentPhase: 7,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output: { playbook },
        launch: updated,
      };
    }

    if (phaseId === 7) {
      const pricing = computePricingRecommendation({
        expectedClientValue: params?.expectedClientValue,
        competitorPriceMedian: params?.competitorPriceMedian,
        estimatedCac: params?.estimatedCac,
        fulfillmentCost: params?.fulfillmentCost,
        targetMarginPct: params?.targetMarginPct,
      });
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output: pricing,
        currentPhase: 8,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output: pricing,
        launch: updated,
      };
    }

    if (phaseId === 8) {
      const validation = scoreOfferValidation({
        demandStrength: params?.demandStrength,
        painClarity: params?.painClarity,
        mechanismUniqueness: params?.mechanismUniqueness,
        competitorPressure: params?.competitorPressure,
        profitabilityStrength: params?.profitabilityStrength,
      });
      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output: validation,
        currentPhase: 9,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output: validation,
        launch: updated,
      };
    }

    if (phaseId === 9) {
      const masterOfferDoc = buildMasterOfferDocument({
        offerName: current.offerName,
        selectedNiche: current.selectedNiche,
        phaseOutputs: current.phaseOutputs,
      });

      const reportResult = await proxyToActionsAPI(
        "create_report",
        {
          title: masterOfferDoc.title,
          reportType: "custom",
          period: "all_time",
        },
        userId,
        req,
      );

      const output = {
        masterOfferDoc,
        report: reportResult?.error ? null : reportResult,
      };

      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output,
        currentPhase: 10,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output,
        launch: updated,
      };
    }

    if (phaseId === 10) {
      const masterOfferDoc = current.phaseOutputs?.[9]?.masterOfferDoc;
      if (!masterOfferDoc) {
        return {
          success: false,
          mode,
          action,
          phaseId,
          error: "Phase 10 requires phase 9 master offer document output.",
        };
      }

      const manifest = buildAssetFactoryManifest({
        offerName: current.offerName,
        selectedNiche: current.selectedNiche,
        masterOfferDoc,
      });

      const websiteResult = await proxyToActionsAPI(
        "create_website",
        {
          name: manifest.website.name,
          templateType: manifest.website.templateType,
          businessDescription: manifest.website.businessDescription,
        },
        userId,
        req,
      );

      const vslReport = await proxyToActionsAPI(
        "create_report",
        {
          title: manifest.documents.vslTitle,
          reportType: "custom",
          period: "all_time",
        },
        userId,
        req,
      );

      const deckReport = await proxyToActionsAPI(
        "create_report",
        {
          title: manifest.documents.deckTitle,
          reportType: "custom",
          period: "all_time",
        },
        userId,
        req,
      );

      const output = {
        manifest,
        website: websiteResult?.error ? null : websiteResult,
        vsl: vslReport?.error ? null : vslReport,
        salesDeck: deckReport?.error ? null : deckReport,
      };

      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: "completed",
        output,
        currentPhase: 11,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: true,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output,
        launch: updated,
        navigateTo:
          output.website?.navigateTo ||
          output.website?.url ||
          "/dashboard/websites",
      };
    }

    if (phaseId === 11) {
      const gtmPlaybook = current.phaseOutputs?.[6]?.playbook;
      const icps = current.phaseOutputs?.[4]?.icps;
      const plan = buildCampaignCommanderPlan({
        offerName: current.offerName,
        selectedNiche: current.selectedNiche,
        gtmPlaybook,
        icps,
        defaultDailyBudget: params?.budgetDaily,
      });

      const approvedLaunch = params?.approvedLaunch === true;
      if (!approvedLaunch) {
        const pending = upsertWorkAiPhaseOutput(current, {
          phaseId,
          status: "in_progress",
          output: {
            plan,
            approvalRequired: true,
            approvalPrompt:
              "Campaign launch requires explicit confirmation. Re-run phase 11 with approvedLaunch=true to execute.",
          },
          currentPhase: 11,
        });
        await persistWorkAiLaunch(db, userId, pending);
        return {
          success: true,
          mode,
          action,
          phaseId,
          phaseName: phase.name,
          approvalRequired: true,
          output: { plan },
          message:
            "Campaign plan prepared. Confirm with approvedLaunch=true to create and launch the campaign.",
          launch: pending,
        };
      }

      const campaignResult = await proxyToActionsAPI(
        "create_campaign",
        {
          name: plan.campaignName,
          type: "EMAIL",
        },
        userId,
        req,
      );

      const campaignId =
        campaignResult?.campaign?.id ||
        campaignResult?.id ||
        campaignResult?.result?.id;

      let activationResult: any = null;
      if (campaignId) {
        activationResult = await proxyToActionsAPI(
          "update_campaign",
          {
            campaignId,
            status: "ACTIVE",
          },
          userId,
          req,
        );
      }

      const output = {
        plan,
        campaign: campaignResult?.error ? null : campaignResult,
        activation: activationResult?.error ? null : activationResult,
      };

      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status: campaignResult?.error ? "blocked" : "completed",
        output,
        currentPhase: campaignResult?.error ? 11 : 12,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success: !campaignResult?.error,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output,
        launch: updated,
        navigateTo: "/dashboard/campaigns",
      };
    }

    if (phaseId === 12) {
      const contentPlan = buildContentPublisherPlan({
        offerName: current.offerName,
        selectedNiche: current.selectedNiche,
      });

      const campaignResult = await proxyToActionsAPI(
        "create_campaign",
        {
          name: contentPlan.campaignName,
          type: "EMAIL",
        },
        userId,
        req,
      );

      const reportResult = await proxyToActionsAPI(
        "create_report",
        {
          title: `${current.offerName} Content Calendar`,
          reportType: "custom",
          period: "last_30_days",
        },
        userId,
        req,
      );

      const taskResult = await proxyToActionsAPI(
        "create_task",
        {
          title: `${current.offerName} - Publish weekly content set`,
          description: `Execute content calendar across channels with CTA: ${contentPlan.primaryCta}`,
          priority: "MEDIUM",
        },
        userId,
        req,
      );

      const output = {
        contentPlan,
        distributionCampaign: campaignResult?.error ? null : campaignResult,
        contentReport: reportResult?.error ? null : reportResult,
        publishingTask: taskResult?.error ? null : taskResult,
      };

      const updated = upsertWorkAiPhaseOutput(current, {
        phaseId,
        status:
          campaignResult?.error || reportResult?.error || taskResult?.error
            ? "blocked"
            : "completed",
        output,
        currentPhase: 12,
      });
      await persistWorkAiLaunch(db, userId, updated);
      return {
        success:
          !campaignResult?.error && !reportResult?.error && !taskResult?.error,
        mode,
        action,
        phaseId,
        phaseName: phase.name,
        output,
        launch: updated,
        message:
          "Content publishing system prepared with campaign, report artifact, and publishing task.",
        navigateTo: "/dashboard/campaigns",
      };
    }

    return {
      success: false,
      mode,
      action,
      phaseId,
      error: "Phase is unsupported or unavailable for this launch state.",
      launch: current,
    };
  }

  if (mode === "execution_chain") {
    const checkpoints: Array<{
      step: string;
      status: "ok" | "failed";
      detail: string;
    }> = [];
    const contactName = params?.contactName || params?.name;
    const email = params?.email;
    const phone = params?.phone;
    const company = params?.company;
    if (!contactName) {
      return {
        success: false,
        error: "contactName is required for execution_chain",
        recovery: buildOpenClawRecoverySuggestion("name required", params),
      };
    }

    const leadResult = await createLead(
      userId,
      {
        name: contactName,
        email,
        phone,
        company,
        source: "OpenClaw Voice Chain",
      },
      industry,
    );
    if (!leadResult?.success || !leadResult?.lead?.id) {
      return {
        success: false,
        error: leadResult?.error || "Failed to create contact",
        checkpoints,
        recovery: buildOpenClawRecoverySuggestion(
          leadResult?.error || "",
          params,
        ),
      };
    }
    checkpoints.push({
      step: "create_contact",
      status: "ok",
      detail: `Created ${leadResult.lead.contactPerson}`,
    });

    const dealTitle = params?.dealTitle || `${contactName} Opportunity`;
    const dealValue = params?.dealValue;
    const dealResult = await createDeal(
      userId,
      { title: dealTitle, value: dealValue, leadId: leadResult.lead.id },
      industry,
    );
    if (!dealResult?.success || !dealResult?.deal?.id) {
      checkpoints.push({
        step: "create_deal",
        status: "failed",
        detail: dealResult?.error || "Deal creation failed",
      });
      return {
        success: false,
        error: dealResult?.error || "Failed to create deal",
        checkpoints,
        recovery: buildOpenClawRecoverySuggestion(
          dealResult?.error || "",
          params,
        ),
        rollback: `Contact ${contactName} remains created. Say 'delete contact ${contactName}' to rollback.`,
      };
    }
    checkpoints.push({
      step: "create_deal",
      status: "ok",
      detail: `Created deal ${dealResult.deal.title}`,
    });

    const taskResult = await proxyToActionsAPI(
      "create_task",
      {
        title: params?.followUpTaskTitle || `Follow up with ${contactName}`,
        description:
          params?.followUpTaskDescription ||
          `OpenClaw chain follow-up for ${contactName}`,
        priority: params?.taskPriority || "HIGH",
        leadId: leadResult.lead.id,
        dealId: dealResult.deal.id,
      },
      userId,
      req,
    );
    if (taskResult?.error) {
      checkpoints.push({
        step: "create_follow_up_task",
        status: "failed",
        detail: taskResult.error,
      });
      return {
        success: false,
        error: taskResult.error,
        checkpoints,
        recovery: buildOpenClawRecoverySuggestion(taskResult.error, params),
      };
    }
    checkpoints.push({
      step: "create_follow_up_task",
      status: "ok",
      detail: "Created follow-up task",
    });

    const emailDraftResult = await handleDraftEmail(
      userId,
      {
        contactName,
        email,
        subject:
          params?.introEmailSubject ||
          `Great connecting with you, ${contactName.split(" ")[0]}`,
        body:
          params?.introEmailBody ||
          `Hi ${contactName},\n\nThanks for your time today. I created your onboarding record and next-step follow up.\n\nBest regards,`,
      },
      industry,
    );
    if (emailDraftResult?.error) {
      checkpoints.push({
        step: "draft_intro_email",
        status: "failed",
        detail: emailDraftResult.error,
      });
      return {
        success: false,
        error: emailDraftResult.error,
        checkpoints,
        recovery: buildOpenClawRecoverySuggestion(
          emailDraftResult.error,
          params,
        ),
      };
    }
    checkpoints.push({
      step: "draft_intro_email",
      status: "ok",
      detail: "Drafted intro email",
    });

    return {
      success: true,
      mode,
      checkpoints,
      lead: leadResult.lead,
      deal: dealResult.deal,
      emailDraft: emailDraftResult?.emailDraft,
      message:
        "Chain complete: contact created, deal created, follow-up task set, intro email drafted.",
      navigateTo: `/dashboard/contacts?id=${leadResult.lead.id}`,
    };
  }

  if (mode === "approval_voice") {
    const decision = String(params?.decision || "list");
    const jobId = params?.jobId;
    if (decision === "list") {
      const jobs = await (db as any).aIJob.findMany({
        where: {
          status: "PENDING",
          input: { path: ["approvalRequired"], equals: true },
          jobType: { startsWith: "nexrel_ai_brain_" },
        },
        orderBy: { createdAt: "desc" },
        take: Number(params?.limit || 10),
        select: {
          id: true,
          jobType: true,
          createdAt: true,
          input: true,
        },
      });
      return {
        success: true,
        mode,
        pendingApprovals: jobs,
        riskSummary: jobs.map((job: any) => ({
          jobId: job.id,
          jobType: job.jobType,
          createdAt: job.createdAt,
          riskLevel: job?.input?.riskTier || "HIGH",
          reason: job?.input?.reason || "Approval required",
        })),
      };
    }

    if (!jobId) {
      return { success: false, error: "jobId is required for approve/reject" };
    }

    if (decision === "approve") {
      await (db as any).aIJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          output: {
            approvedByVoice: true,
            approvedAt: new Date().toISOString(),
            notes: params?.notes || null,
          },
        },
      });
      return {
        success: true,
        mode,
        message: `Approved job ${jobId}`,
        navigateTo: "/dashboard/ai-brain-operator/jobs",
      };
    }

    if (decision === "reject") {
      await (db as any).aIJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          output: {
            rejectedByVoice: true,
            rejectedAt: new Date().toISOString(),
            notes: params?.notes || "Rejected by voice",
          },
        },
      });
      return {
        success: true,
        mode,
        message: `Rejected job ${jobId}`,
        navigateTo: "/dashboard/ai-brain-operator/jobs",
      };
    }
    return {
      success: false,
      error: "decision must be list, approve, or reject",
    };
  }

  if (mode === "daily_command_center") {
    const now = new Date();
    const staleDealDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const overdueTasks = await (db as any).task.count({
      where: {
        dueDate: { lt: now },
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
    });
    const staleDeals = await (db as any).deal.count({
      where: {
        status: "OPEN",
        updatedAt: { lt: staleDealDate },
      },
    });
    const pendingApprovals = await (db as any).aIJob.count({
      where: {
        status: "PENDING",
        input: { path: ["approvalRequired"], equals: true },
      },
    });

    const recommendations = [
      {
        code: "CREATE_FOLLOW_UP_TASKS",
        title: "Create follow-up tasks for stale open deals",
      },
      {
        code: "REVIEW_HIGH_RISK_APPROVALS",
        title: "Review pending high-risk approvals",
      },
      {
        code: "RUN_LEAD_NUDGE_CAMPAIGN",
        title: "Run outreach to inactive leads",
      },
    ];

    if (params?.executeRecommendation === true) {
      const code = String(params?.recommendationCode || "");
      if (code === "CREATE_FOLLOW_UP_TASKS") {
        const exec = await proxyToActionsAPI(
          "create_bulk_tasks",
          {
            taskTitle: "Follow up with {name} on open opportunity",
            period: "last_week",
            dueInDays: 1,
          },
          userId,
          req,
        );
        return {
          success: !exec?.error,
          mode,
          executedRecommendation: code,
          execution: exec,
          navigateTo: "/dashboard/tasks",
        };
      }
    }

    return {
      success: true,
      mode,
      summary: {
        overdueTasks,
        staleDeals,
        pendingApprovals,
      },
      recommendations,
      message: `Morning brief: ${overdueTasks} overdue tasks, ${staleDeals} stale deals, ${pendingApprovals} pending approvals.`,
      navigateTo: "/dashboard/business-ai?mode=voice",
    };
  }

  if (mode === "sales_squad") {
    const trustMode = String(params?.trustMode || "crawl").toLowerCase();
    const ownerControl = await getAutonomyControlPolicy(ctx);
    const moduleGate = evaluateAutonomyGate({
      policy: ownerControl.policy,
      module: "sales",
    });
    if (!moduleGate.ok) {
      return {
        success: false,
        mode,
        blockedByOwnerControl: true,
        error: moduleGate.reason,
      };
    }
    const leads = await leadService.findMany(ctx, {
      where: {
        userId,
        status: { in: ["NEW", "CONTACTED"] as any },
      } as any,
      take: Number(params?.limit || 10),
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        contactPerson: true,
        businessName: true,
        email: true,
        phone: true,
      },
    });

    let tasksCreated = 0;
    let emailsDrafted = 0;

    for (const lead of leads as any[]) {
      await (db as any).task.create({
        data: {
          userId,
          leadId: lead.id,
          title: `Sales Squad follow-up: ${lead.contactPerson || lead.businessName || "lead"}`,
          description: "Generated by OpenClaw sales_squad mode.",
          priority: "HIGH",
          status: "TODO",
          autoCreated: true,
          aiSuggested: true,
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
          tags: ["openclaw", "sales-squad"],
        },
      });
      tasksCreated += 1;

      if (
        trustMode === "run" &&
        lead.email &&
        ownerControl.policy.channels.email
      ) {
        await (db as any).scheduledEmail.create({
          data: {
            userId,
            leadId: lead.id,
            toEmail: lead.email,
            toName: lead.contactPerson || lead.businessName || null,
            subject: "Quick follow-up from our sales team",
            body: `Hi ${lead.contactPerson || "there"},\n\nWe reviewed your profile and have a tailored next step ready for you. Reply with your preferred time and we'll connect right away.`,
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000),
            status: "PENDING",
          },
        });
        emailsDrafted += 1;
      }
    }

    return {
      success: true,
      mode,
      trustMode,
      leadsProcessed: leads.length,
      tasksCreated,
      emailsDrafted,
      steps: getSalesSquadSteps(),
      message:
        trustMode === "run"
          ? "Sales Squad executed autonomous follow-up tasks and queued personalized outreach."
          : "Sales Squad prepared and routed lead follow-up tasks.",
      navigateTo: "/dashboard/agent-command-center/sales",
    };
  }

  if (mode === "meeting_call_intelligence") {
    const phase = String(params?.phase || "pre_call");
    const contactName = params?.contactName;
    if (!contactName) {
      return { success: false, error: "contactName is required" };
    }

    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
      take: 1,
    });
    const lead = leads[0];
    if (!lead)
      return { success: false, error: `Contact ${contactName} not found` };

    if (phase === "pre_call") {
      const [tasks, deals] = await Promise.all([
        (db as any).task.findMany({
          where: { leadId: lead.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        (db as any).deal.findMany({
          where: { leadId: lead.id },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
      ]);
      return {
        success: true,
        mode,
        phase,
        prep: {
          lead: {
            id: lead.id,
            name: lead.contactPerson,
            company: lead.businessName,
            status: lead.status,
            email: lead.email,
            phone: lead.phone,
          },
          recentTasks: tasks,
          relatedDeals: deals,
        },
        navigateTo: `/dashboard/contacts?id=${lead.id}`,
      };
    }

    const callSummary = String(params?.callSummary || "Call completed.");
    const nextAction = String(
      params?.nextAction ||
        `Follow up with ${lead.contactPerson || contactName}`,
    );
    const noteRes = await proxyToActionsAPI(
      "add_note",
      {
        contactName: lead.contactPerson || lead.businessName,
        content: `Call summary: ${callSummary}`,
      },
      userId,
      req,
    );
    const taskRes = await proxyToActionsAPI(
      "create_task",
      {
        title: nextAction,
        description: `Auto-created from call summary for ${lead.contactPerson || contactName}`,
        leadId: lead.id,
        priority: "HIGH",
      },
      userId,
      req,
    );
    const draftRes = await handleDraftEmail(
      userId,
      {
        contactName: lead.contactPerson || lead.businessName,
        subject:
          params?.followUpSubject ||
          `Great speaking today, ${lead.contactPerson || contactName}`,
        body:
          params?.followUpBody ||
          `Hi ${lead.contactPerson || contactName},\n\nThanks for the call today. Here's a recap: ${callSummary}\n\nNext step: ${nextAction}.`,
      },
      industry,
    );
    return {
      success: !noteRes?.error && !taskRes?.error,
      mode,
      phase: "post_call",
      outcomes: {
        note: noteRes,
        task: taskRes,
        emailDraft: draftRes,
      },
      message:
        "Post-call workflow complete: note logged, next action created, follow-up drafted.",
      navigateTo: `/dashboard/contacts?id=${lead.id}`,
    };
  }

  if (mode === "performance_coaching") {
    const days = Math.max(7, Math.min(90, Number(params?.days || 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [operational, crm, baseline] = await Promise.all([
      collectAIBrainOperationalMetrics(ctx, since),
      collectCrmOutcomeMetrics(ctx, since),
      getLatestGovernanceBaselineSnapshot(ctx),
    ]);
    const correlation = correlateWithBaseline(
      { aiBrain: operational, crm },
      baseline,
    );
    const correctiveActions: string[] = [];
    if (correlation.crm.conversionRatePctDelta < 0) {
      correctiveActions.push(
        "Increase follow-up cadence for qualified leads and trigger same-day outreach tasks.",
      );
    }
    if (operational.pendingApprovals > 5) {
      correctiveActions.push(
        "Clear pending high-risk approvals to reduce execution latency.",
      );
    }
    if (operational.deniedActions > 20) {
      correctiveActions.push(
        "Tune role capability matrix and prompts to reduce denied action attempts.",
      );
    }
    return {
      success: true,
      mode,
      windowDays: days,
      metrics: { operational, crm },
      correlation,
      correctiveActions,
      navigateTo: "/dashboard/business-ai?mode=voice",
    };
  }

  if (mode === "vertical_playbook") {
    const vertical = String(params?.vertical || "dental").toLowerCase();
    const playbookType = String(params?.playbookType || "campaign_workflow");
    const workflowName =
      params?.workflowName ||
      (vertical === "real_estate"
        ? "OpenClaw Real Estate Nurture Playbook"
        : "OpenClaw Dental Recall & Follow-up Playbook");
    const createWorkflow = await proxyToActionsAPI(
      "create_workflow",
      {
        name: workflowName,
        description: `${vertical} ${playbookType} playbook`,
      },
      userId,
      req,
    );
    if (createWorkflow?.error) {
      return { success: false, mode, error: createWorkflow.error };
    }
    const workflowId =
      createWorkflow?.workflow?.id || createWorkflow?.id || params?.workflowId;
    if (!workflowId) {
      return {
        success: false,
        mode,
        error: "Workflow created but workflowId was not returned.",
      };
    }

    const steps = getVerticalPlaybookSteps(
      vertical === "real_estate" ? "real_estate" : "dental",
    );

    for (const step of steps) {
      await proxyToActionsAPI(
        "add_workflow_task",
        {
          workflowId,
          name: step.name,
          taskType: step.taskType,
        },
        userId,
        req,
      );
    }

    return {
      success: true,
      mode,
      workflowId,
      vertical,
      stepsCreated: steps.length,
      message: `Built ${vertical} playbook with ${steps.length} workflow steps.`,
      navigateTo: `/dashboard/workflows?openBuilder=1&draftId=${workflowId}`,
    };
  }

  if (mode === "autonomous_mode") {
    const enabled = Boolean(params?.enabled);
    const businessHoursOnly = params?.businessHoursOnly !== false;
    const allowedRisk = params?.allowedRisk || "LOW";
    await db.auditLog.create({
      data: {
        userId,
        action: "SETTINGS_MODIFIED",
        severity: "MEDIUM",
        entityType: "OPENCLAW_AUTONOMY_POLICY",
        entityId: crypto.randomUUID(),
        metadata: {
          enabled,
          businessHoursOnly,
          allowedRisk,
          queuedHighRiskForHITL: true,
          updatedAt: new Date().toISOString(),
        },
        success: true,
      },
    });
    return {
      success: true,
      mode,
      message: enabled
        ? "Controlled autonomous mode enabled for low-risk actions in business hours."
        : "Controlled autonomous mode disabled.",
      navigateTo: "/dashboard/business-ai?mode=voice",
    };
  }

  if (mode === "team_ops") {
    const employees = await (db as any).aIEmployee.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        customName: true,
        profession: true,
      },
      take: 25,
    });
    const delegationTaskTitle =
      params?.delegationTaskTitle || "Review stale leads and assign follow-ups";
    const delegateTo = employees[0];
    const taskResult = await proxyToActionsAPI(
      "create_task",
      {
        title: delegationTaskTitle,
        description: delegateTo
          ? `Delegated to ${delegateTo.customName} (${delegateTo.profession})`
          : "Delegation requested; no active AI employee found.",
        priority: "HIGH",
      },
      userId,
      req,
    );
    return {
      success: !taskResult?.error,
      mode,
      employees,
      delegation: taskResult,
      message: delegateTo
        ? `Delegated to ${delegateTo.customName}.`
        : "No active AI employee available; created unassigned delegation task.",
      navigateTo: "/dashboard/tasks",
    };
  }

  if (mode === "social_media_loop") {
    const trustMode = String(params?.trustMode || "crawl").toLowerCase();
    const ownerControl = await getAutonomyControlPolicy(ctx);
    const moduleGate = evaluateAutonomyGate({
      policy: ownerControl.policy,
      module: "social",
    });
    if (!moduleGate.ok) {
      return {
        success: false,
        mode,
        blockedByOwnerControl: true,
        error: moduleGate.reason,
      };
    }
    const ideaTitle = String(
      params?.campaignTitle || "Larry Loop content cycle",
    );

    const task = await (db as any).task.create({
      data: {
        userId,
        title: `${ideaTitle} - Produce draft content set`,
        description:
          "Generate hooks, slide assets, captions, and queue draft-first publishing.",
        priority: "MEDIUM",
        status: "TODO",
        autoCreated: true,
        aiSuggested: true,
        tags: ["openclaw", "social-loop"],
      },
    });

    let draftReport: any = null;
    if (trustMode !== "crawl" && ownerControl.policy.channels.social) {
      draftReport = await proxyToActionsAPI(
        "create_report",
        {
          title: `${ideaTitle} Diagnostic Brief`,
          reportType: "custom",
          period: "last_30_days",
        },
        userId,
        req,
      );
    }

    const viralDraft = await generateGoViralAsset(ctx, {
      objective:
        "Create a high-velocity social concept that attracts qualified leads",
      product: String(params?.product || "core offer"),
      audience: String(params?.audience || "high-intent buyers"),
      kind: "image",
      model: "nanobanana",
      tone: "high-contrast and curiosity-driven",
    }).catch(() => null);

    return {
      success: true,
      mode,
      trustMode,
      createdTask: { id: task.id, title: task.title },
      viralDraftJobId: viralDraft?.id || null,
      diagnosticReport: draftReport?.error ? null : draftReport,
      steps: getSocialMediaLoopSteps(),
      message:
        trustMode === "crawl"
          ? "Social loop drafted the next content cycle for approval."
          : "Social loop queued content production and generated a diagnostic brief.",
      navigateTo: "/dashboard/agent-command-center/social/go-viral",
    };
  }

  if (mode === "customer_voice_workflow") {
    const workflowName =
      params?.workflowName || "OpenClaw Customer Voice Qualification Flow";
    const createWorkflow = await proxyToActionsAPI(
      "create_workflow",
      {
        name: workflowName,
        description:
          "Inbound qualification, booking, FAQ handling, human handoff, CRM sync",
      },
      userId,
      req,
    );
    if (createWorkflow?.error) {
      return { success: false, mode, error: createWorkflow.error };
    }
    const workflowId = createWorkflow?.workflow?.id || createWorkflow?.id;
    if (!workflowId) {
      return { success: false, mode, error: "Workflow ID not returned" };
    }
    const steps = getCustomerWorkflowSteps();
    for (const step of steps) {
      await proxyToActionsAPI(
        "add_workflow_task",
        { workflowId, name: step.name, taskType: step.taskType },
        userId,
        req,
      );
    }
    return {
      success: true,
      mode,
      workflowId,
      stepsCreated: steps.length,
      message:
        "Customer-facing voice workflow created with qualification, booking, FAQ, handoff, and CRM sync steps.",
      navigateTo: `/dashboard/workflows?openBuilder=1&draftId=${workflowId}`,
    };
  }

  return {
    success: false,
    error: `Unsupported mode. Use one of: ${OPENCLAW_MODES.join(", ")}`,
  };
}
