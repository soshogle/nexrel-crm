/**
 * Orthodontist Workflow Enrollment Triggers
 * Auto-starts Yul Smile workflows when trigger events occur
 * Uses startWorkflowInstance for immediate execution (WorkflowInstance + TaskExecutions)
 */

import { resolveDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { startWorkflowInstance } from '@/lib/workflows/workflow-engine';
import type { OrthodontistEnrollmentTrigger } from './workflow-templates';

export type OrthodontistTriggerType = OrthodontistEnrollmentTrigger;

/** Trigger types that are handled by orthodontist enrollment (not generic referral-triggers) */
export const ORTHODONTIST_SPECIFIC_TRIGGERS: OrthodontistEnrollmentTrigger[] = [
  'APPOINTMENT_CONFIRMED',
  'TREATMENT_ACCEPTED',
  'CONSULTATION_PENDING',
];

/**
 * Process orthodontist workflow triggers.
 * Starts workflow instances for templates that have the matching trigger in enrollmentTriggers.
 */
export async function processOrthodontistWorkflowEnrollment(
  userId: string,
  leadId: string,
  triggerType: OrthodontistTriggerType,
  metadata?: { appointmentId?: string; referralId?: string; dealId?: string }
) {
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);

  // Verify user industry is orthodontist
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { industry: true },
  });
  if (user?.industry !== 'ORTHODONTIST') {
    return;
  }

  const workflows = await db.workflowTemplate.findMany({
    where: {
      userId,
      industry: 'ORTHODONTIST',
      isActive: true,
      enrollmentTriggers: { not: null as any },
    },
    include: {
      tasks: { orderBy: { displayOrder: 'asc' } },
    },
  });

  for (const workflow of workflows as any[]) {
    const triggers = (workflow.enrollmentTriggers as Array<{ type: string }>) || [];
    const hasTrigger = triggers.some((t: any) => t.type === triggerType);
    if (!hasTrigger) continue;

    try {
      await startWorkflowInstance(userId, workflow.id, {
        leadId,
        triggerType: 'MANUAL',
        metadata: {
          orthodontistTrigger: triggerType,
          ...metadata,
        },
      });
      console.log(
        `[Orthodontist Workflow] Started ${workflow.name} for lead ${leadId} (trigger: ${triggerType})`
      );
    } catch (err) {
      console.error(`[Orthodontist Workflow] Failed to start ${workflow.name}:`, err);
    }
  }
}
