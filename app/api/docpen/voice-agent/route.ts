/**
 * API Route: Docpen Voice Agent Management
 * 
 * GET - List user's Docpen voice agents
 * POST - Create or get a voice agent for a profession
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { docpenAgentProvisioning } from '@/lib/docpen/agent-provisioning';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await prisma.docpenVoiceAgent.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error('[Docpen Voice Agent] Error listing agents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list agents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log('🚀 [Docpen Voice Agent API] POST endpoint called');
  console.log('🔍 [Docpen Voice Agent API] Environment check:', {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlPreview: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
    hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
    elevenLabsKeyPreview: process.env.ELEVENLABS_API_KEY ? `...${process.env.ELEVENLABS_API_KEY.slice(-8)}` : 'NOT SET',
  });
  
  try {
    const session = await getServerSession(authOptions);
    console.log('🔐 [Docpen Voice Agent API] Session check:', session ? `User: ${session.user?.email}` : 'No session');
    if (!session?.user?.id) {
      console.error('❌ [Docpen Voice Agent API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📥 [Docpen Voice Agent API] Parsing request body...');
    const body = await req.json();
    console.log('✅ [Docpen Voice Agent API] Request body parsed:', Object.keys(body));
    const { 
      profession, 
      customProfession, 
      practitionerName,
      clinicName,
      voiceGender,
      sessionContext,
      forceCreate = false // Allow forcing new agent creation
    } = body;
    
    // Check URL parameter for forceCreate as well
    const url = new URL(req.url);
    const forceCreateParam = url.searchParams.get('forceCreate') === 'true' || forceCreate;

    console.log('📥 [Docpen Voice Agent API] POST request received:', {
      userId: session.user.id,
      profession,
      customProfession,
      practitionerName,
      clinicName,
      voiceGender,
      hasSessionContext: !!sessionContext,
    });

    if (!profession) {
      console.error('❌ [Docpen Voice Agent API] Missing profession');
      return NextResponse.json(
        { error: 'Profession is required' },
        { status: 400 }
      );
    }

    // Create or get existing agent
    console.log('🔄 [Docpen Voice Agent API] Calling getOrCreateAgent...');
    console.log('🔄 [Docpen Voice Agent API] Force create:', forceCreateParam);
    
    let result;
    if (forceCreateParam) {
      // Force create a new agent by calling createAgent directly
      console.log('🔄 [Docpen Voice Agent API] FORCE CREATING new agent (skipping getOrCreateAgent)...');
      result = await docpenAgentProvisioning.createAgent({
        userId: session.user.id,
        profession,
        customProfession,
        practitionerName: practitionerName || session.user.name,
        clinicName,
        voiceGender,
        sessionContext,
      });
    } else {
      result = await docpenAgentProvisioning.getOrCreateAgent({
        userId: session.user.id,
        profession,
        customProfession,
        practitionerName: practitionerName || session.user.name,
        clinicName,
        voiceGender,
        sessionContext,
      });
    }

    console.log('📤 [Docpen Voice Agent API] getOrCreateAgent result:', {
      success: result.success,
      agentId: result.agentId,
      error: result.error,
    });

    if (!result.success) {
      console.error('❌ [Docpen Voice Agent API] Agent creation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to create agent' },
        { status: 500 }
      );
    }

    if (!result.agentId) {
      console.error('❌ [Docpen Voice Agent API] No agentId returned despite success');
      return NextResponse.json(
        { error: 'Agent created but no agent ID returned' },
        { status: 500 }
      );
    }

    console.log('✅ [Docpen Voice Agent API] Successfully returning agentId:', result.agentId);
    return NextResponse.json({
      success: true,
      agentId: result.agentId,
    });
  } catch (error: any) {
    console.error('❌ [Docpen Voice Agent API] Error creating agent:', error);
    console.error('   Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
