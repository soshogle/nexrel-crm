/**
 * Docpen Agent Conversations API
 * 
 * GET - List conversations for an agent
 * POST - Sync conversations from ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

export const dynamic = 'force-dynamic';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: string;
  start_time_unix_secs: number;
  end_time_unix_secs?: number;
  transcript?: {
    role: string;
    message: string;
    time_in_call_secs: number;
  }[];
  analysis?: {
    call_successful?: boolean;
    call_duration?: number;
  };
  metadata?: Record<string, any>;
}

// GET - List conversations for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = params;

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

    // Get conversations from local database
    const conversations = await prisma.docpenConversation.findMany({
      where: {
        agentId: agentId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 100, // Limit to recent 100
    });

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error('❌ [Docpen Conversations] Error fetching:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST - Sync conversations from ElevenLabs
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = params;

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

    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 400 }
      );
    }

    console.log(`📥 [Docpen] Syncing conversations for agent: ${agent.elevenLabsAgentId}`);

    // Fetch conversations from ElevenLabs
    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/convai/conversations?agent_id=${agent.elevenLabsAgentId}`,
      {
        headers: { 'xi-api-key': apiKey },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch from ElevenLabs', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const elevenLabsConversations: ElevenLabsConversation[] = data.conversations || [];

    console.log(`📋 Found ${elevenLabsConversations.length} conversations from ElevenLabs`);

    let synced = 0;
    let totalDuration = 0;

    // Sync each conversation
    for (const conv of elevenLabsConversations) {
      try {
        // Check if already exists
        const existing = await prisma.docpenConversation.findUnique({
          where: { elevenLabsConvId: conv.conversation_id },
        });

        if (existing) continue; // Skip if already synced

        // Calculate duration
        const durationSec = conv.end_time_unix_secs && conv.start_time_unix_secs
          ? conv.end_time_unix_secs - conv.start_time_unix_secs
          : conv.analysis?.call_duration || 0;

        totalDuration += durationSec;

        // Format transcript
        const transcriptText = conv.transcript
          ? JSON.stringify(conv.transcript)
          : null;

        // Create conversation record
        await prisma.docpenConversation.create({
          data: {
            agentId: agentId,
            elevenLabsConvId: conv.conversation_id,
            status: conv.status,
            startedAt: new Date(conv.start_time_unix_secs * 1000),
            endedAt: conv.end_time_unix_secs
              ? new Date(conv.end_time_unix_secs * 1000)
              : null,
            durationSec,
            transcript: transcriptText,
            messageCount: conv.transcript?.length || 0,
            turnCount: conv.transcript
              ? Math.ceil((conv.transcript?.length || 0) / 2)
              : 0,
          },
        });

        synced++;
      } catch (convError: any) {
        console.error(`⚠️ Error syncing conversation ${conv.conversation_id}:`, convError);
      }
    }

    // Update agent stats
    if (synced > 0) {
      await prisma.docpenVoiceAgent.update({
        where: { id: agentId },
        data: {
          conversationCount: { increment: synced },
          totalDurationSec: { increment: totalDuration },
        },
      });
    }

    console.log(`✅ Synced ${synced} new conversations`);

    // Fetch updated list
    const conversations = await prisma.docpenConversation.findMany({
      where: { agentId },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      synced,
      total: conversations.length,
      conversations,
    });
  } catch (error: any) {
    console.error('❌ [Docpen Conversations] Error syncing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync conversations' },
      { status: 500 }
    );
  }
}
