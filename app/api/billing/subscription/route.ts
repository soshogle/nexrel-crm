
/**
 * Subscription Status API
 * Get current user's subscription details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeSubscriptionService, SUBSCRIPTION_PLANS } from '@/lib/payments/stripe-subscription-service';


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await stripeSubscriptionService.getSubscription(
      session.user.id
    );

    if (!subscription) {
      return NextResponse.json({
        tier: 'PRO',
        status: 'ACTIVE',
        features: SUBSCRIPTION_PLANS.PRO.features,
      });
    }

    const plan = SUBSCRIPTION_PLANS[subscription.tier];

    return NextResponse.json({
      ...subscription,
      plan: {
        name: plan.name,
        price: plan.priceMonthly,
        features: plan.features,
      },
    });
  } catch (error: any) {
    console.error('❌ Subscription fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
