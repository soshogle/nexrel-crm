
/**
 * Stripe Checkout Session API
 * Creates Stripe checkout session for subscription upgrades
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeSubscriptionService } from '@/lib/payments/stripe-subscription-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tier } = body;

    if (!tier || !['PRO', 'ENTERPRISE'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
