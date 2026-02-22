/**
 * Industry Workflow Trigger Detection
 * Automatically starts industry workflows on lead creation (manual + auto-run)
 * Mirrors RE behavior: start most recent non-auto-run workflow + auto-run workflows
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService } from '@/lib/dal';
import { Industry } from '@prisma/client';
import { startWorkflowInstance } from '@/lib/workflows/workflow-engine';
import { triggerIndustryAutoRunOnLeadCreated } from '@/lib/ai-employees/auto-run-triggers';

/**
 * Detect and trigger industry workflows when a new lead is created.
 * 1. Start most recent workflow NOT linked to auto-run (manual trigger)
 * 2. Start workflows linked to auto-run (triggerIndustryAutoRunOnLeadCreated)
 */
export async function detectIndustryLeadWorkflowTriggers(
  userId: string,
  leadId: string,
  industry: Industry
): Promise<void> {
  try {
    const ctx = createDalContext(userId);
    const lead = await leadService.findUnique(ctx, leadId, undefined);

    if (!lead) return;

    // Exclude workflows linked to auto-run (those are started by triggerIndustryAutoRunOnLeadCreated)
    const db = getCrmDb(ctx);
    const autoRunWorkflowIds = await db.aIEmployeeAutoRun.findMany({
      where: {
        userId,
        industry,
        autoRunEnabled: true,
        workflowId: { not: null },
      },
      select: { workflowId: true },
    }).then((rows) => rows.map((r) => r.workflowId).filter(Boolean) as string[]);

    // Find most recent active workflow template for this industry (not linked to auto-run)
    const templates = await db.workflowTemplate.findMany({
      where: {
        userId,
        industry,
        isActive: true,
        ...(autoRunWorkflowIds.length > 0 ? { id: { notIn: autoRunWorkflowIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    for (const template of templates) {
      try {
        await startWorkflowInstance(userId, template.id, {
          leadId,
          triggerType: 'NEW_LEAD',
          metadata: {
            leadStatus: lead.status,
          },
        });
        console.log(`[Industry Workflow] Started workflow ${template.name} for lead ${leadId}`);
      } catch (error) {
        console.error(`[Industry Workflow] Failed to start workflow ${template.id}:`, error);
      }
    }

    // Trigger auto-run workflows
    triggerIndustryAutoRunOnLeadCreated(userId, leadId, industry).catch((err) => {
      console.error('[Industry Workflow] Auto-run trigger failed:', err);
    });
  } catch (error) {
    console.error('[Industry Workflow] Error detecting lead triggers:', error);
  }
}
