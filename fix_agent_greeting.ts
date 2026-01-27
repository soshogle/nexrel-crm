/**
 * Script to fix agent_3201kb5fx6kcfzgs62hs1jxx1350
 * - Update with correct outbound greeting
 * - Include knowledge base content
 * - Sync with ElevenLabs
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AGENT_ID = 'cmiizu3so0003nv08e4fr85s3'; // ElevenLabs ID: agent_3201kb5fx6kcfzgs62hs1jxx1350

async function fixAgent() {
  try {
    console.log('🔧 Starting fix for agent:', AGENT_ID);
    
    // 1. Fetch the agent
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: AGENT_ID },
      include: { user: true },
    });

    if (!agent) {
      console.error('❌ Agent not found:', AGENT_ID);
      return;
    }

    console.log('✅ Found agent:', agent.name);
    console.log('   Type:', agent.type);
    console.log('   Current greeting:', agent.greetingMessage);
    console.log('   Has knowledge base:', !!agent.knowledgeBase);
    console.log('   ElevenLabs Agent ID:', agent.elevenLabsAgentId);

    // 2. Fetch knowledge base files for this user
    console.log('\n📚 Fetching knowledge base files...');
    const kbFiles = await prisma.knowledgeBaseFile.findMany({
      where: { userId: agent.userId },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`   Found ${kbFiles.length} knowledge base file(s)`);

    // 3. Build enhanced knowledge base
    let enhancedKnowledgeBase = '';
    const knowledgeBaseFiles: any[] = [];

    if (kbFiles.length > 0) {
      const kbFileTexts = kbFiles
        .filter((file) => file.extractedText && file.extractedText.trim())
        .map((file) => {
          knowledgeBaseFiles.push({
            name: file.fileName,
            type: file.fileType,
            uploadedAt: file.createdAt.toISOString(),
          });
          return `\n\n--- ${file.fileName} ---\n${file.extractedText}`;
        })
        .join('\n');

      if (kbFileTexts) {
        enhancedKnowledgeBase = `=== KNOWLEDGE BASE DOCUMENTS ===${kbFileTexts}`;
        console.log(`   Enhanced KB: ${enhancedKnowledgeBase.length} characters`);
      }
    }

    // 4. Define the correct greeting based on agent type
    let greeting = '';
    let greetingField = '';
    
    if (agent.type === 'OUTBOUND') {
      greeting = `Hi, this is calling from ${agent.businessName}. I'm reaching out to see if you'd be interested in learning more about our services. Is this a good time to chat?`;
      greetingField = 'outboundGreeting';
    } else {
      // INBOUND
      greeting = `Thank you for calling ${agent.businessName}. How can I help you today?`;
      greetingField = 'inboundGreeting';
    }
    
    console.log(`\n📝 Setting ${greetingField}:`, greeting);

    // 5. Build the system prompt with knowledge base
    const systemPrompt = `You are an AI voice assistant for ${agent.businessName}${
      agent.businessIndustry ? ` in the ${agent.businessIndustry} industry` : ''
    }.

${enhancedKnowledgeBase || agent.knowledgeBase || 'Answer customer questions professionally and helpfully.'}

${greeting ? `Start conversations with: ${greeting}` : ''}`;

    console.log('\n📄 System prompt preview (first 200 chars):', systemPrompt.substring(0, 200));

    // 6. Update the agent in database
    console.log('\n💾 Updating agent in database...');
    const updateData: any = {
      knowledgeBase: enhancedKnowledgeBase || agent.knowledgeBase,
      knowledgeBaseSources: knowledgeBaseFiles.length > 0
        ? {
            texts: [],
            urls: [],
            files: knowledgeBaseFiles,
          }
        : agent.knowledgeBaseSources,
      systemPrompt,
      firstMessage: greeting,
    };
    
    // Set the appropriate greeting field based on agent type
    if (agent.type === 'OUTBOUND') {
      updateData.outboundGreeting = greeting;
    } else {
      updateData.inboundGreeting = greeting;
    }
    
    const updatedAgent = await prisma.voiceAgent.update({
      where: { id: AGENT_ID },
      data: updateData,
    });

    console.log('✅ Agent updated in database');

    // 7. Sync with ElevenLabs if agent exists there
    if (agent.elevenLabsAgentId) {
      console.log('\n🔄 Syncing with ElevenLabs...');
      const apiKey = process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
        console.error('❌ ELEVENLABS_API_KEY not found in environment');
        return;
      }

      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`,
          {
            method: 'PATCH',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: agent.name,
              conversation_config: {
                agent: {
                  prompt: {
                    prompt: systemPrompt,
                  },
                  first_message: greeting,
                  language: agent.language || 'en',
                },
                tts: {
                  voice_id: agent.voiceId || 'EXAVITQu4vr4xnSDxMaL',
                },
              },
            }),
          }
        );

        if (response.ok) {
          console.log('✅ ElevenLabs agent synced successfully');
        } else {
          const error = await response.text();
          console.error('❌ ElevenLabs sync failed:', error);
        }
      } catch (error: any) {
        console.error('❌ Error syncing with ElevenLabs:', error.message);
      }
    } else {
      console.log('\nℹ️  No ElevenLabs agent ID - skipping sync');
    }

    console.log('\n✅ Fix completed!');
    console.log('\n📊 Summary:');
    console.log('   - Outbound greeting set');
    console.log(`   - Knowledge base enhanced: ${enhancedKnowledgeBase ? 'Yes' : 'No'}`);
    console.log(`   - ElevenLabs synced: ${agent.elevenLabsAgentId ? 'Yes' : 'No'}`);
  } catch (error: any) {
    console.error('❌ Error fixing agent:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixAgent();
