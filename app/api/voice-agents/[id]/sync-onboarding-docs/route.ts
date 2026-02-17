import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateReservationSystemPrompt } from '@/lib/voice-reservation-helper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/voice-agents/[id]/sync-onboarding-docs
 * Sync onboarding documents to an existing voice agent's knowledge base
 * and update the ElevenLabs agent with the new prompt
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Await params in Next.js 15+
    const params = await context.params;

    // Fetch the voice agent
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: params.id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Voice agent not found' }, { status: 404 });
    }

    // Verify ownership
    if (agent.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('📚 Syncing onboarding documents to agent:', agent.name);

    // Fetch onboarding documents
    const userWithProgress = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingProgress: true },
    });

    if (!userWithProgress?.onboardingProgress) {
      return NextResponse.json(
        { error: 'No onboarding progress found' },
        { status: 404 }
      );
    }

    let progress: any = {};
    try {
      progress = JSON.parse(userWithProgress.onboardingProgress as string);
    } catch (e) {
      return NextResponse.json(
        { error: 'Could not parse onboarding progress' },
        { status: 500 }
      );
    }

    if (!progress.uploadedDocuments || progress.uploadedDocuments.length === 0) {
      return NextResponse.json(
        { error: 'No onboarding documents found to sync' },
        { status: 404 }
      );
    }

    console.log(`📄 Found ${progress.uploadedDocuments.length} onboarding document(s)`);

    // Build enhanced knowledge base
    let enhancedKnowledgeBase = agent.knowledgeBase || '';
    let knowledgeBaseFiles: any[] = [];

    // Get existing knowledge base sources
    let knowledgeBaseSources: any = { texts: [], urls: [], files: [] };
    if (agent.knowledgeBaseSources && typeof agent.knowledgeBaseSources === 'object') {
      knowledgeBaseSources = agent.knowledgeBaseSources;
    }

    // Add each document's extracted text to the knowledge base
    const documentTexts = progress.uploadedDocuments
      .filter((doc: any) => doc.extractedText)
      .map((doc: any, idx: number) => {
        knowledgeBaseFiles.push({
          name: doc.fileName,
          type: doc.fileType,
          uploadedAt: doc.uploadedAt,
        });
        return `\n\n--- Document ${idx + 1}: ${doc.fileName} ---\n${doc.extractedText}`;
      })
      .join('\n');

    if (documentTexts) {
      // Remove any existing onboarding document section first
      enhancedKnowledgeBase = enhancedKnowledgeBase.replace(
        /=== KNOWLEDGE BASE FROM UPLOADED DOCUMENTS ===[\s\S]*/,
        ''
      );

      // Add the new onboarding documents
      enhancedKnowledgeBase = enhancedKnowledgeBase
        ? `${enhancedKnowledgeBase.trim()}\n\n=== KNOWLEDGE BASE FROM UPLOADED DOCUMENTS ===${documentTexts}`
        : `=== KNOWLEDGE BASE FROM UPLOADED DOCUMENTS ===${documentTexts}`;

      console.log(
        `✅ Imported ${progress.uploadedDocuments.length} document(s) (${documentTexts.length} characters)`
      );

      // Rebuild system prompt with enhanced knowledge base
      let finalSystemPrompt: string;

      if (agent.enableReservations) {
        finalSystemPrompt = generateReservationSystemPrompt({
          businessName: agent.businessName,
          businessIndustry: agent.businessIndustry || undefined,
          knowledgeBase: enhancedKnowledgeBase,
        });
      } else {
        // Rebuild the default prompt with enhanced knowledge base
        finalSystemPrompt = `You are an AI voice assistant for ${agent.businessName}${
          agent.businessIndustry ? ` in the ${agent.businessIndustry} industry` : ''
        }.

${enhancedKnowledgeBase || 'Answer customer questions professionally and helpfully.'}

${
          agent.greetingMessage
            ? `Start conversations with: ${agent.greetingMessage}`
            : ''
        }`;
      }

      // Update the agent in database
      const updatedAgent = await prisma.voiceAgent.update({
        where: { id: agent.id },
        data: {
          knowledgeBase: enhancedKnowledgeBase,
          systemPrompt: finalSystemPrompt,
          knowledgeBaseSources: {
            texts: knowledgeBaseSources.texts || [],
            urls: knowledgeBaseSources.urls || [],
            files: [...(knowledgeBaseSources.files || []), ...knowledgeBaseFiles],
          },
        },
      });

      console.log('✅ Database updated with enhanced knowledge base');

      // Update ElevenLabs agent if it exists
      if (agent.elevenLabsAgentId) {
        console.log('🔄 Updating ElevenLabs agent:', agent.elevenLabsAgentId);

        try {
          const apiKey = process.env.ELEVENLABS_API_KEY;

          if (!apiKey) {
            console.warn('⚠️  ElevenLabs API key not configured');
            return NextResponse.json(
              {
                success: true,
                agent: updatedAgent,
                warning:
                  'Knowledge base updated in database but could not sync to ElevenLabs (API key not configured)',
              },
              { status: 200 }
            );
          }

          // First, get the current agent config to preserve other settings
          const getResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`,
            {
              headers: {
                'xi-api-key': apiKey,
              },
            }
          );

          if (!getResponse.ok) {
            const error = await getResponse.text();
            console.error('❌ Failed to fetch ElevenLabs agent:', error);
            return NextResponse.json(
              {
                success: true,
                agent: updatedAgent,
                warning:
                  'Knowledge base updated in database but failed to fetch ElevenLabs agent: ' +
                  error,
              },
              { status: 200 }
            );
          }

          const currentConfig = await getResponse.json();
          console.log('📋 Current ElevenLabs config retrieved');

          // Update the ElevenLabs agent prompt while preserving other settings
          const { getConfidentialityGuard } = await import('@/lib/ai-confidentiality-guard');
          const promptWithGuard = finalSystemPrompt + getConfidentialityGuard();
          const updatePayload = {
            conversation_config: {
              ...currentConfig.conversation_config,
              agent: {
                ...currentConfig.conversation_config?.agent,
                prompt: {
                  prompt: promptWithGuard,
                },
                first_message: agent.greetingMessage || agent.firstMessage || currentConfig.conversation_config?.agent?.first_message,
                language: agent.language || currentConfig.conversation_config?.agent?.language,
              },
            },
          };

          console.log('📤 Sending update to ElevenLabs...');

          const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`,
            {
              method: 'PATCH',
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatePayload),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error('❌ Failed to update ElevenLabs agent:', error);
            return NextResponse.json(
              {
                success: true,
                agent: updatedAgent,
                warning:
                  'Knowledge base updated in database but failed to sync to ElevenLabs. Error: ' +
                  error,
              },
              { status: 200 }
            );
          }

          const updatedElevenLabsAgent = await response.json();
          console.log('✅ ElevenLabs agent updated successfully');
          console.log('✅ Updated prompt length:', finalSystemPrompt.length, 'characters');

          return NextResponse.json({
            success: true,
            agent: updatedAgent,
            elevenLabsAgent: updatedElevenLabsAgent,
            message: 'Onboarding documents synced successfully to both database and ElevenLabs',
            details: {
              documentsCount: progress.uploadedDocuments.length,
              promptLength: finalSystemPrompt.length,
            },
          });
        } catch (error: any) {
          console.error('❌ Error updating ElevenLabs agent:', error);
          return NextResponse.json(
            {
              success: true,
              agent: updatedAgent,
              warning:
                'Knowledge base updated in database but failed to sync to ElevenLabs: ' +
                error.message,
            },
            { status: 200 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        agent: updatedAgent,
        message: 'Onboarding documents synced successfully',
      });
    }

    return NextResponse.json(
      { error: 'No valid document texts found to import' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('❌ Error syncing onboarding documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync onboarding documents',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
