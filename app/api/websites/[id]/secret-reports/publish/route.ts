/**
 * POST /api/websites/[id]/secret-reports/publish
 * Publishes a report to the website's Secret Properties page.
 * Auth: session (owner)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteId = params.id;
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID required' }, { status: 400 });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { userId: true },
    });

    if (!website || website.userId !== session.user.id) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json();
    const { reportType, title, region, content, executiveSummary, pdfUrl, sourceReportId } = body;

    if (!reportType || !title || !content) {
      return NextResponse.json(
        { error: 'reportType, title, and content required' },
        { status: 400 }
      );
    }

    const validTypes = ['BUYER_ATTRACTION', 'SELLER_ATTRACTION', 'MARKET_INSIGHT'];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 });
    }

    const report = await prisma.rEWebsiteReport.create({
      data: {
        websiteId,
        userId: session.user.id,
        reportType,
        title,
        region: region || null,
        content: typeof content === 'object' ? content : JSON.parse(content),
        executiveSummary: executiveSummary || null,
        pdfUrl: pdfUrl || null,
        sourceReportId: sourceReportId || null,
      },
    });

    return NextResponse.json({ report, success: true });
  } catch (error: any) {
    console.error('[secret-reports/publish] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
