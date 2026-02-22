/**
 * AI Employee Auto-Run Triggers
 * Starts workflows when auto-run is enabled for relevant events
 * (Workflows define the behavior; auto-run is the trigger switch)
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService, workflowTemplateService } from '@/lib/dal';
import { Industry } from '@prisma/client';
import { startWorkflowInstance } from '@/lib/real-estate/workflow-engine';
import { startWorkflowInstance as startIndustryWorkflowInstance } from '@/lib/workflows/workflow-engine';

/**
 * Unified entry: trigger auto-run workflows when a lead is created.
 * Routes to RE or industry based on user's industry.
 */
export async function triggerAutoRunOnLeadCreatedForUser(
  userId: string,
  leadId: string,
  userIndustry: Industry | null
): Promise<void> {
  if (userIndustry === 'REAL_ESTATE' || !userIndustry) {
    await triggerAutoRunOnLeadCreated(userId, leadId);
    return;
  }
  await triggerIndustryAutoRunOnLeadCreated(userId, leadId, userIndustry);
}

/**
 * Trigger auto-run workflows for a new lead (e.g. RE_SPEED_TO_LEAD)
 * Starts the linked workflow instead of running the agent directly
 */
export async function triggerAutoRunOnLeadCreated(
  userId: string,
  leadId: string
): Promise<void> {
  try {
    const db = getCrmDb(createDalContext(userId));
    const setting = await db.aIEmployeeAutoRun.findFirst({
      where: {
        userId,
        employeeType: 'RE_SPEED_TO_LEAD',
        autoRunEnabled: true,
        workflowId: { not: null },
        OR: [{ industry: 'REAL_ESTATE' }, { industry: null }],
      },
    });

    if (!setting?.workflowId) return;

    const ctx = createDalContext(userId);
    const lead = await leadService.findUnique(ctx, leadId);
    if (!lead) return;

    const tagsArray = (lead.tags as any) || [];
    const leadType = Array.isArray(tagsArray)
      ? tagsArray.find((tag: string) => tag?.toLowerCase?.().includes('buyer') || tag?.toLowerCase?.().includes('seller'))
      : null;
    const workflowType = leadType?.toLowerCase?.().includes('seller') ? 'SELLER' : 'BUYER';

    const template = await db.rEWorkflowTemplate.findUnique({
      where: { id: setting.workflowId },
    });
    if (!template || template.userId !== userId || !template.isActive) return;

    await startWorkflowInstance(userId, setting.workflowId, {
      leadId,
      triggerType: 'NEW_LEAD',
      metadata: {
        leadType: workflowType,
        leadStatus: lead.status,
        triggeredBy: 'auto_run',
      },
    });

    console.log(`[Auto-Run] Started Speed to Lead workflow ${setting.workflowId} for lead ${leadId}`);
  } catch (error) {
    console.error('[Auto-Run] Failed to trigger workflow:', error);
  }
}

/**
 * Trigger industry auto-run workflows for a new lead (e.g. APPOINTMENT_SCHEDULER for DENTIST)
 * Starts WorkflowTemplate workflows linked to auto-run for the user's industry
 */
export async function triggerIndustryAutoRunOnLeadCreated(
  userId: string,
  leadId: string,
  industry: Industry
): Promise<void> {
  try {
    const db = getCrmDb(createDalContext(userId));
    const settings = await db.aIEmployeeAutoRun.findMany({
      where: {
        userId,
        industry,
        autoRunEnabled: true,
        workflowId: { not: null },
      },
    });

    if (settings.length === 0) return;

    const ctx = createDalContext(userId);
    const lead = await leadService.findUnique(ctx, leadId);
    if (!lead) return;

    for (const setting of settings) {
      if (!setting.workflowId) continue;

      const template = await workflowTemplateService.findUnique(ctx, setting.workflowId);
      if (!template || template.userId !== userId || template.industry !== industry || !template.isActive) continue;

      await startIndustryWorkflowInstance(userId, setting.workflowId, {
        leadId,
        triggerType: 'NEW_LEAD',
        metadata: {
          leadStatus: lead.status,
          triggeredBy: 'auto_run',
          employeeType: setting.employeeType,
        },
      });

      console.log(`[Auto-Run] Started industry workflow ${setting.workflowId} (${setting.employeeType}) for lead ${leadId}`);
    }
  } catch (error) {
    console.error('[Auto-Run] Failed to trigger industry workflow:', error);
  }
}
