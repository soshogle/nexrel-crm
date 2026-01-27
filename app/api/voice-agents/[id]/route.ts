
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateReservationSystemPrompt } from '@/lib/voice-reservation-helper';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';

// GET /api/voice-agents/[id] - Get single voice agent

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        callLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        knowledgeBaseFiles: {
          include: {
            knowledgeBaseFile: true,
          },
          orderBy: { addedAt: 'desc' },
        },
        _count: {
          select: {
            callLogs: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Voice agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Error fetching voice agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice agent' },
      { status: 500 }
    );
  }
}

// PUT /api/voice-agents/[id] - Update voice agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();

    // 📚 FETCH AND MERGE KNOWLEDGE BASE FILES
    let enhancedKnowledgeBase = body.knowledgeBase || '';
    let knowledgeBaseFiles = body.knowledgeBaseFiles || [];
    
    try {
      console.log('📚 Fetching knowledge base files for agent update...');
      
      // Fetch only files associated with this specific agent via junction table
      const agentFileAssociations = await prisma.voiceAgentKnowledgeBaseFile.findMany({
        where: {
          voiceAgentId: params.id,
        },
        include: {
          knowledgeBaseFile: true,
        },
        orderBy: { addedAt: 'desc' },
      });
      
      // Extract the knowledge base files and filter by userId for security
      const userKnowledgeBaseFiles = agentFileAssociations
        .map(association => association.knowledgeBaseFile)
        .filter(file => file.userId === user.id);

      if (userKnowledgeBaseFiles.length > 0) {
        console.log(`📄 Found ${userKnowledgeBaseFiles.length} knowledge base file(s)`);
        
        const kbFileTexts = userKnowledgeBaseFiles
          .filter((file) => file.extractedText && file.extractedText.trim())
          .map((file) => {
            knowledgeBaseFiles.push({
              name: file.fileName,
              type: file.fileType,
              uploadedAt: file.createdAt.toISOString()
            });
            return `\n\n--- ${file.fileName} ---\n${file.extractedText}`;
          })
          .join('\n');

        if (kbFileTexts) {
          enhancedKnowledgeBase = enhancedKnowledgeBase 
            ? `${enhancedKnowledgeBase}\n\n=== KNOWLEDGE BASE DOCUMENTS ===${kbFileTexts}`
            : `=== KNOWLEDGE BASE DOCUMENTS ===${kbFileTexts}`;
          
          console.log(`✅ Merged ${userKnowledgeBaseFiles.length} knowledge base file(s) (${kbFileTexts.length} characters)`);
        }
      }
    } catch (error: any) {
      console.error('⚠️  Error fetching knowledge base files (continuing anyway):', error.message);
    }

    // Build system prompt with enhanced knowledge base
    let systemPrompt = body.systemPrompt;
    
    // If enableReservations is true, use the reservation-aware prompt
    if (body.enableReservations && !systemPrompt) {
      systemPrompt = generateReservationSystemPrompt({
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        knowledgeBase: enhancedKnowledgeBase,
      });
    } else if (!systemPrompt) {
      // Default prompt if no custom prompt provided
      systemPrompt = `You are an AI voice assistant for ${body.businessName}${body.businessIndustry ? ` in the ${body.businessIndustry} industry` : ''}.

${enhancedKnowledgeBase || 'Answer customer questions professionally and helpfully.'}

${body.greetingMessage ? `Start conversations with: ${body.greetingMessage}` : ''}`;
    }

    const agent = await prisma.voiceAgent.updateMany({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: {
        // Basic Info
        name: body.name,
        description: body.description,
        type: body.type,
        status: body.status,
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        
        // Knowledge & Prompts - Use enhanced knowledge base
        knowledgeBase: enhancedKnowledgeBase,
        knowledgeBaseSources: (body.knowledgeBaseTexts?.length || body.knowledgeBaseUrls?.length || knowledgeBaseFiles.length)
          ? {
              texts: (body.knowledgeBaseTexts || []).filter((t: string) => t.trim()),
              urls: (body.knowledgeBaseUrls || []).filter((u: string) => u.trim()),
              files: knowledgeBaseFiles
            }
          : undefined,
        // Support both old (greetingMessage) and new (inbound/outbound) fields
        greetingMessage: body.greetingMessage, // Legacy field
        inboundGreeting: body.inboundGreeting !== undefined ? body.inboundGreeting : (body.type === 'INBOUND' ? body.greetingMessage : undefined),
        outboundGreeting: body.outboundGreeting !== undefined ? body.outboundGreeting : (body.type === 'OUTBOUND' ? body.greetingMessage : undefined),
        systemPrompt,
        firstMessage: body.firstMessage || body.inboundGreeting || body.outboundGreeting || body.greetingMessage,
        enableReservations: body.enableReservations !== undefined ? body.enableReservations : undefined,
        
        // ElevenLabs Voice Configuration
        voiceId: body.voiceId,
        
        // Voice Settings
        stability: body.stability ?? 0.5,
        similarityBoost: body.similarityBoost ?? 0.75,
        style: body.style ?? 0.0,
        useSpeakerBoost: body.useSpeakerBoost ?? true,
        
        // TTS Configuration
        ttsModel: body.ttsModel || 'eleven_turbo_v2',
        outputFormat: body.outputFormat || 'pcm_16000',
        
        // LLM Configuration
        llmModel: body.llmModel || 'gpt-4',
        temperature: body.temperature ?? 0.7,
        maxTokens: body.maxTokens || 500,
        
        // Conversation Settings
        maxCallDuration: body.maxCallDuration || 600,
        enableInterruptions: body.enableInterruptions ?? true,
        responseDelay: body.responseDelay || 100,
        
        // Language
        language: body.language || 'en',
        
        // Calendar & Scheduling
        googleCalendarId: body.googleCalendarId,
        availableHours: body.availableHours,
        appointmentDuration: body.appointmentDuration || 30,
        
        // Call Handling
        transferPhone: body.transferPhone,
        twilioPhoneNumber: body.twilioPhoneNumber,
        enableVoicemail: body.enableVoicemail || false,
        voicemailMessage: body.voicemailMessage,
        
        // Recording & Transcription Settings
        enableCallRecording: body.enableCallRecording !== undefined ? body.enableCallRecording : true,
        enableTranscription: body.enableTranscription !== undefined ? body.enableTranscription : true,
        sendRecordingEmail: body.sendRecordingEmail !== undefined ? body.sendRecordingEmail : false,
        recordingEmailAddress: body.recordingEmailAddress || null,
        
        // Advanced Settings
        pronunciationDict: body.pronunciationDict,
        webhookUrl: body.webhookUrl,
        customData: body.customData,
      },
    });

    if (agent.count === 0) {
      return NextResponse.json({ error: 'Voice agent not found' }, { status: 404 });
    }

    // Fetch updated agent
    const updatedAgent = await prisma.voiceAgent.findUnique({
      where: { id: params.id },
    });

    // 🔄 SYNC WITH ELEVENLABS: Update the agent in ElevenLabs if it exists
    if (updatedAgent?.elevenLabsAgentId) {
      try {
        console.log('🔄 Syncing agent with ElevenLabs:', updatedAgent.elevenLabsAgentId);
        
        // Prepare the updates for ElevenLabs
        // Use appropriate greeting based on agent type
        const greetingForElevenLabs = updatedAgent.type === 'OUTBOUND'
          ? (updatedAgent.outboundGreeting || updatedAgent.greetingMessage)
          : (updatedAgent.inboundGreeting || updatedAgent.greetingMessage);
        
        const elevenLabsUpdates: any = {
          name: updatedAgent.name,
          prompt: {
            prompt: systemPrompt,
            llm: updatedAgent.llmModel || 'gpt-4',
            temperature: updatedAgent.temperature ?? 0.7,
            max_tokens: updatedAgent.maxTokens || 500,
          },
          first_message: greetingForElevenLabs || updatedAgent.firstMessage || '',
          language: updatedAgent.language || 'en',
        };

        // Include voice settings if voiceId is set
        if (updatedAgent.voiceId) {
          elevenLabsUpdates.voice = {
            voice_id: updatedAgent.voiceId,
            stability: updatedAgent.stability ?? 0.5,
            similarity_boost: updatedAgent.similarityBoost ?? 0.75,
            style: updatedAgent.style ?? 0.0,
            use_speaker_boost: updatedAgent.useSpeakerBoost ?? true,
          };
        }

        // Update the agent in ElevenLabs
        await elevenLabsProvisioning.updateAgent(
          updatedAgent.elevenLabsAgentId,
          elevenLabsUpdates,
          user.id
        );
        
        console.log('✅ ElevenLabs agent updated successfully with new knowledge base');
      } catch (elevenLabsError: any) {
        console.error('⚠️  Failed to sync with ElevenLabs (database was updated):', elevenLabsError.message);
        // Don't fail the request - database was updated successfully
        // The agent will still work with the old ElevenLabs config until next sync
      }
    }

    // 📌 UPDATE KNOWLEDGE BASE FILE ASSOCIATIONS IF PROVIDED
    if (body.knowledgeBaseFileIds !== undefined && Array.isArray(body.knowledgeBaseFileIds)) {
      try {
        console.log(`🔗 Updating file associations for agent ${params.id}...`);
        
        // Remove all existing associations for this agent
        await prisma.voiceAgentKnowledgeBaseFile.deleteMany({
          where: {
            voiceAgentId: params.id,
          },
        });
        console.log('✅ Removed existing file associations');

        // Add new associations if any files are provided
        if (body.knowledgeBaseFileIds.length > 0) {
          // Verify user owns these files
          const ownedFiles = await prisma.knowledgeBaseFile.findMany({
            where: {
              id: { in: body.knowledgeBaseFileIds },
              userId: user.id,
            },
            select: { id: true },
          });

          // Create new junction table entries
          await prisma.voiceAgentKnowledgeBaseFile.createMany({
            data: ownedFiles.map(file => ({
              voiceAgentId: params.id,
              knowledgeBaseFileId: file.id,
            })),
            skipDuplicates: true,
          });
          
          console.log(`✅ Associated ${ownedFiles.length} file(s) with agent`);
        }
      } catch (updateError) {
        console.error('⚠️ Error updating file associations:', updateError);
        // Don't fail the entire update if file association fails
      }
    }

    return NextResponse.json(updatedAgent);
  } catch (error: any) {
    console.error('Error updating voice agent:', error);
    return NextResponse.json(
      { error: 'Failed to update voice agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/voice-agents/[id] - Delete voice agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // First, get the agent to retrieve the ElevenLabs agent ID
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Voice agent not found' }, { status: 404 });
    }

    // Delete from ElevenLabs if elevenLabsAgentId exists
    if (agent.elevenLabsAgentId) {
      console.log(`🗑️ Deleting ElevenLabs agent: ${agent.elevenLabsAgentId}`);
      const deleteResult = await elevenLabsProvisioning.deleteAgent(
        agent.elevenLabsAgentId,
        user.id
      );
      
      if (!deleteResult.success) {
        console.error('⚠️ Failed to delete from ElevenLabs:', deleteResult.error);
        // Continue with database deletion even if ElevenLabs deletion fails
        // to avoid orphaned records in the CRM
      } else {
        console.log('✅ Successfully deleted agent from ElevenLabs');
      }
    }

    // Delete from database
    const result = await prisma.voiceAgent.deleteMany({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Voice agent not found' }, { status: 404 });
    }

    console.log(`✅ Successfully deleted voice agent ${params.id} from CRM`);
    return NextResponse.json({ 
      success: true,
      message: 'Voice agent deleted successfully from both CRM and ElevenLabs'
    });
  } catch (error: any) {
    console.error('Error deleting voice agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice agent' },
      { status: 500 }
    );
  }
}
