
/**
 * Stripe Checkout Session API
 * Creates Stripe checkout session for subscription upgrades
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

    const body = await req.json();
    const { tier } = body;

    if (!tier || !['PRO', 'ENTERPRISE'].includes(tier)) {
      return apiErrors.badRequest('Invalid subscription tier');
    }

    // Create checkout session
    const checkoutSession = await stripeSubscriptionService.createCheckoutSession({
      userId: session.user.id,
      tier,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?subscription=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?subscription=cancelled`,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error('❌ Checkout error:', error);
    return apiErrors.internal(error.message || 'Failed to create checkout session');
  }
}
