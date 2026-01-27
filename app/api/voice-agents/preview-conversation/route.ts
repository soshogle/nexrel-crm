import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/voice-agents/preview-conversation
 * Save a preview conversation to the database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      voiceAgentId,
      elevenLabsConversationId,
      transcript,
      duration,
      conversationData,
      recordingUrl,
    } = body;

    if (!voiceAgentId || !elevenLabsConversationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the voice agent belongs to this user
    const voiceAgent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgentId },
    });

    if (!voiceAgent || voiceAgent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create a call log entry with PREVIEW category
    const callLog = await prisma.callLog.create({
      data: {
        userId: session.user.id,
        voiceAgentId: voiceAgentId,
        fromNumber: 'PREVIEW',
        toNumber: 'BROWSER',
        direction: 'PREVIEW',
        status: 'COMPLETED',
        duration: duration || 0,
        elevenLabsConversationId: elevenLabsConversationId,
        transcription: transcript || null,
        recordingUrl: recordingUrl || null,
        conversationData: conversationData || {},
      },
    });

    console.log('✅ Preview conversation saved:', callLog.id);

    return NextResponse.json({
      success: true,
      callLogId: callLog.id,
    });
  } catch (error: any) {
    console.error('Error saving preview conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save preview conversation' },
      { status: 500 }
    );
  }
}
