/**
 * Market data utilities — fetches stored Centris/iGEN stats for use
 * in CMA reports, listing presentations, buyer/seller reports, etc.
 */

import { prisma } from '@/lib/db';

export interface MarketSnapshot {
  region: string;
  propertyCategory?: string;
  period: string;
  medianSalePrice?: number;
  avgSalePrice?: number;
  medianAskingPrice?: number;
  avgAskingPrice?: number;
  domAvg?: number;
  sellingTimeMedian?: number;
  closePriceToAskingRatio?: number;
  closePriceToOriginalRatio?: number;
  activeInventory?: number;
  newListings?: number;
  numberOfSales?: number;
  sampleSize?: number;
}

export interface MarketContext {
  current: MarketSnapshot | null;
  trend: MarketSnapshot[];
  priceByRange: MarketSnapshot[];
  summary: string;
}

/**
 * Get recent market data for a region/category, optimised for CMA & presentations.
 */
export async function getMarketContext(
  userId: string,
  opts: {
    region?: string;
    city?: string;
    propertyCategory?: string;
    months?: number;
  } = {}
): Promise<MarketContext> {
  const { region, city, propertyCategory, months = 12 } = opts;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const where: any = {
    userId,
    periodStart: { gte: cutoff },
    ...(region && { region: { contains: region, mode: 'insensitive' } }),
    ...(city && { city: { contains: city, mode: 'insensitive' } }),
    ...(propertyCategory && {
      propertyCategory: { contains: propertyCategory, mode: 'insensitive' },
    }),
  };

  const rows = await prisma.rEMarketStats.findMany({
    where,
    orderBy: { periodStart: 'desc' },
    take: 200,
  });

  const monthlyRows = rows.filter((r) => r.periodType === 'MONTHLY' && !r.priceRange);
  const priceRangeRows = rows.filter((r) => !!r.priceRange);

  const toSnapshot = (r: (typeof rows)[0]): MarketSnapshot => ({
    region: r.region,
    propertyCategory: r.propertyCategory ?? undefined,
    period: `${r.periodStart.toISOString().slice(0, 7)}`,
    medianSalePrice: r.medianSalePrice ?? undefined,
    avgSalePrice: r.avgSalePrice ?? undefined,
    medianAskingPrice: r.medianAskingPrice ?? undefined,
    avgAskingPrice: r.avgAskingPrice ?? undefined,
    domAvg: r.domAvg ?? undefined,
    sellingTimeMedian: r.sellingTimeMedian ?? undefined,
    closePriceToAskingRatio: r.closePriceToAskingRatio ?? undefined,
    closePriceToOriginalRatio: r.closePriceToOriginalRatio ?? undefined,
    activeInventory: r.activeInventory ?? undefined,
    newListings: r.newListings ?? undefined,
    numberOfSales: r.numberOfSales ?? undefined,
    sampleSize: r.sampleSize ?? undefined,
  });

  const trend = monthlyRows.map(toSnapshot).reverse();
  const current = trend.length > 0 ? trend[trend.length - 1] : null;
  const priceByRange = priceRangeRows.map((r) => ({
    ...toSnapshot(r),
    period: r.priceRange || '',
  }));

  const summary = buildMarketSummary(current, trend);

  return { current, trend, priceByRange, summary };
}

function buildMarketSummary(
  current: MarketSnapshot | null,
  trend: MarketSnapshot[]
): string {
  if (!current) return 'No market data available for this area.';

  const parts: string[] = [];
  const region = current.region;
  const cat = current.propertyCategory || 'properties';

  if (current.medianSalePrice) {
    parts.push(
      `The median sale price for ${cat} in ${region} is $${current.medianSalePrice.toLocaleString()}`
    );
  }
  if (current.domAvg) {
    parts.push(`averaging ${current.domAvg} days on market`);
  }
  if (current.closePriceToAskingRatio) {
    parts.push(
      `with a close-to-asking price ratio of ${current.closePriceToAskingRatio}%`
    );
  }

  if (trend.length >= 3) {
    const recentPrices = trend
      .slice(-3)
      .map((t) => t.medianSalePrice)
      .filter(Boolean) as number[];
    if (recentPrices.length >= 2) {
      const first = recentPrices[0];
      const last = recentPrices[recentPrices.length - 1];
      const pctChange = ((last - first) / first) * 100;
      const direction =
        pctChange > 2 ? 'trending upward' : pctChange < -2 ? 'trending downward' : 'stable';
      parts.push(`Prices are ${direction} over the past ${recentPrices.length} months`);
    }
  }

  if (current.activeInventory) {
    parts.push(`with ${current.activeInventory} active listings`);
  }

  return parts.join(', ') + '.';
}

/**
 * Generate market analysis bullet points for presentations from real data.
 */
export function marketBulletPoints(ctx: MarketContext): string[] {
  const bullets: string[] = [];
  const { current, trend } = ctx;

  if (!current) return ['Market data not yet available for this area'];

  if (current.medianSalePrice) {
    bullets.push(
      `Median sale price: $${current.medianSalePrice.toLocaleString()} (${current.region})`
    );
  }
  if (current.avgSalePrice) {
    bullets.push(`Average sale price: $${current.avgSalePrice.toLocaleString()}`);
  }
  if (current.domAvg) {
    bullets.push(`Average days on market: ${current.domAvg} days`);
  }
  if (current.closePriceToAskingRatio) {
    bullets.push(
      `Sale-to-list price ratio: ${current.closePriceToAskingRatio}%`
    );
  }
  if (current.closePriceToOriginalRatio) {
    bullets.push(
      `Sale-to-original price ratio: ${current.closePriceToOriginalRatio}%`
    );
  }
  if (current.activeInventory) {
    bullets.push(`Active inventory: ${current.activeInventory} listings`);
  }

  if (trend.length >= 3) {
    const recentDOM = trend
      .slice(-3)
      .map((t) => t.domAvg)
      .filter(Boolean) as number[];
    if (recentDOM.length >= 2) {
      const avg = Math.round(recentDOM.reduce((a, b) => a + b, 0) / recentDOM.length);
      bullets.push(`3-month average DOM: ${avg} days`);
    }
  }

  return bullets;
}
