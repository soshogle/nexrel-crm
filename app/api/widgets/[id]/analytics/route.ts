
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';

/**
 * GET /api/widgets/[id]/analytics
 * Get widget analytics
 */

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('eventType') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const analytics = await widgetService.getAnalytics(
      params.id,
      session.user.id,
      {
        eventType,
        startDate,
        endDate,
      }
    );

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Error fetching widget analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch widget analytics' },
      { status: 500 }
    );
  }
}
