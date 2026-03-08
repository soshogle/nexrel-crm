/**
 * Generic Multi-Industry HITL Approve API
 * Approve a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { approveHITLGate } from "@/lib/workflows/workflow-engine";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST - Approve a HITL task execution
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
    const { notes } = body;

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
        instance: {
          include: {
            template: {
              include: {
                tasks: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!execution) {
      return apiErrors.notFound(
        "Task execution not found or not awaiting approval",
      );
    }

    // Approve HITL gate using the generic workflow engine
    await approveHITLGate(params.id, ctx.userId, notes);

    // Get updated execution
    const updatedExecution = await db.taskExecution.findUnique({
      where: { id: params.id },
      include: {
        task: true,
        instance: {
          include: {
            template: {
              include: {
                tasks: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    // Find next task
    const tasks = updatedExecution?.instance.template.tasks || [];
    const currentTaskIndex = tasks.findIndex(
      (t: { id: string }) => t.id === updatedExecution?.taskId,
    );
    const nextTask = tasks[currentTaskIndex + 1];

    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      message: "Task approved successfully",
      nextTask: nextTask ? nextTask.name : null,
    });
  } catch (error) {
    console.error("Error approving HITL:", error);
    return apiErrors.internal("Failed to approve task");
  }
}
