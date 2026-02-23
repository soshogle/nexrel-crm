
/**
 * Widget Analytics API
 * Returns performance metrics for a widget
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const analytics = await widgetService.getWidgetAnalytics(
      params.id,
      session.user.id
    );

    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching widget analytics:', error);
    return apiErrors.internal('Failed to fetch analytics', error.message);
  }
}
