export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface SellerReportRequest {
  region: string;
  placeData?: {
    city?: string;
    state?: string;
    country?: string;
  };
  priceRange?: string;
  propertyType?: string;
  yearsOwned?: string;
  homeCondition?: string;
  sellerTimeline?: string;
  sellerMotivation?: string;
  hasEquity?: boolean;
  recentRenovations?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SellerReportRequest = await request.json();
    const {
      region,
      placeData,
      priceRange,
      propertyType,
      yearsOwned,
      homeCondition,
      sellerTimeline,
      sellerMotivation,
      hasEquity,
      recentRenovations,
    } = body;

    if (!region) {
      return NextResponse.json({ error: 'Region is required' }, { status: 400 });
    }

    const systemPrompt = `You are a real estate market analyst creating a "Seller Demand & Equity Report" to help real estate agents attract listing leads. Create compelling, data-driven content that shows homeowners why now might be an excellent time to sell.

IMPORTANT: Tailor the report to the seller profile:
- Long-term owners (10+ years): Emphasize massive equity gains, capitalize on appreciation
- Short-term owners: Focus on market timing, recent appreciation, avoiding overextension
- Motivated sellers: Create urgency, emphasize buyer demand and fast sales
- Explorers: Educational content about the selling process and current market opportunity
- Renovated homes: Highlight premium pricing potential and buyer preference

Respond with raw JSON only (no markdown, no code blocks):
{
  "title": "Compelling report title mentioning the specific location and key hook",
  "demandIndicators": [
    {
      "indicator": "Specific metric name (e.g., 'Active Buyer Searches', 'Days to Offer', 'Multiple Offer Rate', 'Showings Per Listing')",
      "value": "Specific value or range with context",
      "trend": "up" | "down" | "stable",
      "insight": "What this specifically means for a seller in their situation"
    }
  ],
  "equityEstimate": "Detailed paragraph about equity trends, appreciation over their ownership period, and potential net proceeds. Be specific with percentages and timeframes.",
  "timingAdvice": "3-4 sentences about optimal timing considering their specific situation, upcoming market changes, seasonal factors, and competition.",
  "sellerTips": ["5 specific, actionable tips tailored to their home condition and motivation level"],
  "socialPost": "Engaging social post under 280 chars with emoji. Create curiosity about home values. Soft CTA.",
  "emailTeaser": "3-4 sentence email that creates FOMO about equity and market timing. Mention specific appreciation numbers.",
  "callToAction": "Clear, low-pressure next step appropriate for their motivation level"
}`;

    // Build detailed context
    let userPrompt = `Generate a Seller Demand & Equity Report for:\n\nLOCATION: ${region}`;
    
    if (placeData?.city) userPrompt += `\nCity: ${placeData.city}`;
    if (placeData?.state) userPrompt += `\nState/Province: ${placeData.state}`;
    if (placeData?.country) userPrompt += `\nCountry: ${placeData.country}`;
    
    userPrompt += `\n\n--- PROPERTY DETAILS ---`;
    if (priceRange) userPrompt += `\nEstimated Home Value: ${priceRange.replace(/-/g, ' to ').replace('k', 'K').replace('m', 'M')}`;
    if (propertyType) userPrompt += `\nProperty Type: ${propertyType.replace('-', ' ')}`;
    
    if (homeCondition) {
      const conditionMap: Record<string, string> = {
        'excellent': 'Excellent - Move-in ready, well maintained',
        'good': 'Good - Minor cosmetic updates might help',
        'fair': 'Fair - Needs some repairs and updates',
        'poor': 'Needs Major Work - Renovation required'
      };
      userPrompt += `\nHome Condition: ${conditionMap[homeCondition] || homeCondition}`;
    }
    if (recentRenovations) userPrompt += `\n⭐ RECENTLY RENOVATED - Highlight premium pricing potential`;
    
    userPrompt += `\n\n--- SELLER PROFILE ---`;
    if (yearsOwned) {
      userPrompt += `\nYears Owned: ${yearsOwned}`;
      if (yearsOwned === '10-20' || yearsOwned === '20+') {
        userPrompt += ` (LONG-TERM OWNER - Emphasize significant equity gains and appreciation)`;
      }
    }
    
    if (sellerTimeline) {
      const timelineMap: Record<string, string> = {
        'asap': 'URGENT - Needs to sell quickly',
        '1-3months': 'Active - Wants to list within 1-3 months',
        '3-6months': 'Planning - Thinking 3-6 months out',
        'flexible': 'Flexible - No rush, waiting for right timing',
        'exploring': 'Exploring - Just curious about current value'
      };
      userPrompt += `\nTimeline: ${timelineMap[sellerTimeline] || sellerTimeline}`;
    }
    
    if (sellerMotivation) {
      const motivationMap: Record<string, string> = {
        'exploring': 'Low - Just curious about their home value',
        'considering': 'Moderate - Thinking about selling eventually',
        'ready': 'High - Wants to list soon',
        'motivated': 'Very High - Must sell (relocation, divorce, downsizing, etc.)'
      };
      userPrompt += `\nMotivation: ${motivationMap[sellerMotivation] || sellerMotivation}`;
    }
    
    if (hasEquity !== undefined) {
      userPrompt += `\nEquity Position: ${hasEquity ? 'Has significant equity' : 'Limited equity'}`;
    }
    
    userPrompt += `\n\nCurrent Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    userPrompt += `\n\nGenerate 5-6 compelling demand indicators. Make the report feel like it's based on real local market data. Emphasize the opportunity cost of waiting. Be specific about appreciation, buyer demand, and optimal timing for THEIR situation.`;

    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM API not configured' }, { status: 500 });
    }

    const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      throw new Error('LLM API request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let report;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      report = {
        title: `Seller Market Report: ${region}`,
        demandIndicators: [
          { indicator: 'Buyer Activity', value: 'Strong', trend: 'up', insight: 'Active buyers in this area' },
          { indicator: 'Days on Market', value: 'Below average', trend: 'down', insight: 'Homes selling quickly' }
        ],
        equityEstimate: 'Homeowners in this area have seen equity growth. Contact me for a personalized estimate.',
        timingAdvice: 'Market conditions are favorable. The spring market typically brings increased activity.',
        sellerTips: ['Price strategically', 'Prepare for showings', 'Work with a local expert'],
        socialPost: `🏡 ${region} homeowners: Do you know what your home is worth? DM for a free report!`,
        emailTeaser: `${region} homeowners have seen significant appreciation. Get your free equity report.`,
        callToAction: 'Request a free, no-obligation home value analysis.'
      };
    }

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Seller report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate seller report' },
      { status: 500 }
    );
  }
}
