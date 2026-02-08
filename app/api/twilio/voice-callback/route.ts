
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';
import { enhancedCallHandler } from '@/lib/integrations/enhanced-call-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Twilio Voice Callback Endpoint
 * 
 * Connects incoming Twilio calls to ElevenLabs AI agents via WebSocket streaming.
 * This endpoint is called by Twilio when a call comes in to a configured phone number.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📞 [Twilio Voice Callback] Received webhook');
    
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    console.log('  📋 Call Details:', { callSid, from, to, callStatus });

    // Find the voice agent
    const voiceAgent = await prisma.voiceAgent.findFirst({
      where: { twilioPhoneNumber: to },
      include: { user: true },
    });

    if (!voiceAgent) {
      console.error('❌ No voice agent found for number:', to);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, no agent is configured for this number.</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    if (!voiceAgent.elevenLabsAgentId) {
      console.error('❌ No ElevenLabs agent ID configured for voice agent:', voiceAgent.name);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">This agent is not properly configured. Please contact support.</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Enhanced call handling with screen pop
    let callLog;
    if (voiceAgent.type === 'INBOUND') {
      // Match patient and create enhanced call log
      const result = await enhancedCallHandler.handleIncomingCall(
        {
          callSid,
          fromNumber: from,
          toNumber: to,
          direction: 'inbound',
          status: 'ringing',
          timestamp: new Date(),
        },
        voiceAgent.userId, // Pass userId for workflow triggering
        undefined // clinicId would come from voiceAgent if available
      );
      callLog = result.callLog;

      // Send screen pop notification if patient matched
      if (result.patientMatch) {
        await enhancedCallHandler.sendScreenPopNotification(
          voiceAgent.userId,
          result.patientMatch,
          {
            callSid,
            fromNumber: from,
            toNumber: to,
            direction: 'inbound',
            status: 'ringing',
            timestamp: new Date(),
          }
        );
        console.log('✅ Screen pop sent for patient:', result.patientMatch.patientName);
      }
    } else {
      // Outbound call - simpler logging
      callLog = await prisma.callLog.create({
        data: {
          voiceAgentId: voiceAgent.id,
          userId: voiceAgent.userId,
          twilioCallSid: callSid,
          direction: 'OUTBOUND',
          fromNumber: from,
          toNumber: to,
          status: 'IN_PROGRESS',
        },
      });
    }

    console.log('✅ Call logged for agent:', voiceAgent.name);

    // Prepare current datetime context for the agent
    const now = new Date();
    const torontoTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
      hour12: false
    });
    
    const parts = torontoTime.formatToParts(now);
    const partsObj = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    const currentDate = `${partsObj.year}-${partsObj.month}-${partsObj.day}`;
    const currentTime = `${partsObj.hour}:${partsObj.minute}`;
    const dayOfWeek = partsObj.weekday;
    
    const dynamicVariables = {
      current_datetime: `${currentDate} ${currentTime}`,
      current_day: dayOfWeek,
      timezone: 'America/Toronto (EST/EDT)'
    };
    
    console.log('📅 Injecting datetime context:', dynamicVariables);

    // Get signed WebSocket URL from ElevenLabs with dynamic variables
    console.log('🔗 Fetching signed WebSocket URL from ElevenLabs...');
    let signedUrl: string;
    try {
      signedUrl = await elevenLabsService.getSignedWebSocketUrl(voiceAgent.elevenLabsAgentId, dynamicVariables);
      console.log('✅ Got signed WebSocket URL:', signedUrl.substring(0, 50) + '...');
    } catch (wsError: any) {
      console.error('❌ Failed to get WebSocket URL:', wsError.message);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Unable to connect to the voice agent. Please try again later.</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Verify the agent has a phone number assigned in ElevenLabs
    console.log('🔍 Verifying agent configuration...');
    try {
      const agentDetails = await elevenLabsService.getAgent(voiceAgent.elevenLabsAgentId);
      if (!agentDetails.phone_number_id) {
        console.error('❌ Agent has no phone number assigned in ElevenLabs');
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">This voice agent is not fully configured. Please contact support.</Say>
  <Hangup/>
</Response>`;
        return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }
      console.log('✅ Agent is properly configured with phone number ID:', agentDetails.phone_number_id);
    } catch (checkError: any) {
      console.error('⚠️ Could not verify agent configuration:', checkError.message);
      // Continue anyway, as this is just a verification step
    }

    // Return TwiML that connects to ElevenLabs via WebSocket
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${signedUrl}" />
  </Connect>
</Response>`;
    
    console.log('📤 Returning TwiML with WebSocket connection');
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });

  } catch (error: any) {
    console.error('❌ [Twilio Voice Callback] Error:', error.message);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, but an error occurred. Please try again later.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Twilio voice callback endpoint is running with ElevenLabs WebSocket integration'
  });
}
