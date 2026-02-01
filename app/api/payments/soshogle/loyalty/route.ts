
/**
 * Soshogle Pay - Loyalty Points API
 * Manage loyalty points and rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const loyaltyPoints = await prisma.soshogleLoyaltyPoints.findMany({
      where: { customerId: customer.id },
      include: { program: true },
    });

    return NextResponse.json({ success: true, loyaltyPoints });
  } catch (error: any) {
    console.error('❌ Loyalty points fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch loyalty points' },
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
    const { action, programId, points } = body;

    if (!programId || !points || points <= 0) {
      return NextResponse.json(
        { error: 'Valid program ID and points are required' },
        { status: 400 }
      );
    }

    let result;

    if (action === 'award') {
      result = await soshoglePay.awardLoyaltyPoints({
        customerId: customer.id,
        programId,
        points,
      });
    } else if (action === 'redeem') {
      result = await soshoglePay.redeemLoyaltyPoints(
        customer.id,
        programId,
        points
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "award" or "redeem"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, loyaltyPoints: result });
  } catch (error: any) {
    console.error('❌ Loyalty points operation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process loyalty points operation' },
      { status: 500 }
    );
  }
}
