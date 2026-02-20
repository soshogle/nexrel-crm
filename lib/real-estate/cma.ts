/**
 * CMA (Comparative Market Analysis) Generator
 * Creates professional CMA reports with AI-powered insights
 */

import { prisma } from '@/lib/db';
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

/**
 * Generate demo comparables when no real data available
 */
function generateDemoComparables(subject: SubjectProperty): CMAComparable[] {
  const basePrice = subject.sqft * 320;
  const streets = ['Oak', 'Maple', 'Cedar', 'Pine', 'Elm'];
  const types = ['Street', 'Avenue', 'Drive', 'Court', 'Way'];

  return Array.from({ length: 5 }, (_, i) => {
    const variance = 0.85 + Math.random() * 0.3;
    const sqftVar = 0.9 + Math.random() * 0.2;
    const compSqft = Math.round(subject.sqft * sqftVar);
    const compPrice = Math.round(basePrice * variance);

    const comp = {
      address: `${100 + Math.round(Math.random() * 9900)} ${streets[i]} ${types[i]}`,
      city: subject.city,
      state: subject.state,
      price: compPrice,
      saleDate: new Date(Date.now() - (Math.random() * 90 + 10) * 86400000),
      daysOnMarket: Math.round(Math.random() * 45 + 7),
      beds: Math.max(1, subject.beds + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0)),
      baths: Math.max(1, subject.baths + (Math.random() > 0.7 ? 0.5 : 0)),
      sqft: compSqft,
      yearBuilt: subject.yearBuilt ? subject.yearBuilt + Math.round((Math.random() - 0.5) * 10) : 2010,
      status: (i < 3 ? 'sold' : i < 4 ? 'pending' : 'active') as 'sold' | 'pending' | 'active',
      pricePerSqft: Math.round(compPrice / compSqft)
    };

    return adjustComparable(subject, comp);
  });
}

/**
 * Generate AI analysis for the CMA via OpenAI when available, fallback to template
 */
async function generateAnalysis(
  subject: SubjectProperty,
  comparables: CMAComparable[],
  priceRange: { low: number; mid: number; high: number }
) {
  const avgDays = comparables.length > 0
    ? Math.round(comparables.reduce((a, c) => a + c.daysOnMarket, 0) / comparables.length)
    : 21;

  const fallback = {
    executiveSummary: `Based on ${comparables.length} comparable properties in ${subject.city}, we recommend listing at $${priceRange.mid.toLocaleString()}, within a range of $${priceRange.low.toLocaleString()} to $${priceRange.high.toLocaleString()}.`,
    positioningStrategy: 'Position competitively to attract qualified buyers while maximizing value.',
    keyStrengths: ['Desirable location', 'Property condition', 'Functional layout'],
    potentialConcerns: ['Current market competition'],
    marketOverview: `The ${subject.city} market shows stable conditions with balanced inventory.`,
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
  // Use provided comparables or generate demo ones
  let comparables = providedComparables?.map(c => adjustComparable(subject, c)) || [];
  if (comparables.length === 0) {
    comparables = generateDemoComparables(subject);
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

  // Generate analysis
  const analysis = await generateAnalysis(subject, comparables, priceRange);

  // Save to database
  const report = await prisma.rECMAReport.create({
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
  return prisma.rECMAReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Get a single CMA report
 */
export async function getCMAById(id: string, userId: string) {
  return prisma.rECMAReport.findFirst({
    where: { id, userId }
  });
}
