
/**
 * Soshogle Pay - Payment Intents API
 * Create and manage payment intents with AI fraud detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';
import { fraudDetectionClient } from '@/lib/payments/fraud-detection-client';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await soshoglePay.getCustomer(session.user.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      amount,
      currency,
      description,
      metadata,
      paymentMethodId,
      captureMethod,
      setupFutureUsage,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Get payment method details for fraud detection
    const paymentMethod = paymentMethodId
      ? await prisma.soshoglePaymentMethod.findUnique({
          where: { id: paymentMethodId },
        })
      : null;

    // Run AI fraud detection
    const trustScore = await fraudDetectionClient.calculateTrustScore({
      customer_id: session.user.id,
      merchant_id: process.env.SOSHOGLE_MERCHANT_ID || 'default_merchant',
      amount,
      payment_method: fraudDetectionClient.mapPaymentMethod(
        paymentMethod?.type || 'CREDIT_CARD'
      ),
      device_fingerprint: req.headers.get('x-device-fingerprint') || 'unknown',
      ip_address: req.headers.get('x-forwarded-for') || req.ip || 'unknown',
      location: req.headers.get('x-user-location') || undefined,
    });

    console.log('[Payment Intent] Trust Score:', {
      score: trustScore.score,
      tier: trustScore.risk_tier,
      decision: trustScore.decision,
    });

    // Check if transaction should be declined
    if (trustScore.decision === 'DECLINE') {
      return NextResponse.json(
        {
          error: 'Payment declined due to high fraud risk',
          fraudRisk: {
            score: trustScore.score,
            tier: trustScore.risk_tier,
          },
        },
        { status: 403 }
      );
    }

    // Create payment intent with fraud metadata
    const paymentIntent = await soshoglePay.createPaymentIntent({
      customerId: customer.id,
      amount,
      currency,
      description,
      metadata: {
        ...metadata,
        fraud_score: trustScore.score.toString(),
        fraud_tier: trustScore.risk_tier,
        fraud_decision: trustScore.decision,
        requires_review: trustScore.decision === 'MANUAL_REVIEW' ? 'true' : 'false',
      },
      paymentMethodId,
      captureMethod,
      setupFutureUsage,
    });

    return NextResponse.json({
      success: true,
      paymentIntent,
      fraudCheck: {
        score: trustScore.score,
        tier: trustScore.risk_tier,
        decision: trustScore.decision,
        requiresReview: trustScore.decision === 'MANUAL_REVIEW',
      },
    });
  } catch (error: any) {
    console.error('❌ Payment intent creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
