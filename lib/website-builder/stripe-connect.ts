/**
 * Stripe Connect Integration for Websites
 * Allows users to connect their Stripe accounts to accept payments on their websites
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { websiteOrderService } from './order-service';

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
        // Get website to find owner
        const website = await prisma.website.findUnique({
          where: { id: websiteId },
          select: { userId: true },
        });

        if (!website) {
          console.error(`Website ${websiteId} not found for payment intent ${paymentIntent.id}`);
          return;
        }

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

        // Extract customer and product data from metadata
        const metadata = paymentIntent.metadata;
        const customerEmail = paymentIntent.receipt_email || metadata.customerEmail || '';
        const customerName = metadata.customerName || 'Customer';
        const customerPhone = metadata.customerPhone || undefined;

        // Parse product data from metadata (stored as JSON string)
        let orderItems: Array<{
          productId: string;
          productName: string;
          productSku: string;
          quantity: number;
          price: number;
          total: number;
        }> = [];

        if (metadata.products) {
          try {
            const products = JSON.parse(metadata.products);
            orderItems = products.map((p: any) => ({
              productId: p.productId,
              productName: p.name,
              productSku: p.sku,
              quantity: p.quantity,
              price: Math.round(p.price * 100), // Convert to cents
              total: Math.round(p.price * p.quantity * 100),
            }));
          } catch (e) {
            console.error('Failed to parse products from metadata:', e);
          }
        }

        // Parse shipping address from metadata
        let shippingAddress: any = undefined;
        if (metadata.shippingAddress) {
          try {
            shippingAddress = JSON.parse(metadata.shippingAddress);
          } catch (e) {
            console.error('Failed to parse shipping address:', e);
          }
        }

        // Create order if we have product data
        if (orderItems.length > 0 && customerEmail) {
          try {
            const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
            const tax = metadata.tax ? Math.round(parseFloat(metadata.tax) * 100) : 0;
            const shipping = metadata.shipping ? Math.round(parseFloat(metadata.shipping) * 100) : 0;
            const discount = metadata.discount ? Math.round(parseFloat(metadata.discount) * 100) : 0;
            const total = subtotal + tax + shipping - discount;

            await websiteOrderService.createOrder({
              websiteId,
              userId: website.userId,
              customer: {
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                shippingAddress,
                billingAddress: shippingAddress, // Use shipping as billing if not provided
              },
              items: orderItems,
              subtotal,
              tax,
              shipping,
              discount,
              total,
              paymentIntentId: paymentIntent.id,
              paymentMethod: 'stripe',
              metadata: {
                ...metadata,
                stripePaymentIntentId: paymentIntent.id,
              },
            });

            console.log(`✅ Order created for website ${websiteId}, payment ${paymentIntent.id}`);
          } catch (error: any) {
            console.error('Error creating order from payment:', error);
            // Don't throw - we still want to trigger the webhook
          }
        }

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
              customerEmail,
              orderCreated: orderItems.length > 0,
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
