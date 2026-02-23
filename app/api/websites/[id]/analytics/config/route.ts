/**
 * Analytics Configuration API
 * Manage Google Analytics and Facebook Pixel integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteAnalyticsIntegrationService } from '@/lib/website-builder/analytics-integration';
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal(error.message || 'Failed to fetch analytics config');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { googleAnalyticsId, facebookPixelId } = body;

    // Validate IDs if provided
    if (googleAnalyticsId && !websiteAnalyticsIntegrationService.validateGoogleAnalyticsId(googleAnalyticsId)) {
      return apiErrors.badRequest('Invalid Google Analytics ID format. Use G-XXXXXXXXXX (GA4) or UA-XXXXXXXXX-X (Universal)');
    }

    if (facebookPixelId && !websiteAnalyticsIntegrationService.validateFacebookPixelId(facebookPixelId)) {
      return apiErrors.badRequest('Invalid Facebook Pixel ID format. Must be 15-16 digits');
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
    return apiErrors.internal(error.message || 'Failed to update analytics config');
  }
}
