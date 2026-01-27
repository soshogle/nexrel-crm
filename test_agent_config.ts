import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function checkAgentConfig() {
  try {
    // Get all voice agents
    const agents = await prisma.voiceAgent.findMany({
      include: {
        knowledgeBaseFiles: {
          include: {
            knowledgeBaseFile: true
          }
        }
      }
    });

    console.log(`\n📊 Found ${agents.length} voice agent(s):\n`);

    for (const agent of agents) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🤖 Agent: ${agent.name}`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   ElevenLabs Agent ID: ${agent.elevenLabsAgentId || '❌ NOT SET'}`);
      console.log(`   Status: ${agent.status}`);
      console.log(`   Type: ${agent.type}`);
      
      // Check knowledge base files
      console.log(`\n   📚 Knowledge Base Files (${agent.knowledgeBaseFiles.length}):`);
      if (agent.knowledgeBaseFiles.length === 0) {
        console.log(`      ⚠️  NO KNOWLEDGE BASE FILES ASSOCIATED`);
      } else {
        for (const kbFile of agent.knowledgeBaseFiles) {
          console.log(`      ✅ ${kbFile.knowledgeBaseFile.fileName}`);
        }
      }

      // Check ElevenLabs configuration
      if (agent.elevenLabsAgentId) {
        console.log(`\n   🔍 Checking ElevenLabs agent configuration...`);
        
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          console.log(`      ❌ ELEVENLABS_API_KEY not found in environment`);
          continue;
        }

        try {
          const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`,
            {
              headers: {
                'xi-api-key': apiKey,
              },
            }
          );

          if (response.ok) {
            const elevenLabsAgent = await response.json();
            console.log(`      ✅ Agent exists in ElevenLabs`);
            console.log(`      📞 Phone Number ID: ${elevenLabsAgent.phone_number_id || '❌ NOT SET'}`);
            console.log(`      🎙️  First Message: ${elevenLabsAgent.conversation_config?.agent?.prompt?.llm?.first_message || '❌ NOT SET'}`);
            console.log(`      🧠 Knowledge Base: ${elevenLabsAgent.knowledge_base?.length || 0} file(s)`);
            
            // Check if agent can handle preview mode
            if (!elevenLabsAgent.conversation_config) {
              console.log(`      ⚠️  WARNING: No conversation_config - may not work in preview mode`);
            }
          } else {
            console.log(`      ❌ Agent NOT FOUND in ElevenLabs (${response.status})`);
            const errorText = await response.text();
            console.log(`      Error: ${errorText}`);
          }
        } catch (error: any) {
          console.log(`      ❌ Error checking ElevenLabs: ${error.message}`);
        }
      } else {
        console.log(`\n   ❌ Agent not configured in ElevenLabs`);
        console.log(`      Run auto-configure to set up this agent`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Check environment variables
    console.log(`\n🔧 Environment Variables:`);
    console.log(`   ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`   TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Missing'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAgentConfig();
