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


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    console.log('[Docpen Transcribe] 📁 Audio file received:', {
      size: audioBuffer.length,
      sessionId,
      fileName: audioFile.name,
      fileType: audioFile.type
    });

    // Check API key before attempting transcription
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[Docpen Transcribe] ❌ OPENAI_API_KEY not found in environment');
      return NextResponse.json(
        { 
          error: 'API key not configured',
          details: 'OPENAI_API_KEY environment variable is not set. Please add it to your Vercel environment variables.',
          hint: 'Go to Vercel Dashboard → Project Settings → Environment Variables → Add OPENAI_API_KEY'
        },
        { status: 500 }
      );
    }
    console.log('[Docpen Transcribe] ✅ API key found (first 10 chars):', apiKey.substring(0, 10) + '...');

    // Transcribe the audio
    console.log('[Docpen Transcribe] 🎤 Starting transcription...');
    let transcriptionResult;
    try {
      transcriptionResult = await transcribeAudio(audioBuffer, {
        practitionerName: practitionerName || user?.name || 'Practitioner',
      });
      console.log('[Docpen Transcribe] ✅ Transcription complete:', {
        segments: transcriptionResult.segments.length,
        duration: transcriptionResult.duration
      });
    } catch (transcribeError: any) {
      // Catch and normalize any errors from transcription service
      let errorMessage = transcribeError?.message || 'Transcription failed';
      
      // Normalize old error messages
      if (errorMessage.includes('Abacus') || errorMessage.includes('ABACUS') || errorMessage.includes('initialize LLM APIs')) {
        errorMessage = 'OpenAI API key not configured. Please add OPENAI_API_KEY to your Vercel environment variables.';
        console.warn('[Docpen Transcribe] ⚠️ Old error format detected - this indicates old code is running');
      }
      
      throw new Error(errorMessage);
    }

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

    // Update session with transcription complete and change status from PROCESSING to REVIEW_PENDING
    await prisma.docpenSession.update({
      where: { id: sessionId },
      data: {
        transcriptionComplete: true,
        sessionDuration: Math.round(transcriptionResult.duration),
        status: 'REVIEW_PENDING', // Move from PROCESSING to REVIEW_PENDING after transcription
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
  } catch (error: any) {
    console.error('[Docpen Transcribe] Error:', error);
    
    // Provide more detailed error information
    const errorMessage = error?.message || 'Unknown error';
    const isApiKeyMissing = errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('API key not configured') || errorMessage.includes('not configured');
    
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: errorMessage,
        hint: isApiKeyMissing 
          ? 'OPENAI_API_KEY environment variable is not configured. Please add it to your Vercel environment variables.'
          : undefined,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
