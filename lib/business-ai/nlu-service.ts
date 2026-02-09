/**
 * Business AI Natural Language Understanding Service
 * Understands business queries and extracts intent
 */

import { BusinessDataSnapshot } from './data-pipeline';

export interface QueryIntent {
  type: 'metric' | 'comparison' | 'prediction' | 'insight' | 'recommendation' | 'general';
  metric?: string;
  comparison?: {
    type: 'period' | 'segment' | 'benchmark';
    periods?: string[];
    segments?: string[];
  };
  timeframe?: string;
  filters?: Record<string, any>;
  visualization?: {
    type: 'chart' | 'table' | 'score' | 'list';
    chartType?: 'line' | 'bar' | 'pie' | 'area';
  };
}

export class BusinessNLUService {
  /**
   * Parse natural language query into structured intent
   */
  async parseQuery(query: string, context?: BusinessDataSnapshot): Promise<QueryIntent> {
    const lowerQuery = query.toLowerCase().trim();

    // Metric queries
    if (this.isMetricQuery(lowerQuery)) {
      return this.parseMetricQuery(lowerQuery, context);
    }

    // Comparison queries
    if (this.isComparisonQuery(lowerQuery)) {
      return this.parseComparisonQuery(lowerQuery, context);
    }

    // Prediction queries
    if (this.isPredictionQuery(lowerQuery)) {
      return {
        type: 'prediction',
        timeframe: this.extractTimeframe(lowerQuery),
        visualization: {
          type: 'chart',
          chartType: 'line',
        },
      };
    }

    // Insight queries
    if (this.isInsightQuery(lowerQuery)) {
      return {
        type: 'insight',
        visualization: {
          type: 'list',
        },
      };
    }

    // Recommendation queries
    if (this.isRecommendationQuery(lowerQuery)) {
      return {
        type: 'recommendation',
        visualization: {
          type: 'list',
        },
      };
    }

    // General business health
    if (this.isGeneralQuery(lowerQuery)) {
      return {
        type: 'general',
        visualization: {
          type: 'score',
        },
      };
    }

    // Default to general
    return {
      type: 'general',
      visualization: {
        type: 'score',
      },
    };
  }

