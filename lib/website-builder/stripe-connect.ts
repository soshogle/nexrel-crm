/**
 * Stripe Connect Integration for Websites
 * Allows users to connect their Stripe accounts to accept payments on their websites
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db';

// Use platform Stripe account (your CRM's account)
const platformStripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build';
const stripe = new Stripe(platformStripeKey, {
  apiVersion: '2025-10-29.clover',
});

export class WebsiteStripeConnectService {
  /**
   * Create Stripe Connect account link for onboarding
   */
  async createAccountLink(websiteId: string, returnUrl: string) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: { user: true },
    });

    if (!website) {
      throw new Error('Website not found');
    }

    let connectAccountId = website.stripeConnectAccountId;

    // Create Connect account if doesn't exist
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // TODO: Get from user settings
        email: website.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          websiteId,
          userId: website.userId,
        },
      });

      connectAccountId = account.id;

      // Save to database
      await prisma.website.update({
        where: { id: websiteId },
        data: { stripeConnectAccountId: connectAccountId },
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return {
      accountId: connectAccountId,
      onboardingUrl: accountLink.url,
    };
  }

  /**
   * Get Connect account status
   */
  async getAccountStatus(websiteId: string) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website || !website.stripeConnectAccountId) {
      return {
        connected: false,
        status: 'not_connected',
      };
    }

    try {
      const account = await stripe.accounts.retrieve(website.stripeConnectAccountId);

      return {
        connected: account.details_submitted && account.charges_enabled,
        status: account.details_submitted ? 'active' : 'pending',
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      };
    } catch (error) {
      console.error('Error retrieving Stripe account:', error);
      return {
        connected: false,
        status: 'error',
      };
    }
  }

  /**
   * Create payment intent using Connect account
   */
  async createPaymentIntent(
    websiteId: string,
    params: {
      amount: number; // in dollars
      currency?: string;
      customerEmail?: string;
      customerName?: string;
      description?: string;
      metadata?: Record<string, string>;
    }
  ) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website || !website.stripeConnectAccountId) {
      throw new Error('Stripe account not connected');
    }

    // Verify account is active
    const accountStatus = await this.getAccountStatus(websiteId);
    if (!accountStatus.connected) {
      throw new Error('Stripe account not fully activated');
    }

    // Create payment intent on Connect account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: (params.currency || 'usd').toLowerCase(),
        description: params.description,
        metadata: {
          websiteId,
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        stripeAccount: website.stripeConnectAccountId,
      }
    );

    // Store payment intent in database
    await prisma.websiteIntegration.create({
      data: {
        websiteId,
        type: 'STRIPE',
        config: {
          paymentIntentId: paymentIntent.id,
          amount: params.amount,
          currency: params.currency || 'usd',
          status: 'pending',
        },
        status: 'ACTIVE',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Handle payment webhook from Stripe
   */
  async handleWebhook(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const websiteId = paymentIntent.metadata.websiteId;

      if (websiteId) {
        // Update integration status
        await prisma.websiteIntegration.updateMany({
          where: {
            websiteId,
            type: 'STRIPE',
            config: {
              path: ['paymentIntentId'],
              equals: paymentIntent.id,
            },
          },
          data: {
            config: {
              paymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: 'succeeded',
            },
          },
        });

        // Trigger website webhook
        await fetch(`${process.env.NEXTAUTH_URL}/api/webhooks/website`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId,
            eventType: 'payment_received',
            data: {
              paymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              customerEmail: paymentIntent.receipt_email,
            },
          }),
        });
      }
    }
  }

  /**
   * Create login link for Connect account dashboard
   */
  async createLoginLink(websiteId: string) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website || !website.stripeConnectAccountId) {
      throw new Error('Stripe account not connected');
    }

    const loginLink = await stripe.accounts.createLoginLink(
      website.stripeConnectAccountId
    );

    return {
      url: loginLink.url,
      expiresAt: loginLink.expires_at,
    };
  }
}

export const websiteStripeConnect = new WebsiteStripeConnectService();
