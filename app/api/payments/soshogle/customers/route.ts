
/**
 * Soshogle Pay - Customer Management API
 * POST /api/payments/soshogle/customers - Create/Get customer
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

    const body = await req.json();
    const { email, phone, name, metadata } = body;

    // Create or get customer
    const customer = await soshoglePay.createCustomer({
      userId: session.user.id,
      email: email || session.user.email!,
      phone,
      name,
      metadata,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('❌ Customer creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}

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

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('❌ Customer fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, phone, name, metadata } = body;

    const customer = await soshoglePay.updateCustomer(session.user.id, {
      userId: session.user.id,
      email,
      phone,
      name,
      metadata,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('❌ Customer update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}
