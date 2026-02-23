/**
 * POST /api/websites/[id]/secret-reports/publish
 * Publishes a report to the website's Secret Properties page.
 * Auth: session (owner)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService, getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const websiteId = params.id;
    if (!websiteId) {
      return apiErrors.badRequest('Website ID required');
    }

    const website = await websiteService.findUnique(ctx, websiteId);

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const body = await request.json();
    const { reportType, title, region, content, executiveSummary, pdfUrl, sourceReportId } = body;

    if (!reportType || !title || !content) {
      return apiErrors.badRequest('reportType, title, and content required');
    }

    const validTypes = ['BUYER_ATTRACTION', 'SELLER_ATTRACTION', 'MARKET_INSIGHT'];
    if (!validTypes.includes(reportType)) {
      return apiErrors.badRequest('Invalid reportType');
    }

    const report = await getCrmDb(ctx).rEWebsiteReport.create({
      data: {
        websiteId,
        userId: ctx.userId,
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
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
