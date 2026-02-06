/**
 * Market Data Collector
 * Stores and retrieves market statistics
 */

import { prisma } from '@/lib/db';
import { REPeriodType } from '@prisma/client';

export interface MarketDataInput {
  userId: string;
  region: string;
  city?: string;
  state?: string;
  country?: string;
  periodType?: REPeriodType;
  periodStart: Date;
  periodEnd: Date;
}

export interface MarketStats {
  medianSalePrice?: number;
  avgSalePrice?: number;
  domMedian?: number;
  domAvg?: number;
  newListings?: number;
  closedSales?: number;
  activeInventory?: number;
  monthsOfSupply?: number;
  listToSaleRatio?: number;
  priceReductions?: number;
}

/**
 * Save market statistics
 */
export async function collectMarketStats(input: MarketDataInput, stats: MarketStats) {
  const record = await prisma.rEMarketStats.create({
    data: {
      userId: input.userId,
      region: input.region,
      city: input.city,
      state: input.state,
      country: input.country || 'US',
      periodType: input.periodType || 'WEEKLY',
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      medianSalePrice: stats.medianSalePrice,
      avgSalePrice: stats.avgSalePrice,
      domMedian: stats.domMedian,
      domAvg: stats.domAvg,
      newListings: stats.newListings,
      closedSales: stats.closedSales,
      activeInventory: stats.activeInventory,
      monthsOfSupply: stats.monthsOfSupply,
      listToSaleRatio: stats.listToSaleRatio,
      priceReductions: stats.priceReductions
    }
  });
  return { success: true, data: record };
}

/**
 * Get market stats history
 */
export async function getMarketStats(userId: string, region: string, limit = 52) {
  return prisma.rEMarketStats.findMany({
    where: { userId, region },
    orderBy: { periodStart: 'desc' },
    take: limit
  });
}

/**
 * Get latest market stats for a region
 */
export async function getLatestMarketStats(userId: string, region: string) {
  return prisma.rEMarketStats.findFirst({
    where: { userId, region },
    orderBy: { periodStart: 'desc' }
  });
}
