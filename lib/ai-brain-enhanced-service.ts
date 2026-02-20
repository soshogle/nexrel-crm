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

const CACHE_TTL_MS = 5 * 60 * 1000;

export class AIBrainEnhancedService {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return null; }
    return entry.data as T;
  }

  private setCache(key: string, data: any, ttl = CACHE_TTL_MS) {
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  /**
   * Get comprehensive brain data from all sources
   */
  async getComprehensiveBrainData(userId: string): Promise<ComprehensiveBrainData> {
    const cacheKey = `${userId}:enhanced`;
    const cached = this.getCached<ComprehensiveBrainData>(cacheKey);
    if (cached) return cached;
    // Helper to fetch leads safely, handling dateOfBirth column issues
    const fetchLeadsSafely = async () => {
      try {
        return await prisma.lead.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error: any) {
        // If dateOfBirth column doesn't exist, fetch with explicit select
        if (error?.code === 'P2022' && error?.meta?.column === 'Lead.dateOfBirth') {
          console.warn('[AI Brain] dateOfBirth column missing, using select statement');
          return await prisma.lead.findMany({
            where: { userId },
            select: {
              id: true,
              userId: true,
              businessName: true,
              contactPerson: true,
              email: true,
              phone: true,
              website: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              country: true,
              status: true,
              source: true,
              contactType: true,
              tags: true,
              createdAt: true,
              updatedAt: true,
              lastContactedAt: true,
              // Explicitly exclude dateOfBirth
            },
            orderBy: { createdAt: 'desc' },
          });
        }
        throw error; // Re-throw if it's a different error
      }
    };

    // Fetch ALL data sources in parallel with error handling using Promise.allSettled
    const results = await Promise.allSettled([
      // Existing sources
      fetchLeadsSafely(),
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

      // --- NEW DATA SOURCES ---

      // Email Drip Campaigns (detailed engagement stats)
      prisma.emailDripCampaign.findMany({
        where: { userId },
        select: {
          id: true, name: true, status: true,
          totalEnrolled: true, totalCompleted: true, totalUnsubscribed: true, totalBounced: true,
          avgOpenRate: true, avgClickRate: true, avgReplyRate: true,
          createdAt: true,
        },
      }),

      // Generic Campaigns (voice, multi-channel)
      prisma.campaign.findMany({
        where: { userId },
        select: {
          id: true, name: true, type: true, status: true,
          sentCount: true, deliveredCount: true, openedCount: true, clickedCount: true,
          totalCalls: true, answeredCalls: true, voicemails: true, avgCallDuration: true,
          totalRecipients: true, openRate: true, clickRate: true,
          createdAt: true,
        },
      }),

      // Outbound Calls
      prisma.outboundCall.findMany({
        where: { userId },
        select: {
          id: true, status: true, scheduledFor: true, completedAt: true,
          attemptCount: true, maxAttempts: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),

      // SMS Drip Campaigns
      prisma.smsCampaign.findMany({
        where: { userId, isSequence: true },
        select: {
          id: true, name: true, status: true,
          totalEnrolled: true, totalCompleted: true, totalSent: true, totalDelivered: true, totalReplied: true, totalFailed: true,
          avgReplyRate: true,
          createdAt: true,
        },
      }),

      // Websites
      prisma.website.findMany({
        where: { userId },
        select: {
          id: true, name: true, status: true, type: true, buildProgress: true,
          createdAt: true,
        },
      }),

      // Lead scoring distribution
      prisma.lead.findMany({
        where: { userId, leadScore: { not: null } },
        select: { leadScore: true },
      }),

      // --- PHASE 1A: FINANCIAL & PAYMENT INTELLIGENCE ---
      prisma.soshogleTransaction.findMany({
        where: { merchantId: userId },
        select: { id: true, amount: true, currency: true, status: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.soshogleWallet.findMany({
        where: { userId },
        select: { id: true, balance: true, currency: true },
      }),
      prisma.creditScore.findMany({
        where: { userId },
        select: { id: true, score: true, factors: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.achSettlement.findMany({
        where: { userId },
        select: { id: true, amount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.bnplApplication.findMany({
        where: { userId },
        select: { id: true, totalAmount: true, status: true, installmentCount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.cashTransaction.findMany({
        where: { userId },
        select: { id: true, amount: true, type: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.fraudAlert.findMany({
        where: { userId },
        select: { id: true, severity: true, status: true, type: true, amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      // --- PHASE 1B: E-COMMERCE & INVENTORY ---
      prisma.product.findMany({
        where: { userId },
        select: { id: true, name: true, price: true, stock: true, status: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { userId },
        select: { id: true, total: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.storefront.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.inventoryItem.findMany({
        where: { userId },
        select: { id: true, name: true, quantity: true, minQuantity: true, price: true, status: true },
      }),
      prisma.inventoryAlert.findMany({
        where: { userId },
        select: { id: true, type: true, status: true, createdAt: true },
      }),

      // POS & Restaurant
      prisma.reservation.findMany({
        where: { userId },
        select: { id: true, status: true, partySize: true, date: true, createdAt: true },
        orderBy: { date: 'desc' },
        take: 500,
      }),
      prisma.restaurantTable.findMany({
        where: { userId },
        select: { id: true, name: true, capacity: true, status: true },
      }),

      // --- PHASE 1C: TEAM, COMMS, VOICE, INTEGRATIONS ---
      prisma.teamMember.findMany({
        where: { userId },
        select: { id: true, role: true, status: true, createdAt: true },
      }),
      prisma.voiceAgent.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, totalCalls: true, createdAt: true },
      }),
      prisma.voiceUsage.findMany({
        where: { userId },
        select: { id: true, minutes: true, cost: true, agentType: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.channelConnection.findMany({
        where: { userId },
        select: { id: true, channel: true, status: true, lastSyncAt: true },
      }),
      prisma.calendarConnection.findMany({
        where: { userId },
        select: { id: true, provider: true, status: true, lastSyncAt: true },
      }),
      prisma.scheduledEmail.findMany({
        where: { userId },
        select: { id: true, status: true, scheduledFor: true },
      }),
      prisma.scheduledSms.findMany({
        where: { userId },
        select: { id: true, status: true, scheduledFor: true },
      }),
      prisma.referral.findMany({
        where: { referrerId: userId },
        select: { id: true, status: true, rewardAmount: true, createdAt: true },
      }),
      prisma.pipeline.findMany({
        where: { userId },
        include: { stages: { select: { id: true, name: true, probability: true } } },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        select: { id: true, action: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.message.count({
        where: { lead: { userId } },
      }),
    ]);

    // Extract results, defaulting to empty arrays on failure with proper typing
    const getResult = <T>(result: PromiseSettledResult<T[]>, name: string): T[] => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        console.log(`[AI Brain] Successfully fetched ${name}:`, data.length, 'items');
        return data;
      } else {
        // Handle Prisma errors for missing columns/tables gracefully
        const error = result.reason;
        if (error?.code === 'P2022' || error?.code === 'P2021') {
          console.warn(`[AI Brain] Database schema mismatch for ${name}:`, error.message);
          console.warn(`[AI Brain] Error code:`, error?.code, 'Meta:', error?.meta);
          return [];
        }
        console.error(`[AI Brain] Error fetching ${name}:`, error);
        console.error(`[AI Brain] Error details:`, {
          code: error?.code,
          message: error?.message,
          meta: error?.meta,
        });
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
    const emailDripCampaigns = getResult(results[15], 'emailDripCampaigns');
    const genericCampaigns = getResult(results[16], 'genericCampaigns');
    const outboundCalls = getResult(results[17], 'outboundCalls');
    const smsDripCampaigns = getResult(results[18], 'smsDripCampaigns');
    const websites = getResult(results[19], 'websites');
    const leadScores = getResult<{ leadScore: number | null }>(results[20], 'leadScores');

    // Phase 1A: Financial
    const soshogleTransactions = getResult(results[21], 'soshogleTransactions');
    const soshogleWallets = getResult(results[22], 'soshogleWallets');
    const creditScores = getResult(results[23], 'creditScores');
    const achSettlements = getResult(results[24], 'achSettlements');
    const bnplApplications = getResult(results[25], 'bnplApplications');
    const cashTransactions = getResult(results[26], 'cashTransactions');
    const fraudAlerts = getResult(results[27], 'fraudAlerts');

    // Phase 1B: E-commerce, Inventory, POS
    const products = getResult(results[28], 'products');
    const orders = getResult(results[29], 'orders');
    const storefronts = getResult(results[30], 'storefronts');
    const inventoryItems = getResult(results[31], 'inventoryItems');
    const inventoryAlerts = getResult(results[32], 'inventoryAlerts');
    const reservations = getResult(results[33], 'reservations');
    const restaurantTables = getResult(results[34], 'restaurantTables');

    // Phase 1C: Team, Voice, Integrations
    const teamMembers = getResult(results[35], 'teamMembers');
    const voiceAgents = getResult(results[36], 'voiceAgents');
    const voiceUsage = getResult(results[37], 'voiceUsage');
    const channelConnections = getResult(results[38], 'channelConnections');
    const calendarConnections = getResult(results[39], 'calendarConnections');
    const scheduledEmails = getResult(results[40], 'scheduledEmails');
    const scheduledSms = getResult(results[41], 'scheduledSms');
    const referrals = getResult(results[42], 'referrals');
    const pipelines = getResult(results[43], 'pipelines');
    const auditLogs = getResult(results[44], 'auditLogs');
    const directMessageCount = results[45]?.status === 'fulfilled' ? (results[45].value as number) : 0;

    // Fetch Industry-Specific data conditionally
    let reData = { properties: 0, fsbo: 0, cma: 0, presentations: 0, marketStats: 0 };
    let industryData: Record<string, any> = {};
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { industry: true } });
      const industry = user?.industry;

      if (industry === 'REAL_ESTATE') {
        const reResults = await Promise.allSettled([
          prisma.rEProperty.count({ where: { userId } }),
          prisma.rEFSBOListing.count({ where: { userId } }),
          prisma.rECMAReport.count({ where: { userId } }),
          prisma.rEListingPresentation.count({ where: { userId } }),
          prisma.rEMarketStats.count({ where: { userId } }),
        ]);
        reData = {
          properties: reResults[0].status === 'fulfilled' ? reResults[0].value : 0,
          fsbo: reResults[1].status === 'fulfilled' ? reResults[1].value : 0,
          cma: reResults[2].status === 'fulfilled' ? reResults[2].value : 0,
          presentations: reResults[3].status === 'fulfilled' ? reResults[3].value : 0,
          marketStats: reResults[4].status === 'fulfilled' ? reResults[4].value : 0,
        };
        industryData = { type: 'REAL_ESTATE', ...reData };
      }

      if (industry === 'DENTAL' || industry === 'HEALTHCARE' || industry === 'MEDICAL') {
        const dResults = await Promise.allSettled([
          prisma.bookingAppointment.count({ where: { userId, startTime: { gte: new Date() } } }),
          prisma.bookingAppointment.count({ where: { userId, status: 'NO_SHOW' } }),
          prisma.bookingAppointment.count({ where: { userId } }),
        ]);
        industryData = {
          type: industry,
          upcomingAppointments: dResults[0].status === 'fulfilled' ? dResults[0].value : 0,
          noShows: dResults[1].status === 'fulfilled' ? dResults[1].value : 0,
          totalAppointments: dResults[2].status === 'fulfilled' ? dResults[2].value : 0,
        };
      }

      if (industry === 'RESTAURANT' || industry === 'FOOD_SERVICE') {
        industryData = {
          type: industry,
          reservations: reservations.length,
          tables: restaurantTables.length,
          avgPartySize: reservations.length > 0
            ? Math.round(reservations.reduce((s: number, r: any) => s + (r.partySize || 0), 0) / reservations.length)
            : 0,
        };
      }

      if (industry === 'SPORTS_CLUB' || industry === 'YOUTH_SPORTS') {
        const clubResults = await Promise.allSettled([
          prisma.clubOSRegistration.count({ where: { program: { userId } } }),
          prisma.clubOSProgram.count({ where: { userId } }),
          prisma.clubOSTeam.count({ where: { division: { userId } } }),
          prisma.clubOSSchedule.count({ where: { userId } }),
        ]);
        industryData = {
          type: industry,
          registrations: clubResults[0].status === 'fulfilled' ? clubResults[0].value : 0,
          programs: clubResults[1].status === 'fulfilled' ? clubResults[1].value : 0,
          teams: clubResults[2].status === 'fulfilled' ? clubResults[2].value : 0,
          schedules: clubResults[3].status === 'fulfilled' ? clubResults[3].value : 0,
        };
      }
    } catch { /* Industry tables may not exist */ }

    console.log('[AI Brain] Data summary:', {
      leads: leads.length, deals: deals.length, tasks: tasks.length,
      appointments: appointments.length, callLogs: callLogs.length,
      payments: payments.length, invoices: invoices.length,
      emailCampaigns: emailCampaigns.length, smsCampaigns: smsCampaigns.length,
      conversations: conversations.length, reviews: reviews.length,
      workflows: workflows.length, websites: websites.length,
      soshogleTransactions: soshogleTransactions.length, products: products.length,
      orders: orders.length, inventoryItems: inventoryItems.length,
      reservations: reservations.length, teamMembers: teamMembers.length,
      voiceAgents: voiceAgents.length, channelConnections: channelConnections.length,
      referrals: referrals.length, directMessageCount, reData,
    });

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

    // Calculate overall health (weighted average of all data dimensions)
    const orderCount = (extData.orders || []).length;
    const fraudOpen = (extData.fraudAlerts || []).filter((f: any) => f.status === 'OPEN').length;
    const invLow = (extData.inventoryItems || []).filter((i: any) => i.quantity <= (i.minQuantity || 5)).length;
    const healthFactors = {
      revenue: totalRevenue > 0 ? 100 : 50,
      leads: activeLeads > 0 ? 100 : 50,
      conversion: conversionRate > 10 ? 100 : conversionRate * 10,
      satisfaction: customerSatisfaction,
      ecommerce: orderCount > 0 ? 100 : (extData.products || []).length > 0 ? 70 : 50,
      security: fraudOpen === 0 ? 100 : fraudOpen < 3 ? 60 : 20,
      inventory: invLow === 0 ? 100 : 50,
    };
    const overallHealth = Math.round(
      (healthFactors.revenue * 0.2 +
        healthFactors.leads * 0.15 +
        healthFactors.conversion * 0.2 +
        healthFactors.satisfaction * 0.15 +
        healthFactors.ecommerce * 0.1 +
        healthFactors.security * 0.1 +
        healthFactors.inventory * 0.1)
    );

    // Build extended data bundle for hemisphere builders
    const extData = {
      soshogleTransactions, soshogleWallets, creditScores, achSettlements,
      bnplApplications, cashTransactions, fraudAlerts,
      products, orders, storefronts, inventoryItems, inventoryAlerts,
      reservations, restaurantTables,
      teamMembers, voiceAgents, voiceUsage, channelConnections, calendarConnections,
      scheduledEmails, scheduledSms, referrals, pipelines, auditLogs, directMessageCount,
    };

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
      emailDripCampaigns,
      genericCampaigns,
      outboundCalls,
      smsDripCampaigns,
      websites,
      leadScores,
      workflowEnrollments,
      extData
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

    const brainData: ComprehensiveBrainData = {
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
    this.setCache(cacheKey, brainData);
    return brainData;
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
    emailDripCampaigns: any[],
    genericCampaigns: any[],
    outboundCalls: any[],
    smsDripCampaigns: any[],
    websites: any[],
    leadScores: any[],
    workflowEnrollments: any[],
    ext: Record<string, any> = {}
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

    // Email Drip Campaign Performance
    const activeDrips = emailDripCampaigns.filter((c: any) => c.status === 'ACTIVE');
    const totalDripEnrolled = emailDripCampaigns.reduce((s: number, c: any) => s + (c.totalEnrolled || 0), 0);
    const avgDripOpenRate = emailDripCampaigns.length > 0
      ? emailDripCampaigns.reduce((s: number, c: any) => s + (c.avgOpenRate || 0), 0) / emailDripCampaigns.length
      : 0;

    dataPoints.push({
      id: 'email-drip-performance',
      category: 'Marketing',
      subcategory: 'Email Drip',
      label: 'Email Drip Campaigns',
      value: activeDrips.length,
      unit: 'active',
      status: activeDrips.length > 0 ? 'healthy' : emailDripCampaigns.length > 0 ? 'warning' : 'healthy',
      timestamp: now,
      metadata: { totalEnrolled: totalDripEnrolled, avgOpenRate: avgDripOpenRate },
    });

    // SMS Drip Campaign Performance
    const activeSmsDrips = smsDripCampaigns.filter((c: any) => c.status === 'ACTIVE');
    const totalSmsDripSent = smsDripCampaigns.reduce((s: number, c: any) => s + (c.totalSent || 0), 0);
    const avgSmsReplyRate = smsDripCampaigns.length > 0
      ? smsDripCampaigns.reduce((s: number, c: any) => s + (c.avgReplyRate || 0), 0) / smsDripCampaigns.length
      : 0;

    dataPoints.push({
      id: 'sms-drip-performance',
      category: 'Marketing',
      subcategory: 'SMS Drip',
      label: 'SMS Drip Campaigns',
      value: activeSmsDrips.length,
      unit: 'active',
      status: activeSmsDrips.length > 0 ? 'healthy' : smsDripCampaigns.length > 0 ? 'warning' : 'healthy',
      timestamp: now,
      metadata: { totalSent: totalSmsDripSent, avgReplyRate: avgSmsReplyRate },
    });

    // Generic Campaigns (voice, multi-channel)
    const runningCampaigns = genericCampaigns.filter((c: any) => c.status === 'RUNNING');
    const voiceCampaigns = genericCampaigns.filter((c: any) => c.type === 'VOICE_CALL');
    const totalCampaignCalls = voiceCampaigns.reduce((s: number, c: any) => s + (c.totalCalls || 0), 0);
    const totalCampaignAnswered = voiceCampaigns.reduce((s: number, c: any) => s + (c.answeredCalls || 0), 0);
    const voiceAnswerRate = totalCampaignCalls > 0 ? (totalCampaignAnswered / totalCampaignCalls) * 100 : 0;

    dataPoints.push({
      id: 'generic-campaigns',
      category: 'Marketing',
      subcategory: 'Campaigns',
      label: 'Active Campaigns',
      value: runningCampaigns.length,
      unit: 'campaigns',
      status: runningCampaigns.length > 0 ? 'healthy' : genericCampaigns.length > 0 ? 'warning' : 'healthy',
      timestamp: now,
      metadata: { total: genericCampaigns.length, voiceCalls: totalCampaignCalls, voiceAnswerRate },
    });

    // Outbound Calls
    const scheduledCalls = outboundCalls.filter((c: any) => c.status === 'SCHEDULED');
    const completedOutbound = outboundCalls.filter((c: any) => c.status === 'COMPLETED');
    const outboundCompletionRate = outboundCalls.length > 0 ? (completedOutbound.length / outboundCalls.length) * 100 : 0;

    dataPoints.push({
      id: 'outbound-calls',
      category: 'Communication',
      subcategory: 'Outbound',
      label: 'Outbound Calls',
      value: outboundCalls.length,
      unit: 'calls',
      status: outboundCompletionRate > 50 ? 'healthy' : outboundCalls.length > 0 ? 'warning' : 'healthy',
      timestamp: now,
      metadata: { scheduled: scheduledCalls.length, completed: completedOutbound.length, completionRate: outboundCompletionRate },
    });

    // Websites
    const liveWebsites = websites.filter((w: any) => w.status === 'LIVE' || w.status === 'DEPLOYED');
    const buildingWebsites = websites.filter((w: any) => w.status === 'BUILDING');

    dataPoints.push({
      id: 'websites',
      category: 'Digital',
      subcategory: 'Websites',
      label: 'Websites',
      value: liveWebsites.length,
      unit: 'live',
      status: liveWebsites.length > 0 ? 'healthy' : websites.length > 0 ? 'warning' : 'healthy',
      timestamp: now,
      metadata: { total: websites.length, building: buildingWebsites.length },
    });

    // Lead Scoring Distribution
    const scores = leadScores.map((l: any) => l.leadScore).filter((s: any) => s != null) as number[];
    const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    const hotLeads = scores.filter((s: number) => s >= 80).length;
    const warmLeads = scores.filter((s: number) => s >= 50 && s < 80).length;
    const coldLeads = scores.filter((s: number) => s < 50).length;

    dataPoints.push({
      id: 'lead-scoring',
      category: 'Sales',
      subcategory: 'Scoring',
      label: 'Avg Lead Score',
      value: Math.round(avgScore),
      unit: '/100',
      trend: avgScore >= 60 ? 'up' : avgScore >= 40 ? 'stable' : 'down',
      status: avgScore >= 70 ? 'excellent' : avgScore >= 50 ? 'healthy' : avgScore >= 30 ? 'warning' : 'critical',
      timestamp: now,
      metadata: { hot: hotLeads, warm: warmLeads, cold: coldLeads, total: scores.length },
    });

    // --- FINANCIAL INTELLIGENCE ---
    const txns = ext.soshogleTransactions || [];
    const completedTxns = txns.filter((t: any) => t.status === 'COMPLETED' || t.status === 'SUCCEEDED');
    const txnVolume = completedTxns.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    if (txns.length > 0) {
      dataPoints.push({
        id: 'soshogle-transactions', category: 'Financial', subcategory: 'Transactions',
        label: 'Payment Transactions', value: txns.length, unit: 'transactions',
        trend: txns.length > 10 ? 'up' : 'stable',
        status: completedTxns.length / Math.max(txns.length, 1) > 0.9 ? 'healthy' : 'warning',
        metadata: { volume: txnVolume, completed: completedTxns.length, total: txns.length },
      });
    }

    const wallets = ext.soshogleWallets || [];
    const totalBalance = wallets.reduce((s: number, w: any) => s + (w.balance || 0), 0);
    if (wallets.length > 0) {
      dataPoints.push({
        id: 'wallet-balance', category: 'Financial', subcategory: 'Wallet',
        label: 'Wallet Balance', value: totalBalance / 100, unit: 'USD',
        trend: 'stable', status: totalBalance > 0 ? 'healthy' : 'warning',
        metadata: { wallets: wallets.length },
      });
    }

    const achSett = ext.achSettlements || [];
    if (achSett.length > 0) {
      const pending = achSett.filter((a: any) => a.status === 'PENDING').length;
      dataPoints.push({
        id: 'ach-settlements', category: 'Financial', subcategory: 'ACH',
        label: 'ACH Settlements', value: achSett.length, unit: 'settlements',
        trend: 'stable', status: pending > 5 ? 'warning' : 'healthy',
        metadata: { pending, total: achSett.length },
      });
    }

    const bnpl = ext.bnplApplications || [];
    if (bnpl.length > 0) {
      const approved = bnpl.filter((b: any) => b.status === 'APPROVED').length;
      const bnplTotal = bnpl.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
      dataPoints.push({
        id: 'bnpl-applications', category: 'Financial', subcategory: 'BNPL',
        label: 'Buy Now Pay Later', value: bnpl.length, unit: 'applications',
        trend: bnpl.length > 5 ? 'up' : 'stable', status: approved / Math.max(bnpl.length, 1) > 0.5 ? 'healthy' : 'warning',
        metadata: { approved, totalAmount: bnplTotal },
      });
    }

    const cashTxn = ext.cashTransactions || [];
    if (cashTxn.length > 0) {
      const cashTotal = cashTxn.reduce((s: number, c: any) => s + (c.amount || 0), 0);
      dataPoints.push({
        id: 'cash-transactions', category: 'Financial', subcategory: 'Cash',
        label: 'Cash Transactions', value: cashTxn.length, unit: 'transactions',
        trend: 'stable', status: 'healthy',
        metadata: { totalAmount: cashTotal },
      });
    }

    const frauds = ext.fraudAlerts || [];
    if (frauds.length > 0) {
      const openFraud = frauds.filter((f: any) => f.status === 'OPEN' || f.status === 'INVESTIGATING').length;
      dataPoints.push({
        id: 'fraud-alerts', category: 'Financial', subcategory: 'Fraud',
        label: 'Fraud Alerts', value: openFraud, unit: 'open alerts',
        trend: openFraud > 0 ? 'up' : 'stable', status: openFraud > 3 ? 'critical' : openFraud > 0 ? 'warning' : 'healthy',
        metadata: { open: openFraud, total: frauds.length },
      });
    }

    // --- E-COMMERCE & INVENTORY INTELLIGENCE ---
    const prods = ext.products || [];
    if (prods.length > 0) {
      const lowStock = prods.filter((p: any) => p.stock !== null && p.stock <= 5).length;
      const outOfStock = prods.filter((p: any) => p.stock === 0).length;
      dataPoints.push({
        id: 'product-catalog', category: 'E-commerce', subcategory: 'Products',
        label: 'Product Catalog', value: prods.length, unit: 'products',
        trend: 'stable', status: outOfStock > 0 ? 'warning' : 'healthy',
        metadata: { lowStock, outOfStock, active: prods.filter((p: any) => p.status === 'ACTIVE').length },
      });
    }

    const ords = ext.orders || [];
    if (ords.length > 0) {
      const recentOrds = ords.filter((o: any) => new Date(o.createdAt) >= last7Days);
      const orderRevenue = ords.reduce((s: number, o: any) => s + (o.total || 0), 0);
      dataPoints.push({
        id: 'order-processing', category: 'E-commerce', subcategory: 'Orders',
        label: 'Orders', value: ords.length, unit: 'orders',
        trend: recentOrds.length > ords.length / 4 ? 'up' : 'stable',
        status: 'healthy',
        metadata: { thisWeek: recentOrds.length, totalRevenue: orderRevenue },
      });
    }

    const invItems = ext.inventoryItems || [];
    if (invItems.length > 0) {
      const lowInv = invItems.filter((i: any) => i.quantity <= (i.minQuantity || 5)).length;
      dataPoints.push({
        id: 'inventory-levels', category: 'Inventory', subcategory: 'Stock',
        label: 'Inventory Items', value: invItems.length, unit: 'items',
        trend: 'stable', status: lowInv > invItems.length * 0.3 ? 'critical' : lowInv > 0 ? 'warning' : 'healthy',
        metadata: { lowStock: lowInv, total: invItems.length, alerts: (ext.inventoryAlerts || []).length },
      });
    }

    // --- RESTAURANT & RESERVATIONS ---
    const reservs = ext.reservations || [];
    if (reservs.length > 0) {
      const upcoming = reservs.filter((r: any) => new Date(r.date) >= now).length;
      const noShows = reservs.filter((r: any) => r.status === 'NO_SHOW').length;
      const noShowRate = reservs.length > 0 ? (noShows / reservs.length) * 100 : 0;
      dataPoints.push({
        id: 'reservations', category: 'Restaurant', subcategory: 'Reservations',
        label: 'Reservations', value: reservs.length, unit: 'reservations',
        trend: upcoming > 5 ? 'up' : 'stable', status: noShowRate > 15 ? 'warning' : 'healthy',
        metadata: { upcoming, noShows, noShowRate: Math.round(noShowRate), avgPartySize: Math.round(reservs.reduce((s: number, r: any) => s + (r.partySize || 0), 0) / reservs.length) },
      });
    }

    const tables = ext.restaurantTables || [];
    if (tables.length > 0) {
      const available = tables.filter((t: any) => t.status === 'AVAILABLE').length;
      dataPoints.push({
        id: 'table-utilization', category: 'Restaurant', subcategory: 'Tables',
        label: 'Table Availability', value: available, unit: 'available',
        trend: 'stable', status: available / tables.length < 0.2 ? 'warning' : 'healthy',
        metadata: { available, total: tables.length, totalCapacity: tables.reduce((s: number, t: any) => s + (t.capacity || 0), 0) },
      });
    }

    // --- TEAM & COLLABORATION ---
    const team = ext.teamMembers || [];
    if (team.length > 0) {
      const active = team.filter((t: any) => t.status === 'ACTIVE').length;
      dataPoints.push({
        id: 'team-members', category: 'Team', subcategory: 'Members',
        label: 'Team Size', value: active, unit: 'active members',
        trend: 'stable', status: 'healthy',
        metadata: { active, total: team.length },
      });
    }

    // --- VOICE AI ---
    const vAgents = ext.voiceAgents || [];
    if (vAgents.length > 0) {
      const activeAgents = vAgents.filter((a: any) => a.status === 'ACTIVE' || a.status === 'active').length;
      const totalAgentCalls = vAgents.reduce((s: number, a: any) => s + (a.totalCalls || 0), 0);
      dataPoints.push({
        id: 'voice-agents', category: 'Voice AI', subcategory: 'Agents',
        label: 'Voice Agents', value: vAgents.length, unit: 'agents',
        trend: totalAgentCalls > 50 ? 'up' : 'stable', status: activeAgents > 0 ? 'healthy' : 'warning',
        metadata: { active: activeAgents, totalCalls: totalAgentCalls },
      });
    }

    const vUsage = ext.voiceUsage || [];
    if (vUsage.length > 0) {
      const totalMinutes = vUsage.reduce((s: number, u: any) => s + (u.minutes || 0), 0);
      const totalCost = vUsage.reduce((s: number, u: any) => s + (u.cost || 0), 0);
      dataPoints.push({
        id: 'voice-usage', category: 'Voice AI', subcategory: 'Usage',
        label: 'Voice Usage', value: Math.round(totalMinutes), unit: 'minutes',
        trend: 'stable', status: 'healthy',
        metadata: { totalMinutes, totalCost, avgCostPerMin: totalMinutes > 0 ? (totalCost / totalMinutes).toFixed(2) : 0 },
      });
    }

    // --- INTEGRATIONS ---
    const channels = ext.channelConnections || [];
    const calendars = ext.calendarConnections || [];
    const totalIntegrations = channels.length + calendars.length;
    if (totalIntegrations > 0) {
      const connected = [...channels, ...calendars].filter((c: any) => c.status === 'ACTIVE' || c.status === 'CONNECTED').length;
      dataPoints.push({
        id: 'integrations', category: 'Integrations', subcategory: 'Connections',
        label: 'Active Integrations', value: connected, unit: 'connected',
        trend: 'stable', status: connected < totalIntegrations ? 'warning' : 'healthy',
        metadata: { connected, total: totalIntegrations, channels: channels.length, calendars: calendars.length },
      });
    }

    // --- REFERRALS ---
    const refs = ext.referrals || [];
    if (refs.length > 0) {
      const converted = refs.filter((r: any) => r.status === 'CONVERTED' || r.status === 'REWARDED').length;
      const refRewards = refs.reduce((s: number, r: any) => s + (r.rewardAmount || 0), 0);
      dataPoints.push({
        id: 'referrals', category: 'Marketing', subcategory: 'Referrals',
        label: 'Referral Program', value: refs.length, unit: 'referrals',
        trend: converted > 0 ? 'up' : 'stable', status: 'healthy',
        metadata: { converted, totalRewards: refRewards, conversionRate: refs.length > 0 ? Math.round((converted / refs.length) * 100) : 0 },
      });
    }

    // --- SCHEDULED COMMS ---
    const schedEmails = ext.scheduledEmails || [];
    const schedSms = ext.scheduledSms || [];
    const pendingComms = [...schedEmails, ...schedSms].filter((s: any) => s.status === 'PENDING' || s.status === 'SCHEDULED').length;
    if (schedEmails.length + schedSms.length > 0) {
      dataPoints.push({
        id: 'scheduled-comms', category: 'Communication', subcategory: 'Scheduled',
        label: 'Scheduled Communications', value: pendingComms, unit: 'pending',
        trend: 'stable', status: 'healthy',
        metadata: { emails: schedEmails.length, sms: schedSms.length, directMessages: ext.directMessageCount || 0 },
      });
    }

    // --- PIPELINES ---
    const pipes = ext.pipelines || [];
    if (pipes.length > 0) {
      const totalStages = pipes.reduce((s: number, p: any) => s + (p.stages?.length || 0), 0);
      dataPoints.push({
        id: 'pipeline-structure', category: 'Sales', subcategory: 'Pipelines',
        label: 'Sales Pipelines', value: pipes.length, unit: 'pipelines',
        trend: 'stable', status: 'healthy',
        metadata: { totalStages, pipelines: pipes.map((p: any) => ({ name: p.name, stages: p.stages?.length || 0 })) },
      });
    }

    // Calculate hemisphere health
    const healthyPoints = dataPoints.filter((p) => p.status === 'healthy' || p.status === 'excellent').length;
    const overallHealth = dataPoints.length > 0 ? Math.round((healthyPoints / dataPoints.length) * 100) : 50;
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
