
/**
 * Soshogle Pay Checkout Service
 * Simplified checkout flow for CRM integrations
 */

import { soshoglePay } from './soshogle-pay-service';
import type { SoshoglePaymentIntent } from '@prisma/client';

export interface CheckoutSessionParams {
  userId: string;
  amount: number;
  currency?: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface CheckoutResult {
  paymentIntent: SoshoglePaymentIntent;
  clientSecret: string;
  checkoutUrl?: string;
}

/**
 * Checkout Service for simplified payment flows
 */
export class SoshogleCheckoutService {
  /**
   * Create a checkout session
   */
  async createCheckout(params: CheckoutSessionParams): Promise<CheckoutResult> {
    // Get or create customer
    const customer = await soshoglePay.getCustomer(params.userId);
    
    if (!customer) {
      throw new Error('Customer not found. Please complete signup first.');
    }

    // Create payment intent
    const paymentIntent = await soshoglePay.createPaymentIntent({
      customerId: customer.id,
      amount: params.amount,
      currency: params.currency || 'USD',
      description: params.description,
      metadata: {
        ...params.metadata,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      },
    });

    return {
      paymentIntent,
      clientSecret: paymentIntent.clientSecret || '',
      checkoutUrl: `/payments/checkout/${paymentIntent.id}`,
    };
  }

  /**
   * Create a quick payment (one-time payment with saved method)
   */
  async quickPay(
    userId: string,
    amount: number,
    paymentMethodId?: string
  ): Promise<SoshoglePaymentIntent> {
    const customer = await soshoglePay.getCustomer(userId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Use default payment method if not specified
    const methodId = paymentMethodId || customer.defaultPaymentMethodId;

    if (!methodId) {
      throw new Error('No payment method available');
    }

    // Create and confirm payment intent
    const paymentIntent = await soshoglePay.createPaymentIntent({
      customerId: customer.id,
      amount,
      paymentMethodId: methodId,
      captureMethod: 'automatic',
    });

    // Confirm payment immediately
    const confirmedIntent = await soshoglePay.confirmPayment({
      paymentIntentId: paymentIntent.id,
      paymentMethodId: methodId,
    });

    return confirmedIntent;
  }

  /**
   * Process payment from wallet
   */
  async payWithWallet(userId: string, amount: number): Promise<any> {
    const customer = await soshoglePay.getCustomer(userId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    const wallet = await soshoglePay.getOrCreateWallet(customer.id);

    if (wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Deduct from wallet
    await soshoglePay.deductFromWallet({
      walletId: wallet.id,
      amount,
      type: 'debit',
      description: 'Payment from wallet',
    });

    return {
      success: true,
      newBalance: wallet.balance - amount,
    };
  }

  /**
   * Apply BNPL (Buy Now Pay Later) financing
   */
  async applyFinancing(
    userId: string,
    amount: number,
    planId: string
  ): Promise<any> {
    const customer = await soshoglePay.getCustomer(userId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Check credit eligibility
    const fraudCheck = await soshoglePay.runFraudCheck(customer.id, amount);

    if (fraudCheck.isBlocked || fraudCheck.riskScore > 70) {
      throw new Error('Financing not available due to risk assessment');
    }

    // Create financing plan (would integrate with actual BNPL provider)
    // This is a placeholder for the actual implementation
    return {
      approved: true,
      installments: 4,
      installmentAmount: amount / 4,
      message: 'Financing approved',
    };
  }
}

// Export singleton instance
export const soshogleCheckout = new SoshogleCheckoutService();
