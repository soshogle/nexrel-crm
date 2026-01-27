/**
 * Market Report AI Employees
 * Generates weekly, monthly, and annual market reports
 */

import { prisma } from '../../db';
import { aiOrchestrator } from '../../ai-employee-orchestrator';
import { REAIEmployeeType, REPeriodType, REReportType } from '@prisma/client';
import { getREEmployeeConfig } from './configs';

interface MarketReportInput {
  userId: string;
  region: string; // city or neighborhood
  city?: string;
  state?: string;
  periodType: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  startDate?: Date;
  endDate?: Date;
}

interface MarketStats {
  medianSalePrice: number;
  avgSalePrice: number;
  domMedian: number;
  newListings: number;
  closedSales: number;
  activeInventory: number;
  monthsOfSupply: number;
  listToSaleRatio: number;
  priceChange?: number; // vs previous period
}

interface MarketReportOutput {
  reportId: string;
  region: string;
  periodType: string;
  stats: MarketStats;
  executiveSummary: string;
  keyHighlights: string[];
  buyerInsights: string;
  sellerInsights: string;
  predictions: Array<{ prediction: string; confidence: number }>;
  socialCaption: string;
  pdfUrl?: string;
}

/**
 * Generate market report
 */
export async function generateMarketReport(input: MarketReportInput): Promise<MarketReportOutput> {
  const employeeType = getEmployeeTypeForPeriod(input.periodType);
  const config = getREEmployeeConfig(employeeType);
  
  console.log(`📊 Generating ${input.periodType} market report for ${input.region}`);
  
  // Calculate date range
  const { startDate, endDate } = calculateDateRange(input.periodType, input.startDate, input.endDate);
  
  // Fetch or calculate market stats
  const stats = await fetchMarketStats(input.userId, input.region, startDate, endDate);
  
  // Generate AI insights
  const insights = await generateAIInsights(stats, input.periodType, input.region);
  
  // Create report record
  const report = await prisma.rEMarketReport.create({
    data: {
      userId: input.userId,
      type: getReportType(input.periodType),
      title: `${input.region} ${input.periodType} Market Report`,
      region: input.region,
      periodStart: startDate,
      periodEnd: endDate,
      executiveSummary: insights.executiveSummary,
      keyHighlights: insights.keyHighlights,
      buyerInsights: insights.buyerInsights,
      sellerInsights: insights.sellerInsights,
      predictions: insights.predictions,
      socialCaption: insights.socialCaption
    }
  });
  
  // Log execution
  await prisma.rEAIEmployeeExecution.create({
    data: {
      userId: input.userId,
      employeeType: employeeType.replace('RE_', '') as any,
      employeeName: config?.name || `${input.periodType} Report Generator`,
      targetType: 'market_report',
      targetId: report.id,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      result: { reportId: report.id } as any
    }
  });
  
  console.log(`✅ Market report generated: ${report.id}`);
  
  return {
    reportId: report.id,
    region: input.region,
    periodType: input.periodType,
    stats,
    ...insights
  };
}

/**
 * Get employee type for period
 */
function getEmployeeTypeForPeriod(periodType: string): REAIEmployeeType {
  switch (periodType) {
    case 'WEEKLY': return 'RE_MARKET_UPDATE' as REAIEmployeeType;
    case 'MONTHLY': return 'RE_MARKET_UPDATE' as REAIEmployeeType;
    case 'ANNUAL': return 'RE_MARKET_UPDATE' as REAIEmployeeType;
    default: return 'RE_MARKET_UPDATE' as REAIEmployeeType;
  }
}

/**
 * Get report type enum
 */
function getReportType(periodType: string): REReportType {
  switch (periodType) {
    case 'WEEKLY': return 'WEEKLY_SNAPSHOT';
    case 'MONTHLY': return 'MONTHLY_REPORT';
    case 'ANNUAL': return 'ANNUAL_REVIEW';
    default: return 'CUSTOM';
  }
}

/**
 * Calculate date range for report period
 */
