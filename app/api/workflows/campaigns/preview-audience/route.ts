/**
 * Preview Audience API
 * Returns count of leads matching audience filters
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { filters, websiteId } = body;

    if (!filters) {
      return NextResponse.json({ error: 'Filters are required' }, { status: 400 });
    }

    // Build Prisma query based on filters
    const where: any = {
      userId: session.user.id,
    };

    // Lead score filter (Lead model uses leadScore, not score)
    if (filters.minLeadScore != null) {
      where.leadScore = { gte: filters.minLeadScore };
    }

    // Status filter
    if (filters.statuses?.length > 0) {
      where.status = { in: filters.statuses };
    }

    // Source filter (e.g. website, website_form for leads from website)
    if (filters.sources?.length > 0) {
      where.source = { in: filters.sources };
    }

    // Website ID filter (when Lead has websiteId - check schema) - Lead may not have websiteId; if it does we use it
    // For now we filter by source; websiteId on Lead would need schema addition

    // Tags filter - Prisma Json doesn't support hasSome; use raw query when tags specified
    if (filters.tags?.length > 0) {
      const tagConditions = Prisma.join(
        filters.tags.map((tag: string) => Prisma.sql`(tags::jsonb ? ${tag}::text)`),
        ' OR '
      );
      const conditions = [
        Prisma.sql`"userId" = ${session.user.id}`,
        Prisma.sql`(${tagConditions})`,
      ];
      if (filters.minLeadScore != null) conditions.push(Prisma.sql`"leadScore" >= ${filters.minLeadScore}`);
      if (filters.statuses?.length) conditions.push(Prisma.sql`status IN (${Prisma.join(filters.statuses.map((s: string) => Prisma.sql`${s}`), ', ')})`);
      if (filters.sources?.length) conditions.push(Prisma.sql`source IN (${Prisma.join(filters.sources.map((s: string) => Prisma.sql`${s}`), ', ')})`);
      if (filters.hasPhone) conditions.push(Prisma.sql`phone IS NOT NULL`);
      if (filters.hasEmail) conditions.push(Prisma.sql`email IS NOT NULL`);
      const [row] = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM "Lead"
        WHERE ${Prisma.join(conditions, ' AND ')}
      `;
      return NextResponse.json({ count: row?.count ?? 0 });
    }

    // Phone requirement
    if (filters.hasPhone) {
      where.phone = { not: null };
    }

    // Email requirement
    if (filters.hasEmail) {
      where.email = { not: null };
    }

    // Count matching leads
    const count = await prisma.lead.count({ where });

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error previewing audience:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to preview audience' },
      { status: 500 }
    );
  }
}
