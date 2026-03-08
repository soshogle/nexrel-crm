/**
 * Generic Multi-Industry HITL Reject API
 * Reject a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { rejectHITLGate } from "@/lib/workflows/workflow-engine";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST - Reject a HITL task execution (expects execution id in params)
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
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { notes, pauseWorkflow } = body;

    // Find the task execution
    const execution = await db.taskExecution.findFirst({
      where: {
        id: params.id,
        instance: {
          userId: ctx.userId,
        },
        status: "AWAITING_HITL",
      },
      include: {
        task: true,
        instance: true,
      },
    });

    if (!execution) {
      return apiErrors.notFound(
        "Task execution not found or not awaiting approval",
      );
    }

    // If pauseWorkflow is true, pause the entire workflow instance
    if (pauseWorkflow) {
      await db.workflowInstance.update({
        where: { id: execution.instanceId },
        data: { status: "PAUSED" },
      });
    }

    // Reject HITL gate using the generic workflow engine
    await rejectHITLGate(params.id, ctx.userId, notes || "Rejected by user");

    // Get updated execution
    const updatedExecution = await db.taskExecution.findUnique({
      where: { id: params.id },
      include: {
        task: true,
        instance: true,
      },
    });

    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      message: pauseWorkflow
        ? "Task rejected and workflow paused"
        : "Task rejected",
      workflowPaused: pauseWorkflow,
    });
  } catch (error) {
    console.error("Error rejecting HITL:", error);
    return apiErrors.internal("Failed to reject task");
  }
}
