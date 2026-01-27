export const dynamic = "force-dynamic";

/**
 * Market Reports API - Generate and retrieve market intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  collectMarketStats,
  generateMarketReport,
  getUserReports
} from '@/lib/real-estate/market-intelligence';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get user's reports
    if (action === 'list') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const reports = await getUserReports(session.user.id, limit);
      return NextResponse.json({ reports });
    }

    // Get market stats
    if (action === 'stats') {
      const area = searchParams.get('area');
      const state = searchParams.get('state');
      const period = searchParams.get('period') as 'week' | 'month' | 'quarter' | 'year' || 'month';

      if (!area || !state) {
        return NextResponse.json({ error: 'Area and state required' }, { status: 400 });
      }

      const stats = await collectMarketStats(area, state, period, session.user.id);
      return NextResponse.json({ stats });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Market reports GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, area, state, type } = body;

    // Generate report
    if (action === 'generate') {
      if (!area || !state) {
        return NextResponse.json({ error: 'Area and state required' }, { status: 400 });
      }

      const reportType = type || 'monthly';
      const report = await generateMarketReport(area, state, reportType, session.user.id);
      
      return NextResponse.json({
        success: true,
        report
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Market reports POST error:', error);
    return NextResponse.json(
      { error: 'Report generation failed' },
      { status: 500 }
    );
  }
}
