/**
 * GET /api/websites/[id]/secret-reports
 * Returns reports published to Secret Properties page for a website.
 * Auth: x-website-secret header (for template server fetches)
 */
import { NextRequest, NextResponse } from 'next/server';
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

    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // List only — do not expose full content until user unlocks with email/phone
    const reports = await prisma.rEWebsiteReport.findMany({
      where: { websiteId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        reportType: true,
        title: true,
        region: true,
        executiveSummary: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('[secret-reports] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
