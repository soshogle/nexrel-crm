
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

let stripeClient: Stripe | null = null;

export async function getStripeClient(userId: string): Promise<Stripe | null> {
  const settings = await prisma.paymentProviderSettings.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'STRIPE'
      }
    }
  });

  if (!settings || !settings.secretKey || !settings.isActive) {
    return null;
  }

  // Initialize Stripe with the user's secret key
  return new Stripe(settings.secretKey, {
    apiVersion: '2025-10-29.clover',
    typescript: true
  });
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description?: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(
  userId: string,
  params: CreatePaymentIntentParams
) {
  const stripe = await getStripeClient(userId);
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(params.amount * 100), // Convert to cents
    currency: params.currency.toLowerCase(),
    receipt_email: params.customerEmail,
    description: params.description,
    metadata: params.metadata || {},
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never'
    }
  });

  return paymentIntent;
}

export async function createCustomer(
  userId: string,
  email: string,
  name: string,
  phone?: string
) {
  const stripe = await getStripeClient(userId);
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const customer = await stripe.customers.create({
    email,
    name,
    phone
  });

  return customer;
}

export async function retrievePaymentIntent(
  userId: string,
  paymentIntentId: string
) {
  const stripe = await getStripeClient(userId);
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function refundPayment(
  userId: string,
  paymentIntentId: string,
  amount?: number,
  reason?: string
) {
  const stripe = await getStripeClient(userId);
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
    reason: reason as any
  });

  return refund;
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
) {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-10-29.clover'
    });
  }

  return stripeClient.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );
}
