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
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '24');
    const mode = searchParams.get('mode') || 'auto'; // 'auto' | 'stored' | 'live'

    // Build location filter for listings
    const locationFilter: any = {};
    if (city) locationFilter.city = { contains: city, mode: 'insensitive' };
    if (state) locationFilter.state = { contains: state, mode: 'insensitive' };

    // Fetch stored stats (previously generated/seeded)
    const storedStats = await prisma.rEMarketStats.findMany({
      where: {
        userId: session.user.id,
        ...(region && { region }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(state && { state: { contains: state, mode: 'insensitive' } }),
      },
      orderBy: { periodStart: 'asc' },
      take: limit,
    });

    // Calculate LIVE stats from actual REProperty + REFSBOListing data
    const [properties, fsboListings, allProperties] = await Promise.all([
      prisma.rEProperty.findMany({
        where: { userId: session.user.id, ...locationFilter },
        select: {
          listPrice: true, soldPrice: true, listingStatus: true,
          daysOnMarket: true, createdAt: true, soldDate: true, listingDate: true,
          sqft: true, city: true, state: true, beds: true, baths: true,
          propertyType: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rEFSBOListing.findMany({
        where: {
          assignedUserId: session.user.id,
          ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
          ...(state ? { state: { contains: state, mode: 'insensitive' } } : {}),
        },
        select: {
          listPrice: true, daysOnMarket: true, city: true, state: true,
          sqft: true, beds: true, baths: true, status: true, createdAt: true,
          firstSeenAt: true, propertyType: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      // All user properties (for available locations)
      prisma.rEProperty.findMany({
        where: { userId: session.user.id },
        select: { city: true, state: true },
        distinct: ['city', 'state'],
      }),
    ]);

    const activeListings = properties.filter((l) => l.listingStatus === 'ACTIVE');
    const soldListings = properties.filter((l) => l.listingStatus === 'SOLD');
    const pendingListings = properties.filter((l) => l.listingStatus === 'PENDING');

    // Active prices for median/avg calculations
    const activePrices = activeListings.map((l) => l.listPrice).filter(Boolean) as number[];
    const soldPrices = soldListings.map((l) => l.soldPrice || l.listPrice).filter(Boolean) as number[];
    const allPrices = [...activePrices, ...soldPrices];

    // Days on market
    const activeDom = activeListings.map((l) => l.daysOnMarket).filter((d) => d > 0);
    const soldDom = soldListings.map((l) => l.daysOnMarket).filter((d) => d > 0);
    const allDom = [...activeDom, ...soldDom];

    // Price per sqft
    const pricePerSqft = activeListings
      .filter((l) => l.listPrice && l.sqft && l.sqft > 0)
      .map((l) => (l.listPrice! / l.sqft!));

    // FSBO stats
    const fsboActive = fsboListings.filter((f: any) => f.status === 'NEW' || f.status === 'CONTACTED' || f.status === 'FOLLOW_UP');
    const fsboPrices = fsboListings.map((f: any) => f.listPrice).filter(Boolean) as number[];

    // Calculate monthly trends from sold data (for charts)
    const monthlyTrends = calculateMonthlyTrends(properties, fsboListings);

    // List-to-sale ratio
    const listToSaleRatios = soldListings
      .filter((l) => l.listPrice && l.soldPrice && l.listPrice > 0)
      .map((l) => l.soldPrice! / l.listPrice!);
    const avgListToSale = listToSaleRatios.length > 0
      ? listToSaleRatios.reduce((s, r) => s + r, 0) / listToSaleRatios.length : 0;

    // Months of supply
    const last30Days = new Date(Date.now() - 30 * 86400000);
    const recentSold = soldListings.filter((l) => l.soldDate && new Date(l.soldDate) >= last30Days).length;
    const monthsOfSupply = recentSold > 0 ? activeListings.length / recentSold : activeListings.length > 0 ? 99 : 0;

    // Previous period comparison (last 30d vs prior 30d)
    const prev60 = new Date(Date.now() - 60 * 86400000);
    const recentProperties = properties.filter((p) => new Date(p.createdAt) >= last30Days);
    const prevProperties = properties.filter((p) => new Date(p.createdAt) >= prev60 && new Date(p.createdAt) < last30Days);
    const recentMedian = median(recentProperties.map((p) => p.listPrice).filter(Boolean) as number[]);
    const prevMedian = median(prevProperties.map((p) => p.listPrice).filter(Boolean) as number[]);
    const priceChange = prevMedian > 0 ? ((recentMedian - prevMedian) / prevMedian) * 100 : 0;

    // Available locations from user's data
    const locationSet = new Set<string>();
    for (const p of allProperties) {
      if (p.city) locationSet.add(`${p.city}, ${p.state}`);
    }
    const locations = Array.from(locationSet).sort();

    const liveStats = {
      medianSalePrice: median(allPrices),
      avgSalePrice: avg(allPrices),
      medianListPrice: median(activePrices),
      medianSoldPrice: median(soldPrices),
      activeListings: activeListings.length,
      closedSales: soldListings.length,
      pendingListings: pendingListings.length,
      domMedian: median(allDom),
      domAvg: Math.round(avg(allDom)),
      pricePerSqft: Math.round(avg(pricePerSqft)),
      monthsOfSupply: Math.round(monthsOfSupply * 10) / 10,
      listToSaleRatio: Math.round(avgListToSale * 1000) / 1000,
      totalActiveValue: activeListings.reduce((s, l) => s + (l.listPrice || 0), 0),
      newListingsThisMonth: recentProperties.length,
      priceChangePercent: Math.round(priceChange * 10) / 10,
      fsboListings: fsboListings.length,
      fsboActive: fsboActive.length,
      fsboMedianPrice: median(fsboPrices),
      // Property type breakdown
      typeBreakdown: getPropertyTypeBreakdown(properties),
      // Price range distribution
      priceDistribution: getPriceDistribution(allPrices),
      // Status breakdown
      statusBreakdown: [
        { status: 'ACTIVE', count: activeListings.length },
        { status: 'PENDING', count: pendingListings.length },
        { status: 'SOLD', count: soldListings.length },
      ],
    };

    const myStats = {
      totalListings: properties.length,
      activeCount: activeListings.length,
      soldCount: soldListings.length,
      pendingCount: pendingListings.length,
      medianListPrice: median(activePrices),
      avgDaysOnMarket: Math.round(avg(activeDom)),
      medianSoldPrice: median(soldPrices),
      totalActiveValue: liveStats.totalActiveValue,
      statusBreakdown: liveStats.statusBreakdown.map((s) => ({
        status: s.status,
        count: s.count,
        avgPrice: avg(properties.filter((p) => p.listingStatus === s.status).map((p) => p.listPrice).filter(Boolean) as number[]),
        avgDom: avg(properties.filter((p) => p.listingStatus === s.status).map((p) => p.daysOnMarket).filter((d) => d > 0)),
      })),
    };

    return NextResponse.json({
      stats: storedStats,
      liveStats,
      myStats,
      monthlyTrends,
      locations,
      dataSource: {
        properties: properties.length,
        fsboListings: fsboListings.length,
        storedStats: storedStats.length,
        location: city || state || region || 'All Areas',
      },
    });
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

    // Compute live stats from actual listing data and store them
    if (body.action === 'compute_live') {
      const city = body.city || null;
      const state = body.state || null;
      const regionName = body.region || (city && state ? `${city}, ${state}` : 'All Areas');

      const locationFilter: any = {};
      if (city) locationFilter.city = { contains: city, mode: 'insensitive' };
      if (state) locationFilter.state = { contains: state, mode: 'insensitive' };

      const properties = await prisma.rEProperty.findMany({
        where: { userId: session.user.id, ...locationFilter },
        select: { listPrice: true, soldPrice: true, listingStatus: true, daysOnMarket: true, sqft: true, createdAt: true, soldDate: true },
      });

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const active = properties.filter((p) => p.listingStatus === 'ACTIVE');
      const sold = properties.filter((p) => p.listingStatus === 'SOLD');
      const activePrices = active.map((p) => p.listPrice).filter(Boolean) as number[];
      const soldPrices = sold.map((p) => p.soldPrice || p.listPrice).filter(Boolean) as number[];
      const allPrices = [...activePrices, ...soldPrices];

      const stat = await prisma.rEMarketStats.create({
        data: {
          userId: session.user.id,
          periodStart,
          periodEnd,
          periodType: 'MONTHLY',
          region: regionName,
          city,
          state,
          medianSalePrice: median(allPrices) || null,
          avgSalePrice: Math.round(avg(allPrices)) || null,
          domMedian: Math.round(median(properties.map((p) => p.daysOnMarket).filter((d) => d > 0))) || null,
          domAvg: Math.round(avg(properties.map((p) => p.daysOnMarket).filter((d) => d > 0)) * 10) / 10 || null,
          newListings: properties.filter((p) => new Date(p.createdAt) >= periodStart).length,
          closedSales: sold.length,
          activeInventory: active.length,
          monthsOfSupply: sold.length > 0 ? Math.round((active.length / sold.length) * 10) / 10 : null,
          listToSaleRatio: null,
          priceReductions: null,
          source: 'live_computed',
        },
      });

      return NextResponse.json({ success: true, stat, message: `Computed live stats for ${regionName} from ${properties.length} listings` });
    }

    // Bulk seed: generate sample market data (kept for backwards compatibility)
    if (body.action === 'seed_sample') {
      const region = body.region || 'Local Market';
      const cityVal = body.city || '';
      const stateVal = body.state || '';
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
          city: cityVal || null,
          state: stateVal || null,
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
      return NextResponse.json({ success: true, created: created.count, message: `Generated ${created.count} months of sample market data for ${region}` });
    }

    // Manual single entry
    const {
      region: bodyRegion, city: bodyCity, state: bodyState,
      periodStart, periodEnd, periodType,
      medianSalePrice, avgSalePrice, domMedian, domAvg,
      newListings, closedSales, activeInventory,
      monthsOfSupply, listToSaleRatio, priceReductions, source,
    } = body;

    if (!bodyRegion || !periodStart || !periodEnd) {
      return NextResponse.json({ error: 'region, periodStart, periodEnd required' }, { status: 400 });
    }

    const stat = await prisma.rEMarketStats.create({
      data: {
        userId: session.user.id,
        region: bodyRegion,
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

// Utility functions

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

function calculateMonthlyTrends(properties: any[], fsboListings: any[]) {
  const months: Record<string, { listings: number; sold: number; medianPrice: number; prices: number[]; dom: number[] }> = {};
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { listings: 0, sold: 0, medianPrice: 0, prices: [], dom: [] };
  }

  for (const p of properties) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].listings++;
      if (p.listPrice) months[key].prices.push(p.listPrice);
      if (p.daysOnMarket > 0) months[key].dom.push(p.daysOnMarket);
    }
    if (p.listingStatus === 'SOLD' && p.soldDate) {
      const sd = new Date(p.soldDate);
      const sk = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}`;
      if (months[sk]) months[sk].sold++;
    }
  }

  return Object.entries(months).map(([month, data]) => ({
    month,
    newListings: data.listings,
    closedSales: data.sold,
    medianPrice: median(data.prices),
    avgPrice: Math.round(avg(data.prices)),
    medianDom: median(data.dom),
  }));
}

function getPropertyTypeBreakdown(properties: any[]) {
  const counts: Record<string, number> = {};
  for (const p of properties) {
    const t = p.propertyType || 'OTHER';
    counts[t] = (counts[t] || 0) + 1;
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

function getPriceDistribution(prices: number[]) {
  const ranges = [
    { label: 'Under $200K', min: 0, max: 200000 },
    { label: '$200K-$400K', min: 200000, max: 400000 },
    { label: '$400K-$600K', min: 400000, max: 600000 },
    { label: '$600K-$800K', min: 600000, max: 800000 },
    { label: '$800K-$1M', min: 800000, max: 1000000 },
    { label: '$1M+', min: 1000000, max: Infinity },
  ];
  return ranges.map((r) => ({
    range: r.label,
    count: prices.filter((p) => p >= r.min && p < r.max).length,
  }));
}
