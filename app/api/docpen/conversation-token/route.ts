/**
 * API Route: Docpen Conversation Token
 * 
 * POST - Get a conversation token for ElevenLabs SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { agentId } = await request.json();
    if (!agentId) {
      return apiErrors.badRequest('Missing agentId');
    }

    // Get user's ElevenLabs API key
    const apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    if (!apiKey) {
      return apiErrors.badRequest('ElevenLabs API key not configured');
    }

    const baseUrl = 'https://api.elevenlabs.io/v1/convai/conversation/token';
    const headers = {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    let response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ agent_id: agentId }),
    });

    if (response.status === 405) {
      response = await fetch(`${baseUrl}?agent_id=${encodeURIComponent(agentId)}`, {
        method: 'GET',
        headers,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Docpen] Failed to get conversation token:', {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: errorText || 'Failed to get token' },
        { status: response.status }
      );
    }

    const body = await response.json();
    console.log('✅ [Docpen] Conversation token obtained for agent:', agentId);
    return NextResponse.json({ token: body.token });
  } catch (error: any) {
    console.error('❌ [Docpen] Error getting conversation token:', error);
    return apiErrors.internal('Failed to get token');
  }
}
