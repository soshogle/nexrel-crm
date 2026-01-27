
/**
 * ACH Settlement API
 * GET - List settlements
 * POST - Create new settlement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AchSettlementService } from '@/lib/payments/ach-settlement-service';
import { AchSettlementStatus } from '@prisma/client';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AchSettlementStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const settlements = await AchSettlementService.getSettlementsByUser(
      session.user.id,
      { status: status || undefined, limit, offset }
    );

    return NextResponse.json(settlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settlements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      settlementDate,
      totalAmount,
      transactionCount,
      bankName,
      accountLast4,
      routingNumber,
      notes,
      transactions,
    } = body;

    // Validation
    if (!settlementDate || !totalAmount || !transactionCount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create settlement
    const settlement = await AchSettlementService.createSettlement({
      userId: session.user.id,
      settlementDate: new Date(settlementDate),
      totalAmount,
      transactionCount,
      bankName,
      accountLast4,
      routingNumber,
      notes,
    });

    // Add transactions if provided
    if (transactions && Array.isArray(transactions)) {
      for (const transaction of transactions) {
        await AchSettlementService.addTransaction({
          settlementId: settlement.id,
          ...transaction,
        });
      }
    }

    // Fetch full settlement with transactions
    const fullSettlement = await AchSettlementService.getSettlement(settlement.id);

    return NextResponse.json(fullSettlement, { status: 201 });
  } catch (error) {
    console.error('Error creating settlement:', error);
    return NextResponse.json(
      { error: 'Failed to create settlement' },
      { status: 500 }
    );
  }
}
