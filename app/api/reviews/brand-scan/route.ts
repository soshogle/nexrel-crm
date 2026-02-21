import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  runBrandScan,
  getScanStatus,
  getUserScans,
  getUserMentions,
} from '@/lib/reviews/brand-scraper-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/reviews/brand-scan
 *   ?action=scans       → list user's scan history
 *   ?action=status&id=X → get single scan status
 *   ?action=mentions    → get brand mentions (optional: source, sentiment, scanId, limit)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'scans';

    if (action === 'status') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      const scan = await getScanStatus(id);
      if (!scan || scan.userId !== session.user.id) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
      }
      return NextResponse.json(scan);
    }

    if (action === 'mentions') {
      const mentions = await getUserMentions(session.user.id, {
        source: searchParams.get('source') || undefined,
        sentiment: searchParams.get('sentiment') || undefined,
        scanId: searchParams.get('scanId') || undefined,
        limit: Number(searchParams.get('limit')) || 100,
      });
      return NextResponse.json({ mentions });
    }

    const scans = await getUserScans(session.user.id);
    return NextResponse.json({ scans });
  } catch (error: any) {
    console.error('Brand scan GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

/**
 * POST /api/reviews/brand-scan
 * Body: { businessName?, location?, sources?: string[], includeWebMentions?: boolean, importAsReviews?: boolean }
 * If businessName is omitted, uses user's legalEntityName or name.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    let businessName = body.businessName as string | undefined;
    if (!businessName) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { legalEntityName: true, name: true },
      });
      businessName = user?.legalEntityName || user?.name || undefined;
    }

    if (!businessName) {
      return NextResponse.json(
        { error: 'Business name is required. Set it in Settings → Legal Entity Name, or pass it in the request.' },
        { status: 400 },
      );
    }

    // Prevent concurrent scans
    const running = await prisma.brandScan.findFirst({
      where: { userId: session.user.id, status: { in: ['PENDING', 'RUNNING'] } },
    });
    if (running) {
      return NextResponse.json(
        { error: 'A scan is already running. Wait for it to complete.', scanId: running.id },
        { status: 409 },
      );
    }

    const scanId = await runBrandScan({
      userId: session.user.id,
      businessName,
      location: body.location || undefined,
      sources: body.sources || undefined,
      includeWebMentions: body.includeWebMentions !== false,
      importAsReviews: body.importAsReviews !== false,
    });

    return NextResponse.json({ scanId, status: 'RUNNING', businessName });
  } catch (error: any) {
    console.error('Brand scan POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start scan' }, { status: 500 });
  }
}
