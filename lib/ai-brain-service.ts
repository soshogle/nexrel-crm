/**
 * Central AI Brain Service
 * Provides general insights across all leads, deals, and business data
 * Not entity-specific - focuses on overall patterns and predictions
 */

import { prisma } from './db';

interface GeneralInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'action' | 'prediction';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number; // 0-100
  actionable: boolean;
  suggestedActions?: string[];
  affectedEntities?: {
    leads?: number;
    deals?: number;
    tasks?: number;
  };
  metrics?: {
    current: number;
    target: number;
    unit: string;
  };
  timestamp: Date;
}

interface PredictiveAnalytics {
  nextWeekForecast: {
    newLeads: { predicted: number; confidence: number };
    dealConversions: { predicted: number; confidence: number };
    revenue: { predicted: number; confidence: number; currency: string };
  };
  nextMonthForecast: {
    newLeads: { predicted: number; confidence: number };
    dealConversions: { predicted: number; confidence: number };
    revenue: { predicted: number; confidence: number; currency: string };
  };
  growthTrend: 'accelerating' | 'steady' | 'declining' | 'volatile';
  seasonalPatterns: string[];
}

interface WorkflowRecommendation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  expectedImpact: string;
  automatable: boolean;
  priority: 'high' | 'medium' | 'low';
}

