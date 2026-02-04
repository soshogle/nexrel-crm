import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ElevenLabsService } from '@/lib/elevenlabs';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/docpen/conversations/[conversationId]
 * Fetch specific Docpen conversation details from ElevenLabs
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

    // Verify the conversation belongs to one of the user's Docpen agents
    const docpenAgents = await prisma.docpenVoiceAgent.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        profession: true,
        customProfession: true,
        elevenLabsAgentId: true,
      },
    });

    if (docpenAgents.length === 0) {
      return NextResponse.json({ error: 'No Docpen agents found' }, { status: 404 });
    }

    // Get user's ElevenLabs API key
    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 400 }
      );
    }

    const elevenLabsService = new ElevenLabsService();

    // Fetch conversation details from ElevenLabs
    const conversation = await elevenLabsService.getConversationDetails(conversationId);

    // Verify the conversation belongs to one of the user's agents
    const userAgentIds = new Set(docpenAgents.map(agent => agent.elevenLabsAgentId));
    if (!userAgentIds.has(conversation.agent_id)) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 403 }
      );
    }

    // Get agent info
    const agentInfo = docpenAgents.find(a => a.elevenLabsAgentId === conversation.agent_id);
    const agentName =
      agentInfo?.customProfession ||
      (agentInfo?.profession === 'CUSTOM' ? 'Custom' : agentInfo?.profession || 'Unknown');

    // Get audio URL if available - use our proxy endpoint
    let audioUrl = null;
    if (conversation.has_audio) {
      audioUrl = `/api/calls/audio/${conversationId}`;
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        audio_url: audioUrl,
        agent_name: agentName,
      },
    });
  } catch (error: any) {
    console.error('❌ [Docpen Conversation Details] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/docpen/conversations/[conversationId]
 * Delete a Docpen conversation (SUPER_ADMIN only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is SUPER_ADMIN
    let isSuperAdmin = false;
    let actualAdminId = session.user.id;

    if (session.user.isImpersonating && session.user.superAdminId) {
      const superAdmin = await prisma.user.findUnique({
        where: { id: session.user.superAdminId },
        select: { role: true },
      });

      if (superAdmin?.role === 'SUPER_ADMIN') {
        isSuperAdmin = true;
        actualAdminId = session.user.superAdminId;
      }
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user?.role === 'SUPER_ADMIN') {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins can delete conversations' },
        { status: 403 }
      );
    }

    const { conversationId } = params;

    // Delete the Docpen conversation from database
    const deletedConv = await prisma.docpenConversation.deleteMany({
      where: {
        elevenLabsConvId: conversationId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedCount: deletedConv.count,
    });
  } catch (error: any) {
    console.error('❌ [Delete Docpen Conversation] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
