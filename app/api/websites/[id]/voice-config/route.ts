/**
 * GET /api/websites/[id]/voice-config
 * Returns voice AI config for a website (agentId, enableVoiceAI, enableTavusAvatar).
 * Used by owner-deployed templates to fetch config at runtime.
 * Auth: session OR x-website-secret header (for server-side template fetches)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService } from '@/lib/dal';
import { resolveWebsiteDb } from '@/lib/dal/resolve-website-db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const websiteId = params.id;
    if (!websiteId) {
      return apiErrors.badRequest('Website ID required');
    }

    // Auth: session (owner) or shared secret (template server)
    const session = await getServerSession(authOptions);
    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    if (!session?.user?.id && !(expectedSecret && secret === expectedSecret)) {
      return apiErrors.unauthorized();
    }

    let website;
    if (session?.user?.id) {
      const ctx = getDalContextFromSession(session);
      website = ctx ? await websiteService.findUnique(ctx, websiteId) : null;
    } else {
      const resolved = await resolveWebsiteDb(websiteId);
      website = resolved
        ? await resolved.db.website.findUnique({
            where: { id: websiteId },
            select: {
              id: true,
              userId: true,
              elevenLabsAgentId: true,
              voiceAIEnabled: true,
              enableTavusAvatar: true,
              voiceAIConfig: true,
            },
          })
        : null;
    }

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    // If session auth, verify ownership
    if (session?.user?.id && website.userId !== session.user.id) {
      return apiErrors.forbidden();
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
    return apiErrors.internal();
  }
}
