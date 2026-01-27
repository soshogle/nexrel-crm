/**
 * Market Data Collector
 * Aggregates market statistics from multiple sources
 */

import { prisma } from '@/lib/db';

export interface MarketStats {
  area: string;
  state: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
  
  // Volume
  totalListings: number;
  newListings: number;
  soldListings: number;
  expiredListings: number;
  pendingListings: number;
  
  // Pricing
  medianPrice: number;
  avgPrice: number;
  pricePerSqft: number;
  avgDaysOnMarket: number;
  
  // Comparisons
  priceChangePercent: number;  // vs previous period
  volumeChangePercent: number;
  domChangePercent: number;
  
  // Inventory
  monthsOfSupply: number;
  absorptionRate: number;  // % of listings sold
  
  // Market Type
  marketType: 'buyer' | 'seller' | 'balanced';
}

/**
 * Collect market stats for an area
 */
export async function collectMarketStats(
  area: string,
  state: string,
  period: MarketStats['period'],
  userId: string
): Promise<MarketStats> {
  const { startDate, endDate, prevStartDate, prevEndDate } = getPeriodDates(period);
  const periodTypeMap = { week: 'WEEKLY', month: 'MONTHLY', quarter: 'QUARTERLY', year: 'YEARLY' };

  // Check cache first
  const cached = await prisma.rEMarketStats.findFirst({
    where: {
      userId,
      region: area,
      state,
      periodType: periodTypeMap[period] as any,
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate }
    }
  });

  if (cached) {
    return mapDbToStats(cached, area, state, period);
  }

  // Collect fresh data
  const stats = await aggregateStats(area, state, startDate, endDate);
  const prevStats = await aggregateStats(area, state, prevStartDate, prevEndDate);

  // Calculate changes
  const priceChangePercent = prevStats.medianPrice > 0
    ? ((stats.medianPrice - prevStats.medianPrice) / prevStats.medianPrice) * 100
    : 0;
  const volumeChangePercent = prevStats.totalListings > 0
    ? ((stats.totalListings - prevStats.totalListings) / prevStats.totalListings) * 100
    : 0;
  const domChangePercent = prevStats.avgDaysOnMarket > 0
    ? ((stats.avgDaysOnMarket - prevStats.avgDaysOnMarket) / prevStats.avgDaysOnMarket) * 100
    : 0;

  // Calculate inventory metrics
  const monthlyAbsorption = stats.soldListings / (period === 'week' ? 0.25 : period === 'month' ? 1 : period === 'quarter' ? 3 : 12);
  const monthsOfSupply = monthlyAbsorption > 0 ? stats.totalListings / monthlyAbsorption : 0;
  const absorptionRate = stats.totalListings > 0 ? (stats.soldListings / stats.totalListings) * 100 : 0;

  // Determine market type
  const marketType = monthsOfSupply < 4 ? 'seller' : monthsOfSupply > 6 ? 'buyer' : 'balanced';

  const fullStats: MarketStats = {
    area,
    state,
    period,
    startDate,
    endDate,
    ...stats,
    priceChangePercent,
    volumeChangePercent,
    domChangePercent,
    monthsOfSupply,
    absorptionRate,
    marketType
  };

  // Cache the stats
  await prisma.rEMarketStats.create({
    data: {
      userId,
      region: area,
      city: area,
      state,
      periodType: periodTypeMap[period] as any,
      periodStart: startDate,
      periodEnd: endDate,
      activeInventory: stats.totalListings,
      newListings: stats.newListings,
      closedSales: stats.soldListings,
      medianSalePrice: stats.medianPrice,
      avgSalePrice: stats.avgPrice,
      domAvg: stats.avgDaysOnMarket,
      domMedian: stats.avgDaysOnMarket,
      monthsOfSupply,
      rawData: { priceChangePercent, volumeChangePercent, domChangePercent, absorptionRate, marketType }
    }
  });

  return fullStats;
}

async function aggregateStats(
  area: string,
  state: string,
  startDate: Date,
  endDate: Date
): Promise<Omit<MarketStats, 'area' | 'state' | 'period' | 'startDate' | 'endDate' | 'priceChangePercent' | 'volumeChangePercent' | 'domChangePercent' | 'monthsOfSupply' | 'absorptionRate' | 'marketType'>> {
  // TODO: This requires MLS data integration to provide real statistics
  // Currently returns placeholder data - market intelligence is not functional
  // until MLS credentials are configured
  console.warn('Market stats: Using placeholder data - MLS integration required');
  
  const baseListings = Math.floor(Math.random() * 500) + 200;
  const newListings = Math.floor(baseListings * 0.3);
  const soldListings = Math.floor(baseListings * 0.25);
  const expiredListings = Math.floor(baseListings * 0.05);
  const pendingListings = Math.floor(baseListings * 0.1);
  
  const basePrice = 500000 + Math.floor(Math.random() * 500000);

  return {
    totalListings: baseListings,
    newListings,
    soldListings,
    expiredListings,
    pendingListings,
    medianPrice: basePrice,
    avgPrice: Math.floor(basePrice * 1.1),
    pricePerSqft: Math.floor(basePrice / 2000),
    avgDaysOnMarket: 15 + Math.floor(Math.random() * 30)
  };
}

function getPeriodDates(period: MarketStats['period']): {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
      break;
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getFullYear(), Math.floor(prevEndDate.getMonth() / 3) * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getFullYear(), 0, 1);
      break;
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
}

function mapDbToStats(row: any, area: string, state: string, period: MarketStats['period']): MarketStats {
  const rawData = (row.rawData || {}) as any;
  return {
    area: row.region || area,
    state: row.state || state,
    period,
    startDate: row.periodStart,
    endDate: row.periodEnd,
    totalListings: row.activeInventory || 0,
    newListings: row.newListings || 0,
    soldListings: row.closedSales || 0,
    expiredListings: 0,
    pendingListings: 0,
    medianPrice: row.medianSalePrice || 0,
    avgPrice: row.avgSalePrice || 0,
    pricePerSqft: 0,
    avgDaysOnMarket: row.domAvg || row.domMedian || 0,
    priceChangePercent: rawData.priceChangePercent || 0,
    volumeChangePercent: rawData.volumeChangePercent || 0,
    domChangePercent: rawData.domChangePercent || 0,
    monthsOfSupply: row.monthsOfSupply || 0,
    absorptionRate: rawData.absorptionRate || 0,
    marketType: rawData.marketType || 'balanced'
  };
}

/**
 * Get historical stats for trend analysis
 */
export async function getHistoricalStats(
  area: string,
  state: string,
  periods: number = 12,
  periodType: MarketStats['period'] = 'month'
): Promise<MarketStats[]> {
  const periodTypeMap = { week: 'WEEKLY', month: 'MONTHLY', quarter: 'QUARTERLY', year: 'YEARLY' };
  
  const stats = await prisma.rEMarketStats.findMany({
    where: {
      region: { contains: area, mode: 'insensitive' },
      state,
      periodType: periodTypeMap[periodType] as any
    },
    orderBy: { periodStart: 'desc' },
    take: periods
  });

  return stats.map(s => mapDbToStats(s, area, state, periodType));
}
