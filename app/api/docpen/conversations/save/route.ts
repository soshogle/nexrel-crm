/**
 * API Route: Save Docpen Conversation
 * 
 * POST - Save a conversation from a voice session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      agentId,
      sessionId,
      patientName,
      startedAt,
      endedAt,
      durationSec,
      transcript,
      messageCount,
      turnCount,
      elevenLabsConvId,
      audioUrl,
    } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Verify agent belongs to user
    const agent = await prisma.docpenVoiceAgent.findFirst({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Use provided ElevenLabs conversation ID or generate a local one
    const convId = elevenLabsConvId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if conversation already exists (by ElevenLabs ID)
    const existing = await prisma.docpenConversation.findUnique({
      where: { elevenLabsConvId: convId },
    });

    if (existing) {
      // Update existing conversation
      const conversation = await prisma.docpenConversation.update({
        where: { id: existing.id },
        data: {
          sessionId: sessionId || existing.sessionId,
          patientName: patientName || existing.patientName,
          status: 'completed',
          endedAt: endedAt ? new Date(endedAt) : new Date(),
          durationSec: durationSec || existing.durationSec,
          transcript: transcript ? JSON.stringify(transcript) : existing.transcript,
          audioUrl: audioUrl || existing.audioUrl,
          messageCount: messageCount || existing.messageCount,
          turnCount: turnCount || existing.turnCount,
        },
      });

      console.log(`✅ [Docpen] Conversation updated: ${conversation.id}`);

      return NextResponse.json({
        success: true,
        conversationId: conversation.id,
      });
    }

    // Create new conversation record
    const conversation = await prisma.docpenConversation.create({
      data: {
        agentId,
        elevenLabsConvId: convId,
        sessionId: sessionId || null,
        patientName: patientName || null,
        status: 'completed',
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : new Date(),
        durationSec: durationSec || 0,
        transcript: transcript ? JSON.stringify(transcript) : null,
        audioUrl: audioUrl || null,
        messageCount: messageCount || 0,
        turnCount: turnCount || 0,
      },
    });

    // Update agent stats
    await prisma.docpenVoiceAgent.update({
      where: { id: agentId },
      data: {
        conversationCount: { increment: 1 },
        totalDurationSec: { increment: durationSec || 0 },
        lastUsedAt: new Date(),
      },
    });

    console.log(`✅ [Docpen] Conversation saved: ${conversation.id}`);

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
    });
  } catch (error: any) {
    console.error('[Docpen Conversation Save] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save conversation' },
      { status: 500 }
    );
  }
}
