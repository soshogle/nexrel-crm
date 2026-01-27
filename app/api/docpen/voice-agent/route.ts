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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      profession, 
      customProfession, 
      practitionerName,
      clinicName,
      voiceGender,
      sessionContext 
    } = body;

    if (!profession) {
      return NextResponse.json(
        { error: 'Profession is required' },
        { status: 400 }
      );
    }

    // Create or get existing agent
    const result = await docpenAgentProvisioning.getOrCreateAgent({
      userId: session.user.id,
      profession,
      customProfession,
      practitionerName: practitionerName || session.user.name,
      clinicName,
      voiceGender,
      sessionContext,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agentId: result.agentId,
    });
  } catch (error: any) {
    console.error('[Docpen Voice Agent] Error creating agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
