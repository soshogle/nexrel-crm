/**
 * Market Data Collector
 * Collects and stores market statistics
 */

import { prisma } from '@/lib/db';
import type { REPeriodType } from '../types';

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

export async function collectMarketStats(
  input: MarketDataInput,
  stats: MarketStats
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const record = await prisma.rEMarketStats.create({
      data: {
        userId: input.userId,
        region: input.region,
        city: input.city,
        state: input.state,
        country: input.country || 'US',
        periodType: (input.periodType || 'WEEKLY') as REPeriodType,
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
  } catch (error: any) {
    console.error('Error collecting market stats:', error);
    return { success: false, error: error.message };
  }
}

export async function getMarketStats(
  userId: string,
  region: string,
  limit = 52
) {
  try {
    return await prisma.rEMarketStats.findMany({
      where: { userId, region },
      orderBy: { periodStart: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching market stats:', error);
    return [];
  }
}

export async function getLatestMarketStats(userId: string, region: string) {
  try {
    return await prisma.rEMarketStats.findFirst({
      where: { userId, region },
      orderBy: { periodStart: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching latest market stats:', error);
    return null;
  }
}
