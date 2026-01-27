/**
 * Market Intelligence Module
 */

import { prisma } from '@/lib/db';
import type { REPeriodType, REReportType } from '../types';

export interface MarketStatsInput {
  userId: string;
  region: string;
  city?: string;
  state?: string;
  country?: string;
  periodType: REPeriodType;
  periodStart: Date;
  periodEnd: Date;
}

export interface MarketReportInput {
  userId: string;
  type: REReportType;
  title: string;
  region: string;
  periodStart: Date;
  periodEnd: Date;
  executiveSummary?: string;
  keyHighlights?: any;
  buyerInsights?: string;
  sellerInsights?: string;
  predictions?: any;
}

export async function collectMarketStats(input: MarketStatsInput) {
  try {
    const stats = await prisma.rEMarketStats.create({
      data: {
        userId: input.userId,
        region: input.region,
        city: input.city,
        state: input.state,
        country: input.country || 'US',
        periodType: input.periodType as any,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd
      }
    });
    return { success: true, stats };
  } catch (error: any) {
    console.error('Error collecting market stats:', error);
    return { success: false, error: error.message };
  }
}

export async function generateMarketReport(input: MarketReportInput) {
  try {
    const report = await prisma.rEMarketReport.create({
      data: {
        userId: input.userId,
        type: input.type as any,
        title: input.title,
        region: input.region,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        executiveSummary: input.executiveSummary,
        keyHighlights: input.keyHighlights,
        buyerInsights: input.buyerInsights,
        sellerInsights: input.sellerInsights,
        predictions: input.predictions
      }
    });
    return { success: true, report };
  } catch (error: any) {
    console.error('Error generating market report:', error);
    return { success: false, error: error.message };
  }
}

export async function getMarketStats(userId: string, region?: string, limit = 50) {
  try {
    return await prisma.rEMarketStats.findMany({
      where: { 
        userId,
        ...(region ? { region } : {})
      },
      orderBy: { periodEnd: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching market stats:', error);
    return [];
  }
}

export async function getMarketReports(userId: string, limit = 50) {
  try {
    return await prisma.rEMarketReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching market reports:', error);
    return [];
  }
}

export async function analyzeStaleListing(userId: string, address: string) {
  // Stub for stale listing analysis
  return { 
    success: true, 
    analysis: { 
      address,
      daysOnMarket: 0,
      suggestedActions: ['Price reduction', 'Better photos', 'Open house']
    } 
  };
}

export async function getStaleListings(userId: string) {
  // Return empty for now
  return [];
}
