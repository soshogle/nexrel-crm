
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Proxy endpoint for ElevenLabs audio
 * Required because browser cannot send xi-api-key header
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = params;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    console.log(`🎵 [Audio Proxy] Fetching audio for conversation: ${conversationId}`);

    // Fetch audio from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ [Audio Proxy] Failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch audio: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the audio blob
    const audioBlob = await response.blob();
    
    console.log(`✅ [Audio Proxy] Successfully proxied audio (${audioBlob.size} bytes)`);

    // Return the audio with appropriate headers
    return new NextResponse(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    console.error('❌ [Audio Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audio' },
      { status: 500 }
    );
  }
}
