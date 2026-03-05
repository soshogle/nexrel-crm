import type { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { createDalContext } from '@/lib/context/industry-context';
import {
  resolveVoiceAgentByPhone,
  resolveCallLogBySid,
  leadService,
  noteService,
} from '@/lib/dal';
import {
  triggerCallCompletedWorkflow,
  triggerMissedCallWorkflow,
} from '@/lib/dental/workflow-triggers';
import { apiErrors } from '@/lib/api-error';

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


    if (!callSid) {
      return apiErrors.badRequest('Missing CallSid');
    }

    // Find the call log by Twilio SID (searches default + industry DBs)
    let resolved = await resolveCallLogBySid(callSid);
    let callLog = resolved?.callLog ?? null;
    let db = resolved?.db ?? null;

    // If no call log exists, create it (for Native ElevenLabs Integration)
    if (!callLog) {

      const voiceResolved = await resolveVoiceAgentByPhone(to);
      if (voiceResolved) {
        const { voiceAgent, db: voiceDb } = voiceResolved;
        callLog = await voiceDb.callLog.create({
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
        db = voiceDb;
      } else {
        console.warn('⚠️  [Twilio Call Status] No voice agent found for number:', to);
        return NextResponse.json({ message: 'Voice agent not found' }, { status: 404 });
      }
    }

    if (!callLog || !db) {
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
    const updatedCallLog = await db.callLog.update({
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
          callLog.leadId as string || null,
          callLog.userId,
          parseInt(callDuration, 10),
          'completed'
        );
      } else if (callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'failed') {
        // Trigger missed call workflow
        await triggerMissedCallWorkflow(
          callLog.id,
          callLog.leadId as string || null,
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
      await db.outboundCall.updateMany({
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
      // Fire-and-forget: schedule the ElevenLabs fetch as a background task
      // Don't await this - respond to Twilio immediately to avoid timeout
      scheduleElevenLabsFetch(db, callLog.id, callDuration || '0', from || '', to || '');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ [Twilio Call Status] Error:', error);
    return apiErrors.internal();
  }
}

/**
 * Background function to fetch ElevenLabs data with retry logic
 * Runs independently from the webhook response to avoid timeout issues
 */
async function scheduleElevenLabsFetch(
  db: PrismaClient,
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
  await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY_MS));

  while (attempt < MAX_ATTEMPTS && !success) {
    attempt++;

    try {
      success = await fetchAndProcessElevenLabsData(db, callLogId, callDuration, from, to);

      if (!success && attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
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
  db: PrismaClient,
  callLogId: string,
  callDuration: string,
  from: string,
  to: string
): Promise<boolean> {
  try {
    // Get the call log to verify it hasn't been processed yet
    const callLog = await db.callLog.findUnique({
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

    // Find conversation that matches our call
    const callTime = callLog.createdAt || new Date();
    const callDurationNum = parseInt(callDuration || '0', 10);
    let matchedConversation = null;
    let bestMatch = null;
    let bestScore = Infinity;


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
        }
      }
    }

    if (bestMatch) {
      matchedConversation = bestMatch;
    } else {
      return false;
    }

    // Fetch full conversation details
    const conversationId = matchedConversation.conversation_id;

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
    await db.callLog.update({
      where: { id: callLog.id },
      data: {
        elevenLabsConversationId: conversationId,
        transcription: transcriptText || null,
        recordingUrl: recordingUrl || null,
        conversationData: JSON.stringify(conversationDetails),
      },
    });


    // Send email notification to business owner
    try {
      await sendEmailNotification(
        db,
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
  db: PrismaClient,
  callLogId: string,
  voiceAgentId: string,
  from: string,
  callDuration: string,
  transcriptText: string,
  recordingUrl: string | null,
  conversationDetails: any
) {

  // Get voice agent and user details (same db as CallLog)
  const voiceAgent = await db.voiceAgent.findUnique({
    where: { id: voiceAgentId },
    include: { user: { select: { email: true, name: true, industry: true } } }
  });

  if (!voiceAgent) {
    console.error('❌ [Email Notification] Voice agent not found');
    return;
  }


  // Check if we should send email notification
  const shouldSendEmail = voiceAgent.sendRecordingEmail === true && voiceAgent.recordingEmailAddress;

  if (!shouldSendEmail) {
    return;
  }

  // Get call log for createdAt
  const callLog = await db.callLog.findUnique({
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
  }

  // Try to find caller in Leads database by phone number
  let callerName = from || 'Unknown';
  let callerEmail: string | undefined;
  const ctx = createDalContext(voiceAgent.userId, voiceAgent.user?.industry ?? undefined);

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

      // Create a new note with call summary
      const callSummaryNote = `📞 Voice AI Call - ${new Date().toLocaleString()}\n\n` +
        `Call Duration: ${callDuration || '0'}s\n` +
        `Call Purpose: ${callReason || 'Not specified'}\n\n` +
        `Summary: ${aiSummary || 'No summary available'}\n\n` +
        `---\n${transcriptText || 'No transcript available'}`;

      await noteService.create(ctx, { leadId: lead.id, content: callSummaryNote });
      await leadService.update(ctx, lead.id, { lastContactedAt: new Date() });

    } else {
      // No lead found - create new lead automatically

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
    }
  } catch (lookupError: any) {
    console.error('[Email Notification] Failed to lookup/create caller:', lookupError.message);
    // Continue with phone number as name
  }

  // Format call duration
  const durationSecs = parseInt(callDuration || '0', 10);
  const minutes = Math.floor(durationSecs / 60);
  const seconds = durationSecs % 60;
  const formattedDuration = `${minutes}m ${seconds}s`;

  // Send the email

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
    await db.callLog.update({
      where: { id: callLogId },
      data: { emailSent: true, emailSentAt: new Date() }
    });

  } else {
    console.error('❌ [Email Notification] Email service returned false - email was not sent');
    console.error('   This usually means all email providers (Gmail OAuth, SendGrid) failed');
  }
}
