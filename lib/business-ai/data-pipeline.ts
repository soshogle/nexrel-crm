/**
 * Business AI Data Pipeline
 * Aggregates all CRM data in real-time for the AI brain
 */

import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';

export interface BusinessDataSnapshot {
  // Revenue & Financials
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    lastYear: number;
    byProduct: Array<{ productId: string; productName: string; revenue: number }>;
    byPeriod: Array<{ period: string; revenue: number }>;
    trend: 'up' | 'down' | 'stable';
    growthRate: number;
  };
  
  // Leads & Pipeline
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
    lost: number;
    bySource: Array<{ source: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    averageScore: number;
    conversionRate: number;
    trend: 'up' | 'down' | 'stable';
  };
  
  // Deals & Sales
  deals: {
    total: number;
    open: number;
    won: number;
    lost: number;
    totalValue: number;
    openPipelineValue: number; // Value of open deals only (for forecasting)
    averageValue: number;
    byStage: Array<{ stageId: string; stageName: string; count: number; value: number }>;
    openByStage: Array<{ stageId: string; stageName: string; count: number; value: number }>; // Open deals only
    winRate: number;
    averageSalesCycle: number; // days
    trend: 'up' | 'down' | 'stable';
  };
  
  // Customers
  customers: {
    total: number;
    active: number;
    new: number;
    churned: number;
    averageLifetimeValue: number;
    retentionRate: number;
    byTier: Array<{ tier: string; count: number }>;
  };
  
  // Products & Inventory
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
    topSelling: Array<{ productId: string; productName: string; sales: number; revenue: number }>;
    slowMoving: Array<{ productId: string; productName: string; daysSinceSale: number }>;
  };
  
  // Orders
  orders: {
    total: number;
    pending: number;
    completed: number;
    canceled: number;
    totalValue: number;
    averageOrderValue: number;
    byStatus: Array<{ status: string; count: number; value: number }>;
  };
  
  // Communication & Engagement
  communication: {
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    smsSent: number;
    smsReplied: number;
    callsMade: number;
    callsAnswered: number;
    responseRate: number;
    averageResponseTime: number; // minutes
  };
  
  // Workflows & Automation
  workflows: {
    total: number;
    active: number;
    enrollments: number;
    completions: number;
    averageCompletionRate: number;
    topPerforming: Array<{ workflowId: string; workflowName: string; completionRate: number }>;
  };
  
  // Appointments & Bookings
  appointments: {
    total: number;
    upcoming: number;
    completed: number;
    canceled: number;
    noShowRate: number;
    averageBookingValue: number;
  };
  
  // Industry-specific data
  industryData: Record<string, any>;
  
  // Timestamps
  snapshotAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

export class BusinessDataPipeline {
  /**
   * Get complete business data snapshot for a user
   */
  async getBusinessSnapshot(
    userId: string,
    industry?: Industry,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<BusinessDataSnapshot> {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);
    const periodEnd = now;
    
    const lastPeriodStart = this.getPeriodStart(
      new Date(periodStart.getTime() - 1),
      period
    );
    const lastPeriodEnd = periodStart;

    // Fetch all data in parallel
    const [
      revenueData,
      leadsData,
      dealsData,
      customersData,
      productsData,
      ordersData,
      communicationData,
      workflowsData,
      appointmentsData,
    ] = await Promise.all([
      this.getRevenueData(userId, periodStart, periodEnd, lastPeriodStart, lastPeriodEnd),
      this.getLeadsData(userId, periodStart, periodEnd),
      this.getDealsData(userId, periodStart, periodEnd),
      this.getCustomersData(userId, periodStart, periodEnd),
      this.getProductsData(userId),
      this.getOrdersData(userId, periodStart, periodEnd),
      this.getCommunicationData(userId, periodStart, periodEnd),
      this.getWorkflowsData(userId, periodStart, periodEnd),
      this.getAppointmentsData(userId, periodStart, periodEnd),
    ]);

    // Get industry-specific data
    const industryData = industry
      ? await this.getIndustrySpecificData(userId, industry, periodStart, periodEnd)
      : {};

    return {
      revenue: revenueData,
      leads: leadsData,
      deals: dealsData,
      customers: customersData,
      products: productsData,
      orders: ordersData,
      communication: communicationData,
      workflows: workflowsData,
      appointments: appointmentsData,
      industryData,
      snapshotAt: now,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Get revenue data
   */
  private async getRevenueData(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    lastPeriodStart: Date,
    lastPeriodEnd: Date
  ) {
    // Get payments/revenue
    const payments = await prisma.payment.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
        status: 'SUCCEEDED',
      },
    });

    const lastPeriodPayments = await prisma.payment.findMany({
      where: {
        userId,
        createdAt: { gte: lastPeriodStart, lte: lastPeriodEnd },
        status: 'SUCCEEDED',
      },
    });

