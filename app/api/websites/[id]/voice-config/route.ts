/**
 * GET /api/websites/[id]/voice-config
 * Returns voice AI config for a website (agentId, enableVoiceAI, enableTavusAvatar).
 * Used by owner-deployed templates to fetch config at runtime.
 * Auth: session OR x-website-secret header (for server-side template fetches)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const websiteId = params.id;
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID required' }, { status: 400 });
    }

    // Auth: session (owner) or shared secret (template server)
    const session = await getServerSession(authOptions);
    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    if (!session?.user?.id && !(expectedSecret && secret === expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        userId: true,
        elevenLabsAgentId: true,
        voiceAIEnabled: true,
        enableTavusAvatar: true,
        voiceAIConfig: true,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // If session auth, verify ownership
    if (session?.user?.id && website.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const voiceAIConfig = (website.voiceAIConfig as { customPrompt?: string } | null) || {};
    return NextResponse.json({
      agentId: website.elevenLabsAgentId,
      enableVoiceAI: website.voiceAIEnabled,
      enableTavusAvatar: website.enableTavusAvatar !== false,
      websiteId: website.id,
      customPrompt: voiceAIConfig.customPrompt || null,
    });
  } catch (error: any) {
    console.error('[voice-config] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
