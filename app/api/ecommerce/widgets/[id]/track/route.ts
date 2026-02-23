
/**
 * Widget Tracking API
 * Tracks widget interactions (impressions, clicks, conversions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { widgetService } from '@/lib/ecommerce/widget-service';
import { apiErrors } from '@/lib/api-error';

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
      return apiErrors.badRequest('Action is required');
    }

    let result;

    switch (action) {
      case 'impression':
        if (!trackingData) {
          return apiErrors.badRequest('Tracking data is required for impressions');
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
        return apiErrors.badRequest('Invalid action');
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error tracking widget action:', error);
    return apiErrors.internal('Failed to track action', error.message);
  }
}
