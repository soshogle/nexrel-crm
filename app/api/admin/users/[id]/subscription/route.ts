
/**
 * Admin Subscription Management API
 * Update subscription tier and status for a user with Stripe integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripeSubscriptionService } from '@/lib/payments/stripe-subscription-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, tier, status, basePriceUSD, trialEnd, immediate } = body;

    // Get user to verify existence
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let subscription;

    // Handle different actions
    if (action === 'upgrade' && tier) {
      // Update subscription tier via Stripe
      await stripeSubscriptionService.updateSubscription(params.id, tier);
      subscription = await stripeSubscriptionService.getSubscription(params.id);
    } else if (action === 'cancel') {
      // Cancel subscription
      await stripeSubscriptionService.cancelSubscription(params.id, immediate || false);
      subscription = await stripeSubscriptionService.getSubscription(params.id);
    } else if (action === 'reset-usage') {
      // Reset monthly usage
      await stripeSubscriptionService.resetMonthlyUsage(params.id);
      subscription = await stripeSubscriptionService.getSubscription(params.id);
    } else {
      // Manual subscription update (fallback for non-Stripe updates)
      subscription = await prisma.userSubscription.upsert({
        where: { userId: params.id },
        create: {
          userId: params.id,
          tier: tier || 'FREE',
          status: status || 'ACTIVE',
          basePriceUSD: basePriceUSD || 0,
          ...(trialEnd && { trialEnd: new Date(trialEnd) }),
        },
        update: {
          ...(tier && { tier }),
          ...(status && { status }),
          ...(basePriceUSD !== undefined && { basePriceUSD }),
          ...(trialEnd && { trialEnd: new Date(trialEnd) }),
        },
      });
    }

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        adminEmail: session.user.email || '',
        targetUserId: params.id,
        targetUserEmail: user.email,
        action: 'UPDATE_SUBSCRIPTION',
        details: body,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      subscription,
      message: 'Subscription updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription', details: error.message },
      { status: 500 }
    );
  }
}
