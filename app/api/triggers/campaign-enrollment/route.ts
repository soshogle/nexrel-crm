import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getCrmDb, leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { processCampaignTriggers } from '@/lib/campaign-triggers';

/**
 * API endpoint to process campaign triggers
 * This can be called when specific events occur in the system
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getCrmDb(ctx);
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { leadId, triggerType, metadata } = body;

    if (!leadId || !triggerType) {
      return NextResponse.json(
        { error: 'leadId and triggerType are required' },
        { status: 400 }
      );
    }

    // Verify lead exists and belongs to user
    const lead = await leadService.findUnique(ctx, leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Process triggers
    const result = await processCampaignTriggers({
      leadId,
      userId: user.id,
      triggerType,
      metadata,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error processing campaign triggers:', error);
    return NextResponse.json(
      { error: 'Failed to process campaign triggers' },
      { status: 500 }
    );
  }
}
