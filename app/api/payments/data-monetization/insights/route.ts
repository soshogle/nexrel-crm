
/**
 * Data Monetization Insights API
 * Generates and retrieves aggregated insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';
import { InsightType, InsightPeriod } from '@prisma/client';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const insightType = searchParams.get('insightType') as InsightType | null;
    const period = searchParams.get('period') as InsightPeriod | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters: any = {};
    if (insightType) filters.insightType = insightType;
    if (period) filters.period = period;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const insights = await dataMonetizationService.getInsights(
      session.user.id,
      filters
    );

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { insightType, period, startDate, endDate } = body;

    if (!insightType || !period || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to generate insight', details: error.message },
      { status: 500 }
    );
  }
}
