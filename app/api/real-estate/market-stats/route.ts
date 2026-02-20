export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const limit = parseInt(searchParams.get('limit') || '24');

    const stats = await prisma.rEMarketStats.findMany({
      where: {
        userId: session.user.id,
        ...(region && { region }),
      },
      orderBy: { periodStart: 'asc' },
      take: limit,
    });

    // Also gather the user's own listing stats from REProperty
    const [propertySummary, listings] = await Promise.all([
      prisma.rEProperty.groupBy({
        by: ['listingStatus'],
        where: { userId: session.user.id },
        _count: true,
        _avg: { listPrice: true, daysOnMarket: true },
      }),
      prisma.rEProperty.findMany({
        where: { userId: session.user.id },
        select: {
          listPrice: true, soldPrice: true, listingStatus: true,
          daysOnMarket: true, createdAt: true, soldDate: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const activeListings = listings.filter((l) => l.listingStatus === 'ACTIVE');
    const soldListings = listings.filter((l) => l.listingStatus === 'SOLD');

    const myStats = {
      totalListings: listings.length,
      activeCount: activeListings.length,
      soldCount: soldListings.length,
      pendingCount: listings.filter((l) => l.listingStatus === 'PENDING').length,
      medianListPrice: median(activeListings.map((l) => l.listPrice).filter(Boolean) as number[]),
      avgDaysOnMarket: avg(activeListings.map((l) => l.daysOnMarket)),
      medianSoldPrice: median(soldListings.map((l) => l.soldPrice || l.listPrice).filter(Boolean) as number[]),
      totalActiveValue: activeListings.reduce((s, l) => s + (l.listPrice || 0), 0),
      statusBreakdown: propertySummary.map((g) => ({
        status: g.listingStatus,
        count: g._count,
        avgPrice: g._avg.listPrice,
        avgDom: g._avg.daysOnMarket,
      })),
    };

    return NextResponse.json({ stats, myStats });
  } catch (error) {
    console.error('Market Stats GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
