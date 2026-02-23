/**
 * Business AI Voice API
 * Converts text to speech using ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { businessAIVoiceService } from '@/lib/business-ai/elevenlabs-voice';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return apiErrors.badRequest('Text is required');
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
    return apiErrors.internal(error.message || 'Failed to generate speech');
  }
}
