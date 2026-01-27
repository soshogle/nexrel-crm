
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ElevenLabsService } from '@/lib/elevenlabs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Fetch conversations directly from ElevenLabs API
 * This bypasses the webhook/database approach and pulls fresh data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const pageSize = searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : 50;

    console.log(`📞 [ElevenLabs Conversations] Request details:`, {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      userRole: session.user.role,
      isImpersonating: session.user.isImpersonating || false,
      superAdminId: session.user.superAdminId || 'none',
      requestedAgentId: agentId || 'all',
      pageSize,
    });

    const elevenLabsService = new ElevenLabsService();

    // Fetch conversations from ElevenLabs
    const response = await elevenLabsService.listConversations({
      agent_id: agentId || undefined,
      page_size: pageSize,
    });

    console.log(`📞 [ElevenLabs Conversations] Fetched ${response.conversations?.length || 0} conversations from ElevenLabs API`);

    // Get user's voice agents to map agent IDs to names
    // NOTE: session.user.id is the IMPERSONATED user's ID when impersonating
    const voiceAgents = await prisma.voiceAgent.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        elevenLabsAgentId: true,
      },
    });

    // Create map of agent IDs to names
    const agentMap = new Map(
      voiceAgents.map(agent => [agent.elevenLabsAgentId, agent.name])
    );

    // Create set of user's agent IDs for filtering
    const userAgentIds = new Set(voiceAgents.map(agent => agent.elevenLabsAgentId).filter(Boolean));

    console.log(`🔒 [Multi-Tenancy Filter] User ${session.user.id} has ${userAgentIds.size} voice agents`);

    // 🔒 CRITICAL: Filter conversations to ONLY show those from user's agents
    const userConversations = (response.conversations || []).filter((conv: any) => {
      const belongsToUser = userAgentIds.has(conv.agent_id);
      if (!belongsToUser) {
        console.log(`🚫 [Security] Filtered out conversation ${conv.conversation_id} - not user's agent`);
      }
      return belongsToUser;
    });

    console.log(`✅ [Multi-Tenancy Filter] Returning ${userConversations.length} of ${response.conversations?.length || 0} conversations`);

    // Enrich conversations with agent names
    const enrichedConversations = userConversations.map((conv: any) => ({
      ...conv,
      agent_name: agentMap.get(conv.agent_id) || 'Unknown Agent',
    }));

    return NextResponse.json({
      success: true,
      conversations: enrichedConversations,
      has_more: response.has_more || false,
      cursor: response.cursor || null,
    });
  } catch (error: any) {
    console.error('❌ [ElevenLabs Conversations] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
