/**
 * GET /api/websites/[id]/secret-reports
 * Returns reports published to Secret Properties page for a website.
 * Auth: x-website-secret header (for template server fetches)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
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

    const ctx = createDalContext('bootstrap', null);
    const website = await getCrmDb(ctx).website.findUnique({
      where: { id: websiteId },
      select: { id: true },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    // List only — do not expose full content until user unlocks with email/phone
    const reports = await getCrmDb(ctx).rEWebsiteReport.findMany({
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
    return apiErrors.internal();
  }
}
