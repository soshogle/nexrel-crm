
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';
import { apiErrors } from '@/lib/api-error';

// GET /api/outbound-calls/[id] - Get specific outbound call

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
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
        lead: true,
        callLog: true,
      },
    });

    if (!outboundCall) {
      return apiErrors.notFound('Outbound call not found');
    }

    return NextResponse.json(outboundCall);
  } catch (error: any) {
    console.error('Error fetching outbound call:', error);
    return apiErrors.internal('Failed to fetch outbound call');
  }
}

// PATCH /api/outbound-calls/[id] - Update outbound call
export async function PATCH(
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

    const body = await request.json();

    const outboundCall = await prisma.outboundCall.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!outboundCall) {
      return apiErrors.notFound('Outbound call not found');
    }

    const updated = await prisma.outboundCall.update({
      where: { id: params.id },
      data: {
        status: body.status,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        notes: body.notes,
        purpose: body.purpose,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating outbound call:', error);
    return apiErrors.internal('Failed to update outbound call');
  }
}

// DELETE /api/outbound-calls/[id] - Cancel/Delete outbound call
export async function DELETE(
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
    });

    if (!outboundCall) {
      return apiErrors.notFound('Outbound call not found');
    }

    // If call is in progress, can't delete
    if (outboundCall.status === 'IN_PROGRESS') {
      return apiErrors.badRequest('Cannot delete call in progress');
    }

    await prisma.outboundCall.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting outbound call:', error);
    return apiErrors.internal('Failed to delete outbound call');
  }
}

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

    if (!outboundCall.voiceAgent.elevenLabsAgentId) {
      return apiErrors.badRequest('Voice agent not configured properly. Please complete the voice AI setup.');
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
      // Initiate call via ElevenLabs
      const callResult = await elevenLabsService.initiatePhoneCall(
        outboundCall.voiceAgent.elevenLabsAgentId,
        outboundCall.phoneNumber
      );

      // Create call log
      const callLog = await prisma.callLog.create({
        data: {
          userId: user.id,
          voiceAgentId: outboundCall.voiceAgentId,
          leadId: outboundCall.leadId || undefined,
          direction: 'OUTBOUND',
          status: 'INITIATED',
          fromNumber: outboundCall.voiceAgent.twilioPhoneNumber || 'Unknown',
          toNumber: outboundCall.phoneNumber,
          twilioCallSid: callResult.call_id || undefined,
        },
      });

      // Link call log to outbound call
      await prisma.outboundCall.update({
        where: { id: params.id },
        data: {
          callLogId: callLog.id,
        },
      });

      return NextResponse.json({
        success: true,
        callId: callResult.call_id,
        callLog,
      });
    } catch (callError: any) {
      console.error('Error initiating call:', callError);

      // Update status to failed or no_answer
      await prisma.outboundCall.update({
        where: { id: params.id },
        data: {
          status: outboundCall.attemptCount + 1 >= outboundCall.maxAttempts ? 'FAILED' : 'NO_ANSWER',
        },
      });

      return apiErrors.internal(callError.message || 'Failed to initiate call');
    }
  } catch (error: any) {
    console.error('Error initiating outbound call:', error);
    return apiErrors.internal('Failed to initiate outbound call');
  }
}
