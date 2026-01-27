/**
 * API Route: Save Docpen Conversation
 * 
 * POST - Save a conversation from a voice session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Generate a unique conversation ID
    const localConvId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create conversation record
    const conversation = await prisma.docpenConversation.create({
      data: {
        agentId,
        elevenLabsConvId: localConvId,
        sessionId: sessionId || null,
        patientName: patientName || null,
        status: 'completed',
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : new Date(),
        durationSec: durationSec || 0,
        transcript: transcript ? JSON.stringify(transcript) : null,
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
