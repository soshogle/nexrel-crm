/**
 * Platform Admin - Voice AI Subscriptions API
 * 
 * Manages all agency Voice AI subscriptions.
 * Only accessible by PLATFORM_ADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { VoiceAISubscriptionTier } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - List all agency subscriptions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Check for PLATFORM_ADMIN role
    if ((session.user as { role?: string }).role !== 'PLATFORM_ADMIN') {
      return apiErrors.forbidden('Forbidden - Platform Admin only');
    }

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier') as VoiceAISubscriptionTier | null;
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await voiceAIPlatform.getAllAgencySubscriptions({
      tier: tier || undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[PlatformAdmin] Error fetching subscriptions:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to fetch subscriptions');
  }
}

// PUT - Update an agency's subscription
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
      userId,
      tier,
      monthlyMinutesQuota,
      pricePerMinute,
      overageAllowed,
      overageRate,
      isActive,
      notes,
    } = body;

    if (!userId) {
      return apiErrors.badRequest('userId is required');
    }

    const updatedSubscription = await voiceAIPlatform.updateAgencySubscription(userId, {
      tier,
      monthlyMinutesQuota: monthlyMinutesQuota ? parseInt(monthlyMinutesQuota) : undefined,
      pricePerMinute: pricePerMinute ? parseFloat(pricePerMinute) : undefined,
      overageAllowed,
      overageRate: overageRate ? parseFloat(overageRate) : undefined,
      isActive,
      notes,
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error: unknown) {
    console.error('[PlatformAdmin] Error updating subscription:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to update subscription');
  }
}
