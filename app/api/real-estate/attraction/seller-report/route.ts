export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';
import { computeLiveMarketStats } from '@/lib/real-estate/compute-market-stats';

interface SellerReportRequest {
  region: string;
  placeData?: { city?: string; state?: string; country?: string };
  priceRange?: string;
  propertyType?: string;
  yearsOwned?: string;
  homeCondition?: string;
  sellerTimeline?: string;
  sellerMotivation?: string;
  hasEquity?: boolean;
  recentRenovations?: boolean;
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body: SellerReportRequest = await request.json();
    const { region, placeData } = body;

    if (!region) return apiErrors.badRequest('Region is required');

    const { hasData, stats, message } = await computeLiveMarketStats(
      session.user.id,
      placeData?.city ?? null,
      placeData?.state ?? null
    );

    if (!hasData || !stats) {
      return NextResponse.json(
        { error: message || 'No market data available for this region.' },
        { status: 400 }
      );
    }

    const loc = placeData?.city && placeData?.state ? `${placeData.city}, ${placeData.state}` : region;

    const demandIndicators: { indicator: string; value: string; trend: 'up' | 'down' | 'stable'; insight: string }[] = [];

    if (stats.activeListings > 0) {
      demandIndicators.push({
        indicator: 'Active Listings',
        value: `${stats.activeListings} listings`,
        trend: 'stable',
        insight: `Current inventory in ${loc}. Median list price: ${formatCurrency(stats.medianListPrice)}.`,
      });
    }

    if (stats.closedSales > 0) {
      demandIndicators.push({
        indicator: 'Closed Sales',
        value: `${stats.closedSales} sales`,
        trend: 'stable',
        insight: `Recent sales activity. Median sold price: ${formatCurrency(stats.medianSoldPrice)}.`,
      });
    }

    if (stats.domMedian > 0) {
      demandIndicators.push({
        indicator: 'Median Days on Market',
        value: `${stats.domMedian} days`,
        trend: stats.domMedian < 30 ? 'down' : stats.domMedian > 45 ? 'up' : 'stable',
        insight: stats.domMedian < 30
          ? 'Homes are selling quickly—strong buyer demand.'
          : stats.domMedian > 45
            ? 'Longer marketing times—pricing and presentation matter.'
            : 'Balanced pace for sellers.',
      });
    }

    if (stats.listToSaleRatio > 0) {
      const pct = (stats.listToSaleRatio * 100).toFixed(1);
      demandIndicators.push({
        indicator: 'List-to-Sale Ratio',
        value: `${pct}%`,
        trend: stats.listToSaleRatio >= 1 ? 'up' : 'down',
        insight: stats.listToSaleRatio >= 1
          ? `Sellers getting ${pct}% of list price on average.`
          : `Buyers paying ${(100 - parseFloat(pct)).toFixed(1)}% below list on average.`,
      });
    }

    if (stats.monthsOfSupply > 0 && stats.monthsOfSupply < 99) {
      demandIndicators.push({
        indicator: 'Months of Supply',
        value: `${stats.monthsOfSupply} months`,
        trend: stats.monthsOfSupply < 4 ? 'down' : stats.monthsOfSupply > 6 ? 'up' : 'stable',
        insight: stats.monthsOfSupply < 4
          ? 'Low inventory—favorable for sellers.'
          : stats.monthsOfSupply > 6
            ? 'Higher inventory—competition among sellers.'
            : 'Balanced market conditions.',
      });
    }

    if (stats.priceChangePercent !== 0) {
      demandIndicators.push({
        indicator: 'Price Change (vs Prior Period)',
        value: `${stats.priceChangePercent > 0 ? '+' : ''}${stats.priceChangePercent}%`,
        trend: stats.priceChangePercent > 0 ? 'up' : stats.priceChangePercent < 0 ? 'down' : 'stable',
        insight: stats.priceChangePercent > 0
          ? 'Prices trending up—strong market.'
          : 'Prices softening—strategic pricing important.',
      });
    }

    if (stats.newListingsThisMonth > 0) {
      demandIndicators.push({
        indicator: 'New Listings This Month',
        value: `${stats.newListingsThisMonth}`,
        trend: 'stable',
        insight: `New inventory added. Monitor competition when listing.`,
      });
    }

    const equityParts: string[] = [];
    if (stats.medianSoldPrice > 0) {
      equityParts.push(`Median sold price in ${loc} is ${formatCurrency(stats.medianSoldPrice)} based on ${stats.closedSales} closed sales.`);
    }
    if (stats.listToSaleRatio >= 1 && stats.listToSaleRatio > 0) {
      equityParts.push(`Sellers are achieving ${(stats.listToSaleRatio * 100).toFixed(1)}% of list price on average.`);
    }
    if (stats.priceChangePercent > 0) {
      equityParts.push(`Prices are up ${stats.priceChangePercent}% vs the prior period.`);
    }
    const equityEstimate = equityParts.length > 0
      ? equityParts.join(' ') + ' Contact me for a personalized equity estimate and net proceeds analysis.'
      : `Contact me for a personalized equity estimate and net proceeds analysis for your home in ${loc}.`;

    const timingParts: string[] = [];
    if (stats.monthsOfSupply < 4) timingParts.push('Low inventory supports seller leverage.');
    if (stats.domMedian < 30) timingParts.push('Homes are selling quickly.');
    if (stats.listToSaleRatio >= 1) timingParts.push('Sellers are achieving at or above list price.');
    const timingAdvice = timingParts.length > 0
      ? timingParts.join(' ') + ' Work with a local expert to price and market your home effectively.'
      : `Market conditions in ${loc} are based on ${stats.dataSource.properties} listings. Schedule a free home value consultation for personalized timing and pricing advice.`;

    const sellerTips = [
      'Get a professional comparative market analysis (CMA) before listing.',
      'Price competitively based on recent comparable sales.',
      'Prepare your home for showings—first impressions matter.',
      'Work with a local agent who knows this market.',
      'Request a free, no-obligation home value analysis.',
    ];

    const socialPost = `🏡 ${loc} sellers: Median sold price ${formatCurrency(stats.medianSoldPrice)}, ${stats.domMedian} days on market. Real data from ${stats.dataSource.properties} listings. DM for a free home value report.`;
    const emailTeaser = `Real market data for ${loc}: median sold price ${formatCurrency(stats.medianSoldPrice)}, ${stats.domMedian} days on market, ${stats.listToSaleRatio > 0 ? (stats.listToSaleRatio * 100).toFixed(1) : '—'}% list-to-sale ratio. Get your free home value report.`;
    const callToAction = `Request a free, no-obligation home value analysis for your property in ${loc}.`;

    const report = {
      title: `Seller Demand Report: ${loc} — Real Market Data`,
      demandIndicators: demandIndicators.length > 0 ? demandIndicators : [
        { indicator: 'Market Data', value: `${stats.dataSource.properties} listings`, trend: 'stable' as const, insight: `Data from your CRM for ${loc}.` },
      ],
      equityEstimate,
      timingAdvice,
      sellerTips,
      socialPost: socialPost.slice(0, 280),
      emailTeaser,
      callToAction,
      dataSource: `Based on ${stats.dataSource.properties} MLS listings and ${stats.dataSource.fsboListings} FSBO listings in your CRM.`,
    };

    return NextResponse.json({ report, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Seller report error:', error);
    return apiErrors.internal('Failed to generate seller report');
  }
}
