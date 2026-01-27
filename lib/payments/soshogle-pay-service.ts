
/**
 * Soshogle Pay Service
 * Comprehensive payment processing service for the CRM
 */

import { prisma } from '@/lib/db';
import type {
  SoshoglePaymentIntent,
  SoshoglePaymentCustomer,
  SoshoglePaymentMerchant,
  SoshoglePaymentMethod,
  SoshogleWallet,
  SoshogleTransaction,
  SoshogleLoyaltyProgram,
  SoshogleFinancingPlan,
} from '@prisma/client';

// API Configuration
const SOSHOGLE_PAY_API_URL = process.env.SOSHOGLE_PAY_API_URL || 'https://api.soshogle.com/v1';
const SOSHOGLE_PAY_API_KEY = process.env.SOSHOGLE_PAY_API_KEY;
const SOSHOGLE_PAY_MERCHANT_ID = process.env.SOSHOGLE_PAY_MERCHANT_ID;

// Type definitions for API requests/responses
export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, any>;
  paymentMethodId?: string;
  captureMethod?: 'automatic' | 'manual';
  setupFutureUsage?: boolean;
}

export interface CreateCustomerParams {
  userId: string;
  email: string;
  phone?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentMethodParams {
  customerId: string;
  type: 'card' | 'bank_account' | 'wallet' | 'crypto' | 'bnpl';
  details: Record<string, any>;
  isDefault?: boolean;
}

export interface ProcessPaymentParams {
  paymentIntentId: string;
  paymentMethodId?: string;
  confirmationToken?: string;
}

export interface WalletOperationParams {
  walletId: string;
  amount: number;
  type: 'credit' | 'debit';
  description?: string;
  metadata?: Record<string, any>;
}

export interface LoyaltyRewardParams {
  customerId: string;
  programId: string;
  points: number;
  transactionId?: string;
}

/**
 * Main Soshogle Pay Service Class
 */
export class SoshoglePayService {
  private apiKey: string;
  private merchantId: string;
  private apiUrl: string;

  constructor() {
    if (!SOSHOGLE_PAY_API_KEY) {
      console.warn('⚠️ SOSHOGLE_PAY_API_KEY is not configured. Payment features will not work.');
      this.apiKey = '';
      this.merchantId = '';
      this.apiUrl = SOSHOGLE_PAY_API_URL;
      return;
    }
    if (!SOSHOGLE_PAY_MERCHANT_ID) {
      console.warn('⚠️ SOSHOGLE_PAY_MERCHANT_ID is not configured. Payment features will not work.');
      this.apiKey = SOSHOGLE_PAY_API_KEY;
      this.merchantId = '';
      this.apiUrl = SOSHOGLE_PAY_API_URL;
      return;
    }

    this.apiKey = SOSHOGLE_PAY_API_KEY;
    this.merchantId = SOSHOGLE_PAY_MERCHANT_ID;
    this.apiUrl = SOSHOGLE_PAY_API_URL;
  }

  /**
   * Make authenticated API request to Soshogle Pay
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    if (!this.apiKey || !this.merchantId) {
      throw new Error(
        'Soshogle Pay is not configured. Please add SOSHOGLE_PAY_API_KEY and SOSHOGLE_PAY_MERCHANT_ID to your environment variables.'
      );
    }

    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Merchant-ID': this.merchantId,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Soshogle Pay API error: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Soshogle Pay API Error:', error);
      throw error;
    }
  }

  // ==================== Customer Management ====================

  /**
   * Create or get a payment customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<SoshoglePaymentCustomer> {
    // Check if customer already exists
    const existingCustomer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId: params.userId },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    // Create customer in Soshogle Pay API
    const apiCustomer = await this.makeRequest('/customers', 'POST', {
      email: params.email,
      phone: params.phone,
      name: params.name,
      metadata: params.metadata,
    });

    // Save to database
    const customer = await prisma.soshoglePaymentCustomer.create({
      data: {
        userId: params.userId,
        soshogleCustomerId: apiCustomer.id,
        email: params.email,
        phone: params.phone || null,
        defaultPaymentMethodId: null,
        metadata: params.metadata || {},
      },
    });

    return customer;
  }

  /**
   * Get customer by user ID
   */
  async getCustomer(userId: string): Promise<SoshoglePaymentCustomer | null> {
    return await prisma.soshoglePaymentCustomer.findUnique({
      where: { userId },
      include: {
        paymentMethods: true,
        wallet: true,
        loyaltyPoints: true,
      },
    });
  }

