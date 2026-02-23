import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dataEnrichmentService } from '@/lib/data-enrichment-service';
import { leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/leads/enrich - Enrich a single lead
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return apiErrors.badRequest('Missing required field: leadId');
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Verify lead belongs to user
    const lead = await leadService.findUnique(ctx, leadId);

    if (!lead) {
      return apiErrors.notFound('Lead not found or access denied');
    }

    // Extract domain from website if available
    let domain: string | undefined;
    if (lead.website) {
      try {
        domain = new URL(lead.website).hostname;
      } catch (e) {
        // Invalid URL, skip domain extraction
      }
    }

    // Enrich lead
    const result = await dataEnrichmentService.enrichLead(leadId, {
      email: lead.email || undefined,
      domain,
      firstName: lead.contactPerson?.split(' ')[0],
      lastName: lead.contactPerson?.split(' ').slice(1).join(' '),
      businessName: lead.businessName || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Lead enrichment API error:', error);
    return apiErrors.internal(error.message || 'Failed to enrich lead');
  }
}
