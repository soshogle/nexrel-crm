
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Data Monetization Service
 * Manages user consent, data insights, and revenue sharing for merchant data
 */
export class DataMonetizationService {
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
    // If all required fields are provided, create the insight directly
    if (params.title && params.description && params.dataPoints && params.timeRange && params.confidence !== undefined) {
      return this.createInsight(params as any);
    }

    // Otherwise, generate a demo insight
    const timeRange = params.period || 'last_30_days';
    const insight = {
      insightType: params.insightType,
      category: params.category || 'GENERAL',
      title: `${params.insightType} Insight`,
      description: `Generated insight for ${timeRange}`,
      dataPoints: {
        period: timeRange,
        startDate: params.startDate,
        endDate: params.endDate,
        metrics: {
          totalValue: Math.floor(Math.random() * 10000),
          count: Math.floor(Math.random() * 1000),
          average: Math.floor(Math.random() * 100),
        },
      },
      timeRange,
      confidence: 0.85,
    };

    return this.createInsight({
      userId: params.userId,
      ...insight,
    });
  }

  /**
   * Get data exports for a user
   */
  async getExports(userId: string, filters?: any) {
    // In production, this would query actual exports from the database
    // For now, return demo data
    return [
      {
        id: 'export_1',
        userId,
        status: 'COMPLETED',
        dataType: 'TRANSACTION_SUMMARY',
        format: 'CSV',
        fileSize: 245678,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
        downloadUrl: '/api/exports/export_1/download',
      },
      {
        id: 'export_2',
        userId,
        status: 'PROCESSING',
        dataType: 'CUSTOMER_BEHAVIOR',
        format: 'JSON',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        completedAt: null,
        downloadUrl: null,
      },
    ];
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
    // In production, this would create an export request in the database
    // For now, return a demo export request
    return {
      id: `export_${Date.now()}`,
      userId: params.userId,
      status: 'PROCESSING',
      dataType: params.dataType || params.exportType || 'UNKNOWN',
      format: params.format,
      createdAt: new Date(),
      completedAt: null,
      downloadUrl: null,
    };
  }

  /**
   * Get aggregated statistics
   */
  async getAggregatedStats(userId: string, filter?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    // In production, this would aggregate actual data
    // For now, return demo stats
    return {
      totalRevenue: 2450.75,
      totalAccesses: 1247,
      averageRevenuePerAccess: 1.96,
      topDataTypes: [
        { type: 'TRANSACTION_SUMMARY', count: 567, revenue: 1100.45 },
        { type: 'CUSTOMER_BEHAVIOR', count: 423, revenue: 825.30 },
        { type: 'DEMOGRAPHIC_DATA', count: 257, revenue: 525.00 },
      ],
      revenueByMonth: [
        { month: '2024-01', revenue: 450.25 },
        { month: '2024-02', revenue: 675.50 },
        { month: '2024-03', revenue: 825.00 },
        { month: '2024-04', revenue: 500.00 },
      ],
    };
  }
}

export const dataMonetizationService = new DataMonetizationService();
