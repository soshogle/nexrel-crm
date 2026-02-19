/**
 * POST /api/websites/[id]/secret-reports/unlock
 * Creates lead from visitor info, returns full report content.
 * Auth: x-website-secret header (template server proxy)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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

    const body = await request.json();
    const { reportId, name, email, phone } = body;

    if (!reportId || !name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'reportId, name, email, and phone are required' },
        { status: 400 }
      );
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { userId: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const report = await prisma.rEWebsiteReport.findFirst({
      where: { id: reportId, websiteId },
      select: {
        id: true,
        reportType: true,
        title: true,
        region: true,
        executiveSummary: true,
        content: true,
        pdfUrl: true,
        createdAt: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        userId: website.userId,
        businessName: name.trim(),
        contactPerson: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source: 'Secret Properties Report',
        status: 'NEW',
        enrichedData: {
          source: 'website_secret_report',
          websiteId,
          reportId,
          reportTitle: report.title,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.note.create({
      data: {
        leadId: lead.id,
        userId: website.userId,
        content: `Viewed report: ${report.title} (${report.id})`,
      },
    });

    return NextResponse.json({ report, leadId: lead.id });
  } catch (error: any) {
    console.error('[secret-reports/unlock] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
