
/**
 * Soshogle Pay - Payment Methods API
 * Manage customer payment methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await soshoglePay.getCustomer(session.user.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const methods = await soshoglePay.getPaymentMethods(customer.id);

    return NextResponse.json({ success: true, methods });
  } catch (error: any) {
    console.error('❌ Payment methods fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

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
    return NextResponse.json(
      { error: error.message || 'Failed to create payment method' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const methodId = searchParams.get('methodId');

    if (!methodId) {
      return NextResponse.json(
        { error: 'Method ID is required' },
        { status: 400 }
      );
    }

    await soshoglePay.deletePaymentMethod(methodId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Payment method deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
