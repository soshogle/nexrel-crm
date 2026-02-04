
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ElevenLabsService } from '@/lib/elevenlabs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Also get CallLog entries for this user (in case they have calls but no voice agents)
    const callLogs = await prisma.callLog.findMany({
      where: {
        userId: session.user.id,
        elevenLabsConversationId: { not: null },
      },
      select: {
        elevenLabsConversationId: true,
        id: true,
        fromNumber: true,
        toNumber: true,
        duration: true,
        status: true,
        createdAt: true,
        transcription: true,
        recordingUrl: true,
        voiceAgentId: true,
        voiceAgent: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Create map of agent IDs to names
    const agentMap = new Map(
      voiceAgents.map(agent => [agent.elevenLabsAgentId, agent.name])
    );

    // Create set of user's agent IDs for filtering
    const userAgentIds = new Set(voiceAgents.map(agent => agent.elevenLabsAgentId).filter(Boolean));

    // Create set of conversation IDs from CallLog
    const callLogConvIds = new Set(
      callLogs
        .map(log => log.elevenLabsConversationId)
        .filter((id): id is string => id !== null)
    );

    console.log(`🔒 [Multi-Tenancy Filter] User ${session.user.id} has ${userAgentIds.size} voice agents`);
    console.log(`📞 [CallLog] Found ${callLogConvIds.size} conversations in CallLog`);

    // 🔒 CRITICAL: Filter conversations to ONLY show those from user's agents OR in CallLog
    const userConversations = (response.conversations || []).filter((conv: any) => {
      const belongsToUser = userAgentIds.has(conv.agent_id) || callLogConvIds.has(conv.conversation_id);
      if (!belongsToUser) {
        console.log(`🚫 [Security] Filtered out conversation ${conv.conversation_id} - not user's agent or in CallLog`);
      }
      return belongsToUser;
    });

    console.log(`✅ [Multi-Tenancy Filter] Returning ${userConversations.length} of ${response.conversations?.length || 0} conversations`);

    // Enrich conversations with agent names and CallLog data
    const enrichedConversations = userConversations.map((conv: any) => {
      const callLog = callLogs.find(log => log.elevenLabsConversationId === conv.conversation_id);
      return {
        ...conv,
        agent_name: agentMap.get(conv.agent_id) || callLog?.voiceAgent?.name || 'Unknown Agent',
        // Include CallLog data if available
        callLogId: callLog?.id,
        fromNumber: callLog?.fromNumber || conv.metadata?.from_number || conv.metadata?.from,
        toNumber: callLog?.toNumber || conv.metadata?.to_number || conv.metadata?.to,
        callLogDuration: callLog?.duration,
        callLogStatus: callLog?.status,
        callLogTranscription: callLog?.transcription,
        callLogRecordingUrl: callLog?.recordingUrl,
      };
    });

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
