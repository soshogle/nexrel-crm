/**
 * Analytics Configuration API
 * Manage Google Analytics and Facebook Pixel integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteAnalyticsIntegrationService } from '@/lib/website-builder/analytics-integration';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await websiteAnalyticsIntegrationService.getAnalyticsConfig(params.id);
    const trackingCodes = websiteAnalyticsIntegrationService.generateTrackingCodes(config);

    return NextResponse.json({
      success: true,
      config,
      trackingCodes,
    });
  } catch (error: any) {
    console.error('Error fetching analytics config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics config' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { googleAnalyticsId, facebookPixelId } = body;

    // Validate IDs if provided
    if (googleAnalyticsId && !websiteAnalyticsIntegrationService.validateGoogleAnalyticsId(googleAnalyticsId)) {
      return NextResponse.json(
        { error: 'Invalid Google Analytics ID format. Use G-XXXXXXXXXX (GA4) or UA-XXXXXXXXX-X (Universal)' },
        { status: 400 }
      );
    }

    if (facebookPixelId && !websiteAnalyticsIntegrationService.validateFacebookPixelId(facebookPixelId)) {
      return NextResponse.json(
        { error: 'Invalid Facebook Pixel ID format. Must be 15-16 digits' },
        { status: 400 }
      );
    }

    const updated = await websiteAnalyticsIntegrationService.updateAnalyticsConfig(params.id, {
      googleAnalyticsId,
      facebookPixelId,
    });

    const trackingCodes = websiteAnalyticsIntegrationService.generateTrackingCodes({
      googleAnalyticsId: updated.googleAnalyticsId || undefined,
      facebookPixelId: updated.facebookPixelId || undefined,
    });

    return NextResponse.json({
      success: true,
      config: {
        googleAnalyticsId: updated.googleAnalyticsId,
        facebookPixelId: updated.facebookPixelId,
      },
      trackingCodes,
    });
  } catch (error: any) {
    console.error('Error updating analytics config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update analytics config' },
      { status: 500 }
    );
  }
}
