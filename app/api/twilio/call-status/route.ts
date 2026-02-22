import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { createDalContext } from '@/lib/context/industry-context';
import { leadService } from '@/lib/dal/lead-service';
import { noteService } from '@/lib/dal/note-service';
import {
  triggerCallCompletedWorkflow,
  triggerMissedCallWorkflow,
} from '@/lib/dental/workflow-triggers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Twilio Call Status Callback
 * Updates call logs based on Twilio call status events
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    
    console.log('📊 [Twilio Call Status]', {
      callSid,
      callStatus,
      callDuration,
      from,
      to,
    });

    if (!callSid) {
      return NextResponse.json({ error: 'Missing CallSid' }, { status: 400 });
    }

    // Find the call log by Twilio SID
    let callLog = await prisma.callLog.findFirst({
      where: { twilioCallSid: callSid },
    });

    // If no call log exists, create it (for Native ElevenLabs Integration)
    if (!callLog) {
      console.log('🆕 [Twilio Call Status] Creating new call log for Native Integration');
      console.log('   Status:', callStatus);
      
      // Find the voice agent for this phone number
      const voiceAgent = await prisma.voiceAgent.findFirst({
        where: { twilioPhoneNumber: to },
      });

      if (voiceAgent) {
        callLog = await prisma.callLog.create({
          data: {
            voiceAgentId: voiceAgent.id,
            userId: voiceAgent.userId,
            twilioCallSid: callSid,
            direction: 'INBOUND',
            fromNumber: from || '',
            toNumber: to || '',
            status: 'INITIATED',
          },
        });
        console.log('✅ [Twilio Call Status] Call log created:', callLog.id);
      } else {
        console.warn('⚠️  [Twilio Call Status] No voice agent found for number:', to);
        return NextResponse.json({ message: 'Voice agent not found' }, { status: 404 });
      }
    }

    if (!callLog) {
      console.warn('⚠️  [Twilio Call Status] Call log not found for SID:', callSid);
      return NextResponse.json({ message: 'Call log not found' }, { status: 404 });
    }

    // Map Twilio status to our status
    let status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' = 'INITIATED';
    let outboundStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' = 'IN_PROGRESS';
    
    switch (callStatus) {
      case 'initiated':
      case 'ringing':
        status = 'INITIATED';
        outboundStatus = 'IN_PROGRESS';
        break;
      case 'in-progress':
      case 'answered':
        status = 'IN_PROGRESS';
        outboundStatus = 'IN_PROGRESS';
        break;
      case 'completed':
        status = 'COMPLETED';
        outboundStatus = 'COMPLETED';
        break;
      case 'busy':
      case 'no-answer':
      case 'canceled':
      case 'failed':
        status = 'FAILED';
        outboundStatus = 'FAILED';
        break;
    }

    // Update call log
    const updatedCallLog = await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        status,
        ...(callDuration && { duration: parseInt(callDuration, 10) }),
        ...(callStatus === 'completed' && { endedAt: new Date() }),
      },
    });

    // Trigger workflows based on call status
    try {
      if (callStatus === 'completed' && callDuration) {
        // Trigger call completed workflow
        await triggerCallCompletedWorkflow(
          callLog.id,
          callLog.leadId || null,
          callLog.userId,
          parseInt(callDuration, 10),
          'completed'
        );
      } else if (callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'failed') {
        // Trigger missed call workflow
        await triggerMissedCallWorkflow(
          callLog.id,
          callLog.leadId || null,
          callLog.userId,
          from || ''
        );
      }
    } catch (error) {
      console.error('Error triggering call workflows:', error);
      // Don't fail the webhook if workflow trigger fails
    }

    // Update related outbound call
    if (callLog.id) {
      await prisma.outboundCall.updateMany({
        where: { callLogId: callLog.id },
        data: {
          status: outboundStatus,
        },
      });
    }

    // If call is completed OR has duration > 0, schedule ElevenLabs data fetch with delay
    // IMPORTANT: ElevenLabs needs time to process the call and mark it as "done"
    // Twilio webhook fires immediately, but ElevenLabs may take 5-15 seconds
    const shouldFetchRecording = callStatus === 'completed' || (callDuration && parseInt(callDuration, 10) > 0);
    
    if (shouldFetchRecording) {
      console.log('🎙️ [Twilio Call Status] Call ended, scheduling background ElevenLabs fetch...');
      console.log('   Status:', callStatus);
      console.log('   From:', from);
      console.log('   To:', to);
      console.log('   Duration:', callDuration);
      
      // Fire-and-forget: schedule the ElevenLabs fetch as a background task
      // Don't await this - respond to Twilio immediately to avoid timeout
      scheduleElevenLabsFetch(callLog.id, callDuration || '0', from || '', to || '');
    }

    console.log('✅ [Twilio Call Status] Webhook processed:', callLog.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ [Twilio Call Status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Background function to fetch ElevenLabs data with retry logic
 * Runs independently from the webhook response to avoid timeout issues
 */
async function scheduleElevenLabsFetch(
  callLogId: string, 
  callDuration: string, 
  from: string, 
  to: string
) {
  // Initial delay to allow ElevenLabs to process the call
  const INITIAL_DELAY_MS = 10000; // 10 seconds
  const RETRY_DELAYS_MS = [15000, 30000, 60000]; // Retry after 15s, 30s, 60s
  const MAX_ATTEMPTS = 4; // Initial + 3 retries
  
  let attempt = 0;
  let success = false;
  
  // Initial delay
  console.log(`⏳ [ElevenLabs Fetch] Waiting ${INITIAL_DELAY_MS/1000}s before first attempt...`);
  await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY_MS));
  
  while (attempt < MAX_ATTEMPTS && !success) {
    attempt++;
    console.log(`🔄 [ElevenLabs Fetch] Attempt ${attempt}/${MAX_ATTEMPTS} for call ${callLogId}`);
    
    try {
      success = await fetchAndProcessElevenLabsData(callLogId, callDuration, from, to);
      
      if (!success && attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        console.log(`⏳ [ElevenLabs Fetch] No match found, retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error: any) {
      console.error(`❌ [ElevenLabs Fetch] Attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  if (!success) {
    console.warn(`⚠️ [ElevenLabs Fetch] Failed to find matching conversation after ${MAX_ATTEMPTS} attempts for call ${callLogId}`);
  }
}

/**
 * Fetch and process ElevenLabs conversation data for a call
 * Returns true if successful, false if no match found
 */
async function fetchAndProcessElevenLabsData(
  callLogId: string,
  callDuration: string,
  from: string,
  to: string
): Promise<boolean> {
  try {
    // Get the call log to verify it hasn't been processed yet
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      select: { 
        id: true, 
        createdAt: true, 
        voiceAgentId: true, 
        userId: true,
        elevenLabsConversationId: true,
        conversationData: true
      }
    });
    
    if (!callLog) {
      console.error(`❌ [ElevenLabs Fetch] Call log not found: ${callLogId}`);
      return false;
    }
    
    // Skip if already processed
    if (callLog.elevenLabsConversationId && callLog.conversationData) {
      console.log(`ℹ️ [ElevenLabs Fetch] Call ${callLogId} already has ElevenLabs data, skipping`);
      return true;
    }
    
    // List recent conversations from ElevenLabs
    const listResponse = await fetch('https://api.elevenlabs.io/v1/convai/conversations', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
    });

    if (!listResponse.ok) {
      throw new Error(`ElevenLabs API error: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    const conversations = listData.conversations || [];
    console.log('📋 [ElevenLabs Fetch] Found', conversations.length, 'recent conversations');

    // Find conversation that matches our call
    const callTime = callLog.createdAt || new Date();
    const callDurationNum = parseInt(callDuration || '0', 10);
    let matchedConversation = null;
    let bestMatch = null;
    let bestScore = Infinity;
    
    console.log('🔍 [ElevenLabs Fetch] Matching parameters:', {
      callLogId,
      callTime: callTime.toISOString(),
      callDuration: callDurationNum,
    });
    
    for (const conv of conversations) {
      // Check if timestamps are close (within 5 minutes to account for delays)
      const convTime = new Date(conv.start_time_unix_secs * 1000);
      const timeDiff = Math.abs(callTime.getTime() - convTime.getTime()) / 1000; // seconds
      
      // Check duration similarity (within 15 seconds tolerance)
      const convDuration = conv.call_duration_secs || 0;
      const durationDiff = Math.abs(callDurationNum - convDuration);
      
      // Match conditions:
      // - Time within 5 minutes AND duration similar AND status done
      // - OR time within 2 minutes AND status done (for edge cases with duration mismatch)
      const isTimeVeryClose = timeDiff < 120; // 2 minutes
      const isTimeClose = timeDiff < 300; // 5 minutes
      const isDurationSimilar = durationDiff <= 15;
      const isStatusDone = conv.status === 'done' || conv.status === 'completed';
      
      if ((isTimeClose && isDurationSimilar && isStatusDone) || (isTimeVeryClose && isStatusDone)) {
        // Calculate match score (lower is better)
        const score = timeDiff + (durationDiff * 2);
        
        if (score < bestScore) {
          bestMatch = conv;
          bestScore = score;
          console.log(`   ✓ Potential match: ${conv.conversation_id.substring(0, 20)}... (score: ${Math.round(score)})`);
        }
      }
    }
    
    if (bestMatch) {
      matchedConversation = bestMatch;
      console.log('✅ [ElevenLabs Fetch] MATCHED:', matchedConversation.conversation_id);
    } else {
      console.log('❌ [ElevenLabs Fetch] No matching conversation found');
      return false;
    }

    // Fetch full conversation details
    const conversationId = matchedConversation.conversation_id;
    console.log('🔍 [ElevenLabs Fetch] Fetching full conversation details for:', conversationId);
    
    const detailsResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        },
      }
    );

    if (!detailsResponse.ok) {
      throw new Error(`Failed to fetch conversation details: ${detailsResponse.status}`);
    }

    const conversationDetails = await detailsResponse.json();
    console.log('✅ [ElevenLabs Fetch] Conversation details fetched');
    console.log('   Status:', conversationDetails.status);
    console.log('   Has audio:', conversationDetails.has_audio);
    console.log('   Transcript turns:', conversationDetails.transcript?.length || 0);
    
    // Extract transcript
    let transcriptText = '';
    if (conversationDetails.transcript && Array.isArray(conversationDetails.transcript)) {
      transcriptText = conversationDetails.transcript
        .map((turn: any) => {
          const role = turn.role === 'agent' ? 'Agent' : 'User';
          const timestamp = turn.time_in_call_secs 
            ? `[${Math.floor(turn.time_in_call_secs / 60)}:${String(Math.floor(turn.time_in_call_secs % 60)).padStart(2, '0')}]` 
            : '';
          return `${timestamp} ${role}: ${turn.message}`;
        })
        .join('\n');
    }

    // Get recording URL (use proxy)
    let recordingUrl = null;
    if (conversationDetails.has_audio) {
      recordingUrl = `/api/calls/audio/${conversationId}`;
    }

    // Update call log with ElevenLabs data
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        elevenLabsConversationId: conversationId,
        transcription: transcriptText || null,
        recordingUrl: recordingUrl || null,
        conversationData: JSON.stringify(conversationDetails),
      },
    });

    console.log('✅ [ElevenLabs Fetch] Updated call log with ElevenLabs data:', {
      callLogId: callLog.id,
      conversationId,
      hasRecording: !!recordingUrl,
      transcriptLength: transcriptText?.length || 0,
    });

    // Send email notification to business owner
    try {
      await sendEmailNotification(
        callLog.id,
        callLog.voiceAgentId || '',
        from,
        callDuration,
        transcriptText,
        recordingUrl,
        conversationDetails
      );
    } catch (emailError: any) {
      console.error('❌ [ElevenLabs Fetch] Failed to send email notification:', emailError.message);
      // Don't fail the overall process if email sending fails
    }

    return true;
  } catch (error: any) {
    console.error('❌ [ElevenLabs Fetch] Error:', error.message);
    throw error;
  }
}

/**
 * Send email notification to business owner about the call
 */
async function sendEmailNotification(
  callLogId: string,
  voiceAgentId: string,
  from: string,
  callDuration: string,
  transcriptText: string,
  recordingUrl: string | null,
  conversationDetails: any
) {
  console.log('📧 [Email Notification] Preparing email notification...');
  
  // Get voice agent and user details
  const voiceAgent = await prisma.voiceAgent.findUnique({
    where: { id: voiceAgentId },
    include: { user: { select: { email: true, name: true } } }
  });

  if (!voiceAgent) {
    console.error('❌ [Email Notification] Voice agent not found');
    return;
  }

  console.log('📧 [Email Notification] Voice Agent Config:', {
    id: voiceAgent.id,
    name: voiceAgent.name,
    sendRecordingEmail: voiceAgent.sendRecordingEmail,
    recordingEmailAddress: voiceAgent.recordingEmailAddress,
    userId: voiceAgent.userId
  });

  // Check if we should send email notification
  const shouldSendEmail = voiceAgent.sendRecordingEmail === true && voiceAgent.recordingEmailAddress;

  if (!shouldSendEmail) {
    console.log('ℹ️  [Email Notification] Email notification skipped:');
    console.log('   sendRecordingEmail:', voiceAgent.sendRecordingEmail);
    console.log('   recordingEmailAddress:', voiceAgent.recordingEmailAddress || 'not configured');
    return;
  }

  // Get call log for createdAt
  const callLog = await prisma.callLog.findUnique({
    where: { id: callLogId },
    select: { createdAt: true }
  });

  // Extract AI summary and conversation data
  let aiSummary = '';
  let callReason = '';
  try {
    aiSummary = conversationDetails.analysis?.summary || conversationDetails.summary || '';
    
    // Try to extract call reason/purpose from conversation data
    if (conversationDetails.analysis?.call_purpose) {
      callReason = conversationDetails.analysis.call_purpose;
    } else if (conversationDetails.metadata?.purpose) {
      callReason = conversationDetails.metadata.purpose;
    } else if (aiSummary) {
      // Extract first sentence of summary as reason
      const firstSentence = aiSummary.split('.')[0];
      if (firstSentence.length > 0 && firstSentence.length < 150) {
        callReason = firstSentence + '.';
      }
    }
  } catch (e) {
    console.log('⚠️  Could not parse conversation data for AI summary');
  }

  // Try to find caller in Leads database by phone number
  let callerName = from || 'Unknown';
  let callerEmail: string | undefined;
  const ctx = createDalContext(voiceAgent.userId);

  try {
    // Clean phone number for matching (remove +, spaces, dashes)
    const cleanPhone = (from || '').replace(/[\s\-\+\(\)]/g, '');
    
    // Check Leads
    const leads = await leadService.findMany(ctx, {
      where: {
        phone: { contains: cleanPhone.slice(-10) }
      },
      take: 1
    });
    let lead = leads[0];

    if (lead) {
      // Lead exists - update with call summary
      callerName = lead.contactPerson || lead.businessName || from || 'Unknown';
      callerEmail = lead.email || undefined;
      console.log('✅ Matched caller to existing Lead:', callerName);

      // Create a new note with call summary
      const callSummaryNote = `📞 Voice AI Call - ${new Date().toLocaleString()}\n\n` +
        `Call Duration: ${callDuration || '0'}s\n` +
        `Call Purpose: ${callReason || 'Not specified'}\n\n` +
        `Summary: ${aiSummary || 'No summary available'}\n\n` +
        `---\n${transcriptText || 'No transcript available'}`;

      await noteService.create(ctx, { leadId: lead.id, content: callSummaryNote });
      await leadService.update(ctx, lead.id, { lastContactedAt: new Date() });

      console.log('✅ Updated Lead with call summary note');
    } else {
      // No lead found - create new lead automatically
      console.log('🆕 Creating new Lead for unknown caller:', from);

      // Try to extract caller name from conversation data if available
      let extractedName = 'Unknown Caller';
      if (conversationDetails?.metadata?.customer_name) {
        extractedName = conversationDetails.metadata.customer_name;
      } else if (conversationDetails?.analysis?.caller_name) {
        extractedName = conversationDetails.analysis.caller_name;
      }

      // Create initial note content
      const initialNote = `📞 Initial Voice AI Call - ${new Date().toLocaleString()}\n\n` +
        `Call Duration: ${callDuration || '0'}s\n` +
        `Call Purpose: ${callReason || 'Not specified'}\n\n` +
        `Summary: ${aiSummary || 'Caller contacted via Voice AI. Follow up needed.'}\n\n` +
        `---\n${transcriptText || 'No transcript available'}`;

      const newLead = await leadService.create(ctx, {
        businessName: extractedName,
        contactPerson: extractedName,
        phone: from || '',
        source: 'Voice AI Call',
        status: 'NEW',
        lastContactedAt: new Date(),
      });
      await noteService.create(ctx, { leadId: newLead.id, content: initialNote });

      callerName = extractedName;
      console.log('✅ Created new Lead:', { id: newLead.id, name: extractedName, phone: from });
    }
  } catch (lookupError: any) {
    console.log('⚠️  Could not lookup/create caller in database:', lookupError.message);
    // Continue with phone number as name
  }

  // Format call duration
  const durationSecs = parseInt(callDuration || '0', 10);
  const minutes = Math.floor(durationSecs / 60);
  const seconds = durationSecs % 60;
  const formattedDuration = `${minutes}m ${seconds}s`;

  // Send the email
  console.log('📧 [Email Notification] Sending email with params:', {
    recipientEmail: voiceAgent.recordingEmailAddress,
    callerName: callerName,
    callerPhone: from,
    agentName: voiceAgent.name,
    hasTranscript: !!transcriptText,
    hasSummary: !!aiSummary,
    hasRecording: !!recordingUrl,
    userId: voiceAgent.userId
  });

  const emailSent = await emailService.sendCallSummaryEmail({
    recipientEmail: voiceAgent.recordingEmailAddress!,
    callerName: callerName,
    callerPhone: from || 'Unknown',
    callerEmail: callerEmail,
    callReason: callReason || undefined,
    agentName: voiceAgent.name || 'AI Agent',
    callDuration: formattedDuration,
    callDate: callLog?.createdAt || new Date(),
    transcript: transcriptText || undefined,
    summary: aiSummary || undefined,
    recordingUrl: recordingUrl ? `${process.env.NEXTAUTH_URL}${recordingUrl}` : undefined,
    userId: voiceAgent.userId,
    conversationData: conversationDetails
  });

  if (emailSent) {
    // Mark email as sent in the database
    await prisma.callLog.update({
      where: { id: callLogId },
      data: { emailSent: true, emailSentAt: new Date() }
    });

    console.log('✅ [Email Notification] Email sent successfully to:', voiceAgent.recordingEmailAddress);
    console.log('   Caller:', callerName, '|', from);
    if (callerEmail) console.log('   Email:', callerEmail);
    if (callReason) console.log('   Reason:', callReason);
  } else {
    console.error('❌ [Email Notification] Email service returned false - email was not sent');
    console.error('   This usually means all email providers (Gmail OAuth, SendGrid) failed');
  }
}
