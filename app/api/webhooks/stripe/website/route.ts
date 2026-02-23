/**
 * Stripe Webhook Handler for Website Payments
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { websiteStripeConnect } from '@/lib/website-builder/stripe-connect';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_WEBSITE || 'whsec_placeholder_for_build';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return apiErrors.badRequest('No signature');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return apiErrors.badRequest('Invalid signature');
    }

    // Handle website payment events
    await websiteStripeConnect.handleWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Website Stripe webhook error:', error);
    return apiErrors.internal(error.message || 'Webhook processing failed');
  }
}
