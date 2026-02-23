
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/outbound-calls/[id]/initiate - Initiate the call now
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const outboundCall = await prisma.outboundCall.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        voiceAgent: true,
      },
    });

    if (!outboundCall) {
      return apiErrors.notFound('Outbound call not found');
    }

    if (!outboundCall.voiceAgent) {
      return apiErrors.notFound('Voice agent not found for this call');
    }

    if (!outboundCall.voiceAgent.elevenLabsAgentId) {
      return apiErrors.badRequest('Voice agent not configured. Please complete the voice AI configuration first.');
    }

    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return apiErrors.badRequest('Phone service not configured properly. Please contact support.');
    }

    // Update status to in progress
    await prisma.outboundCall.update({
      where: { id: params.id },
      data: {
        status: 'IN_PROGRESS',
        attemptCount: outboundCall.attemptCount + 1,
        lastAttemptAt: new Date(),
      },
    });

    try {
      console.log('🔊 Initiating test call:', {
        agentId: outboundCall.voiceAgent.elevenLabsAgentId,
        phoneNumber: outboundCall.phoneNumber,
        agentName: outboundCall.voiceAgent.name,
      });

      // Initiate call via ElevenLabs
      const callResult = await elevenLabsService.initiatePhoneCall(
        outboundCall.voiceAgent.elevenLabsAgentId,
        outboundCall.phoneNumber
      );

      console.log('✅ Call initiated successfully:', callResult);

      // Create call log
      const callLog = await prisma.callLog.create({
        data: {
          userId: user.id,
          voiceAgentId: outboundCall.voiceAgentId,
          leadId: outboundCall.leadId || undefined,
          direction: 'OUTBOUND',
          status: 'INITIATED',
          fromNumber: outboundCall.voiceAgent.twilioPhoneNumber || 'Test Agent',
          toNumber: outboundCall.phoneNumber,
          twilioCallSid: callResult.call_id || undefined,
        },
      });

      // Link call log to outbound call
      await prisma.outboundCall.update({
        where: { id: params.id },
        data: {
          callLogId: callLog.id,
          status: 'COMPLETED',
        },
      });

      return NextResponse.json({
        success: true,
        callId: callResult.call_id,
        message: 'Test call initiated successfully. You should receive a call shortly.',
        callLog: {
          id: callLog.id,
          status: callLog.status,
          direction: callLog.direction,
        },
      });
    } catch (callError: any) {
      console.error('❌ Error initiating call:', callError);
      console.error('Error details:', {
        message: callError.message,
        stack: callError.stack,
        response: callError.response?.data,
      });

      // Update status to failed or no_answer based on attempt count
      const newStatus = outboundCall.attemptCount + 1 >= outboundCall.maxAttempts ? 'FAILED' : 'NO_ANSWER';
      
      await prisma.outboundCall.update({
        where: { id: params.id },
        data: {
          status: newStatus,
        },
      });

      return NextResponse.json(
        { 
          error: callError.message || 'Failed to initiate call',
          details: callError.response?.data || callError.toString(),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error in initiate endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate outbound call',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
