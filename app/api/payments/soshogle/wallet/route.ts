
/**
 * Soshogle Pay - Wallet API
 * Manage customer wallet
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
      return NextResponse.json({
        success: true,
        wallet: { balance: 0, currency: 'USD' },
      });
    }

    const wallet = await soshoglePay.getOrCreateWallet(customer.id);

    return NextResponse.json({ success: true, wallet });
  } catch (error: any) {
    console.error('❌ Wallet fetch error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch wallet');
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

    const wallet = await soshoglePay.getOrCreateWallet(customer.id);

    const body = await req.json();
    const { amount, type, description, metadata } = body;

    if (!amount || amount <= 0) {
      return apiErrors.badRequest('Valid amount is required');
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
      return apiErrors.badRequest('Invalid operation type. Must be "credit" or "debit"');
    }

    return NextResponse.json({ success: true, wallet: updatedWallet });
  } catch (error: any) {
    console.error('❌ Wallet operation error:', error);
    return apiErrors.internal(error.message || 'Failed to process wallet operation');
  }
}
