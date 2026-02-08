/**
 * Dental Billing Integration Service
 * Phase 6: Enhanced Stripe/Square integration for dental payments
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db';

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-10-29.clover',
});

// Square client initialization (commented out until Square SDK is properly configured)
// import { Client, Environment } from 'squareup';
// let squareClient: Client | null = null;
// if (process.env.SQUARE_ACCESS_TOKEN) {
//   squareClient = new Client({
//     accessToken: process.env.SQUARE_ACCESS_TOKEN,
//     environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
//   });
// }
let squareClient: any = null;

export interface PaymentIntentParams {
  amount: number; // in cents
  currency?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, string>;
  invoiceId?: string;
  treatmentPlanId?: string;
  procedureId?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  error?: string;
  provider?: 'stripe' | 'square';
}

/**
 * Dental Billing Service
 */
export class DentalBillingService {
  /**
   * Create payment intent for dental treatment
   */
  async createPaymentIntent(
    userId: string,
    params: PaymentIntentParams,
    provider: 'stripe' | 'square' = 'stripe'
  ): Promise<PaymentResult> {
    try {
      if (provider === 'stripe') {
        return await this.createStripePaymentIntent(userId, params);
      } else if (provider === 'square') {
        return await this.createSquarePaymentIntent(userId, params);
      } else {
        return {
          success: false,
          error: 'Invalid payment provider',
        };
      }
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment intent',
      };
    }
  }

  /**
   * Create Stripe payment intent
   */
  private async createStripePaymentIntent(
    userId: string,
    params: PaymentIntentParams
  ): Promise<PaymentResult> {
    try {
      // Get or create Stripe customer
      let customerId = params.customerId;
      if (!customerId && params.customerEmail) {
        const customers = await stripe.customers.list({
          email: params.customerEmail,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: params.customerEmail,
            name: params.customerName,
            metadata: {
              userId,
              source: 'dental_crm',
            },
          });
          customerId = customer.id;
        }
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency || 'cad', // CAD for Canadian dental practices
        customer: customerId,
        description: params.description || 'Dental treatment payment',
        metadata: {
          userId,
          ...(params.invoiceId && { invoiceId: params.invoiceId }),
          ...(params.treatmentPlanId && { treatmentPlanId: params.treatmentPlanId }),
          ...(params.procedureId && { procedureId: params.procedureId }),
          ...(params.metadata || {}),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          userId,
          provider: 'STRIPE',
          providerPaymentId: paymentIntent.id,
          providerCustomerId: customerId,
          amount: params.amount / 100, // Convert from cents
          currency: params.currency || 'CAD',
          status: 'PENDING',
          paymentType: 'OTHER' as any, // DENTAL_TREATMENT not in enum, using OTHER
          customerName: params.customerName || '',
          customerEmail: params.customerEmail || '',
          description: params.description,
          metadata: {
            invoiceId: params.invoiceId,
            treatmentPlanId: params.treatmentPlanId,
            procedureId: params.procedureId,
          },
          ...(params.invoiceId && { invoiceId: params.invoiceId }),
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret || undefined,
        provider: 'stripe',
      };
    } catch (error: any) {
      console.error('Stripe payment intent error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Stripe payment intent',
      };
    }
  }

  /**
   * Create Square payment intent
   */
  private async createSquarePaymentIntent(
    userId: string,
    params: PaymentIntentParams
  ): Promise<PaymentResult> {
    if (!squareClient) {
      return {
        success: false,
        error: 'Square not configured',
      };
    }

    try {
      // Square uses different API - create payment request
      // This is a simplified implementation
      // In production, use Square's Payment API properly

      // For now, return a placeholder
      // In production, implement Square payment creation
      return {
        success: false,
        error: 'Square integration not fully implemented',
        provider: 'square',
      };
    } catch (error: any) {
      console.error('Square payment intent error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Square payment intent',
        provider: 'square',
      };
    }
  }

  /**
   * Process payment for invoice
   */
  async processInvoicePayment(
    userId: string,
    invoiceId: string,
    amount: number,
    provider: 'stripe' | 'square' = 'stripe'
  ): Promise<PaymentResult> {
    try {
      // Fetch invoice
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found',
        };
      }

      if (invoice.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      // Create payment intent
      const result = await this.createPaymentIntent(
        userId,
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency: invoice.currency || 'CAD',
          customerEmail: invoice.customerEmail,
          customerName: invoice.customerName,
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          invoiceId,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
          },
        },
        provider
      );

      return result;
    } catch (error: any) {
      console.error('Error processing invoice payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to process payment',
      };
    }
  }

  /**
   * Handle payment webhook (Stripe)
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Find payment record
        const payment = await prisma.payment.findFirst({
          where: {
            providerPaymentId: paymentIntent.id,
          },
        });

        if (payment) {
          // Update payment status
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'SUCCEEDED', // Payment succeeded
              paidAt: new Date(),
              receiptUrl: (paymentIntent as any).receipt_url || undefined,
            },
          });

          // Update invoice if linked
          if (payment.invoiceId) {
            const invoice = await prisma.invoice.findUnique({
              where: { id: payment.invoiceId },
            });

            if (invoice) {
              const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
              const isFullyPaid = newPaidAmount >= invoice.totalAmount;

              await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                  paidAmount: newPaidAmount,
                  status: isFullyPaid ? 'PAID' : 'SENT', // InvoiceStatus doesn't have PARTIALLY_PAID
                  paidAt: isFullyPaid ? new Date() : undefined,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }
}

export const dentalBillingService = new DentalBillingService();
