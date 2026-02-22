/**
 * GET /api/websites/[id]/blog
 * Website-scoped blog API for owner-deployed sites (e.g. Theodora).
 * Returns only posts for this website — NOT the Nexrel landing page content.
 * Auth: x-website-secret header (template server fetches)
 *
 * Use this URL from owner templates instead of /api/blog.
 * Landing page and CRM dashboard continue to use /api/blog.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';

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

    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getCrmDb(createDalContext('bootstrap'));
    const website = await db.website.findFirst({
      where: { id: websiteId },
      select: { id: true },
    });
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // BlogPost has no websiteId yet — return empty for owner sites.
    // Nexrel landing posts stay in /api/blog. When we add websiteId to BlogPost,
    // filter: where: { websiteId: websiteId }.
    const posts: unknown[] = [];
    const total = 0;

    return NextResponse.json({
      posts,
      total,
      hasMore: false,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[websites blog] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
