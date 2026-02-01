import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dataEnrichmentService } from '@/lib/data-enrichment-service';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/leads/enrich - Enrich a single lead
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Missing required field: leadId' },
        { status: 400 }
      );
    }

    // Verify lead belongs to user
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        userId: session.user.id,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found or access denied' },
        { status: 404 }
      );
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
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Lead enrichment API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich lead' },
      { status: 500 }
    );
  }
}
