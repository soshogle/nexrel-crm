/**
 * CRM proxy for single product: GET, PATCH, DELETE.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createDalContext, getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb, websiteService } from '@/lib/dal';

const EYAL_DARKSWORD_WEBSITE_ID = 'cmlkk9awe0002puiqm64iqw7t';
const EYAL_PRODUCTS_ENABLED = process.env.EYAL_PRODUCTS_API_ENABLED === 'true';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function proxyToOwnerSite(
  websiteId: string,
  method: string,
  path: string,
  body?: unknown
): Promise<NextResponse> {
  const db = getCrmDb(createDalContext('bootstrap'));
  const website = await db.website.findUnique({
    where: { id: websiteId },
    select: {
      vercelDeploymentUrl: true,
      websiteSecret: true,
      templateType: true,
    },
  });

  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
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

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
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

async function handle(
  request: NextRequest,
  params: { id: string; productId: string },
  method: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: websiteId, productId } = params;
  if (!websiteId || !productId) {
    return NextResponse.json({ error: 'Website ID and product ID required' }, { status: 400 });
  }

  if (websiteId === EYAL_DARKSWORD_WEBSITE_ID && !EYAL_PRODUCTS_ENABLED) {
    return NextResponse.json(
      { error: 'This site uses a different setup. Product editing is not available via this API.' },
      { status: 400 }
    );
  }

  const ctx = getDalContextFromSession(session);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const website = await websiteService.findUnique(ctx, websiteId);
  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  const path = `/api/nexrel/products/${productId}`;

  if (method === 'GET') {
    return proxyToOwnerSite(websiteId, 'GET', path);
  }
  if (method === 'PATCH') {
    const body = await request.json().catch(() => ({}));
    return proxyToOwnerSite(websiteId, 'PATCH', path, body);
  }
  if (method === 'DELETE') {
    return proxyToOwnerSite(websiteId, 'DELETE', path);
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  return handle(request, params, 'GET');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  return handle(request, params, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  return handle(request, params, 'DELETE');
}
