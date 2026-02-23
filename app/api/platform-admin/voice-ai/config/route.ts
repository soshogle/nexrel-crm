/**
 * Platform Admin - Voice AI Configuration API
 * 
 * Manages the master ElevenLabs API key and global platform settings.
 * Only accessible by PLATFORM_ADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Retrieve platform configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Check for PLATFORM_ADMIN role
    if ((session.user as { role?: string }).role !== 'PLATFORM_ADMIN') {
      return apiErrors.forbidden('Forbidden - Platform Admin only');
    }

    const config = await voiceAIPlatform.getPlatformConfig();
    const stats = await voiceAIPlatform.getPlatformStats();
    
    // Mask the API key for display (show only last 4 chars)
    const maskedConfig = config ? {
      ...config,
      masterElevenLabsKey: config.masterElevenLabsKey 
        ? `sk_...${config.masterElevenLabsKey.slice(-4)}`
        : null,
      masterTwilioToken: config.masterTwilioToken
        ? `...${config.masterTwilioToken.slice(-4)}`
        : null,
    } : null;

    return NextResponse.json({
      config: maskedConfig,
      stats: stats.stats,
    });
  } catch (error: unknown) {
    console.error('[PlatformAdmin] Error fetching config:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to fetch configuration');
  }
}

// PUT - Update platform configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Check for PLATFORM_ADMIN role
    if ((session.user as { role?: string }).role !== 'PLATFORM_ADMIN') {
      return apiErrors.forbidden('Forbidden - Platform Admin only');
    }

    const body = await request.json();
    const {
      masterElevenLabsKey,
      masterTwilioSid,
      masterTwilioToken,
      defaultPricePerMin,
      defaultOverageRate,
      totalMonthlyQuota,
    } = body;

    const updatedConfig = await voiceAIPlatform.updatePlatformConfig({
      masterElevenLabsKey,
      masterTwilioSid,
      masterTwilioToken,
      defaultPricePerMin: defaultPricePerMin ? parseFloat(defaultPricePerMin) : undefined,
      defaultOverageRate: defaultOverageRate ? parseFloat(defaultOverageRate) : undefined,
      totalMonthlyQuota: totalMonthlyQuota ? parseInt(totalMonthlyQuota) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Platform configuration updated',
      config: {
        ...updatedConfig,
        masterElevenLabsKey: updatedConfig.masterElevenLabsKey 
          ? `sk_...${updatedConfig.masterElevenLabsKey.slice(-4)}`
          : null,
      },
    });
  } catch (error: unknown) {
    console.error('[PlatformAdmin] Error updating config:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to update configuration');
  }
}
