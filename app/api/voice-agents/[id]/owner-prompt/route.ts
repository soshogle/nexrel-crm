export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import { apiErrors } from '@/lib/api-error';
import { ensureMultilingualPrompt } from '@/lib/voice-languages';
import { EASTERN_TIME_SYSTEM_INSTRUCTION } from '@/lib/voice-time-context';
import { getConfidentialityGuard } from '@/lib/ai-confidentiality-guard';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const OWNER_CUSTOMIZATION_DELIMITER = '\n\n--- OWNER CUSTOMIZATION ---\n';

/**
 * Format admin's prompt edits into proper voice agent prompt format.
 * Preserves the base prompt; only the owner customization section is updated.
 * Supports both additions and removals - the AI outputs the new owner section.
 */
async function formatPromptAddition(
  rawAddition: string,
  businessName: string,
  businessIndustry?: string | null,
  previousOwnerSection?: string | null
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI not configured');
  }

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert at writing system prompts for voice AI agents (phone assistants).
The business owner is editing their voice agent's CUSTOMIZATION section. The base prompt is NEVER modified - you only output the new customization section.

Rules:
- Output ONLY the formatted customization text, no meta-commentary or quotes
- If they want to ADD: include the new instructions
- If they want to REMOVE: exclude those instructions from your output (they may refer to things in the previous customization)
- Use bullet points or numbered lists for multiple instructions
- Keep tone professional and actionable
- Preserve the user's intent exactly
- Use second person ("You should...") or imperative ("Always...") for instructions
- Be concise; voice agents work best with focused prompts`;

  const prevSection = previousOwnerSection?.trim()
    ? `\n\nPrevious customization (they may want to remove parts of this):\n"""\n${previousOwnerSection}\n"""`
    : '';

  const userPrompt = `Business: ${businessName}${businessIndustry ? ` (${businessIndustry})` : ''}

The business owner wants to add or remove instructions from their voice agent's customization:

"""
${rawAddition}
"""
${prevSection}

Output the NEW customization section only. Include what they want to add, exclude what they want to remove. Return only the formatted text.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 800,
  });

  const formatted = completion.choices[0]?.message?.content?.trim();
  if (!formatted) {
    throw new Error('AI did not return formatted prompt');
  }
  return formatted;
}

/**
 * POST /api/voice-agents/[id]/owner-prompt
 * Add or update owner's custom prompt addition. AI formats it and syncs to ElevenLabs.
 * Only for owner's own agents (VoiceAgent), not professional/industry agents.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return apiErrors.unauthorized();
    }

    let user = session.user.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;
    if (!user && session.user.id) {
      user = await prisma.user.findUnique({ where: { id: session.user.id } });
    }
    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const { id } = await context.params;
    const body = await request.json();
    const addition = typeof body?.addition === 'string' ? body.addition.trim() : '';

    const agent = await prisma.voiceAgent.findFirst({
      where: { id, userId: user.id },
    });

    if (!agent) {
      return apiErrors.notFound('Voice agent not found');
    }

    if (!agent.elevenLabsAgentId) {
      return apiErrors.badRequest('Agent has no Soshogle Voice ID; create or provision first');
    }

    const apiKey =
      (await voiceAIPlatform.getMasterApiKey()) ||
      process.env.ELEVENLABS_API_KEY ||
      '';
    if (!apiKey) {
      return apiErrors.internal('Soshogle Voice API key not configured');
    }

    // Fetch current prompt from ElevenLabs
    const getRes = await fetch(
      `${ELEVENLABS_BASE_URL}/convai/agents/${agent.elevenLabsAgentId}`,
      { headers: { 'xi-api-key': apiKey } }
    );

    let basePrompt: string;
    let previousOwnerSection: string | null = null;
    if (getRes.ok) {
      const elevenLabsAgent = await getRes.json();
      const currentPrompt =
        elevenLabsAgent?.conversation_config?.agent?.prompt?.prompt || '';
      const delimIdx = currentPrompt.indexOf(OWNER_CUSTOMIZATION_DELIMITER);
      if (delimIdx >= 0) {
        basePrompt = currentPrompt.slice(0, delimIdx).trim();
        previousOwnerSection = currentPrompt.slice(delimIdx + OWNER_CUSTOMIZATION_DELIMITER.length).trim() || null;
      } else {
        basePrompt = currentPrompt || `You are a helpful voice assistant for ${agent.businessName}. Answer questions professionally and helpfully.`;
      }
    } else {
      basePrompt = `You are a helpful voice assistant for ${agent.businessName}. Answer questions professionally and helpfully.`;
    }

    let fullPrompt: string;
    let formattedAddition: string | null = null;

    if (addition) {
      formattedAddition = await formatPromptAddition(
        addition,
        agent.businessName,
        agent.businessIndustry,
        previousOwnerSection
      );
      fullPrompt = `${basePrompt}${OWNER_CUSTOMIZATION_DELIMITER}${formattedAddition}`;
    } else {
      fullPrompt = basePrompt;
    }

    fullPrompt = ensureMultilingualPrompt(fullPrompt);
    fullPrompt = fullPrompt + EASTERN_TIME_SYSTEM_INSTRUCTION + getConfidentialityGuard();

    const result = await elevenLabsProvisioning.updateAgent(
      agent.elevenLabsAgentId,
      { systemPrompt: fullPrompt },
      user.id
    );

    if (!result.success) {
      return apiErrors.internal(result.error || 'Failed to update Soshogle Voice agent');
    }

    await prisma.voiceAgent.update({
      where: { id },
      data: { ownerPromptAddition: addition || null },
    });

    return NextResponse.json({
      success: true,
      formatted: formattedAddition ?? null,
      synced: true,
    });
  } catch (error: any) {
    console.error('[Owner Prompt] Error:', error);
    return apiErrors.internal(
      error.message || 'Failed to format and save owner prompt'
    );
  }
}
