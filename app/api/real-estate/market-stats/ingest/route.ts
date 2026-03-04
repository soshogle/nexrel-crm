export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { parseAllCentrisPdfs, parseAllJlrMonthlyReports, type CentrisStatRow } from '@/lib/real-estate/centris-pdf-parser';
import path from 'path';

/**
 * POST /api/real-estate/market-stats/ingest
 * Triggers Centris PDF + JLR Monthly Report ingestion from data/market-reports/
 * Restricted to super admins.
 * Writes to shared Quebec stats (isShared=true, userId=null) — visible to all RE users.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Only super admins can trigger data ingestion');
    }

    const dataDir = path.resolve(process.cwd(), 'data/market-reports');
    const [centrisRows, jlrRows] = await Promise.all([
      parseAllCentrisPdfs(dataDir),
      parseAllJlrMonthlyReports(dataDir),
    ]);
    const rows = [...centrisRows, ...jlrRows];

    if (rows.length === 0) {
      return NextResponse.json({ success: true, message: 'No data extracted from PDFs. Ensure PDFs are in data/market-reports/', created: 0 });
    }

    const deduped = new Map<string, CentrisStatRow>();
    for (const row of rows) {
      const key = `${row.periodYear}-${row.periodMonth}|${row.region}|${row.municipality}|${row.propertyType || 'All Types'}|${row.source || 'centris_pdf'}`;
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, row);
      } else if (row.periodType === 'MONTHLY' && existing.periodType === 'CUMULATIVE') {
        deduped.set(key, row);
      } else if (row.periodType === existing.periodType && (row.numberOfSales ?? 0) > (existing.numberOfSales ?? 0)) {
        deduped.set(key, row);
      }
    }

    const records = Array.from(deduped.values());

    // Delete existing shared Quebec stats (Centris + JLR)
    await prisma.rEMarketStats.deleteMany({
      where: {
        isShared: true,
        source: { in: ['centris_pdf', 'jlr_monthly_report'] },
      },
    });

    const INT4_MAX = 2_147_483_647;
    const safeInt = (v: number | undefined | null): number | null => {
      if (v == null || isNaN(v)) return null;
      return Math.abs(v) <= INT4_MAX ? v : null;
    };
    const safeDom = (v: number | undefined | null): number | null => {
      if (v == null || isNaN(v) || v > 5000 || v < 0) return null;
      return v;
    };

    const batchData = records.map(row => {
      const rawData: Record<string, unknown> = {};
      if (row.neighborhood) rawData.neighborhood = row.neighborhood;
      if (row.volumeOfSales) rawData.volumeOfSales = row.volumeOfSales;
      if (row.saleVsAssessPct) rawData.saleVsAssessPct = row.saleVsAssessPct;

      return {
        userId: null,
        isShared: true,
        periodStart: new Date(row.periodYear, row.periodMonth - 1, 1),
        periodEnd: new Date(row.periodYear, row.periodMonth, 0),
        periodType: 'MONTHLY' as const,
        region: row.region,
        city: row.municipality,
        state: 'QC',
        country: 'CA',
        propertyCategory: row.propertyType || null,
        medianSalePrice: row.medianSalePrice ?? null,
        avgSalePrice: row.avgSalePrice ?? null,
        domAvg: safeDom(row.dom),
        domMedian: safeDom(row.dom),
        newListings: safeInt(row.newListings),
        closedSales: safeInt(row.numberOfSales),
        numberOfSales: safeInt(row.numberOfSales),
        activeInventory: safeInt(row.activeListings),
        closePriceToAskingRatio: row.saleVsListPct ?? null,
        closePriceToOriginalRatio: row.saleVsAssessPct ?? null,
        monthsOfSupply: (row.numberOfSales && row.activeListings && row.numberOfSales > 0)
          ? Math.round((row.activeListings / row.numberOfSales) * 10) / 10
          : null,
        sampleSize: safeInt(row.numberOfSales),
        source: row.source || 'centris_pdf',
        sourceFile: row.sourceFile,
        rawData: Object.keys(rawData).length > 0 ? rawData : undefined,
      };
    });

    let created = 0;
    const BATCH_SIZE = 500;
    for (let i = 0; i < batchData.length; i += BATCH_SIZE) {
      const batch = batchData.slice(i, i + BATCH_SIZE);
      const result = await prisma.rEMarketStats.createMany({ data: batch });
      created += result.count;
    }

    return NextResponse.json({
      success: true,
      message: `Ingested ${created} Quebec market stat records from Centris + JLR PDFs (shared across all RE users)`,
      created,
      totalRows: rows.length,
      uniqueRecords: records.length,
    });
  } catch (error) {
    console.error('Market stats ingest error:', error);
    return apiErrors.internal('Failed to ingest market data');
  }
}
