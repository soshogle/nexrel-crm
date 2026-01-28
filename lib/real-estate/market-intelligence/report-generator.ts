/**
 * Market Report Generator
 * Creates market analysis reports
 */

import { prisma } from '@/lib/db';
import { REReportType } from '@prisma/client';

export interface GenerateReportInput {
  userId: string;
  type: REReportType;
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

/**
 * Generate and save a market report
 */
export async function generateMarketReport(input: GenerateReportInput, content: ReportContent) {
  const report = await prisma.rEMarketReport.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title || `Market Report - ${input.region}`,
      region: input.region,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      executiveSummary: content.executiveSummary,
      keyHighlights: content.keyHighlights ? (content.keyHighlights as any) : null,
      buyerInsights: content.buyerInsights,
      sellerInsights: content.sellerInsights,
      predictions: content.predictions ? (content.predictions as any) : null,
      socialCaption: content.socialCaption
    }
  });
  return { success: true, report };
}

/**
 * Get user's market reports
 */
export async function getUserReports(userId: string, limit = 50) {
  return prisma.rEMarketReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Get a single report by ID
 */
export async function getReportById(id: string, userId: string) {
  return prisma.rEMarketReport.findFirst({
    where: { id, userId }
  });
}

/**
 * Delete a report
 */
export async function deleteReport(id: string, userId: string) {
  await prisma.rEMarketReport.deleteMany({
    where: { id, userId }
  });
  return { success: true };
}

/**
 * Mark report as sent
 */
export async function markReportSent(id: string, userId: string, recipients: string[]) {
  await prisma.rEMarketReport.update({
    where: { id },
    data: {
      sentTo: recipients as any,
      sentAt: new Date()
    }
  });
  return { success: true };
}
