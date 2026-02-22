/**
 * Service-completed triggers: fire campaign triggers and auto-enroll leads in workflows
 * when an appointment or service is completed.
 * Powers the "reviews + referral" flow: feedback → review link → ask for referral.
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { processCampaignTriggers } from '@/lib/campaign-triggers';

export type ServiceCompletedTriggerType = 'SERVICE_COMPLETED';

/**
 * Process service-completed triggers:
 * 1. Enroll client lead in matching email/SMS drip campaigns (via campaign-triggers).
 * 2. Auto-enroll in workflow templates that have SERVICE_COMPLETED in enrollmentTriggers.
 */
export async function processServiceCompletedTriggers(
  userId: string,
  leadId: string,
  metadata?: { appointmentId?: string; serviceType?: string }
) {
  await processCampaignTriggers({
    leadId,
    userId,
    triggerType: 'SERVICE_COMPLETED',
    metadata,
  });

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  // Workflow template enrollments
  const workflows = await db.workflowTemplate.findMany({
    where: {
      userId,
      isActive: true,
      enrollmentMode: true,
      enrollmentTriggers: { not: null },
    },
    include: {
      tasks: { orderBy: { displayOrder: 'asc' } },
    },
  });

  for (const workflow of workflows) {
    const triggers = (workflow.enrollmentTriggers as Array<{ type: string }>) || [];
    const hasTrigger = triggers.some((t) => t.type === 'SERVICE_COMPLETED');
    if (!hasTrigger) continue;

    const existing = await db.workflowTemplateEnrollment.findUnique({
      where: {
        workflowId_leadId: { workflowId: workflow.id, leadId },
      },
    });
    if (existing) continue;

    const firstTask = workflow.tasks[0];
    const nextSendAt = firstTask
      ? new Date(
          Date.now() +
            (firstTask.delayValue || 0) *
              (firstTask.delayUnit === 'HOURS'
                ? 3600000
                : firstTask.delayUnit === 'DAYS'
                  ? 86400000
                  : 60000)
        )
      : new Date();

    const workflowAny = workflow as { enableAbTesting?: boolean; abTestConfig?: { splitPercentage?: number } };
    let abTestGroup: string | null = null;
    if (workflowAny.enableAbTesting && workflowAny.abTestConfig) {
      const config = workflowAny.abTestConfig;
      const random = Math.random() * 100;
      abTestGroup = random < (config.splitPercentage ?? 50) ? 'A' : 'B';
    }

    await db.workflowTemplateEnrollment.create({
      data: {
        workflowId: workflow.id,
        leadId,
        status: 'ACTIVE',
        currentStep: 1,
        nextSendAt,
        abTestGroup,
      },
    });
  }
}
