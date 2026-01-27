
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';

// GET /api/outbound-calls/[id] - Get specific outbound call

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
      return NextResponse.json(
        { error: 'Outbound call not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(outboundCall);
  } catch (error: any) {
    console.error('Error fetching outbound call:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outbound call' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const outboundCall = await prisma.outboundCall.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!outboundCall) {
      return NextResponse.json(
        { error: 'Outbound call not found' },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: 'Failed to update outbound call' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const outboundCall = await prisma.outboundCall.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!outboundCall) {
      return NextResponse.json(
        { error: 'Outbound call not found' },
        { status: 404 }
      );
    }

    // If call is in progress, can't delete
    if (outboundCall.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot delete call in progress' },
        { status: 400 }
      );
    }

    await prisma.outboundCall.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting outbound call:', error);
    return NextResponse.json(
      { error: 'Failed to delete outbound call' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
      return NextResponse.json(
        { error: 'Outbound call not found' },
        { status: 404 }
      );
    }

    if (!outboundCall.voiceAgent.elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'Voice agent not configured properly. Please complete the voice AI setup.' },
        { status: 400 }
      );
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

      return NextResponse.json(
        { error: callError.message || 'Failed to initiate call' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error initiating outbound call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate outbound call' },
      { status: 500 }
    );
  }
}
