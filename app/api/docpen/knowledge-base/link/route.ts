/**
 * Docpen Knowledge Base Link API
 * 
 * POST - Link/unlink knowledge base files to agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { VOICE_AGENT_PROMPTS } from '@/lib/docpen/voice-prompts';
import type { DocpenProfessionType } from '@/lib/docpen/prompts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// POST - Link or unlink files
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, fileId, action } = body; // action: 'link' or 'unlink'

    if (!agentId || !fileId || !action) {
      return NextResponse.json(
        { error: 'agentId, fileId, and action required' },
        { status: 400 }
      );
    }

    // Verify agent ownership
    const agent = await prisma.docpenVoiceAgent.findFirst({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify file ownership
    const file = await prisma.docpenKnowledgeBaseFile.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (action === 'link') {
      // Check if already linked
      const existing = await prisma.docpenAgentKnowledgeBaseFile.findUnique({
        where: {
          agentId_fileId: {
            agentId,
            fileId,
          },
        },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'File already linked',
        });
      }

      // Create link
      await prisma.docpenAgentKnowledgeBaseFile.create({
        data: {
          agentId,
          fileId,
        },
      });

      console.log('✅ [Docpen KB] Linked file', fileId, 'to agent', agentId);

      // Update ElevenLabs agent prompt with knowledge base context
      await updateAgentWithKnowledgeBase(session.user.id, agent);

      return NextResponse.json({
        success: true,
        message: 'File linked successfully',
      });
    } else if (action === 'unlink') {
      // Remove link
      await prisma.docpenAgentKnowledgeBaseFile.deleteMany({
        where: {
          agentId,
          fileId,
        },
      });

      console.log('✅ [Docpen KB] Unlinked file', fileId, 'from agent', agentId);

      // Update ElevenLabs agent prompt
      await updateAgentWithKnowledgeBase(session.user.id, agent);

      return NextResponse.json({
        success: true,
        message: 'File unlinked successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ [Docpen KB] Error linking/unlinking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link/unlink file' },
      { status: 500 }
    );
  }
}

// Helper function to update agent with knowledge base
async function updateAgentWithKnowledgeBase(
  userId: string,
  agent: {
    id: string;
    elevenLabsAgentId: string;
    profession: string;
    customProfession: string | null;
  }
) {
  const apiKey = await elevenLabsKeyManager.getActiveApiKey(userId);
  if (!apiKey) return;

  // Get all linked knowledge base files
  const linkedFiles = await prisma.docpenAgentKnowledgeBaseFile.findMany({
    where: { agentId: agent.id },
    include: { knowledgeBaseFile: true },
  });

  // Build knowledge base context
  const kbContext = linkedFiles
    .map(lf => {
      const file = lf.knowledgeBaseFile;
      return `--- ${file.fileName} ---\n${file.extractedText || 'No content'}\n`;
    })
    .join('\n');

  // Get base prompt for profession
  const professionKey = agent.profession === 'CUSTOM' 
    ? 'CUSTOM' 
    : agent.profession as DocpenProfessionType;
  const basePrompt = VOICE_AGENT_PROMPTS[professionKey] || VOICE_AGENT_PROMPTS.GENERAL_PRACTICE;

  // Build enhanced prompt with knowledge base
  let enhancedPrompt = basePrompt;
  if (kbContext.length > 0) {
    enhancedPrompt += `

## SPECIALTY KNOWLEDGE BASE

You have access to the following specialty-specific knowledge documents. Use this information to provide accurate, evidence-based responses:

${kbContext}

When answering questions, reference this knowledge base when applicable and cite the source document.
`;
  }

  // Update ElevenLabs agent
  try {
    await fetch(
      `${ELEVENLABS_BASE_URL}/convai/agents/${agent.elevenLabsAgentId}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: enhancedPrompt,
              },
            },
          },
        }),
      }
    );

    // Update local database
    await prisma.docpenVoiceAgent.update({
      where: { id: agent.id },
      data: {
        systemPrompt: enhancedPrompt,
      },
    });

    console.log('✅ [Docpen KB] Updated agent prompt with knowledge base');
  } catch (e) {
    console.error('⚠️ Error updating ElevenLabs agent:', e);
  }
}
