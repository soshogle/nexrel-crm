
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Fetch specific conversation details from ElevenLabs
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
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Fetch conversation details from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.statusText}`);
    }

    const conversation = await response.json();

    // Format transcript
    let transcript = '';
    if (conversation.transcript && Array.isArray(conversation.transcript)) {
      transcript = conversation.transcript
        .map((turn: any) => {
          const role = turn.role === 'agent' ? 'Agent' : 'User';
          const timestamp = turn.time_in_call_secs
            ? `[${Math.floor(turn.time_in_call_secs / 60)}:${String(Math.floor(turn.time_in_call_secs % 60)).padStart(2, '0')}]`
            : '';
          return `${timestamp} ${role}: ${turn.message}`;
        })
        .join('\n');
    }

    // Get audio URL if available - use our proxy endpoint
    let audioUrl = null;
    if (conversation.has_audio) {
      // Use our proxy endpoint instead of direct ElevenLabs URL
      audioUrl = `/api/elevenlabs/conversations/${conversationId}/audio`;
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        formatted_transcript: transcript,
        audio_url: audioUrl,
        agent_name: conversation.agent_name || 'Unknown Agent',
      },
    });
  } catch (error: any) {
    console.error('❌ [Conversation Details] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation details' },
      { status: 500 }
    );
  }
}

/**
 * Delete a call/conversation from the database (SUPER_ADMIN only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is SUPER_ADMIN (either directly or when impersonating)
    let isSuperAdmin = false;
    let actualAdminId = session.user.id;
    
    console.log('🔍 [Delete Call] Checking super admin access:', {
      userId: session.user.id,
      userRole: session.user.role,
      isImpersonating: session.user.isImpersonating,
      superAdminId: session.user.superAdminId,
    });

    if (session.user.isImpersonating && session.user.superAdminId) {
      // Super admin is impersonating another user
      console.log('🎭 [Delete Call] Super admin impersonating, checking original admin');
      
      const superAdmin = await prisma.user.findUnique({
        where: { id: session.user.superAdminId },
        select: { role: true },
      });
      
      if (superAdmin?.role === 'SUPER_ADMIN') {
        isSuperAdmin = true;
        actualAdminId = session.user.superAdminId;
        console.log('✅ [Delete Call] Verified super admin via impersonation');
      }
    } else {
      // Check if current user is directly a super admin
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user?.role === 'SUPER_ADMIN') {
        isSuperAdmin = true;
        console.log('✅ [Delete Call] Verified direct super admin');
      }
    }

    if (!isSuperAdmin) {
      console.log('❌ [Delete Call] Access denied - not a super admin');
      return NextResponse.json(
        { error: 'Forbidden: Only super admins can delete calls' },
        { status: 403 }
      );
    }

    const { conversationId } = params;

    console.log('🗑️ [Delete Call] Super admin deleting conversation:', {
      conversationId,
      adminId: actualAdminId,
      adminEmail: session.user.email,
      wasImpersonating: session.user.isImpersonating || false,
    });

    // Delete the call log from database
    const deletedCall = await prisma.callLog.deleteMany({
      where: {
        elevenLabsConversationId: conversationId,
      },
    });

    console.log('✅ [Delete Call] Deleted call records:', deletedCall.count);

    if (deletedCall.count === 0) {
      // If no records found, it might be okay (already deleted or never stored)
      console.log('⚠️ [Delete Call] No call records found for conversation:', conversationId);
    }

    return NextResponse.json({
      success: true,
      message: 'Call deleted successfully',
      deletedCount: deletedCall.count,
    });
  } catch (error: any) {
    console.error('❌ [Delete Call] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete call' },
      { status: 500 }
    );
  }
}
