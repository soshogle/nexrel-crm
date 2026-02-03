/**
 * Docpen Voice Agents API
 * 
 * GET - List all Docpen voice agents for the user
 * PATCH - Update agent settings
 * DELETE - Delete an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// ElevenLabs supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pl', name: 'Polish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'id', name: 'Indonesian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'fi', name: 'Finnish' },
  { code: 'ro', name: 'Romanian' },
  { code: 'da', name: 'Danish' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ms', name: 'Malay' },
  { code: 'sk', name: 'Slovak' },
  { code: 'hr', name: 'Croatian' },
  { code: 'ta', name: 'Tamil' },
];

// GET - List all Docpen voice agents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await prisma.docpenVoiceAgent.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            conversations: true,
            knowledgeBaseFiles: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Automatically update all agents in the background (non-blocking)
    // This ensures agents created before API migrations get updated automatically
    agents.forEach(agent => {
      if (agent.isActive) {
        docpenAgentProvisioning.updateAgentFunctions(agent.elevenLabsAgentId, session.user.id)
          .then(success => {
            if (success) {
              console.log(`✅ [Docpen] Auto-updated agent ${agent.elevenLabsAgentId} functions`);
            }
          })
          .catch(err => {
            console.warn(`⚠️ [Docpen] Failed to auto-update agent functions (non-critical):`, err.message);
          });
      }
    });

    // Map agents with additional info
    const agentsWithDetails = agents.map(agent => ({
      id: agent.id,
      profession: agent.profession,
      customProfession: agent.customProfession,
      elevenLabsAgentId: agent.elevenLabsAgentId,
      voiceId: agent.voiceId,
      voiceName: agent.voiceName,
      language: agent.language,
      languageName: agent.languageName,
      voiceGender: agent.voiceGender,
      stability: agent.stability,
      similarityBoost: agent.similarityBoost,
      isActive: agent.isActive,
      lastUsedAt: agent.lastUsedAt,
      conversationCount: agent.conversationCount,
      totalDurationSec: agent.totalDurationSec,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      _count: agent._count,
    }));

    return NextResponse.json({
      success: true,
      agents: agentsWithDetails,
      languages: SUPPORTED_LANGUAGES,
    });
  } catch (error: any) {
    console.error('❌ [Docpen Agents] Error fetching agents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// PATCH - Update agent settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, language, voiceId, voiceName, voiceGender, stability, similarityBoost, isActive } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    // Verify ownership
    const agent = await prisma.docpenVoiceAgent.findFirst({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};

    if (language !== undefined) {
      updateData.language = language;
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === language);
      updateData.languageName = lang?.name || language;
    }
    if (voiceId !== undefined) updateData.voiceId = voiceId;
    if (voiceName !== undefined) updateData.voiceName = voiceName;
    if (voiceGender !== undefined) updateData.voiceGender = voiceGender;
    if (stability !== undefined) updateData.stability = stability;
    if (similarityBoost !== undefined) updateData.similarityBoost = similarityBoost;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update ElevenLabs agent if voice/language settings changed
    if (language || voiceId || stability || similarityBoost) {
      const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
      if (apiKey) {
        const elevenlabsUpdate: any = {
          conversation_config: {},
        };

        if (language) {
          elevenlabsUpdate.conversation_config.agent = {
            language: language,
          };
        }

        if (voiceId || stability || similarityBoost) {
          elevenlabsUpdate.conversation_config.tts = {
            ...(voiceId && { voice_id: voiceId }),
            ...(stability && { stability }),
            ...(similarityBoost && { similarity_boost: similarityBoost }),
          };
        }

        try {
          const response = await fetch(
            `${ELEVENLABS_BASE_URL}/convai/agents/${agent.elevenLabsAgentId}`,
            {
              method: 'PATCH',
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(elevenlabsUpdate),
            }
          );

          if (!response.ok) {
            console.warn('⚠️ Failed to update ElevenLabs agent:', await response.text());
          } else {
            console.log('✅ ElevenLabs agent updated');
          }
        } catch (e) {
          console.error('⚠️ Error updating ElevenLabs:', e);
        }
      }
    }

    // Update local database
    const updatedAgent = await prisma.docpenVoiceAgent.update({
      where: { id: agentId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    });
  } catch (error: any) {
    console.error('❌ [Docpen Agents] Error updating agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an agent
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    // Verify ownership
    const agent = await prisma.docpenVoiceAgent.findFirst({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete from ElevenLabs
    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    if (apiKey && agent.elevenLabsAgentId) {
      try {
        await fetch(
          `${ELEVENLABS_BASE_URL}/convai/agents/${agent.elevenLabsAgentId}`,
          {
            method: 'DELETE',
            headers: { 'xi-api-key': apiKey },
          }
        );
        console.log('✅ Deleted from ElevenLabs');
      } catch (e) {
        console.error('⚠️ Error deleting from ElevenLabs:', e);
      }
    }

    // Delete from database
    await prisma.docpenVoiceAgent.delete({
      where: { id: agentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ [Docpen Agents] Error deleting agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
