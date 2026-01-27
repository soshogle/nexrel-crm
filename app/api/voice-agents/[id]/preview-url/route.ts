import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/voice-agents/[id]/preview-url
 * 
 * Fetches a signed WebSocket URL from ElevenLabs for browser-based voice agent preview.
 * This URL allows direct WebSocket connection to the ElevenLabs agent from the browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the voice agent from the database
    const voiceAgent = await prisma.voiceAgent.findUnique({
      where: { id: params.id },
    });

    if (!voiceAgent) {
      return NextResponse.json(
        { error: 'Voice agent not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (voiceAgent.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this voice agent' },
        { status: 403 }
      );
    }

    // Verify the agent has an ElevenLabs Agent ID
    if (!voiceAgent.elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'Voice agent is not configured. Please run auto-configuration first.' },
        { status: 400 }
      );
    }

    // Get the ElevenLabs API key from environment or key manager
    const { elevenLabsKeyManager } = await import('@/lib/elevenlabs-key-manager');
    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No ElevenLabs API key configured' },
        { status: 400 }
      );
    }

    // Fetch the signed WebSocket URL from ElevenLabs
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${voiceAgent.elevenLabsAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('❌ ElevenLabs API error:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to get signed URL from ElevenLabs',
          details: errorText
        },
        { status: elevenLabsResponse.status }
      );
    }

    const data = await elevenLabsResponse.json();
    
    // The response should contain a signed_url field
    if (!data.signed_url) {
      console.error('❌ No signed_url in ElevenLabs response:', data);
      return NextResponse.json(
        { error: 'Invalid response from ElevenLabs' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully fetched preview URL for agent:', voiceAgent.elevenLabsAgentId);

    return NextResponse.json({
      success: true,
      signedUrl: data.signed_url,
      agentId: voiceAgent.elevenLabsAgentId,
      agentName: voiceAgent.name,
    });

  } catch (error: any) {
    console.error('❌ Error fetching preview URL:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
