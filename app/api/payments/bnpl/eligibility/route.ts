
/**
 * BNPL Eligibility API
 * POST - Check BNPL eligibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BnplService } from '@/lib/payments/bnpl-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { purchaseAmount } = body;

    if (!purchaseAmount) {
      return apiErrors.badRequest('Purchase amount is required');
    }

    const eligibility = await BnplService.calculateEligibility(
      session.user.id,
      purchaseAmount
    );

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error('Error checking BNPL eligibility:', error);
    return apiErrors.internal('Failed to check eligibility');
  }
}
