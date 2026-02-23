
/**
 * Soshogle Pay - Transactions API
 * GET /api/payments/soshogle/transactions - List customer transactions
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
      return NextResponse.json({ success: true, transactions: [] });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const transactions = await soshoglePay.getTransactions(customer.id, limit);

    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    console.error('❌ Transactions fetch error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch transactions');
  }
}
