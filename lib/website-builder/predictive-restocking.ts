/**
 * Predictive Restocking Service
 * Uses AI to predict when products need restocking based on sales history
 */

import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface RestockingPrediction {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  predictedDaysUntilOutOfStock: number;
  recommendedOrderQuantity: number;
  confidence: number; // 0-100
  reasoning: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SalesTrend {
  productId: string;
  dailyAverage: number;
  weeklyAverage: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  seasonality?: string[];
}

export class PredictiveRestockingService {
  /**
   * Analyze sales history and predict restocking needs
   */
  async predictRestockingNeeds(
    websiteId: string,
    productIds?: string[]
  ): Promise<RestockingPrediction[]> {
    // Get website and products
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        websiteProducts: {
          include: {
            product: true,
          },
          ...(productIds ? { where: { productId: { in: productIds } } } : {}),
        },
      },
    });

    if (!website) {
      throw new Error('Website not found');
    }

    // Get sales history for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const orders = await prisma.order.findMany({
      where: {
        userId: website.userId,
        createdAt: { gte: ninetyDaysAgo },
        status: { not: 'CANCELLED' },
        items: {
          some: {
            productId: {
              in: website.websiteProducts.map((wp) => wp.productId),
            },
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Calculate sales trends per product
    const salesTrends = this.calculateSalesTrends(orders, website.websiteProducts.map((wp) => wp.productId));

    // Generate predictions using AI
    const predictions: RestockingPrediction[] = [];

    for (const wp of website.websiteProducts) {
      const product = wp.product;
      const trend = salesTrends[product.id] || {
        productId: product.id,
        dailyAverage: 0,
        weeklyAverage: 0,
        trend: 'STABLE' as const,
      };

      // Use AI to predict restocking needs
      const prediction = await this.generateAIPrediction(product, trend, website.stockSettings?.lowStockThreshold || 10);

      predictions.push(prediction);
    }

    // Sort by urgency
    return predictions.sort((a, b) => {
      const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  /**
   * Calculate sales trends from order history
   */
  private calculateSalesTrends(
    orders: any[],
    productIds: string[]
  ): Record<string, SalesTrend> {
    const trends: Record<string, SalesTrend> = {};

    // Initialize trends
    productIds.forEach((productId) => {
      trends[productId] = {
        productId,
        dailyAverage: 0,
        weeklyAverage: 0,
        trend: 'STABLE',
      };
    });

    // Group orders by date
    const dailySales: Record<string, Record<string, number>> = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = {};
      }

      order.items.forEach((item: any) => {
        if (productIds.includes(item.productId)) {
          dailySales[date][item.productId] = (dailySales[date][item.productId] || 0) + item.quantity;
        }
      });
    });

    // Calculate averages and trends
    const dates = Object.keys(dailySales).sort();
    const recentDates = dates.slice(-30); // Last 30 days
    const olderDates = dates.slice(0, -30); // Days before that

    productIds.forEach((productId) => {
      const recentSales = recentDates.reduce((sum, date) => sum + (dailySales[date]?.[productId] || 0), 0);
      const olderSales = olderDates.reduce((sum, date) => sum + (dailySales[date]?.[productId] || 0), 0);

      const recentDaily = recentSales / Math.max(recentDates.length, 1);
      const olderDaily = olderSales / Math.max(olderDates.length, 1);

      trends[productId].dailyAverage = recentDaily;
      trends[productId].weeklyAverage = recentDaily * 7;

      // Determine trend
      if (recentDaily > olderDaily * 1.1) {
        trends[productId].trend = 'INCREASING';
      } else if (recentDaily < olderDaily * 0.9) {
        trends[productId].trend = 'DECREASING';
      } else {
        trends[productId].trend = 'STABLE';
      }
    });

    return trends;
  }

  /**
   * Use AI to generate restocking prediction
   */
  private async generateAIPrediction(
    product: any,
    trend: SalesTrend,
    lowStockThreshold: number
  ): Promise<RestockingPrediction> {
    const currentStock = product.inventory || 0;

    // Simple prediction if no AI key available
    if (!process.env.OPENAI_API_KEY) {
      return this.generateSimplePrediction(product, trend, lowStockThreshold);
    }

    try {
      const prompt = `You are an inventory management expert. Analyze the following product data and predict restocking needs:

Product: ${product.name} (SKU: ${product.sku})
Current Stock: ${currentStock} units
Low Stock Threshold: ${lowStockThreshold} units
Daily Sales Average: ${trend.dailyAverage.toFixed(2)} units
Weekly Sales Average: ${trend.weeklyAverage.toFixed(2)} units
Sales Trend: ${trend.trend}

Provide a JSON response with:
1. predictedDaysUntilOutOfStock: Number of days until stock runs out (based on current sales rate)
2. recommendedOrderQuantity: Recommended quantity to order
3. confidence: Confidence level 0-100
4. reasoning: Brief explanation of the prediction
5. urgency: LOW, MEDIUM, HIGH, or CRITICAL based on predictedDaysUntilOutOfStock

JSON format:
{
  "predictedDaysUntilOutOfStock": number,
  "recommendedOrderQuantity": number,
  "confidence": number,
  "reasoning": "string",
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an inventory management expert. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return this.generateSimplePrediction(product, trend, lowStockThreshold);
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiPrediction = JSON.parse(jsonMatch[0]);
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock,
          predictedDaysUntilOutOfStock: aiPrediction.predictedDaysUntilOutOfStock || 0,
          recommendedOrderQuantity: aiPrediction.recommendedOrderQuantity || lowStockThreshold * 2,
          confidence: aiPrediction.confidence || 50,
          reasoning: aiPrediction.reasoning || 'Based on sales trends',
          urgency: aiPrediction.urgency || 'MEDIUM',
        };
      }
    } catch (error) {
      console.error('AI prediction failed, using simple prediction:', error);
    }

    return this.generateSimplePrediction(product, trend, lowStockThreshold);
  }

  /**
   * Generate simple prediction without AI
   */
  private generateSimplePrediction(
    product: any,
    trend: SalesTrend,
    lowStockThreshold: number
  ): RestockingPrediction {
    const currentStock = product.inventory || 0;
    const dailyAverage = trend.dailyAverage || 0.1; // Avoid division by zero

    const predictedDaysUntilOutOfStock = dailyAverage > 0 ? Math.floor(currentStock / dailyAverage) : 999;
    const recommendedOrderQuantity = Math.max(
      lowStockThreshold * 2,
      Math.ceil(trend.weeklyAverage * 2) // 2 weeks worth
    );

    let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (predictedDaysUntilOutOfStock <= 3) {
      urgency = 'CRITICAL';
    } else if (predictedDaysUntilOutOfStock <= 7) {
      urgency = 'HIGH';
    } else if (predictedDaysUntilOutOfStock <= 14) {
      urgency = 'MEDIUM';
    }

    const confidence = trend.dailyAverage > 0 ? Math.min(90, Math.max(50, 70 + (trend.dailyAverage * 5))) : 50;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      currentStock,
      predictedDaysUntilOutOfStock,
      recommendedOrderQuantity,
      confidence,
      reasoning: `Based on daily average of ${dailyAverage.toFixed(2)} units, stock will last ${predictedDaysUntilOutOfStock} days. Trend: ${trend.trend}.`,
      urgency,
    };
  }
}

export const predictiveRestockingService = new PredictiveRestockingService();
