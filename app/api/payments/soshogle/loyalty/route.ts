
/**
 * Soshogle Pay - Loyalty Points API
 * Manage loyalty points and rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { soshoglePay } from '@/lib/payments';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const customer = await soshoglePay.getCustomer(session.user.id);
    if (!customer) {
      return NextResponse.json({ success: true, loyaltyPoints: [] });
    }

    const loyaltyPoints = await getCrmDb(ctx).soshogleLoyaltyPoints.findMany({
      where: { customerId: customer.id },
      include: { program: true },
    });

    return NextResponse.json({ success: true, loyaltyPoints });
  } catch (error: any) {
    console.error('❌ Loyalty points fetch error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch loyalty points');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const customer = await soshoglePay.getCustomer(session.user.id);
    if (!customer) {
      return apiErrors.badRequest('Please set up payments first');
    }

    const body = await req.json();
    const { action, programId, points } = body;

    if (!programId || !points || points <= 0) {
      return apiErrors.badRequest('Valid program ID and points are required');
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
      return apiErrors.badRequest('Invalid action. Must be "award" or "redeem"');
    }

    return NextResponse.json({ success: true, loyaltyPoints: result });
  } catch (error: any) {
    console.error('❌ Loyalty points operation error:', error);
    return apiErrors.internal(error.message || 'Failed to process loyalty points operation');
  }
}
