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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Bulk seed: generate sample market data for the user
    if (body.action === 'seed_sample') {
      const region = body.region || 'Local Market';
      const city = body.city || '';
      const state = body.state || '';
      const months = body.months || 12;

      const records = [];
      const now = new Date();
      let baseMedian = 380000 + Math.random() * 120000;

      for (let i = months - 1; i >= 0; i--) {
        const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const seasonalFactor = 1 + 0.03 * Math.sin((periodStart.getMonth() - 3) * Math.PI / 6);
        const trendGrowth = 1 + (months - i) * 0.003;
        const noise = 0.97 + Math.random() * 0.06;

        const medianPrice = Math.round(baseMedian * seasonalFactor * trendGrowth * noise);
        const avgPrice = Math.round(medianPrice * (1.05 + Math.random() * 0.1));
        const newListings = Math.round(40 + Math.random() * 60);
        const closedSales = Math.round(newListings * (0.55 + Math.random() * 0.3));
        const activeInventory = Math.round(newListings * (1.5 + Math.random() * 1.5));

        records.push({
          userId: session.user.id,
          periodStart,
          periodEnd,
          periodType: 'MONTHLY' as const,
          region,
          city: city || null,
          state: state || null,
          medianSalePrice: medianPrice,
          avgSalePrice: avgPrice,
          domMedian: Math.round(18 + Math.random() * 25),
          domAvg: parseFloat((22 + Math.random() * 20).toFixed(1)),
          newListings,
          closedSales,
          activeInventory,
          monthsOfSupply: parseFloat((activeInventory / Math.max(closedSales, 1)).toFixed(1)),
          listToSaleRatio: parseFloat((0.95 + Math.random() * 0.06).toFixed(3)),
          priceReductions: Math.round(newListings * (0.1 + Math.random() * 0.15)),
          source: 'sample_seed',
        });
      }

      const created = await prisma.rEMarketStats.createMany({ data: records });

      return NextResponse.json({
        success: true,
        created: created.count,
        message: `Generated ${created.count} months of sample market data for ${region}`,
      });
    }

    // Manual single entry
    const {
      region, city: bodyCity, state: bodyState,
      periodStart, periodEnd, periodType,
      medianSalePrice, avgSalePrice, domMedian, domAvg,
      newListings, closedSales, activeInventory,
      monthsOfSupply, listToSaleRatio, priceReductions, source,
    } = body;

    if (!region || !periodStart || !periodEnd) {
      return NextResponse.json({ error: 'region, periodStart, periodEnd required' }, { status: 400 });
    }

    const stat = await prisma.rEMarketStats.create({
      data: {
        userId: session.user.id,
        region,
        city: bodyCity || null,
        state: bodyState || null,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        periodType: periodType || 'MONTHLY',
        medianSalePrice: medianSalePrice ? parseFloat(medianSalePrice) : null,
        avgSalePrice: avgSalePrice ? parseFloat(avgSalePrice) : null,
        domMedian: domMedian ? parseInt(domMedian) : null,
        domAvg: domAvg ? parseFloat(domAvg) : null,
        newListings: newListings ? parseInt(newListings) : null,
        closedSales: closedSales ? parseInt(closedSales) : null,
        activeInventory: activeInventory ? parseInt(activeInventory) : null,
        monthsOfSupply: monthsOfSupply ? parseFloat(monthsOfSupply) : null,
        listToSaleRatio: listToSaleRatio ? parseFloat(listToSaleRatio) : null,
        priceReductions: priceReductions ? parseInt(priceReductions) : null,
        source: source || 'manual',
      },
    });

    return NextResponse.json({ success: true, stat });
  } catch (error) {
    console.error('Market Stats POST error:', error);
    return NextResponse.json({ error: 'Failed to save market stats' }, { status: 500 });
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
