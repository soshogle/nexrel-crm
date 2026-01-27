
/**
 * Soshogle Pay - Analytics Service
 * Calculate payment metrics and insights for the CRM
 */

import { prisma } from '@/lib/db';

export interface AnalyticsData {
  totalRevenue: number;
  transactionCount: number;
  averageOrderValue: number;
  conversionRate: number;
  topPaymentMethods: Array<{ method: string; count: number; revenue: number }>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  customerLifetimeValue: number;
  repeatCustomerRate: number;
  fraudRiskDistribution: Array<{ tier: string; count: number }>;
  walletUsageRate: number;
}

export class PaymentAnalyticsService {
  /**
   * Get comprehensive payment analytics for a user
   */
  async getPaymentAnalytics(
    userId: string,
    dateRange: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<AnalyticsData> {
    const { startDate, endDate } = this.getDateRange(dateRange);

    const [
      totalRevenue,
      transactionCount,
      transactions,
      paymentMethodBreakdown,
      fraudStats,
      walletStats,
    ] = await Promise.all([
      this.getTotalRevenue(userId, startDate, endDate),
      this.getTransactionCount(userId, startDate, endDate),
      this.getTransactions(userId, startDate, endDate),
      this.getPaymentMethodBreakdown(userId, startDate, endDate),
      this.getFraudRiskDistribution(userId, startDate, endDate),
      this.getWalletUsageStats(userId, startDate, endDate),
    ]);

    const averageOrderValue =
      transactionCount > 0 ? totalRevenue / transactionCount : 0;
    const revenueByDay = await this.getRevenueByDay(userId, startDate, endDate);
    const conversionRate = await this.getConversionRate(userId, startDate, endDate);
    const customerMetrics = await this.getCustomerMetrics(userId, startDate, endDate);

    return {
      totalRevenue,
      transactionCount,
      averageOrderValue,
      conversionRate,
      topPaymentMethods: paymentMethodBreakdown,
      revenueByDay,
      customerLifetimeValue: customerMetrics.lifetimeValue,
      repeatCustomerRate: customerMetrics.repeatRate,
      fraudRiskDistribution: fraudStats,
      walletUsageRate: walletStats.usageRate,
    };
  }

  /**
   * Get total revenue for period (includes digital + cash payments)
   */
  private async getTotalRevenue(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Get customer for this user
    const customer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId },
    });

    // Digital payments revenue
    const digitalRevenue = customer
      ? await prisma.soshogleTransaction.aggregate({
          where: {
            customerId: customer.id,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        })
      : { _sum: { amount: 0 } };

    // Cash payments revenue (sales only)
    const cashRevenue = await prisma.cashTransaction.aggregate({
      where: {
        userId,
        type: 'SALE',
        deletedAt: null,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    return (digitalRevenue._sum.amount || 0) + (cashRevenue._sum.amount || 0);
  }

  /**
   * Get transaction count (includes digital + cash payments)
   */
  private async getTransactionCount(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const customer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId },
    });

    // Digital payments count
    const digitalCount = customer
      ? await prisma.soshogleTransaction.count({
          where: {
            customerId: customer.id,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate },
          },
        })
      : 0;

    // Cash payments count (all types)
    const cashCount = await prisma.cashTransaction.count({
      where: {
        userId,
        deletedAt: null,
        transactionDate: { gte: startDate, lte: endDate },
      },
    });

    return digitalCount + cashCount;
  }

  /**
   * Get all transactions for period
   */
  private async getTransactions(userId: string, startDate: Date, endDate: Date) {
    const customer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId },
    });

    if (!customer) return [];

    return await prisma.soshogleTransaction.findMany({
      where: {
        customerId: customer.id,
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        paymentIntent: true,
      },
    });
  }

  /**
   * Get payment method breakdown
   */
  private async getPaymentMethodBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    const transactions = await this.getTransactions(userId, startDate, endDate);

    const methodMap = new Map<string, { count: number; revenue: number }>();

    transactions.forEach((t: any) => {
      const method = t.paymentIntent?.paymentMethod?.type || t.type || 'unknown';
      const existing = methodMap.get(method) || { count: 0, revenue: 0 };
      methodMap.set(method, {
        count: existing.count + 1,
        revenue: existing.revenue + t.amount,
      });
    });

    return Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Get revenue by day
   */
  private async getRevenueByDay(userId: string, startDate: Date, endDate: Date) {
    const transactions = await this.getTransactions(userId, startDate, endDate);

    const dailyRevenue = new Map<string, number>();

    transactions.forEach((t) => {
      const date = t.createdAt.toISOString().split('T')[0];
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + t.amount);
    });

    // Fill in missing dates with 0 revenue
    const days: Array<{ date: string; revenue: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        revenue: dailyRevenue.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  /**
   * Calculate conversion rate (completed vs all transactions)
   */
  private async getConversionRate(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const customer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId },
    });

    if (!customer) return 0;

    const [completed, total] = await Promise.all([
      prisma.soshogleTransaction.count({
        where: {
          customerId: customer.id,
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.soshogleTransaction.count({
        where: {
          customerId: customer.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return total > 0 ? (completed / total) * 100 : 0;
  }

  /**
   * Get customer lifetime value and repeat rate
   */
  private async getCustomerMetrics(userId: string, startDate: Date, endDate: Date) {
    const transactions = await this.getTransactions(userId, startDate, endDate);

    // Since we're analyzing for a single user, calculate based on their own behavior
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const lifetimeValue = totalRevenue;

    // Calculate if user is a repeat customer (2+ purchases)
    const purchaseCount = transactions.length;
    const repeatRate = purchaseCount >= 2 ? 100 : 0;

    return {
      lifetimeValue,
      repeatRate,
    };
  }

  /**
   * Get fraud risk distribution
   * Note: Fraud data is stored in metadata field
   */
  private async getFraudRiskDistribution(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    const customer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId },
    });

    if (!customer) return [];

    const transactions = await prisma.soshogleTransaction.findMany({
      where: {
        customerId: customer.id,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        metadata: true,
      },
    });

    const riskMap = new Map<string, number>();

    transactions.forEach((t: any) => {
      // Extract fraud tier from metadata if available
      const metadata = typeof t.metadata === 'object' ? t.metadata : {};
      const tier = (metadata as any).fraud_tier || 'LOW';
      riskMap.set(tier, (riskMap.get(tier) || 0) + 1);
    });

    return Array.from(riskMap.entries())
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get wallet usage statistics
   */
  private async getWalletUsageStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    const customer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return {
        usageRate: 0,
        walletTransactionCount: 0,
        totalTransactionCount: 0,
      };
    }

    const [walletTransactions, totalTransactions] = await Promise.all([
      prisma.soshogleTransaction.count({
        where: {
          customerId: customer.id,
          type: 'WALLET',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.soshogleTransaction.count({
        where: {
          customerId: customer.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const usageRate =
      totalTransactions > 0 ? (walletTransactions / totalTransactions) * 100 : 0;

    return {
      usageRate,
      walletTransactionCount: walletTransactions,
      totalTransactionCount: totalTransactions,
    };
  }

  /**
   * Parse date range string into start and end dates
   */
  private getDateRange(range: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  /**
   * Export analytics to CSV format
   */
  async exportToCSV(userId: string, dateRange: '7d' | '30d' | '90d' | '1y'): Promise<string> {
    const analytics = await this.getPaymentAnalytics(userId, dateRange);

    let csv = 'Date,Revenue\n';
    analytics.revenueByDay.forEach((day) => {
      csv += `${day.date},${(day.revenue / 100).toFixed(2)}\n`;
    });

    return csv;
  }
}

export const analyticsService = new PaymentAnalyticsService();
