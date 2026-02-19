/**
 * Zod schemas for validating critical API responses and request bodies.
 * Use parseSafe() to filter invalid items instead of throwing.
 */

import { z } from 'zod';

// ─── Leads ───────────────────────────────────────────────────────────────────

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'RESPONDED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

export const LeadCreateBodySchema = z
  .object({
    businessName: z.string().optional().default(''),
    contactPerson: z.string().optional().default(''),
    email: z.union([z.string().email(), z.literal('')]).optional().default(''),
    phone: z.string().max(50).optional().default(''),
    website: z.union([z.string().url(), z.literal('')]).optional().default(''),
    address: z.string().max(500).optional().default(''),
    city: z.string().max(100).optional().default(''),
    state: z.string().max(100).optional().default(''),
    zipCode: z.string().max(20).optional().default(''),
    country: z.string().max(100).optional().default(''),
    businessCategory: z.string().max(200).optional().default(''),
    status: z.enum(LEAD_STATUSES).optional().default('NEW'),
    source: z.string().max(50).optional().default('manual'),
  })
  .refine(
    (data) => (data.businessName?.trim() || data.contactPerson?.trim()) !== '',
    { message: 'Either business name or contact person is required' }
  )
  .transform((data) => {
    // Prisma requires businessName; use contactPerson when businessName is empty
    const businessName =
      data.businessName?.trim() || data.contactPerson?.trim() || 'Unknown';
    return { ...data, businessName };
  });

export type LeadCreateBody = z.infer<typeof LeadCreateBodySchema>;

export const LeadsGetQuerySchema = z.object({
  status: z.string().max(20).optional(),
  search: z.string().max(200).optional(),
});

export type LeadsGetQuery = z.infer<typeof LeadsGetQuerySchema>;

// ─── Workflow Instances Query ──────────────────────────────────────────────

export const WorkflowInstancesQuerySchema = z.object({
  status: z.string().max(50).optional(),
  leadId: z.string().max(50).optional(),
  dealId: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().max(100).optional(),
});

export type WorkflowInstancesQuery = z.infer<typeof WorkflowInstancesQuerySchema>;

// ─── HITL Request Bodies ───────────────────────────────────────────────────

export const HITLApproveBodySchema = z.object({
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const HITLRejectBodySchema = z.object({
  notes: z.string().optional(),
  pauseWorkflow: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

// ─── HITL Pending Response (full API response) ──────────────────────────────

export const HITLPendingResponseSchema = z.object({
  success: z.boolean().optional(),
  notifications: z.array(z.unknown()).optional(),
  pendingApprovals: z.array(z.unknown()).optional(),
  totalPending: z.number().optional(),
});

export type HITLPendingResponse = z.infer<typeof HITLPendingResponseSchema>;

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
    .filter((item): item is HITLApproval => item != null && HITLApprovalSchema.safeParse(item).success)
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
    .filter((item): item is WorkflowExecution => item != null && WorkflowExecutionSchema.safeParse(item).success)
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
      (item): item is HITLNotification =>
        item != null && HITLNotificationSchema.safeParse(item).success
    )
    .map((item) => HITLNotificationSchema.parse(item));
}
