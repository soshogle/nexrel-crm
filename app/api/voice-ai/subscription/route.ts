/**
 * Agency Voice AI Subscription API
 * 
 * Allows agencies to view their own Voice AI subscription and usage.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get current user's Voice AI subscription and usage summary
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const summary = await voiceAIPlatform.getAgencyUsageSummary(session.user.id);

    return NextResponse.json({
      subscription: {
        tier: summary.subscription.tier,
        monthlyMinutesQuota: summary.subscription.monthlyMinutesQuota,
        minutesUsedThisMonth: summary.subscription.minutesUsedThisMonth,
        pricePerMinute: Number(summary.subscription.pricePerMinute),
        overageAllowed: summary.subscription.overageAllowed,
        overageRate: Number(summary.subscription.overageRate),
        isActive: summary.subscription.isActive,
        billingCycleStart: summary.subscription.billingCycleStart,
      },
      usage: summary.usage,
    });
  } catch (error: unknown) {
    console.error('[VoiceAI] Error fetching subscription:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to fetch subscription');
  }
}
