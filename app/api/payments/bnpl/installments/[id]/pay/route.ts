/**
 * BNPL Installment Payment API
 * POST - Process installment payment
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BnplService } from "@/lib/payments/bnpl-service";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
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
    const { paymentMethod, transactionId } = body;

    // Verify ownership
    const installment = await db.bnplInstallment.findUnique({
      where: { id: params.id },
      include: { bnplApplication: true },
    });

    if (!installment) {
      return apiErrors.notFound("Installment not found");
    }

    if (installment.bnplApplication.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const result = await BnplService.processInstallmentPayment({
      installmentId: params.id,
      paymentMethod,
      transactionId:
        transactionId ||
        `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing installment payment:", error);
    return apiErrors.internal(
      error instanceof Error ? error.message : "Failed to process payment",
    );
  }
}
