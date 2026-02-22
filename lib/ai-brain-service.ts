/**
 * Central AI Brain Service
 * Provides general insights across all leads, deals, and business data
 * Not entity-specific - focuses on overall patterns and predictions
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService, dealService, taskService } from '@/lib/dal';
import { crmEvents } from './crm-event-emitter';

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

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class AIBrainService {
  private cache = new Map<string, CacheEntry<any>>();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS) {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidateCache(userId: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(userId)) this.cache.delete(key);
    }
  }

  /**
   * Generate general insights across all business data
   */
  async generateGeneralInsights(userId: string): Promise<GeneralInsight[]> {
    const cacheKey = `${userId}:insights`;
    const cached = this.getCached<GeneralInsight[]>(cacheKey);
    if (cached) return cached;
    const insights: GeneralInsight[] = [];

    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);
    // Fetch all relevant data with error handling
    const results = await Promise.allSettled([
      leadService.findMany(ctx, { include: { notes: true } }),
      dealService.findMany(ctx, { include: { stage: true } }),
      taskService.findMany(ctx),
      db.bookingAppointment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      db.callLog.findMany({
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

    // Attempt AI-powered insights (augments template ones)
    try {
      const convertedLeadsCount = leads.filter((l) => l.status === 'CONVERTED').length;
      const totalConvRate = leads.length > 0 ? (convertedLeadsCount / leads.length) * 100 : 0;
      const aiInsights = await this.generateAIInsights({
        totalLeads: leads.length,
        recentLeads: recentLeads.length,
        previousWeekLeads: previousWeekLeads.length,
        conversionRate: totalConvRate.toFixed(1),
        activeDeals: activeDeals.length,
        staleDeals: staleDeals.length,
        recentWins: leads.filter(
          (l) => l.status === 'CONVERTED' && l.updatedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        overdueTasks: overdueTasks.length,
        avgCallsPerDay: avgCallsPerDay.toFixed(1),
        emailOpenRate: '0',
        smsReplyRate: '0',
      });
      // Add AI insights that don't duplicate existing template insights
      const existingIds = new Set(insights.map((i) => i.id));
      for (const ai of aiInsights) {
        if (!existingIds.has(ai.id)) insights.push(ai);
      }
    } catch { /* AI insights are optional */ }

    // Sort by priority and confidence
    const sorted = insights.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
    this.setCache(cacheKey, sorted);
    return sorted;
  }

  /**
   * Use OpenAI to generate richer insights from CRM data snapshot.
   * Falls back to template insights if API key is not set or call fails.
   */
  private async generateAIInsights(dataSnapshot: Record<string, any>): Promise<GeneralInsight[]> {
    if (!process.env.OPENAI_API_KEY) return [];
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `You are a CRM analytics AI. Analyze this business data snapshot and return 3-5 high-value insights as JSON array. Each object: { "type": "opportunity"|"risk"|"trend"|"action"|"prediction", "priority": "high"|"medium"|"low", "title": string (short), "description": string (1-2 sentences), "impact": string, "confidence": number (0-100), "suggestedActions": string[] (1-3 actions) }.

Data:
- Leads: ${dataSnapshot.totalLeads} total, ${dataSnapshot.recentLeads} this week, ${dataSnapshot.previousWeekLeads} last week
- Conversion rate: ${dataSnapshot.conversionRate}%
- Active deals: ${dataSnapshot.activeDeals}, stale (14d+): ${dataSnapshot.staleDeals}
- Recent wins: ${dataSnapshot.recentWins} (last 30d)
- Overdue tasks: ${dataSnapshot.overdueTasks}
- Avg calls/day: ${dataSnapshot.avgCallsPerDay}
- Email open rate: ${dataSnapshot.emailOpenRate}%
- SMS reply rate: ${dataSnapshot.smsReplyRate}%

Respond ONLY with valid JSON array, no markdown.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return [];
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : parsed.insights || parsed.data || [];
      return items.map((item: any, i: number) => ({
        id: `ai-insight-${i}`,
        type: item.type || 'trend',
        priority: item.priority || 'medium',
        title: item.title || 'AI Insight',
        description: item.description || '',
        impact: item.impact || '',
        confidence: item.confidence || 70,
        actionable: true,
        suggestedActions: item.suggestedActions || [],
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('[AI Brain] OpenAI insight generation failed:', error);
      return [];
    }
  }

  /**
   * Generate predictive analytics
   */
  async generatePredictiveAnalytics(userId: string): Promise<PredictiveAnalytics> {
    const cacheKey = `${userId}:predictions`;
    const cached = this.getCached<PredictiveAnalytics>(cacheKey);
    if (cached) return cached;

    const ctx = createDalContext(userId);
    // Fetch data with error handling
    const results = await Promise.allSettled([
      leadService.findMany(ctx),
      dealService.findMany(ctx, { include: { lead: true, stage: true } }),
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

    const result: PredictiveAnalytics = {
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
      seasonalPatterns: await this.detectSeasonalPatterns(leads, deals),
    };
    this.setCache(cacheKey, result);
    return result;
  }

  private async detectSeasonalPatterns(leads: any[], deals: any[]): Promise<string[]> {
    const patterns: string[] = [];

    // Day-of-week analysis
    const dayBuckets = [0, 0, 0, 0, 0, 0, 0];
    const recentLeads = leads.filter(
      (l) => l.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    for (const l of recentLeads) {
      dayBuckets[new Date(l.createdAt).getDay()]++;
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const maxDay = dayBuckets.indexOf(Math.max(...dayBuckets));
    const minDay = dayBuckets.indexOf(Math.min(...dayBuckets));
    if (recentLeads.length > 10) {
      patterns.push(`Highest lead generation on ${dayNames[maxDay]}s`);
      patterns.push(`Lowest activity on ${dayNames[minDay]}s`);
    }

    // Month-over-month pattern
    const monthBuckets: Record<number, number> = {};
    for (const d of deals) {
      if (d.actualCloseDate) {
        const m = new Date(d.actualCloseDate).getMonth();
        monthBuckets[m] = (monthBuckets[m] || 0) + 1;
      }
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const entries = Object.entries(monthBuckets).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (entries.length >= 3) {
      patterns.push(`Best closing months: ${monthNames[Number(entries[0][0])]}, ${monthNames[Number(entries[1][0])]}`);
    }

    return patterns.length > 0 ? patterns : ['Insufficient historical data for seasonal patterns'];
  }

  /**
   * Generate workflow automation recommendations
   */
  async generateWorkflowRecommendations(userId: string): Promise<WorkflowRecommendation[]> {
    const cacheKey = `${userId}:workflows`;
    const cached = this.getCached<WorkflowRecommendation[]>(cacheKey);
    if (cached) return cached;

    const recommendations: WorkflowRecommendation[] = [];

    const ctx = createDalContext(userId);
    // Fetch data with error handling
    const results = await Promise.allSettled([
      leadService.findMany(ctx),
      taskService.findMany(ctx),
      dealService.findMany(ctx),
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

    this.setCache(cacheKey, recommendations);
    return recommendations;
  }

  /**
   * Detect real-time patterns from recent CRM events.
   * Call this alongside generateGeneralInsights for up-to-the-minute awareness.
   */
  detectRealtimePatterns(userId: string): GeneralInsight[] {
    const insights: GeneralInsight[] = [];
    const summary = crmEvents.getEventSummary(userId, 60);

    const leadsCreated = summary.lead_created || 0;
    if (leadsCreated >= 5) {
      insights.push({
        id: 'realtime-lead-surge',
        type: 'trend',
        priority: 'high',
        title: 'Lead surge detected',
        description: `${leadsCreated} new leads in the last hour — capitalize on this momentum.`,
        impact: 'High potential for conversions if followed up quickly',
        confidence: 90,
        actionable: true,
        suggestedActions: ['Prioritize follow-ups on newest leads', 'Check which source is generating the surge'],
        timestamp: new Date(),
      });
    }

    const dealsMoved = summary.deal_stage_changed || 0;
    if (dealsMoved >= 3) {
      insights.push({
        id: 'realtime-deal-movement',
        type: 'opportunity',
        priority: 'medium',
        title: 'Active deal movement',
        description: `${dealsMoved} deals changed stage in the last hour.`,
        impact: 'Pipeline is active — review for closing opportunities',
        confidence: 85,
        actionable: true,
        suggestedActions: ['Review deals near close stage', 'Update forecasts'],
        timestamp: new Date(),
      });
    }

    const tasksCompleted = summary.task_completed || 0;
    if (tasksCompleted >= 5) {
      insights.push({
        id: 'realtime-productivity',
        type: 'trend',
        priority: 'low',
        title: 'High productivity period',
        description: `${tasksCompleted} tasks completed in the last hour.`,
        impact: 'Team productivity is above average',
        confidence: 80,
        actionable: false,
        timestamp: new Date(),
      });
    }

    const campaignsSent = summary.campaign_sent || 0;
    if (campaignsSent >= 1) {
      insights.push({
        id: 'realtime-campaign-activity',
        type: 'action',
        priority: 'medium',
        title: 'Campaigns recently sent',
        description: `${campaignsSent} campaign(s) sent in the last hour — monitor delivery and engagement.`,
        impact: 'Early engagement metrics may be available soon',
        confidence: 95,
        actionable: true,
        suggestedActions: ['Check open rates in 1-2 hours', 'Prepare follow-up for non-openers'],
        timestamp: new Date(),
      });
    }

    return insights;
  }
}

export const aiBrainService = new AIBrainService();
