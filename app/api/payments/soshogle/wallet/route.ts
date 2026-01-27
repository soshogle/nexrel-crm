
/**
 * Soshogle Pay - Wallet API
 * Manage customer wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';


export const dynamic = 'force-dynamic';

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

    const wallet = await soshoglePay.getOrCreateWallet(customer.id);

    return NextResponse.json({ success: true, wallet });
  } catch (error: any) {
    console.error('❌ Wallet fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallet' },
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

    const wallet = await soshoglePay.getOrCreateWallet(customer.id);

    const body = await req.json();
    const { amount, type, description, metadata } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    let updatedWallet;

    if (type === 'credit') {
      updatedWallet = await soshoglePay.addToWallet({
        walletId: wallet.id,
        amount,
        type: 'credit',
        description,
        metadata,
      });
    } else if (type === 'debit') {
      updatedWallet = await soshoglePay.deductFromWallet({
        walletId: wallet.id,
        amount,
        type: 'debit',
        description,
        metadata,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid operation type. Must be "credit" or "debit"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, wallet: updatedWallet });
  } catch (error: any) {
    console.error('❌ Wallet operation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process wallet operation' },
      { status: 500 }
    );
  }
}
