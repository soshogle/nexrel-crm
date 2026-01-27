
/**
 * Soshogle Pay - Set Default Payment Method API
 * POST /api/payments/soshogle/payment-methods/set-default
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';


export const dynamic = 'force-dynamic';

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
    const { methodId } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'Method ID is required' },
        { status: 400 }
      );
    }

    await soshoglePay.setDefaultPaymentMethod(customer.id, methodId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Set default payment method error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set default payment method' },
      { status: 500 }
    );
  }
}
