
/**
 * Stripe Subscription Service
 * Manages agency billing (YOU charge businesses for using the CRM)
 * Separate from Soshogle Pay (businesses charging their customers)
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db';

// Initialize Stripe with agency credentials
// Use a fallback key during build time to prevent initialization errors
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-10-29.clover',
});

// Subscription Plan Definitions
// FREE plan removed - all users must have paid subscriptions
export const SUBSCRIPTION_PLANS = {
  FREE: {
    tier: 'FREE',
    name: 'Free Plan',
    priceMonthly: 0,
    stripePriceId: '',
    features: {
      maxContacts: 100,
      maxVoiceAgents: 1,
      monthlyMinutes: 100,
      maxTeamMembers: 1,
      maxCampaigns: 5,
      emailSupport: true,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
    },
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro Plan',
    priceMonthly: 79,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    features: {
      maxContacts: 5000,
      maxVoiceAgents: 5,
      monthlyMinutes: 1000,
      maxTeamMembers: 10,
      maxCampaigns: 50,
      emailSupport: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
    },
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Enterprise Plan',
    priceMonthly: 299,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    features: {
      maxContacts: -1, // Unlimited
      maxVoiceAgents: -1, // Unlimited
      monthlyMinutes: 10000,
      maxTeamMembers: -1, // Unlimited
      maxCampaigns: -1, // Unlimited
      emailSupport: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
    },
  },
};

export class StripeSubscriptionService {
  /**
   * Create or retrieve Stripe customer for a user
   */
  async createOrGetCustomer(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Return existing customer if already created
    if (user.subscription?.stripeCustomerId) {
      return user.subscription.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    });

    // Update database with Stripe customer ID
    await prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customer.id,
        tier: 'PRO',
        status: 'ACTIVE',
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  /**
   * Create Stripe checkout session for subscription upgrade
   */
  async createCheckoutSession(params: {
    userId: string;
    tier: 'PRO' | 'ENTERPRISE';
    successUrl: string;
    cancelUrl: string;
  }) {
    const { userId, tier, successUrl, cancelUrl } = params;

    const customerId = await this.createOrGetCustomer(userId);
    const plan = SUBSCRIPTION_PLANS[tier];

    if (!plan.stripePriceId) {
      throw new Error(`Stripe Price ID not configured for ${tier} plan`);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session;
  }

  /**
   * Create billing portal session
   */
  async createPortalSession(userId: string, returnUrl: string) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this user');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
  }

  /**
   * Update subscription tier
   */
  async updateSubscription(userId: string, newTier: 'PRO' | 'ENTERPRISE') {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('No subscription found for this user');
    }

    // Update subscription to new tier (PRO or ENTERPRISE)
    if (subscription.stripeSubscriptionId) {
      const plan = SUBSCRIPTION_PLANS[newTier];
      if (!plan.stripePriceId) {
        throw new Error(`Stripe Price ID not configured for ${newTier} plan`);
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: plan.stripePriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      await prisma.userSubscription.update({
        where: { userId },
        data: {
          tier: newTier,
          stripePriceId: plan.stripePriceId,
        },
      });
    }

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, immediate: boolean = false) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription to cancel');
    }

    if (immediate) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      await prisma.userSubscription.update({
        where: { userId },
        data: {
          tier: 'PRO',
          status: 'CANCELLED',
          canceledAt: new Date(),
          stripeSubscriptionId: null,
          stripePriceId: null,
        },
      });
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.userSubscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
          cancelAt: subscription.currentPeriodEnd,
        },
      });
    }

    return subscription;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    console.log('📥 Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as 'PRO' | 'ENTERPRISE';

    if (!userId || !tier) {
      console.error('❌ Missing metadata in checkout session');
      return;
    }

    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    await prisma.userSubscription.update({
      where: { userId },
      data: {
        tier,
        status: 'ACTIVE',
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        stripePriceId: SUBSCRIPTION_PLANS[tier].stripePriceId,
      },
    });

    console.log(`✅ Subscription activated for user ${userId}: ${tier}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const userSub = await prisma.userSubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!userSub) {
      console.error('❌ No user subscription found for customer:', customerId);
      return;
    }

    // Determine tier from price ID
    let tier: 'PRO' | 'ENTERPRISE' = 'PRO';
    const priceId = subscription.items.data[0]?.price.id;

    if (priceId === SUBSCRIPTION_PLANS.PRO.stripePriceId) {
      tier = 'PRO';
    } else if (priceId === SUBSCRIPTION_PLANS.ENTERPRISE.stripePriceId) {
      tier = 'ENTERPRISE';
    }

    // Type-safe extraction of subscription properties
    const subscriptionData: any = subscription;
    const currentPeriodStart = subscriptionData.current_period_start 
      ? new Date(subscriptionData.current_period_start * 1000) 
      : null;
    const currentPeriodEnd = subscriptionData.current_period_end 
      ? new Date(subscriptionData.current_period_end * 1000) 
      : null;
    const cancelAt = subscriptionData.cancel_at 
      ? new Date(subscriptionData.cancel_at * 1000) 
      : null;

    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: {
        tier,
        status: subscription.status.toUpperCase(),
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end || false,
        cancelAt,
      },
    });

    console.log(`✅ Subscription updated for user ${userSub.userId}: ${tier}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const userSub = await prisma.userSubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!userSub) {
      console.error('❌ No user subscription found for customer:', customerId);
      return;
    }

    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: {
        tier: 'PRO',
        status: 'CANCELLED',
        canceledAt: new Date(),
        stripeSubscriptionId: null,
        stripePriceId: null,
      },
    });

    console.log(`✅ Subscription cancelled for user ${userSub.userId}`);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const userSub = await prisma.userSubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!userSub) return;

    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: {
        lastPaymentStatus: 'succeeded',
        lastPaymentError: null,
        nextPaymentAttempt: null,
      },
    });

    console.log(`✅ Payment succeeded for user ${userSub.userId}`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const userSub = await prisma.userSubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!userSub) return;

    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: {
        lastPaymentStatus: 'failed',
        lastPaymentError: invoice.last_finalization_error?.message || 'Payment failed',
        nextPaymentAttempt: invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000)
          : null,
      },
    });

    console.log(`❌ Payment failed for user ${userSub.userId}`);
  }

  /**
   * Get subscription details
   */
  async getSubscription(userId: string) {
    return await prisma.userSubscription.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Track voice AI usage
   */
  async trackVoiceUsage(userId: string, minutesUsed: number) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('No subscription found for this user');
    }

    const newMinutesUsed = subscription.minutesUsed + minutesUsed;
    const overage = Math.max(0, newMinutesUsed - subscription.monthlyMinutes);

    await prisma.userSubscription.update({
      where: { userId },
      data: {
        minutesUsed: newMinutesUsed,
        overage,
        totalChargesUSD:
          subscription.basePriceUSD + overage * subscription.perMinutePriceUSD,
      },
    });
  }

  /**
   * Reset monthly usage
   */
  async resetMonthlyUsage(userId: string) {
    await prisma.userSubscription.update({
      where: { userId },
      data: {
        minutesUsed: 0,
        overage: 0,
        lastResetAt: new Date(),
      },
    });
  }
}

export const stripeSubscriptionService = new StripeSubscriptionService();
