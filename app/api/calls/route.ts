import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { parsePagination, paginatedResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/calls - List call logs (uses industry DB when user has industry routing)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(request.url);
    const voiceAgentId = searchParams.get("voiceAgentId");
    const pagination = parsePagination(request);
    const countOnly = searchParams.get("countOnly") === "true";
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const whereClause: any = { userId: session.user.id };
    if (voiceAgentId) {
      whereClause.voiceAgentId = voiceAgentId;
    }
    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
      if (toDate) whereClause.createdAt.lte = new Date(toDate);
    }

    if (countOnly) {
      const count = await db.callLog.count({ where: whereClause });
      return NextResponse.json({ count });
    }

    const calls = await db.callLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: pagination.take,
      skip: pagination.skip,
      include: {
        voiceAgent: {
          select: {
            name: true,
            businessName: true,
          },
        },
        lead: {
          select: {
            businessName: true,
            contactPerson: true,
          },
        },
        appointment: true,
      },
    });

    const total = await db.callLog.count({ where: whereClause });
    return paginatedResponse(calls || [], total, pagination, "calls");
  } catch (error: any) {
    console.error("Error fetching calls:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    // Return empty array on error to prevent filter crashes
    return NextResponse.json([], { status: 200 });
  }
}
