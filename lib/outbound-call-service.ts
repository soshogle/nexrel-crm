/**
 * Shared outbound call service for AI chat and voice agents
 * Handles single and bulk outbound calls with smart agent selection
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService } from '@/lib/dal';

export interface MakeOutboundCallParams {
  userId: string;
  contactName: string;
  phoneNumber?: string;
  purpose: string;
  notes?: string;
  voiceAgentId?: string;
  voiceAgentName?: string;
  leadId?: string;
  immediate?: boolean;
  scheduledFor?: string;
}

export interface BulkCallParams {
  userId: string;
  leadIds?: string[];
  criteria?: {
    period?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days';
    status?: string;
    limit?: number;
  };
  purpose: string;
  notes?: string;
  voiceAgentId?: string;
  voiceAgentName?: string;
  immediate?: boolean;
}

export interface CallResult {
  success: boolean;
  message?: string;
  error?: string;
  callId?: string;
  outboundCall?: any;
  leadId?: string;
}

/**
 * Select best voice agent for task based on purpose/notes
 * Matches keywords in agent name/description to task type
 */
export async function selectBestAgentForTask(
  userId: string,
  purpose: string,
  notes?: string,
  preferAgentId?: string,
  preferAgentName?: string
): Promise<string | null> {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  // Explicit preference wins
  if (preferAgentId) {
    const agent = await db.voiceAgent.findFirst({
      where: { id: preferAgentId, userId },
    });
    return agent?.id ?? null;
  }
  if (preferAgentName) {
    const agent = await db.voiceAgent.findFirst({
      where: {
        userId,
        name: { contains: preferAgentName, mode: 'insensitive' },
        status: 'ACTIVE',
        elevenLabsAgentId: { not: null },
      },
    });
    return agent?.id ?? null;
  }

  const text = `${purpose} ${notes || ''}`.toLowerCase();
  const agents = await db.voiceAgent.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      elevenLabsAgentId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (agents.length === 0) return null;
  if (agents.length === 1) return agents[0].id;

  // Score agents by keyword match (sales, support, promo, follow-up, etc.)
  const scores = agents.map((agent) => {
    const desc = `${agent.name} ${agent.description || ''}`.toLowerCase();
    let score = 0;
    if (text.includes('promo') && (desc.includes('promo') || desc.includes('sales'))) score += 2;
    if (text.includes('support') && desc.includes('support')) score += 2;
    if (text.includes('sale') && (desc.includes('sales') || desc.includes('sales'))) score += 2;
    if (text.includes('follow') && desc.includes('follow')) score += 2;
    if (text.includes('lead') && (desc.includes('lead') || desc.includes('outreach'))) score += 2;
    if (text.includes('discount') && (desc.includes('promo') || desc.includes('sales'))) score += 2;
    return { agent, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].agent.id : agents[0].id;
}

/**
 * Make a single outbound call
 */
export async function makeOutboundCall(params: MakeOutboundCallParams): Promise<CallResult> {
  const {
    userId,
    contactName,
    phoneNumber,
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName,
    leadId,
    immediate = true,
    scheduledFor,
  } = params;

  let finalPhoneNumber = phoneNumber;
  let finalLeadId = leadId;

  if (!finalPhoneNumber) {
    const ctx = createDalContext(userId);
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { contactPerson: { contains: contactName, mode: 'insensitive' } },
          { businessName: { contains: contactName, mode: 'insensitive' } },
          ...(leadId ? [{ id: leadId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const lead = leads[0];

    if (lead) {
      finalPhoneNumber = lead.phone || null;
      finalLeadId = lead.id;
    } else {
      return {
        success: false,
        error: `Contact "${contactName}" not found. Please provide a phone number or ensure the contact exists.`,
      };
    }
  }

  if (!finalPhoneNumber) {
    return {
      success: false,
      error: `No phone number found for "${contactName}". Please provide a phone number.`,
    };
  }

  const agentId = await selectBestAgentForTask(
    userId,
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName
  );

  const outboundCtx = createDalContext(userId);
  const outboundDb = getCrmDb(outboundCtx);
  if (!agentId) {
    const defaultAgent = await outboundDb.voiceAgent.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        elevenLabsAgentId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!defaultAgent) {
      return {
        success: false,
        error: 'No active voice agent found. Please create and configure a voice agent first.',
      };
    }
  }

  const resolvedAgentId = agentId || (await outboundDb.voiceAgent.findFirst({
    where: { userId, status: 'ACTIVE', elevenLabsAgentId: { not: null } },
    orderBy: { createdAt: 'desc' },
  }))?.id;

  if (!resolvedAgentId) {
    return {
      success: false,
      error: 'No active voice agent found. Please create and configure a voice agent first.',
    };
  }

  const voiceAgent = await outboundDb.voiceAgent.findUnique({
    where: { id: resolvedAgentId },
  });

  if (!voiceAgent?.elevenLabsAgentId) {
    return {
      success: false,
      error: 'Voice agent is not configured properly. Please complete the voice AI setup.',
    };
  }

  try {
    const { elevenLabsProvisioning } = await import('@/lib/elevenlabs-provisioning');
    const validation = await elevenLabsProvisioning.validateAgentSetup(
      voiceAgent.elevenLabsAgentId,
      userId
    );
    if (!validation.valid) {
      return {
        success: false,
        error: `Voice agent not found in ElevenLabs: ${validation.error}. Please reconfigure the agent.`,
      };
    }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Agent validation failed' };
  }

  const outboundCall = await outboundDb.outboundCall.create({
    data: {
      userId,
      voiceAgentId: resolvedAgentId,
      leadId: finalLeadId,
      name: contactName,
      phoneNumber: finalPhoneNumber,
      status: immediate ? 'IN_PROGRESS' : 'SCHEDULED',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      purpose: purpose,
      notes: notes || null,
    },
    include: { voiceAgent: true },
  });

  if (immediate) {
    try {
      const { elevenLabsService } = await import('@/lib/elevenlabs');
      const callResult = await elevenLabsService.initiatePhoneCall(
        voiceAgent.elevenLabsAgentId,
        finalPhoneNumber
      );

      const callLog = await outboundDb.callLog.create({
        data: {
          userId,
          voiceAgentId: resolvedAgentId,
          leadId: finalLeadId,
          direction: 'OUTBOUND',
          status: 'INITIATED',
          fromNumber: voiceAgent.twilioPhoneNumber || 'System',
          toNumber: finalPhoneNumber,
          elevenLabsConversationId:
            callResult.conversation_id ||
            callResult.call_id ||
            (callResult as any).id ||
            undefined,
        },
      });

      await outboundDb.outboundCall.update({
        where: { id: outboundCall.id },
        data: {
          status: 'IN_PROGRESS',
          callLogId: callLog.id,
          attemptCount: 1,
          lastAttemptAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Calling ${contactName} now about ${purpose}`,
        callId: callLog.id,
        outboundCall,
        leadId: finalLeadId ?? undefined,
      };
    } catch (callError: any) {
      await outboundDb.outboundCall.update({
        where: { id: outboundCall.id },
        data: { status: 'FAILED' },
      });
      return {
        success: false,
        error: `Call record created but failed to initiate: ${callError.message}`,
        outboundCall,
      };
    }
  }

  return {
    success: true,
    message: `Call to ${contactName} scheduled for ${scheduledFor}`,
    outboundCall,
    leadId: finalLeadId ?? undefined,
  };
}

/**
 * Make bulk outbound calls to leads matching criteria
 */
export async function makeBulkOutboundCalls(params: BulkCallParams): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  scheduled: number;
  failed: number;
  results: CallResult[];
}> {
  const {
    userId,
    leadIds,
    criteria,
    purpose,
    notes,
    voiceAgentId,
    voiceAgentName,
    immediate = true,
  } = params;

  let leads: { id: string; contactPerson: string; businessName: string; phone: string | null }[] = [];

  const bulkCtx = createDalContext(userId);
  const bulkDb = getCrmDb(bulkCtx);
  if (leadIds?.length) {
    leads = await bulkDb.lead.findMany({
      where: { id: { in: leadIds }, userId },
      select: { id: true, contactPerson: true, businessName: true, phone: true },
    });
  } else if (criteria) {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (criteria.period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (criteria.period === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (criteria.period === 'last_7_days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (criteria.period === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const where: any = {
      userId,
      ...(criteria.status ? { status: criteria.status } : {}),
      phone: { not: null },
    };
    if (startDate && endDate) {
      where.createdAt = { gte: startDate, lt: endDate };
    } else if (startDate) {
      where.createdAt = { gte: startDate };
    }

    leads = await bulkDb.lead.findMany({
      where,
      take: criteria?.limit || 50,
      orderBy: { createdAt: 'desc' },
      select: { id: true, contactPerson: true, businessName: true, phone: true },
    });
  }

  const withPhone = leads.filter((l) => l.phone);
  if (withPhone.length === 0) {
    return {
      success: false,
      error: 'No leads with phone numbers found',
      scheduled: 0,
      failed: 0,
      results: [],
    };
  }

  const results: CallResult[] = [];
  let scheduled = 0;
  let failed = 0;

  for (const lead of withPhone) {
    const result = await makeOutboundCall({
      userId,
      contactName: lead.contactPerson || lead.businessName || 'Contact',
      phoneNumber: lead.phone!,
      purpose,
      notes,
      voiceAgentId,
      voiceAgentName,
      leadId: lead.id,
      immediate,
    });
    results.push(result);
    if (result.success) scheduled++;
    else failed++;
    // Small delay between calls to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  return {
    success: scheduled > 0,
    message: `Initiated ${scheduled} call${scheduled !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
    scheduled,
    failed,
    results,
  };
}
