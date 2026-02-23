
/**
 * Soshogle Pay - Customer Management API
 * POST /api/payments/soshogle/customers - Create/Get customer
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
    return apiErrors.internal(error.message || 'Failed to create customer');
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const customer = await soshoglePay.getCustomer(session.user.id);

    if (!customer) {
      return apiErrors.notFound('Customer not found');
    }

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('❌ Customer fetch error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch customer');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal(error.message || 'Failed to update customer');
  }
}
