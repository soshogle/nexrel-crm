/**
 * Preview Audience API
 * Returns count of leads matching audience filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { filters } = body;

    if (!filters) {
      return NextResponse.json({ error: 'Filters are required' }, { status: 400 });
    }

    // Build Prisma query based on filters
    const where: any = {
      userId: session.user.id,
    };

    // Lead score filter
    if (filters.minLeadScore) {
      where.score = {
        gte: filters.minLeadScore,
      };
    }

    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      where.status = {
        in: filters.statuses,
      };
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    // Type filter
    if (filters.types && filters.types.length > 0) {
      where.type = {
        in: filters.types,
      };
    }

    // Phone requirement
    if (filters.hasPhone) {
      where.phone = {
        not: null,
      };
    }

    // Email requirement
    if (filters.hasEmail) {
      where.email = {
        not: null,
      };
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
