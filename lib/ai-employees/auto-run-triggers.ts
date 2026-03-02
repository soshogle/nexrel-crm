/**
 * AI Employee Auto-Run Triggers
 * Starts workflows when auto-run is enabled for relevant events
 * (Workflows define the behavior; auto-run is the trigger switch)
 */

import { resolveDalContext } from '@/lib/context/industry-context';
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

/** RE employee types that trigger on new lead creation */
const RE_LEAD_TRIGGER_TYPES = [
  'RE_SPEED_TO_LEAD',
  'RE_SPHERE_NURTURE',
  'RE_BUYER_FOLLOWUP',
  'RE_MARKET_UPDATE',
  'RE_STALE_DIAGNOSTIC',
  'RE_LISTING_BOOST',
  'RE_CMA_GENERATOR',
] as const;

/**
 * Trigger auto-run workflows for a new lead.
 * Supports RE_SPEED_TO_LEAD, RE_SPHERE_NURTURE, RE_BUYER_FOLLOWUP, RE_MARKET_UPDATE,
 * RE_STALE_DIAGNOSTIC, RE_LISTING_BOOST, RE_CMA_GENERATOR.
 * Starts the linked workflow for each enabled employee type.
 */
export async function triggerAutoRunOnLeadCreated(
  userId: string,
  leadId: string
): Promise<void> {
  try {
    const db = getCrmDb(await resolveDalContext(userId));
    const settings = await db.aIEmployeeAutoRun.findMany({
      where: {
        userId,
        employeeType: { in: [...RE_LEAD_TRIGGER_TYPES] },
        autoRunEnabled: true,
        workflowId: { not: null },
        OR: [{ industry: 'REAL_ESTATE' }, { industry: null }],
      },
    });

    if (settings.length === 0) return;

    const ctx = await resolveDalContext(userId);
    const lead = await leadService.findUnique(ctx, leadId);
    if (!lead) return;

    const tagsArray = (lead.tags as any) || [];
    const leadType = Array.isArray(tagsArray)
      ? tagsArray.find((tag: string) => tag?.toLowerCase?.().includes('buyer') || tag?.toLowerCase?.().includes('seller'))
      : null;
    const workflowType = leadType?.toLowerCase?.().includes('seller') ? 'SELLER' : 'BUYER';

    for (const setting of settings) {
      if (!setting.workflowId) continue;

      const template = await db.rEWorkflowTemplate.findUnique({
        where: { id: setting.workflowId },
      });
      if (!template || template.userId !== userId || !template.isActive) continue;

      await startWorkflowInstance(userId, setting.workflowId, {
        leadId,
        triggerType: 'NEW_LEAD',
        metadata: {
          leadType: workflowType,
          leadStatus: lead.status,
          triggeredBy: 'auto_run',
          employeeType: setting.employeeType,
        },
      });

      console.log(`[Auto-Run] Started ${setting.employeeType} workflow ${setting.workflowId} for lead ${leadId}`);
    }
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
    const db = getCrmDb(await resolveDalContext(userId));
    const settings = await db.aIEmployeeAutoRun.findMany({
      where: {
        userId,
        industry,
        autoRunEnabled: true,
        workflowId: { not: null },
      },
    });

    if (settings.length === 0) return;

    const ctx = await resolveDalContext(userId);
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
