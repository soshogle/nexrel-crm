/**
 * Docpen Voices API
 * 
 * GET - List available voices from ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Pre-defined medical-friendly voices
const RECOMMENDED_VOICES = [
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', description: 'Calm and professional', recommended: true },
  { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', description: 'Authoritative and clear', recommended: true },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', description: 'Neutral and friendly', recommended: true },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', description: 'British, professional', recommended: true },
  { voice_id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', gender: 'female', description: 'Animated and clear', recommended: true },
];

// GET - List available voices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    
    if (!apiKey) {
      // Return recommended voices without API call
      return NextResponse.json({
        success: true,
        voices: RECOMMENDED_VOICES,
        fromApi: false,
      });
    }

    // Fetch voices from ElevenLabs
    try {
      const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
        headers: { 'xi-api-key': apiKey },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      const allVoices = data.voices || [];

      // Format voices
      const formattedVoices = allVoices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        gender: voice.labels?.gender || 'unknown',
        accent: voice.labels?.accent || 'American',
        description: voice.labels?.description || voice.description,
        preview_url: voice.preview_url,
        recommended: RECOMMENDED_VOICES.some(rv => rv.voice_id === voice.voice_id),
      }));

      // Sort recommended voices first
      formattedVoices.sort((a: any, b: any) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json({
        success: true,
        voices: formattedVoices,
        fromApi: true,
      });
    } catch (apiError) {
      console.error('⚠️ Error fetching voices from ElevenLabs:', apiError);
      return NextResponse.json({
        success: true,
        voices: RECOMMENDED_VOICES,
        fromApi: false,
      });
    }
  } catch (error: any) {
    console.error('❌ [Docpen Voices] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
