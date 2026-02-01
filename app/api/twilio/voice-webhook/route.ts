
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { voiceConversationEngine } from '@/lib/voice-conversation';
import { elevenLabsService } from '@/lib/elevenlabs';

/**
 * Twilio Voice Webhook Handler
 * This endpoint receives calls from Twilio and handles the conversation flow
 */


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;
    const speechResult = formData.get('SpeechResult') as string;

    console.log('Twilio webhook called:', { callSid, from, to, callStatus, speechResult });

    // Find the voice agent associated with this phone number
    const voiceAgent = await prisma.voiceAgent.findFirst({
      where: {
        twilioPhoneNumber: to,
        status: 'ACTIVE',
      },
    });

    if (!voiceAgent) {
      // No active agent found for this number
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're sorry, this service is currently unavailable. Please try again later.</Say>
  <Hangup/>
</Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Check if call log exists
    let callLog = await prisma.callLog.findFirst({
      where: { twilioCallSid: callSid },
    });

    // Create call log if this is a new call
    if (!callLog) {
      callLog = await prisma.callLog.create({
        data: {
          userId: voiceAgent.userId,
          voiceAgentId: voiceAgent.id,
          direction: 'INBOUND',
          status: 'IN_PROGRESS',
          fromNumber: from,
          toNumber: to,
          twilioCallSid: callSid,
          conversationData: JSON.stringify({
            conversationHistory: [],
            collectedData: {},
          }),
        },
      });

      // First call - send greeting
      const greeting = voiceConversationEngine.generateGreeting(voiceAgent);
      
      // Build TwiML with optional recording
      const recordingAttrs = voiceAgent.enableCallRecording 
        ? ` record="record-from-answer" recordingStatusCallback="/api/twilio/recording-status" recordingStatusCallbackMethod="POST"`
        : '';
      
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response${recordingAttrs}>
  <Gather input="speech" action="/api/twilio/voice-webhook" method="POST" speechTimeout="auto" language="en-US">
    <Say>${greeting}</Say>
  </Gather>
  <Say>I didn't catch that. Let me connect you to someone who can help.</Say>
  <Dial>${voiceAgent.transferPhone || ''}</Dial>
</Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle ongoing conversation
    if (speechResult) {
      const conversationData = JSON.parse(callLog.conversationData || '{}');
      
      const context = {
        voiceAgent,
        conversationHistory: conversationData.conversationHistory || [],
        collectedData: conversationData.collectedData || {},
      };

      // Process user input
      const result = await voiceConversationEngine.processUserInput(
        speechResult,
        context
      );

      // Update call log with conversation
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          conversationData: JSON.stringify({
            conversationHistory: result.updatedContext.conversationHistory,
            collectedData: result.updatedContext.collectedData,
          }),
          transcription: result.updatedContext.conversationHistory
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join('\n'),
        },
      });

      // Handle appointment booking
      if (result.shouldBookAppointment) {
        const data = result.updatedContext.collectedData;
        
        try {
          // Create appointment in database
          const appointmentDate = new Date(data.appointmentDate || Date.now());
          
          await prisma.bookingAppointment.create({
            data: {
              userId: voiceAgent.userId,
              callLogId: callLog.id,
              customerName: data.name || 'Unknown',
              customerEmail: data.email || 'noemail@voice-booking.com',
              customerPhone: data.phone || from,
              appointmentDate,
              duration: voiceAgent.appointmentDuration || 30,
              status: 'SCHEDULED',
              notes: `Booked via voice AI. Purpose: ${data.purpose || 'Not specified'}`,
            },
          });

          // Update call outcome
          await prisma.callLog.update({
            where: { id: callLog.id },
            data: {
              outcome: 'APPOINTMENT_BOOKED',
              status: 'COMPLETED',
            },
          });

          return new NextResponse(
            `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Great! Your appointment has been booked. You'll receive a confirmation via text message. Is there anything else I can help you with?</Say>
  <Gather input="speech" action="/api/twilio/voice-webhook" method="POST" speechTimeout="auto">
    <Pause length="3"/>
  </Gather>
  <Say>Thank you for calling ${voiceAgent.businessName}. Have a great day!</Say>
  <Hangup/>
</Response>`,
            {
              headers: { 'Content-Type': 'text/xml' },
            }
          );
        } catch (error) {
          console.error('Appointment booking error:', error);
        }
      }

      // Handle transfer to human
      if (result.shouldTransfer && voiceAgent.transferPhone) {
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            outcome: 'TRANSFERRED_TO_HUMAN',
            status: 'COMPLETED',
          },
        });

        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Let me transfer you to someone who can help. Please hold.</Say>
  <Dial>${voiceAgent.transferPhone}</Dial>
</Response>`,
          {
            headers: { 'Content-Type': 'text/xml' },
          }
        );
      }

      // Handle call end
      if (result.shouldEnd) {
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            outcome: 'INFORMATION_PROVIDED',
            status: 'COMPLETED',
          },
        });

        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${result.response}</Say>
  <Say>Thank you for calling ${voiceAgent.businessName}. Goodbye!</Say>
  <Hangup/>
</Response>`,
          {
            headers: { 'Content-Type': 'text/xml' },
          }
        );
      }

      // Continue conversation
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/api/twilio/voice-webhook" method="POST" speechTimeout="auto" language="en-US">
    <Say>${result.response}</Say>
  </Gather>
  <Say>I'm sorry, I didn't hear you. Could you please repeat that?</Say>
  <Gather input="speech" action="/api/twilio/voice-webhook" method="POST" speechTimeout="3">
    <Pause length="2"/>
  </Gather>
  <Say>Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Fallback response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please hold while we connect you.</Say>
  <Dial>${voiceAgent.transferPhone || ''}</Dial>
</Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error: any) {
    console.error('Twilio webhook error:', error);
    
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}

// Handle call status updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const callSid = searchParams.get('CallSid');
  const callStatus = searchParams.get('CallStatus');
  const callDuration = searchParams.get('CallDuration');

  if (callSid && callStatus) {
    try {
      const updateData: any = {};
      
      if (callStatus === 'completed') {
        updateData.status = 'COMPLETED';
        if (callDuration) {
          updateData.duration = parseInt(callDuration);
        }
      } else if (callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
        updateData.status = callStatus.toUpperCase().replace('-', '_');
      }

      await prisma.callLog.updateMany({
        where: { twilioCallSid: callSid },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }

  return new NextResponse('OK');
}
