import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ElevenLabsService } from '@/lib/elevenlabs';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { apiErrors } from '@/lib/api-error';

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
      return apiErrors.unauthorized();
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
      return apiErrors.notFound('No Docpen agents found');
    }

    // Get user's ElevenLabs API key (Docpen agents use user's key - must use same key for details)
    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    const effectiveKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    if (!effectiveKey) {
      return apiErrors.badRequest('Soshogle Voice AI API key not configured');
    }

    const elevenLabsService = new ElevenLabsService(effectiveKey);

    // Fetch conversation details from ElevenLabs
    const conversation = await elevenLabsService.getConversationDetails(conversationId);

    // Verify the conversation belongs to one of the user's agents
    const userAgentIds = new Set(docpenAgents.map(agent => agent.elevenLabsAgentId));
    if (!userAgentIds.has(conversation.agent_id)) {
      return apiErrors.forbidden('Conversation not found or access denied');
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
    return apiErrors.internal(error.message || 'Failed to fetch conversation details');
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
      return apiErrors.unauthorized();
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
      return apiErrors.forbidden('Forbidden: Only super admins can delete conversations');
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
    return apiErrors.internal(error.message || 'Failed to delete conversation');
  }
}
