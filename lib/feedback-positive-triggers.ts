/**
 * Feedback-positive triggers: fire campaign triggers and auto-enroll leads in workflows
 * when a customer gives positive feedback (rating >= 4). Used for referral-ask flow
 * after the review step in the "reviews → referral" sequence.
 */

import { prisma } from '@/lib/db';
import { processCampaignTriggers } from '@/lib/campaign-triggers';

/**
 * Process feedback-positive triggers:
 * 1. Enroll lead in matching email/SMS drip campaigns.
 * 2. Auto-enroll in workflow templates that have FEEDBACK_POSITIVE in enrollmentTriggers.
 */
export async function processFeedbackPositiveTriggers(
  userId: string,
  leadId: string,
  metadata?: { rating?: number; feedbackId?: string }
) {
  await processCampaignTriggers({
    leadId,
    userId,
    triggerType: 'FEEDBACK_POSITIVE',
    metadata,
  });

  const workflows = await prisma.workflowTemplate.findMany({
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
    const hasTrigger = triggers.some((t) => t.type === 'FEEDBACK_POSITIVE');
    if (!hasTrigger) continue;

    const existing = await prisma.workflowTemplateEnrollment.findUnique({
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

    await prisma.workflowTemplateEnrollment.create({
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
