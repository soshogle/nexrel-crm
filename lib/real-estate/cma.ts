/**
 * CMA (Comparative Market Analysis) Generator
 * Creates professional CMA reports with AI-powered insights
 */

import { getCrmDb } from '@/lib/dal'
import { resolveDalContext } from '@/lib/context/industry-context';
import { getMarketContext } from './market-data';
import { findGeoComparables } from './geo-comps';
import type { SubjectProperty, CMAComparable } from './types';

/**
 * Adjust a comparable property relative to the subject
 */
function adjustComparable(
  subject: SubjectProperty,
  comp: Omit<CMAComparable, 'adjustedPrice' | 'adjustments'>
): CMAComparable {
  const adjustments: { type: string; amount: number; reason: string }[] = [];
  let adjustedPrice = comp.price;

  // Square footage ($100/sqft)
  const sqftDiff = subject.sqft - comp.sqft;
  if (Math.abs(sqftDiff) > 100) {
    const adj = sqftDiff * 100;
    adjustments.push({ type: 'sqft', amount: adj, reason: `Size difference: ${sqftDiff} sqft` });
    adjustedPrice += adj;
  }

  // Bedrooms ($15,000 each)
  const bedDiff = subject.beds - comp.beds;
  if (bedDiff !== 0) {
    const adj = bedDiff * 15000;
    adjustments.push({ type: 'beds', amount: adj, reason: `Bedroom difference: ${bedDiff}` });
    adjustedPrice += adj;
  }

  // Bathrooms ($10,000 each)
  const bathDiff = subject.baths - comp.baths;
  if (bathDiff !== 0) {
    const adj = bathDiff * 10000;
    adjustments.push({ type: 'baths', amount: adj, reason: `Bathroom difference: ${bathDiff}` });
    adjustedPrice += adj;
  }

  // Age ($2,000/year)
  if (subject.yearBuilt && comp.yearBuilt) {
    const ageDiff = subject.yearBuilt - comp.yearBuilt;
    if (Math.abs(ageDiff) > 5) {
      const adj = ageDiff * 2000;
      adjustments.push({ type: 'age', amount: adj, reason: `Age difference: ${ageDiff} years` });
      adjustedPrice += adj;
    }
  }

  // Condition premium/discount
  if (subject.condition === 'excellent') {
    const adj = comp.price * 0.05;
    adjustments.push({ type: 'condition', amount: adj, reason: 'Excellent condition premium' });
    adjustedPrice += adj;
  } else if (subject.condition === 'poor') {
    const adj = -comp.price * 0.10;
    adjustments.push({ type: 'condition', amount: adj, reason: 'Condition discount' });
    adjustedPrice += adj;
  }

  return { ...comp, adjustedPrice: Math.round(adjustedPrice), adjustments };
}

function mapSubjectPropertyTypeToEnum(propertyType: string): string | null {
  const t = (propertyType || '').toLowerCase();
  if (t.includes('single')) return 'SINGLE_FAMILY';
  if (t.includes('condo') || t.includes('townhouse') || t.includes('town')) return 'CONDO';
  if (t.includes('multi')) return 'MULTI_FAMILY';
  if (t.includes('duplex')) return 'DUPLEX';
  if (t.includes('triplex')) return 'TRIPLEX';
  if (t.includes('quad')) return 'QUADPLEX';
  if (t.includes('land') || t.includes('lot')) return 'LAND';
  if (t.includes('commercial')) return 'COMMERCIAL';
  return null;
}

