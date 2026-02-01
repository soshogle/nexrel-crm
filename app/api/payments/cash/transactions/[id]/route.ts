
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateCashTransaction,
  deleteCashTransaction,
} from '@/lib/payments/cash-service';
import { CashTransactionType } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * PATCH /api/payments/cash/transactions/[id]
 * Update a cash transaction
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount, customerName, customerPhone, customerEmail, transactionDate, notes, metadata } = body;

    // Verify ownership
    const existingTransaction = await prisma.cashTransaction.findUnique({
      where: { id: params.id },
    });

    if (!existingTransaction || existingTransaction.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Transaction not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if transaction is already reconciled
    if (existingTransaction.isReconciled) {
      return NextResponse.json(
        { error: 'Cannot edit a reconciled transaction' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedBy: session.user.id,
    };

    if (type) updateData.type = type as CashTransactionType;
    if (amount !== undefined) updateData.amount = Math.round(amount * 100);
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
    if (transactionDate) updateData.transactionDate = new Date(transactionDate);
    if (notes !== undefined) updateData.notes = notes;
    if (metadata) updateData.metadata = metadata;

    const transaction = await updateCashTransaction(params.id, updateData);

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Cash transaction updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating cash transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update cash transaction', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/cash/transactions/[id]
 * Soft delete a cash transaction
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingTransaction = await prisma.cashTransaction.findUnique({
      where: { id: params.id },
    });

    if (!existingTransaction || existingTransaction.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Transaction not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if transaction is already reconciled
    if (existingTransaction.isReconciled) {
      return NextResponse.json(
        { error: 'Cannot delete a reconciled transaction' },
        { status: 400 }
      );
    }

    await deleteCashTransaction(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Cash transaction deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting cash transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete cash transaction', details: error.message },
      { status: 500 }
    );
  }
}
