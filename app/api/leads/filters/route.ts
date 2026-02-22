/**
 * API endpoint for lead filter options (statuses, tags)
 * Used by workflow audience panel and campaign builders
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { LeadStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const statuses = Object.values(LeadStatus);

    const leads = await leadService.findMany(ctx, {
      select: { tags: true } as any,
    });

    const tagSet = new Set<string>();
    for (const lead of leads) {
      if (lead.tags) {
        const arr = Array.isArray(lead.tags) ? lead.tags : [];
        arr.forEach((t: unknown) => typeof t === 'string' && tagSet.add(t));
      }
    }

    return NextResponse.json({
      success: true,
      statuses,
      tags: Array.from(tagSet).sort(),
    });
  } catch (error: any) {
    console.error('Error fetching lead filters:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}
