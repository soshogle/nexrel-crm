/**
 * Real Estate Workflow Trigger Detection
 * Automatically starts RE workflows based on lead/deal events
 */

import { prisma } from '@/lib/db';
import { startWorkflowInstance } from './workflow-engine';

/**
 * Detect and trigger RE workflows when a new lead is created
 */
export async function detectLeadWorkflowTriggers(
  userId: string,
  leadId: string
): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { 
        id: true, 
        status: true,
        metadata: true,
        tags: true,
      },
    });

    if (!lead) return;

    // Determine workflow type based on lead metadata or tags
    const leadType = (lead.metadata as any)?.leadType || 
                     lead.tags?.find(tag => tag.toLowerCase().includes('buyer') || tag.toLowerCase().includes('seller')) ||
                     'BUYER'; // Default to buyer

    const workflowType = leadType.toLowerCase().includes('seller') ? 'SELLER' : 'BUYER';

    // Find active workflow templates for this type
    const templates = await prisma.rEWorkflowTemplate.findMany({
      where: {
        userId,
        type: workflowType,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1, // Use most recent template
    });

    // Start workflow for each matching template
    for (const template of templates) {
      try {
        await startWorkflowInstance(userId, template.id, {
          leadId,
          triggerType: 'NEW_LEAD',
          metadata: {
            leadType: workflowType,
            leadStatus: lead.status,
          },
        });
        console.log(`[RE Workflow] Started ${workflowType} workflow for lead ${leadId}`);
      } catch (error) {
        console.error(`[RE Workflow] Failed to start workflow ${template.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[RE Workflow] Error detecting lead triggers:', error);
  }
}

/**
 * Detect and trigger RE workflows when a deal stage changes
 */
export async function detectDealStageWorkflowTriggers(
  userId: string,
  dealId: string,
  newStageName: string
): Promise<void> {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        lead: true,
        stage: true,
      },
    });

    if (!deal) return;

    // Determine workflow type based on deal metadata or lead type
    const workflowType = (deal.metadata as any)?.workflowType || 'BUYER';

    // Find active workflow templates
    const templates = await prisma.rEWorkflowTemplate.findMany({
      where: {
        userId,
        type: workflowType,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    // Start workflow if not already running
    for (const template of templates) {
      const existingInstance = await prisma.rEWorkflowInstance.findFirst({
        where: {
          templateId: template.id,
          dealId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
      });

      if (!existingInstance) {
        try {
          await startWorkflowInstance(userId, template.id, {
            dealId,
            leadId: deal.leadId || undefined,
            triggerType: 'DEAL_STAGE_CHANGE',
            metadata: {
              stageName: newStageName,
              dealValue: deal.value,
            },
          });
          console.log(`[RE Workflow] Started ${workflowType} workflow for deal ${dealId}`);
        } catch (error) {
          console.error(`[RE Workflow] Failed to start workflow ${template.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[RE Workflow] Error detecting deal stage triggers:', error);
  }
}
