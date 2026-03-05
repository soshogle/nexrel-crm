
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Twilio Recording Status Callback Handler
 * This endpoint receives recording completion events from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const callSid = formData.get('CallSid') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingStatus = formData.get('RecordingStatus') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;
    const recordingChannels = formData.get('RecordingChannels') as string;

    if (recordingStatus !== 'completed') {
      return NextResponse.json({ success: true, message: 'Recording not completed yet' });
    }

    // Find the call log
    const callLog = await prisma.callLog.findFirst({
      where: { twilioCallSid: callSid },
      include: {
        voiceAgent: true,
        lead: true,
        user: true,
      },
    });

    if (!callLog) {
      console.error('[recording-status] Call log not found for CallSid:', callSid);
      return apiErrors.notFound('Call log not found');
    }

    // Construct the full recording URL (Twilio provides relative URL)
    const fullRecordingUrl = recordingUrl.startsWith('http')
      ? recordingUrl
      : `https://api.twilio.com${recordingUrl}`;

    // Check if voice agent has recording/transcription enabled
    const voiceAgent = callLog.voiceAgent;
    if (!voiceAgent) {
      return NextResponse.json({ success: true, message: 'No voice agent found' });
    }

    // Update call log with recording URL
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: { recordingUrl: fullRecordingUrl },
    });

    // Fetch transcription if enabled
    let transcript = callLog.transcription || '';

    if (voiceAgent.enableTranscription && recordingSid) {
      try {
        transcript = await fetchTwilioTranscription(recordingSid);

        if (transcript) {
          await prisma.callLog.update({
            where: { id: callLog.id },
            data: { transcription: transcript },
          });
        }
      } catch (transcriptionError) {
        console.error('[recording-status] Error fetching transcription:', transcriptionError);
        // Continue execution even if transcription fails
      }
    }

    if (voiceAgent.sendRecordingEmail && voiceAgent.recordingEmailAddress) {
      try {
        const { emailService } = await import('@/lib/email-service');
        const contactName = callLog.lead?.contactPerson
          || callLog.lead?.businessName
          || 'Unknown';

        await emailService.sendCallSummaryEmail({
          recipientEmail: voiceAgent.recordingEmailAddress,
          callerName: contactName,
          callerPhone: callLog.fromNumber || 'Unknown',
          agentName: voiceAgent.name,
          callDuration: callLog.duration ? `${Math.ceil(callLog.duration / 60)} min` : 'N/A',
          callDate: callLog.createdAt,
          transcript: transcript || callLog.transcription || undefined,
          summary: (callLog.conversationAnalysis as any)?.summary || undefined,
          recordingUrl: fullRecordingUrl,
          userId: callLog.userId,
        });
      } catch (emailError) {
        console.error('[recording-status] Error sending recording email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recording processed successfully',
      recordingUrl: fullRecordingUrl,
      hasTranscript: !!transcript,
    });

  } catch (error: any) {
    console.error('[recording-status] Webhook error:', error);
    return apiErrors.internal('Internal server error', error.message);
  }
}

/**
 * Fetch transcription from Twilio
 */
async function fetchTwilioTranscription(recordingSid: string): Promise<string> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    const transcriptionUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}/Transcriptions.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const createResponse = await fetch(transcriptionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!createResponse.ok) {
      return '';
    }

    const transcriptionData = await createResponse.json();

    if (transcriptionData.transcription_text) {
      return transcriptionData.transcription_text;
    }

    // Poll once after a short wait (production should use Twilio transcription webhook instead)
    await new Promise(resolve => setTimeout(resolve, 5000));

    const getResponse = await fetch(transcriptionUrl, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (getResponse.ok) {
      const transcriptions = await getResponse.json();
      if (transcriptions.transcriptions?.length > 0) {
        return transcriptions.transcriptions[0].transcription_text || '';
      }
    }

    return '';
  } catch (error) {
    console.error('[recording-status] Error fetching Twilio transcription:', error);
    return '';
  }
}
