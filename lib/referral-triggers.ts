/**
 * Referral triggers: fire campaign triggers and auto-enroll leads in workflows
 * when a referral is created or converted.
 */

import { prisma } from '@/lib/db';
import { processCampaignTriggers } from '@/lib/campaign-triggers';

export type ReferralTriggerType = 'REFERRAL_CREATED' | 'REFERRAL_CONVERTED';

/**
 * Process referral-related triggers:
 * 1. Enroll referrer/new lead in matching email/SMS drip campaigns (via campaign-triggers).
 * 2. Auto-enroll in workflow templates that have REFERRAL_CREATED or REFERRAL_CONVERTED in enrollmentTriggers.
 */
export async function processReferralTriggers(
  userId: string,
  leadId: string,
  triggerType: ReferralTriggerType
) {
  // 1. Campaign triggers (email drip, SMS sequences)
  await processCampaignTriggers({
    leadId,
    userId,
    triggerType,
  });

  // 2. Workflow template enrollments
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
    const hasTrigger = triggers.some((t) => t.type === triggerType);
    if (!hasTrigger) continue;

    // Check existing enrollment
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
