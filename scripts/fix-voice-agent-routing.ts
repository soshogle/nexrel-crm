/**
 * Fix Voice Agent Routing Issues
 * 
 * This script checks and fixes common issues that prevent Twilio calls from routing to voice agents:
 * 1. Missing ElevenLabs API key in environment
 * 2. Voice agents without ElevenLabs Agent IDs
 * 3. Phone number format mismatches
 * 4. Inactive voice agents
 * 
 * Run with: npx tsx scripts/fix-voice-agent-routing.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixVoiceAgentRouting() {
  console.log('🔧 Fixing Voice Agent Routing Issues...\n');

  const issues: string[] = [];
  const fixes: string[] = [];

  try {
    // 1. Check environment variables
    console.log('1️⃣ Checking Environment Variables:');
    console.log('─'.repeat(60));
    
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!elevenLabsKey) {
      issues.push('❌ ELEVENLABS_API_KEY is not set in environment variables');
      console.log('❌ ELEVENLABS_API_KEY: NOT SET');
    } else {
      console.log(`✅ ELEVENLABS_API_KEY: Set (${elevenLabsKey.substring(0, 10)}...)`);
    }
    
    if (!twilioSid) {
      issues.push('⚠️  TWILIO_ACCOUNT_SID is not set');
      console.log('⚠️  TWILIO_ACCOUNT_SID: NOT SET');
    } else {
      console.log(`✅ TWILIO_ACCOUNT_SID: Set`);
    }
    
    if (!twilioToken) {
      issues.push('⚠️  TWILIO_AUTH_TOKEN is not set');
      console.log('⚠️  TWILIO_AUTH_TOKEN: NOT SET');
    } else {
      console.log(`✅ TWILIO_AUTH_TOKEN: Set`);
    }
    console.log('');

    // 2. Check all voice agents
    console.log('2️⃣ Checking Voice Agents:');
    console.log('─'.repeat(60));
    
    const agents = await prisma.voiceAgent.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (agents.length === 0) {
      console.log('❌ No voice agents found in database!\n');
      console.log('💡 Solution: Create voice agents first.');
      return;
    }

    console.log(`Found ${agents.length} voice agent(s):\n`);

    for (const agent of agents) {
      console.log(`Agent: ${agent.name} (ID: ${agent.id})`);
      console.log(`  Status: ${agent.status}`);
      console.log(`  Type: ${agent.type}`);
      console.log(`  Twilio Phone: ${agent.twilioPhoneNumber || '❌ NOT SET'}`);
      console.log(`  ElevenLabs Agent ID: ${agent.elevenLabsAgentId || '❌ NOT SET'}`);
      console.log(`  ElevenLabs Phone ID: ${agent.elevenLabsPhoneNumberId || '❌ NOT SET'}`);
      
      // Check for issues
      const agentIssues: string[] = [];
      
      if (agent.twilioPhoneNumber && !agent.elevenLabsAgentId) {
        agentIssues.push('Has phone number but no ElevenLabs Agent ID');
        issues.push(`"${agent.name}": Missing ElevenLabs Agent ID`);
      }
      
      if (agent.twilioPhoneNumber && agent.status !== 'ACTIVE') {
        agentIssues.push(`Status is "${agent.status}" but should be ACTIVE`);
        issues.push(`"${agent.name}": Status is "${agent.status}"`);
      }
      
      if (agent.elevenLabsAgentId && !agent.twilioPhoneNumber) {
        agentIssues.push('Has ElevenLabs Agent ID but no phone number');
        issues.push(`"${agent.name}": Missing phone number`);
      }
      
      // Check phone number format
      if (agent.twilioPhoneNumber) {
        const phone = agent.twilioPhoneNumber;
        if (!phone.startsWith('+')) {
          agentIssues.push(`Phone format incorrect: "${phone}" should start with +`);
          issues.push(`"${agent.name}": Phone format incorrect`);
        }
        if (phone.includes(' ') || phone.includes('-') || phone.includes('(')) {
          agentIssues.push(`Phone format incorrect: "${phone}" should be E.164 format (+1234567890)`);
          issues.push(`"${agent.name}": Phone format incorrect`);
        }
      }
      
      if (agentIssues.length > 0) {
        console.log(`  ⚠️  Issues:`);
        agentIssues.forEach(issue => console.log(`    - ${issue}`));
      } else {
        console.log(`  ✅ Configuration looks good`);
      }
      console.log('');
    }

    // 3. Show webhook configuration
    console.log('3️⃣ Twilio Webhook Configuration:');
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

    // 4. Summary and recommendations
    console.log('4️⃣ Summary:');
    console.log('─'.repeat(60));
    
    if (issues.length === 0) {
      console.log('✅ No configuration issues found!\n');
      console.log('💡 If calls still aren\'t routing, check:');
      console.log('   1. Twilio webhook URLs are set correctly in Twilio Console');
      console.log('   2. Phone numbers in database match exactly what Twilio sends');
      console.log('   3. Server logs when a call comes in');
      console.log('   4. ElevenLabs API key is valid and has sufficient credits');
    } else {
      console.log(`Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      console.log('');
      
      console.log('🔧 Recommended Fixes:');
      console.log('─'.repeat(60));
      
      // Auto-fix suggestions
      for (const agent of agents) {
        if (agent.twilioPhoneNumber && agent.status !== 'ACTIVE') {
          console.log(`\nFix: Set "${agent.name}" status to ACTIVE`);
          fixes.push(`UPDATE "VoiceAgent" SET status = 'ACTIVE' WHERE id = '${agent.id}';`);
        }
        
        if (agent.twilioPhoneNumber && !agent.twilioPhoneNumber.startsWith('+')) {
          const fixedPhone = '+' + agent.twilioPhoneNumber.replace(/[^0-9]/g, '');
          console.log(`\nFix: Update "${agent.name}" phone number format`);
          console.log(`  From: ${agent.twilioPhoneNumber}`);
          console.log(`  To: ${fixedPhone}`);
          fixes.push(`UPDATE "VoiceAgent" SET "twilioPhoneNumber" = '${fixedPhone}' WHERE id = '${agent.id}';`);
        }
      }
      
      if (fixes.length > 0) {
        console.log('\n📝 SQL Fixes to Apply:');
        console.log('─'.repeat(60));
        fixes.forEach((fix, index) => {
          console.log(`\n-- Fix ${index + 1}`);
          console.log(fix);
        });
        console.log('');
      }
    }

    // 5. Test ElevenLabs API connection
    if (elevenLabsKey) {
      console.log('5️⃣ Testing ElevenLabs API Connection:');
      console.log('─'.repeat(60));
      
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: {
            'xi-api-key': elevenLabsKey,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('✅ ElevenLabs API connection successful');
          console.log(`   Subscription: ${userData.subscription?.tier || 'Unknown'}`);
          console.log(`   Characters used: ${userData.subscription?.character_count || 0}`);
          console.log(`   Character limit: ${userData.subscription?.character_limit || 0}`);
        } else {
          const error = await response.text();
          console.log(`❌ ElevenLabs API connection failed: ${response.status}`);
          console.log(`   Error: ${error}`);
          issues.push('ElevenLabs API key is invalid or expired');
        }
      } catch (error: any) {
        console.log(`❌ Failed to connect to ElevenLabs API: ${error.message}`);
        issues.push('Cannot connect to ElevenLabs API');
      }
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Error running diagnosis:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixVoiceAgentRouting();
