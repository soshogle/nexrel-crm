/**
 * Zod schemas for validating critical API responses.
 * Use parseSafe() to filter invalid items instead of throwing.
 */

import { z } from 'zod';

// ─── HITL Pending Approvals ────────────────────────────────────────────────

export const HITLApprovalSchema = z.object({
  id: z.string().optional(),
  task: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
    })
    .optional()
    .nullable(),
  instance: z
    .object({
      lead: z
        .object({
          businessName: z.string().optional(),
          contactPerson: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
      deal: z
        .object({
          title: z.string().optional(),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  createdAt: z.string().optional(),
});

export type HITLApproval = z.infer<typeof HITLApprovalSchema>;

export function parseHITLApprovals(data: unknown): HITLApproval[] {
  const arr = Array.isArray(data) ? data : [];
  return arr
    .filter((item): item is HITLApproval => HITLApprovalSchema.safeParse(item).success)
    .map((item) => HITLApprovalSchema.parse(item));
}

// ─── Workflow Instance Execution ──────────────────────────────────────────

export const WorkflowExecutionSchema = z.object({
  id: z.string().optional(),
  taskId: z.string().optional(),
  task: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      displayOrder: z.number().optional(),
      isHITL: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  status: z.string().optional(),
  scheduledFor: z.string().optional().nullable(),
  startedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
});

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

export function parseWorkflowExecutions(data: unknown): WorkflowExecution[] {
  const arr = Array.isArray(data) ? data : [];
  return arr
    .filter((item): item is WorkflowExecution => WorkflowExecutionSchema.safeParse(item).success)
    .map((item) => WorkflowExecutionSchema.parse(item));
}

// ─── Workflow Instance (RE) ────────────────────────────────────────────────

export const WorkflowInstanceSchema = z.object({
  id: z.string().optional(),
  templateId: z.string().optional(),
  template: z
    .object({
      name: z.string().optional(),
      tasks: z.array(z.unknown()).optional(),
    })
    .optional()
    .nullable(),
  status: z.string().optional(),
  startedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  lead: z.unknown().optional().nullable(),
  deal: z.unknown().optional().nullable(),
  executions: z.array(WorkflowExecutionSchema).optional(),
});

export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;

export function parseWorkflowInstances(data: unknown): WorkflowInstance[] {
  const arr = Array.isArray(data) ? data : [];
  return arr
    .filter((item): item is WorkflowInstance => WorkflowInstanceSchema.safeParse(item).success)
    .map((item) => WorkflowInstanceSchema.parse(item));
}

// ─── Industry Workflow Instance (from /api/workflows/instances/active) ──────

export const IndustryWorkflowInstanceSchema = z.object({
  id: z.string().optional(),
  templateId: z.string().optional(),
  workflowName: z.string().optional(),
  status: z.string().optional(),
  lead: z.unknown().optional().nullable(),
  deal: z.unknown().optional().nullable(),
  totalTasks: z.number().optional(),
  executions: z
    .array(
      z.object({
        id: z.string().optional(),
        taskId: z.string().optional(),
        taskName: z.string().optional(),
        status: z.string().optional(),
        scheduledFor: z.string().optional().nullable(),
        startedAt: z.string().optional().nullable(),
        completedAt: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export type IndustryWorkflowInstance = z.infer<typeof IndustryWorkflowInstanceSchema>;

export function parseIndustryWorkflowInstances(data: unknown): IndustryWorkflowInstance[] {
  const arr = Array.isArray(data) ? data : [];
  return arr
    .filter(
      (item): item is IndustryWorkflowInstance =>
        IndustryWorkflowInstanceSchema.safeParse(item).success
    )
    .map((item) => IndustryWorkflowInstanceSchema.parse(item));
}

// ─── HITL Notification (for hitl-approval-panel, full structure) ─────────────

export const HITLNotificationSchema = z.object({
  id: z.string().optional(),
  taskExecution: z
    .object({
      id: z.string().optional(),
      task: z
        .object({
          id: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          order: z.number().optional(),
        })
        .optional()
        .nullable(),
      workflowInstance: z
        .object({
          id: z.string().optional(),
          workflow: z
            .object({
              name: z.string().optional(),
              workflowType: z.string().optional(),
            })
            .optional()
            .nullable(),
          lead: z.unknown().optional().nullable(),
          deal: z.unknown().optional().nullable(),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  message: z.string().optional(),
  createdAt: z.string().optional(),
});

export type HITLNotification = z.infer<typeof HITLNotificationSchema>;

export function parseHITLNotifications(data: unknown): HITLNotification[] {
  const arr = Array.isArray(data) ? data : [];
  return arr
    .filter(
      (item): item is HITLNotification => HITLNotificationSchema.safeParse(item).success
    )
    .map((item) => HITLNotificationSchema.parse(item));
}