function normalizeText(v?: string | null): string {
  return (v || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSimilarityScore(subject: SubjectProperty, comp: {
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  yearBuilt?: number | null;
}) {
  let score = 0;
  if (normalizeText(comp.city) && normalizeText(comp.city) === normalizeText(subject.city)) score += 30;
  if (normalizeText(comp.state) && normalizeText(comp.state) === normalizeText(subject.state)) score += 20;
  if (subject.zip && comp.zip && normalizeText(comp.zip) === normalizeText(subject.zip)) score += 10;

  const bedDiff = Math.abs((comp.beds || subject.beds) - subject.beds);
  const bathDiff = Math.abs((comp.baths || subject.baths) - subject.baths);
  const sqftDiffRatio = Math.abs((comp.sqft || subject.sqft) - subject.sqft) / Math.max(subject.sqft, 1);
  const yearDiff = subject.yearBuilt && comp.yearBuilt ? Math.abs(comp.yearBuilt - subject.yearBuilt) : 0;

  score += Math.max(0, 20 - bedDiff * 6);
  score += Math.max(0, 10 - bathDiff * 5);
  score += Math.max(0, 15 - Math.round(sqftDiffRatio * 40));
  score += Math.max(0, 10 - Math.round(yearDiff / 2));

  return score;
}

async function fetchRealComparables(subject: SubjectProperty, userId: string, limit = 10): Promise<CMAComparable[]> {
  // Use geo-based comparables engine (postal code + haversine + criteria scoring)
  try {
    const geoResult = await findGeoComparables(
      {
        address: subject.address,
        city: subject.city,
        state: subject.state,
        zip: subject.zip,
        beds: subject.beds,
        baths: subject.baths,
        sqft: subject.sqft,
        yearBuilt: subject.yearBuilt,
        lotSize: subject.lotSize,
        propertyType: subject.propertyType,
      },
      userId,
      { limit, includeActive: true }
    );

    if (geoResult.comparables.length >= 3) {
      return geoResult.comparables.map((gc) => ({
        address: gc.address,
        city: gc.city,
        state: gc.state,
        price: gc.price,
        saleDate: gc.soldDate || undefined,
        daysOnMarket: gc.daysOnMarket,
        beds: gc.beds,
        baths: gc.baths,
        sqft: gc.sqft,
        yearBuilt: gc.yearBuilt || undefined,
        status: gc.status,
        pricePerSqft: gc.pricePerSqft,
      }));
    }
  } catch (e) {
    console.error('[CMA] Geo-comps failed, falling back to city-based:', e);
  }

  // Fallback: city-based search when geo-comps returns too few results
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);
  const mappedType = mapSubjectPropertyTypeToEnum(subject.propertyType);

  const properties = await db.rEProperty.findMany({
    where: {
      userId,
      listingStatus: { in: ['SOLD', 'ACTIVE', 'PENDING'] as any },
      ...(subject.city ? { city: { contains: subject.city, mode: 'insensitive' } } : {}),
      ...(subject.state ? { state: { contains: subject.state, mode: 'insensitive' } } : {}),
      ...(mappedType ? { propertyType: mappedType as any } : {}),
      OR: [
        { soldPrice: { gt: 0 } },
        { listPrice: { gt: 0 } },
      ],
    },
    select: {
      address: true,
      city: true,
      state: true,
      zip: true,
      beds: true,
      baths: true,
      sqft: true,
      yearBuilt: true,
      listingStatus: true,
      soldPrice: true,
      listPrice: true,
      soldDate: true,
      daysOnMarket: true,
      updatedAt: true,
    },
    take: 150,
  });

  const ranked = properties
    .map((p) => ({
      row: p,
      score: getSimilarityScore(subject, p),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ row }) => {
    const status = row.listingStatus === 'SOLD'
      ? 'sold'
      : row.listingStatus === 'PENDING'
        ? 'pending'
        : 'active';
    const price = Number((status === 'sold' ? row.soldPrice : row.listPrice) || row.listPrice || row.soldPrice || 0);
    const sqft = Number(row.sqft || subject.sqft || 1);
    return {
      address: row.address,
      city: row.city,
      state: row.state,
      price,
      saleDate: status === 'sold' ? (row.soldDate || row.updatedAt) : undefined,
      daysOnMarket: row.daysOnMarket || 0,
      beds: row.beds || subject.beds,
      baths: Number(row.baths || subject.baths),
      sqft,
      yearBuilt: row.yearBuilt || undefined,
      status,
      pricePerSqft: Math.round(price / Math.max(sqft, 1)),
    };
  }).filter((c) => c.price > 0 && c.sqft > 0);
}

/**
 * Generate AI analysis for the CMA via OpenAI when available, fallback to template
 */
async function generateAnalysis(
  subject: SubjectProperty,
  comparables: CMAComparable[],
  priceRange: { low: number; mid: number; high: number },
  userId?: string
) {
  const avgDays = comparables.length > 0
    ? Math.round(comparables.reduce((a, c) => a + c.daysOnMarket, 0) / comparables.length)
    : 21;

  let marketCtxSummary = '';
  if (userId) {
    try {
      const ctx = await getMarketContext(userId, {
        city: subject.city,
        state: subject.state,
        propertyCategory: subject.propertyType,
      });
      marketCtxSummary = ctx.summary;
    } catch { /* non-critical */ }
  }

  const fallback = {
    executiveSummary: `Based on ${comparables.length} comparable properties in ${subject.city}, we recommend listing at $${priceRange.mid.toLocaleString()}, within a range of $${priceRange.low.toLocaleString()} to $${priceRange.high.toLocaleString()}.`,
    positioningStrategy: 'Position competitively to attract qualified buyers while maximizing value.',
    keyStrengths: ['Desirable location', 'Property condition', 'Functional layout'],
    potentialConcerns: ['Current market competition'],
    marketOverview: marketCtxSummary || `The ${subject.city} market shows stable conditions with balanced inventory.`,
    pricingRationale: `The recommended price of $${priceRange.mid.toLocaleString()} reflects recent comparable sales and current market conditions.`,
    recommendedActions: ['Professional photography', 'Minor repairs', 'Declutter and stage'],
    avgDaysOnMarket: avgDays,
    marketTrend: 'stable' as const,
    sellerTips: ['Price correctly from day one', 'Maximize curb appeal', 'Be flexible with showings'],
  };

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const compsSummary = comparables.map((c) =>
      `${c.address}: ${c.beds}bd/${c.baths}ba, ${c.sqft}sqft, sold $${c.price.toLocaleString()}, adj $${(c.adjustedPrice || c.price).toLocaleString()}, ${c.daysOnMarket} DOM, ${c.status}`
    ).join('\n');

    const prompt = `You are a real estate CMA analyst. Analyze these comparables for the subject property and provide a professional CMA analysis.

Subject Property:
- Address: ${subject.address}, ${subject.city}, ${subject.state}
- ${subject.beds} beds, ${subject.baths} baths, ${subject.sqft} sqft
${subject.yearBuilt ? `- Built: ${subject.yearBuilt}` : ''}
- Suggested Price Range: $${priceRange.low.toLocaleString()} - $${priceRange.high.toLocaleString()} (midpoint $${priceRange.mid.toLocaleString()})

Comparable Properties:
${compsSummary}

Average DOM: ${avgDays} days
${marketCtxSummary ? `\nBroader Market Context (Centris data):\n${marketCtxSummary}` : ''}

Respond in JSON with these exact keys:
{
  "executiveSummary": "2-3 sentence executive summary",
  "positioningStrategy": "1-2 sentence pricing strategy recommendation",
  "keyStrengths": ["3-4 strengths as array of strings"],
  "potentialConcerns": ["2-3 concerns as array of strings"],
  "marketOverview": "2-3 sentence market overview",
  "pricingRationale": "2-3 sentence explanation of the recommended price",
  "recommendedActions": ["4-5 seller prep recommendations"],
  "marketTrend": "rising" or "stable" or "declining",
  "sellerTips": ["3-4 tips for the seller"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return fallback;

    const parsed = JSON.parse(content);
    return {
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      positioningStrategy: parsed.positioningStrategy || fallback.positioningStrategy,
      keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : fallback.keyStrengths,
      potentialConcerns: Array.isArray(parsed.potentialConcerns) ? parsed.potentialConcerns : fallback.potentialConcerns,
      marketOverview: parsed.marketOverview || fallback.marketOverview,
      pricingRationale: parsed.pricingRationale || fallback.pricingRationale,
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : fallback.recommendedActions,
      avgDaysOnMarket: avgDays,
      marketTrend: (['rising', 'stable', 'declining'].includes(parsed.marketTrend) ? parsed.marketTrend : 'stable') as 'rising' | 'stable' | 'declining',
      sellerTips: Array.isArray(parsed.sellerTips) ? parsed.sellerTips : fallback.sellerTips,
    };
  } catch (error) {
    console.error('[CMA] AI analysis failed, using template:', error);
    return fallback;
  }
}

/**
 * Generate a full CMA report
 */
export async function generateCMA(
  subject: SubjectProperty,
  userId: string,
  providedComparables?: CMAComparable[]
) {
  // Use provided real comparables or fetch from user's real listing data.
  let comparables = providedComparables?.map(c => adjustComparable(subject, c)) || [];
  if (comparables.length === 0) {
    const fetched = await fetchRealComparables(subject, userId, 10);
    comparables = fetched.map((c) => adjustComparable(subject, c));
  }

  // Never fabricate/synthesize real estate comparables.
  if (comparables.length < 3) {
    throw new Error(
      'Insufficient real comparable data. Please sync/import Centris and sold listings into your CRM database for this area before generating a CMA.'
    );
  }

  // Calculate price range
  const adjustedPrices = comparables.map(c => c.adjustedPrice || c.price);
  const avgPrice = adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length;
  const sorted = [...adjustedPrices].sort((a, b) => a - b);
  const priceRange = {
    low: sorted[0] || avgPrice * 0.95,
    mid: avgPrice,
    high: sorted[sorted.length - 1] || avgPrice * 1.05
  };

  // Generate analysis with real market context
  const analysis = await generateAnalysis(subject, comparables, priceRange, userId);

  // Save to database
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);
  const report = await db.rECMAReport.create({
    data: {
      userId,
      address: subject.address,
      beds: subject.beds,
      baths: subject.baths,
      sqft: subject.sqft,
      yearBuilt: subject.yearBuilt,
      comparables: comparables as any,
      adjustments: comparables.flatMap(c => c.adjustments || []) as any,
      suggestedPrice: Math.round(avgPrice),
      suggestedPriceMin: Math.round(priceRange.low),
      suggestedPriceMax: Math.round(priceRange.high),
      pricePerSqft: Math.round(avgPrice / subject.sqft)
    }
  });

  return {
    id: report.id,
    subject,
    comparables,
    suggestedPrice: Math.round(avgPrice),
    priceRange: {
      low: Math.round(priceRange.low),
      mid: Math.round(priceRange.mid),
      high: Math.round(priceRange.high)
    },
    pricePerSqft: Math.round(avgPrice / subject.sqft),
    confidence: comparables.length >= 4 ? 'high' : comparables.length >= 2 ? 'medium' : 'low',
    ...analysis
  };
}

/**
 * Get user's CMA reports
 */
export async function getUserCMAs(userId: string, limit = 10) {
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);
  return db.rECMAReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Get a single CMA report
 */
export async function getCMAById(id: string, userId: string) {
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);
  return db.rECMAReport.findFirst({
    where: { id, userId }
  });
}
