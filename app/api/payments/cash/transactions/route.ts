
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createCashTransaction,
  getCashTransactions,
  exportCashTransactionsToCSV,
} from '@/lib/payments/cash-service';
import { CashTransactionType } from '@prisma/client';

/**
 * GET /api/payments/cash/transactions
 * List cash transactions with optional filters
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as CashTransactionType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isReconciled = searchParams.get('isReconciled');
    const merchantId = searchParams.get('merchantId');
    const exportFormat = searchParams.get('export');

    const filters: any = {};
    if (type) filters.type = type;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (isReconciled !== null) filters.isReconciled = isReconciled === 'true';
    if (merchantId) filters.merchantId = merchantId;

    const transactions = await getCashTransactions(session.user.id, filters);

    // Export to CSV if requested
    if (exportFormat === 'csv') {
      const csv = exportCashTransactionsToCSV(transactions);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="cash-transactions-${new Date().toISOString()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
    });
  } catch (error: any) {
    console.error('Error fetching cash transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash transactions', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/cash/transactions
 * Create a new cash transaction
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      amount,
      customerName,
      customerPhone,
      customerEmail,
      transactionDate,
      notes,
      merchantId,
      metadata,
    } = body;

    // Validation
    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Type and amount are required' },
        { status: 400 }
      );
    }

    if (!['SALE', 'REFUND', 'EXPENSE', 'ADJUSTMENT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    // Convert amount to cents if it's in dollars
    const amountInCents = Math.round(amount * 100);

    const transaction = await createCashTransaction({
      userId: session.user.id,
      merchantId,
      type,
      amount: amountInCents,
      customerName,
      customerPhone,
      customerEmail,
      transactionDate: transactionDate ? new Date(transactionDate) : undefined,
      notes,
      createdBy: session.user.id,
      metadata,
    });

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Cash transaction created successfully',
    });
  } catch (error: any) {
    console.error('Error creating cash transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create cash transaction', details: error.message },
      { status: 500 }
    );
  }
}
