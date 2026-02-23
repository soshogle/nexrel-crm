import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/voice-agents/[id]/preview-url
 * 
 * Fetches a signed WebSocket URL from ElevenLabs for browser-based voice agent preview.
 * This URL allows direct WebSocket connection to the ElevenLabs agent from the browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Fetch the voice agent from the database (VoiceAgent, IndustryAIEmployeeAgent, REAIEmployeeAgent, or ProfessionalAIEmployeeAgent)
    let voiceAgent = await prisma.voiceAgent.findUnique({
      where: { id: params.id },
    });

    let elevenLabsAgentId: string | null = null;
    let agentName: string = '';
    let useREApiKey = false; // RE agents use ELEVENLABS_RE_API_KEY

    if (voiceAgent) {
      elevenLabsAgentId = voiceAgent.elevenLabsAgentId;
      agentName = voiceAgent.name;
    } else {
      // Fallback: check IndustryAIEmployeeAgent (e.g. Dental, Medical AI employees)
      const industryAgent = await prisma.industryAIEmployeeAgent.findUnique({
        where: { id: params.id },
      });
      if (industryAgent) {
        if (industryAgent.userId !== session.user.id) {
          return apiErrors.forbidden('Unauthorized access to this voice agent');
        }
        elevenLabsAgentId = industryAgent.elevenLabsAgentId;
        agentName = industryAgent.name;
      }
    }

    if (!elevenLabsAgentId) {
      // Check REAIEmployeeAgent (Real Estate AI employees - Sarah, etc.)
      const reAgent = await prisma.rEAIEmployeeAgent.findUnique({
        where: { id: params.id },
      });
      if (reAgent) {
        if (reAgent.userId !== session.user.id) {
          return apiErrors.forbidden('Unauthorized access to this voice agent');
        }
        elevenLabsAgentId = reAgent.elevenLabsAgentId;
        agentName = reAgent.name;
        useREApiKey = true;
      }
    }

    if (!elevenLabsAgentId) {
      // Check ProfessionalAIEmployeeAgent (Accountant, Developer, etc.)
      const profAgent = await prisma.professionalAIEmployeeAgent.findUnique({
        where: { id: params.id },
      });
      if (profAgent) {
        if (profAgent.userId !== session.user.id) {
          return apiErrors.forbidden('Unauthorized access to this voice agent');
        }
        elevenLabsAgentId = profAgent.elevenLabsAgentId;
        agentName = profAgent.name;
      }
    }

    if (!elevenLabsAgentId) {
      return apiErrors.notFound('Voice agent not found');
    }

    if (voiceAgent && voiceAgent.userId !== session.user.id) {
      return apiErrors.forbidden('Unauthorized access to this voice agent');
    }

    if (!elevenLabsAgentId) {
      return apiErrors.badRequest('Voice agent is not configured. Please run auto-configuration first.');
    }

    // Get the ElevenLabs API key - RE agents use ELEVENLABS_RE_API_KEY
    let apiKey: string | null = null;
    if (useREApiKey) {
      apiKey = process.env.ELEVENLABS_RE_API_KEY || null;
    }
    if (!apiKey) {
      const { elevenLabsKeyManager } = await import('@/lib/elevenlabs-key-manager');
      apiKey = await elevenLabsKeyManager.getActiveApiKey(session.user.id);
    }
    if (!apiKey) {
      apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_RE_API_KEY || null;
    }

    if (!apiKey) {
      return apiErrors.badRequest('Soshogle AI voice is not configured');
    }

    // Fetch the signed WebSocket URL from ElevenLabs
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${elevenLabsAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('❌ ElevenLabs API error:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to get preview URL from Soshogle AI',
          details: errorText
        },
        { status: elevenLabsResponse.status }
      );
    }

    const data = await elevenLabsResponse.json();
    
    // The response should contain a signed_url field
    if (!data.signed_url) {
      console.error('❌ No signed_url in ElevenLabs response:', data);
      return apiErrors.internal('Invalid response from Soshogle AI');
    }

    console.log('✅ Successfully fetched preview URL for agent:', elevenLabsAgentId);

    return NextResponse.json({
      success: true,
      signedUrl: data.signed_url,
      agentId: elevenLabsAgentId,
      agentName,
    });

  } catch (error: any) {
    console.error('❌ Error fetching preview URL:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
