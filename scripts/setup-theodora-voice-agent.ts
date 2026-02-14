/**
 * Setup Twilio Phone Number (450) 639-2047 for Theodora Stavropoulos
 * 
 * Connects her Twilio number to her ElevenLabs voice agents (same flow as soshogle@gmail.com).
 * 
 * Prerequisites:
 * - Number (450) 639-2047 must be in the Twilio account configured in .env (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
 * - If bought in a different Twilio account, you need that account's SID and Auth Token
 * 
 * Run: npx tsx scripts/setup-theodora-voice-agent.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';
const PHONE_NUMBER = '+14506392047'; // E.164 format for (450) 639-2047

async function main() {
  console.log('📞 Setting up Voice Agent for Theodora Stavropoulos');
  console.log('   Phone:', PHONE_NUMBER);
  console.log('');

  // 1. Find Theodora
  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
  });

  if (!theodora) {
    console.error('❌ User not found:', THEODORA_EMAIL);
    console.log('   Run create-theodora-agent.ts first if needed.');
    return;
  }

  console.log('✅ Found user:', theodora.name, `(${theodora.email})`);

  // 2. Check Twilio config (supports multi-account: TWILIO_PRIMARY_* or legacy TWILIO_ACCOUNT_SID)
  const { getPrimaryCredentials } = await import('../lib/twilio-credentials');
  const twilioCreds = await getPrimaryCredentials();
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.nexrel.soshogle.com';

  if (!twilioCreds) {
    console.error('❌ Twilio credentials not found. Set TWILIO_PRIMARY_ACCOUNT_SID and TWILIO_PRIMARY_AUTH_TOKEN (or legacy TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN) in .env');
    return;
  }

  const twilioSid = twilioCreds.accountSid;
  const twilioToken = twilioCreds.authToken;

  // 3. Verify number exists in Twilio
  console.log('\n📋 Verifying number in Twilio...');
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`,
    {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
      },
    }
  );

  if (!twilioRes.ok) {
    console.error('❌ Failed to fetch Twilio numbers:', twilioRes.status);
    const err = await twilioRes.text();
    console.error(err);
    return;
  }

  const twilioData = (await twilioRes.json()) as any;
  const phoneNumbers = twilioData.incoming_phone_numbers || [];
  const ourNumber = phoneNumbers.find(
    (p: any) => p.phone_number === PHONE_NUMBER || p.phone_number?.replace(/\s/g, '') === PHONE_NUMBER.replace(/\s/g, '')
  );

  if (!ourNumber) {
    console.error('❌ Phone number', PHONE_NUMBER, 'not found in Twilio account.');
    console.log('');
    console.log('   The number must be in the SAME Twilio account as TWILIO_ACCOUNT_SID.');
    console.log('   If you bought it in a different Twilio account, we need:');
    console.log('   - That account\'s Account SID');
    console.log('   - That account\'s Auth Token');
    console.log('');
    console.log('   Numbers in this account:', phoneNumbers.map((p: any) => p.phone_number).join(', ') || 'none');
    return;
  }

  console.log('✅ Number found in Twilio. Current voice URL:', ourNumber.voice_url || '(not set)');

  // 4. Update Twilio webhook to point to our API if needed
  const voiceWebhookUrl = `${appUrl}/api/twilio/voice-callback`;
  if (ourNumber.voice_url !== voiceWebhookUrl) {
    console.log('\n🔧 Updating Twilio webhook to:', voiceWebhookUrl);
    const updateRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers/${ourNumber.sid}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          VoiceUrl: voiceWebhookUrl,
          VoiceMethod: 'POST',
        }),
      }
    );

    if (!updateRes.ok) {
      console.error('❌ Failed to update Twilio webhook:', await updateRes.text());
      return;
    }
    console.log('✅ Twilio webhook updated');
  } else {
    console.log('✅ Twilio webhook already correct');
  }

  // 5. Find or create VoiceAgent for Theodora
  let voiceAgent = await prisma.voiceAgent.findFirst({
    where: { userId: theodora.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!voiceAgent) {
    console.log('\n📝 Creating new Voice Agent for Theodora...');
    voiceAgent = await prisma.voiceAgent.create({
      data: {
        userId: theodora.id,
        name: "Theodora's Assistant",
        businessName: theodora.businessDescription || 'RE/MAX 3000',
        businessIndustry: 'Real Estate',
        greetingMessage: "Good morning, this is Theodora's office. How can I help you today?",
        twilioPhoneNumber: PHONE_NUMBER,
        type: 'BOTH',
        status: 'TESTING',
        language: 'en',
      },
    });
    console.log('✅ Created Voice Agent:', voiceAgent.name);
  } else {
    console.log('\n📝 Found existing Voice Agent:', voiceAgent.name);
    // Update phone number
    await prisma.voiceAgent.update({
      where: { id: voiceAgent.id },
      data: { twilioPhoneNumber: PHONE_NUMBER },
    });
    console.log('✅ Updated phone number to', PHONE_NUMBER);
  }

  // 6. Auto-configure (creates ElevenLabs agent + imports phone) - run server-side
  console.log('\n🤖 Running auto-configure (ElevenLabs agent + phone import)...');
  try {
    const { elevenLabsProvisioning } = await import('../lib/elevenlabs-provisioning');

    // Check subscription
    const subCheck = await elevenLabsProvisioning.checkSubscription(theodora.id);
    if (!subCheck.canUsePhoneNumbers) {
      console.error('❌ ElevenLabs plan does not support phone numbers:', subCheck.error);
      return;
    }

    // Create agent if needed, or import phone to existing
    const reloadedAgent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgent.id },
      include: { user: true },
    });
    if (!reloadedAgent) return;

    let result: any;
    if (reloadedAgent.elevenLabsAgentId) {
      // Agent exists - import phone
      const phoneResult = await elevenLabsProvisioning.importPhoneNumber(
        PHONE_NUMBER,
        reloadedAgent.elevenLabsAgentId,
        theodora.id
      );
      if (phoneResult.success && phoneResult.phoneNumberId) {
        await prisma.voiceAgent.update({
          where: { id: voiceAgent.id },
          data: {
            elevenLabsPhoneNumberId: phoneResult.phoneNumberId,
            status: 'ACTIVE',
          },
        });
        result = { success: true, agentId: reloadedAgent.elevenLabsAgentId, phoneRegistered: true };
      } else {
        throw new Error(phoneResult.error || 'Phone import failed');
      }
    } else {
      // Create new agent with phone (createAgent updates DB internally)
      result = await elevenLabsProvisioning.createAgent({
        name: reloadedAgent.name,
        businessName: reloadedAgent.businessName,
        businessIndustry: reloadedAgent.businessIndustry || 'Real Estate',
        greetingMessage: reloadedAgent.greetingMessage || "Good morning, this is Theodora's office. How can I help you today?",
        systemPrompt: reloadedAgent.systemPrompt,
        voiceId: reloadedAgent.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        language: reloadedAgent.language || 'en',
        twilioPhoneNumber: PHONE_NUMBER,
        userId: theodora.id,
        voiceAgentId: reloadedAgent.id,
      });
      if (!result.success) {
        throw new Error(result.error || 'Agent creation failed');
      }
    }

    console.log('✅ Auto-configure complete!');
    console.log('   ElevenLabs Agent ID:', result.agentId);
    console.log('   Phone registered:', result.phoneRegistered !== false);
  } catch (err: any) {
    console.error('❌ Auto-configure failed:', err.message);
    console.log('');
    console.log('   Fallback: Have Theodora log in at', appUrl);
    console.log('   Go to Voice Agents → Select her agent → Test → Auto-Configure Now');
    return;
  }

  console.log('');
  console.log('📋 Summary:');
  console.log('   User:', theodora.name);
  console.log('   Phone:', PHONE_NUMBER);
  console.log('   Twilio Webhook:', voiceWebhookUrl);
  console.log('');
  console.log('🎉 Setup complete! Test by calling', PHONE_NUMBER);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