export class AIBrainService {
  /**
   * Generate general insights across all business data
   */
  async generateGeneralInsights(userId: string): Promise<GeneralInsight[]> {
    const insights: GeneralInsight[] = [];

    // Fetch all relevant data with error handling
    const results = await Promise.allSettled([
      prisma.lead.findMany({
        where: { userId },
        include: { notes: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deal.findMany({
        where: { userId },
        include: { stage: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.findMany({
        where: {
          OR: [{ userId }, { assignedToId: userId }],
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bookingAppointment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.callLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Extract results with error handling
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
        console.error(`Error fetching ${name}:`, error);
        return [];
      }
    };

    const leads = getResult(results[0], 'leads');
    const deals = getResult(results[1], 'deals');
    const tasks = getResult(results[2], 'tasks');
    const appointments = getResult(results[3], 'appointments');
    const callLogs = getResult(results[4], 'callLogs');

    // 1. Lead Velocity Analysis
    const recentLeads = leads.filter(
      (l) => l.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const previousWeekLeads = leads.filter(
      (l) =>
        l.createdAt > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
        l.createdAt <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentLeads.length > previousWeekLeads.length * 1.2) {
      insights.push({
        id: 'lead-velocity-up',
        type: 'opportunity',
        priority: 'high',
        title: 'Lead Generation Accelerating',
        description: `Your lead generation has increased by ${Math.round(
          ((recentLeads.length - previousWeekLeads.length) / previousWeekLeads.length) * 100
        )}% this week`,
        impact: 'Capitalize on this momentum to maximize conversions',
        confidence: 85,
        actionable: true,
        suggestedActions: [
          'Ensure follow-up capacity matches lead volume',
          'Review what changed to sustain this growth',
          'Prepare templates for quick responses',
        ],
        affectedEntities: { leads: recentLeads.length },
        metrics: {
          current: recentLeads.length,
          target: Math.round(recentLeads.length * 1.2),
          unit: 'leads/week',
        },
        timestamp: new Date(),
      });
    } else if (recentLeads.length < previousWeekLeads.length * 0.8) {
      insights.push({
        id: 'lead-velocity-down',
        type: 'risk',
        priority: 'high',
        title: 'Lead Generation Declining',
        description: `Lead volume dropped ${Math.abs(
          Math.round(((recentLeads.length - previousWeekLeads.length) / previousWeekLeads.length) * 100)
        )}% this week`,
        impact: 'Take immediate action to reverse this trend',
        confidence: 90,
        actionable: true,
        suggestedActions: [
          'Review and boost marketing efforts',
          'Re-engage dormant lead sources',
          'Consider launching a targeted campaign',
        ],
        affectedEntities: { leads: leads.length },
        metrics: {
          current: recentLeads.length,
          target: previousWeekLeads.length,
          unit: 'leads/week',
        },
        timestamp: new Date(),
      });
    }

    // 2. Deal Pipeline Health
    const qualifiedLeads = leads.filter((l) => l.status === 'QUALIFIED');
    const activeDeals = deals.filter((d) => !d.actualCloseDate);
    const staleDeals = activeDeals.filter(
      (d) => d.updatedAt && d.updatedAt < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    if (staleDeals.length > activeDeals.length * 0.3) {
      insights.push({
        id: 'stale-deals-warning',
        type: 'risk',
        priority: 'high',
        title: 'High Number of Stale Deals',
        description: `${staleDeals.length} deals (${Math.round(
          (staleDeals.length / activeDeals.length) * 100
        )}%) haven't been updated in 2+ weeks`,
        impact: 'Risk of losing deals due to inactivity',
        confidence: 95,
        actionable: true,
        suggestedActions: [
          'Review and prioritize stale deals',
          'Schedule follow-up calls this week',
          'Consider automated re-engagement campaigns',
        ],
        affectedEntities: { deals: staleDeals.length },
        timestamp: new Date(),
      });
    }

    // 3. Conversion Rate Analysis
    const convertedLeads = leads.filter((l) => l.status === 'CONVERTED');
    const conversionRate =
      leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0;

    if (conversionRate < 5) {
      insights.push({
        id: 'low-conversion-rate',
        type: 'action',
        priority: 'high',
        title: 'Below-Average Conversion Rate',
        description: `Only ${conversionRate.toFixed(1)}% of leads convert to customers`,
        impact: 'Improving conversion could significantly boost revenue',
        confidence: 88,
        actionable: true,
        suggestedActions: [
          'Analyze why qualified leads aren\'t converting',
          'Improve follow-up processes',
          'Review pricing and value proposition',
          'Implement lead nurturing campaigns',
        ],
        affectedEntities: { leads: leads.length, deals: deals.length },
        metrics: {
          current: conversionRate,
          target: 15,
          unit: '%',
        },
        timestamp: new Date(),
      });
    }

    // 4. Task Completion Patterns
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < new Date() && t.status !== 'COMPLETED'
    );
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
    const taskCompletionRate =
      tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    if (overdueTasks.length > 10) {
      insights.push({
        id: 'overdue-tasks-warning',
        type: 'risk',
        priority: 'medium',
        title: 'High Overdue Task Count',
        description: `${overdueTasks.length} tasks are overdue`,
        impact: 'Missed deadlines may affect customer satisfaction and deals',
        confidence: 92,
        actionable: true,
        suggestedActions: [
          'Prioritize and delegate overdue tasks',
          'Review workload distribution',
          'Set more realistic deadlines',
        ],
        affectedEntities: { tasks: overdueTasks.length },
        timestamp: new Date(),
      });
    }

    // 5. Call Activity Analysis
    const recentCalls = callLogs.filter(
      (c) => c.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const completedCalls = recentCalls.filter((c) => c.status === 'COMPLETED');
    const avgCallsPerDay = recentCalls.length / 7;

    if (avgCallsPerDay < 3) {
      insights.push({
        id: 'low-call-activity',
        type: 'action',
        priority: 'medium',
        title: 'Low Outbound Call Activity',
        description: `Only ${avgCallsPerDay.toFixed(1)} calls per day on average`,
        impact: 'More proactive outreach could accelerate deal velocity',
        confidence: 75,
        actionable: true,
        suggestedActions: [
          'Schedule dedicated time blocks for calls',
          'Use AI voice agents for initial outreach',
          'Set daily call targets',
        ],
        affectedEntities: { leads: leads.length, deals: deals.length },
        metrics: {
          current: avgCallsPerDay,
          target: 10,
          unit: 'calls/day',
        },
        timestamp: new Date(),
      });
    }

    // 6. Response Time Insight
    const leadsWithNotes = leads.filter((l) => l.notes && l.notes.length > 0);
    const leadsWithoutNotes = leads.filter((l) => !l.notes || l.notes.length === 0);

    if (leadsWithoutNotes.length > leads.length * 0.4) {
      insights.push({
        id: 'low-engagement-rate',
        type: 'action',
        priority: 'medium',
        title: 'Many Leads Lack Follow-Up Notes',
        description: `${leadsWithoutNotes.length} leads (${Math.round(
          (leadsWithoutNotes.length / leads.length) * 100
        )}%) have no documented interactions`,
        impact: 'Document interactions to improve follow-up quality',
        confidence: 85,
        actionable: true,
        suggestedActions: [
          'Add notes after every customer interaction',
          'Use AI to auto-generate call summaries',
          'Set reminders for follow-ups',
        ],
        affectedEntities: { leads: leadsWithoutNotes.length },
        timestamp: new Date(),
      });
    }

    // 7. Positive Momentum Detection
    const recentWins = deals.filter(
      (d) =>
        d.stage.name.includes('Won') &&
        d.actualCloseDate &&
        d.actualCloseDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentWins.length >= 3) {
      insights.push({
        id: 'winning-streak',
        type: 'opportunity',
        priority: 'high',
        title: 'Winning Streak Detected',
        description: `${recentWins.length} deals closed in the last 30 days`,
        impact: 'Capitalize on this momentum',
        confidence: 90,
        actionable: true,
        suggestedActions: [
          'Analyze what\'s working and replicate it',
          'Ask for referrals from recent customers',
          'Increase marketing spend while converting well',
        ],
        affectedEntities: { deals: recentWins.length },
        timestamp: new Date(),
      });
    }

    // Sort by priority and confidence
    return insights.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generate predictive analytics
   */
  async generatePredictiveAnalytics(userId: string): Promise<PredictiveAnalytics> {
    // Fetch data with error handling
    const results = await Promise.allSettled([
      prisma.lead.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deal.findMany({
        where: { userId },
        include: { lead: true, stage: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Extract results with error handling
    const getResult = <T>(result: PromiseSettledResult<T[]>, name: string): T[] => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const error = result.reason;
        if (error?.code === 'P2022' || error?.code === 'P2021') {
          console.warn(`Database schema mismatch for ${name}:`, error.message);
          return [];
        }
        console.error(`Error fetching ${name}:`, error);
        return [];
      }
    };

    const leads = getResult(results[0], 'leads');
    const deals = getResult(results[1], 'deals');

    // Calculate recent trends
    const last30DaysLeads = leads.filter(
      (l) => l.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const previous30DaysLeads = leads.filter(
      (l) =>
        l.createdAt > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) &&
        l.createdAt <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const last30DaysDeals = deals.filter(
      (d) =>
        d.actualCloseDate &&
        d.actualCloseDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) &&
        d.stage.name.includes('Won')
    );

    // Calculate growth rate
    const leadGrowthRate =
      previous30DaysLeads.length > 0
        ? (last30DaysLeads.length - previous30DaysLeads.length) / previous30DaysLeads.length
        : 0;

    // Predict next week
    const avgLeadsPerWeek = last30DaysLeads.length / 4;
    const nextWeekLeads = Math.round(avgLeadsPerWeek * (1 + leadGrowthRate * 0.25));

    // Predict conversions
    const conversionRate = leads.length > 0 ? deals.length / leads.length : 0.1;
    const nextWeekConversions = Math.round(nextWeekLeads * conversionRate);

    // Predict revenue
    const avgDealValue =
      last30DaysDeals.length > 0
        ? last30DaysDeals.reduce((sum, d) => sum + (d.value || 0), 0) / last30DaysDeals.length
        : 5000;
    const nextWeekRevenue = nextWeekConversions * avgDealValue;

    // Determine growth trend
    let growthTrend: 'accelerating' | 'steady' | 'declining' | 'volatile' = 'steady';
    if (leadGrowthRate > 0.2) growthTrend = 'accelerating';
    else if (leadGrowthRate < -0.2) growthTrend = 'declining';
    else if (Math.abs(leadGrowthRate) < 0.05) growthTrend = 'steady';
    else growthTrend = 'volatile';

    return {
      nextWeekForecast: {
        newLeads: { predicted: nextWeekLeads, confidence: 70 },
        dealConversions: { predicted: nextWeekConversions, confidence: 65 },
        revenue: { predicted: nextWeekRevenue, confidence: 60, currency: 'USD' },
      },
      nextMonthForecast: {
        newLeads: { predicted: Math.round(nextWeekLeads * 4.3), confidence: 55 },
        dealConversions: { predicted: Math.round(nextWeekConversions * 4.3), confidence: 50 },
        revenue: {
          predicted: Math.round(nextWeekRevenue * 4.3),
          confidence: 45,
          currency: 'USD',
        },
      },
      growthTrend,
      seasonalPatterns: [
        'Higher activity on Tuesdays and Wednesdays',
        'Slower conversion rates near month-end',
      ],
    };
  }

  /**
   * Generate workflow automation recommendations
   */
  async generateWorkflowRecommendations(userId: string): Promise<WorkflowRecommendation[]> {
    const recommendations: WorkflowRecommendation[] = [];

    // Fetch data with error handling
    const results = await Promise.allSettled([
      prisma.lead.findMany({ where: { userId } }),
      prisma.task.findMany({
        where: {
          OR: [{ userId }, { assignedToId: userId }],
        },
      }),
      prisma.deal.findMany({ where: { userId } }),
    ]);

    // Extract results with error handling
    const getResult = <T>(result: PromiseSettledResult<T[]>, name: string): T[] => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const error = result.reason;
        if (error?.code === 'P2022' || error?.code === 'P2021') {
          console.warn(`Database schema mismatch for ${name}:`, error.message);
          return [];
        }
        console.error(`Error fetching ${name}:`, error);
        return [];
      }
    };

    const leads = getResult(results[0], 'leads');
    const tasks = getResult(results[1], 'tasks');
    const deals = getResult(results[2], 'deals');

    // 1. Auto-follow-up for new leads
    const newLeads = leads.filter(
      (l) => l.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && l.status === 'NEW'
    );

    if (newLeads.length > 5) {
      recommendations.push({
        id: 'auto-followup-new-leads',
        name: 'Auto-Follow-Up for New Leads',
        description: 'Automatically create a follow-up task 24 hours after a new lead is created',
        trigger: 'When a new lead is added',
        actions: [
          'Wait 24 hours',
          'Create task: "Follow up with [Lead Name]"',
          'Send SMS: "Thanks for your interest! When can we chat?"',
        ],
        expectedImpact: 'Ensure no lead goes cold; improve response time',
        automatable: true,
        priority: 'high',
      });
    }

    // 2. Stale deal notifications
    const staleDeals = deals.filter(
      (d) =>
        !d.actualCloseDate &&
        d.updatedAt &&
        d.updatedAt < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    if (staleDeals.length > 3) {
      recommendations.push({
        id: 'stale-deal-alerts',
        name: 'Stale Deal Alerts',
        description: 'Get notified when a deal hasn\'t been updated in 14 days',
        trigger: 'Every Monday morning',
        actions: [
          'Find deals with no activity in 14+ days',
          'Send email digest of stale deals',
          'Create high-priority task to review each deal',
        ],
        expectedImpact: 'Reduce deal slippage; maintain pipeline health',
        automatable: true,
        priority: 'high',
      });
    }

    // 3. Task auto-assignment
    const unassignedTasks = tasks.filter((t) => !t.assignedToId);

    if (unassignedTasks.length > 5) {
      recommendations.push({
        id: 'auto-assign-tasks',
        name: 'Smart Task Assignment',
        description: 'Automatically assign tasks to team members based on workload and expertise',
        trigger: 'When a new task is created without an assignee',
        actions: [
          'Analyze team member workload',
          'Check task category and expertise match',
          'Assign to team member with lowest workload',
          'Send notification to assignee',
        ],
        expectedImpact: 'Balance workload; improve task completion rate',
        automatable: true,
        priority: 'medium',
      });
    }

    // 4. Lead scoring automation
    if (leads.length > 50) {
      recommendations.push({
        id: 'auto-lead-scoring',
        name: 'Automated Lead Scoring',
        description: 'Automatically score and prioritize leads based on engagement',
        trigger: 'When lead data changes',
        actions: [
          'Calculate engagement score (calls, emails, website visits)',
          'Assign priority level (Hot, Warm, Cold)',
          'Move hot leads to "Qualified" status',
          'Notify sales team of high-priority leads',
        ],
        expectedImpact: 'Focus on high-value leads; improve conversion rate',
        automatable: true,
        priority: 'high',
      });
    }

    // 5. Win/loss analysis
    const closedDeals = deals.filter((d) => d.actualCloseDate !== null);

    if (closedDeals.length > 10) {
      recommendations.push({
        id: 'auto-win-loss-analysis',
        name: 'Automated Win/Loss Analysis',
        description: 'Automatically request feedback when a deal closes',
        trigger: 'When deal stage changes to Closed Won or Closed Lost',
        actions: [
          'Send customer survey (for wins)',
          'Request internal debrief (for losses)',
          'Update CRM with insights',
          'Generate monthly win/loss report',
        ],
        expectedImpact: 'Learn from successes and failures; improve sales process',
        automatable: true,
        priority: 'medium',
      });
    }

    return recommendations;
  }
}

export const aiBrainService = new AIBrainService();
