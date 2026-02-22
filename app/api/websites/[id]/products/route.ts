/**
 * CRM proxy for owner site products API.
 * Proxies requests to the owner's deployed site /api/nexrel/products.
 * Auth: session (owner only).
 *
 * Excludes Eyal's Darksword Armory (websiteId cmlkk9awe0002puiqm64iqw7t).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService } from '@/lib/dal';

const EYAL_DARKSWORD_WEBSITE_ID = 'cmlkk9awe0002puiqm64iqw7t';
const EYAL_PRODUCTS_ENABLED = process.env.EYAL_PRODUCTS_API_ENABLED === 'true';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function proxyToOwnerSite(
  ctx: { userId: string; industry?: string | null },
  websiteId: string,
  method: string,
  path: string,
  body?: unknown
): Promise<NextResponse> {
  const website = await websiteService.findUnique(ctx, websiteId);
  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  if (website.templateType !== 'PRODUCT') {
    return NextResponse.json({ error: 'Products API only available for PRODUCT template sites' }, { status: 400 });
  }

  const baseUrl = website.vercelDeploymentUrl?.replace(/\/$/, '');
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Site not deployed yet. Deploy your site first.' },
      { status: 400 }
    );
  }

  const authSecret = website.websiteSecret || process.env.WEBSITE_VOICE_CONFIG_SECRET;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authSecret ? { 'x-website-secret': authSecret } : {}),
  };

  try {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers,
      ...(body !== undefined && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[products proxy]', err);
    return NextResponse.json(
      { error: 'Failed to reach your site. Is it deployed and running?' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteId = params.id;
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID required' }, { status: 400 });
    }

    if (websiteId === EYAL_DARKSWORD_WEBSITE_ID && !EYAL_PRODUCTS_ENABLED) {
      return NextResponse.json(
        { error: 'This site uses a different setup. Product editing is not available via this API.' },
        { status: 400 }
      );
    }

    const website = await websiteService.findUnique(ctx, websiteId);
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';
    const path = `/api/nexrel/products?page=${page}&limit=${limit}`;

    return proxyToOwnerSite(ctx, websiteId, 'GET', path);
  } catch (error: unknown) {
    console.error('[products GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteId = params.id;
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID required' }, { status: 400 });
    }

    if (websiteId === EYAL_DARKSWORD_WEBSITE_ID && !EYAL_PRODUCTS_ENABLED) {
      return NextResponse.json(
        { error: 'This site uses a different setup. Product editing is not available via this API.' },
        { status: 400 }
      );
    }

    const website = await websiteService.findUnique(ctx, websiteId);
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    return proxyToOwnerSite(ctx, websiteId, 'POST', '/api/nexrel/products', body);
  } catch (error: unknown) {
    console.error('[products POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
