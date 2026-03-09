import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET STOCK ALERTS
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(req.url);
    const isResolved = searchParams.get("isResolved");
    const alertType = searchParams.get("alertType");
    const severity = searchParams.get("severity");

    const where: any = { userId: session.user.id };

    if (isResolved !== null) {
      where.isResolved = isResolved === "true";
    }

    if (alertType) {
      where.alertType = alertType;
    }

    if (severity) {
      where.severity = severity;
    }

    const alerts = await db.stockAlert.findMany({
      where,
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true,
            minimumStock: true,
            unit: true,
          },
        },
      },
      orderBy: [
        { isResolved: "asc" },
        { severity: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("❌ Alerts fetch error:", error);
    return apiErrors.internal("Failed to fetch alerts");
  }
}

/**
 * MARK ALERT AS RESOLVED
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const body = await req.json();
    const { alertIds } = body;

    if (!alertIds || !Array.isArray(alertIds)) {
      return apiErrors.badRequest("Alert IDs are required");
    }

    await db.stockAlert.updateMany({
      where: {
        id: { in: alertIds },
        userId: session.user.id,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Alert resolution error:", error);
    return apiErrors.internal("Failed to resolve alerts");
  }
}
