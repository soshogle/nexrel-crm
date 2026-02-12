/**
 * Business AI Analytics Engine
 * Calculates metrics, predictions, and insights.
 * Predictions use statistical models (lib/business-ai/predictive-models.ts), not LLM.
 */

import { BusinessDataSnapshot } from './data-pipeline';
import { generatePredictions as generateStatisticalPredictions } from './predictive-models';

export interface BusinessHealthScore {
  overall: number; // 0-100
  revenue: number;
  pipeline: number;
  customers: number;
  operations: number;
  trends: {
    revenue: 'up' | 'down' | 'stable';
    leads: 'up' | 'down' | 'stable';
    deals: 'up' | 'down' | 'stable';
  };
  alerts: Array<{
    type: 'warning' | 'critical' | 'info' | 'success';
    message: string;
    metric: string;
    value: any;
  }>;
}

export interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number; // 0-100
  timeframe: string;
  factors: string[];
  explanation?: string; // LLM-generated human-readable explanation
}

export interface Insight {
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems?: string[];
  data?: any;
}

export class BusinessAnalyticsEngine {
  /**
   * Calculate business health score
   */
  calculateHealthScore(data: BusinessDataSnapshot): BusinessHealthScore {
    // Revenue score (0-25 points)
    const revenueScore = this.calculateRevenueScore(data.revenue);
    
    // Pipeline score (0-25 points)
    const pipelineScore = this.calculatePipelineScore(data.leads, data.deals);
    
    // Customer score (0-25 points)
    const customerScore = this.calculateCustomerScore(data.customers);
    
    // Operations score (0-25 points)
    const operationsScore = this.calculateOperationsScore(data);

    const overall = Math.round(
      revenueScore + pipelineScore + customerScore + operationsScore
    );

    // Generate alerts
    const alerts = this.generateAlerts(data);

    return {
      overall: Math.min(100, Math.max(0, overall)),
      revenue: Math.round(revenueScore * 4),
      pipeline: Math.round(pipelineScore * 4),
      customers: Math.round(customerScore * 4),
      operations: Math.round(operationsScore * 4),
      trends: {
        revenue: data.revenue.trend,
        leads: data.leads.trend,
        deals: data.deals.trend,
      },
      alerts,
    };
  }

  /**
   * Calculate revenue score
   */
  private calculateRevenueScore(revenue: BusinessDataSnapshot['revenue']): number {
    let score = 12.5; // Base score

    // Growth rate contribution
    if (revenue.growthRate > 10) score += 6.25;
    else if (revenue.growthRate > 5) score += 3.125;
    else if (revenue.growthRate < -10) score -= 6.25;
    else if (revenue.growthRate < -5) score -= 3.125;

    // Trend contribution
    if (revenue.trend === 'up') score += 6.25;
    else if (revenue.trend === 'down') score -= 6.25;

    return Math.max(0, Math.min(25, score));
  }

  /**
   * Calculate pipeline score
   */
  private calculatePipelineScore(
    leads: BusinessDataSnapshot['leads'],
    deals: BusinessDataSnapshot['deals']
  ): number {
    let score = 12.5; // Base score

    // Conversion rate contribution
    if (leads.conversionRate > 20) score += 6.25;
    else if (leads.conversionRate > 10) score += 3.125;
    else if (leads.conversionRate < 5) score -= 6.25;

    // Win rate contribution
    if (deals.winRate > 50) score += 6.25;
    else if (deals.winRate > 30) score += 3.125;
    else if (deals.winRate < 20) score -= 6.25;

    // Pipeline trend
    if (leads.trend === 'up' && deals.trend === 'up') score += 6.25;
    else if (leads.trend === 'down' && deals.trend === 'down') score -= 6.25;

    return Math.max(0, Math.min(25, score));
  }

  /**
   * Calculate customer score
   */
  private calculateCustomerScore(customers: BusinessDataSnapshot['customers']): number {
    let score = 12.5; // Base score

    // Retention rate contribution
    if (customers.retentionRate > 90) score += 6.25;
    else if (customers.retentionRate > 80) score += 3.125;
    else if (customers.retentionRate < 70) score -= 6.25;

    // LTV contribution
    if (customers.averageLifetimeValue > 1000) score += 6.25;
    else if (customers.averageLifetimeValue > 500) score += 3.125;
    else if (customers.averageLifetimeValue < 100) score -= 3.125;

    // New customers
    if (customers.new > 10) score += 3.125;
    else if (customers.new < 2) score -= 3.125;

    return Math.max(0, Math.min(25, score));
  }

