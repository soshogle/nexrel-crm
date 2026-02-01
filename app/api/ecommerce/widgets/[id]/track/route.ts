
/**
 * Widget Tracking API
 * Tracks widget interactions (impressions, clicks, conversions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { widgetService } from '@/lib/ecommerce/widget-service';

// This endpoint doesn't require authentication as it's called from external websites

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, embedId, revenue, trackingData } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'impression':
        if (!trackingData) {
          return NextResponse.json(
            { error: 'Tracking data is required for impressions' },
            { status: 400 }
          );
        }
        result = await widgetService.trackEmbed({
          widgetConfigId: params.id,
          ...trackingData,
        });
        break;

      case 'click':
        result = await widgetService.trackClick({
          widgetId: params.id,
          productId: trackingData?.productId,
          sessionId: embedId,
          domain: trackingData?.domain,
          userAgent: trackingData?.userAgent,
        });
        break;

      case 'conversion':
        result = await widgetService.trackConversion({
          widgetId: params.id,
          productId: trackingData?.productId || 'unknown',
          conversionValue: revenue || 0,
          sessionId: embedId,
          domain: trackingData?.domain,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error tracking widget action:', error);
    return NextResponse.json(
      { error: 'Failed to track action', details: error.message },
      { status: 500 }
    );
  }
}
