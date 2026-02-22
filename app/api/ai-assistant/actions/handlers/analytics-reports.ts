import { getCrmDb } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";

export async function getStatistics(userId: string, params: any = {}) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
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
    const whereClause: any = { userId: ctx.userId };
    const compareWhereClause: any = { userId: ctx.userId };
    
    if (startDate) {
      whereClause.createdAt = { gte: startDate };
    }
    
    if (compareStartDate && compareEndDate) {
      compareWhereClause.createdAt = { gte: compareStartDate, lte: compareEndDate };
    }

    const [leads, deals, contacts, campaigns, additionalStats] = await Promise.all([
      db.lead.count({ where: whereClause }),
      db.deal.count({ where: whereClause }),
      db.lead.count({ where: whereClause }),
      db.campaign.count({ where: whereClause }),
      fetchComprehensiveStats(userId, whereClause),
    ]);

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

    const recentLeads = await db.lead.findMany({
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
      const { parseScenarioIntent, calculateScenario } = await import("@/lib/crm-scenario-predictor");
      const parsed = parseScenarioIntent(scenarioIntent);
      if (parsed) {
        scenarioResult = await calculateScenario(userId, parsed.type, parsed.params);
      }
    }

    // Dynamic charts based on user's chart intent
    let dynamicCharts: { chartType: 'pie' | 'bar' | 'line'; dimension: string; title: string; data: { name: string; value: number }[] }[] = [];
    if (chartIntent) {
      const { parseChartIntent, getDynamicChartData } = await import("@/lib/crm-chart-intent");
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
        ...additionalStats,
      },
      message: `You have ${leads} leads, ${deals} deals, ${openDeals.length} open deals worth $${totalRevenue.toLocaleString()}, and ${campaigns} campaigns.${additionalStats.campaignPerformance ? ` Email open rate: ${additionalStats.campaignPerformance.emailOpenRate.toFixed(1)}%, SMS reply rate: ${additionalStats.campaignPerformance.smsReplyRate.toFixed(1)}%.` : ''}${additionalStats.voiceCallAnalytics ? ` Voice calls: ${additionalStats.voiceCallAnalytics.totalCalls}, answer rate: ${additionalStats.voiceCallAnalytics.answerRate.toFixed(1)}%.` : ''}`,
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

export async function fetchComprehensiveStats(userId: string, whereClause: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  try {
    const results = await Promise.allSettled([
      // Campaign performance (email)
      db.emailCampaign.findMany({
        where: { userId: ctx.userId },
        include: { recipients: { select: { status: true, openedAt: true, clickedAt: true } } },
      }),
      // Campaign performance (SMS)
      db.smsCampaign.findMany({
        where: { userId: ctx.userId },
        include: { recipients: { select: { status: true, repliedAt: true } } },
      }),
      // Email drip campaigns
      db.emailDripCampaign.findMany({
        where: { userId: ctx.userId },
        select: {
          status: true, totalEnrolled: true, totalCompleted: true,
          avgOpenRate: true, avgClickRate: true, avgReplyRate: true,
        },
      }),
      // Voice calls
      db.callLog.findMany({
        where: { userId: ctx.userId },
        select: { status: true, duration: true, direction: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      // Workflows
      db.workflow.findMany({
        where: { userId: ctx.userId },
        select: { status: true },
      }),
      db.workflowEnrollment.findMany({
        where: { workflow: { userId: ctx.userId } },
        select: { status: true },
      }),
      // Deal stages for funnel
      db.deal.findMany({
        where: { userId: ctx.userId },
        include: { stage: { select: { name: true, probability: true } } },
      }),
      // Lead scoring
      db.lead.findMany({
        where: { userId: ctx.userId, leadScore: { not: null } },
        select: { leadScore: true, status: true },
      }),
      // Outbound calls
      db.outboundCall.findMany({
        where: { userId: ctx.userId },
        select: { status: true, completedAt: true },
      }),
    ]);

    const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === 'fulfilled' ? r.value : fallback;

    const emailCampaigns = get(results[0], [] as any[]);
    const smsCampaigns = get(results[1], [] as any[]);
    const dripCampaigns = get(results[2], [] as any[]);
    const callLogs = get(results[3], [] as any[]);
    const workflows = get(results[4], [] as any[]);
    const enrollments = get(results[5], [] as any[]);
    const dealsWithStages = get(results[6], [] as any[]);
    const leadsWithScores = get(results[7], [] as any[]);
    const outboundCalls = get(results[8], [] as any[]);

    // Campaign performance
    let emailSent = 0, emailOpened = 0, emailClicked = 0;
    emailCampaigns.forEach((c: any) => {
      (c.recipients || []).forEach((r: any) => {
        if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(r.status)) emailSent++;
        if (['OPENED', 'CLICKED'].includes(r.status)) emailOpened++;
        if (r.status === 'CLICKED') emailClicked++;
      });
    });
    let smsSent = 0, smsDelivered = 0, smsReplied = 0;
    smsCampaigns.forEach((c: any) => {
      (c.recipients || []).forEach((r: any) => {
        if (['SENT', 'DELIVERED', 'REPLIED'].includes(r.status)) smsSent++;
        if (['DELIVERED', 'REPLIED'].includes(r.status)) smsDelivered++;
        if (r.status === 'REPLIED' || r.repliedAt) smsReplied++;
      });
    });

    const emailOpenRate = emailSent > 0 ? (emailOpened / emailSent) * 100 : 0;
    const emailClickRate = emailSent > 0 ? (emailClicked / emailSent) * 100 : 0;
    const smsReplyRate = smsDelivered > 0 ? (smsReplied / smsDelivered) * 100 : 0;

    // Drip campaign stats
    const activeDrips = dripCampaigns.filter((c: any) => c.status === 'ACTIVE').length;
    const avgDripOpen = dripCampaigns.length > 0
      ? dripCampaigns.reduce((s: number, c: any) => s + (c.avgOpenRate || 0), 0) / dripCampaigns.length : 0;

    // Voice call analytics
    const completedCalls = callLogs.filter((c: any) => c.status === 'COMPLETED');
    const totalCalls = callLogs.length;
    const answerRate = totalCalls > 0 ? (completedCalls.length / totalCalls) * 100 : 0;
    const avgDuration = completedCalls.length > 0
      ? completedCalls.reduce((s: number, c: any) => s + (c.duration || 0), 0) / completedCalls.length : 0;
    const outboundCompleted = outboundCalls.filter((c: any) => c.status === 'COMPLETED').length;

    // Workflow completion
    const activeWorkflows = workflows.filter((w: any) => w.status === 'ACTIVE').length;
    const completedEnrollments = enrollments.filter((e: any) => e.status === 'COMPLETED').length;
    const workflowCompletionRate = enrollments.length > 0
      ? (completedEnrollments / enrollments.length) * 100 : 0;

    // Funnel conversion by stage
    const stageCounts: Record<string, { count: number; value: number; probability: number }> = {};
    dealsWithStages.forEach((d: any) => {
      const name = d.stage?.name || 'Unknown';
      if (!stageCounts[name]) stageCounts[name] = { count: 0, value: 0, probability: d.stage?.probability || 0 };
      stageCounts[name].count++;
      stageCounts[name].value += d.value || 0;
    });
    const funnelStages = Object.entries(stageCounts)
      .sort((a, b) => b[1].probability - a[1].probability)
      .map(([name, data]) => ({ stage: name, deals: data.count, value: data.value, probability: data.probability }));

    // Lead scoring distribution
    const scores = leadsWithScores.map((l: any) => l.leadScore).filter((s: any) => s != null) as number[];
    const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    const hot = scores.filter((s) => s >= 80).length;
    const warm = scores.filter((s) => s >= 50 && s < 80).length;
    const cold = scores.filter((s) => s < 50).length;

    return {
      campaignPerformance: {
        emailSent, emailOpened, emailClicked, emailOpenRate, emailClickRate,
        smsSent, smsDelivered, smsReplied, smsReplyRate,
        activeDripCampaigns: activeDrips, avgDripOpenRate: avgDripOpen,
        totalEmailCampaigns: emailCampaigns.length,
        totalSmsCampaigns: smsCampaigns.length,
      },
      voiceCallAnalytics: {
        totalCalls, completedCalls: completedCalls.length, answerRate, avgDuration,
        outboundScheduled: outboundCalls.length, outboundCompleted,
      },
      workflowMetrics: {
        activeWorkflows, totalEnrollments: enrollments.length,
        completedEnrollments, workflowCompletionRate,
      },
      funnelStages,
      leadScoring: {
        avgScore: Math.round(avgScore), totalScored: scores.length,
        hot, warm, cold,
      },
    };
  } catch (error) {
    console.error('[getStatistics] Error fetching comprehensive stats:', error);
    return {};
  }
}

export async function createReport(userId: string, params: any) {
  const { title, reportType = 'overview', period = 'all_time' } = params;

  // Default title when voice agent or LLM omits it
  const reportTitle = (typeof title === 'string' && title.trim()) 
    ? title.trim() 
    : `Report ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // Fetch voice agent usage stats for business owner
  const voiceAgents = await db.voiceAgent.findMany({
    where: { userId: ctx.userId },
    select: {
      id: true,
      name: true,
      status: true,
      _count: {
        select: { callLogs: true, campaigns: true },
      },
    },
  });
  const aiEmployeeCounts = await db.userAIEmployee.groupBy({
    by: ['voiceAgentId'],
    where: { userId: ctx.userId, voiceAgentId: { not: null } },
    _count: { voiceAgentId: true },
  });
  const aiCountByAgent = Object.fromEntries(
    aiEmployeeCounts.map((r) => [r.voiceAgentId!, r._count.voiceAgentId])
  );
  const agentStats = voiceAgents.map((a) => ({
    name: a.name,
    totalCalls: a._count.callLogs,
    campaigns: a._count.campaigns,
    aiEmployees: aiCountByAgent[a.id] || 0,
    totalUsage: a._count.callLogs + a._count.campaigns * 10 + (aiCountByAgent[a.id] || 0) * 5, // Weighted score for "most used"
  })).sort((a, b) => b.totalUsage - a.totalUsage);

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

  if (agentStats.length > 0) {
    content.agentStats = agentStats;
  }

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

  const report = await db.aiGeneratedReport.create({
    data: {
      userId: ctx.userId,
      title: reportTitle,
      reportType: reportType || 'overview',
      content,
      period: period || null,
    },
  });

  return {
    message: `Report "${reportTitle}" created successfully! I'll take you to the Reports page to view it.`,
    navigateTo: `/dashboard/reports?id=${report.id}`,
    report: {
      id: report.id,
      title: report.title,
      reportType: report.reportType,
      createdAt: report.createdAt,
    },
  };
}

export async function getRecentActivity(userId: string, params: any) {
  const { limit = 5 } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  const [recentLeads, recentDeals, recentCampaigns] = await Promise.all([
    db.lead.findMany({
      where: { userId: ctx.userId },
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
    db.deal.findMany({
      where: { userId: ctx.userId },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        stage: true,
      },
    }),
    db.campaign.findMany({
      where: { userId: ctx.userId },
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

export async function getCustomReport(userId: string, params: any) {
  const { query, period } = params;
  const { parseChartIntent, getDynamicChartData } = await import("@/lib/crm-chart-intent");
  const text = query || "leads by status";
  const intent = parseChartIntent(text);
  if (!intent) {
    return { message: "Could not parse report query. Try: 'leads by source', 'revenue by month', 'deals by stage'.", data: [] };
  }
  const data = await getDynamicChartData(userId, intent.dimension);
  return {
    message: `Custom report: ${intent.dimension}. Chart type: ${intent.chartType}.`,
    dimension: intent.dimension,
    chartType: intent.chartType,
    data,
  };
}

export async function createScheduledReport(userId: string, params: any) {
  const { reportType = "pipeline", frequency = "weekly", email } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const userEmail = email || (await db.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email;
  if (!userEmail) throw new Error("Email required for scheduled reports");
  // Store in user onboardingProgress or create DataExport - use existing mechanism
  const user = await db.user.findUnique({ where: { id: userId }, select: { onboardingProgress: true } });
  const progress = (user?.onboardingProgress as any) || {};
  const scheduledReports = progress.scheduledReports || [];
  scheduledReports.push({ reportType, frequency, email: userEmail, createdAt: new Date().toISOString() });
  await db.user.update({
    where: { id: userId },
    data: { onboardingProgress: { ...progress, scheduledReports } },
  });
  return {
    message: `Scheduled ${reportType} report (${frequency}) to ${userEmail}. Configure cron at /api/cron/scheduled-reports to send.`,
    navigateTo: "/dashboard/reports",
  };
}

export async function getFollowUpPriority(userId: string, params: any) {
  const { limit = 10, sortBy = "lastContact" } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  const leads = await db.lead.findMany({
    where: { userId: ctx.userId },
    include: {
      deals: { include: { stage: true }, take: 1, orderBy: { updatedAt: "desc" } },
      tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 1, orderBy: { dueDate: "asc" } },
      notes: { take: 1, orderBy: { createdAt: "desc" } },
    },
    take: Math.min(limit * 2, 100),
  });

  const scored = leads.map((l) => {
    const lastNote = l.notes[0];
    const lastContact = lastNote?.createdAt;
    const openDeal = l.deals[0];
    const urgentTask = l.tasks.find((t) => t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000));
    let score = 0;
    if (urgentTask) score += 100;
    if (openDeal?.stage?.name?.toLowerCase()?.includes("proposal")) score += 50;
    if (!lastContact || (lastContact && (Date.now() - lastContact.getTime()) > 7 * 24 * 60 * 60 * 1000)) score += 30;
    return { lead: l, score, lastContact, openDeal, urgentTask };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  return {
    message: `Here are your top ${top.length} follow-up priorities.`,
    contacts: top.map((t) => ({
      name: t.lead.contactPerson || t.lead.businessName,
      leadId: t.lead.id,
      lastContact: t.lastContact,
      deal: t.openDeal?.title,
      stage: t.openDeal?.stage?.name,
      urgentTask: t.urgentTask?.title,
    })),
    navigateTo: "/dashboard/contacts",
  };
}

export async function getFollowUpSuggestions(userId: string, params: any) {
  const { period = "last_2_weeks", limit = 10 } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  const daysAgo = period === "last_week" ? 7 : period === "last_2_weeks" ? 14 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);

  const leadsWithNotes = await db.lead.findMany({
    where: { userId: ctx.userId },
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

export async function getMeetingPrep(userId: string, params: any) {
  const { contactName } = params;

  if (!contactName) {
    throw new Error("Contact name is required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const lead = await db.lead.findFirst({
    where: {
      userId: ctx.userId,
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

export async function getDailyBriefing(userId: string) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [overdueTasks, todayTasks, appointments, hotDeals, newLeads, overdueInvoices] = await Promise.all([
    db.task.findMany({
      where: {
        userId: ctx.userId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: todayStart },
      },
      take: 10,
      orderBy: { dueDate: "asc" },
      select: { id: true, title: true, dueDate: true },
    }),
    db.task.findMany({
      where: {
        userId: ctx.userId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { gte: todayStart, lt: todayEnd },
      },
      take: 10,
      select: { id: true, title: true, dueDate: true },
    }),
    db.bookingAppointment.findMany({
      where: {
        userId: ctx.userId,
        appointmentDate: { gte: todayStart, lt: todayEnd },
        status: "SCHEDULED",
      },
      take: 10,
      select: { id: true, customerName: true, appointmentDate: true },
    }),
    db.deal.findMany({
      where: { userId: ctx.userId },
      take: 5,
      orderBy: { value: "desc" },
      include: { stage: true, lead: true },
    }),
    db.lead.findMany({
      where: {
        userId: ctx.userId,
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: 5,
      select: { id: true, businessName: true, contactPerson: true, createdAt: true },
    }),
    db.invoice.findMany({
      where: {
        userId: ctx.userId,
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

export async function getAutoActionSuggestions(userId: string, params: any) {
  const limit = params?.limit || 10;
  const { aiBrainService } = await import('@/lib/ai-brain-service');
  const insights = await aiBrainService.generateGeneralInsights(userId);
  const realtime = aiBrainService.detectRealtimePatterns(userId);
  const combined = [...realtime, ...insights].filter((i) => i.actionable && i.suggestedActions?.length);
  const actions = combined.slice(0, limit).map((i) => ({
    priority: i.priority,
    title: i.title,
    description: i.description,
    suggestedAction: i.suggestedActions?.[0],
    allActions: i.suggestedActions,
  }));
  return { success: true, statistics: { totalSuggestions: actions.length, suggestions: actions }, message: `${actions.length} action suggestions: ${actions.map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.title} → ${a.suggestedAction}`).join('; ')}` };
}

export async function listEmailTemplates(userId: string, params: any) {
  const { category } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const templates = await db.emailTemplate.findMany({
    where: { userId: ctx.userId, ...(category && { category }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, subject: true, category: true, isDefault: true },
  });
  return {
    message: `Found ${templates.length} email template(s).`,
    templates: templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, category: t.category, isDefault: t.isDefault })),
  };
}

export async function listSMSTemplates(userId: string, params: any) {
  const { category } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const templates = await db.sMSTemplate.findMany({
    where: { userId: ctx.userId, ...(category && { category }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, message: true, category: true, isDefault: true },
  });
  return {
    message: `Found ${templates.length} SMS template(s).`,
    templates: templates.map((t) => ({ id: t.id, name: t.name, message: t.message, category: t.category, isDefault: t.isDefault })),
  };
}

export async function getPaymentAnalytics(userId: string, params: any) {
  const period = params?.period || 'last_30_days';
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const daysMap: Record<string, number> = { today: 1, last_7_days: 7, last_30_days: 30, last_90_days: 90, all_time: 3650 };
  const since = new Date(Date.now() - (daysMap[period] || 30) * 86400000);

  const [payments, invoices, cashTxns, fraudAlerts] = await Promise.all([
    db.payment.findMany({ where: { userId: ctx.userId, createdAt: { gte: since } }, select: { amount: true, status: true, paymentMethod: true, createdAt: true } }),
    db.invoice.findMany({ where: { userId: ctx.userId, createdAt: { gte: since } }, select: { totalAmount: true, status: true } }),
    db.cashTransaction.findMany({ where: { userId: ctx.userId, createdAt: { gte: since } }, select: { amount: true, type: true } }).catch(() => []),
    db.fraudAlert.count({ where: { userId: ctx.userId, status: 'OPEN' } }).catch(() => 0),
  ]);

  const succeeded = payments.filter((p: any) => p.status === 'SUCCEEDED');
  const totalRevenue = succeeded.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const methodBreakdown: Record<string, number> = {};
  succeeded.forEach((p: any) => { const m = p.paymentMethod || 'unknown'; methodBreakdown[m] = (methodBreakdown[m] || 0) + (p.amount || 0); });
  const unpaidInvoices = invoices.filter((i: any) => i.status !== 'PAID');
  const outstandingAmount = unpaidInvoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);

  return {
    success: true, triggerVisualization: true,
    statistics: { totalRevenue, transactionCount: payments.length, successRate: payments.length > 0 ? Math.round((succeeded.length / payments.length) * 100) : 0, methodBreakdown, outstandingInvoices: unpaidInvoices.length, outstandingAmount, cashTransactions: cashTxns.length, openFraudAlerts: fraudAlerts },
    message: `Revenue: $${(totalRevenue / 100).toLocaleString()} from ${succeeded.length} payments. ${unpaidInvoices.length} unpaid invoices ($${(outstandingAmount / 100).toLocaleString()} outstanding). ${fraudAlerts} open fraud alerts.`,
    dynamicCharts: [{ chartType: 'bar', dimension: 'payment_methods', title: 'Revenue by Payment Method', data: Object.entries(methodBreakdown).map(([name, value]) => ({ name, value: Math.round((value as number) / 100) })) }],
  };
}

export async function getRevenueBreakdown(userId: string, params: any) {
  const period = params?.period || 'last_30_days';
  const daysMap: Record<string, number> = { last_7_days: 7, last_30_days: 30, last_90_days: 90, this_year: 365 };
  const since = new Date(Date.now() - (daysMap[period] || 30) * 86400000);
  const groupBy = params?.groupBy || 'month';

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const payments = await db.payment.findMany({ where: { userId: ctx.userId, status: 'SUCCEEDED', createdAt: { gte: since } }, select: { amount: true, createdAt: true, paymentMethod: true } });

  if (groupBy === 'month' || groupBy === 'week') {
    const buckets: Record<string, number> = {};
    payments.forEach((p: any) => {
      const d = new Date(p.createdAt);
      const key = groupBy === 'month' ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : `W${Math.ceil(((d.getTime() - since.getTime()) / 86400000) / 7)}`;
      buckets[key] = (buckets[key] || 0) + (p.amount || 0);
    });
    return { success: true, triggerVisualization: true, statistics: { breakdown: buckets }, message: `Revenue breakdown by ${groupBy}: ${Object.entries(buckets).map(([k, v]) => `${k}: $${Math.round((v as number) / 100).toLocaleString()}`).join(', ')}`, dynamicCharts: [{ chartType: 'line', dimension: `revenue_by_${groupBy}`, title: `Revenue by ${groupBy}`, data: Object.entries(buckets).map(([name, value]) => ({ name, value: Math.round((value as number) / 100) })) }] };
  }

  const methodBuckets: Record<string, number> = {};
  payments.forEach((p: any) => { const m = p.paymentMethod || 'Other'; methodBuckets[m] = (methodBuckets[m] || 0) + (p.amount || 0); });
  return { success: true, triggerVisualization: true, statistics: { breakdown: methodBuckets }, message: `Revenue by method: ${Object.entries(methodBuckets).map(([k, v]) => `${k}: $${Math.round((v as number) / 100).toLocaleString()}`).join(', ')}`, dynamicCharts: [{ chartType: 'pie', dimension: 'revenue_by_method', title: 'Revenue by Payment Method', data: Object.entries(methodBuckets).map(([name, value]) => ({ name, value: Math.round((value as number) / 100) })) }] };
}

export async function listFraudAlerts(userId: string, params: any) {
  const statusFilter = params?.status === 'all' ? undefined : (params?.status || 'OPEN');
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const where: any = { userId: ctx.userId };
  if (statusFilter) where.status = statusFilter;
  const alerts = await db.fraudAlert.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => []);
  return { success: true, statistics: { totalAlerts: alerts.length, alerts: alerts.map((a: any) => ({ id: a.id, type: a.type, severity: a.severity, status: a.status, amount: a.amount, date: a.createdAt })) }, message: `${alerts.length} fraud alert(s) found${statusFilter ? ` with status ${statusFilter}` : ''}.` };
}

export async function checkCashFlow(userId: string, params: any) {
  const days = params?.period === 'last_7_days' ? 7 : params?.period === 'last_90_days' ? 90 : 30;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const since = new Date(Date.now() - days * 86400000);
  const [incoming, outgoing] = await Promise.all([
    db.payment.findMany({ where: { userId: ctx.userId, status: 'SUCCEEDED', createdAt: { gte: since } }, select: { amount: true } }),
    db.invoice.findMany({ where: { userId: ctx.userId, status: 'PAID', createdAt: { gte: since } }, select: { totalAmount: true } }),
  ]);
  const totalIn = incoming.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const totalOut = outgoing.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
  const net = totalIn - totalOut;
  return { success: true, triggerVisualization: true, statistics: { incoming: totalIn, outgoing: totalOut, net, period: `last_${days}_days` }, message: `Cash flow (last ${days} days): $${(totalIn / 100).toLocaleString()} in, $${(totalOut / 100).toLocaleString()} out. Net: $${(net / 100).toLocaleString()}. ${net > 0 ? 'Positive cash flow.' : 'Negative cash flow — review expenses.'}`, dynamicCharts: [{ chartType: 'bar', dimension: 'cash_flow', title: 'Cash Flow', data: [{ name: 'Incoming', value: Math.round(totalIn / 100) }, { name: 'Outgoing', value: Math.round(totalOut / 100) }, { name: 'Net', value: Math.round(net / 100) }] }] };
}

export async function checkStockLevels(userId: string, params: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const items = await db.inventoryItem.findMany({ where: { userId: ctx.userId }, select: { id: true, name: true, quantity: true, minQuantity: true, price: true, status: true } }).catch(() => []);
  let filtered = items;
  if (params?.filter === 'low_stock') filtered = items.filter((i: any) => i.quantity <= (i.minQuantity || 5) && i.quantity > 0);
  else if (params?.filter === 'out_of_stock') filtered = items.filter((i: any) => i.quantity === 0);
  else if (params?.filter === 'overstocked') filtered = items.filter((i: any) => i.quantity > (i.minQuantity || 5) * 3);
  const limit = params?.limit || 20;
  return { success: true, statistics: { total: items.length, lowStock: items.filter((i: any) => i.quantity <= (i.minQuantity || 5)).length, outOfStock: items.filter((i: any) => i.quantity === 0).length, items: filtered.slice(0, limit).map((i: any) => ({ name: i.name, quantity: i.quantity, minQuantity: i.minQuantity, status: i.status })) }, message: `${items.length} inventory items. ${items.filter((i: any) => i.quantity <= (i.minQuantity || 5)).length} low stock, ${items.filter((i: any) => i.quantity === 0).length} out of stock.` };
}

export async function getBestSellers(userId: string, params: any) {
  const days = params?.period === 'last_7_days' ? 7 : params?.period === 'last_90_days' ? 90 : params?.period === 'all_time' ? 3650 : 30;
  const since = new Date(Date.now() - days * 86400000);
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const orders = await db.orderItem.findMany({ where: { order: { userId: ctx.userId, createdAt: { gte: since } } }, include: { product: { select: { name: true, price: true } } } }).catch(() => []);
  const productMap: Record<string, { name: string; revenue: number; qty: number }> = {};
  orders.forEach((oi: any) => { const n = oi.product?.name || 'Unknown'; if (!productMap[n]) productMap[n] = { name: n, revenue: 0, qty: 0 }; productMap[n].revenue += (oi.price || 0) * (oi.quantity || 1); productMap[n].qty += oi.quantity || 1; });
  const sorted = Object.values(productMap).sort((a, b) => params?.sortBy === 'quantity' ? b.qty - a.qty : b.revenue - a.revenue);
  const top = sorted.slice(0, params?.limit || 10);
  return { success: true, triggerVisualization: true, statistics: { bestSellers: top }, message: `Top ${top.length} best sellers: ${top.map((p, i) => `${i + 1}. ${p.name} ($${p.revenue.toLocaleString()}, ${p.qty} sold)`).join('; ')}`, dynamicCharts: [{ chartType: 'bar', dimension: 'best_sellers', title: 'Best Selling Products', data: top.map((p) => ({ name: p.name, value: params?.sortBy === 'quantity' ? p.qty : Math.round(p.revenue) })) }] };
}

export async function trackOrder(userId: string, params: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  let order: any = null;
  if (params?.orderId) order = await db.order.findFirst({ where: { userId: ctx.userId, id: params.orderId }, include: { items: { include: { product: { select: { name: true } } } } } }).catch(() => null);
  if (!order && params?.customerName) order = await db.order.findFirst({ where: { userId: ctx.userId, customerName: { contains: params.customerName, mode: 'insensitive' } }, include: { items: { include: { product: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } }).catch(() => null);
  if (!order) return { success: false, message: 'Order not found.' };
  return { success: true, statistics: { order: { id: order.id, status: order.status, total: order.total, items: order.items?.map((i: any) => ({ product: i.product?.name, qty: i.quantity, price: i.price })), createdAt: order.createdAt } }, message: `Order ${order.id}: Status ${order.status}, Total $${(order.total || 0).toLocaleString()}, ${order.items?.length || 0} items. Created ${new Date(order.createdAt).toLocaleDateString()}.` };
}

export async function getLowStockAlerts(userId: string) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const [items, alerts] = await Promise.all([
    db.inventoryItem.findMany({ where: { userId: ctx.userId }, select: { name: true, quantity: true, minQuantity: true } }).catch(() => []),
    db.inventoryAlert.findMany({ where: { userId: ctx.userId, status: 'ACTIVE' }, select: { type: true, createdAt: true }, take: 20 }).catch(() => []),
  ]);
  const lowStock = items.filter((i: any) => i.quantity <= (i.minQuantity || 5));
  return { success: true, statistics: { lowStockItems: lowStock.map((i: any) => ({ name: i.name, quantity: i.quantity, minQuantity: i.minQuantity })), activeAlerts: alerts.length }, message: `${lowStock.length} items need restocking: ${lowStock.slice(0, 5).map((i: any) => `${i.name} (${i.quantity}/${i.minQuantity})`).join(', ')}${lowStock.length > 5 ? ` and ${lowStock.length - 5} more` : ''}.` };
}

export async function getWebsiteAnalytics(userId: string, params: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const where: any = { userId: ctx.userId };
  if (params?.websiteId) where.id = params.websiteId;
  const websites = await db.website.findMany({ where, select: { id: true, name: true, status: true, type: true, buildProgress: true, createdAt: true } });
  const live = websites.filter((w: any) => w.status === 'LIVE' || w.status === 'DEPLOYED');
  return { success: true, statistics: { totalWebsites: websites.length, liveWebsites: live.length, websites: websites.map((w: any) => ({ name: w.name, status: w.status, type: w.type })) }, message: `${websites.length} website(s): ${live.length} live, ${websites.length - live.length} in progress. ${live.map((w: any) => w.name).join(', ') || 'None live yet.'}` };
}

export async function getVoiceAIAnalytics(userId: string, params: any) {
  const days = params?.period === 'last_7_days' ? 7 : params?.period === 'last_90_days' ? 90 : 30;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const since = new Date(Date.now() - days * 86400000);
  const [agents, usage, calls] = await Promise.all([
    db.voiceAgent.findMany({ where: { userId: ctx.userId }, select: { name: true, status: true, totalCalls: true } }),
    db.voiceUsage.findMany({ where: { userId: ctx.userId, createdAt: { gte: since } }, select: { minutes: true, cost: true } }).catch(() => []),
    db.callLog.findMany({ where: { userId: ctx.userId, createdAt: { gte: since } }, select: { status: true, duration: true } }),
  ]);
  const totalMin = usage.reduce((s: number, u: any) => s + (u.minutes || 0), 0);
  const totalCost = usage.reduce((s: number, u: any) => s + (u.cost || 0), 0);
  const completed = calls.filter((c: any) => c.status === 'COMPLETED');
  const answerRate = calls.length > 0 ? Math.round((completed.length / calls.length) * 100) : 0;
  const avgDuration = completed.length > 0 ? Math.round(completed.reduce((s: number, c: any) => s + (c.duration || 0), 0) / completed.length) : 0;
  return { success: true, triggerVisualization: true, statistics: { agents: agents.length, activeAgents: agents.filter((a: any) => a.status === 'ACTIVE' || a.status === 'active').length, totalCalls: calls.length, answerRate, avgDuration, totalMinutes: Math.round(totalMin), totalCost: Math.round(totalCost * 100) / 100, costPerMinute: totalMin > 0 ? Math.round((totalCost / totalMin) * 100) / 100 : 0 }, message: `${agents.length} voice agent(s), ${calls.length} calls (${answerRate}% answer rate, avg ${avgDuration}s). Usage: ${Math.round(totalMin)} min, $${totalCost.toFixed(2)} cost.`, dynamicCharts: [{ chartType: 'bar', dimension: 'voice_metrics', title: 'Voice AI Metrics', data: [{ name: 'Total Calls', value: calls.length }, { name: 'Completed', value: completed.length }, { name: 'Answer Rate %', value: answerRate }] }] };
}

export async function getConversationAnalytics(userId: string, params: any) {
  const days = params?.period === 'last_7_days' ? 7 : params?.period === 'last_90_days' ? 90 : 30;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const since = new Date(Date.now() - days * 86400000);
  const [conversations, messages] = await Promise.all([
    db.conversation.findMany({ where: { userId: ctx.userId }, select: { id: true, channel: true, status: true, lastMessageAt: true } }),
    db.conversationMessage.findMany({ where: { conversation: { userId: ctx.userId }, sentAt: { gte: since } }, select: { direction: true, channel: true, sentAt: true } }),
  ]);
  const channelCounts: Record<string, number> = {};
  messages.forEach((m: any) => { const c = m.channel || 'unknown'; channelCounts[c] = (channelCounts[c] || 0) + 1; });
  const inbound = messages.filter((m: any) => m.direction === 'INBOUND').length;
  const outbound = messages.filter((m: any) => m.direction === 'OUTBOUND').length;
  return { success: true, triggerVisualization: true, statistics: { activeConversations: conversations.filter((c: any) => c.status === 'OPEN').length, totalMessages: messages.length, inbound, outbound, byChannel: channelCounts }, message: `${conversations.length} conversations, ${messages.length} messages in ${days}d (${inbound} inbound, ${outbound} outbound). Channels: ${Object.entries(channelCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}.`, dynamicCharts: [{ chartType: 'pie', dimension: 'messages_by_channel', title: 'Messages by Channel', data: Object.entries(channelCounts).map(([name, value]) => ({ name, value })) }] };
}

export async function getDeliveryAnalytics(userId: string) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const orders = await db.deliveryOrder?.findMany?.({ where: { userId: ctx.userId }, select: { status: true, createdAt: true } })?.catch(() => []) || [];
  const delivered = orders.filter((o: any) => o.status === 'DELIVERED').length;
  const pending = orders.filter((o: any) => o.status === 'PENDING' || o.status === 'IN_TRANSIT').length;
  return { success: true, statistics: { totalOrders: orders.length, delivered, pending, deliveryRate: orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0 }, message: `${orders.length} delivery orders: ${delivered} delivered, ${pending} pending. Completion rate: ${orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0}%.` };
}

export async function manageReservations(userId: string, params: any) {
  const action = params?.action || 'list';
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  if (action === 'stats' || action === 'peak_hours') {
    const reservations = await db.reservation.findMany({ where: { userId: ctx.userId }, select: { status: true, partySize: true, date: true } }).catch(() => []);
    const noShows = reservations.filter((r: any) => r.status === 'NO_SHOW').length;
    const hourBuckets: Record<number, number> = {};
    reservations.forEach((r: any) => { const h = new Date(r.date).getHours(); hourBuckets[h] = (hourBuckets[h] || 0) + 1; });
    const peakHour = Object.entries(hourBuckets).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return { success: true, triggerVisualization: true, statistics: { total: reservations.length, noShows, noShowRate: reservations.length > 0 ? Math.round((noShows / reservations.length) * 100) : 0, avgPartySize: reservations.length > 0 ? Math.round(reservations.reduce((s: number, r: any) => s + (r.partySize || 0), 0) / reservations.length) : 0, peakHour: peakHour ? `${peakHour[0]}:00` : 'N/A' }, message: `${reservations.length} total reservations. No-show rate: ${reservations.length > 0 ? Math.round((noShows / reservations.length) * 100) : 0}%. Peak hour: ${peakHour ? `${peakHour[0]}:00` : 'N/A'}. Avg party: ${reservations.length > 0 ? Math.round(reservations.reduce((s: number, r: any) => s + (r.partySize || 0), 0) / reservations.length) : 0}.`, dynamicCharts: [{ chartType: 'bar', dimension: 'reservations_by_hour', title: 'Reservations by Hour', data: Object.entries(hourBuckets).sort((a, b) => Number(a[0]) - Number(b[0])).map(([h, c]) => ({ name: `${h}:00`, value: c })) }] };
  }
  const where: any = { userId: ctx.userId };
  if (action === 'upcoming') where.date = { gte: new Date() };
  if (params?.date) { const d = new Date(params.date); where.date = { gte: d, lt: new Date(d.getTime() + 86400000) }; }
  const reservations = await db.reservation.findMany({ where, orderBy: { date: 'desc' }, take: 20, select: { id: true, status: true, partySize: true, date: true, guestName: true } }).catch(() => []);
  return { success: true, statistics: { reservations: reservations.map((r: any) => ({ guest: r.guestName, party: r.partySize, date: r.date, status: r.status })) }, message: `${reservations.length} reservation(s) found.${reservations.slice(0, 5).map((r: any) => ` ${r.guestName || 'Guest'} (${r.partySize}) - ${new Date(r.date).toLocaleString()}`).join(';')}` };
}

export async function manageTables(userId: string, params: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const tables = await db.restaurantTable.findMany({ where: { userId: ctx.userId }, select: { id: true, name: true, capacity: true, status: true } }).catch(() => []);
  const available = tables.filter((t: any) => t.status === 'AVAILABLE');
  const occupied = tables.filter((t: any) => t.status === 'OCCUPIED');
  return { success: true, statistics: { total: tables.length, available: available.length, occupied: occupied.length, totalCapacity: tables.reduce((s: number, t: any) => s + (t.capacity || 0), 0), tables: tables.map((t: any) => ({ name: t.name, capacity: t.capacity, status: t.status })) }, message: `${tables.length} tables: ${available.length} available, ${occupied.length} occupied. Total capacity: ${tables.reduce((s: number, t: any) => s + (t.capacity || 0), 0)} seats.` };
}

export async function getTeamPerformance(userId: string, params: any) {
  const days = params?.period === 'last_7_days' ? 7 : params?.period === 'last_90_days' ? 90 : 30;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const since = new Date(Date.now() - days * 86400000);
  const [members, tasks, deals] = await Promise.all([
    db.teamMember.findMany({ where: { userId: ctx.userId }, select: { id: true, role: true, status: true, user: { select: { name: true, email: true } } } }).catch(() => []),
    db.task.findMany({ where: { userId: ctx.userId, completedAt: { gte: since } }, select: { assignedToId: true } }),
    db.deal.findMany({ where: { userId: ctx.userId, actualCloseDate: { gte: since } }, select: { assignedToId: true, value: true } }),
  ]);
  const perf = members.map((m: any) => ({ name: m.user?.name || m.user?.email || 'Unknown', role: m.role, tasksCompleted: tasks.filter((t: any) => t.assignedToId === m.id).length, dealsClosed: deals.filter((d: any) => d.assignedToId === m.id).length, revenue: deals.filter((d: any) => d.assignedToId === m.id).reduce((s: number, d: any) => s + (d.value || 0), 0) }));
  return { success: true, triggerVisualization: true, statistics: { teamSize: members.length, performance: perf }, message: `Team of ${members.length} (last ${days}d): ${perf.map((p) => `${p.name}: ${p.tasksCompleted} tasks, ${p.dealsClosed} deals, $${p.revenue.toLocaleString()}`).join('; ')}`, dynamicCharts: [{ chartType: 'bar', dimension: 'team_tasks', title: 'Tasks Completed by Team', data: perf.map((p) => ({ name: p.name, value: p.tasksCompleted })) }] };
}

export async function getAuditLog(userId: string, params: any) {
  const limit = params?.limit || 20;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const logs = await db.auditLog.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: 'desc' }, take: limit, select: { action: true, details: true, createdAt: true } }).catch(() => []);
  return { success: true, statistics: { entries: logs.map((l: any) => ({ action: l.action, details: l.details, time: l.createdAt })) }, message: `${logs.length} recent activities: ${logs.slice(0, 5).map((l: any) => `${l.action} (${new Date(l.createdAt).toLocaleString()})`).join('; ')}` };
}

export async function checkIntegrations(userId: string) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const [channels, calendars, paymentProviders] = await Promise.all([
    db.channelConnection.findMany({ where: { userId: ctx.userId }, select: { channel: true, status: true, lastSyncAt: true } }),
    db.calendarConnection.findMany({ where: { userId: ctx.userId }, select: { provider: true, status: true, lastSyncAt: true } }),
    db.paymentProviderSettings.findMany({ where: { userId: ctx.userId }, select: { provider: true, isActive: true } }).catch(() => []),
  ]);
  const all = [...channels.map((c: any) => ({ name: c.channel, type: 'channel', status: c.status, lastSync: c.lastSyncAt })), ...calendars.map((c: any) => ({ name: c.provider, type: 'calendar', status: c.status, lastSync: c.lastSyncAt })), ...paymentProviders.map((p: any) => ({ name: p.provider, type: 'payment', status: p.isActive ? 'ACTIVE' : 'INACTIVE' }))];
  const active = all.filter((i) => i.status === 'ACTIVE' || i.status === 'CONNECTED');
  return { success: true, statistics: { total: all.length, active: active.length, integrations: all }, message: `${all.length} integrations: ${active.length} active, ${all.length - active.length} inactive. ${all.map((i) => `${i.name} (${i.status})`).join(', ')}` };
}

export async function manageReviews(userId: string, params: any) {
  const action = params?.action || 'stats';
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const reviews = await db.review.findMany({ where: { campaign: { userId: ctx.userId } }, orderBy: { createdAt: 'desc' }, take: params?.limit || 50, select: { rating: true, comment: true, customerName: true, platform: true, createdAt: true } }).catch(() => []);
  const avg = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0';
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) dist[Math.round(r.rating)]++; });
  if (action === 'recent') { return { success: true, statistics: { reviews: reviews.slice(0, 10).map((r: any) => ({ rating: r.rating, customer: r.customerName, comment: r.comment?.slice(0, 100), platform: r.platform })) }, message: `Recent reviews: ${reviews.slice(0, 5).map((r: any) => `${r.customerName || 'Customer'}: ${r.rating}★${r.comment ? ` - "${r.comment.slice(0, 50)}"` : ''}`).join('; ')}` }; }
  return { success: true, triggerVisualization: true, statistics: { avgRating: Number(avg), totalReviews: reviews.length, distribution: dist }, message: `Average rating: ${avg}★ from ${reviews.length} reviews. Distribution: ${Object.entries(dist).map(([k, v]) => `${k}★: ${v}`).join(', ')}`, dynamicCharts: [{ chartType: 'bar', dimension: 'review_distribution', title: 'Review Distribution', data: Object.entries(dist).map(([name, value]) => ({ name: `${name}★`, value })) }] };
}

export async function getReferralStats(userId: string) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const referrals = await db.referral.findMany({ where: { referrerId: userId }, select: { status: true, rewardAmount: true, createdAt: true } }).catch(() => []);
  const converted = referrals.filter((r: any) => r.status === 'CONVERTED' || r.status === 'REWARDED').length;
  const totalRewards = referrals.reduce((s: number, r: any) => s + (r.rewardAmount || 0), 0);
  return { success: true, statistics: { total: referrals.length, converted, conversionRate: referrals.length > 0 ? Math.round((converted / referrals.length) * 100) : 0, totalRewards }, message: `Referral program: ${referrals.length} total, ${converted} converted (${referrals.length > 0 ? Math.round((converted / referrals.length) * 100) : 0}%). Total rewards: $${totalRewards.toLocaleString()}.` };
}

export async function getIndustryAnalytics(userId: string, params: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const user = await db.user.findUnique({ where: { id: userId }, select: { industry: true } });
  const industry = user?.industry || 'GENERAL';

  if (industry === 'REAL_ESTATE') {
    const [props, fsbo, cma, presentations] = await Promise.all([
      db.rEProperty.count({ where: { userId: ctx.userId } }).catch(() => 0),
      db.rEFSBOListing.count({ where: { userId: ctx.userId } }).catch(() => 0),
      db.rECMAReport.count({ where: { userId: ctx.userId } }).catch(() => 0),
      db.rEListingPresentation.count({ where: { userId: ctx.userId } }).catch(() => 0),
    ]);
    return { success: true, statistics: { industry, properties: props, fsboLeads: fsbo, cmaReports: cma, presentations }, message: `Real Estate: ${props} properties, ${fsbo} FSBO leads, ${cma} CMA reports, ${presentations} listing presentations.` };
  }

  if (industry === 'RESTAURANT' || industry === 'FOOD_SERVICE') {
    const [reservations, tables] = await Promise.all([
      db.reservation.count({ where: { userId: ctx.userId } }).catch(() => 0),
      db.restaurantTable.count({ where: { userId: ctx.userId } }).catch(() => 0),
    ]);
    return { success: true, statistics: { industry, reservations, tables }, message: `Restaurant: ${reservations} reservations, ${tables} tables.` };
  }

  if (industry === 'SPORTS_CLUB' || industry === 'YOUTH_SPORTS') {
    const [regs, programs, teams] = await Promise.all([
      db.clubOSRegistration.count({ where: { program: { userId: ctx.userId } } }).catch(() => 0),
      db.clubOSProgram.count({ where: { userId: ctx.userId } }).catch(() => 0),
      db.clubOSTeam.count({ where: { division: { userId: ctx.userId } } }).catch(() => 0),
    ]);
    return { success: true, statistics: { industry, registrations: regs, programs, teams }, message: `ClubOS: ${regs} registrations, ${programs} programs, ${teams} teams.` };
  }

  return { success: true, statistics: { industry }, message: `Industry: ${industry}. Use get_statistics for general CRM analytics.` };
}

export async function getBusinessScore(userId: string) {
  const { aiBrainService } = await import('@/lib/ai-brain-service');
  const [insights, predictions] = await Promise.all([
    aiBrainService.generateGeneralInsights(userId),
    aiBrainService.generatePredictiveAnalytics(userId),
  ]);

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const [leads, deals, tasks, payments, reviews] = await Promise.all([
    db.lead.count({ where: { userId: ctx.userId } }),
    db.deal.findMany({ where: { userId: ctx.userId }, select: { value: true, actualCloseDate: true, stageId: true } }),
    db.task.findMany({ where: { userId: ctx.userId }, select: { status: true } }),
    db.payment.findMany({ where: { userId: ctx.userId, status: 'SUCCEEDED' }, select: { amount: true } }),
    db.review.findMany({ where: { campaign: { userId: ctx.userId } }, select: { rating: true } }).catch(() => []),
  ]);

  const revenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const closedDeals = deals.filter((d) => d.actualCloseDate).length;
  const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r: any) => s + (r.rating || 0), 0) / reviews.length : 0;

  const scores = {
    leadHealth: Math.min(leads > 0 ? Math.round((leads / 50) * 100) : 0, 100),
    pipelineVelocity: Math.min(deals.length > 0 ? Math.round((closedDeals / deals.length) * 100) : 0, 100),
    revenueTrend: predictions.growthTrend === 'accelerating' ? 90 : predictions.growthTrend === 'steady' ? 70 : predictions.growthTrend === 'declining' ? 30 : 50,
    teamProductivity: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 50,
    customerSatisfaction: Math.round((avgRating / 5) * 100),
    operationalEfficiency: Math.min(Math.round(((completedTasks + closedDeals) / Math.max(tasks.length + deals.length, 1)) * 100), 100),
  };
  const overall = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length);
  const highInsights = insights.filter((i) => i.priority === 'high');

  return {
    success: true, triggerVisualization: true,
    statistics: { overallScore: overall, breakdown: scores, growthTrend: predictions.growthTrend, criticalInsights: highInsights.length, topActions: highInsights.slice(0, 3).map((i) => i.suggestedActions?.[0]).filter(Boolean) },
    message: `Business Score: ${overall}/100. Lead Health: ${scores.leadHealth}, Pipeline: ${scores.pipelineVelocity}, Revenue: ${scores.revenueTrend}, Productivity: ${scores.teamProductivity}, Satisfaction: ${scores.customerSatisfaction}, Efficiency: ${scores.operationalEfficiency}. Growth trend: ${predictions.growthTrend}. ${highInsights.length} critical insights.`,
    dynamicCharts: [{ chartType: 'bar', dimension: 'business_score', title: 'Business Health Score', data: Object.entries(scores).map(([name, value]) => ({ name: name.replace(/([A-Z])/g, ' $1').trim(), value })) }],
  };
}

export async function getCostOptimization(userId: string) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const [voiceUsage, smsCampaigns, payments, subscription] = await Promise.all([
    db.voiceUsage.findMany({ where: { userId: ctx.userId }, select: { minutes: true, cost: true, agentType: true }, orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []),
    db.smsCampaign.findMany({ where: { userId: ctx.userId }, select: { totalSent: true, totalReplied: true } }).catch(() => []),
    db.payment.findMany({ where: { userId: ctx.userId, status: 'SUCCEEDED' }, select: { amount: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.userSubscription.findFirst({ where: { userId: ctx.userId }, select: { plan: true, amount: true } }).catch(() => null),
  ]);

  const suggestions: string[] = [];
  const voiceCost = voiceUsage.reduce((s: number, u: any) => s + (u.cost || 0), 0);
  const voiceMin = voiceUsage.reduce((s: number, u: any) => s + (u.minutes || 0), 0);
  if (voiceCost > 100) suggestions.push(`Voice AI: $${voiceCost.toFixed(0)} spent on ${Math.round(voiceMin)} min. Consider optimizing agent prompts to reduce call duration.`);

  const totalSms = smsCampaigns.reduce((s: number, c: any) => s + (c.totalSent || 0), 0);
  const totalReplied = smsCampaigns.reduce((s: number, c: any) => s + (c.totalReplied || 0), 0);
  const smsReplyRate = totalSms > 0 ? (totalReplied / totalSms) * 100 : 0;
  if (smsReplyRate < 15 && totalSms > 50) suggestions.push(`SMS reply rate is ${smsReplyRate.toFixed(1)}% — consider shifting budget to email drip campaigns.`);

  const avgPayment = payments.length > 0 ? payments.reduce((s, p) => s + (p.amount || 0), 0) / payments.length : 0;
  if (avgPayment < 1000 && payments.length > 20) suggestions.push(`Average transaction is $${(avgPayment / 100).toFixed(0)} — consider upselling or bundling products.`);

  if (suggestions.length === 0) suggestions.push('Your spending patterns look efficient! No major cost optimization opportunities detected.');

  return { success: true, statistics: { voiceCost, smsReplyRate: Math.round(smsReplyRate), subscriptionCost: (subscription as any)?.amount || 0, suggestions }, message: `Cost Analysis: ${suggestions.join(' ')}` };
}

export async function createInvoice(userId: string, params: any) {
  const { contactName, amount, description, leadId, dealId, dueDate } = params;

  if (!contactName || amount == null) {
    throw new Error("Contact name and amount are required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  let lead;
  if (leadId) {
    lead = await db.lead.findFirst({
      where: { id: leadId, userId: ctx.userId },
    });
  } else {
    lead = await db.lead.findFirst({
      where: {
        userId: ctx.userId,
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

  const invoice = await db.invoice.create({
    data: {
      userId: ctx.userId,
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

export async function listOverdueInvoices(userId: string, params: any) {
  const { limit = 20 } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  const overdue = await db.invoice.findMany({
    where: {
      userId: ctx.userId,
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

export async function updateInvoiceStatus(userId: string, params: any) {
  const { invoiceId, invoiceNumber, status } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let invoice;
  if (invoiceId) {
    invoice = await db.invoice.findFirst({
      where: { id: invoiceId, userId: ctx.userId },
    });
  } else if (invoiceNumber) {
    invoice = await db.invoice.findFirst({
      where: { userId: ctx.userId, invoiceNumber: { contains: invoiceNumber, mode: "insensitive" } },
    });
  }

  if (!invoice) throw new Error("Invoice not found");

  const updateData: any = { status: status as any };
  if (status === "PAID") {
    updateData.paidAmount = invoice.totalAmount;
    updateData.paidAt = new Date();
  }

  const updated = await db.invoice.update({
    where: { id: invoice.id },
    data: updateData,
  });

  return {
    message: `Invoice ${updated.invoiceNumber} marked as ${status}.`,
    invoice: { id: updated.id, invoiceNumber: updated.invoiceNumber, status: updated.status },
  };
}

export async function sendInvoice(userId: string, params: any) {
  const { invoiceId, invoiceNumber } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let invoice;
  if (invoiceId) {
    invoice = await db.invoice.findFirst({
      where: { id: invoiceId, userId: ctx.userId },
    });
  } else if (invoiceNumber) {
    invoice = await db.invoice.findFirst({
      where: { userId: ctx.userId, invoiceNumber: { contains: invoiceNumber, mode: "insensitive" } },
    });
  }

  if (!invoice) throw new Error("Invoice not found");

  await db.invoice.update({
    where: { id: invoice.id },
    data: { status: "SENT" as any, sentAt: new Date() },
  });

  return {
    message: `Invoice ${invoice.invoiceNumber} marked as sent. The customer will receive it via email.`,
    invoiceId: invoice.id,
  };
}
