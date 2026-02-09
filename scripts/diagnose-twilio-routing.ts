/**
 * Diagnostic script to check why Twilio calls aren't routing to voice agents
 * 
 * Run with: npx tsx scripts/diagnose-twilio-routing.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseTwilioRouting() {
  console.log('🔍 Diagnosing Twilio Voice Agent Routing Issues...\n');

  try {
    // 1. Check all voice agents
    console.log('📋 Checking Voice Agents in Database:');
    console.log('─'.repeat(60));
    
    const agents = await prisma.voiceAgent.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (agents.length === 0) {
      console.log('❌ No voice agents found in database!\n');
      console.log('💡 Solution: Create voice agents first before assigning phone numbers.');
      return;
    }

    console.log(`Found ${agents.length} voice agent(s):\n`);

    for (const agent of agents) {
      console.log(`Agent: ${agent.name}`);
      console.log(`  ID: ${agent.id}`);
      console.log(`  Status: ${agent.status}`);
      console.log(`  Type: ${agent.type}`);
      console.log(`  Twilio Phone: ${agent.twilioPhoneNumber || '❌ NOT SET'}`);
      console.log(`  ElevenLabs Agent ID: ${agent.elevenLabsAgentId || '❌ NOT SET'}`);
      console.log(`  ElevenLabs Phone ID: ${agent.elevenLabsPhoneNumberId || '❌ NOT SET'}`);
      console.log(`  User: ${agent.user.email} (${agent.user.name || 'No name'})`);
      console.log('');
    }

    // 2. Check for agents with phone numbers but missing configuration
    console.log('⚠️  Potential Issues:');
    console.log('─'.repeat(60));

    const issues: string[] = [];

    for (const agent of agents) {
      if (agent.twilioPhoneNumber && !agent.elevenLabsAgentId) {
        issues.push(`❌ "${agent.name}" has phone ${agent.twilioPhoneNumber} but no ElevenLabs Agent ID`);
      }
      if (agent.twilioPhoneNumber && agent.status !== 'ACTIVE') {
        issues.push(`⚠️  "${agent.name}" has phone ${agent.twilioPhoneNumber} but status is "${agent.status}" (should be ACTIVE)`);
      }
      if (agent.elevenLabsAgentId && !agent.twilioPhoneNumber) {
        issues.push(`⚠️  "${agent.name}" has ElevenLabs Agent ID but no Twilio phone number`);
      }
    }

    if (issues.length === 0) {
      console.log('✅ No obvious configuration issues found!\n');
    } else {
      issues.forEach(issue => console.log(issue));
      console.log('');
    }

    // 3. Show webhook URL that should be configured in Twilio
    console.log('🔗 Twilio Webhook Configuration:');
    console.log('─'.repeat(60));
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL || 
                   process.env.NEXTAUTH_URL ||
                   'YOUR_APP_URL';
    
    const webhookUrl = `${appUrl}/api/twilio/voice-callback`;
    const statusCallbackUrl = `${appUrl}/api/twilio/call-status`;
    
    console.log('For EACH Twilio phone number, configure these webhooks:\n');
    console.log('Voice Webhook (A CALL COMES IN):');
    console.log(`  URL: ${webhookUrl}`);
    console.log(`  Method: POST\n`);
    console.log('Status Callback URL:');
    console.log(`  URL: ${statusCallbackUrl}`);
    console.log(`  Method: POST\n`);

    // 4. Show phone numbers that need webhook configuration
    const agentsWithPhones = agents.filter(a => a.twilioPhoneNumber);
    
    if (agentsWithPhones.length > 0) {
      console.log('📞 Phone Numbers That Need Webhook Configuration:');
      console.log('─'.repeat(60));
      agentsWithPhones.forEach(agent => {
        console.log(`  ${agent.twilioPhoneNumber} → ${agent.name}`);
        console.log(`    Status: ${agent.status}`);
        console.log(`    ElevenLabs Agent: ${agent.elevenLabsAgentId ? '✅' : '❌'}`);
        console.log('');
      });
    }

    // 5. Check for phone number format issues
    console.log('🔍 Phone Number Format Check:');
    console.log('─'.repeat(60));
    
    const formatIssues: string[] = [];
    agentsWithPhones.forEach(agent => {
      const phone = agent.twilioPhoneNumber!;
      // Twilio sends numbers in E.164 format: +1234567890
      if (!phone.startsWith('+')) {
        formatIssues.push(`⚠️  "${agent.name}": Phone "${phone}" should start with + (E.164 format)`);
      }
      if (phone.includes(' ')) {
        formatIssues.push(`⚠️  "${agent.name}": Phone "${phone}" contains spaces (should be +1234567890)`);
      }
      if (phone.includes('-')) {
        formatIssues.push(`⚠️  "${agent.name}": Phone "${phone}" contains dashes (should be +1234567890)`);
      }
    });

    if (formatIssues.length === 0) {
      console.log('✅ All phone numbers are in correct format (E.164: +1234567890)\n');
    } else {
      formatIssues.forEach(issue => console.log(issue));
      console.log('');
    }

    // 6. Recommendations
    console.log('💡 Recommendations:');
    console.log('─'.repeat(60));
    
    if (agentsWithPhones.length === 0) {
      console.log('1. Assign phone numbers to your voice agents');
      console.log('2. Ensure agents have ElevenLabs Agent IDs configured');
      console.log('3. Set agent status to ACTIVE');
    } else {
      console.log('1. Verify Twilio webhook URLs are set correctly for each phone number');
      console.log('2. Check that phone numbers in database match exactly what Twilio sends');
      console.log('3. Ensure all agents with phone numbers have status = ACTIVE');
      console.log('4. Verify ElevenLabs Agent IDs are configured');
      console.log('5. Check server logs when calls come in to see what phone number Twilio is sending');
    }

    console.log('\n📝 Next Steps:');
    console.log('─'.repeat(60));
    console.log('1. Check Twilio Console → Phone Numbers → [Your Number]');
    console.log('   - Verify "A CALL COMES IN" webhook points to:', webhookUrl);
    console.log('   - Verify "STATUS CALLBACK URL" points to:', statusCallbackUrl);
    console.log('2. Make a test call and check server logs');
    console.log('3. Verify the "To" number in logs matches exactly with database');
    console.log('4. Check that voice agent status is ACTIVE\n');

  } catch (error: any) {
    console.error('❌ Error running diagnosis:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseTwilioRouting();
