/**
 * Lead-to-Pipeline Sync
 *
 * Automatically creates/moves Deal records in the sales pipeline
 * whenever a Lead is created or its status changes.
 *
 * Mapping (LeadStatus → Pipeline Stage):
 *   NEW        → "New Lead"
 *   CONTACTED  → "Contacted"
 *   RESPONDED  → "Contacted"
 *   QUALIFIED  → "Qualified"
 *   CONVERTED  → "Closed Won"
 *   LOST       → "Closed Lost" (or stays in current stage)
 */

import { prisma } from '@/lib/db';

const STATUS_TO_STAGE: Record<string, string> = {
  NEW: 'New Lead',
  CONTACTED: 'Contacted',
  RESPONDED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Closed Won',
  LOST: 'Closed Lost',
};

async function getOrCreateDefaultPipeline(userId: string) {
  let pipeline = await prisma.pipeline.findFirst({
    where: { userId, isDefault: true },
    include: { stages: { orderBy: { displayOrder: 'asc' } } },
  });

  if (!pipeline) {
    pipeline = await prisma.pipeline.findFirst({
      where: { userId },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        name: 'Default Pipeline',
        description: 'Your default sales pipeline',
        userId,
        isDefault: true,
        stages: {
          create: [
            { name: 'New Lead', displayOrder: 0, probability: 10 },
            { name: 'Contacted', displayOrder: 1, probability: 25 },
            { name: 'Qualified', displayOrder: 2, probability: 50 },
            { name: 'Proposal Sent', displayOrder: 3, probability: 75 },
            { name: 'Negotiation', displayOrder: 4, probability: 90 },
            { name: 'Closed Won', displayOrder: 5, probability: 100 },
          ],
        },
      },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  return pipeline;
}

function findStage(stages: { id: string; name: string }[], targetName: string) {
  const exact = stages.find(s => s.name.toLowerCase() === targetName.toLowerCase());
  if (exact) return exact;
  return stages.find(s => s.name.toLowerCase().includes(targetName.toLowerCase()));
}

/**
 * Called after a lead is created — creates a Deal in the "New Lead" stage.
 */
export async function syncLeadCreatedToPipeline(
  userId: string,
  lead: { id: string; businessName?: string | null; contactPerson?: string | null; status?: string }
) {
  try {
    const existing = await prisma.deal.findFirst({ where: { leadId: lead.id, userId } });
    if (existing) return existing;

    const pipeline = await getOrCreateDefaultPipeline(userId);
    const stageName = STATUS_TO_STAGE[lead.status || 'NEW'] || 'New Lead';
    const stage = findStage(pipeline.stages, stageName) || pipeline.stages[0];
    if (!stage) return null;

    const title = lead.contactPerson || lead.businessName || 'Untitled Lead';

    const deal = await prisma.deal.create({
      data: {
        userId,
        pipelineId: pipeline.id,
        stageId: stage.id,
        leadId: lead.id,
        title,
        value: 0,
        probability: (stage as any).probability ?? 10,
        priority: 'MEDIUM',
      },
    });

    return deal;
  } catch (error) {
    console.error('[LeadPipelineSync] Failed to create deal for lead:', lead.id, error);
    return null;
  }
}

/**
 * Called after a lead's status changes — moves the linked Deal to the matching stage.
 */
export async function syncLeadStatusToPipeline(
  userId: string,
  leadId: string,
  newStatus: string
) {
  try {
    let deal = await prisma.deal.findFirst({
      where: { leadId, userId },
      include: { stage: true },
    });

    if (!deal) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, userId },
        select: { id: true, businessName: true, contactPerson: true, status: true },
      });
      if (!lead) return null;
      deal = await syncLeadCreatedToPipeline(userId, { ...lead, status: newStatus }) as any;
      if (!deal) return null;
      return deal;
    }

    const pipeline = await prisma.pipeline.findUnique({
      where: { id: deal.pipelineId },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!pipeline) return null;

    const targetStageName = STATUS_TO_STAGE[newStatus];
    if (!targetStageName) return deal;

    const targetStage = findStage(pipeline.stages, targetStageName);
    if (!targetStage || targetStage.id === deal.stageId) return deal;

    const updatedDeal = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stageId: targetStage.id,
        probability: (targetStage as any).probability ?? deal.probability,
        ...(newStatus === 'CONVERTED' ? { actualCloseDate: new Date() } : {}),
        ...(newStatus === 'LOST' ? { lostReason: 'Lead marked as lost' } : {}),
      },
    });

    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        userId,
        type: 'STAGE_CHANGED',
        description: `Auto-moved: Lead status changed to ${newStatus}`,
      },
    });

    return updatedDeal;
  } catch (error) {
    console.error('[LeadPipelineSync] Failed to sync lead status to pipeline:', leadId, error);
    return null;
  }
}
