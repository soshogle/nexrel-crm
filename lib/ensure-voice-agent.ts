/**
 * Ensure user has at least one Voice AI Agent (for AI employees, workflows, campaigns)
 * Auto-creates a default agent if none exist.
 */

import { prisma } from '@/lib/db';
import { getTemplateById } from '@/lib/voice-agent-templates';
import { LANGUAGE_PROMPT_SECTION } from '@/lib/voice-languages';
import type { Industry } from '@/lib/industry-menu-config';

export interface EnsureVoiceAgentResult {
  agentId: string;
  created: boolean;
  agent?: any;
}

/**
 * Ensure the user has at least one VoiceAgent. Create a default one if none exist.
 * Uses industry-geared template for the prompt.
 */
export async function ensureUserHasVoiceAgent(
  userId: string,
  options?: {
    templateId?: string; // e.g. 'general_assistant', 'sales_assistant'
    preferredName?: string;
  }
): Promise<EnsureVoiceAgentResult> {
  const existing = await prisma.voiceAgent.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    return { agentId: existing.id, created: false, agent: existing };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      industry: true,
      businessDescription: true,
      language: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const industry = (user.industry as Industry) || null;
  const templateId = options?.templateId || 'general_assistant';
  const template = getTemplateById(templateId, industry);
  const agentName = options?.preferredName || template?.name || 'General Assistant';
  const businessName = user.name || 'Your Business';

  // Create VoiceAgent record - ElevenLabs provisioning happens via existing flow
  const agent = await prisma.voiceAgent.create({
    data: {
      userId,
      name: agentName,
      description: template?.description || 'Default voice assistant for calls and AI employees.',
      type: 'INBOUND',
      status: 'TESTING',
      businessName,
      businessIndustry: user.industry || undefined,
      greetingMessage: `Hello! This is ${agentName} from ${businessName}. How can I help you today?`,
      systemPrompt: template
        ? `${LANGUAGE_PROMPT_SECTION}\n\nYou are ${agentName}. ${template.promptSnippet}`
        : `${LANGUAGE_PROMPT_SECTION}\n\nYou are a professional voice assistant for ${businessName}. Answer calls politely and help callers with their inquiries.`,
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      language: 'en', // API only accepts single codes. Multilingual via prompt.
    },
  });

  return { agentId: agent.id, created: true, agent };
}
