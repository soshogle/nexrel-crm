/**
 * Docpen Single Conversation API
 * 
 * GET - Get conversation details with full transcript and audio
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// GET - Get detailed conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string; conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId, conversationId } = params;

    // Verify ownership
    const agent = await prisma.docpenVoiceAgent.findFirst({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get conversation from database
    const conversation = await prisma.docpenConversation.findFirst({
      where: {
        id: conversationId,
        agentId: agentId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // If we don't have full details, fetch from ElevenLabs
    let audioUrl = conversation.audioUrl;
    let transcript = conversation.transcript ? JSON.parse(conversation.transcript) : null;

    if (!audioUrl || !transcript) {
      const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
      if (apiKey) {
        try {
          const response = await fetch(
            `${ELEVENLABS_BASE_URL}/convai/conversations/${conversation.elevenLabsConvId}`,
            {
              headers: { 'xi-api-key': apiKey },
            }
          );

          if (response.ok) {
            const data = await response.json();
            
            // Update with full details
            if (data.transcript) {
              transcript = data.transcript;
              await prisma.docpenConversation.update({
                where: { id: conversation.id },
                data: {
                  transcript: JSON.stringify(data.transcript),
                },
              });
            }

            // Fetch audio if available
            if (data.metadata?.recording_url) {
              audioUrl = data.metadata.recording_url;
            }
          }
        } catch (e) {
          console.error('⚠️ Error fetching conversation details:', e);
        }
      }
    }

    // Try to get audio URL directly
    if (!audioUrl) {
      const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
      if (apiKey) {
        try {
          const audioResponse = await fetch(
            `${ELEVENLABS_BASE_URL}/convai/conversations/${conversation.elevenLabsConvId}/audio`,
            {
              headers: { 'xi-api-key': apiKey },
            }
          );

          if (audioResponse.ok) {
            // ElevenLabs returns the audio file directly or a signed URL
            const contentType = audioResponse.headers.get('content-type');
            if (contentType?.includes('audio')) {
              // It's the audio file - we can create a data URL or stream it
              audioUrl = `${ELEVENLABS_BASE_URL}/convai/conversations/${conversation.elevenLabsConvId}/audio`;
            } else {
              const audioData = await audioResponse.json();
              audioUrl = audioData.audio_url || audioData.url;
            }
          }
        } catch (e) {
          console.error('⚠️ Error fetching audio URL:', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        audioUrl,
        transcript,
      },
    });
  } catch (error: any) {
    console.error('❌ [Docpen Conversation] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
