
/**
 * Widget Analytics API
 * Returns performance metrics for a widget
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const analytics = await widgetService.getWidgetAnalytics(
      params.id,
      session.user.id
    );

    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching widget analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}