  /**
   * Calculate operations score
   */
  private calculateOperationsScore(data: BusinessDataSnapshot): number {
    let score = 12.5; // Base score

    // Response rate contribution
    if (data.communication.responseRate > 30) score += 4;
    else if (data.communication.responseRate < 10) score -= 4;

    // Workflow completion rate
    if (data.workflows.averageCompletionRate > 60) score += 4;
    else if (data.workflows.averageCompletionRate < 30) score -= 4;

    // Inventory health
    const inventoryHealth = data.products.total > 0
      ? ((data.products.total - data.products.outOfStock) / data.products.total) * 100
      : 100;
    if (inventoryHealth > 90) score += 4;
    else if (inventoryHealth < 70) score -= 4;

    // Appointment no-show rate
    if (data.appointments.noShowRate < 10) score += 4;
    else if (data.appointments.noShowRate > 20) score -= 4;

    return Math.max(0, Math.min(25, score));
  }

  /**
   * Generate alerts based on data
   */
  private generateAlerts(data: BusinessDataSnapshot): BusinessHealthScore['alerts'] {
    const alerts: BusinessHealthScore['alerts'] = [];

    // Revenue alerts
    if (data.revenue.growthRate < -10) {
      alerts.push({
        type: 'critical',
        message: `Revenue dropped ${Math.abs(data.revenue.growthRate).toFixed(1)}% this period`,
        metric: 'revenue',
        value: data.revenue.growthRate,
      });
    } else if (data.revenue.growthRate > 20) {
      alerts.push({
        type: 'success',
        message: `Revenue increased ${data.revenue.growthRate.toFixed(1)}% this period`,
        metric: 'revenue',
        value: data.revenue.growthRate,
      });
    }

    // Pipeline alerts
    if (data.leads.conversionRate < 5) {
      alerts.push({
        type: 'warning',
        message: `Low conversion rate: ${data.leads.conversionRate.toFixed(1)}%`,
        metric: 'conversionRate',
        value: data.leads.conversionRate,
      });
    }

    if (data.deals.winRate < 20) {
      alerts.push({
        type: 'warning',
        message: `Low win rate: ${data.deals.winRate.toFixed(1)}%`,
        metric: 'winRate',
        value: data.deals.winRate,
      });
    }

    // Inventory alerts
    if (data.products.outOfStock > 0) {
      alerts.push({
        type: 'critical',
        message: `${data.products.outOfStock} products out of stock`,
        metric: 'outOfStock',
        value: data.products.outOfStock,
      });
    }

    if (data.products.lowStock > 0) {
      alerts.push({
        type: 'warning',
        message: `${data.products.lowStock} products running low on stock`,
        metric: 'lowStock',
        value: data.products.lowStock,
      });
    }

    // Customer alerts
    if (data.customers.retentionRate < 70) {
      alerts.push({
        type: 'warning',
        message: `Customer retention rate is ${data.customers.retentionRate}%`,
        metric: 'retentionRate',
        value: data.customers.retentionRate,
      });
    }

    // Communication alerts
    if (data.communication.responseRate < 10) {
      alerts.push({
        type: 'warning',
        message: `Low email response rate: ${data.communication.responseRate.toFixed(1)}%`,
        metric: 'responseRate',
        value: data.communication.responseRate,
      });
    }

    return alerts;
  }

  /**
   * Generate predictions using statistical models (linear regression, Wilson score, stage-weighted).
   * See lib/business-ai/predictive-models.ts for implementation.
   */
  generatePredictions(data: BusinessDataSnapshot): Prediction[] {
    const predictions = generateStatisticalPredictions(data);
    return predictions.map((p) => ({
      metric: p.metric,
      currentValue: p.currentValue,
      predictedValue: p.predictedValue,
      confidence: p.confidence,
      timeframe: p.timeframe,
      factors: p.factors,
      explanation: p.explanation,
    }));
  }

