
/**
 * Subscription Status API
 * Get current user's subscription details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeSubscriptionService, SUBSCRIPTION_PLANS } from '@/lib/payments/stripe-subscription-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const subscription = await stripeSubscriptionService.getSubscription(
      session.user.id
    );

    if (!subscription) {
      const defaultPlan = SUBSCRIPTION_PLANS.PRO;
      return NextResponse.json({
        tier: 'PRO',
        status: 'ACTIVE',
        plan: {
          name: defaultPlan.name,
          price: defaultPlan.priceMonthly,
          features: defaultPlan.features,
        },
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
    return apiErrors.internal(error.message || 'Failed to fetch subscription');
  }
}
