
/**
 * Soshogle Pay Webhook Handler
 * Processes incoming webhook events from Soshogle Pay
 */

import { getCrmDb } from '@/lib/dal'
import { createDalContext } from '@/lib/context/industry-context';
import crypto from 'crypto';
const db = getCrmDb({ userId: '', industry: null })

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Main webhook event handler
 */
export class SoshogleWebhookHandler {
  /**
   * Process webhook event
   */
  async handleEvent(event: WebhookEvent): Promise<void> {
    console.log(`🎣 Processing Soshogle Pay webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event);
          break;

        case 'payment_intent.failed':
          await this.handlePaymentFailure(event);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event);
          break;

        case 'refund.created':
          await this.handleRefundCreated(event);
          break;

        case 'refund.updated':
          await this.handleRefundUpdated(event);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event);
          break;

        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event);
          break;

        case 'dispute.created':
          await this.handleDisputeCreated(event);
          break;

        case 'payout.paid':
          await this.handlePayoutPaid(event);
          break;

        default:
          console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
      }

      // Log webhook event
      await this.logWebhookEvent(event, 'processed');
    } catch (error) {
      console.error(`❌ Error processing webhook ${event.type}:`, error);
      await this.logWebhookEvent(event, 'failed', error as Error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(event: WebhookEvent): Promise<void> {
    const { id: intentId, amount, currency, customer } = event.data;

    // Update payment intent in database
    await db.soshoglePaymentIntent.updateMany({
      where: { soshogleIntentId: intentId },
      data: {
        status: 'SUCCEEDED' as any,
        processedAt: new Date(),
      },
    });

    // Award loyalty points (e.g., 1 point per dollar)
    const points = Math.floor(amount / 100);
    if (points > 0) {
      const paymentCustomer = await db.soshoglePaymentCustomer.findFirst({
        where: { soshogleCustomerId: customer },
      });

      if (paymentCustomer) {
        // Find active loyalty program
        const loyaltyProgram = await db.soshogleLoyaltyProgram.findFirst({
          where: { isActive: true },
        });

        if (loyaltyProgram) {
          const loyaltyPoints = await db.soshogleLoyaltyPoints.findFirst({
            where: {
              customerId: paymentCustomer.id,
              programId: loyaltyProgram.id,
            },
          });

          if (loyaltyPoints) {
            await db.soshogleLoyaltyPoints.update({
              where: { id: loyaltyPoints.id },
              data: {
                points: { increment: points },
                lastEarnedAt: new Date(),
              },
            });
          }
        }
      }
    }

    console.log(`✅ Payment succeeded: ${intentId} - ${currency} ${amount / 100}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(event: WebhookEvent): Promise<void> {
    const { id: intentId, last_payment_error } = event.data;

    await db.soshoglePaymentIntent.updateMany({
      where: { soshogleIntentId: intentId },
      data: {
        status: 'FAILED' as any,
        errorMessage: last_payment_error?.message || 'Payment failed',
      },
    });

    console.log(`❌ Payment failed: ${intentId}`);
  }

  /**
   * Handle canceled payment
   */
  private async handlePaymentCanceled(event: WebhookEvent): Promise<void> {
    const { id: intentId } = event.data;

    await db.soshoglePaymentIntent.updateMany({
      where: { soshogleIntentId: intentId },
      data: {
        status: 'CANCELED' as any,
        canceledAt: new Date(),
      },
    });

    console.log(`🚫 Payment canceled: ${intentId}`);
  }

  /**
   * Handle refund created
   */
  private async handleRefundCreated(event: WebhookEvent): Promise<void> {
    const { id: refundId, payment_intent, amount, status } = event.data;

    // Update payment intent status
    await db.soshoglePaymentIntent.updateMany({
      where: { soshogleIntentId: payment_intent },
      data: { status: 'REFUNDED' as any },
    });

    console.log(`💰 Refund created: ${refundId} - ${amount / 100}`);
  }

  /**
   * Handle refund updated
   */
  private async handleRefundUpdated(event: WebhookEvent): Promise<void> {
    const { id: refundId, status } = event.data;
    console.log(`🔄 Refund updated: ${refundId} - ${status}`);
  }

  /**
   * Handle customer updated
   */
  private async handleCustomerUpdated(event: WebhookEvent): Promise<void> {
    const { id: customerId, email, phone, metadata } = event.data;

    await db.soshoglePaymentCustomer.updateMany({
      where: { soshogleCustomerId: customerId },
      data: {
        email: email || undefined,
        phone: phone || undefined,
        metadata: metadata || undefined,
      },
    });

    console.log(`👤 Customer updated: ${customerId}`);
  }

  /**
   * Handle payment method attached
   */
  private async handlePaymentMethodAttached(event: WebhookEvent): Promise<void> {
    const { id: methodId, customer } = event.data;
    console.log(`💳 Payment method attached: ${methodId} to ${customer}`);
  }

  /**
   * Handle payment method detached
   */
  private async handlePaymentMethodDetached(event: WebhookEvent): Promise<void> {
    const { id: methodId } = event.data;

    await db.soshoglePaymentMethod.updateMany({
      where: { soshogleMethodId: methodId },
      data: { isActive: false },
    });

    console.log(`🗑️ Payment method detached: ${methodId}`);
  }

  /**
   * Handle dispute created
   */
  private async handleDisputeCreated(event: WebhookEvent): Promise<void> {
    const { id: disputeId, amount, reason, status } = event.data;

    // Create dispute record
    await db.soshogleDispute.create({
      data: {
        soshogleDisputeId: disputeId,
        paymentIntentId: event.data.payment_intent,
        amount,
        currency: event.data.currency || 'USD',
        reason: reason || 'unknown',
        status: status || 'needs_response',
        evidence: {},
      },
    });

    console.log(`⚠️ Dispute created: ${disputeId} - ${amount / 100}`);
  }

  /**
   * Handle payout paid
   */
  private async handlePayoutPaid(event: WebhookEvent): Promise<void> {
    const { id: payoutId, amount } = event.data;
    console.log(`💸 Payout paid: ${payoutId} - ${amount / 100}`);
  }

  /**
   * Log webhook event to database
   */
  private async logWebhookEvent(
    event: WebhookEvent,
    status: string,
    error?: Error
  ): Promise<void> {
    await db.soshogleWebhook.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        payload: event.data,
        status,
        errorMessage: error?.message || null,
        processedAt: new Date(),
      },
    });
  }
}

// Export singleton instance
export const soshogleWebhookHandler = new SoshogleWebhookHandler();
