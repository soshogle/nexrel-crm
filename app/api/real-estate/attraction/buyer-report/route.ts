export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';
import { computeLiveMarketStats } from '@/lib/real-estate/compute-market-stats';

interface BuyerReportRequest {
  region: string;
  placeData?: { city?: string; state?: string; country?: string };
  priceRange?: string;
  propertyType?: string;
  bedrooms?: string;
  bathrooms?: string;
  sqftMin?: string;
  sqftMax?: string;
  yearBuiltMin?: string;
  buyerTimeline?: string;
  buyerMotivation?: string;
  firstTimeBuyer?: boolean;
  investorBuyer?: boolean;
  selectedFeatures?: string[];
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

    const body: BuyerReportRequest = await request.json();
    const { region, placeData, priceRange, propertyType, bedrooms, bathrooms, sqftMin, yearBuiltMin, buyerTimeline, buyerMotivation, firstTimeBuyer, investorBuyer, selectedFeatures } = body;

    if (!region) return apiErrors.badRequest('Region is required');

    // Parse city/state from the region string when placeData is missing
    let city = placeData?.city ?? null;
    let state = placeData?.state ?? null;
    if (!city && region) {
      const parts = region.split(',').map((p) => p.trim());
      city = parts[0] || null;
      if (parts.length > 1) state = parts[parts.length - 1] || null;
    }

    const { hasData, stats, message } = await computeLiveMarketStats(
      session.user.id,
      city,
      state
    );

    if (!hasData || !stats) {
      return NextResponse.json(
        { error: message || 'No market data available for this region.' },
        { status: 400 }
      );
    }

    const loc = placeData?.city && placeData?.state ? `${placeData.city}, ${placeData.state}` : region;
    const ctx = stats.centrisContext;

    const opportunities: { type: string; description: string; potentialSavings: string | null; urgency: 'high' | 'medium' | 'low' }[] = [];

    // Centris market-wide context (from imported PDFs/stats)
    if (ctx?.activeInventory && ctx.activeInventory > stats.activeListings) {
      opportunities.push({
        type: 'Market-Wide Inventory',
        description: `${ctx.activeInventory} active listings across ${ctx.region || loc} (Centris data, ${ctx.period || 'recent'}). Median sale price: ${ctx.medianSalePrice ? formatCurrency(ctx.medianSalePrice) : 'N/A'}.`,
        potentialSavings: null,
        urgency: (ctx.monthsOfSupply ?? 6) < 3 ? 'high' : (ctx.monthsOfSupply ?? 6) < 6 ? 'medium' : 'low',
      });
    }

    if (stats.activeListings > 0) {
      opportunities.push({
        type: 'Active Inventory',
        description: `${stats.activeListings} active listing${stats.activeListings !== 1 ? 's' : ''} in ${loc}. Median list price: ${formatCurrency(stats.medianListPrice)}.`,
        potentialSavings: null,
        urgency: stats.monthsOfSupply < 3 ? 'high' : stats.monthsOfSupply < 6 ? 'medium' : 'low',
      });
    }

    if (stats.closedSales > 0) {
      opportunities.push({
        type: 'Recent Sales Activity',
        description: `${stats.closedSales} closed sale${stats.closedSales !== 1 ? 's' : ''} in this market. Median sold price: ${formatCurrency(stats.medianSoldPrice)}.`,
        potentialSavings: stats.listToSaleRatio < 1 && stats.listToSaleRatio > 0
          ? `Buyers paying ${((1 - stats.listToSaleRatio) * 100).toFixed(1)}% below list on average`
          : null,
        urgency: stats.listToSaleRatio < 1 ? 'high' : 'medium',
      });
    }

    if (stats.domMedian > 0) {
      opportunities.push({
        type: 'Days on Market',
        description: `Median days on market: ${stats.domMedian}. ${stats.domMedian < 21 ? 'Fast-moving market.' : stats.domMedian > 45 ? 'More time to negotiate.' : 'Balanced pace.'}`,
        potentialSavings: null,
        urgency: stats.domMedian < 21 ? 'high' : 'medium',
      });
    }

    if (stats.monthsOfSupply > 0 && stats.monthsOfSupply < 99) {
      opportunities.push({
        type: 'Inventory Level',
        description: `${stats.monthsOfSupply} months of supply. ${stats.monthsOfSupply < 4 ? 'Seller\'s market—act quickly.' : stats.monthsOfSupply > 6 ? 'Buyer\'s market—more negotiating power.' : 'Balanced market.'}`,
        potentialSavings: null,
        urgency: stats.monthsOfSupply > 6 ? 'medium' : 'high',
      });
    }

