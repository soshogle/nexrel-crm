import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import { generateReservationSystemPrompt } from '@/lib/voice-reservation-helper';
import { VOICE_AGENT_LIMIT } from '@/lib/voice-agent-templates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/voice-agents - List all voice agents for user
export async function GET(request: NextRequest) {
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

    const agents = await prisma.voiceAgent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            callLogs: true,
            outboundCalls: true,
            campaigns: true,
          },
        },
      },
    });

    // Include Industry AI Employee agents (Dental, Medical, etc.) for preview
    const industryAgents = await prisma.industryAIEmployeeAgent.findMany({
      where: {
        userId: user.id,
        elevenLabsAgentId: { not: null },
        status: 'active',
      },
    });

    const industryAgentsForPreview = industryAgents.map((a) => ({
      id: a.id,
      name: a.name,
      elevenLabsAgentId: a.elevenLabsAgentId,
      _count: { callLogs: a.callCount, outboundCalls: 0, campaigns: 0 },
      elevenLabsCallCount: a.callCount,
      aiEmployeeCount: 0,
      source: 'industry' as const,
    }));

    // Get AI employee counts per agent
    const aiEmployeeCounts = await prisma.userAIEmployee.groupBy({
      by: ['voiceAgentId'],
      where: {
        userId: user.id,
        voiceAgentId: { not: null },
      },
      _count: { voiceAgentId: true },
    });
    const aiCountByAgent = Object.fromEntries(
      aiEmployeeCounts.map((r) => [r.voiceAgentId, r._count.voiceAgentId])
    );

    // Fetch call counts from ElevenLabs for each agent
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    const enrichedAgents = await Promise.all(
      agents.map(async (agent) => {
        let elevenLabsCallCount = 0;
        
        // Only fetch if agent has ElevenLabs agent ID and API key is configured
        if (agent.elevenLabsAgentId && elevenLabsApiKey) {
          try {
            const response = await fetch(
              `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agent.elevenLabsAgentId}&page_size=1`,
              {
                headers: {
                  'xi-api-key': elevenLabsApiKey,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              // ElevenLabs doesn't return total count in the list endpoint,
              // so we'll fetch all conversations to get accurate count
              const fullResponse = await fetch(
                `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agent.elevenLabsAgentId}&page_size=100`,
                {
                  headers: {
                    'xi-api-key': elevenLabsApiKey,
                  },
                }
              );
              
              if (fullResponse.ok) {
                const fullData = await fullResponse.json();
                elevenLabsCallCount = fullData.conversations?.length || 0;
              }
            }
          } catch (error) {
            console.error(`Error fetching ElevenLabs calls for agent ${agent.id}:`, error);
            // Fall back to database count on error
            elevenLabsCallCount = agent._count.callLogs;
          }
        } else {
          // Use database count if no ElevenLabs integration
          elevenLabsCallCount = agent._count.callLogs;
        }

        return {
          ...agent,
          _count: {
            ...agent._count,
            callLogs: Math.max(agent._count.callLogs, elevenLabsCallCount),
          },
          elevenLabsCallCount,
          aiEmployeeCount: aiCountByAgent[agent.id] || 0,
        };
      })
    );

    // Merge industry agents for unified preview dropdown
    const allAgents = [
      ...enrichedAgents,
      ...industryAgentsForPreview.filter(
        (ia) => ia.elevenLabsAgentId
      ),
    ];

    return NextResponse.json(allAgents || []);
  } catch (error: any) {
    console.error('Error fetching voice agents:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    // Return empty array on error to prevent filter crashes
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/voice-agents - Create new voice agent
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting voice agent creation...');
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session found:', session.user.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log('❌ User not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('✅ User found:', user.id);

    // Enforce 12-agent limit (super admins bypass)
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      const existingCount = await prisma.voiceAgent.count({ where: { userId: user.id } });
      if (existingCount >= VOICE_AGENT_LIMIT) {
        return NextResponse.json(
          { error: `Voice agent limit reached. Maximum ${VOICE_AGENT_LIMIT} agents per account.` },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    // Fetch user's language preference
    const userLanguage = user.language || body.language || 'en';
    
    // Language instruction based on user preference
    const languageInstructions: Record<string, string> = {
      'en': 'IMPORTANT: Respond in English. All your responses must be in English.',
      'fr': 'IMPORTANT: Répondez en français. Toutes vos réponses doivent être en français.',
      'es': 'IMPORTANTE: Responde en español. Todas tus respuestas deben ser en español.',
      'zh': '重要提示：请用中文回复。您的所有回复必须使用中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    // Build system prompt from knowledge base and business info
    let systemPrompt = body.systemPrompt;
    
    // If enableReservations is true, use the reservation-aware prompt
    if (body.enableReservations && !systemPrompt) {
      systemPrompt = generateReservationSystemPrompt({
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        knowledgeBase: body.knowledgeBase,
      });
    } else if (!systemPrompt) {
      // Default prompt if no custom prompt provided
      systemPrompt = `${languageInstruction}

You are an AI voice assistant for ${body.businessName}${body.businessIndustry ? ` in the ${body.businessIndustry} industry` : ''}.

${body.knowledgeBase || 'Answer customer questions professionally and helpfully.'}

${body.greetingMessage ? `Start conversations with: ${body.greetingMessage}` : ''}`;
    } else {
      // Add language instruction to custom prompt if provided
      systemPrompt = `${languageInstruction}\n\n${systemPrompt}`;
    }

    console.log('💾 Creating agent in database...');
    // Create agent in database
    const agentType = body.type || 'INBOUND';
    const agent = await prisma.voiceAgent.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description,
        type: agentType,
        status: body.status || 'TESTING',
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        
        // Knowledge & Prompts
        knowledgeBase: body.knowledgeBase,
        knowledgeBaseSources: (body.knowledgeBaseTexts?.length || body.knowledgeBaseUrls?.length || body.knowledgeBaseFiles?.length)
          ? {
              texts: (body.knowledgeBaseTexts || []).filter((t: string) => t.trim()),
              urls: (body.knowledgeBaseUrls || []).filter((u: string) => u.trim()),
              files: body.knowledgeBaseFiles || []
            }
          : undefined,
        // Support both old (greetingMessage) and new (inbound/outbound) fields
        greetingMessage: body.greetingMessage, // Legacy field
        inboundGreeting: body.inboundGreeting || (agentType === 'INBOUND' ? body.greetingMessage : null),
        outboundGreeting: body.outboundGreeting || (agentType === 'OUTBOUND' ? body.greetingMessage : null),
        systemPrompt,
        firstMessage: body.firstMessage || body.inboundGreeting || body.outboundGreeting || body.greetingMessage,
        enableReservations: body.enableReservations || false,
        
        // ElevenLabs Configuration
        voiceId: body.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        elevenLabsAgentId: null, // Will be auto-provisioned below
        
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
        
        // Language - use user's preference if not explicitly provided
        language: body.language || userLanguage,
        
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

    console.log('✅ Agent created in database:', agent.id);

    // 📌 ASSOCIATE KNOWLEDGE BASE FILES WITH THE NEWLY CREATED AGENT
    if (body.knowledgeBaseFileIds && Array.isArray(body.knowledgeBaseFileIds) && body.knowledgeBaseFileIds.length > 0) {
      try {
        console.log(`🔗 Associating ${body.knowledgeBaseFileIds.length} file(s) with agent ${agent.id}...`);
        console.log('File IDs to associate:', body.knowledgeBaseFileIds);
        
        // Verify user owns these files
        const ownedFiles = await prisma.knowledgeBaseFile.findMany({
          where: {
            id: { in: body.knowledgeBaseFileIds },
            userId: user.id,
          },
          select: { id: true },
        });

        console.log(`Found ${ownedFiles.length} owned files out of ${body.knowledgeBaseFileIds.length} requested`);

        if (ownedFiles.length > 0) {
          // Create junction table entries for file associations
          const associationData = ownedFiles.map(file => ({
            voiceAgentId: agent.id,
            knowledgeBaseFileId: file.id,
          }));
          
          console.log('Creating associations:', associationData);
          
          await prisma.voiceAgentKnowledgeBaseFile.createMany({
            data: associationData,
            skipDuplicates: true, // Skip if association already exists
          });
          
          console.log('✅ Knowledge base files associated with agent');
        } else {
          console.warn('⚠️ No owned files found to associate');
        }
      } catch (updateError: any) {
        console.error('⚠️ Error associating files with agent:', updateError);
        console.error('Error details:', {
          message: updateError.message,
          code: updateError.code,
          meta: updateError.meta
        });
        // Don't fail the entire agent creation if file association fails
      }
    }

    // 📚 AUTO-IMPORT KNOWLEDGE BASE FILES AND ONBOARDING DOCUMENTS
    // Fetch any uploaded documents from knowledge base and onboarding and add them to the agent's knowledge base
    let enhancedKnowledgeBase = body.knowledgeBase || '';
    let knowledgeBaseFiles = body.knowledgeBaseFiles || [];
    
    try {
      // 1️⃣ FETCH KNOWLEDGE BASE FILES FROM DATABASE
      console.log('📚 Fetching knowledge base files from database...');
      
      // Check if specific file IDs were provided (for agent-specific files)
      const knowledgeBaseFileIds = body.knowledgeBaseFileIds;
      const whereClause: any = { userId: user.id };
      
      // If specific file IDs are provided, only fetch those files
      if (knowledgeBaseFileIds && Array.isArray(knowledgeBaseFileIds) && knowledgeBaseFileIds.length > 0) {
        whereClause.id = { in: knowledgeBaseFileIds };
        console.log(`📋 Filtering to ${knowledgeBaseFileIds.length} specific file(s)`);
      }
      
      const userKnowledgeBaseFiles = await prisma.knowledgeBaseFile.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });

      if (userKnowledgeBaseFiles.length > 0) {
        console.log(`📄 Found ${userKnowledgeBaseFiles.length} knowledge base file(s) to import`);
        
        // Add each file's extracted text to the knowledge base
        const kbFileTexts = userKnowledgeBaseFiles
          .filter((file) => file.extractedText && file.extractedText.trim())
          .map((file, idx) => {
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
          
          console.log(`✅ Imported ${userKnowledgeBaseFiles.length} knowledge base file(s) (${kbFileTexts.length} characters)`);
        }
      } else {
        console.log('ℹ️  No knowledge base files found');
      }

      // 2️⃣ CHECK FOR ONBOARDING DOCUMENTS
      console.log('📚 Checking for onboarding documents to import...');
      const userWithProgress = await prisma.user.findUnique({
        where: { id: user.id },
        select: { onboardingProgress: true },
      });

      if (userWithProgress?.onboardingProgress) {
        let progress: any = {};
        try {
          progress = JSON.parse(userWithProgress.onboardingProgress as string);
        } catch (e) {
          console.log('⚠️  Could not parse onboarding progress');
        }

        if (progress.uploadedDocuments && Array.isArray(progress.uploadedDocuments) && progress.uploadedDocuments.length > 0) {
          console.log(`📄 Found ${progress.uploadedDocuments.length} onboarding document(s) to import`);
          
          // Add each document's extracted text to the knowledge base
          const documentTexts = progress.uploadedDocuments
            .filter((doc: any) => doc.extractedText)
            .map((doc: any, idx: number) => {
              knowledgeBaseFiles.push({
                name: doc.fileName,
                type: doc.fileType,
                uploadedAt: doc.uploadedAt
              });
              return `\n\n--- ${doc.fileName} ---\n${doc.extractedText}`;
            })
            .join('\n');

          if (documentTexts) {
            enhancedKnowledgeBase = enhancedKnowledgeBase 
              ? `${enhancedKnowledgeBase}\n\n=== ONBOARDING DOCUMENTS ===${documentTexts}`
              : `=== ONBOARDING DOCUMENTS ===${documentTexts}`;
            
            console.log(`✅ Imported ${progress.uploadedDocuments.length} onboarding document(s) (${documentTexts.length} characters)`);
          }
        } else {
          console.log('ℹ️  No onboarding documents found to import');
        }
      }

      // 3️⃣ UPDATE AGENT WITH ALL KNOWLEDGE BASE CONTENT
      if (enhancedKnowledgeBase) {
        await prisma.voiceAgent.update({
          where: { id: agent.id },
          data: {
            knowledgeBase: enhancedKnowledgeBase,
            knowledgeBaseSources: {
              texts: body.knowledgeBaseTexts || [],
              urls: body.knowledgeBaseUrls || [],
              files: knowledgeBaseFiles
            }
          },
        });
        console.log(`✅ Updated agent with complete knowledge base (${enhancedKnowledgeBase.length} characters total)`);
      }
    } catch (error: any) {
      console.error('⚠️  Error importing knowledge base documents (continuing anyway):', error.message);
      // Continue with agent creation even if document import fails
    }

    // 🔄 REBUILD SYSTEM PROMPT WITH ENHANCED KNOWLEDGE BASE
    // This ensures the ElevenLabs agent gets the full knowledge base including onboarding docs
    let finalSystemPrompt = systemPrompt;
    if (enhancedKnowledgeBase && enhancedKnowledgeBase !== body.knowledgeBase) {
      // Knowledge base was enhanced with onboarding docs - rebuild the prompt
      console.log('🔄 Rebuilding system prompt with enhanced knowledge base...');
      
      if (body.enableReservations) {
        finalSystemPrompt = generateReservationSystemPrompt({
          businessName: body.businessName,
          businessIndustry: body.businessIndustry,
          knowledgeBase: enhancedKnowledgeBase,
        });
      } else if (!body.systemPrompt) {
        // Only rebuild if no custom systemPrompt was provided
        finalSystemPrompt = `You are an AI voice assistant for ${body.businessName}${body.businessIndustry ? ` in the ${body.businessIndustry} industry` : ''}.

${enhancedKnowledgeBase || 'Answer customer questions professionally and helpfully.'}

${body.greetingMessage ? `Start conversations with: ${body.greetingMessage}` : ''}`;
      }
      
      // Update the agent with the final system prompt
      await prisma.voiceAgent.update({
        where: { id: agent.id },
        data: { systemPrompt: finalSystemPrompt },
      });
      
      console.log('✅ System prompt rebuilt with enhanced knowledge base');
    }

    // 📊 CHECK ELEVENLABS SUBSCRIPTION FIRST
    // This prevents creating agents on free plans that can't use phone numbers
    console.log('📊 Checking ElevenLabs subscription plan...');
    
    if (body.twilioPhoneNumber) {
      try {
        const subscriptionCheck = await elevenLabsProvisioning.checkSubscription(user.id);
        
        if (!subscriptionCheck.success) {
          console.warn('⚠️ Could not verify ElevenLabs subscription:', subscriptionCheck.error);
          console.warn('   Continuing anyway - agent will be created without phone number provisioning');
        } else if (!subscriptionCheck.canUsePhoneNumbers) {
          console.error('❌ ElevenLabs plan does not support phone numbers');
          
          // Delete the agent from database since we can't provision it
          await prisma.voiceAgent.delete({
            where: { id: agent.id },
          });
          
          return NextResponse.json(
            { 
              error: 'ElevenLabs plan upgrade required',
              details: subscriptionCheck.error || 'Your ElevenLabs plan does not support phone number imports.',
              tier: subscriptionCheck.tier,
              upgradeRequired: true,
              upgradeUrl: 'https://elevenlabs.io/pricing',
              recommendation: 'Please upgrade to the Starter plan ($10/month) or higher to use phone numbers with voice agents. Alternatively, create the agent without a phone number for testing.'
            },
            { status: 402 } // 402 Payment Required
          );
        } else {
          console.log(`✅ ElevenLabs plan "${subscriptionCheck.tier}" supports phone numbers`);
        }
      } catch (subscriptionError: any) {
        console.error('⚠️ Error checking subscription:', subscriptionError);
        console.warn('   Continuing anyway - agent will be created without phone number provisioning');
      }
    } else {
      console.log('ℹ️  No phone number provided - skipping subscription check');
    }

    // 🚀 AUTO-PROVISION ELEVENLABS AGENT
    // This happens in the background - user doesn't need to do anything!
    console.log('🤖 Auto-provisioning ElevenLabs agent for:', body.name);
    
    try {
      // Determine which greeting to use based on agent type
      const greetingForElevenLabs = agentType === 'OUTBOUND' 
        ? (body.outboundGreeting || body.greetingMessage)
        : (body.inboundGreeting || body.greetingMessage);
      
      console.log('Provisioning with data:', {
        name: body.name,
        businessName: body.businessName,
        hasSystemPrompt: !!finalSystemPrompt,
        hasKnowledgeBase: !!enhancedKnowledgeBase,
        hasPhoneNumber: !!body.twilioPhoneNumber,
      });
      
      const provisionResult = await elevenLabsProvisioning.createAgent({
        name: body.name,
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        greetingMessage: greetingForElevenLabs || body.firstMessage,
        systemPrompt: finalSystemPrompt, // Use the rebuilt prompt with onboarding docs
        knowledgeBase: enhancedKnowledgeBase, // Use enhanced knowledge base with onboarding docs
        voiceId: body.voiceId,
        language: userLanguage, // Use user's language preference
        maxCallDuration: body.maxCallDuration,
        twilioPhoneNumber: body.twilioPhoneNumber, // Pass phone number for import/assignment
        userId: user.id,
        voiceAgentId: agent.id,
      });

      if (!provisionResult.success) {
        console.error('❌ ElevenLabs auto-provisioning failed:', provisionResult.error);
        // CRITICAL: Delete the agent from database if ElevenLabs provisioning failed
        // Otherwise we'll have a zombie agent that can't make calls
        console.error('🗑️  Rolling back database agent due to provisioning failure');
        
        try {
          await prisma.voiceAgent.delete({
            where: { id: agent.id },
          });
        } catch (deleteError: any) {
          console.error('⚠️ Failed to delete agent during rollback:', deleteError);
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to create voice agent in ElevenLabs',
            details: provisionResult.error,
            suggestion: 'Please check: 1) ElevenLabs API key is valid, 2) You have an active ElevenLabs plan (Starter or higher), 3) Twilio credentials are configured correctly'
          },
          { status: 500 }
        );
      }

      console.log('✅ ElevenLabs agent auto-provisioned:', provisionResult.agentId);
      if (provisionResult.phoneNumberId) {
        console.log('✅ Phone number registered:', provisionResult.phoneNumberId);
      }
    } catch (provisionError: any) {
      console.error('❌ Exception during ElevenLabs provisioning:', provisionError);
      console.error('Error stack:', provisionError.stack);
      
      // Rollback the database agent
      try {
        await prisma.voiceAgent.delete({
          where: { id: agent.id },
        });
        console.log('🗑️  Rolled back database agent');
      } catch (deleteError: any) {
        console.error('⚠️ Failed to delete agent during rollback:', deleteError);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to provision voice agent',
          details: provisionError.message,
          stack: provisionError.stack,
        },
        { status: 500 }
      );
    }

    // Fetch the updated agent with the ElevenLabs ID
    const updatedAgent = await prisma.voiceAgent.findUnique({
      where: { id: agent.id },
    });

    return NextResponse.json(updatedAgent || agent, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating voice agent:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    return NextResponse.json(
      { 
        error: 'Failed to create voice agent',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