  /**
   * Update customer information
   */
  async updateCustomer(
    userId: string,
    updates: Partial<CreateCustomerParams>
  ): Promise<SoshoglePaymentCustomer> {
    const customer = await this.getCustomer(userId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Update in Soshogle Pay API
    if (customer.soshogleCustomerId) {
      await this.makeRequest(`/customers/${customer.soshogleCustomerId}`, 'PUT', updates);
    }

    // Update in database
    return await prisma.soshoglePaymentCustomer.update({
      where: { userId },
      data: {
        email: updates.email,
        phone: updates.phone,
        metadata: updates.metadata,
      },
    });
  }

  // ==================== Payment Methods ====================

  /**
   * Add a payment method for a customer
   */
  async addPaymentMethod(params: CreatePaymentMethodParams): Promise<SoshoglePaymentMethod> {
    const customer = await prisma.soshoglePaymentCustomer.findUnique({
      where: { id: params.customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Create payment method in Soshogle Pay API
    const apiMethod = await this.makeRequest('/payment-methods', 'POST', {
      customer_id: customer.soshogleCustomerId,
      type: params.type.toUpperCase() as any,
      details: params.details,
    });

    // Save to database
    const paymentMethod = await prisma.soshoglePaymentMethod.create({
      data: {
        customerId: params.customerId,
        soshogleMethodId: apiMethod.id,
        type: params.type.toUpperCase() as any,
        last4: params.details.last4 || null,
        brand: params.details.brand || null,
        expiryMonth: params.details.expiryMonth || null,
        expiryYear: params.details.expiryYear || null,
        isDefault: params.isDefault || false,
        metadata: params.details,
      },
    });

    // Set as default if requested
    if (params.isDefault) {
      await prisma.soshoglePaymentCustomer.update({
        where: { id: params.customerId },
        data: { defaultPaymentMethodId: paymentMethod.id },
      });
    }

    return paymentMethod;
  }

  /**
   * Get all payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<SoshoglePaymentMethod[]> {
    return await prisma.soshoglePaymentMethod.findMany({
      where: { customerId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(customerId: string, methodId: string): Promise<void> {
    // Remove default from all methods
    await prisma.soshoglePaymentMethod.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });

    // Set new default
    await prisma.soshoglePaymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    });

    await prisma.soshoglePaymentCustomer.update({
      where: { id: customerId },
      data: { defaultPaymentMethodId: methodId },
    });
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(methodId: string): Promise<void> {
    const method = await prisma.soshoglePaymentMethod.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      throw new Error('Payment method not found');
    }

    // Delete from Soshogle Pay API
    if (method.soshogleMethodId) {
      await this.makeRequest(`/payment-methods/${method.soshogleMethodId}`, 'DELETE');
    }

    // Soft delete in database
    await prisma.soshoglePaymentMethod.update({
      where: { id: methodId },
      data: { isActive: false },
    });
  }

  // ==================== Payment Processing ====================

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<SoshoglePaymentIntent> {
    const customer = await this.getCustomer(params.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Create payment intent in Soshogle Pay API
    const apiIntent = await this.makeRequest('/payment-intents', 'POST', {
      amount: params.amount,
      currency: params.currency || 'USD',
      customer_id: customer.soshogleCustomerId,
      description: params.description,
      metadata: params.metadata,
      payment_method: params.paymentMethodId,
      capture_method: params.captureMethod || 'automatic',
      setup_future_usage: params.setupFutureUsage,
    });

    // Save to database
    const paymentIntent = await prisma.soshoglePaymentIntent.create({
      data: {
        customerId: customer.id,
        soshogleIntentId: apiIntent.id,
        amount: params.amount,
        currency: params.currency || 'USD',
        status: 'PENDING' as any,
        paymentMethodId: params.paymentMethodId || null,
        description: params.description || null,
        captureMethod: params.captureMethod || 'automatic',
        clientSecret: apiIntent.client_secret,
        metadata: params.metadata || {},
      },
    });

    return paymentIntent;
  }

  /**
   * Confirm and process a payment
   */
  async confirmPayment(params: ProcessPaymentParams): Promise<SoshoglePaymentIntent> {
    const intent = await prisma.soshoglePaymentIntent.findUnique({
      where: { id: params.paymentIntentId },
    });

    if (!intent) {
      throw new Error('Payment intent not found');
    }

    // Confirm payment in Soshogle Pay API
    const apiIntent = await this.makeRequest(
      `/payment-intents/${intent.soshogleIntentId}/confirm`,
      'POST',
      {
        payment_method: params.paymentMethodId,
        confirmation_token: params.confirmationToken,
      }
    );

    // Update in database
    const updatedIntent = await prisma.soshoglePaymentIntent.update({
      where: { id: params.paymentIntentId },
      data: {
        status: apiIntent.status,
        processedAt: apiIntent.status === 'succeeded' ? new Date() : null,
      },
    });

    // Create transaction record if successful
    if (apiIntent.status === 'succeeded') {
      await this.createTransaction({
        paymentIntentId: intent.id,
        customerId: intent.customerId,
        amount: intent.amount,
        currency: intent.currency,
        status: 'completed',
        type: 'payment',
      });
    }

    return updatedIntent;
  }

  /**
   * Capture a payment (for manual capture)
   */
  async capturePayment(paymentIntentId: string, amount?: number): Promise<SoshoglePaymentIntent> {
    const intent = await prisma.soshoglePaymentIntent.findUnique({
      where: { id: paymentIntentId },
    });

    if (!intent) {
      throw new Error('Payment intent not found');
    }

    // Capture payment in Soshogle Pay API
    const apiIntent = await this.makeRequest(
      `/payment-intents/${intent.soshogleIntentId}/capture`,
      'POST',
      { amount_to_capture: amount }
    );

    // Update in database
    return await prisma.soshoglePaymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        status: apiIntent.status,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Cancel a payment intent
   */
  async cancelPayment(paymentIntentId: string, reason?: string): Promise<SoshoglePaymentIntent> {
    const intent = await prisma.soshoglePaymentIntent.findUnique({
      where: { id: paymentIntentId },
    });

    if (!intent) {
      throw new Error('Payment intent not found');
    }

    // Cancel in Soshogle Pay API
    await this.makeRequest(
      `/payment-intents/${intent.soshogleIntentId}/cancel`,
      'POST',
      { cancellation_reason: reason }
    );

    // Update in database
    return await prisma.soshoglePaymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        status: 'CANCELED' as any,
        canceledAt: new Date(),
      },
    });
  }

  /**
   * Process a refund
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    const intent = await prisma.soshoglePaymentIntent.findUnique({
      where: { id: paymentIntentId },
    });

    if (!intent) {
      throw new Error('Payment intent not found');
    }

    // Create refund in Soshogle Pay API
    const apiRefund = await this.makeRequest('/refunds', 'POST', {
      payment_intent: intent.soshogleIntentId,
      amount: amount || intent.amount,
      reason,
    });

    // Create refund transaction
    await this.createTransaction({
      paymentIntentId: intent.id,
      customerId: intent.customerId,
      amount: -(amount || intent.amount),
      currency: intent.currency,
      status: 'completed',
      type: 'refund',
    });

    return apiRefund;
  }

  // ==================== Transactions ====================

  /**
   * Create a transaction record
   */
  private async createTransaction(data: {
    paymentIntentId: string;
    customerId: string;
    amount: number;
    currency: string;
    status: string;
    type: string;
  }): Promise<SoshogleTransaction> {
    return await prisma.soshogleTransaction.create({
      data: {
        paymentIntentId: data.paymentIntentId,
        customerId: data.customerId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        type: data.type,
        processedAt: new Date(),
        metadata: {},
      },
    });
  }

  /**
   * Get transaction history for a customer
   */
  async getTransactions(customerId: string, limit = 50): Promise<SoshogleTransaction[]> {
    return await prisma.soshogleTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        paymentIntent: true,
      },
    });
  }

