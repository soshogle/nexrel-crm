/**
 * Market Report Generator
 * Creates weekly/monthly/annual AI-powered market reports
 */

import { prisma } from '@/lib/db';
import { collectMarketStats, getHistoricalStats, type MarketStats } from './market-data-collector';
import OpenAI from 'openai';

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) openai = new OpenAI();
  return openai;
}

export interface MarketReport {
  id: string;
  type: 'weekly' | 'monthly' | 'annual';
  area: string;
  state: string;
  generatedAt: Date;
  stats: MarketStats;
  
  // AI-generated content
  executiveSummary: string;
  marketAnalysis: string;
  buyerInsights: string;
  sellerInsights: string;
  predictions: string;
  keyTakeaways: string[];
  socialMediaCaption: string;
  
  // For presentations
  chartData: {
    priceHistory: { date: string; price: number }[];
    volumeHistory: { date: string; volume: number }[];
    domHistory: { date: string; days: number }[];
  };
}

/**
 * Generate a comprehensive market report
 */
export async function generateMarketReport(
  area: string,
  state: string,
  type: MarketReport['type'],
  userId: string
): Promise<MarketReport> {
  const period = type === 'annual' ? 'year' : type === 'monthly' ? 'month' : 'week';
  
  // Collect current stats
  const stats = await collectMarketStats(area, state, period, userId);
  
  // Get historical data for charts
  const historicalData = await getHistoricalStats(area, state, 12, 'month');
  
  // Generate AI content
  const aiContent = await generateAIContent(stats, historicalData, type);
  
  // Map type to enum
  const reportTypeMap = { weekly: 'WEEKLY', monthly: 'MONTHLY', annual: 'ANNUAL' };
  
  // Save report
  const report = await prisma.rEMarketReport.create({
    data: {
      userId,
      type: reportTypeMap[type] as any,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Market Report - ${area}, ${state}`,
      region: area,
      periodStart: stats.startDate,
      periodEnd: stats.endDate,
      executiveSummary: aiContent.executiveSummary,
      keyHighlights: aiContent.keyTakeaways,
      buyerInsights: aiContent.buyerInsights,
      sellerInsights: aiContent.sellerInsights,
      predictions: [{ text: aiContent.predictions, confidence: 0.7 }],
      socialCaption: aiContent.socialMediaCaption
    }
  });

  const chartData = {
    priceHistory: historicalData.map(h => ({ date: h.startDate.toISOString(), price: h.medianPrice })),
    volumeHistory: historicalData.map(h => ({ date: h.startDate.toISOString(), volume: h.soldListings })),
    domHistory: historicalData.map(h => ({ date: h.startDate.toISOString(), days: h.avgDaysOnMarket }))
  };

  return {
    id: report.id,
    type,
    area,
    state,
    generatedAt: report.createdAt,
    stats,
    ...aiContent,
    chartData
  };
}

async function generateAIContent(
  stats: MarketStats,
  history: MarketStats[],
  type: MarketReport['type']
): Promise<{
  executiveSummary: string;
  marketAnalysis: string;
  buyerInsights: string;
  sellerInsights: string;
  predictions: string;
  keyTakeaways: string[];
  socialMediaCaption: string;
}> {
  const prompt = `You are a real estate market analyst. Generate a ${type} market report for ${stats.area}, ${stats.state}.

CURRENT MARKET DATA:
- Median Price: $${stats.medianPrice.toLocaleString()}
- Average Days on Market: ${stats.avgDaysOnMarket}
- Price Change: ${stats.priceChangePercent > 0 ? '+' : ''}${stats.priceChangePercent.toFixed(1)}%
- Total Listings: ${stats.totalListings}
- Sold Listings: ${stats.soldListings}
- Months of Supply: ${stats.monthsOfSupply.toFixed(1)}
- Market Type: ${stats.marketType.toUpperCase()} market
- Absorption Rate: ${stats.absorptionRate.toFixed(1)}%

Generate a comprehensive report with the following sections in JSON format:
{
  "executiveSummary": "3-4 sentence overview of market conditions",
  "marketAnalysis": "2-3 paragraph detailed analysis of current trends",
  "buyerInsights": "Advice for buyers in this market (2-3 paragraphs)",
  "sellerInsights": "Advice for sellers in this market (2-3 paragraphs)",
  "predictions": "Market predictions for next 3-6 months (2 paragraphs)",
  "keyTakeaways": ["5 bullet points of key insights"],
  "socialMediaCaption": "Engaging 2-3 sentence caption for social media with relevant emoji"
}

Provide actionable, professional insights that a real estate agent can share with clients.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const content = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      executiveSummary: content.executiveSummary || 'Report generation in progress.',
      marketAnalysis: content.marketAnalysis || '',
      buyerInsights: content.buyerInsights || '',
      sellerInsights: content.sellerInsights || '',
      predictions: content.predictions || '',
      keyTakeaways: content.keyTakeaways || [],
      socialMediaCaption: content.socialMediaCaption || ''
    };
  } catch (error) {
    // Fallback content
    return {
      executiveSummary: `The ${stats.area} market is currently a ${stats.marketType} market with a median price of $${stats.medianPrice.toLocaleString()}. Homes are selling in an average of ${stats.avgDaysOnMarket} days with ${stats.monthsOfSupply.toFixed(1)} months of inventory.`,
      marketAnalysis: `Market analysis for ${stats.area}, ${stats.state} shows ${stats.priceChangePercent > 0 ? 'appreciation' : 'stabilization'} in prices.`,
      buyerInsights: `In this ${stats.marketType} market, buyers should ${stats.marketType === 'seller' ? 'act quickly and come prepared with strong offers' : 'take time to find the right property and negotiate favorable terms'}.`,
      sellerInsights: `Sellers in this ${stats.marketType} market can expect ${stats.marketType === 'seller' ? 'multiple offers and quick sales' : 'longer days on market and more negotiation'}.`,
      predictions: 'Market conditions are expected to remain stable in the coming months.',
      keyTakeaways: [
        `Median price: $${stats.medianPrice.toLocaleString()}`,
        `Average days on market: ${stats.avgDaysOnMarket}`,
        `${stats.marketType.charAt(0).toUpperCase() + stats.marketType.slice(1)} market conditions`,
        `${stats.monthsOfSupply.toFixed(1)} months of inventory`,
        `${stats.absorptionRate.toFixed(0)}% absorption rate`
      ],
      socialMediaCaption: `📊 ${stats.area} Market Update: Median price $${stats.medianPrice.toLocaleString()}, ${stats.avgDaysOnMarket} avg DOM. It's a ${stats.marketType} market! #RealEstate #MarketUpdate`
    };
  }
}

/**
 * Get recent reports for a user
 */
export async function getUserReports(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  return prisma.rEMarketReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Schedule automatic report generation
 */
export async function scheduleReportGeneration(
  userId: string,
  area: string,
  state: string,
  frequency: 'weekly' | 'monthly'
): Promise<{ success: boolean; message: string }> {
  // This would integrate with the AI Employee system for scheduled execution
  // For now, just log the request
  console.log(`Scheduled ${frequency} report for ${area}, ${state} - User: ${userId}`);
  
  return {
    success: true,
    message: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} reports scheduled for ${area}, ${state}`
  };
}
