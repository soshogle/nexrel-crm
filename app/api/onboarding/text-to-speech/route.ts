
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsTTS } from '@/lib/elevenlabs-tts';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { text } = await request.json();

    if (!text) {
      return apiErrors.badRequest('Text is required');
    }

    // Generate speech using ElevenLabs
    const result = await elevenLabsTTS.textToSpeech(text, {
      stability: 0.5,
      similarityBoost: 0.75,
    });

    return NextResponse.json({
      audioBase64: result.audioBase64,
      success: true,
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    return apiErrors.internal(error.message || 'Failed to generate speech');
  }
}