    const thisMonthRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const lastMonthRevenue = lastPeriodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get revenue by product
    const orders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
        status: { not: 'CANCELED' as any },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const revenueByProduct = new Map<string, { productId: string; productName: string; revenue: number }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = revenueByProduct.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          revenue: 0,
        };
        existing.revenue += item.total;
        revenueByProduct.set(item.productId, existing);
      });
    });

    // Get revenue by period (daily for last 30 days)
    const revenueByPeriod: Array<{ period: string; revenue: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(periodEnd);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayPayments = await prisma.payment.findMany({
        where: {
          userId,
          createdAt: { gte: dayStart, lte: dayEnd },
          status: 'SUCCEEDED',
        },
      });
      
      revenueByPeriod.push({
        period: dayStart.toISOString().split('T')[0],
        revenue: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      });
    }

    const growthRate = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    return {
      total: thisMonthRevenue,
      thisMonth: thisMonthRevenue,
      lastMonth: lastMonthRevenue,
      thisYear: thisMonthRevenue, // Simplified - would need year calculation
      lastYear: lastMonthRevenue,
      byProduct: Array.from(revenueByProduct.values()),
      byPeriod: revenueByPeriod,
      trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
      growthRate,
    };
  }

  /**
   * Get leads data
   */
  private async getLeadsData(userId: string, periodStart: Date, periodEnd: Date) {
    const allLeads = await prisma.lead.findMany({
      where: { userId },
    });

    const periodLeads = allLeads.filter(
      l => l.createdAt >= periodStart && l.createdAt <= periodEnd
    );

    const bySource = new Map<string, number>();
    const byStatus = new Map<string, number>();
    let totalScore = 0;
    let scoredCount = 0;

    allLeads.forEach(lead => {
      bySource.set(lead.source || 'unknown', (bySource.get(lead.source || 'unknown') || 0) + 1);
      byStatus.set(lead.status, (byStatus.get(lead.status) || 0) + 1);
      if (lead.leadScore) {
        totalScore += lead.leadScore;
        scoredCount++;
      }
    });

    const converted = allLeads.filter(l => l.status === 'CONVERTED').length;
    const lost = allLeads.filter(l => l.status === 'LOST').length;
    const total = allLeads.length;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    // Calculate trend (simplified)
    const lastPeriodLeads = allLeads.filter(
      l => l.createdAt < periodStart && l.createdAt >= new Date(periodStart.getTime() - (periodEnd.getTime() - periodStart.getTime()))
    );
    const trend = periodLeads.length > lastPeriodLeads.length ? 'up' : 
                  periodLeads.length < lastPeriodLeads.length ? 'down' : 'stable';

    return {
      total,
      new: allLeads.filter(l => l.status === 'NEW').length,
      qualified: allLeads.filter(l => l.status === 'QUALIFIED').length,
      converted,
      lost,
      bySource: Array.from(bySource.entries()).map(([source, count]) => ({ source, count })),
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      averageScore: scoredCount > 0 ? totalScore / scoredCount : 0,
      conversionRate,
      trend,
    };
  }

  /**
   * Get deals data
   */
  private async getDealsData(userId: string, periodStart: Date, periodEnd: Date) {
    const deals = await prisma.deal.findMany({
      where: { userId },
      include: {
        stage: true,
      },
    });

    const openDeals = deals.filter(d => !d.actualCloseDate);
    const wonDeals = deals.filter(d => d.actualCloseDate && !d.lostReason);
    const lostDeals = deals.filter(d => d.lostReason);

    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const openPipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const averageValue = deals.length > 0 ? totalValue / deals.length : 0;

    const byStage = new Map<string, { stageId: string; stageName: string; count: number; value: number }>();
    const openByStage = new Map<string, { stageId: string; stageName: string; count: number; value: number }>();
    deals.forEach(deal => {
      const existing = byStage.get(deal.stageId) || {
        stageId: deal.stageId,
        stageName: deal.stage.name,
        count: 0,
        value: 0,
      };
      existing.count++;
      existing.value += deal.value || 0;
      byStage.set(deal.stageId, existing);
    });
    openDeals.forEach(deal => {
      const existing = openByStage.get(deal.stageId) || {
        stageId: deal.stageId,
        stageName: deal.stage.name,
        count: 0,
        value: 0,
      };
      existing.count++;
      existing.value += deal.value || 0;
      openByStage.set(deal.stageId, existing);
    });

    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
      : 0;

    // Calculate average sales cycle
    const closedDeals = deals.filter(d => d.actualCloseDate && d.createdAt);
    const salesCycles = closedDeals.map(d => {
      const created = d.createdAt.getTime();
      const closed = d.actualCloseDate!.getTime();
      return (closed - created) / (1000 * 60 * 60 * 24); // days
    });
    const averageSalesCycle = salesCycles.length > 0
      ? salesCycles.reduce((sum, days) => sum + days, 0) / salesCycles.length
      : 0;

    // Trend calculation
    const periodDeals = deals.filter(
      d => d.createdAt >= periodStart && d.createdAt <= periodEnd
    );
    const lastPeriodDeals = deals.filter(
      d => d.createdAt < periodStart && d.createdAt >= new Date(periodStart.getTime() - (periodEnd.getTime() - periodStart.getTime()))
    );
    const trend = periodDeals.length > lastPeriodDeals.length ? 'up' :
                  periodDeals.length < lastPeriodDeals.length ? 'down' : 'stable';

    return {
      total: deals.length,
      open: openDeals.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      totalValue,
      openPipelineValue,
      averageValue,
      byStage: Array.from(byStage.values()),
      openByStage: Array.from(openByStage.values()),
      winRate,
      averageSalesCycle,
      trend,
    };
  }

  /**
   * Get customers data
   */
  private async getCustomersData(userId: string, periodStart: Date, periodEnd: Date) {
    // Customers are leads that converted or have orders
    const convertedLeads = await prisma.lead.findMany({
      where: {
        userId,
        status: 'CONVERTED',
      },
    });

    const orders = await prisma.order.findMany({
      where: { userId },
      distinct: ['customerEmail'],
    });

    const uniqueCustomers = new Set([
      ...convertedLeads.map(l => l.email).filter(Boolean),
      ...orders.map(o => o.customerEmail),
    ]);

    // Calculate customer lifetime value from orders
    const customerOrders = await prisma.order.findMany({
      where: { userId },
      include: { items: true },
    });

    const customerLTV = new Map<string, number>();
    customerOrders.forEach(order => {
      const existing = customerLTV.get(order.customerEmail) || 0;
      customerLTV.set(order.customerEmail, existing + order.total);
    });

    const ltvValues = Array.from(customerLTV.values());
    const averageLTV = ltvValues.length > 0
      ? ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length
      : 0;

    // New customers this period
    const newCustomers = orders.filter(
      o => o.createdAt >= periodStart && o.createdAt <= periodEnd
    ).length;

    return {
      total: uniqueCustomers.size,
      active: uniqueCustomers.size, // Simplified
      new: newCustomers,
      churned: 0, // Would need churn calculation
      averageLifetimeValue: averageLTV,
      retentionRate: 85, // Simplified - would need calculation
      byTier: [], // Would need tier calculation
    };
  }

  /**
   * Get products data
   */
  private async getProductsData(userId: string) {
    const products = await prisma.product.findMany({
      where: { userId },
      include: {
        orders: true,
      },
    });

    const activeProducts = products.filter(p => p.active);
    const lowStock = products.filter(p => p.inventory > 0 && p.inventory < 10);
    const outOfStock = products.filter(p => p.inventory === 0);

    const productSales = products.map(product => {
      const sales = product.orders.reduce((sum, item) => sum + item.quantity, 0);
      const revenue = product.orders.reduce((sum, item) => sum + item.total, 0);
      return {
        productId: product.id,
        productName: product.name,
        sales,
        revenue,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
      total: products.length,
      active: activeProducts.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      topSelling: productSales.slice(0, 10),
      slowMoving: [],
    };
  }

  /**
   * Get orders data
   */
  private async getOrdersData(userId: string, periodStart: Date, periodEnd: Date) {
    const orders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: { items: true },
    });

    const pending = orders.filter(o => o.status === 'PENDING').length;
    const completed = orders.filter(o => ['DELIVERED', 'SHIPPED', 'PROCESSING'].includes(o.status)).length;
    const canceled = orders.filter(o => o.status === 'CANCELED').length;

    const totalValue = orders.reduce((sum, o) => sum + o.total, 0);
    const averageOrderValue = orders.length > 0 ? totalValue / orders.length : 0;

    const byStatus = new Map<string, { status: string; count: number; value: number }>();
    orders.forEach(order => {
      const existing = byStatus.get(order.status) || {
        status: order.status,
        count: 0,
        value: 0,
      };
      existing.count++;
      existing.value += order.total;
      byStatus.set(order.status, existing);
    });

    return {
      total: orders.length,
      pending,
      completed,
      canceled,
      totalValue,
      averageOrderValue,
      byStatus: Array.from(byStatus.values()),
    };
  }

  /**
   * Get communication data
   */
  private async getCommunicationData(userId: string, periodStart: Date, periodEnd: Date) {
    // Email campaigns
    const emailCampaigns = await prisma.emailCampaign.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        recipients: true,
      },
    });

    let emailsSent = 0;
    let emailsOpened = 0;
    let emailsClicked = 0;

    const sentStatuses = ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'];
    emailCampaigns.forEach(campaign => {
      campaign.recipients.forEach(cd => {
        if (cd.sentAt != null || sentStatuses.includes(cd.status)) emailsSent++;
        if (cd.openedAt) emailsOpened++;
        if (cd.clickedAt) emailsClicked++;
      });
    });

    // SMS campaigns
    const smsCampaigns = await prisma.smsCampaign.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const smsSent = smsCampaigns.reduce((sum, c) => sum + (c.totalSent || 0), 0);
    const smsReplied = 0; // Would need SMS reply tracking

    // Calls
    const calls = await prisma.callLog.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const callsMade = calls.length;
    const callsAnswered = calls.filter(c => c.status === 'COMPLETED').length;

    const responseRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
    const averageResponseTime = 0; // Would need calculation

    return {
      emailsSent,
      emailsOpened,
      emailsClicked,
      smsSent,
      smsReplied,
      callsMade,
      callsAnswered,
      responseRate,
      averageResponseTime,
    };
  }

  /**
   * Get workflows data
   */
  private async getWorkflowsData(userId: string, periodStart: Date, periodEnd: Date) {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
    });

    const enrollments = await prisma.workflowEnrollment.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const completions = enrollments.filter(e => e.status === 'COMPLETED').length;
    const averageCompletionRate = enrollments.length > 0
      ? (completions / enrollments.length) * 100
      : 0;

    // Top performing workflows
    const workflowPerformance = new Map<string, { workflowId: string; workflowName: string; completions: number; enrollments: number }>();
    enrollments.forEach(enrollment => {
      const existing = workflowPerformance.get(enrollment.workflowId) || {
        workflowId: enrollment.workflowId,
        workflowName: workflows.find(w => w.id === enrollment.workflowId)?.name || 'Unknown',
        completions: 0,
        enrollments: 0,
      };
      existing.enrollments++;
      if (enrollment.status === 'COMPLETED') existing.completions++;
      workflowPerformance.set(enrollment.workflowId, existing);
    });

    const topPerforming = Array.from(workflowPerformance.values())
      .map(w => ({
        workflowId: w.workflowId,
        workflowName: w.workflowName,
        completionRate: w.enrollments > 0 ? (w.completions / w.enrollments) * 100 : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);

    return {
      total: workflows.length,
      active: workflows.filter(w => w.status === 'ACTIVE').length,
      enrollments: enrollments.length,
      completions,
      averageCompletionRate,
      topPerforming,
    };
  }

  /**
   * Get appointments data
   */
  private async getAppointmentsData(userId: string, periodStart: Date, periodEnd: Date) {
    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        userId,
        startTime: { gte: periodStart, lte: periodEnd },
      },
    });

    const now = new Date();
    const upcoming = appointments.filter(a => a.startTime > now).length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const canceled = appointments.filter(a => a.status === 'CANCELED').length;

    const noShowRate = appointments.length > 0
      ? (appointments.filter(a => a.status === 'NO_SHOW').length / appointments.length) * 100
      : 0;

    return {
      total: appointments.length,
      upcoming,
      completed,
      canceled,
      noShowRate,
      averageBookingValue: 0, // Would need calculation
    };
  }

  /**
   * Get industry-specific data
   */
  private async getIndustrySpecificData(
    userId: string,
    industry: Industry,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    switch (industry) {
      case 'REAL_ESTATE':
        // Real estate specific metrics
        const reProperties = await prisma.rEProperty.findMany({
          where: { userId },
        });
        data.properties = {
          total: reProperties.length,
          active: reProperties.filter(p => p.listingStatus === 'ACTIVE').length,
          sold: reProperties.filter(p => p.listingStatus === 'SOLD').length,
        };
        break;

      case 'DENTAL':
      case 'MEDICAL':
        // Medical/dental specific metrics
        const patients = await prisma.lead.findMany({
          where: { userId },
        });
        data.patients = {
          total: patients.length,
          new: patients.filter(p => {
            const created = p.createdAt;
            return created >= periodStart && created <= periodEnd;
          }).length,
        };
        break;

      case 'RESTAURANT':
        // Restaurant specific metrics
        const reservations = await prisma.reservation.findMany({
          where: { userId },
        });
        data.reservations = {
          total: reservations.length,
          upcoming: reservations.filter(r => r.reservationTime > new Date()).length,
        };
        break;
    }

    return data;
  }

  /**
   * Get period start date
   */
  private getPeriodStart(date: Date, period: 'day' | 'week' | 'month' | 'quarter' | 'year'): Date {
    const start = new Date(date);
    
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }
}

export const businessDataPipeline = new BusinessDataPipeline();