  /**
   * Check if query is asking for a metric
   */
  private isMetricQuery(query: string): boolean {
    const metricKeywords = [
      'revenue', 'sales', 'income', 'profit',
      'leads', 'customers', 'deals', 'conversions',
      'products', 'inventory', 'orders',
      'emails', 'calls', 'messages',
      'workflows', 'appointments',
      'conversion rate', 'win rate', 'response rate',
      'lifetime value', 'ltv', 'average order',
    ];

    return metricKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Parse metric query
   */
  private parseMetricQuery(query: string, context?: BusinessDataSnapshot): QueryIntent {
    let metric = 'revenue'; // Default
    let chartType: 'line' | 'bar' | 'pie' | 'area' = 'line';

    // Extract metric
    if (query.includes('revenue') || query.includes('sales') || query.includes('income')) {
      metric = 'revenue';
      chartType = 'line';
    } else if (query.includes('lead')) {
      metric = 'leads';
      chartType = 'bar';
    } else if (query.includes('deal')) {
      metric = 'deals';
      chartType = 'bar';
    } else if (query.includes('customer')) {
      metric = 'customers';
      chartType = 'bar';
    } else if (query.includes('product')) {
      metric = 'products';
      chartType = 'pie';
    } else if (query.includes('order')) {
      metric = 'orders';
      chartType = 'bar';
    } else if (query.includes('conversion')) {
      metric = 'conversionRate';
      chartType = 'bar';
    } else if (query.includes('win rate')) {
      metric = 'winRate';
      chartType = 'bar';
    }

    // Extract timeframe
    const timeframe = this.extractTimeframe(query);

    return {
      type: 'metric',
      metric,
      timeframe,
      visualization: {
        type: 'chart',
        chartType,
      },
    };
  }

  /**
   * Check if query is asking for comparison
   */
  private isComparisonQuery(query: string): boolean {
    const comparisonKeywords = [
      'compare', 'vs', 'versus', 'difference',
      'this month', 'last month', 'this year', 'last year',
      'better', 'worse', 'improved', 'declined',
    ];

    return comparisonKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Parse comparison query
   */
  private parseComparisonQuery(query: string, context?: BusinessDataSnapshot): QueryIntent {
    const periods: string[] = [];

    if (query.includes('this month') && query.includes('last month')) {
      periods.push('thisMonth', 'lastMonth');
    } else if (query.includes('this year') && query.includes('last year')) {
      periods.push('thisYear', 'lastYear');
    } else if (query.includes('this week') && query.includes('last week')) {
      periods.push('thisWeek', 'lastWeek');
    }

    return {
      type: 'comparison',
      comparison: {
        type: 'period',
        periods,
      },
      visualization: {
        type: 'chart',
        chartType: 'bar',
      },
    };
  }

  /**
   * Check if query is asking for prediction
   */
  private isPredictionQuery(query: string): boolean {
    const predictionKeywords = [
      'predict', 'forecast', 'project', 'expect',
      'next month', 'next quarter', 'next year',
      'will', 'going to', 'trend',
    ];

    return predictionKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Check if query is asking for insights
   */
  private isInsightQuery(query: string): boolean {
    const insightKeywords = [
      'insight', 'trend', 'pattern', 'analysis',
      'what\'s happening', 'what changed', 'why',
    ];

    return insightKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Check if query is asking for recommendations
   */
  private isRecommendationQuery(query: string): boolean {
    const recommendationKeywords = [
      'recommend', 'suggest', 'should', 'advice',
      'what should', 'how to', 'improve', 'optimize',
    ];

    return recommendationKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Check if query is general business health
   */
  private isGeneralQuery(query: string): boolean {
    const generalKeywords = [
      'how\'s', 'how is', 'business health', 'overall',
      'status', 'summary', 'overview', 'dashboard',
    ];

    return generalKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Extract timeframe from query
   */
  private extractTimeframe(query: string): string {
    if (query.includes('today')) return 'today';
    if (query.includes('this week')) return 'thisWeek';
    if (query.includes('this month')) return 'thisMonth';
    if (query.includes('this year')) return 'thisYear';
    if (query.includes('last week')) return 'lastWeek';
    if (query.includes('last month')) return 'lastMonth';
    if (query.includes('last year')) return 'lastYear';
    if (query.includes('next month')) return 'nextMonth';
    if (query.includes('next quarter')) return 'nextQuarter';
    if (query.includes('next year')) return 'nextYear';
    if (query.includes('30 days') || query.includes('last 30')) return 'last30Days';
    if (query.includes('90 days') || query.includes('last 90')) return 'last90Days';

    return 'thisMonth'; // Default
  }

  /**
   * Generate natural language response from data
   */
  generateResponse(intent: QueryIntent, data: BusinessDataSnapshot, healthScore: any, predictions?: any[], insights?: any[]): string {
    switch (intent.type) {
      case 'general':
        return this.generateGeneralResponse(data, healthScore);

      case 'metric':
        return this.generateMetricResponse(intent, data);

      case 'comparison':
        return this.generateComparisonResponse(intent, data);

      case 'prediction':
        return this.generatePredictionResponse(intent, predictions || []);

      case 'insight':
        return this.generateInsightResponse(insights || []);

      case 'recommendation':
        return this.generateRecommendationResponse(insights || []);

      default:
        return 'I can help you understand your business metrics, trends, and predictions. What would you like to know?';
    }
  }

  /**
   * Generate general business health response
   */
  private generateGeneralResponse(data: BusinessDataSnapshot, healthScore: any): string {
    const score = healthScore.overall;
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
    
    let response = `${scoreEmoji} Your business health score is ${score}/100. `;

    if (score >= 80) {
      response += 'Excellent! Your business is performing very well. ';
    } else if (score >= 60) {
      response += 'Good performance overall, with some areas for improvement. ';
    } else {
      response += 'There are several areas that need attention. ';
    }

    // Add key metrics
    response += `Here are your key metrics: `;
    response += `Revenue: $${data.revenue.thisMonth.toLocaleString()}, `;
    response += `Leads: ${data.leads.total}, `;
    response += `Open Deals: ${data.deals.open}, `;
    response += `Customers: ${data.customers.total}. `;

    // Add top alert if any
    if (healthScore.alerts && healthScore.alerts.length > 0) {
      const topAlert = healthScore.alerts[0];
      response += `\n\n⚠️ ${topAlert.message}`;
    }

    return response;
  }

  /**
   * Generate metric-specific response
   */
  private generateMetricResponse(intent: QueryIntent, data: BusinessDataSnapshot): string {
    const metric = intent.metric || 'revenue';
    let response = '';

    switch (metric) {
      case 'revenue':
        response = `Your revenue this month is $${data.revenue.thisMonth.toLocaleString()}. `;
        if (data.revenue.growthRate > 0) {
          response += `That's ${data.revenue.growthRate.toFixed(1)}% growth from last month! 📈`;
        } else if (data.revenue.growthRate < 0) {
          response += `That's ${Math.abs(data.revenue.growthRate).toFixed(1)}% down from last month. 📉`;
        }
        break;

      case 'leads':
        response = `You have ${data.leads.total} total leads, with ${data.leads.new} new this period. `;
        response += `Your conversion rate is ${data.leads.conversionRate.toFixed(1)}%.`;
        break;

      case 'deals':
        response = `You have ${data.deals.open} open deals worth $${data.deals.totalValue.toLocaleString()}. `;
        response += `Your win rate is ${data.deals.winRate.toFixed(1)}%.`;
        break;

      case 'customers':
        response = `You have ${data.customers.total} total customers, with ${data.customers.new} new this period. `;
        response += `Average lifetime value is $${data.customers.averageLifetimeValue.toFixed(2)}.`;
        break;

      default:
        response = `Here's the data for ${metric}.`;
    }

    return response;
  }

  /**
   * Generate comparison response
   */
  private generateComparisonResponse(intent: QueryIntent, data: BusinessDataSnapshot): string {
    if (intent.comparison?.periods?.includes('thisMonth') && intent.comparison.periods.includes('lastMonth')) {
      const change = data.revenue.thisMonth - data.revenue.lastMonth;
      const changePercent = data.revenue.lastMonth > 0
        ? ((change / data.revenue.lastMonth) * 100)
        : 0;

      let response = `Comparing this month to last month: `;
      response += `Revenue is $${data.revenue.thisMonth.toLocaleString()} vs $${data.revenue.lastMonth.toLocaleString()}. `;
      
      if (changePercent > 0) {
        response += `That's a ${changePercent.toFixed(1)}% increase! 📈`;
      } else if (changePercent < 0) {
        response += `That's a ${Math.abs(changePercent).toFixed(1)}% decrease. 📉`;
      } else {
        response += `Revenue is stable.`;
      }

      return response;
    }

    return 'Here\'s the comparison you requested.';
  }

  /**
   * Generate prediction response
   */
  private generatePredictionResponse(intent: QueryIntent, predictions: any[]): string {
    if (predictions.length === 0) {
      return 'I need more data to make accurate predictions.';
    }

    const revenuePrediction = predictions.find(p => p.metric === 'revenue');
    if (revenuePrediction) {
      return `Based on current trends, I predict your revenue ${revenuePrediction.timeframe} will be $${revenuePrediction.predictedValue.toLocaleString()}. ` +
             `Confidence: ${revenuePrediction.confidence}%. ` +
             `Key factors: ${revenuePrediction.factors.join(', ')}.`;
    }

    return 'Here are my predictions based on current trends.';
  }

  /**
   * Generate insight response
   */
  private generateInsightResponse(insights: any[]): string {
    if (insights.length === 0) {
      return 'I don\'t have any specific insights at the moment.';
    }

    const topInsight = insights[0];
    return `${topInsight.title}: ${topInsight.description}`;
  }

  /**
   * Generate recommendation response
   */
  private generateRecommendationResponse(insights: any[]): string {
    const recommendations = insights.filter(i => i.type === 'recommendation' || i.actionItems);
    
    if (recommendations.length === 0) {
      return 'Based on your current performance, I recommend focusing on lead conversion and customer retention.';
    }

    const topRec = recommendations[0];
    let response = `${topRec.title}: ${topRec.description} `;
    
    if (topRec.actionItems && topRec.actionItems.length > 0) {
      response += `Here's what you should do: ${topRec.actionItems.slice(0, 3).join(', ')}.`;
    }

    return response;
  }
}

export const businessNLUService = new BusinessNLUService();
