
/**
 * Soshogle Pay - Set Default Payment Method API
 * POST /api/payments/soshogle/payment-methods/set-default
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const customer = await soshoglePay.getCustomer(session.user.id);
    if (!customer) {
      return apiErrors.notFound('Customer not found');
    }

    const body = await req.json();
    const { methodId } = body;

    if (!methodId) {
      return apiErrors.badRequest('Method ID is required');
    }

    await soshoglePay.setDefaultPaymentMethod(customer.id, methodId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Set default payment method error:', error);
    return apiErrors.internal(error.message || 'Failed to set default payment method');
  }
}
