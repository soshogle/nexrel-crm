/**
 * Dental Payment Intent API
 * Phase 6: Create payment intents for dental treatments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dentalBillingService } from '@/lib/dental/billing-integration';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Create payment intent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      amount,
      currency,
      customerEmail,
      customerName,
      description,
      invoiceId,
      treatmentPlanId,
      procedureId,
      provider = 'stripe',
    } = body;

    if (!amount || amount <= 0) {
      return apiErrors.badRequest('Invalid amount');
    }

    const result = await dentalBillingService.createPaymentIntent(
      session.user.id,
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'CAD',
        customerEmail,
        customerName,
        description,
        invoiceId,
        treatmentPlanId,
        procedureId,
      },
      provider
    );

    if (!result.success) {
      return apiErrors.badRequest(result.error || 'Failed to create payment intent');
    }

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      clientSecret: result.clientSecret,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return apiErrors.internal('Failed to create payment intent', error.message);
  }
}