  /**
   * Generate insights
   */
  generateInsights(data: BusinessDataSnapshot): Insight[] {
    const insights: Insight[] = [];

    // Revenue insights
    if (data.revenue.growthRate > 15) {
      insights.push({
        type: 'trend',
        title: 'Strong Revenue Growth',
        description: `Your revenue is growing at ${data.revenue.growthRate.toFixed(1)}% - well above average.`,
        impact: 'high',
        actionItems: [
          'Double down on what\'s working',
          'Consider scaling successful channels',
          'Invest in customer retention',
        ],
      });
    }

    // Pipeline insights
    if (data.leads.conversionRate < 10 && data.leads.total > 20) {
      insights.push({
        type: 'opportunity',
        title: 'Improve Lead Conversion',
        description: `You have ${data.leads.total} leads but only ${data.leads.conversionRate.toFixed(1)}% conversion rate.`,
        impact: 'high',
        actionItems: [
          'Review lead qualification process',
          'Improve follow-up timing',
          'Enhance lead nurturing workflows',
        ],
        data: {
          totalLeads: data.leads.total,
          conversionRate: data.leads.conversionRate,
        },
      });
    }

    // Product insights
    if (data.products.topSelling.length > 0) {
      const topProduct = data.products.topSelling[0];
      insights.push({
        type: 'trend',
        title: 'Top Performing Product',
        description: `${topProduct.productName} is your best seller with $${topProduct.revenue.toFixed(2)} in revenue.`,
        impact: 'medium',
        actionItems: [
          'Promote this product more',
          'Bundle with other products',
          'Analyze what makes it successful',
        ],
        data: topProduct,
      });
    }

    // Inventory insights
    if (data.products.lowStock > 0) {
      insights.push({
        type: 'risk',
        title: 'Low Stock Alert',
        description: `${data.products.lowStock} products are running low on inventory.`,
        impact: 'high',
        actionItems: [
          'Reorder low stock items',
          'Review sales forecasts',
          'Adjust pricing if needed',
        ],
      });
    }

    // Workflow insights
    if (data.workflows.topPerforming.length > 0) {
      const topWorkflow = data.workflows.topPerforming[0];
      insights.push({
        type: 'recommendation',
        title: 'High-Performing Workflow',
        description: `${topWorkflow.workflowName} has a ${topWorkflow.completionRate.toFixed(1)}% completion rate.`,
        impact: 'medium',
        actionItems: [
          'Apply similar patterns to other workflows',
          'Scale this workflow to more leads',
          'Document what makes it successful',
        ],
        data: topWorkflow,
      });
    }

    return insights;
  }

  /**
   * Compare periods
   */
  comparePeriods(
    current: BusinessDataSnapshot,
    previous: BusinessDataSnapshot
  ): Record<string, { current: number; previous: number; change: number; changePercent: number }> {
    return {
      revenue: {
        current: current.revenue.thisMonth,
        previous: previous.revenue.thisMonth,
        change: current.revenue.thisMonth - previous.revenue.thisMonth,
        changePercent: previous.revenue.thisMonth > 0
          ? ((current.revenue.thisMonth - previous.revenue.thisMonth) / previous.revenue.thisMonth) * 100
          : 0,
      },
      leads: {
        current: current.leads.total,
        previous: previous.leads.total,
        change: current.leads.total - previous.leads.total,
        changePercent: previous.leads.total > 0
          ? ((current.leads.total - previous.leads.total) / previous.leads.total) * 100
          : 0,
      },
      deals: {
        current: current.deals.total,
        previous: previous.deals.total,
        change: current.deals.total - previous.deals.total,
        changePercent: previous.deals.total > 0
          ? ((current.deals.total - previous.deals.total) / previous.deals.total) * 100
          : 0,
      },
      customers: {
        current: current.customers.total,
        previous: previous.customers.total,
        change: current.customers.total - previous.customers.total,
        changePercent: previous.customers.total > 0
          ? ((current.customers.total - previous.customers.total) / previous.customers.total) * 100
          : 0,
      },
    };
  }
}

export const businessAnalyticsEngine = new BusinessAnalyticsEngine();
