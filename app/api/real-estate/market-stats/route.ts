export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const propertyCategory = searchParams.get('propertyCategory');
    const periodType = searchParams.get('periodType');
    const limit = parseInt(searchParams.get('limit') || '200');
    const mode = searchParams.get('mode') || 'auto'; // 'auto' | 'stored' | 'live'
    const scope = searchParams.get('scope') || 'market'; // 'broker' = own listings only, 'market' = all (incl. MLS imports)

    // Build location filter for listings
    const locationFilter: any = {};
    if (city) locationFilter.city = { contains: city, mode: 'insensitive' };
    if (state) locationFilter.state = { contains: state, mode: 'insensitive' };

    // When scope=broker, only include the broker's own listings
    if (scope === 'broker') {
      locationFilter.OR = [
        { isBrokerListing: true },
        { sellerLeadId: { not: null } },
      ];
    }

    // Fetch shared Quebec stats (Centris PDFs) — global market data
    const sharedStats = await prisma.rEMarketStats.findMany({
      where: {
        isShared: true,
        priceRange: null,
        ...(region && { region: { contains: region, mode: 'insensitive' } }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(state && { state: { contains: state, mode: 'insensitive' } }),
        ...(propertyCategory && { propertyCategory: { contains: propertyCategory, mode: 'insensitive' } }),
        ...(periodType && { periodType: periodType as any }),
      },
      orderBy: { periodStart: 'asc' },
      take: limit,
    });

    // Fetch user's own stored stats (compute_live, seed_sample, manual)
    const userStoredStats = await prisma.rEMarketStats.findMany({
      where: {
        userId: session.user.id,
        priceRange: null,
        ...(region && { region: { contains: region, mode: 'insensitive' } }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(state && { state: { contains: state, mode: 'insensitive' } }),
        ...(propertyCategory && { propertyCategory: { contains: propertyCategory, mode: 'insensitive' } }),
        ...(periodType && { periodType: periodType as any }),
      },
      orderBy: { periodStart: 'asc' },
      take: limit,
    });

    // Calculate LIVE stats from actual REProperty + REFSBOListing + RERentalListing data
    const [properties, fsboListings, rentalListings, allProperties] = await Promise.all([
      prisma.rEProperty.findMany({
        where: { userId: session.user.id, ...locationFilter },
        select: {
          listPrice: true, soldPrice: true, listingStatus: true,
          daysOnMarket: true, createdAt: true, soldDate: true, listingDate: true,
          sqft: true, city: true, state: true, beds: true, baths: true,
          propertyType: true, isBrokerListing: true,
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
      prisma.rERentalListing.findMany({
        where: {
          userId: session.user.id,
          ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
          ...(state ? { state: { contains: state, mode: 'insensitive' } } : {}),
        },
        select: {
          rentPrice: true, listingStatus: true, daysOnMarket: true, createdAt: true,
          sqft: true, city: true, state: true, beds: true, baths: true,
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

    // Compute DOM from listingDate when daysOnMarket is missing
    // Only use createdAt fallback for broker's own listings — never for bulk MLS imports
    const now = new Date();
    const getDom = (p: { daysOnMarket: number | null; listingDate: Date | null; soldDate: Date | null; listingStatus: string; createdAt: Date; isBrokerListing: boolean }) => {
      if (p.daysOnMarket != null && p.daysOnMarket > 0) return p.daysOnMarket;
      const listDate = p.listingDate
        ? new Date(p.listingDate)
        : (p.isBrokerListing && p.listingStatus === 'ACTIVE' ? new Date(p.createdAt) : null);
      if (!listDate) return 0;
      const endDate = p.listingStatus === 'SOLD' && p.soldDate ? new Date(p.soldDate) : now;
      return Math.max(0, Math.floor((endDate.getTime() - listDate.getTime()) / 86400000));
    };
    const activeDom = activeListings.map((l) => getDom(l)).filter((d) => d > 0);
    const soldDom = soldListings.map((l) => getDom(l)).filter((d) => d > 0);
    const allDom = [...activeDom, ...soldDom];

    // Active prices for median/avg calculations
    const activePrices = activeListings.map((l) => l.listPrice).filter(Boolean) as number[];
    const soldPrices = soldListings.map((l) => l.soldPrice || l.listPrice).filter(Boolean) as number[];
    const allPrices = [...activePrices, ...soldPrices];

    // Price per sqft — include both active and sold
    const pricePerSqft = [
      ...activeListings.filter((l) => l.listPrice && l.sqft && l.sqft > 0).map((l) => l.listPrice! / l.sqft!),
      ...soldListings.filter((l) => (l.soldPrice || l.listPrice) && l.sqft && l.sqft > 0).map((l) => (l.soldPrice || l.listPrice)!/ l.sqft!),
    ];

    // FSBO stats
    const fsboActive = fsboListings.filter((f: any) => f.status === 'NEW' || f.status === 'CONTACTED' || f.status === 'FOLLOW_UP');
    const fsboPrices = fsboListings.map((f: any) => f.listPrice).filter(Boolean) as number[];

    // Monthly trends: My Portfolio (user listings only) — no mixing with Centris
    const myMonthlyTrends = calculateMonthlyTrends(properties, fsboListings, []);
    // Monthly trends: Quebec Market (shared Centris stats only)
    const globalMonthlyTrends = sharedStatsToMonthlyTrends(sharedStats);

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

    // Available locations from user's data (properties + rentals)
    const locationSet = new Set<string>();
    for (const p of allProperties) {
      if (p.city) locationSet.add(`${p.city}, ${p.state}`);
    }
    for (const r of rentalListings) {
      if (r.city) locationSet.add(`${r.city}, ${r.state}`);
    }
    const locations = Array.from(locationSet).sort();

    // Global Quebec stats (from shared Centris data) — no mixing with user data
    const latestShared = sharedStats.length > 0
      ? sharedStats.reduce((a, b) => (new Date(b.periodStart) > new Date(a.periodStart) ? b : a))
      : null;

    const globalStats = latestShared ? {
      medianSalePrice: latestShared.medianSalePrice ?? 0,
      avgSalePrice: Math.round(latestShared.avgSalePrice ?? 0),
      medianListPrice: latestShared.medianAskingPrice ?? latestShared.medianSalePrice ?? 0,
      activeListings: latestShared.activeInventory ?? 0,
      closedSales: latestShared.closedSales ?? 0,
      domMedian: latestShared.domMedian ?? Math.round(latestShared.domAvg ?? 0),
      domAvg: Math.round(latestShared.domAvg ?? 0),
      monthsOfSupply: latestShared.monthsOfSupply ?? 0,
      listToSaleRatio: latestShared.closePriceToAskingRatio != null ? latestShared.closePriceToAskingRatio / 100 : 0,
      newListings: latestShared.newListings ?? 0,
      region: latestShared.region,
      period: latestShared.periodStart.toISOString().slice(0, 7),
      source: latestShared.source ?? undefined,
    } : null;

    // My Portfolio stats (user listings only) — no fallback to Centris
    const totalActiveWithRentals = activeListings.length + rentalListings.filter((r: any) => r.listingStatus === 'ACTIVE').length;
    const myStats = {
      totalListings: properties.length,
      activeCount: activeListings.length,
      soldCount: soldListings.length,
      pendingCount: pendingListings.length,
      activeListings: activeListings.length,
      totalActiveListings: totalActiveWithRentals,
      closedSales: soldListings.length,
      medianListPrice: median(activePrices),
      medianSalePrice: median(allPrices),
      avgSalePrice: Math.round(avg(allPrices)),
      avgDaysOnMarket: Math.round(avg(allDom)),
      medianSoldPrice: median(soldPrices),
      totalActiveValue: activeListings.reduce((s, l) => s + (l.listPrice || 0), 0),
      domMedian: median(allDom) || 0,
      domAvg: Math.round(avg(allDom)),
      pricePerSqft: Math.round(avg(pricePerSqft)),
      monthsOfSupply: Math.round(monthsOfSupply * 10) / 10,
      listToSaleRatio: listToSaleRatios.length > 0 ? Math.round(avgListToSale * 1000) / 1000 : 0,
      newListingsThisMonth: recentProperties.length,
      priceChangePercent: Math.round(priceChange * 10) / 10,
      fsboListings: fsboListings.length,
      fsboActive: fsboActive.length,
      fsboMedianPrice: median(fsboPrices),
      rentalListings: rentalListings.length,
      rentalActive: rentalListings.filter((r: any) => r.listingStatus === 'ACTIVE').length,
      typeBreakdown: getPropertyTypeBreakdown(properties),
      priceDistribution: getPriceDistribution(allPrices),
      statusBreakdown: [
        { status: 'ACTIVE', count: activeListings.length },
        { status: 'PENDING', count: pendingListings.length },
        { status: 'SOLD', count: soldListings.length },
      ].map((s) => {
        const subset = properties.filter((p) => p.listingStatus === s.status);
        const doms = subset.map((p) => getDom(p)).filter((d) => d > 0);
        return {
          status: s.status,
          count: s.count,
          avgPrice: avg(subset.map((p) => p.listPrice).filter(Boolean) as number[]),
          avgDom: avg(doms),
        };
      }),
    };

    return NextResponse.json({
      stats: userStoredStats,
      globalStats,
      myStats,
      myMonthlyTrends,
      globalMonthlyTrends,
      monthlyTrends: myMonthlyTrends, // backward compat: primary chart uses my data
      locations,
      scope,
      dataSource: {
        properties: properties.length,
        fsboListings: fsboListings.length,
        rentalListings: rentalListings.length,
        storedStats: sharedStats.length + userStoredStats.length,
        location: city || state || region || 'All Areas',
        scope,
      },
    });
  } catch (error) {
    console.error('Market Stats GET error:', error);
    return apiErrors.internal('Failed to fetch stats');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      // Never allow mock market stats for real estate agents
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { industry: true },
      });
      const industry = user?.industry ?? (session as any)?.user?.industry;
      if (industry === 'REAL_ESTATE' || industry === 'real_estate') {
        return apiErrors.forbidden('Sample market data seeding is disabled for real estate accounts.');
      }
      const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
      if (!isOrthoDemo) {
        return apiErrors.forbidden('Sample seeding is restricted');
      }
      if (process.env.NODE_ENV === 'production') {
        return apiErrors.badRequest('Sample seeding is disabled in production');
      }
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
      return apiErrors.badRequest('region, periodStart, periodEnd required');
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
    return apiErrors.internal('Failed to save market stats');
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

function getDomForTrend(p: { daysOnMarket: number | null; listingDate: Date | null; soldDate: Date | null; listingStatus: string }) {
  if (p.daysOnMarket != null && p.daysOnMarket > 0) return p.daysOnMarket;
  if (!p.listingDate) return 0;
  const listDate = new Date(p.listingDate);
  const now = new Date();
  const endDate = p.listingStatus === 'SOLD' && p.soldDate ? new Date(p.soldDate) : now;
  return Math.max(0, Math.floor((endDate.getTime() - listDate.getTime()) / 86400000));
}

function calculateMonthlyTrends(properties: any[], fsboListings: any[], _storedStats?: any[]) {
  const months: Record<string, { listings: number; sold: number; fsboNew: number; medianPrice: number; prices: number[]; dom: number[] }> = {};
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { listings: 0, sold: 0, fsboNew: 0, medianPrice: 0, prices: [], dom: [] };
  }

  for (const p of properties) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].listings++;
      if (p.listPrice) months[key].prices.push(p.listPrice);
      const domVal = getDomForTrend(p);
      if (domVal > 0) months[key].dom.push(domVal);
    }
    if (p.listingStatus === 'SOLD' && p.soldDate) {
      const sd = new Date(p.soldDate);
      const sk = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}`;
      if (months[sk]) months[sk].sold++;
    }
  }

  for (const f of fsboListings) {
    const d = new Date(f.createdAt || f.firstSeenAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].fsboNew++;
    }
  }

  return Object.entries(months).map(([month, data]) => ({
    month,
    newListings: data.listings,
    closedSales: data.sold,
    fsboNew: data.fsboNew,
    medianPrice: median(data.prices),
    avgPrice: Math.round(avg(data.prices)),
    medianDom: median(data.dom),
  }));
}

function sharedStatsToMonthlyTrends(sharedStats: { periodStart: Date; newListings: number | null; closedSales: number | null; medianSalePrice: number | null; avgSalePrice: number | null; domMedian: number | null }[]) {
  const months: Record<string, { newListings: number; closedSales: number; medianPrice: number; avgPrice: number; medianDom: number }> = {};
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { newListings: 0, closedSales: 0, medianPrice: 0, avgPrice: 0, medianDom: 0 };
  }
  for (const s of sharedStats) {
    const key = s.periodStart.toISOString().slice(0, 7);
    if (months[key]) {
      months[key] = {
        newListings: s.newListings ?? 0,
        closedSales: s.closedSales ?? 0,
        medianPrice: s.medianSalePrice ?? 0,
        avgPrice: Math.round(s.avgSalePrice ?? 0),
        medianDom: s.domMedian ?? 0,
      };
    }
  }
  return Object.entries(months).map(([month, data]) => ({
    month,
    newListings: data.newListings,
    closedSales: data.closedSales,
    fsboNew: 0,
    medianPrice: data.medianPrice,
    avgPrice: data.avgPrice,
    medianDom: data.medianDom,
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