  // ==================== Wallet Operations ====================

  /**
   * Get or create wallet for a customer
   */
  async getOrCreateWallet(customerId: string): Promise<SoshogleWallet> {
    let wallet = await prisma.soshogleWallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      wallet = await prisma.soshogleWallet.create({
        data: {
          customerId,
          balance: 0,
          currency: 'USD',
          isActive: true,
        },
      });
    }

    return wallet;
  }

  /**
   * Add funds to wallet
   */
  async addToWallet(params: WalletOperationParams): Promise<SoshogleWallet> {
    const wallet = await prisma.soshogleWallet.findUnique({
      where: { id: params.walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = wallet.balance + params.amount;

    const updatedWallet = await prisma.soshogleWallet.update({
      where: { id: params.walletId },
      data: {
        balance: newBalance,
        lastTransactionAt: new Date(),
      },
    });

    // Create transaction record
    await prisma.soshogleWalletTransaction.create({
      data: {
        walletId: params.walletId,
        amount: params.amount,
        type: 'credit',
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description: params.description || 'Wallet credit',
        metadata: params.metadata || {},
      },
    });

    return updatedWallet;
  }

  /**
   * Deduct from wallet
   */
  async deductFromWallet(params: WalletOperationParams): Promise<SoshogleWallet> {
    const wallet = await prisma.soshogleWallet.findUnique({
      where: { id: params.walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance < params.amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newBalance = wallet.balance - params.amount;

    const updatedWallet = await prisma.soshogleWallet.update({
      where: { id: params.walletId },
      data: {
        balance: newBalance,
        lastTransactionAt: new Date(),
      },
    });

    // Create transaction record
    await prisma.soshogleWalletTransaction.create({
      data: {
        walletId: params.walletId,
        amount: -params.amount,
        type: 'debit',
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description: params.description || 'Wallet debit',
        metadata: params.metadata || {},
      },
    });

    return updatedWallet;
  }

  // ==================== Loyalty & Rewards ====================

  /**
   * Award loyalty points
   */
  async awardLoyaltyPoints(params: LoyaltyRewardParams): Promise<any> {
    const customer = await this.getCustomer(params.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get or create loyalty points record
    let loyaltyPoints = await prisma.soshogleLoyaltyPoints.findFirst({
      where: {
        customerId: customer.id,
        programId: params.programId,
      },
    });

    if (!loyaltyPoints) {
      loyaltyPoints = await prisma.soshogleLoyaltyPoints.create({
        data: {
          customerId: customer.id,
          programId: params.programId,
          points: params.points,
          tier: 'BRONZE' as any,
        },
      });
    } else {
      loyaltyPoints = await prisma.soshogleLoyaltyPoints.update({
        where: { id: loyaltyPoints.id },
        data: {
          points: { increment: params.points },
          lastEarnedAt: new Date(),
        },
      });
    }

    return loyaltyPoints;
  }

  /**
   * Redeem loyalty points
   */
  async redeemLoyaltyPoints(
    customerId: string,
    programId: string,
    points: number
  ): Promise<any> {
    const loyaltyPoints = await prisma.soshogleLoyaltyPoints.findFirst({
      where: { customerId, programId },
    });

    if (!loyaltyPoints) {
      throw new Error('Loyalty points not found');
    }

    if (loyaltyPoints.points < points) {
      throw new Error('Insufficient loyalty points');
    }

    return await prisma.soshogleLoyaltyPoints.update({
      where: { id: loyaltyPoints.id },
      data: {
        points: { decrement: points },
        lastRedeemedAt: new Date(),
      },
    });
  }

  // ==================== Fraud Detection ====================

  /**
   * Run fraud check on a transaction
   */
  async runFraudCheck(
    customerId: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{ riskScore: number; isBlocked: boolean; reason?: string }> {
    // Call Soshogle Pay fraud detection API
    const fraudCheck = await this.makeRequest('/fraud-detection/check', 'POST', {
      customer_id: customerId,
      amount,
      metadata,
    });

    // Save fraud check result
    await prisma.soshoglefraudDetection.create({
      data: {
        customerId,
        riskScore: fraudCheck.risk_score,
        riskLevel: fraudCheck.risk_level,
        isBlocked: fraudCheck.is_blocked,
        reason: fraudCheck.reason || null,
        metadata: fraudCheck.metadata || {},
      },
    });

    return {
      riskScore: fraudCheck.risk_score,
      isBlocked: fraudCheck.is_blocked,
      reason: fraudCheck.reason,
    };
  }
}

// Export singleton instance
export const soshoglePay = new SoshoglePayService();
