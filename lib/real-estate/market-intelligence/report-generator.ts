/**
 * Market Report Generator
 */

import { prisma } from '@/lib/db';

export interface GenerateReportInput {
  userId: string;
  type: 'WEEKLY_MARKET_UPDATE' | 'MONTHLY_MARKET_REPORT' | 'QUARTERLY_ANALYSIS' | 'CUSTOM';
  region: string;
  periodStart: Date;
  periodEnd: Date;
  title?: string;
}

export interface ReportContent {
  executiveSummary?: string;
  keyHighlights?: string[];
  buyerInsights?: string;
  sellerInsights?: string;
  predictions?: { trend: string; confidence: number }[];
  socialCaption?: string;
}

export async function generateMarketReport(
  input: GenerateReportInput,
  content: ReportContent
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    const report = await prisma.rEMarketReport.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title || `Market Report - ${input.region}`,
        region: input.region,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        executiveSummary: content.executiveSummary,
        keyHighlights: content.keyHighlights ? JSON.parse(JSON.stringify(content.keyHighlights)) : null,
        buyerInsights: content.buyerInsights,
        sellerInsights: content.sellerInsights,
        predictions: content.predictions ? JSON.parse(JSON.stringify(content.predictions)) : null,
        socialCaption: content.socialCaption
      }
    });
    return { success: true, report };
  } catch (error: any) {
    console.error('Error generating report:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserReports(userId: string, limit = 50) {
  try {
    return await prisma.rEMarketReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    return [];
  }
}

export async function getReportById(id: string, userId: string) {
  try {
    return await prisma.rEMarketReport.findFirst({ where: { id, userId } });
  } catch (error) {
    return null;
  }
}

export async function deleteReport(id: string, userId: string) {
  try {
    await prisma.rEMarketReport.deleteMany({ where: { id, userId } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markReportSent(id: string, userId: string, recipients: string[]) {
  try {
    await prisma.rEMarketReport.update({
      where: { id },
      data: { sentTo: JSON.parse(JSON.stringify(recipients)), sentAt: new Date() }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
