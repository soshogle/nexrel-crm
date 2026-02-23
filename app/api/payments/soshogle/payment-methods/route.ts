
/**
 * Soshogle Pay - Payment Methods API
 * Manage customer payment methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const customer = await soshoglePay.getCustomer(session.user.id);
    if (!customer) {
      return NextResponse.json({ success: true, methods: [] });
    }

    const methods = await soshoglePay.getPaymentMethods(customer.id);

    return NextResponse.json({ success: true, methods });
  } catch (error: any) {
    console.error('❌ Payment methods fetch error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch payment methods');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const customer = await soshoglePay.getCustomer(session.user.id);
    if (!customer) {
      return apiErrors.badRequest('Please set up payments first');
    }

    const body = await req.json();
    const { type, details, isDefault } = body;

    const method = await soshoglePay.addPaymentMethod({
      customerId: customer.id,
      type,
      details,
      isDefault,
    });

    return NextResponse.json({ success: true, method });
  } catch (error: any) {
    console.error('❌ Payment method creation error:', error);
    return apiErrors.internal(error.message || 'Failed to create payment method');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const methodId = searchParams.get('methodId');

    if (!methodId) {
      return apiErrors.badRequest('Method ID is required');
    }

    await soshoglePay.deletePaymentMethod(methodId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Payment method deletion error:', error);
    return apiErrors.internal(error.message || 'Failed to delete payment method');
  }
}
