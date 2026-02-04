/**
 * API Route: Fetch Docpen Conversations from ElevenLabs
 * 
 * GET - Fetch conversations directly from ElevenLabs API (like voice agent history)
 * This bypasses the database and pulls fresh data from ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ElevenLabsService } from '@/lib/elevenlabs';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/docpen/conversations
 * Fetch conversations directly from ElevenLabs API for Docpen agents
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const pageSize = searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : 100;

    console.log(`📞 [Docpen Conversations] Request details:`, {
      userId: session.user.id,
      userEmail: session.user.email,
      requestedAgentId: agentId || 'all',
      pageSize,
    });

    // Get user's Docpen voice agents
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
      return NextResponse.json({
        success: true,
        conversations: [],
        has_more: false,
        cursor: null,
      });
    }

    // Create map of ElevenLabs agent IDs to local agent info
    const agentMap = new Map(
      docpenAgents.map(agent => [
        agent.elevenLabsAgentId,
        {
          id: agent.id,
          profession: agent.profession,
          customProfession: agent.customProfession,
        },
      ])
    );

    // Create set of user's agent IDs for filtering
    const userAgentIds = new Set(docpenAgents.map(agent => agent.elevenLabsAgentId));

    console.log(`🔒 [Docpen] User has ${userAgentIds.size} Docpen agents`);

    // Get user's ElevenLabs API key
    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        conversations: [],
        has_more: false,
        cursor: null,
      });
    }

    const elevenLabsService = new ElevenLabsService();

    // Fetch conversations from ElevenLabs for the specific agent or all user's agents
    let allConversations: any[] = [];
    let hasMore = false;
    let cursor: string | null = null;

    if (agentId) {
      // Fetch for specific agent
      const agent = docpenAgents.find(a => a.id === agentId);
      if (agent && agent.elevenLabsAgentId) {
        const response = await elevenLabsService.listConversations({
          agent_id: agent.elevenLabsAgentId,
          page_size: pageSize,
        });
        allConversations = response.conversations || [];
        hasMore = response.has_more || false;
        cursor = response.cursor || null;
      }
    } else {
      // Fetch for all user's agents
      const conversationPromises = docpenAgents
        .filter(agent => agent.elevenLabsAgentId)
        .map(agent =>
          elevenLabsService
            .listConversations({
              agent_id: agent.elevenLabsAgentId!,
              page_size: pageSize,
            })
            .then(response => ({
              conversations: response.conversations || [],
              hasMore: response.has_more || false,
              cursor: response.cursor || null,
            }))
            .catch(error => {
              console.error(`Error fetching conversations for agent ${agent.elevenLabsAgentId}:`, error);
              return { conversations: [], hasMore: false, cursor: null };
            })
        );

      const results = await Promise.all(conversationPromises);
      allConversations = results.flatMap(r => r.conversations);
      // Sort by start time (most recent first)
      allConversations.sort((a, b) => {
        const timeA = a.start_time_unix_secs || 0;
        const timeB = b.start_time_unix_secs || 0;
        return timeB - timeA;
      });
      // Limit to pageSize
      allConversations = allConversations.slice(0, pageSize);
      hasMore = results.some(r => r.hasMore);
    }

    console.log(`📞 [Docpen] Fetched ${allConversations.length} conversations from ElevenLabs API`);

    // 🔒 CRITICAL: Filter conversations to ONLY show those from user's agents
    const userConversations = allConversations.filter((conv: any) => {
      const belongsToUser = userAgentIds.has(conv.agent_id);
      if (!belongsToUser) {
        console.log(`🚫 [Security] Filtered out conversation ${conv.conversation_id} - not user's agent`);
      }
      return belongsToUser;
    });

    console.log(`✅ [Docpen] Returning ${userConversations.length} of ${allConversations.length} conversations`);

    // Enrich conversations with agent info
    const enrichedConversations = userConversations.map((conv: any) => {
      const agentInfo = agentMap.get(conv.agent_id);
      const professionLabel =
        agentInfo?.customProfession ||
        (agentInfo?.profession === 'CUSTOM' ? 'Custom' : agentInfo?.profession || 'Unknown');

      return {
        ...conv,
        agent_name: professionLabel,
        agent_id_local: agentInfo?.id,
        // Add audio URL if available
        audio_url: conv.has_audio ? `/api/calls/audio/${conv.conversation_id}` : null,
      };
    });

    return NextResponse.json({
      success: true,
      conversations: enrichedConversations,
      has_more: hasMore,
      cursor: cursor,
    });
  } catch (error: any) {
    console.error('❌ [Docpen Conversations] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
