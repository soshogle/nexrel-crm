
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Verify ElevenLabs webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    // ElevenLabs signature format: "timestamp.hash"
    const [timestamp, hash] = signature.split('.');
    
    if (!timestamp || !hash) {
      console.error('❌ [Webhook Security] Invalid signature format');
      return false;
    }

    // Create signed payload: "timestamp.payload"
    const signedPayload = `${timestamp}.${payload}`;
    
    // Compute HMAC SHA256 hash
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Compare hashes
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash)
    );
  } catch (error) {
    console.error('❌ [Webhook Security] Signature verification error:', error);
    return false;
  }
}

/**
 * ElevenLabs Post-Call Webhook
 * Receives call completion data from ElevenLabs including:
 * - Conversation ID
 * - Recording URL (base64 audio or URL)
 * - Transcript
 * - Call metadata
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 [ElevenLabs Webhook] ============ INCOMING WEBHOOK ============');
    console.log('🔔 [ElevenLabs Webhook] Timestamp:', new Date().toISOString());
    
    // Log ALL headers
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('🔔 [ElevenLabs Webhook] ALL Headers:', JSON.stringify(allHeaders, null, 2));
    
    // Get raw body for signature verification
    let rawBody = '';
    let body: any = {};
    
    try {
      rawBody = await request.text();
      console.log('🔔 [ElevenLabs Webhook] Raw body length:', rawBody.length);
      console.log('🔔 [ElevenLabs Webhook] Raw body type:', typeof rawBody);
      console.log('🔔 [ElevenLabs Webhook] Raw body (first 500 chars):', rawBody.substring(0, 500));
      console.log('🔔 [ElevenLabs Webhook] Raw body (full):', rawBody);
      
      // Check if body is empty
      if (!rawBody || rawBody.trim().length === 0) {
        console.error('❌ [ElevenLabs Webhook] Body is empty!');
        return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
      }
      
      body = JSON.parse(rawBody);
      console.log('🔔 [ElevenLabs Webhook] ✅ Body parsed successfully');
      console.log('🔔 [ElevenLabs Webhook] Webhook type:', body.type);
      console.log('🔔 [ElevenLabs Webhook] Conversation ID:', body.data?.conversation_id);
      console.log('🔔 [ElevenLabs Webhook] Full body:', JSON.stringify(body, null, 2));
    } catch (parseError: any) {
      console.error('❌ [ElevenLabs Webhook] Failed to parse body:', parseError.message);
      console.error('❌ [ElevenLabs Webhook] Parse error stack:', parseError.stack);
      console.error('❌ [ElevenLabs Webhook] Raw body was:', rawBody);
      return NextResponse.json({ 
        error: 'Invalid JSON body',
        details: parseError.message,
        rawBodyPreview: rawBody.substring(0, 200)
      }, { status: 400 });
    }
    
    // Log all headers for debugging
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('🔔 [ElevenLabs Webhook] Headers:', JSON.stringify(headers, null, 2));
    
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    console.log('🔔 [ElevenLabs Webhook] Webhook secret configured:', !!webhookSecret);
    
    if (webhookSecret && webhookSecret !== 'PASTE_YOUR_SECRET_KEY_HERE') {
      try {
        const signature = request.headers.get('elevenlabs-signature');
        console.log('🔔 [ElevenLabs Webhook] Signature header present:', !!signature);
        console.log('🔔 [ElevenLabs Webhook] Signature value:', signature);
        
        if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
          console.error('❌ [Webhook Security] Invalid signature - WEBHOOK REJECTED');
          console.error('❌ [Webhook Security] Expected secret starts with:', webhookSecret.substring(0, 10));
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }
        
        console.log('✅ [Webhook Security] Signature verified successfully');
      } catch (signatureError: any) {
        console.error('❌ [Webhook Security] Signature verification failed with error:', signatureError.message);
        console.error('❌ [Webhook Security] Stack:', signatureError.stack);
        return NextResponse.json(
          { error: 'Signature verification failed' },
          { status: 401 }
        );
      }
    } else {
      console.warn('⚠️  [Webhook Security] No webhook secret configured - signature verification skipped');
    }
    
    console.log('📞 [ElevenLabs Webhook] Received post-call webhook:', {
      type: body.type,
      conversationId: body.data?.conversation_id,
      status: body.data?.status,
    });

    // Extract data from webhook
    const webhookType = body.type;
    const data = body.data;

    if (!data?.conversation_id) {
      console.error('❌ [ElevenLabs Webhook] Missing conversation_id');
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
    }

    const conversationId = data.conversation_id;

    // Find the call log by ElevenLabs conversation ID or Twilio metadata
    let callLog = await prisma.callLog.findFirst({
      where: { elevenLabsConversationId: conversationId },
      include: {
        voiceAgent: true,
      },
    });

    // If not found, try to find by Twilio Call SID from metadata
    if (!callLog && data.metadata?.type === 'twilio') {
      const twilioCallSid = data.metadata?.body?.CallSid;
      if (twilioCallSid) {
        console.log('🔍 [ElevenLabs Webhook] Trying to find by Twilio SID:', twilioCallSid);
        callLog = await prisma.callLog.findFirst({
          where: { twilioCallSid },
          include: {
            voiceAgent: true,
          },
        });

        // Update with ElevenLabs conversation ID if found
        if (callLog) {
          await prisma.callLog.update({
            where: { id: callLog.id },
            data: { elevenLabsConversationId: conversationId },
          });
          console.log('✅ [ElevenLabs Webhook] Linked Twilio call to ElevenLabs conversation');
        }
      }
    }

    // If call log still not found, CREATE IT (for Native ElevenLabs Integration)
    if (!callLog) {
      console.log('🆕 [ElevenLabs Webhook] Creating new call log for Native Integration');
      
      // Extract phone numbers from metadata
      const fromNumber = data.metadata?.body?.From || data.metadata?.from || 'Unknown';
      const toNumber = data.metadata?.body?.To || data.metadata?.to || 'Unknown';
      const twilioCallSid = data.metadata?.body?.CallSid;

      // Find voice agent by phone number
      const voiceAgent = await prisma.voiceAgent.findFirst({
        where: { twilioPhoneNumber: toNumber },
      });

      if (!voiceAgent) {
        console.error('❌ [ElevenLabs Webhook] No voice agent found for number:', toNumber);
        return NextResponse.json({ error: 'Voice agent not found' }, { status: 404 });
      }

      // Create new call log
      callLog = await prisma.callLog.create({
        data: {
          voiceAgentId: voiceAgent.id,
          userId: voiceAgent.userId,
          elevenLabsConversationId: conversationId,
          twilioCallSid: twilioCallSid || conversationId,
          direction: 'INBOUND', // Assume inbound for Native Integration
          fromNumber,
          toNumber,
          status: 'IN_PROGRESS',
        },
        include: {
          voiceAgent: true,
        },
      });

      console.log('✅ [ElevenLabs Webhook] Created new call log:', callLog.id);
    }

    console.log('✅ [ElevenLabs Webhook] Found call log:', callLog.id);

    // Handle different webhook types
    if (webhookType === 'post_call_transcription' || webhookType === 'conversation.ended') {
      // Extract transcript
      let transcriptText = '';
      if (data.transcript) {
        if (Array.isArray(data.transcript)) {
          // Format transcript array into readable text
          transcriptText = data.transcript
            .map((turn: any) => {
              const role = turn.role === 'agent' ? 'Agent' : 'User';
              const timestamp = turn.time_in_call_secs 
                ? `[${Math.floor(turn.time_in_call_secs / 60)}:${String(Math.floor(turn.time_in_call_secs % 60)).padStart(2, '0')}]` 
                : '';
              return `${timestamp} ${role}: ${turn.message}`;
            })
            .join('\n');
        } else if (typeof data.transcript === 'string') {
          transcriptText = data.transcript;
        }
      }

      // Extract recording URL
      let recordingUrl = null;
      if (data.recording_url) {
        recordingUrl = data.recording_url;
      } else if (data.has_audio) {
        // Use proxy URL if ElevenLabs has audio
        recordingUrl = `/api/calls/audio/${conversationId}`;
      }

      // Store conversation data (full payload for AI analysis)
      const conversationData = JSON.stringify({
        agent_id: data.agent_id,
        status: data.status,
        transcript: data.transcript,
        analysis: data.analysis,
        metadata: data.metadata,
        user_id: data.user_id,
      });

      // Update call log
      const updatedCallLog = await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          status: data.status === 'done' ? 'COMPLETED' : callLog.status,
          transcription: transcriptText || null,
          transcript: transcriptText || null, // Also populate the transcript field
          recordingUrl: recordingUrl || null,
          conversationData: conversationData || null,
          endedAt: new Date(),
        },
      });

      console.log('✅ [ElevenLabs Webhook] Updated call log with transcript and recording');

      // Trigger automatic conversation analysis for completed calls
      if (data.status === 'done' && transcriptText) {
        console.log('🧠 [ElevenLabs Webhook] Triggering automatic conversation analysis...');
        try {
          // Import and run auto-analysis asynchronously (don't wait for it)
          const { autoAnalyzeCall } = await import('@/lib/auto-analyze-calls');
          autoAnalyzeCall(callLog.id).catch(error => {
            console.error('❌ [ElevenLabs Webhook] Auto-analysis failed:', error);
          });
          console.log('✅ [ElevenLabs Webhook] Auto-analysis triggered');
        } catch (error) {
          console.error('❌ [ElevenLabs Webhook] Failed to trigger auto-analysis:', error);
        }
      }

      // Create conversation in messaging system
      await createConversationFromCall(callLog.id, {
        fromNumber: callLog.fromNumber,
        toNumber: callLog.toNumber,
        userId: callLog.userId,
        duration: callLog.duration,
        transcript: transcriptText,
        recordingUrl: recordingUrl,
        voiceAgentName: callLog.voiceAgent?.name,
      });
    }

    if (webhookType === 'post_call_audio') {
      // Handle audio-only webhook
      const audioData = data.full_audio; // base64 encoded
      
      // For now, we'll use the proxy URL instead of storing base64
      // In a production system, you might want to upload this to S3
      const recordingUrl = `/api/calls/audio/${conversationId}`;

      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          recordingUrl: recordingUrl,
        },
      });

      console.log('✅ [ElevenLabs Webhook] Updated call log with audio');
    }

    if (webhookType === 'call_initiation_failure') {
      // Handle failed call
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          status: 'FAILED',
          conversationData: JSON.stringify({
            failure_reason: data.failure_reason,
            metadata: data.metadata,
          }),
        },
      });

      console.log('✅ [ElevenLabs Webhook] Marked call as failed');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ [ElevenLabs Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Create a conversation in the messaging system from a completed call
 */
