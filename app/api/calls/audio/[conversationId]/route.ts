
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calls/audio/[conversationId]
 * Proxy endpoint to fetch ElevenLabs audio with authentication
 * This allows the browser to play audio without needing API keys
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

    // Verify that this call belongs to the user
    // Check both elevenLabsConversationId and twilioCallSid for backward compatibility
    const callLog = await prisma.callLog.findFirst({
      where: {
        OR: [
          { elevenLabsConversationId: conversationId },
          { twilioCallSid: conversationId },
        ],
        userId: session.user.id,
      },
    });

    if (!callLog) {
      return NextResponse.json(
        { error: 'Call not found or unauthorized' },
        { status: 404 }
      );
    }

    // Fetch audio from ElevenLabs with authentication
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    console.log('🎙️ [Audio Proxy] Fetching audio for conversation:', conversationId);

    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      {
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      }
    );

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error('❌ [Audio Proxy] Failed to fetch audio:', {
        status: audioResponse.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: 'Failed to fetch audio from ElevenLabs' },
        { status: audioResponse.status }
      );
    }

    // Get audio as blob and stream it to client
    const audioBlob = await audioResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    console.log('✅ [Audio Proxy] Audio fetched successfully, size:', audioBuffer.byteLength);

    // Return audio with appropriate headers
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': audioResponse.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
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
