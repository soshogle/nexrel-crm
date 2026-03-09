import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/payments/[id] - Get payment details

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
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

    const payment = await db.clubOSPayment.findUnique({
      where: { id: params.id },
      include: {
        household: true,
        registration: {
          include: {
            member: true,
            program: true,
            division: true,
          },
        },
      },
    });

    if (!payment) {
      return apiErrors.notFound("Payment not found");
    }

    // Verify access
    if (payment.household.userId !== session.user.id) {
      return apiErrors.forbidden("Unauthorized");
    }

    return NextResponse.json({ payment });
  } catch (error: any) {
    console.error("Error fetching payment:", error);
    return apiErrors.internal(error.message || "Failed to fetch payment");
  }
}
