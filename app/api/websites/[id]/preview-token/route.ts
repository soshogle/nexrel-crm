/**
 * POST /api/websites/[id]/preview-token
 * Creates a short-lived JWT containing draft agency config for preview-before-publish.
 * Auth: session required.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PREVIEW_TOKEN_EXPIRY = '5m';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const websiteId = params.id;
    if (!websiteId) {
      return apiErrors.badRequest('Website ID required');
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    const db = getCrmDb(ctx);

    const website = await db.website.findFirst({
      where: { id: websiteId, userId: ctx.userId },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const body = await request.json();
    const draft = (body.config ?? body) as Record<string, unknown>;

    const secret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    if (!secret) {
      return apiErrors.internal('Preview not configured');
    }

    const token = jwt.sign(
      {
        websiteId,
        config: draft,
      },
      secret,
      { expiresIn: PREVIEW_TOKEN_EXPIRY }
    );

    return NextResponse.json({ token });
  } catch (error: unknown) {
    console.error('[preview-token] Error:', error);
    return apiErrors.internal();
  }
}
