import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { leadService } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);

    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      newThisMonth,
      customers,
      prospects,
      partners,
      totalWithActivity,
    ] = await Promise.all([
      leadService.count(ctx),
      leadService.count(ctx, {
        createdAt: {
          gte: firstDayOfMonth,
        },
      }),
      leadService.count(ctx, {
        OR: [{ contactType: "CUSTOMER" }, { contactType: "customer" }],
      }),
      leadService.count(ctx, {
        OR: [{ contactType: "PROSPECT" }, { contactType: "prospect" }],
      }),
      leadService.count(ctx, {
        OR: [{ contactType: "PARTNER" }, { contactType: "partner" }],
      }),
      leadService.count(ctx, {
        lastContactedAt: {
          not: null,
        },
      }),
    ]);

    const engagementRate =
      total > 0 ? Math.round((totalWithActivity / total) * 100) : 0;

    const isOrthoDemo =
      String(session?.user?.email || "")
        .toLowerCase()
        .trim() === "orthodontist@nexrel.com";
    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && total === 0 && newThisMonth === 0) {
      const { MOCK_CONTACT_STATS } = await import("@/lib/mock-data");
      return NextResponse.json(MOCK_CONTACT_STATS);
    }

    return NextResponse.json({
      total,
      newThisMonth,
      customers,
      prospects,
      partners,
      engagementRate,
    });
  } catch (error) {
    console.error("Error fetching contact stats:", error);
    return apiErrors.internal("Failed to fetch stats");
  }
}
