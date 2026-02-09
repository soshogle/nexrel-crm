/**
 * GET /api/admin/twilio-failover/events
 * Get failover events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const events = await prisma.twilioFailoverEvent.findMany({
      where,
      include: {
        fromAccount: {
          select: {
            id: true,
            name: true,
            accountSid: true,
          },
        },
        toAccount: {
          select: {
            id: true,
            name: true,
            accountSid: true,
          },
        },
      },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get events' },
      { status: 500 }
    );
  }
}
