
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email-service';

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

    console.log('📞 Recording status callback:', {
      callSid,
      recordingSid,
      recordingStatus,
      recordingDuration,
      recordingUrl,
    });

    if (recordingStatus !== 'completed') {
      console.log(`⏳ Recording not yet completed: ${recordingStatus}`);
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
      console.error('❌ Call log not found for CallSid:', callSid);
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
    }

    // Construct the full recording URL (Twilio provides relative URL)
    const fullRecordingUrl = recordingUrl.startsWith('http') 
      ? recordingUrl 
      : `https://api.twilio.com${recordingUrl}`;

    console.log('✅ Full recording URL:', fullRecordingUrl);

    // Check if voice agent has recording/transcription enabled
    const voiceAgent = callLog.voiceAgent;
    if (!voiceAgent) {
      console.warn('⚠️ No voice agent associated with this call');
      return NextResponse.json({ success: true, message: 'No voice agent found' });
    }

    // Update call log with recording URL
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        recordingUrl: fullRecordingUrl,
      },
    });

    console.log(`✅ Updated call log ${callLog.id} with recording URL`);

    // Fetch transcription if enabled
    let transcript = callLog.transcription || '';
    
    if (voiceAgent.enableTranscription && recordingSid) {
      try {
        console.log('📝 Fetching transcription for recording:', recordingSid);
        transcript = await fetchTwilioTranscription(recordingSid);
        
        if (transcript) {
          // Update call log with transcript
          await prisma.callLog.update({
            where: { id: callLog.id },
            data: {
              transcription: transcript,
            },
          });
          
          console.log('✅ Transcription updated successfully');
        }
      } catch (transcriptionError) {
        console.error('❌ Error fetching transcription:', transcriptionError);
        // Continue execution even if transcription fails
      }
    }

    // Note: Call transcripts are already stored in the CallLog model
    // and can be viewed in the call history section
    if (transcript && callLog.lead) {
      console.log(`✅ Transcript stored in call log and linked to lead ${callLog.lead.id}`);
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
        console.log('✅ Recording email sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending recording email:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Recording processed successfully',
      recordingUrl: fullRecordingUrl,
      hasTranscript: !!transcript,
    });

  } catch (error: any) {
    console.error('❌ Recording status webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
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

    // Request transcription from Twilio
    const transcriptionUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}/Transcriptions.json`;
    
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // First, create transcription request
    const createResponse = await fetch(transcriptionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!createResponse.ok) {
      console.warn('⚠️ Failed to create transcription request:', createResponse.statusText);
      return '';
    }

    const transcriptionData = await createResponse.json();
    console.log('📝 Transcription created:', transcriptionData);

    // If transcription is completed immediately, return it
    if (transcriptionData.transcription_text) {
      return transcriptionData.transcription_text;
    }

    // Otherwise, poll for transcription (in production, use webhook)
    // For now, wait a few seconds and check
    await new Promise(resolve => setTimeout(resolve, 5000));

    const getResponse = await fetch(transcriptionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (getResponse.ok) {
      const transcriptions = await getResponse.json();
      if (transcriptions.transcriptions && transcriptions.transcriptions.length > 0) {
        return transcriptions.transcriptions[0].transcription_text || '';
      }
    }

    return '';
  } catch (error) {
    console.error('❌ Error fetching Twilio transcription:', error);
    return '';
  }
}
