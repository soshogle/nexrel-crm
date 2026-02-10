/**
 * Business AI Voice API
 * Converts text to speech using ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { businessAIVoiceService } from '@/lib/business-ai/elevenlabs-voice';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Convert to speech using ElevenLabs
    const result = await businessAIVoiceService.speakResponse(text, session.user.id);

    if (result.success && result.audioUrl) {
      return NextResponse.json({
        success: true,
        audioUrl: result.audioUrl,
      });
    }

    // Fallback: return success but indicate fallback will be used
    return NextResponse.json({
      success: true,
      fallback: true,
    });
  } catch (error: any) {
    console.error('Business AI voice API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
