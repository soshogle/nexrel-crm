/**
 * Enhanced AI Brain Service
 * Connects to ALL business data sources for comprehensive insights
 * Acts as the central nervous system of the business
 */

import { prisma } from './db';

export interface BrainDataPoint {
  id: string;
  category: string;
  subcategory: string;
  label: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number; // percentage change
  status: 'healthy' | 'warning' | 'critical' | 'excellent';
  confidence?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BrainHemisphere {
  name: string;
  dataPoints: BrainDataPoint[];
  overallHealth: number; // 0-100
  criticalAlerts: number;
  opportunities: number;
}

export interface BrainCore {
  overallHealth: number;
  keyMetrics: {
    totalRevenue: number;
    activeLeads: number;
    openDeals: number;
    conversionRate: number;
    customerSatisfaction: number;
  };
  criticalAlerts: Array<{
    id: string;
    title: string;
    severity: 'high' | 'medium' | 'low';
    category: string;
  }>;
}

export interface ComprehensiveBrainData {
  core: BrainCore;
  leftHemisphere: BrainHemisphere; // Current Operations
  rightHemisphere: BrainHemisphere; // Future Predictions
  connections: Array<{
    from: string;
    to: string;
    strength: number;
    type: string;
  }>;
}

export class AIBrainEnhancedService {
  /**
   * Get comprehensive brain data from all sources
   */
  async getComprehensiveBrainData(userId: string): Promise<ComprehensiveBrainData> {
    // Fetch ALL data sources in parallel with error handling using Promise.allSettled
    const results = await Promise.allSettled([
      // Existing sources
      prisma.lead.findMany({
        where: { userId },
        include: { notes: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deal.findMany({
        where: { userId },
        include: { stage: true, lead: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.findMany({
        where: { OR: [{ userId }, { assignedToId: userId }] },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bookingAppointment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.callLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),

      // Financial data
      prisma.payment.findMany({
        where: { userId, status: 'SUCCEEDED' },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      // Invoices
      prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),

      // Marketing data
      prisma.emailCampaign.findMany({
        where: { userId },
        include: {
          recipients: {
            select: {
              status: true,
              openedAt: true,
              clickedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.smsCampaign.findMany({
        where: { userId },
        include: {
          recipients: {
            select: {
              status: true,
              repliedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Communication data
      prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 10,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.conversationMessage.findMany({
        where: {
          conversation: { userId },
        },
        orderBy: { sentAt: 'desc' },
        take: 1000,
      }),

      // Customer feedback
      prisma.review.findMany({
        where: {
          campaign: { userId },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedbackCollection.findMany({
        where: { userId },
        orderBy: { triggeredAt: 'desc' },
      }),

      // Workflow data
      prisma.workflow.findMany({
        where: { userId, status: 'ACTIVE' },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
          },
        },
      }),
      prisma.workflowEnrollment.findMany({
        where: {
          workflow: { userId },
        },
        orderBy: { enrolledAt: 'desc' },
        take: 500,
      }),
    ]);

    // Extract results, defaulting to empty arrays on failure with proper typing
    const getResult = <T>(result: PromiseSettledResult<T[]>, name: string): T[] => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Handle Prisma errors for missing columns/tables gracefully
        const error = result.reason;
        if (error?.code === 'P2022' || error?.code === 'P2021') {
          console.warn(`Database schema mismatch for ${name}:`, error.message);
          return [];
        }
        console.error(`Error fetching ${name}:`, result.reason);
        return [];
      }
    };

    const leads = getResult(results[0], 'leads');
    const deals = getResult(results[1], 'deals');
    const tasks = getResult(results[2], 'tasks');
    const appointments = getResult(results[3], 'appointments');
    const callLogs = getResult(results[4], 'callLogs');
    const payments = getResult<{ amount: number }>(results[5], 'payments');
    const invoices = getResult(results[6], 'invoices');
    const emailCampaigns = getResult(results[7], 'emailCampaigns');
    const smsCampaigns = getResult(results[8], 'smsCampaigns');
    const conversations = getResult(results[9], 'conversations');
    const conversationMessages = getResult(results[10], 'conversationMessages');
    const reviews = getResult<{ rating: number }>(results[11], 'reviews');
    const feedbackCollections = getResult(results[12], 'feedbackCollections');
    const workflows = getResult(results[13], 'workflows');
    const workflowEnrollments = getResult(results[14], 'workflowEnrollments');

    // Calculate core metrics
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const activeLeads = leads.filter((l) => ['NEW', 'CONTACTED', 'QUALIFIED'].includes(l.status)).length;
    const openDeals = deals.filter((d) => !d.actualCloseDate).length;
    const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;
    const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

    // Calculate customer satisfaction from reviews
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    const customerSatisfaction = (avgRating / 5) * 100;

    // Calculate overall health (weighted average)
    const healthFactors = {
      revenue: totalRevenue > 0 ? 100 : 50,
      leads: activeLeads > 0 ? 100 : 50,
      conversion: conversionRate > 10 ? 100 : conversionRate * 10,
      satisfaction: customerSatisfaction,
    };
    const overallHealth = Math.round(
      (healthFactors.revenue * 0.3 +
        healthFactors.leads * 0.2 +
        healthFactors.conversion * 0.3 +
        healthFactors.satisfaction * 0.2)
    );

    // Build LEFT HEMISPHERE: Current Operations
    const leftHemisphere = this.buildCurrentOperationsHemisphere(
      leads,
      deals,
      tasks,
      appointments,
      callLogs,
      payments,
      emailCampaigns,
      smsCampaigns,
      conversations,
      conversationMessages,
      reviews,
      workflows,
      workflowEnrollments
    );

    // Build RIGHT HEMISPHERE: Future Predictions
    const rightHemisphere = this.buildFuturePredictionsHemisphere(
      leads,
      deals,
      payments,
      emailCampaigns,
      smsCampaigns,
      reviews
    );

    // Build connections between data points
    const connections = this.buildDataConnections(
      leads,
      deals,
      payments,
      emailCampaigns,
      smsCampaigns,
      conversations
    );

    // Identify critical alerts
    const criticalAlerts = this.identifyCriticalAlerts(
      leads,
      deals,
      tasks,
      payments,
      emailCampaigns,
      smsCampaigns,
      reviews
    );

    return {
      core: {
        overallHealth,
        keyMetrics: {
          totalRevenue,
          activeLeads,
          openDeals,
          conversionRate,
          customerSatisfaction,
        },
        criticalAlerts,
      },
      leftHemisphere,
      rightHemisphere,
      connections,
    };
  }

  /**
   * Build LEFT HEMISPHERE: Current Operations
   */
  private buildCurrentOperationsHemisphere(
    leads: any[],
    deals: any[],
    tasks: any[],
    appointments: any[],
    callLogs: any[],
    payments: any[],
    emailCampaigns: any[],
    smsCampaigns: any[],
    conversations: any[],
    conversationMessages: any[],
    reviews: any[],
    workflows: any[],
    workflowEnrollments: any[]
  ): BrainHemisphere {
    const dataPoints: BrainDataPoint[] = [];

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Revenue metrics
    const recentRevenue = payments
      .filter((p) => new Date(p.createdAt) >= last7Days)
      .reduce((sum, p) => sum + p.amount, 0);
    const previousRevenue = payments
      .filter(
        (p) =>
          new Date(p.createdAt) >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
          new Date(p.createdAt) < last7Days
      )
      .reduce((sum, p) => sum + p.amount, 0);
    const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    dataPoints.push({
      id: 'revenue-7d',
      category: 'Financial',
      subcategory: 'Revenue',
      label: '7-Day Revenue',
      value: recentRevenue,
      unit: 'USD',
      trend: revenueChange > 5 ? 'up' : revenueChange < -5 ? 'down' : 'stable',
      change: revenueChange,
      status: recentRevenue > 0 ? 'healthy' : 'warning',
      timestamp: now,
    });

    // Lead metrics
    const recentLeads = leads.filter((l) => new Date(l.createdAt) >= last7Days).length;
    const previousLeads = leads.filter(
      (l) =>
        new Date(l.createdAt) >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
        new Date(l.createdAt) < last7Days
    ).length;
    const leadChange = previousLeads > 0 ? ((recentLeads - previousLeads) / previousLeads) * 100 : 0;

    dataPoints.push({
      id: 'leads-7d',
      category: 'Sales',
      subcategory: 'Leads',
      label: 'New Leads (7d)',
      value: recentLeads,
      unit: 'leads',
      trend: leadChange > 10 ? 'up' : leadChange < -10 ? 'down' : 'stable',
      change: leadChange,
      status: recentLeads > 0 ? 'healthy' : 'warning',
      timestamp: now,
    });

    // Email campaign performance
    const emailStats = (emailCampaigns || []).reduce(
      (acc, campaign) => {
        const recipients = campaign.recipients || [];
        return {
          sent: acc.sent + recipients.filter((r: any) => ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(r.status)).length,
          opened: acc.opened + recipients.filter((r: any) => ['OPENED', 'CLICKED'].includes(r.status)).length,
          clicked: acc.clicked + recipients.filter((r: any) => r.status === 'CLICKED').length,
        };
      },
      { sent: 0, opened: 0, clicked: 0 }
    );
    const emailOpenRate = emailStats.sent > 0 ? (emailStats.opened / emailStats.sent) * 100 : 0;
    const emailClickRate = emailStats.sent > 0 ? (emailStats.clicked / emailStats.sent) * 100 : 0;

    dataPoints.push({
      id: 'email-open-rate',
      category: 'Marketing',
      subcategory: 'Email',
      label: 'Email Open Rate',
      value: emailOpenRate,
      unit: '%',
      trend: emailOpenRate > 20 ? 'up' : emailOpenRate < 10 ? 'down' : 'stable',
      status: emailOpenRate > 20 ? 'excellent' : emailOpenRate > 10 ? 'healthy' : 'warning',
      timestamp: now,
    });

    // SMS campaign performance
    const smsStats = (smsCampaigns || []).reduce(
      (acc, campaign) => {
        const recipients = campaign.recipients || [];
        return {
          sent: acc.sent + recipients.filter((r: any) => ['SENT', 'DELIVERED', 'REPLIED'].includes(r.status)).length,
          delivered: acc.delivered + recipients.filter((r: any) => ['DELIVERED', 'REPLIED'].includes(r.status)).length,
          replied: acc.replied + recipients.filter((r: any) => r.status === 'REPLIED').length,
        };
      },
      { sent: 0, delivered: 0, replied: 0 }
    );
    const smsReplyRate = smsStats.delivered > 0 ? (smsStats.replied / smsStats.delivered) * 100 : 0;

    dataPoints.push({
      id: 'sms-reply-rate',
      category: 'Marketing',
      subcategory: 'SMS',
      label: 'SMS Reply Rate',
      value: smsReplyRate,
      unit: '%',
      trend: smsReplyRate > 15 ? 'up' : smsReplyRate < 5 ? 'down' : 'stable',
      status: smsReplyRate > 15 ? 'excellent' : smsReplyRate > 5 ? 'healthy' : 'warning',
      timestamp: now,
    });

    // Active conversations
    const activeConversations = conversations.filter((c) => c.status === 'ACTIVE').length;
    const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    dataPoints.push({
      id: 'active-conversations',
      category: 'Communication',
      subcategory: 'Messages',
      label: 'Active Conversations',
      value: activeConversations,
      unit: 'conversations',
      status: activeConversations > 0 ? 'healthy' : 'warning',
      timestamp: now,
      metadata: { unreadMessages },
    });

    // Customer satisfaction
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    dataPoints.push({
      id: 'customer-satisfaction',
      category: 'Customer',
      subcategory: 'Satisfaction',
      label: 'Avg Rating',
      value: avgRating,
      unit: '/5',
      trend: avgRating >= 4 ? 'up' : avgRating >= 3 ? 'stable' : 'down',
      status: avgRating >= 4.5 ? 'excellent' : avgRating >= 3.5 ? 'healthy' : avgRating >= 2.5 ? 'warning' : 'critical',
      timestamp: now,
    });

    // Workflow automation
    const activeWorkflows = workflows.length;
    const activeEnrollments = workflowEnrollments.filter((e) => e.status === 'ACTIVE').length;

    dataPoints.push({
      id: 'active-workflows',
      category: 'Automation',
      subcategory: 'Workflows',
      label: 'Active Workflows',
      value: activeWorkflows,
      unit: 'workflows',
      status: activeWorkflows > 0 ? 'healthy' : 'warning',
      timestamp: now,
      metadata: { activeEnrollments },
    });

    // Call activity
    const recentCalls = callLogs.filter((c) => new Date(c.createdAt) >= last7Days).length;
    const completedCalls = callLogs.filter((c) => c.status === 'COMPLETED').length;
    const callCompletionRate = callLogs.length > 0 ? (completedCalls / callLogs.length) * 100 : 0;

    dataPoints.push({
      id: 'call-activity',
      category: 'Communication',
      subcategory: 'Calls',
      label: 'Calls (7d)',
      value: recentCalls,
      unit: 'calls',
      status: recentCalls > 0 ? 'healthy' : 'warning',
      timestamp: now,
      metadata: { completionRate: callCompletionRate },
    });

    // Calculate hemisphere health
    const healthyPoints = dataPoints.filter((p) => p.status === 'healthy' || p.status === 'excellent').length;
    const overallHealth = Math.round((healthyPoints / dataPoints.length) * 100);
    const criticalAlerts = dataPoints.filter((p) => p.status === 'critical').length;
    const opportunities = dataPoints.filter((p) => p.trend === 'up' && p.status !== 'critical').length;

    return {
      name: 'Current Operations',
      dataPoints,
      overallHealth,
      criticalAlerts,
      opportunities,
    };
  }

  /**
   * Build RIGHT HEMISPHERE: Future Predictions
   */
  private buildFuturePredictionsHemisphere(
    leads: any[],
    deals: any[],
    payments: any[],
    emailCampaigns: any[],
    smsCampaigns: any[],
    reviews: any[]
  ): BrainHemisphere {
    const dataPoints: BrainDataPoint[] = [];
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Predict next week revenue
    const recentRevenue = payments
      .filter((p) => new Date(p.createdAt) >= last30Days)
      .reduce((sum, p) => sum + p.amount, 0);
    const previousRevenue = payments
      .filter(
        (p) =>
          new Date(p.createdAt) >= previous30Days &&
          new Date(p.createdAt) < last30Days
      )
      .reduce((sum, p) => sum + p.amount, 0);
    const revenueGrowthRate = previousRevenue > 0 ? (recentRevenue - previousRevenue) / previousRevenue : 0;
    const predictedNextWeekRevenue = recentRevenue * (1 + revenueGrowthRate * 0.25) / 4.3;
    const revenueConfidence = Math.min(85, 50 + Math.abs(revenueGrowthRate) * 100);

    dataPoints.push({
      id: 'predicted-revenue-next-week',
      category: 'Financial',
      subcategory: 'Revenue',
      label: 'Predicted Revenue (Next Week)',
      value: predictedNextWeekRevenue,
      unit: 'USD',
      trend: revenueGrowthRate > 0 ? 'up' : revenueGrowthRate < 0 ? 'down' : 'stable',
      change: revenueGrowthRate * 100,
      status: predictedNextWeekRevenue > recentRevenue / 4.3 ? 'excellent' : 'healthy',
      confidence: revenueConfidence,
      timestamp: now,
    });

    // Predict next week leads
    const recentLeads = leads.filter((l) => new Date(l.createdAt) >= last30Days).length;
    const previousLeads = leads.filter(
      (l) =>
        new Date(l.createdAt) >= previous30Days &&
        new Date(l.createdAt) < last30Days
    ).length;
    const leadGrowthRate = previousLeads > 0 ? (recentLeads - previousLeads) / previousLeads : 0;
    const predictedNextWeekLeads = Math.round((recentLeads / 4.3) * (1 + leadGrowthRate * 0.25));
    const leadConfidence = Math.min(80, 45 + Math.abs(leadGrowthRate) * 100);

    dataPoints.push({
      id: 'predicted-leads-next-week',
      category: 'Sales',
      subcategory: 'Leads',
      label: 'Predicted Leads (Next Week)',
      value: predictedNextWeekLeads,
      unit: 'leads',
      trend: leadGrowthRate > 0 ? 'up' : leadGrowthRate < 0 ? 'down' : 'stable',
      change: leadGrowthRate * 100,
      status: predictedNextWeekLeads > recentLeads / 4.3 ? 'excellent' : 'healthy',
      confidence: leadConfidence,
      timestamp: now,
    });

    // Predict conversion rate
    const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;
    const currentConversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;
    const recentDeals = deals.filter(
      (d) => d.actualCloseDate && new Date(d.actualCloseDate) >= last30Days
    ).length;
    const recentConversionRate = recentLeads > 0 ? (recentDeals / recentLeads) * 100 : 0;
    const predictedConversionRate = recentConversionRate > 0 ? recentConversionRate : currentConversionRate;

    dataPoints.push({
      id: 'predicted-conversion-rate',
      category: 'Sales',
      subcategory: 'Conversion',
      label: 'Predicted Conversion Rate',
      value: predictedConversionRate,
      unit: '%',
      trend: predictedConversionRate > currentConversionRate ? 'up' : 'stable',
      status: predictedConversionRate > 15 ? 'excellent' : predictedConversionRate > 10 ? 'healthy' : 'warning',
      confidence: 70,
      timestamp: now,
    });

    // Predict customer churn risk
    const negativeFeedback = reviews.filter((r) => r.rating <= 2).length;
    const totalFeedback = reviews.length;
    const churnRisk = totalFeedback > 0 ? (negativeFeedback / totalFeedback) * 100 : 0;
    const predictedChurnRisk = churnRisk > 20 ? churnRisk * 1.2 : churnRisk;

    dataPoints.push({
      id: 'predicted-churn-risk',
      category: 'Customer',
      subcategory: 'Retention',
      label: 'Predicted Churn Risk',
      value: predictedChurnRisk,
      unit: '%',
      trend: predictedChurnRisk > 20 ? 'down' : 'stable',
      status: predictedChurnRisk < 10 ? 'excellent' : predictedChurnRisk < 20 ? 'healthy' : 'warning',
      confidence: 75,
      timestamp: now,
    });

    // Predict campaign performance
    const emailOpenRate = (emailCampaigns || []).length > 0
      ? (emailCampaigns || []).reduce((sum, c) => {
          const recipients = c.recipients || [];
          const opened = recipients.filter((r: any) => ['OPENED', 'CLICKED'].includes(r.status)).length;
          const sent = recipients.filter((r: any) => ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(r.status)).length;
          return sum + (sent > 0 ? (opened / sent) * 100 : 0);
        }, 0) / (emailCampaigns || []).length
      : 0;
    const predictedEmailPerformance = emailOpenRate * 1.05; // Slight improvement prediction

    dataPoints.push({
      id: 'predicted-email-performance',
      category: 'Marketing',
      subcategory: 'Email',
      label: 'Predicted Email Performance',
      value: predictedEmailPerformance,
      unit: '%',
      trend: predictedEmailPerformance > emailOpenRate ? 'up' : 'stable',
      status: predictedEmailPerformance > 20 ? 'excellent' : predictedEmailPerformance > 10 ? 'healthy' : 'warning',
      confidence: 65,
      timestamp: now,
    });

    // Calculate hemisphere health
    const healthyPoints = dataPoints.filter((p) => p.status === 'healthy' || p.status === 'excellent').length;
    const overallHealth = Math.round((healthyPoints / dataPoints.length) * 100);
    const criticalAlerts = dataPoints.filter((p) => p.status === 'critical').length;
    const opportunities = dataPoints.filter((p) => p.trend === 'up' && p.status !== 'critical').length;

    return {
      name: 'Future Predictions',
      dataPoints,
      overallHealth,
      criticalAlerts,
      opportunities,
    };
  }

  /**
   * Build connections between data points
   */
  private buildDataConnections(
    leads: any[],
    deals: any[],
    payments: any[],
    emailCampaigns: any[],
    smsCampaigns: any[],
    conversations: any[]
  ): Array<{ from: string; to: string; strength: number; type: string }> {
    const connections: Array<{ from: string; to: string; strength: number; type: string }> = [];

    // Lead to Deal connections
    const leadToDealRate = leads.length > 0 ? (deals.length / leads.length) * 100 : 0;
    if (leadToDealRate > 0) {
      connections.push({
        from: 'leads-7d',
        to: 'predicted-leads-next-week',
        strength: Math.min(100, leadToDealRate * 10),
        type: 'conversion',
      });
    }

    // Deal to Revenue connections
    const dealToRevenueRate = deals.length > 0
      ? payments.reduce((sum, p) => sum + p.amount, 0) / deals.length
      : 0;
    if (dealToRevenueRate > 0) {
      connections.push({
        from: 'predicted-leads-next-week',
        to: 'predicted-revenue-next-week',
        strength: Math.min(100, dealToRevenueRate / 100),
        type: 'revenue',
      });
    }

    // Campaign to Lead connections
    const campaignToLeadStrength = emailCampaigns.length > 0 || smsCampaigns.length > 0 ? 60 : 0;
    if (campaignToLeadStrength > 0) {
      connections.push({
        from: 'email-open-rate',
        to: 'leads-7d',
        strength: campaignToLeadStrength,
        type: 'marketing',
      });
      connections.push({
        from: 'sms-reply-rate',
        to: 'leads-7d',
        strength: campaignToLeadStrength,
        type: 'marketing',
      });
    }

    // Conversation to Satisfaction connections
    if (conversations.length > 0) {
      connections.push({
        from: 'active-conversations',
        to: 'customer-satisfaction',
        strength: 70,
        type: 'engagement',
      });
    }

    return connections;
  }

  /**
   * Identify critical alerts
   */
  private identifyCriticalAlerts(
    leads: any[],
    deals: any[],
    tasks: any[],
    payments: any[],
    emailCampaigns: any[],
    smsCampaigns: any[],
    reviews: any[]
  ): Array<{ id: string; title: string; severity: 'high' | 'medium' | 'low'; category: string }> {
    const alerts: Array<{ id: string; title: string; severity: 'high' | 'medium' | 'low'; category: string }> = [];

    // Low revenue alert
    const recentRevenue = payments
      .filter((p) => new Date(p.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .reduce((sum, p) => sum + p.amount, 0);
    if (recentRevenue === 0 && payments.length > 0) {
      alerts.push({
        id: 'no-revenue-7d',
        title: 'No Revenue Generated in Last 7 Days',
        severity: 'high',
        category: 'Financial',
      });
    }

    // Low lead generation
    const recentLeads = leads.filter(
      (l) => new Date(l.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    if (recentLeads === 0 && leads.length > 0) {
      alerts.push({
        id: 'no-leads-7d',
        title: 'No New Leads in Last 7 Days',
        severity: 'high',
        category: 'Sales',
      });
    }

    // High negative reviews
    const negativeReviews = reviews.filter((r) => r.rating <= 2).length;
    if (negativeReviews > reviews.length * 0.3 && reviews.length > 5) {
      alerts.push({
        id: 'high-negative-reviews',
        title: `${negativeReviews} Negative Reviews Detected`,
        severity: 'high',
        category: 'Customer',
      });
    }

    // Stale deals
    const staleDeals = deals.filter(
      (d) =>
        !d.actualCloseDate &&
        d.updatedAt &&
        new Date(d.updatedAt) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    ).length;
    if (staleDeals > deals.length * 0.3 && deals.length > 5) {
      alerts.push({
        id: 'stale-deals',
        title: `${staleDeals} Stale Deals Requiring Attention`,
        severity: 'medium',
        category: 'Sales',
      });
    }

    // Low campaign engagement
    const emailStatsForAlert = (emailCampaigns || []).reduce(
      (acc, campaign) => {
        const recipients = campaign.recipients || [];
        return {
          sent: acc.sent + recipients.filter((r: any) => ['SENT', 'DELIVERED'].includes(r.status)).length,
          opened: acc.opened + recipients.filter((r: any) => ['OPENED', 'CLICKED'].includes(r.status)).length,
        };
      },
      { sent: 0, opened: 0 }
    );
    const emailOpenRate = emailStatsForAlert.sent > 0 ? (emailStatsForAlert.opened / emailStatsForAlert.sent) * 100 : 0;
    if (emailOpenRate < 5 && emailStatsForAlert.sent > 50) {
      alerts.push({
        id: 'low-email-engagement',
        title: 'Email Campaign Engagement Below 5%',
        severity: 'medium',
        category: 'Marketing',
      });
    }

    return alerts;
  }
}

export const aiBrainEnhancedService = new AIBrainEnhancedService();
