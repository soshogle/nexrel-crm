
/**
 * Data Monetization Insights API
 * Generates and retrieves aggregated insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';
import { InsightType, InsightPeriod } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const insightType = searchParams.get('insightType') as InsightType | null;
    const period = searchParams.get('period') as InsightPeriod | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const insights = await prisma.dataInsight.findMany({
      where: {
        userId: session.user.id,
        ...(insightType ? { insightType } : {}),
        ...(period ? { period } : {}),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    return apiErrors.internal('Failed to fetch insights', error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { insightType, period, startDate, endDate } = body;

    if (!insightType || !period || !startDate || !endDate) {
      return apiErrors.badRequest('Missing required fields');
    }

    const insight = await dataMonetizationService.generateInsight({
      userId: session.user.id,
      insightType,
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json({ insight });
  } catch (error: any) {
    console.error('Error generating insight:', error);
    return apiErrors.internal('Failed to generate insight', error.message);
  }
}
