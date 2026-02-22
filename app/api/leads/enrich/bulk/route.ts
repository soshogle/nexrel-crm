import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dataEnrichmentService } from '@/lib/data-enrichment-service';
import { leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/leads/enrich/bulk - Bulk enrich multiple leads
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid leadIds array' },
        { status: 400 }
      );
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify all leads belong to user
    const leads = await leadService.findMany(ctx, {
      where: { id: { in: leadIds } },
      select: { id: true },
      take: leadIds.length,
    } as any);

    if (leads.length !== leadIds.length) {
      return NextResponse.json(
        { error: 'Some leads not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`🔍 Starting bulk enrichment for ${leadIds.length} leads...`);

    // Enrich leads
    const result = await dataEnrichmentService.enrichLeadsBulk(leadIds);

    return NextResponse.json({
      success: true,
      enriched: result.success,
      failed: result.failed,
      message: `Enriched ${result.success} leads, ${result.failed} failed`,
    });
  } catch (error: any) {
    console.error('❌ Bulk enrichment API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich leads' },
      { status: 500 }
    );
  }
}
