/**
 * Get Active Drip Campaign Enrollments
 * Returns all active enrollments across all workflows for monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const statusParam = searchParams.get("status") || "all";

    // Build where: 'all' = no status filter (for Monitor Jobs)
    const whereClause: { workflow: { userId: string }; status?: any } = {
      workflow: { userId: ctx.userId },
    };
    if (statusParam !== "all") {
      whereClause.status = statusParam as any;
    }

    const enrollments = await db.workflowTemplateEnrollment.findMany({
      where: whereClause,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            executionMode: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: {
        nextSendAt: "asc", // Show next actions first
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflow.name,
        leadId: e.leadId,
        lead: e.lead,
        status: e.status,
        currentStep: e.currentStep,
        nextSendAt: e.nextSendAt,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        abTestGroup: e.abTestGroup,
      })),
      total: enrollments.length,
    });
  } catch (error) {
    console.error("Error fetching active enrollments:", error);
    return apiErrors.internal("Failed to fetch enrollments");
  }
}
