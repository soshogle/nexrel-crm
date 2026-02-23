import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/voice-agents/preview-conversation
 * Save a preview conversation to the database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Missing required fields');
    }

    // Verify the voice agent belongs to this user
    const voiceAgent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgentId },
    });

    if (!voiceAgent || voiceAgent.userId !== session.user.id) {
      return apiErrors.forbidden('Unauthorized');
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
    return apiErrors.internal(error.message || 'Failed to save preview conversation');
  }
}
