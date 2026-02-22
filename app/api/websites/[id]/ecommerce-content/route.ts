/**
 * GET /api/websites/[id]/ecommerce-content
 * Returns e-commerce content (products, pages, policies, videos) for a website.
 * Used by owner-deployed e-commerce templates to fetch content at runtime.
 * Auth: session OR x-website-secret header (for template server fetches)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, websiteService } from '@/lib/dal';
import { getDalContextFromSession, createDalContext } from '@/lib/context/industry-context';

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

    const session = await getServerSession(authOptions);
    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    if (!session?.user?.id && !(expectedSecret && secret === expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = session ? getDalContextFromSession(session) : null;
    const db = getCrmDb(ctx ?? createDalContext('bootstrap'));
    const website = ctx
      ? await websiteService.findUnique(ctx, websiteId)
      : await db.website.findUnique({ where: { id: websiteId } });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    if (session?.user?.id && website.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const content = (website.ecommerceContent as Record<string, unknown> | null) || {};

    return NextResponse.json({
      products: content.products ?? [],
      pages: content.pages ?? [],
      categories: content.categories ?? [],
      policies: content.policies ?? {},
      videos: content.videos ?? [],
      siteConfig: content.siteConfig ?? {},
    });
  } catch (error: unknown) {
    console.error('[ecommerce-content] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/websites/[id]/ecommerce-content
 * Update e-commerce content (products, pages, policies, videos).
 * Auth: session only (owner)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteId = params.id;
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID required' }, { status: 400 });
    }

    const website = await websiteService.findUnique(ctx, websiteId);

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json();
    const existing = (website.ecommerceContent as Record<string, unknown> | null) || {};
    const updated = {
      ...existing,
      ...(body.products !== undefined && { products: body.products }),
      ...(body.pages !== undefined && { pages: body.pages }),
      ...(body.videos !== undefined && { videos: body.videos }),
      ...(body.policies !== undefined && { policies: body.policies }),
      ...(body.siteConfig !== undefined && { siteConfig: body.siteConfig }),
    };

    await websiteService.update(ctx, websiteId, { ecommerceContent: updated });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[ecommerce-content PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
