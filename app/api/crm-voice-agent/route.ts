/**
 * CRM Voice Agent API
 * Manage CRM voice assistant agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { crmVoiceAgentService } from '@/lib/crm-voice-agent';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ CRM Voice Agent API: Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 CRM Voice Agent API: Getting/creating agent for user:', session.user.id);
    const result = await crmVoiceAgentService.getOrCreateCrmVoiceAgent(session.user.id);

    console.log('✅ CRM Voice Agent API: Success - agentId:', result.agentId, 'created:', result.created);
    return NextResponse.json({
      success: true,
      agentId: result.agentId,
      created: result.created,
    });
  } catch (error: any) {
    console.error('❌ CRM Voice Agent API: Error getting CRM voice agent:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    // Return error with details for debugging
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get CRM voice agent',
        agentId: null,
        created: false,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 200 } // Return 200 so UI doesn't break
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { voiceId, language } = body;

    await crmVoiceAgentService.updateCrmVoiceAgent(session.user.id, {
      voiceId,
      language,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating CRM voice agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update CRM voice agent' },
      { status: 500 }
    );
  }
}
