export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface BuyerReportRequest {
  region: string;
  placeData?: {
    city?: string;
    state?: string;
    country?: string;
  };
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: BuyerReportRequest = await request.json();
    const {
      region,
      placeData,
      priceRange,
      propertyType,
      bedrooms,
      bathrooms,
      sqftMin,
      yearBuiltMin,
      buyerTimeline,
      buyerMotivation,
      firstTimeBuyer,
      investorBuyer,
      selectedFeatures,
    } = body;

    if (!region) {
      return NextResponse.json({ error: 'Region is required' }, { status: 400 });
    }

    const systemPrompt = `You are a real estate market analyst creating a "Hidden Buyer Opportunities" report for a real estate agent. Your goal is to help them attract buyer leads by creating valuable, shareable content that positions them as market insiders.

Create hyper-specific, actionable content based on the exact criteria provided. Make it feel like insider knowledge.

IMPORTANT: Tailor the report to the buyer profile:
- First-time buyers: Focus on affordability, programs, neighborhoods with growth potential
- Investors: Focus on ROI, rental yields, appreciation potential, cash flow
- Motivated buyers: Create urgency with time-sensitive opportunities
- Casual browsers: Focus on educational content and market timing

Respond with raw JSON only (no markdown, no code blocks):
{
  "title": "Compelling report title mentioning the specific location",
  "opportunities": [
    {
      "type": "Opportunity category (be specific: 'Price Reduction Alert', 'Undervalued Gem', 'Pre-Foreclosure Deal', 'Estate Sale', 'Builder Incentive', 'Pocket Listing')",
      "description": "Detailed, specific insight - mention neighborhoods, streets, or building names when possible",
      "potentialSavings": "Specific savings estimate (e.g., 'Save $18-25K below market') or null",
      "urgency": "high" | "medium" | "low"
    }
  ],
  "marketInsight": "3-4 sentences with specific data points (median prices, days on market, inventory levels) tailored to the criteria",
  "buyerTips": ["5 specific, actionable tips tailored to their profile and criteria"],
  "socialPost": "Engaging social post under 280 chars with emoji, specific to location and buyer type. Include a hook and soft CTA.",
  "emailTeaser": "3-4 sentence email that creates FOMO and urgency. Mention specific numbers or neighborhoods.",
  "callToAction": "Clear, specific next step mentioning their criteria"
}`;

    // Build detailed context
    let userPrompt = `Generate a Hidden Buyer Opportunities Report for:\n\nLOCATION: ${region}`;
    
    if (placeData?.city) userPrompt += `\nCity: ${placeData.city}`;
    if (placeData?.state) userPrompt += `\nState/Province: ${placeData.state}`;
    if (placeData?.country) userPrompt += `\nCountry: ${placeData.country}`;
    
    userPrompt += `\n\n--- BUYER CRITERIA ---`;
    if (priceRange) userPrompt += `\nBudget: ${priceRange.replace(/-/g, ' to ').replace('k', 'K').replace('m', 'M')}`;
    if (propertyType) userPrompt += `\nProperty Type: ${propertyType.replace('-', ' ')}`;
    if (bedrooms) userPrompt += `\nBedrooms: ${bedrooms}+`;
    if (bathrooms) userPrompt += `\nBathrooms: ${bathrooms}+`;
    if (sqftMin) userPrompt += `\nMinimum Square Feet: ${sqftMin}`;
    if (yearBuiltMin) userPrompt += `\nBuilt After: ${yearBuiltMin}`;
    
    userPrompt += `\n\n--- BUYER PROFILE ---`;
    if (buyerTimeline) {
      const timelineMap: Record<string, string> = {
        'asap': 'URGENT - Need to buy within 30 days',
        '1-3months': 'Active - Looking to buy in 1-3 months',
        '3-6months': 'Planning - 3-6 month timeframe',
        '6-12months': 'Future - 6-12 months out',
        'exploring': 'Exploring - Just started looking'
      };
      userPrompt += `\nTimeline: ${timelineMap[buyerTimeline] || buyerTimeline}`;
    }
    if (buyerMotivation) {
      const motivationMap: Record<string, string> = {
        'low': 'Low - Casually browsing',
        'moderate': 'Moderate - Interested but not rushing',
        'high': 'High - Ready to make offers',
        'urgent': 'Urgent - Must buy ASAP (relocation, life event, etc.)'
      };
      userPrompt += `\nMotivation: ${motivationMap[buyerMotivation] || buyerMotivation}`;
    }
    if (firstTimeBuyer) userPrompt += `\n⭐ FIRST-TIME BUYER - Include info on first-time buyer programs, FHA loans, down payment assistance`;
    if (investorBuyer) userPrompt += `\n⭐ INVESTOR - Focus on ROI, rental income potential, cap rates, appreciation`;
    
    if (selectedFeatures && selectedFeatures.length > 0) {
      const featureLabels: Record<string, string> = {
        'pool': 'Swimming Pool',
        'garage': 'Garage',
        'backyard': 'Large Backyard',
        'basement': 'Finished Basement',
        'solar': 'Solar Panels',
        'schools': 'Top-Rated Schools Nearby',
        'walkable': 'Walkable Neighborhood',
        'newConstruction': 'New Construction'
      };
      const features = selectedFeatures.map(f => featureLabels[f] || f).join(', ');
      userPrompt += `\n\nMust-Have Features: ${features}`;
    }
    
    userPrompt += `\n\nCurrent Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    userPrompt += `\n\nGenerate 5-6 SPECIFIC opportunities. Make it feel like insider knowledge that only a local expert would know. Be specific about neighborhoods, price points, and why NOW is the time to act.`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        title: `Buyer Opportunities in ${region}`,
        opportunities: [
          { type: 'Market Analysis', description: 'Contact me for a detailed market analysis.', urgency: 'medium' }
        ],
        marketInsight: 'The market is showing interesting trends. Contact me for details.',
        buyerTips: ['Work with a local expert', 'Get pre-approved', 'Act quickly on good deals'],
        socialPost: `🏠 Looking to buy in ${region}? I have insider insights. DM me!`,
        emailTeaser: `Discover the buying opportunities most people miss in ${region}.`,
        callToAction: 'Contact me for a free buyer consultation.'
      };
    }

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Buyer report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate buyer report' },
      { status: 500 }
    );
  }
}
