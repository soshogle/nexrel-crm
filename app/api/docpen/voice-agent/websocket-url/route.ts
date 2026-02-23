/**
 * API Route: Get Signed WebSocket URL for Docpen Voice Agent
 * 
 * POST - Get a signed WebSocket URL for real-time voice conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { docpenAgentProvisioning } from '@/lib/docpen/agent-provisioning';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { agentId, sessionContext } = body;

    if (!agentId) {
      return apiErrors.badRequest('Agent ID is required');
    }

    // Build dynamic variables for context
    const dynamicVariables: Record<string, string> = {};
    
    if (sessionContext?.patientName) {
      dynamicVariables.patient_name = sessionContext.patientName;
    }
    if (sessionContext?.chiefComplaint) {
      dynamicVariables.chief_complaint = sessionContext.chiefComplaint;
    }
    if (sessionContext?.sessionId) {
      dynamicVariables.session_id = sessionContext.sessionId;
    }

    const signedUrl = await docpenAgentProvisioning.getSignedWebSocketUrl(
      agentId,
      session.user.id,
      dynamicVariables
    );

    return NextResponse.json({
      success: true,
      signedUrl,
    });
  } catch (error: any) {
    console.error('[Docpen Voice Agent] Error getting WebSocket URL:', error);
    return apiErrors.internal(error.message || 'Failed to get WebSocket URL');
  }
}
