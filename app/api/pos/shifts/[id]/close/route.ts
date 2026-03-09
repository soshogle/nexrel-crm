import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * CLOSE SHIFT (CLOCK OUT)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { endingCash, notes } = body;

    // Validate required fields
    if (endingCash === undefined) {
      return apiErrors.badRequest("Ending cash is required");
    }

    // Get shift
    const shift = await getCrmDb(ctx).shift.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        status: "ACTIVE",
      },
      include: {
        staff: true,
      },
    });

    if (!shift) {
      return apiErrors.notFound("Active shift not found");
    }

    // Calculate sales during shift
    const orders = await getCrmDb(ctx).pOSOrder.findMany({
      where: {
        staffId: shift.staffId,
        paymentStatus: "PAID",
        createdAt: {
          gte: shift.clockIn,
          lte: new Date(),
        },
      },
    });

    const totalSales = orders.reduce((sum, order) => {
      return sum + parseFloat(order.total.toString());
    }, 0);

    const orderCount = orders.length;

    // Calculate expected cash (starting cash + cash sales)
    const cashSales = orders
      .filter((order) => order.paymentMethod === "CASH")
      .reduce((sum, order) => {
        return sum + parseFloat(order.total.toString());
      }, 0);

    const expectedCash = parseFloat(shift.startingCash.toString()) + cashSales;
    const cashDifference = parseFloat(endingCash.toString()) - expectedCash;

    // Close shift
    const closedShift = await getCrmDb(ctx).shift.update({
      where: { id: params.id },
      data: {
        clockOut: new Date(),
        status: "CLOSED",
        endingCash,
        expectedCash,
        cashDifference,
        totalSales,
        orderCount,
        notes,
      },
      include: {
        staff: {
          select: {
            employeeId: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    console.log(`✅ Shift closed for staff: ${closedShift.staff.employeeId}`);

    return NextResponse.json({
      success: true,
      shift: closedShift,
      salesSummary: {
        totalSales,
        orderCount,
        cashSales,
        cardSales: totalSales - cashSales,
        expectedCash,
        actualCash: parseFloat(endingCash.toString()),
        cashDifference,
      },
    });
  } catch (error) {
    console.error("❌ Shift close error:", error);
    return apiErrors.internal("Failed to close shift");
  }
}
