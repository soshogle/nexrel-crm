/**
 * Compute market stats — separate global Quebec (Centris) from user's portfolio.
 * No mixing: globalStats = shared Centris data, myStats = user listings only.
 */
import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export interface LiveMarketStats {
  medianSalePrice: number;
  avgSalePrice: number;
  medianListPrice: number;
  medianSoldPrice: number;
  activeListings: number;
  closedSales: number;
  pendingListings: number;
  domMedian: number;
  domAvg: number;
  pricePerSqft: number;
  monthsOfSupply: number;
  listToSaleRatio: number;
  newListingsThisMonth: number;
  priceChangePercent: number;
  fsboListings: number;
  fsboActive: number;
  fsboMedianPrice: number;
  typeBreakdown: { type: string; count: number }[];
  priceDistribution: { range: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  monthlyTrends: {
    month: string;
    newListings: number;
    closedSales: number;
    medianPrice: number;
    avgPrice: number;
    medianDom: number;
  }[];
  dataSource: {
    properties: number;
    fsboListings: number;
    storedStats: number;
    location: string;
  };
  centrisContext?: {
    region?: string;
    medianSalePrice?: number;
    avgSalePrice?: number;
    dom?: number;
    activeInventory?: number;
    closedSales?: number;
    newListings?: number;
    saleVsListPct?: number;
    monthsOfSupply?: number;
    period?: string;
  };
}

export interface ComputeMarketStatsResult {
  hasData: boolean;
  stats: LiveMarketStats | null;
  globalStats?: {
    medianSalePrice: number;
    region: string;
    period?: string;
  } | null;
  myStats?: LiveMarketStats | null;
  message?: string;
}

async function fetchSharedStats(
  db: ReturnType<typeof getCrmDb>,
  city?: string | null,
  state?: string | null,
) {
  return db.rEMarketStats.findMany({
    where: {
      isShared: true,
      periodType: "MONTHLY",
      priceRange: null,
      ...(city
        ? {
            OR: [
              { city: { contains: city, mode: "insensitive" } },
              { region: { contains: city, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(state ? { state: { contains: state, mode: "insensitive" } } : {}),
    },
    orderBy: { periodStart: "desc" },
    take: 24,
  });
}

export async function computeLiveMarketStats(
  userId: string,
  city?: string | null,
  state?: string | null,
): Promise<ComputeMarketStatsResult> {
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);
  const locationFilter: Record<string, unknown> = {};
  if (city)
    (locationFilter as any).city = { contains: city, mode: "insensitive" };
  if (state)
    (locationFilter as any).state = { contains: state, mode: "insensitive" };

  const [properties, fsboListings, sharedStats] = await Promise.all([
    db.rEProperty.findMany({
      where: { userId, ...locationFilter },
      select: {
        listPrice: true,
        soldPrice: true,
        listingStatus: true,
        daysOnMarket: true,
        createdAt: true,
        soldDate: true,
        listingDate: true,
        sqft: true,
        city: true,
        state: true,
        beds: true,
        baths: true,
        propertyType: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.rEFSBOListing.findMany({
      where: {
        assignedUserId: userId,
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        ...(state ? { state: { contains: state, mode: "insensitive" } } : {}),
      },
      select: {
        listPrice: true,
        daysOnMarket: true,
        city: true,
        state: true,
        sqft: true,
        beds: true,
        baths: true,
        status: true,
        createdAt: true,
        firstSeenAt: true,
        propertyType: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    fetchSharedStats(db, city, state),
  ]);

  const totalListings = properties.length + fsboListings.length;
  const latestShared = sharedStats.length > 0 ? sharedStats[0] : null;

  // Build Centris context from shared Quebec stats
  const centrisContext = latestShared
    ? {
        region: latestShared.region,
        medianSalePrice: latestShared.medianSalePrice ?? undefined,
        avgSalePrice: latestShared.avgSalePrice ?? undefined,
        dom: latestShared.domAvg ?? latestShared.domMedian ?? undefined,
        activeInventory: latestShared.activeInventory ?? undefined,
        closedSales: latestShared.closedSales ?? undefined,
        newListings: latestShared.newListings ?? undefined,
        saleVsListPct: latestShared.closePriceToAskingRatio ?? undefined,
        monthsOfSupply: latestShared.monthsOfSupply ?? undefined,
        period: latestShared.periodStart.toISOString().slice(0, 7),
      }
    : undefined;

  const globalStats = latestShared
    ? {
        medianSalePrice: latestShared.medianSalePrice ?? 0,
        region: latestShared.region,
        period: latestShared.periodStart.toISOString().slice(0, 7),
      }
    : null;

  // If no user listings, use shared Quebec stats for report context (stats = global)
  if (totalListings === 0) {
    if (sharedStats.length > 0) {
      const latest = sharedStats[0];
      const mTrends = [...sharedStats].reverse().map((s) => ({
        month: s.periodStart.toISOString().slice(0, 7),
        newListings: s.newListings ?? 0,
        closedSales: s.closedSales ?? 0,
        medianPrice: s.medianSalePrice ?? 0,
        avgPrice: Math.round(s.avgSalePrice ?? 0),
        medianDom: s.domMedian ?? 0,
      }));

      return {
        hasData: true,
        stats: {
          medianSalePrice: latest.medianSalePrice ?? 0,
          avgSalePrice: Math.round(latest.avgSalePrice ?? 0),
          medianListPrice:
            latest.medianAskingPrice ?? latest.medianSalePrice ?? 0,
          medianSoldPrice: latest.medianSalePrice ?? 0,
          activeListings: latest.activeInventory ?? 0,
          closedSales: latest.closedSales ?? 0,
          pendingListings: 0,
          domMedian: latest.domMedian ?? 0,
          domAvg: Math.round(latest.domAvg ?? 0),
          pricePerSqft: 0,
          monthsOfSupply: latest.monthsOfSupply ?? 0,
          listToSaleRatio: latest.closePriceToAskingRatio
            ? latest.closePriceToAskingRatio / 100
            : 0,
          newListingsThisMonth: latest.newListings ?? 0,
          priceChangePercent: 0,
          fsboListings: 0,
          fsboActive: 0,
          fsboMedianPrice: 0,
          typeBreakdown: latest.propertyCategory
            ? [{ type: latest.propertyCategory, count: latest.sampleSize ?? 0 }]
            : [],
          priceDistribution: [],
          statusBreakdown: [],
          monthlyTrends: mTrends,
          dataSource: {
            properties: 0,
            fsboListings: 0,
            storedStats: sharedStats.length,
            location: latest.city || latest.region || "Quebec Market",
          },
          centrisContext,
        },
        globalStats,
        myStats: null,
      };
    }

    return {
      hasData: false,
      stats: null,
      globalStats: null,
      myStats: null,
      message:
        "No listings found for this region. Add properties or sync your MLS/Centris data to generate reports from real market data.",
    };
  }

  // Compute from live listings
  const activeListings = properties.filter((l) => l.listingStatus === "ACTIVE");
  const soldListings = properties.filter((l) => l.listingStatus === "SOLD");
  const pendingListings = properties.filter(
    (l) => l.listingStatus === "PENDING",
  );

  const activePrices = activeListings
    .map((l) => l.listPrice)
    .filter(Boolean) as number[];
  const soldPrices = soldListings
    .map((l) => l.soldPrice || l.listPrice)
    .filter(Boolean) as number[];
  const allPrices = [...activePrices, ...soldPrices];

  const activeDom = activeListings
    .map((l) => l.daysOnMarket)
    .filter((d) => d != null && d > 0);
  const soldDom = soldListings
    .map((l) => l.daysOnMarket)
    .filter((d) => d != null && d > 0);
  const allDom = [...activeDom, ...soldDom];

  const pricePerSqft = [
    ...activeListings
      .filter((l) => l.listPrice && l.sqft && l.sqft > 0)
      .map((l) => l.listPrice! / l.sqft!),
    ...soldListings
      .filter((l) => (l.soldPrice || l.listPrice) && l.sqft && l.sqft > 0)
      .map((l) => (l.soldPrice || l.listPrice)! / l.sqft!),
  ];

  const fsboActive = fsboListings.filter((f: { status: string }) =>
    ["NEW", "CONTACTED", "FOLLOW_UP"].includes(f.status),
  );
  const fsboPrices = fsboListings
    .map((f) => f.listPrice)
    .filter(Boolean) as number[];

  const listToSaleRatios = soldListings
    .filter((l) => l.listPrice && l.soldPrice && l.listPrice > 0)
    .map((l) => l.soldPrice! / l.listPrice!);
  const avgListToSale =
    listToSaleRatios.length > 0
      ? listToSaleRatios.reduce((s, r) => s + r, 0) / listToSaleRatios.length
      : 0;

  const last30Days = new Date(Date.now() - 30 * 86400000);
  const recentSold = soldListings.filter(
    (l) => l.soldDate && new Date(l.soldDate) >= last30Days,
  ).length;
  const monthsOfSupply =
    recentSold > 0
      ? activeListings.length / recentSold
      : activeListings.length > 0
        ? 99
        : 0;

  const prev60 = new Date(Date.now() - 60 * 86400000);
  const recentProperties = properties.filter(
    (p) => new Date(p.createdAt) >= last30Days,
  );
  const prevProperties = properties.filter(
    (p) =>
      new Date(p.createdAt) >= prev60 && new Date(p.createdAt) < last30Days,
  );
  const recentMedian = median(
    recentProperties.map((p) => p.listPrice).filter(Boolean) as number[],
  );
  const prevMedian = median(
    prevProperties.map((p) => p.listPrice).filter(Boolean) as number[],
  );
  const priceChange =
    prevMedian > 0 ? ((recentMedian - prevMedian) / prevMedian) * 100 : 0;

  // Monthly trends: blend live listing data with stored Centris data
  const months: Record<
    string,
    { listings: number; sold: number; prices: number[]; dom: number[] }
  > = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = { listings: 0, sold: 0, prices: [], dom: [] };
  }
  for (const p of properties) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) {
      months[key].listings++;
      if (p.listPrice) months[key].prices.push(p.listPrice);
      if (p.daysOnMarket != null && p.daysOnMarket > 0)
        months[key].dom.push(p.daysOnMarket);
    }
    if (p.listingStatus === "SOLD" && p.soldDate) {
      const sd = new Date(p.soldDate);
      const sk = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}`;
      if (months[sk]) months[sk].sold++;
    }
  }

  const monthlyTrends = Object.entries(months).map(([month, data]) => ({
    month,
    newListings: data.listings,
    closedSales: data.sold,
    medianPrice: median(data.prices),
    avgPrice: Math.round(avg(data.prices)),
    medianDom: median(data.dom),
  }));

  const typeBreakdown: Record<string, number> = {};
  for (const p of properties) {
    const t = (p.propertyType as string) || "OTHER";
    typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
  }

  const priceRanges = [
    { label: "Under $200K", min: 0, max: 200000 },
    { label: "$200K-$400K", min: 200000, max: 400000 },
    { label: "$400K-$600K", min: 400000, max: 600000 },
    { label: "$600K-$800K", min: 600000, max: 800000 },
    { label: "$800K-$1M", min: 800000, max: 1000000 },
    { label: "$1M+", min: 1000000, max: Infinity },
  ];
  const priceDistribution = priceRanges.map((r) => ({
    range: r.label,
    count: allPrices.filter((p) => p >= r.min && p < r.max).length,
  }));

  const stats: LiveMarketStats = {
    medianSalePrice: median(allPrices),
    avgSalePrice: Math.round(avg(allPrices)),
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
    newListingsThisMonth: recentProperties.length,
    priceChangePercent: Math.round(priceChange * 10) / 10,
    fsboListings: fsboListings.length,
    fsboActive: fsboActive.length,
    fsboMedianPrice: median(fsboPrices),
    typeBreakdown: Object.entries(typeBreakdown)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    priceDistribution,
    statusBreakdown: [
      { status: "ACTIVE", count: activeListings.length },
      { status: "PENDING", count: pendingListings.length },
      { status: "SOLD", count: soldListings.length },
    ],
    monthlyTrends,
    dataSource: {
      properties: properties.length,
      fsboListings: fsboListings.length,
      storedStats: sharedStats.length,
      location:
        city && state ? `${city}, ${state}` : city || state || "All Areas",
    },
    centrisContext,
  };

  return { hasData: true, stats, globalStats, myStats: stats };
}
