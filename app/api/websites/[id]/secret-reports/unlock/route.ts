/**
 * POST /api/websites/[id]/secret-reports/unlock
 * Creates lead from visitor info, returns full report content.
 * Auth: x-website-secret header (template server proxy)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createDalContext, resolveDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';
import { processWebsiteTriggers } from '@/lib/website-triggers';
import { processCampaignTriggers } from '@/lib/campaign-triggers';
import { syncLeadCreatedToPipeline } from '@/lib/lead-pipeline-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const websiteId = params.id;
    if (!websiteId) {
      return apiErrors.badRequest('Website ID required');
    }

    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { reportId, name, email, phone, language } = body;

    if (!reportId || !name?.trim() || !email?.trim() || !phone?.trim()) {
      return apiErrors.badRequest('reportId, name, email, and phone are required');
    }

    const ctx = createDalContext('bootstrap', null);
    const website = await getCrmDb(ctx).website.findUnique({
      where: { id: websiteId },
      select: { userId: true },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const report = await getCrmDb(ctx).rEWebsiteReport.findFirst({
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
      return apiErrors.notFound('Report not found');
    }

    const userCtx = await resolveDalContext(website.userId);
    // Create lead
    const lead = await getCrmDb(userCtx).lead.create({
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
          preferredLanguage: language || 'en',
        },
      },
    });

    await getCrmDb(userCtx).note.create({
      data: {
        leadId: lead.id,
        userId: website.userId,
        content: `Viewed report: ${report.title} (${report.id})`,
      },
    });

    // Trigger campaigns and workflows for secret property leads
    try {
      await processWebsiteTriggers(website.userId, lead.id, 'WEBSITE_SECRET_REPORT_LEAD' as any, { websiteId });
    } catch (e) { console.warn('[secret-reports/unlock] trigger error:', e); }
    try {
      await processCampaignTriggers({
        leadId: lead.id,
        userId: website.userId,
        triggerType: 'WEBSITE_SECRET_REPORT_LEAD',
        metadata: { websiteId, reportId, reportTitle: report.title } as any,
      });
    } catch (e) { console.warn('[secret-reports/unlock] campaign trigger error:', e); }

    syncLeadCreatedToPipeline(website.userId, lead).catch(() => {});

    return NextResponse.json({ report, leadId: lead.id });
  } catch (error: any) {
    console.error('[secret-reports/unlock] Error:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