function calculateDateRange(periodType: string, start?: Date, end?: Date): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = end || now;
  
  switch (periodType) {
    case 'WEEKLY':
      startDate = start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'MONTHLY':
      startDate = start || new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = end || new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'ANNUAL':
      startDate = start || new Date(now.getFullYear() - 1, 0, 1);
      endDate = end || new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      startDate = start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate, endDate };
}

/**
 * Fetch market statistics (would integrate with MLS API)
 */
async function fetchMarketStats(
  userId: string,
  region: string,
  startDate: Date,
  endDate: Date
): Promise<MarketStats> {
  // Check if we have cached stats
  const existingStats = await prisma.rEMarketStats.findFirst({
    where: {
      userId,
      region,
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (existingStats) {
    return {
      medianSalePrice: existingStats.medianSalePrice || 0,
      avgSalePrice: existingStats.avgSalePrice || 0,
      domMedian: existingStats.domMedian || 0,
      newListings: existingStats.newListings || 0,
      closedSales: existingStats.closedSales || 0,
      activeInventory: existingStats.activeInventory || 0,
      monthsOfSupply: existingStats.monthsOfSupply || 0,
      listToSaleRatio: existingStats.listToSaleRatio || 0
    };
  }
  
  // TODO: Integrate with MLS API to fetch real data
  // For now, return placeholder that prompts agent to input data
  return {
    medianSalePrice: 0,
    avgSalePrice: 0,
    domMedian: 0,
    newListings: 0,
    closedSales: 0,
    activeInventory: 0,
    monthsOfSupply: 0,
    listToSaleRatio: 0
  };
}

/**
 * Generate AI-powered insights from market data
 */
async function generateAIInsights(
  stats: MarketStats,
  periodType: string,
  region: string
): Promise<{
  executiveSummary: string;
  keyHighlights: string[];
  buyerInsights: string;
  sellerInsights: string;
  predictions: Array<{ prediction: string; confidence: number }>;
  socialCaption: string;
}> {
  // Determine market conditions
  const marketCondition = determineMarketCondition(stats);
  
  // Generate insights based on data
  const executiveSummary = generateExecutiveSummary(stats, marketCondition, region, periodType);
  const keyHighlights = generateKeyHighlights(stats, marketCondition);
  const buyerInsights = generateBuyerInsights(stats, marketCondition);
  const sellerInsights = generateSellerInsights(stats, marketCondition);
  const predictions = generatePredictions(stats, marketCondition);
  const socialCaption = generateSocialCaption(stats, region, periodType);
  
  return {
    executiveSummary,
    keyHighlights,
    buyerInsights,
    sellerInsights,
    predictions,
    socialCaption
  };
}

/**
 * Determine overall market condition
 */
function determineMarketCondition(stats: MarketStats): 'SELLERS' | 'BUYERS' | 'BALANCED' {
  if (stats.monthsOfSupply < 4) return 'SELLERS';
  if (stats.monthsOfSupply > 6) return 'BUYERS';
  return 'BALANCED';
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(
  stats: MarketStats,
  condition: string,
  region: string,
  periodType: string
): string {
  const conditionText = {
    SELLERS: 'a strong seller\'s market with limited inventory',
    BUYERS: 'a buyer\'s market with increased negotiating power',
    BALANCED: 'a balanced market with equal opportunities'
  }[condition];
  
  if (stats.medianSalePrice === 0) {
    return `Market data for ${region} is pending. Please input current statistics to generate insights.`;
  }
  
  return `The ${region} real estate market is currently experiencing ${conditionText}. ` +
    `The median sale price stands at $${stats.medianSalePrice.toLocaleString()}, ` +
    `with homes spending an average of ${stats.domMedian} days on market. ` +
    `Active inventory sits at ${stats.activeInventory} listings, ` +
    `representing ${stats.monthsOfSupply.toFixed(1)} months of supply.`;
}

/**
 * Generate key highlights
 */
function generateKeyHighlights(stats: MarketStats, condition: string): string[] {
  const highlights: string[] = [];
  
  if (stats.medianSalePrice > 0) {
    highlights.push(`Median Sale Price: $${stats.medianSalePrice.toLocaleString()}`);
    highlights.push(`Average Days on Market: ${stats.domMedian} days`);
    highlights.push(`Active Inventory: ${stats.activeInventory} homes`);
    highlights.push(`Months of Supply: ${stats.monthsOfSupply.toFixed(1)}`);
    highlights.push(`List-to-Sale Ratio: ${(stats.listToSaleRatio * 100).toFixed(1)}%`);
  } else {
    highlights.push('Data pending - please import market statistics');
  }
  
  return highlights;
}

/**
 * Generate buyer insights
 */
function generateBuyerInsights(stats: MarketStats, condition: string): string {
  switch (condition) {
    case 'SELLERS':
      return 'Competition is fierce. Be prepared to act quickly with pre-approval in hand. ' +
        'Consider offering above asking price and flexible closing terms. ' +
        'Waiving contingencies may strengthen your offer but carries risk.';
    case 'BUYERS':
      return 'You have negotiating leverage in this market. Take time to view multiple properties ' +
        'and don\'t hesitate to request concessions. Sellers are more willing to negotiate on price ' +
        'and repairs.';
    default:
      return 'The market offers balanced opportunities. Focus on finding the right property ' +
        'rather than rushing. There\'s room for negotiation, but well-priced homes still move quickly.';
  }
}

/**
 * Generate seller insights
 */
function generateSellerInsights(stats: MarketStats, condition: string): string {
  switch (condition) {
    case 'SELLERS':
      return 'This is an excellent time to sell. Price strategically to generate multiple offers. ' +
        'Professional staging and photography are still important - they can push your final price higher. ' +
        'Consider reviewing all offers before making a decision.';
    case 'BUYERS':
      return 'Pricing is critical in this market. Price competitively from day one to avoid extended ' +
        'time on market. Be prepared to negotiate and consider offering buyer incentives. ' +
        'Proper staging becomes even more important to stand out.';
    default:
      return 'Price your home at market value for best results. Well-maintained, properly staged homes ' +
        'are still selling in reasonable timeframes. Be realistic about condition-related negotiations.';
  }
}

/**
 * Generate market predictions
 */
function generatePredictions(
  stats: MarketStats,
  condition: string
): Array<{ prediction: string; confidence: number }> {
  const predictions: Array<{ prediction: string; confidence: number }> = [];
  
  if (condition === 'SELLERS') {
    predictions.push({
      prediction: 'Prices likely to continue rising in the short term',
      confidence: 0.75
    });
    predictions.push({
      prediction: 'Inventory may increase as more sellers enter the market',
      confidence: 0.6
    });
  } else if (condition === 'BUYERS') {
    predictions.push({
      prediction: 'Potential for price stabilization or modest decreases',
      confidence: 0.65
    });
    predictions.push({
      prediction: 'Days on market likely to remain elevated',
      confidence: 0.7
    });
  } else {
    predictions.push({
      prediction: 'Market likely to remain stable with gradual price appreciation',
      confidence: 0.7
    });
  }
  
  return predictions;
}

/**
 * Generate social media caption
 */
function generateSocialCaption(stats: MarketStats, region: string, periodType: string): string {
  if (stats.medianSalePrice === 0) {
    return `📊 ${region} Market Update coming soon! Stay tuned for the latest real estate insights.`;
  }
  
  return `📊 ${region} ${periodType.charAt(0) + periodType.slice(1).toLowerCase()} Market Update:\n\n` +
    `💰 Median Price: $${stats.medianSalePrice.toLocaleString()}\n` +
    `📅 Avg Days on Market: ${stats.domMedian}\n` +
    `🏠 Active Listings: ${stats.activeInventory}\n\n` +
    `DM me for a personalized market analysis! #RealEstate #MarketUpdate #${region.replace(/\s/g, '')}`;
}

/**
 * Create market report job
 */
export async function createMarketReportJob(input: MarketReportInput) {
  const employeeType = getEmployeeTypeForPeriod(input.periodType);
  
  return await aiOrchestrator.createJob({
    userId: input.userId,
    employeeType,
    jobType: `${input.periodType.toLowerCase()}_market_report`,
    input,
    priority: 'MEDIUM',
    estimatedTime: input.periodType === 'ANNUAL' ? 60 : input.periodType === 'MONTHLY' ? 30 : 15
  });
}
