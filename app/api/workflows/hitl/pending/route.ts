/**
 * Generic Multi-Industry HITL Pending Approvals API
 * Aggregates pending HITL approvals from Real Estate and generic workflow engines
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { RE_AGENT_NAMES } from "@/lib/real-estate/workflow-templates";
import { REAIEmployeeType } from "@prisma/client";
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

    const userId = ctx.userId;

    // ─── Real Estate: notifications + task executions ─────────────────────
    let reNotifications: any[] = [];
    let reAwaitingApproval: any[] = [];
    try {
      const [notifs, execs] = await Promise.all([
        db.rEHITLNotification.findMany({
          where: { userId, isActioned: false },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        db.rETaskExecution.findMany({
          where: {
            instance: { userId },
            status: "AWAITING_HITL",
          },
          include: {
            task: {
              select: {
                id: true,
                name: true,
                description: true,
                taskType: true,
                assignedAgentType: true,
                actionConfig: true,
              },
            },
            instance: {
              include: {
                template: { select: { id: true, name: true, type: true } },
                lead: {
                  select: {
                    id: true,
                    businessName: true,
                    contactPerson: true,
                    email: true,
                    phone: true,
                  },
                },
                deal: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);
      reNotifications = notifs;
      reAwaitingApproval = execs;
    } catch (reErr: any) {
      console.error("[HITL Pending] RE fetch error:", reErr);
    }

    // Enrich RE notifications with execution data
    const reExecutionMap = new Map<string, any>();
    for (const exec of reAwaitingApproval) {
      reExecutionMap.set(exec.id, exec);
    }
    const enrichedReNotifications = reNotifications.map((notif: any) => {
      const execution = notif.executionId
        ? reExecutionMap.get(notif.executionId)
        : null;
      return {
        ...notif,
        source: "real_estate" as const,
        taskExecution: execution
          ? {
              id: execution.id,
              task: execution.task || null,
              workflowInstance: execution.instance
                ? {
                    id: execution.instance.id,
                    workflow: execution.instance.template || null,
                    lead: execution.instance.lead || null,
                    deal: execution.instance.deal || null,
                  }
                : null,
            }
          : null,
      };
    });

    const enrichedReApprovals = reAwaitingApproval.map(
      (execution: {
        task: { assignedAgentType: REAIEmployeeType | null };
        [key: string]: unknown;
      }) => ({
        ...execution,
        source: "real_estate" as const,
        agentName: execution.task?.assignedAgentType
          ? RE_AGENT_NAMES[execution.task.assignedAgentType as REAIEmployeeType]
          : "System",
      }),
    );

    // ─── Generic (multi-industry): HITLNotification + TaskExecution ─────────
    let genericNotifications: any[] = [];
    let genericAwaitingApproval: any[] = [];
    try {
      const [notifs, execs] = await Promise.all([
        db.hITLNotification.findMany({
          where: { userId, isActioned: false },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        db.taskExecution.findMany({
          where: {
            instance: { userId },
            status: "AWAITING_HITL",
          },
          include: {
            task: {
              select: {
                id: true,
                name: true,
                description: true,
                taskType: true,
                assignedAgentType: true,
                actionConfig: true,
              },
            },
            instance: {
              include: {
                template: { select: { id: true, name: true, industry: true } },
                lead: {
                  select: {
                    id: true,
                    businessName: true,
                    contactPerson: true,
                    email: true,
                    phone: true,
                  },
                },
                deal: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);
      genericNotifications = notifs;
      genericAwaitingApproval = execs;
    } catch (genErr: any) {
      console.error("[HITL Pending] Generic fetch error:", genErr);
    }

    const genericExecutionMap = new Map<string, any>();
    for (const exec of genericAwaitingApproval) {
      genericExecutionMap.set(exec.id, exec);
    }
    const enrichedGenericNotifications = genericNotifications.map(
      (notif: any) => {
        const execution = notif.executionId
          ? genericExecutionMap.get(notif.executionId)
          : null;
        return {
          ...notif,
          source: "generic" as const,
          taskExecution: execution
            ? {
                id: execution.id,
                task: execution.task || null,
                workflowInstance: execution.instance
                  ? {
                      id: execution.instance.id,
                      workflow: execution.instance.template || null,
                      lead: execution.instance.lead || null,
                      deal: execution.instance.deal || null,
                    }
                  : null,
              }
            : null,
        };
      },
    );

    const enrichedGenericApprovals = genericAwaitingApproval.map(
      (execution: any) => ({
        ...execution,
        source: "generic" as const,
        agentName: "System",
      }),
    );

    // ─── Merge and return ──────────────────────────────────────────────────
    const notifications = [
      ...enrichedReNotifications,
      ...enrichedGenericNotifications,
    ];
    const pendingApprovals = [
      ...enrichedReApprovals,
      ...enrichedGenericApprovals,
    ];
    const totalPending = pendingApprovals.length;

    return NextResponse.json({
      success: true,
      notifications,
      pendingApprovals,
      totalPending,
    });
  } catch (error: any) {
    console.error("[HITL Pending] Error:", error);
    return NextResponse.json({
      success: true,
      notifications: [],
      pendingApprovals: [],
      totalPending: 0,
      error:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}
