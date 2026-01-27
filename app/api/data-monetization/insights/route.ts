
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';

/**
 * GET /api/data-monetization/insights
 * Get data insights for user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const insightType = searchParams.get('insightType') || undefined;
    const category = searchParams.get('category') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const insights = await dataMonetizationService.getInsights(session.user.id, {
      insightType,
      category,
      startDate,
      endDate,
    });

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data-monetization/insights
 * Create a new data insight
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      insightType,
      category,
      title,
      description,
      dataPoints,
      timeRange,
      confidence,
    } = body;

    // Validate required fields
    if (!insightType || !title || !description || !dataPoints || !timeRange) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const insight = await dataMonetizationService.createInsight({
      userId: session.user.id,
      insightType,
      category,
      title,
      description,
      dataPoints,
      timeRange,
      confidence: confidence || 0.5,
    });

    return NextResponse.json({
      insight,
      message: 'Insight created successfully',
    });
  } catch (error: any) {
    console.error('Error creating insight:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create insight' },
      { status: 500 }
    );
  }
}