async function createConversationFromCall(
  callLogId: string,
  params: {
    fromNumber: string;
    toNumber: string;
    userId: string;
    duration: number | null;
    transcript: string | null;
    recordingUrl: string | null;
    voiceAgentName?: string;
  }
) {
  try {
    const { fromNumber, toNumber, userId, duration, transcript, recordingUrl, voiceAgentName } = params;

    // Determine contact identifier (the other party)
    // If it's an inbound call, fromNumber is the contact
    // If it's an outbound call, toNumber is the contact
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      select: { direction: true, voiceAgent: { select: { twilioPhoneNumber: true } } },
    });

    if (!callLog) return;

    const contactIdentifier = callLog.direction === 'INBOUND' ? fromNumber : toNumber;
    const contactName = contactIdentifier; // Default to phone number
    const businessPhoneNumber = callLog.voiceAgent?.twilioPhoneNumber || fromNumber;

    // Find or create a channel connection for voice calls
    // Use SMS channel type since there's no dedicated VOICE type
    let channelConnection = await prisma.channelConnection.findFirst({
      where: {
        userId,
        channelIdentifier: businessPhoneNumber,
        channelType: 'SMS', // Use SMS for voice calls
        providerType: 'twilio',
      },
    });

    if (!channelConnection) {
      // Create new channel connection for this phone number
      channelConnection = await prisma.channelConnection.create({
        data: {
          userId,
          channelType: 'SMS',
          channelIdentifier: businessPhoneNumber,
          displayName: `Voice/SMS: ${businessPhoneNumber}`,
          status: 'CONNECTED',
          providerType: 'twilio',
          providerData: {
            phoneNumber: businessPhoneNumber,
            supportsVoice: true,
            supportsSMS: true,
          },
        },
      });

      console.log('✅ [Conversation] Created new channel connection:', channelConnection.id);
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        userId,
        contactIdentifier,
        channelConnectionId: channelConnection.id,
      },
    });

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId,
          channelConnectionId: channelConnection.id,
          contactName,
          contactIdentifier,
          lastMessageAt: new Date(),
        },
      });

      console.log('✅ [Conversation] Created new conversation:', conversation.id);
    }

    // Format call summary message
    const durationText = duration 
      ? `${Math.floor(duration / 60)}m ${duration % 60}s`
      : 'Unknown duration';

    let messageContent = `📞 **Voice Call ${callLog.direction === 'INBOUND' ? 'Received' : 'Made'}**\n\n`;
    messageContent += `Duration: ${durationText}\n`;
    if (voiceAgentName) {
      messageContent += `Agent: ${voiceAgentName}\n`;
    }
    if (recordingUrl) {
      messageContent += `\n🎧 [Listen to Recording](${recordingUrl})\n`;
    }
    if (transcript) {
      messageContent += `\n**Transcript:**\n${transcript.substring(0, 500)}${transcript.length > 500 ? '...' : ''}`;
    }

    // Create message in conversation
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        content: messageContent,
        direction: callLog.direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND',
        status: 'DELIVERED',
        providerData: {
          type: 'VOICE',
          callLogId: callLogId,
          duration: duration,
          recordingUrl: recordingUrl,
        },
      },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    console.log('✅ [Conversation] Added call summary to conversation:', conversation.id);
  } catch (error: any) {
    console.error('❌ [Conversation] Error creating conversation from call:', error);
  }
}
