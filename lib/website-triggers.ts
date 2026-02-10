/**
 * Website triggers: auto-enroll leads in drip workflows when website events occur
 * (form submitted, visitor arrives, CTA clicked, booking created).
 */

import { prisma } from '@/lib/db';

export type WebsiteTriggerType =
  | 'WEBSITE_FORM_SUBMITTED'
  | 'WEBSITE_VISITOR'
  | 'WEBSITE_VISITOR_RETURNING'
  | 'WEBSITE_CTA_CLICKED'
  | 'WEBSITE_BOOKING_CREATED';

/**
 * Process website-related triggers: auto-enroll leads in WorkflowTemplates
 * that have website triggers in enrollmentTriggers.
 */
export async function processWebsiteTriggers(
  userId: string,
  leadId: string,
  triggerType: WebsiteTriggerType,
  metadata?: { websiteId?: string }
) {
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
    const triggers = (workflow.enrollmentTriggers as Array<{ type: string; conditions?: { websiteId?: string } }>) || [];
    const hasTrigger = triggers.some((t) => t.type === triggerType);
    if (!hasTrigger) continue;

    // Check websiteId filter if specified
    const triggerConfig = triggers.find((t) => t.type === triggerType);
    if (triggerConfig?.conditions?.websiteId && metadata?.websiteId) {
      if (triggerConfig.conditions.websiteId !== metadata.websiteId) continue;
    }

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
