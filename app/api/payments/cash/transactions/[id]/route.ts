import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  updateCashTransaction,
  deleteCashTransaction,
} from "@/lib/payments/cash-service";
import { CashTransactionType } from "@prisma/client";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * PATCH /api/payments/cash/transactions/[id]
 * Update a cash transaction
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const {
      type,
      amount,
      customerName,
      customerPhone,
      customerEmail,
      transactionDate,
      notes,
      metadata,
    } = body;

    // Verify ownership
    const existingTransaction = await db.cashTransaction.findUnique({
      where: { id: params.id },
    });

    if (
      !existingTransaction ||
      existingTransaction.userId !== session.user.id
    ) {
      return apiErrors.notFound("Transaction not found or unauthorized");
    }

    // Check if transaction is already reconciled
    if (existingTransaction.isReconciled) {
      return apiErrors.badRequest("Cannot edit a reconciled transaction");
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
      message: "Cash transaction updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating cash transaction:", error);
    return apiErrors.internal(
      "Failed to update cash transaction",
      error.message,
    );
  }
}

/**
 * DELETE /api/payments/cash/transactions/[id]
 * Soft delete a cash transaction
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Verify ownership
    const existingTransaction = await db.cashTransaction.findUnique({
      where: { id: params.id },
    });

    if (
      !existingTransaction ||
      existingTransaction.userId !== session.user.id
    ) {
      return apiErrors.notFound("Transaction not found or unauthorized");
    }

    // Check if transaction is already reconciled
    if (existingTransaction.isReconciled) {
      return apiErrors.badRequest("Cannot delete a reconciled transaction");
    }

    await deleteCashTransaction(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Cash transaction deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting cash transaction:", error);
    return apiErrors.internal(
      "Failed to delete cash transaction",
      error.message,
    );
  }
}
