
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/calls/fetch-recording
 * Manually fetch recording and transcript for a specific call
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callLogId } = await request.json();

    if (!callLogId) {
      return NextResponse.json({ error: 'Missing callLogId' }, { status: 400 });
    }

    // Find the call log
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    });

    if (!callLog) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
    }

    // Verify ownership
    if (callLog.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if we have an ElevenLabs conversation ID
    if (!callLog.elevenLabsConversationId) {
      return NextResponse.json(
        { error: 'No ElevenLabs conversation ID found for this call' },
        { status: 400 }
      );
    }

    console.log('🎙️ [Fetch Recording] Fetching data for call:', callLogId);

    const conversationId = callLog.elevenLabsConversationId;

    // Fetch recording URL
    const recordingUrl = await elevenLabsService.getRecordingUrl(conversationId);

    // Fetch transcript
    const transcript = await elevenLabsService.getTranscript(conversationId);

    // Fetch full conversation data
    let conversationData = null;
    try {
      const details = await elevenLabsService.getConversationDetails(conversationId);
      conversationData = JSON.stringify(details);
    } catch (detailsError) {
      console.warn('⚠️  Could not fetch full conversation details:', detailsError);
    }

    // Update call log
    const updatedCallLog = await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        ...(recordingUrl && { recordingUrl }),
        ...(transcript && { transcription: transcript }),
        ...(conversationData && { conversationData }),
      },
    });

    console.log('✅ [Fetch Recording] Updated call log:', {
      callLogId,
      hasRecording: !!recordingUrl,
      hasTranscript: !!transcript,
      hasConversationData: !!conversationData,
    });

    return NextResponse.json({
      success: true,
      callLog: updatedCallLog,
      hasRecording: !!recordingUrl,
      hasTranscript: !!transcript,
    });
  } catch (error: any) {
    console.error('❌ [Fetch Recording] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recording' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calls/fetch-recording/all
 * Backfill recordings for all completed calls without recordings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all completed calls without recordings
    const callsNeedingRecordings = await prisma.callLog.findMany({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        recordingUrl: null,
        elevenLabsConversationId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to prevent timeout
    });

    console.log(`🎙️ [Backfill Recordings] Found ${callsNeedingRecordings.length} calls to backfill`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const callLog of callsNeedingRecordings) {
      try {
        const conversationId = callLog.elevenLabsConversationId!;

        // Fetch recording URL
        const recordingUrl = await elevenLabsService.getRecordingUrl(conversationId);

        // Fetch transcript
        const transcript = await elevenLabsService.getTranscript(conversationId);

        // Fetch full conversation data
        let conversationData = null;
        try {
          const details = await elevenLabsService.getConversationDetails(conversationId);
          conversationData = JSON.stringify(details);
        } catch (detailsError) {
          console.warn('⚠️  Could not fetch conversation details for:', callLog.id);
        }

        // Update call log
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            ...(recordingUrl && { recordingUrl }),
            ...(transcript && { transcription: transcript }),
            ...(conversationData && { conversationData }),
          },
        });

        successCount++;
        results.push({
          callLogId: callLog.id,
          success: true,
          hasRecording: !!recordingUrl,
          hasTranscript: !!transcript,
        });
      } catch (error: any) {
        console.error(`❌ Failed to backfill call ${callLog.id}:`, error);
        failCount++;
        results.push({
          callLogId: callLog.id,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`✅ [Backfill Recordings] Complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      totalProcessed: callsNeedingRecordings.length,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('❌ [Backfill Recordings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to backfill recordings' },
      { status: 500 }
    );
  }
}