    if (stats.pricePerSqft > 0) {
      opportunities.push({
        type: 'Price per Sq Ft',
        description: `Median price per square foot: $${stats.pricePerSqft}. Use this to compare value across listings.`,
        potentialSavings: null,
        urgency: 'medium',
      });
    }

    if (stats.fsboActive > 0) {
      opportunities.push({
        type: 'FSBO Opportunities',
        description: `${stats.fsboActive} FSBO listing${stats.fsboActive !== 1 ? 's' : ''} in this area. Median FSBO price: ${formatCurrency(stats.fsboMedianPrice)}.`,
        potentialSavings: 'FSBO sellers may be more flexible on price.',
        urgency: 'medium',
      });
    }

    const marketInsightParts: string[] = [];
    if (ctx?.medianSalePrice) marketInsightParts.push(`Centris median sale price: ${formatCurrency(ctx.medianSalePrice)}`);
    if (stats.medianListPrice > 0) marketInsightParts.push(`Median list price: ${formatCurrency(stats.medianListPrice)}`);
    if (stats.medianSoldPrice > 0) marketInsightParts.push(`median sold price: ${formatCurrency(stats.medianSoldPrice)}`);
    if (stats.domMedian > 0) marketInsightParts.push(`median days on market: ${stats.domMedian}`);
    if (ctx?.dom && ctx.dom !== stats.domMedian) marketInsightParts.push(`market-wide DOM: ${ctx.dom} days`);
    if (stats.activeListings > 0) marketInsightParts.push(`${stats.activeListings} active listings`);
    if (stats.closedSales > 0) marketInsightParts.push(`${stats.closedSales} closed sales`);
    if (ctx?.saleVsListPct) marketInsightParts.push(`market sale-to-list ratio: ${ctx.saleVsListPct}%`);
    else if (stats.listToSaleRatio > 0 && stats.listToSaleRatio < 1) marketInsightParts.push(`list-to-sale ratio ${(stats.listToSaleRatio * 100).toFixed(1)}% (buyers paying below ask)`);
    if (stats.priceChangePercent !== 0) marketInsightParts.push(`${stats.priceChangePercent > 0 ? '+' : ''}${stats.priceChangePercent}% price change vs prior period`);

    const dataSources = [];
    if (stats.dataSource.properties > 0) dataSources.push(`${stats.dataSource.properties} MLS listings`);
    if (stats.dataSource.fsboListings > 0) dataSources.push(`${stats.dataSource.fsboListings} FSBO listings`);
    if (stats.dataSource.storedStats > 0) dataSources.push(`${stats.dataSource.storedStats} months of Centris market data`);

    const marketInsight = marketInsightParts.length > 0
      ? `${loc} market: ${marketInsightParts.join('; ')}. Data from ${dataSources.join(' and ')}.`
      : `Market data for ${loc} from ${dataSources.join(' and ')}.`;

    const buyerTips = [
      'Get pre-approved before touring to strengthen your offers.',
      'Work with a local agent who knows this market.',
      stats.listToSaleRatio < 1 && stats.listToSaleRatio > 0 ? 'Consider offering below list—recent sales show buyers paying under ask.' : 'Review recent comparable sales before making an offer.',
      stats.domMedian > 30 ? 'Homes are sitting longer—use that time for due diligence and negotiation.' : 'Be prepared to act quickly in this market.',
      'Schedule a buyer consultation to discuss your criteria and strategy.',
    ].filter(Boolean) as string[];

    const socialPost = `🏠 ${loc}: ${stats.activeListings} active listings, median ${formatCurrency(stats.medianListPrice)}. ${stats.domMedian > 0 ? `DOM: ${stats.domMedian} days.` : ''} DM me for a free buyer report with real market data.`;
    const emailTeaser = `Real market data for ${loc}: ${stats.activeListings} active listings, median sold price ${formatCurrency(stats.medianSoldPrice)}, ${stats.domMedian} days on market. Get your personalized buyer report.`;
    const callToAction = `Contact me for a free buyer consultation and full market report for ${loc}.`;

    const report = {
      title: `Buyer Opportunities in ${loc} — Real Market Data`,
      opportunities: opportunities.length > 0 ? opportunities : [{ type: 'Market Overview', description: marketInsight, potentialSavings: null, urgency: 'medium' as const }],
      marketInsight,
      buyerTips,
      socialPost: socialPost.slice(0, 280),
      emailTeaser,
      callToAction,
      dataSource: `Based on ${dataSources.join(', ')} in your CRM.`,
    };

    return NextResponse.json({ report, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Buyer report error:', error);
    return apiErrors.internal('Failed to generate buyer report');
  }
}
