export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { getMarketContext } from '@/lib/real-estate/market-data';

interface PropertyData {
  address: string;
  city?: string;
  state?: string;
  listPrice: number;
  daysOnMarket: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType?: string;
  description?: string;
  priceHistory?: Array<{ date: string; price: number }>;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body: PropertyData = await request.json();
    const {
      address,
      city,
      state,
      listPrice,
      daysOnMarket,
      beds,
      baths,
      sqft,
      yearBuilt,
      propertyType,
      description,
      priceHistory,
    } = body;

    if (!address || !listPrice || daysOnMarket === undefined) {
      return apiErrors.badRequest('Address, list price, and days on market are required');
    }

    const systemPrompt = `You are a real estate market analyst AI specializing in diagnosing why listings become stale (sit on the market too long without selling).

Analyze the provided property data and give actionable insights. Consider:
1. Pricing issues (overpriced for the market/area)
2. Property condition concerns
3. Marketing deficiencies
4. Location challenges
5. Market timing factors
6. Competition analysis

Provide your response in the following JSON format:
{
  "overallAssessment": "Brief 1-2 sentence summary of the main issue",
  "topReasons": [
    {
      "reason": "Primary reason the listing is stale",
      "confidence": 85,
      "impact": "HIGH"
    },
    {
      "reason": "Secondary reason",
      "confidence": 70,
      "impact": "MEDIUM"
    },
    {
      "reason": "Third reason",
      "confidence": 60,
      "impact": "LOW"
    }
  ],
  "actionPlan": [
    {
      "action": "Specific action to take",
      "priority": "IMMEDIATE",
      "expectedImpact": "Description of expected outcome"
    },
    {
      "action": "Second action",
      "priority": "SHORT_TERM",
      "expectedImpact": "Description"
    },
    {
      "action": "Third action",
      "priority": "MEDIUM_TERM",
      "expectedImpact": "Description"
    }
  ],
  "suggestedPriceReduction": {
    "percentage": 5,
    "newPrice": 475000,
    "reasoning": "Why this price adjustment makes sense"
  },
  "clientSummary": "A professional, empathetic summary to share with the seller explaining the situation and recommended actions (2-3 paragraphs)",
  "sellerEmailDraft": "A ready-to-send email to the seller with the analysis and recommendations",
  "callScript": "A brief call script for the agent to discuss with the seller"
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    const localSoldComps = await prisma.rEProperty.findMany({
      where: {
        userId: session.user.id,
        listingStatus: 'SOLD',
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        ...(state ? { state: { contains: state, mode: 'insensitive' } } : {}),
        daysOnMarket: { gt: 0 },
      },
      select: { daysOnMarket: true },
      orderBy: { soldDate: 'desc' },
      take: 120,
    });
    const domBaseline = median(localSoldComps.map((c) => c.daysOnMarket || 0).filter((d) => d > 0));
    const baselineLine = domBaseline > 0
      ? `Local sold comparables median DOM is ${domBaseline} days.`
      : 'Local sold comparable DOM baseline is unavailable.';

    // Fetch market context (median price, DOM, inventory) for better AI analysis
    let marketContextLine = '';
    try {
      const marketCtx = await getMarketContext(session.user.id, {
        city: city || undefined,
        region: city || undefined,
        state: state || undefined,
        months: 6,
      });
      const curr = marketCtx.current;
      if (curr) {
        const parts: string[] = [];
        if (curr.medianSalePrice) parts.push(`Median sale price: $${curr.medianSalePrice.toLocaleString()}`);
        if (curr.domAvg) parts.push(`Market avg DOM: ${curr.domAvg} days`);
        if (curr.activeInventory) parts.push(`Active inventory: ${curr.activeInventory}`);
        if (curr.numberOfSales) parts.push(`Recent sales: ${curr.numberOfSales}`);
        if (parts.length > 0) {
          marketContextLine = `\n\nMarket context for this area: ${parts.join('; ')}.`;
        }
      }
    } catch (e) {
      console.warn('[Stale Diagnostic] Market context fetch failed:', e);
    }

    const userPrompt = `Analyze this stale listing:

Property: ${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}
List Price: $${listPrice.toLocaleString()}
Days on Market: ${daysOnMarket}
${beds ? `Bedrooms: ${beds}` : ''}
${baths ? `Bathrooms: ${baths}` : ''}
${sqft ? `Square Feet: ${sqft.toLocaleString()}` : ''}
${yearBuilt ? `Year Built: ${yearBuilt}` : ''}
${propertyType ? `Property Type: ${propertyType}` : ''}
${description ? `Description: ${description}` : ''}
${priceHistory && priceHistory.length > 0 ? `Price History: ${JSON.stringify(priceHistory)}` : ''}

${baselineLine} This listing is currently at ${daysOnMarket} days on market.${marketContextLine}

Provide a detailed stale listing diagnostic.`;

    // Call the LLM API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return apiErrors.internal('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', errorText);
      return apiErrors.internal('Failed to analyze listing');
    }

    const data = await response.json();
    const analysisContent = data.choices?.[0]?.message?.content;

    if (!analysisContent) {
      return apiErrors.internal('No analysis generated');
    }

    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (e) {
      console.error('Failed to parse LLM response:', analysisContent);
      return apiErrors.internal('Invalid analysis format');
    }

    // Save the diagnostic to the database
    const diagnostic = await prisma.rEStaleDiagnostic.create({
      data: {
        userId: session.user.id,
        address,
        listPrice,
        daysOnMarket,
        analysisJson: analysis,
        topReasons: analysis.topReasons || [],
        actionPlan: analysis.actionPlan || [],
        clientSummary: analysis.clientSummary || null,
        sellerEmailDraft: analysis.sellerEmailDraft || null,
        callScript: analysis.callScript || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      diagnostic,
      analysis,
    });
  } catch (error) {
    console.error('Stale diagnostic analyze error:', error);
    return apiErrors.internal('Failed to analyze listing');
  }
}
