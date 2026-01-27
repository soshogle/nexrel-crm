
/**
 * ClubOS Payment Service
 * Handles payment processing for sports club registrations using Stripe
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { clubOSCommunicationService } from '@/lib/clubos-communication-service';

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-10-29.clover',
});

export class ClubOSPaymentService {
  /**
   * Create a payment intent for a registration
   */
  async createPaymentIntent(params: {
    registrationId: string;
    householdId: string;
    amount: number; // in cents
    description?: string;
    metadata?: Record<string, string>;
  }) {
    const { registrationId, householdId, amount, description, metadata } = params;

    // Get registration details
    const registration = await prisma.clubOSRegistration.findUnique({
      where: { id: registrationId },
      include: {
        household: true,
        member: true,
        program: true,
        division: true,
      },
    });

    if (!registration) {
      throw new Error('Registration not found');
    }

    // Get or create Stripe customer
    const household = registration.household;
    let stripeCustomerId = await this.getOrCreateStripeCustomer(household);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: stripeCustomerId,
      description: description || `Registration payment for ${registration.member.firstName} ${registration.member.lastName}`,
      metadata: {
        registrationId,
        householdId,
        memberId: registration.memberId,
        programId: registration.programId,
        divisionId: registration.divisionId || '',
        ...(metadata || {}),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create payment record in database
    const payment = await prisma.clubOSPayment.create({
      data: {
        householdId,
        registrationId,
        amount,
        paymentMethod: 'CREDIT_CARD', // Will be updated after payment
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
        stripeCustomerId,
        description: description || `Registration payment for ${registration.member.firstName} ${registration.member.lastName}`,
        metadata: metadata || {},
      },
    });

    return {
      paymentIntent,
      payment,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /**
   * Get or create Stripe customer for household
   */
  private async getOrCreateStripeCustomer(household: any): Promise<string> {
    // Check if household has existing payments with Stripe customer
    const existingPayment = await prisma.clubOSPayment.findFirst({
      where: {
        householdId: household.id,
        stripeCustomerId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPayment?.stripeCustomerId) {
      return existingPayment.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: household.primaryContactEmail,
      name: household.primaryContactName,
      phone: household.primaryContactPhone,
      metadata: {
        householdId: household.id,
        userId: household.userId,
      },
    });

    return customer.id;
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntentId: string) {
    // Get payment intent from Stripe with charges expanded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges'],
    });

    // Update payment record
    const payment = await prisma.clubOSPayment.findFirst({
      where: { stripePaymentId: paymentIntentId },
      include: { registration: true },
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Determine payment method from payment intent
    const paymentMethod = this.getPaymentMethodFromStripe(paymentIntent.payment_method_types[0]);

    // Get receipt URL from charges
    const charges = (paymentIntent as any).charges;
    const receiptUrl = charges?.data?.[0]?.receipt_url;

    // Update payment status
    await prisma.clubOSPayment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paymentMethod,
        stripeReceiptUrl: receiptUrl || null,
        paidAt: new Date(),
      },
    });

    // Update registration balance
    if (payment.registrationId) {
      const registration = await prisma.clubOSRegistration.findUnique({
        where: { id: payment.registrationId },
        include: {
          household: true,
          member: true,
          program: true,
        },
      });

      if (registration) {
        const newAmountPaid = registration.amountPaid + payment.amount;
        const newBalanceDue = registration.totalAmount - newAmountPaid;

        await prisma.clubOSRegistration.update({
          where: { id: payment.registrationId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            // Auto-activate registration if fully paid
            status: newBalanceDue <= 0 && registration.status === 'APPROVED' ? 'ACTIVE' : registration.status,
          },
        });

        // Send payment confirmation email/SMS
        try {
          await clubOSCommunicationService.sendPaymentConfirmation({
            parentName: registration.household.primaryContactName,
            parentEmail: registration.household.primaryContactEmail,
            parentPhone: registration.household.primaryContactPhone,
            childName: `${registration.member.firstName} ${registration.member.lastName}`,
            programName: registration.program.name,
            amount: payment.amount,
            receiptUrl: receiptUrl || undefined,
            balanceRemaining: newBalanceDue,
          });
        } catch (notificationError) {
          console.error('Failed to send payment confirmation:', notificationError);
          // Don't fail the payment if notification fails
        }
      }
    }

    return payment;
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(paymentIntentId: string, error?: string) {
    const payment = await prisma.clubOSPayment.findFirst({
      where: { stripePaymentId: paymentIntentId },
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    await prisma.clubOSPayment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        notes: error || 'Payment failed',
      },
    });

    return payment;
  }

  /**
   * Process refund
   */
  async processRefund(params: {
    paymentId: string;
    amount?: number; // in cents, optional for partial refund
    reason?: string;
  }) {
    const { paymentId, amount, reason } = params;

    const payment = await prisma.clubOSPayment.findUnique({
      where: { id: paymentId },
      include: { registration: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'PAID') {
      throw new Error('Can only refund paid payments');
    }

    if (!payment.stripePaymentId) {
      throw new Error('No Stripe payment ID found');
    }

    // Get payment intent with charges expanded
    const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId, {
      expand: ['charges'],
    });
    const charges = (paymentIntent as any).charges;
    const chargeId = charges?.data?.[0]?.id;

    if (!chargeId) {
      throw new Error('No charge ID found for this payment');
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: amount || payment.amount,
      reason: 'requested_by_customer',
      metadata: {
        paymentId: payment.id,
        registrationId: payment.registrationId || '',
        reason: reason || '',
      },
    });

    // Update payment record
    const isPartial = amount && amount < payment.amount;
    await prisma.clubOSPayment.update({
      where: { id: paymentId },
      data: {
        status: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: amount || payment.amount,
        refundReason: reason,
      },
    });

    // Update registration balance
    if (payment.registrationId) {
      const registration = payment.registration;
      if (registration) {
        const refundAmount = amount || payment.amount;
        const newAmountPaid = Math.max(0, registration.amountPaid - refundAmount);
        const newBalanceDue = registration.totalAmount - newAmountPaid;

        await prisma.clubOSRegistration.update({
          where: { id: payment.registrationId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
          },
        });
      }
    }

    return { refund, payment };
  }

  /**
   * Get payment method from Stripe payment type
   */
  private getPaymentMethodFromStripe(stripeType: string): 'CREDIT_CARD' | 'DEBIT_CARD' | 'ACH' | 'OTHER' {
    switch (stripeType.toLowerCase()) {
      case 'card':
        return 'CREDIT_CARD';
      case 'us_bank_account':
        return 'ACH';
      default:
        return 'OTHER';
    }
  }

  /**
   * Get payment history for household
   */
  async getHouseholdPayments(householdId: string) {
    return await prisma.clubOSPayment.findMany({
      where: { householdId },
      include: {
        registration: {
          include: {
            member: true,
            program: true,
            division: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get payment history for registration
   */
  async getRegistrationPayments(registrationId: string) {
    return await prisma.clubOSPayment.findMany({
      where: { registrationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get payment statistics for admin
   */
  async getPaymentStatistics(userId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = {
      household: {
        userId,
      },
    };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const [totalRevenue, totalPayments, pendingPayments, failedPayments] = await Promise.all([
      prisma.clubOSPayment.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.clubOSPayment.count({ where }),
      prisma.clubOSPayment.count({ where: { ...where, status: 'PENDING' } }),
      prisma.clubOSPayment.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalPayments,
      pendingPayments,
      failedPayments,
    };
  }
}

export const clubOSPaymentService = new ClubOSPaymentService();
