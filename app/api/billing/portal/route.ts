
/**
 * Stripe Customer Portal API
 * Creates billing portal session for subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeSubscriptionService } from '@/lib/payments/stripe-subscription-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const portalSession = await stripeSubscriptionService.createPortalSession(
      session.user.id,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`
    );

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error('❌ Portal error:', error);
    return apiErrors.internal(error.message || 'Failed to create portal session');
  }
}
