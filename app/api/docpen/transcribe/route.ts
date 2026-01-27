/**
 * AI Docpen - Transcription API
 * 
 * Endpoints:
 * - POST: Transcribe audio with speaker diarization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { transcribeAudio, processWhisperOutput } from '@/lib/docpen/transcription-service';
import { sanitizeForLogging, createAuditLogEntry } from '@/lib/docpen/security';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const sessionId = formData.get('sessionId') as string;
    const practitionerName = formData.get('practitionerName') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session belongs to user
    const docpenSession = await prisma.docpenSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    });

    if (!docpenSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update session status to processing
    await prisma.docpenSession.update({
      where: { id: sessionId },
      data: { status: 'PROCESSING' },
    });

    // Get user info for practitioner name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    // Convert file to buffer for processing
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Transcribe the audio
    const transcriptionResult = await transcribeAudio(audioBuffer, {
      practitionerName: practitionerName || user?.name || 'Practitioner',
    });

    // Save transcription segments to database
    const savedTranscriptions = await Promise.all(
      transcriptionResult.segments.map(segment =>
        prisma.docpenTranscription.create({
          data: {
            sessionId,
            speakerRole: segment.speakerRole as any,
            speakerLabel: segment.speakerLabel,
            content: segment.content,
            startTime: segment.startTime,
            endTime: segment.endTime,
            confidence: segment.confidence,
          },
        })
      )
    );

    // Update session with transcription complete
    await prisma.docpenSession.update({
      where: { id: sessionId },
      data: {
        transcriptionComplete: true,
        sessionDuration: Math.round(transcriptionResult.duration),
      },
    });

    // Log audit entry
    console.log('[Docpen Audit]', sanitizeForLogging(
      createAuditLogEntry('create', 'transcription', sessionId, session.user.id, request)
    ));

    return NextResponse.json({
      success: true,
      transcriptions: savedTranscriptions,
      duration: transcriptionResult.duration,
      segmentCount: savedTranscriptions.length,
    });
  } catch (error) {
    console.error('[Docpen Transcribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
