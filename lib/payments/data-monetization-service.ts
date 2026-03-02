
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Data Monetization Service
 * Manages user consent, data insights, and revenue sharing for merchant data
 */
export class DataMonetizationService {
  private resolvePeriodStart(period: string, endDate = new Date()): Date {
    const d = new Date(endDate);
    switch (period) {
      case 'DAILY':
        d.setDate(d.getDate() - 1);
        break;
      case 'WEEKLY':
        d.setDate(d.getDate() - 7);
        break;
      case 'QUARTERLY':
        d.setMonth(d.getMonth() - 3);
        break;
      case 'YEARLY':
        d.setFullYear(d.getFullYear() - 1);
        break;
      case 'MONTHLY':
      default:
        d.setMonth(d.getMonth() - 1);
        break;
    }
    return d;
  }

  private normalizePeriod(raw?: string): 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' {
    const p = String(raw || 'MONTHLY').toUpperCase();
    if (p === 'DAILY' || p === 'WEEKLY' || p === 'MONTHLY' || p === 'QUARTERLY' || p === 'YEARLY') {
      return p;
    }
    return 'MONTHLY';
  }

  /**
   * Grant data sharing consent
   */
  async grantConsent(params: {
    userId: string;
    sharingLevel: string;
    allowTransactionData: boolean;
    allowBehaviorData: boolean;
    allowDemographicData: boolean;
    allowLocationData: boolean;
    revenueShareEnabled: boolean;
    revenueSharePercentage: number;
  }) {
    return await prisma.dataMonetizationConsent.create({
      data: {
        userId: params.userId,
        status: 'GRANTED',
        sharingLevel: params.sharingLevel as any,
        consentedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        allowTransactionData: params.allowTransactionData,
        allowBehaviorData: params.allowBehaviorData,
        allowDemographicData: params.allowDemographicData,
        allowLocationData: params.allowLocationData,
        revenueShareEnabled: params.revenueShareEnabled,
        revenueSharePercentage: params.revenueSharePercentage,
      },
    });
  }

  /**
   * Revoke data sharing consent
   */
  async revokeConsent(userId: string) {
    const consent = await prisma.dataMonetizationConsent.findFirst({
      where: { userId, status: 'GRANTED' },
    });

    if (!consent) {
      throw new Error('No active consent found');
    }

    return await prisma.dataMonetizationConsent.update({
      where: { id: consent.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Get user's current consent status
   */
  async getConsent(userId: string) {
    return await prisma.dataMonetizationConsent.findFirst({
      where: { userId, status: 'GRANTED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create anonymized insight from aggregated data
   */
  async createInsight(params: {
    userId: string;
    insightType: string;
    category?: string;
    title: string;
    description: string;
    dataPoints: any;
    timeRange: string;
    confidence: number;
  }) {
    // Check if user has granted consent
    const consent = await this.getConsent(params.userId);
    if (!consent) {
      throw new Error('User has not granted data sharing consent');
    }

    return await prisma.dataMonetizationInsight.create({
      data: {
        userId: params.userId,
        insightType: params.insightType,
        category: params.category,
        title: params.title,
        description: params.description,
        dataPoints: params.dataPoints,
        timeRange: params.timeRange,
        confidence: params.confidence,
      },
    });
  }

  /**
   * Get insights for user
   */
  async getInsights(userId: string, filter?: {
    insightType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return await prisma.dataMonetizationInsight.findMany({
      where: {
        userId,
        ...(filter?.insightType && { insightType: filter.insightType }),
        ...(filter?.category && { category: filter.category }),
        ...(filter?.startDate && { createdAt: { gte: filter.startDate } }),
        ...(filter?.endDate && { createdAt: { lte: filter.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Track data access and generate revenue
   */
  async trackDataAccess(userId: string, dataType: string, revenueAmount: number) {
    const consent = await this.getConsent(userId);
    if (!consent || !consent.revenueShareEnabled) {
      return null;
    }

    // Calculate user's share
    const userShare = Math.round((revenueAmount * consent.revenueSharePercentage) / 100);

    // Get or create current period revenue record
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    let revenue = await prisma.dataMonetizationRevenue.findFirst({
      where: { userId, period: currentPeriod },
    });

    if (!revenue) {
      revenue = await prisma.dataMonetizationRevenue.create({
        data: {
          userId,
          period: currentPeriod,
          amount: 0,
          dataAccessCount: 0,
          transactionData: 0,
          behaviorData: 0,
          demographicData: 0,
          locationData: 0,
        },
      });
    }

    // Update revenue based on data type
    const updateData: any = {
      amount: { increment: userShare },
      dataAccessCount: { increment: 1 },
    };

    switch (dataType) {
      case 'transaction':
        updateData.transactionData = { increment: userShare };
        break;
      case 'behavior':
        updateData.behaviorData = { increment: userShare };
        break;
      case 'demographic':
        updateData.demographicData = { increment: userShare };
        break;
      case 'location':
        updateData.locationData = { increment: userShare };
        break;
    }

    return await prisma.dataMonetizationRevenue.update({
      where: { id: revenue.id },
      data: updateData,
    });
  }

  /**
   * Get revenue summary for user
   */
  async getRevenueSummary(userId: string, filter?: {
    startPeriod?: string;
    endPeriod?: string;
  }) {
    const where: any = { userId };
    
    if (filter?.startPeriod || filter?.endPeriod) {
      where.period = {};
      if (filter.startPeriod) where.period.gte = filter.startPeriod;
      if (filter.endPeriod) where.period.lte = filter.endPeriod;
    }

    const revenues = await prisma.dataMonetizationRevenue.findMany({
      where,
      orderBy: { period: 'desc' },
    });

    // Calculate totals
    const total = revenues.reduce(
      (acc, rev) => ({
        amount: acc.amount + rev.amount,
        accessCount: acc.accessCount + rev.dataAccessCount,
        transactionData: acc.transactionData + rev.transactionData,
        behaviorData: acc.behaviorData + rev.behaviorData,
        demographicData: acc.demographicData + rev.demographicData,
        locationData: acc.locationData + rev.locationData,
      }),
      {
        amount: 0,
        accessCount: 0,
        transactionData: 0,
        behaviorData: 0,
        demographicData: 0,
        locationData: 0,
      }
    );

    return {
      revenues,
      total,
    };
  }

  /**
   * Mark revenue period as paid
   */
  async markRevenuePaid(params: {
    userId: string;
    period: string;
    paymentMethod: string;
    transactionId: string;
  }) {
    const revenue = await prisma.dataMonetizationRevenue.findFirst({
      where: {
        userId: params.userId,
        period: params.period,
        status: 'PENDING',
      },
    });

    if (!revenue) {
      throw new Error('No pending revenue found for this period');
    }

    return await prisma.dataMonetizationRevenue.update({
      where: { id: revenue.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: params.paymentMethod,
        transactionId: params.transactionId,
      },
    });
  }

  /**
   * Generate demo/simulation data for testing
   */
  async generateDemoInsights(userId: string) {
    const demoInsights = [
      {
        insightType: 'spending_pattern',
        category: 'retail',
        title: 'Peak Shopping Hours',
        description: 'Customers are 40% more likely to make purchases between 6-8 PM on weekdays',
        dataPoints: {
          hourly_distribution: [
            { hour: 6, percentage: 15 },
            { hour: 7, percentage: 25 },
            { hour: 8, percentage: 20 },
          ],
        },
        timeRange: 'last_30_days',
        confidence: 0.87,
      },
      {
        insightType: 'category_trend',
        category: 'food_delivery',
        title: 'Popular Food Categories',
        description: 'Pizza and burgers account for 60% of weekend orders',
        dataPoints: {
          categories: [
            { name: 'Pizza', percentage: 35 },
            { name: 'Burgers', percentage: 25 },
            { name: 'Asian', percentage: 20 },
            { name: 'Other', percentage: 20 },
          ],
        },
        timeRange: 'last_quarter',
        confidence: 0.92,
      },
      {
        insightType: 'customer_behavior',
        category: 'loyalty',
        title: 'Repeat Customer Patterns',
        description: 'Customers who receive discounts are 3x more likely to return within 7 days',
        dataPoints: {
          return_rate_with_discount: 0.65,
          return_rate_without_discount: 0.22,
          average_days_between_purchases: 7.3,
        },
        timeRange: 'last_60_days',
        confidence: 0.78,
      },
    ];

    const createdInsights = [];
    for (const insight of demoInsights) {
      try {
        const created = await prisma.dataMonetizationInsight.create({
          data: {
            userId,
            ...insight,
          },
        });
        createdInsights.push(created);
      } catch (error) {
        console.error('Error creating demo insight:', error);
      }
    }

    return createdInsights;
  }

  /**
   * Generate insight (can create or generate demo insight)
   */
  async generateInsight(params: {
    userId: string;
    insightType: string;
    period?: string;
    startDate?: Date;
    endDate?: Date;
    category?: string;
    title?: string;
    description?: string;
    dataPoints?: any;
    timeRange?: string;
    confidence?: number;
  }) {
    const period = this.normalizePeriod(params.period);
    const endDate = params.endDate || new Date();
    const startDate = params.startDate || this.resolvePeriodStart(period, endDate);

    const transactions = await prisma.soshogleTransaction.findMany({
      where: {
        customer: { userId: params.userId },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        customerId: true,
        amount: true,
        type: true,
        status: true,
        createdAt: true,
        processedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const uniqueCustomers = new Set(transactions.map((tx) => tx.customerId)).size;
    const averageOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
    const cardPayments = transactions.filter((tx) => /card/i.test(tx.type)).length;
    const walletPayments = transactions.filter((tx) => /wallet/i.test(tx.type)).length;
    const bnplPayments = transactions.filter((tx) => /bnpl/i.test(tx.type)).length;
    const achPayments = transactions.filter((tx) => /ach/i.test(tx.type)).length;
    const successCount = transactions.filter((tx) => /success|complete|paid/i.test(tx.status)).length;
    const successRate = totalTransactions > 0 ? Number(((successCount / totalTransactions) * 100).toFixed(2)) : 0;

    const fraudCount = await prisma.fraudAlert.count({
      where: {
        userId: params.userId,
        detectedAt: { gte: startDate, lte: endDate },
        riskLevel: { in: ['HIGH', 'CRITICAL'] },
      },
    });
    const fraudRate = totalTransactions > 0 ? Number(((fraudCount / totalTransactions) * 100).toFixed(2)) : 0;

    const processingSamples = transactions
      .filter((tx) => tx.processedAt)
      .map((tx) => tx.processedAt!.getTime() - tx.createdAt.getTime())
      .filter((ms) => ms >= 0);
    const averageProcessingTime =
      processingSamples.length > 0
        ? Math.round(processingSamples.reduce((sum, ms) => sum + ms, 0) / processingSamples.length / 1000)
        : 0;

    const periodMs = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodMs);
    const previousEnd = new Date(startDate.getTime());
    const previousRevenueAgg = await prisma.soshogleTransaction.aggregate({
      where: {
        customer: { userId: params.userId },
        createdAt: { gte: previousStart, lt: previousEnd },
      },
      _sum: { amount: true },
    });
    const previousRevenue = previousRevenueAgg._sum.amount || 0;
    const growthRate =
      previousRevenue > 0
        ? Number((((totalRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2))
        : (totalRevenue > 0 ? 100 : 0);

    const trendMap = new Map<string, { transactions: number; revenue: number }>();
    for (const tx of transactions) {
      const bucket = tx.createdAt.toISOString().slice(0, 10);
      const prev = trendMap.get(bucket) || { transactions: 0, revenue: 0 };
      prev.transactions += 1;
      prev.revenue += tx.amount || 0;
      trendMap.set(bucket, prev);
    }
    const trendData = Array.from(trendMap.entries()).map(([date, values]) => ({
      date,
      ...values,
    }));

    const confidenceScore = Math.min(0.95, Number((0.5 + totalTransactions / 500).toFixed(2)));

    return prisma.dataInsight.create({
      data: {
        userId: params.userId,
        insightType: params.insightType as any,
        period: period as any,
        startDate,
        endDate,
        totalTransactions,
        totalRevenue,
        averageOrderValue,
        uniqueCustomers,
        cardPayments,
        walletPayments,
        bnplPayments,
        achPayments,
        successRate,
        fraudRate,
        averageProcessingTime,
        growthRate,
        trendData: trendData as any,
        dataPoints: totalTransactions,
        confidenceScore,
        notes: params.category || undefined,
      },
    });
  }

  /**
   * Get data exports for a user
   */
  async getExports(userId: string, filters?: any) {
    return prisma.dataExport.findMany({
      where: {
        userId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.exportType ? { exportType: filters.exportType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Request a new data export
   */
  async requestExport(params: {
    userId: string;
    exportType?: string;
    dataType?: string;
    format: string;
    startDate?: Date;
    endDate?: Date;
    dateRange?: {
      start: Date;
      end: Date;
    };
    includeFields?: string[];
    excludeFields?: string[];
    filters?: any;
    anonymized?: boolean;
  }) {
    const now = new Date();
    return prisma.dataExport.create({
      data: {
        userId: params.userId,
        exportType: params.exportType || params.dataType || 'transactions',
        format: params.format as any,
        status: 'PENDING',
        startDate: params.startDate || params.dateRange?.start || now,
        endDate: params.endDate || params.dateRange?.end || now,
        includeFields: params.includeFields || [],
        excludeFields: params.excludeFields || [],
        filters: params.filters || undefined,
        anonymized: params.anonymized ?? true,
      },
    });
  }

  /**
   * Get aggregated statistics
   */
  async getAggregatedStats(userId: string, filter?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const where = {
      userId,
      ...(filter?.startDate || filter?.endDate
        ? {
            createdAt: {
              ...(filter?.startDate ? { gte: filter.startDate } : {}),
              ...(filter?.endDate ? { lte: filter.endDate } : {}),
            },
          }
        : {}),
    };

    const [insights, exports] = await Promise.all([
      prisma.dataInsight.findMany({
        where,
        select: { insightType: true, totalRevenue: true, createdAt: true },
      }),
      prisma.dataExport.findMany({
        where: { userId, ...(filter?.startDate || filter?.endDate ? { createdAt: where.createdAt as any } : {}) },
        select: { exportType: true, status: true, createdAt: true },
      }),
    ]);

    const totalRevenue = insights.reduce((sum, i) => sum + (i.totalRevenue || 0), 0);
    const totalAccesses = exports.filter((e) => e.status === 'COMPLETED').length;
    const averageRevenuePerAccess = totalAccesses > 0 ? totalRevenue / totalAccesses : 0;

    const topTypeMap = new Map<string, { type: string; count: number; revenue: number }>();
    for (const i of insights) {
      const k = String(i.insightType);
      const prev = topTypeMap.get(k) || { type: k, count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += i.totalRevenue || 0;
      topTypeMap.set(k, prev);
    }
    const topDataTypes = Array.from(topTypeMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const monthMap = new Map<string, number>();
    for (const i of insights) {
      const month = i.createdAt.toISOString().slice(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + (i.totalRevenue || 0));
    }
    const revenueByMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, revenue]) => ({ month, revenue }));

    return {
      totalRevenue,
      totalAccesses,
      averageRevenuePerAccess,
      topDataTypes,
      revenueByMonth,
    };
  }
}

export const dataMonetizationService = new DataMonetizationService();
