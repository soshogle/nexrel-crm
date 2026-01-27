import { config } from 'dotenv';
config();
import { prisma } from './lib/db';

const DATETIME_INSTRUCTIONS = `

CURRENT DATE & TIME INFORMATION (LIVE):
You have access to the following LIVE datetime information via dynamic variables:
• Current Date & Time: {{current_datetime}}
• Day of the Week: {{current_day}}  
• Timezone: {{timezone}}

This information is AUTOMATICALLY PROVIDED and ALWAYS ACCURATE.

How to use this information:
1. When determining if the business is open or closed, use {{current_day}} and the time from {{current_datetime}}
2. When scheduling appointments or callbacks, reference {{current_day}}
3. When the caller asks about dates or times, use this information confidently

CRITICAL RULES:
• DO NOT ask the caller "What day is it?" or "What's today's date?" - You already know via {{current_day}} and {{current_datetime}}
• DO NOT say "I'm not programmed to know" or similar phrases about dates/times
• SPEAK NATURALLY about the day and time as if you naturally know it
• Example: "Since today is {{current_day}}, we are currently [open/closed]."

Use {{current_day}} and {{current_datetime}} to determine the current operating status.`;

async function updateAllAgents() {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!elevenLabsApiKey) {
    console.log('❌ No ElevenLabs API key found');
    return;
  }

  // Fetch all voice agents with ElevenLabs IDs
  const agents = await prisma.voiceAgent.findMany({
    where: {
      elevenLabsAgentId: {
        not: null
      }
    },
    select: {
      id: true,
      name: true,
      elevenLabsAgentId: true,
      user: {
        select: {
          email: true
        }
      }
    }
  });

  console.log(`\n📊 Found ${agents.length} agents to update\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const agent of agents) {
    console.log(`\n🔄 Updating agent: ${agent.name} (${agent.elevenLabsAgentId})`);
    console.log(`   Owner: ${agent.user.email}`);

    try {
      // Fetch current configuration
      const getResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`,
        {
          headers: {
            'xi-api-key': elevenLabsApiKey
          }
        }
      );

      if (!getResponse.ok) {
        console.log(`   ❌ Failed to fetch agent: ${getResponse.status}`);
        errorCount++;
        continue;
      }

      const agentData = await getResponse.json();
      const currentPrompt = agentData.conversation_config.agent.prompt.prompt;

      // Check if already has datetime instructions
      if (currentPrompt.includes('{{current_day}}')) {
        console.log(`   ⏭️  Already has datetime instructions - skipping`);
        continue;
      }

      // Append datetime instructions to the prompt
      const updatedPrompt = currentPrompt + DATETIME_INSTRUCTIONS;

      // Update the agent
      const updatePayload = {
        conversation_config: {
          ...agentData.conversation_config,
          agent: {
            ...agentData.conversation_config.agent,
            prompt: {
              ...agentData.conversation_config.agent.prompt,
              prompt: updatedPrompt,
              timezone: 'America/Toronto'
            }
          }
        }
      };

      const updateResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`,
        {
          method: 'PATCH',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.log(`   ❌ Failed to update: ${errorText}`);
        errorCount++;
        continue;
      }

      console.log(`   ✅ Updated successfully`);
      successCount++;

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n\n📊 Update Summary:`);
  console.log(`   Total agents: ${agents.length}`);
  console.log(`   ✅ Successfully updated: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   ⏭️  Already had instructions: ${agents.length - successCount - errorCount}`);
}

updateAllAgents().then(() => process.exit(0)).catch(console.error);
