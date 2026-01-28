export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface SellerReportRequest {
  region: string;
  priceRange?: string;
  propertyType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SellerReportRequest = await request.json();
    const { region, priceRange, propertyType } = body;

    if (!region) {
      return NextResponse.json({ error: 'Region is required' }, { status: 400 });
    }

    const systemPrompt = `You are a real estate market analyst creating a "Seller Demand & Equity Report" to help agents attract listing leads. Your goal is to create valuable content that shows homeowners why now might be a good time to sell and positions the agent as a market expert.

Create content that:
- Highlights current buyer demand and market conditions favoring sellers
- Discusses equity opportunities without making guarantees
- Creates urgency through market data, not fear tactics
- Is shareable and positions the agent as a trusted advisor
- Sounds confident and expert, but not pushy

Respond with raw JSON only (no markdown, no code blocks):
{
  "title": "Compelling report title with region name",
  "demandIndicators": [
    {
      "indicator": "Metric name (e.g., 'Active Buyers', 'Days on Market', 'List-to-Sale Ratio')",
      "value": "Current value or range",
      "trend": "up" | "down" | "stable",
      "insight": "What this means for sellers"
    }
  ],
  "equityEstimate": "General statement about equity trends in the area (no specific guarantees)",
  "timingAdvice": "2-3 sentences about market timing considerations",
  "sellerTips": ["Tip 1", "Tip 2", "Tip 3"],
  "socialPost": "Ready-to-post social media content (under 280 chars) with emoji, engaging hook, and soft CTA",
  "emailTeaser": "2-3 sentence email teaser that creates curiosity about their home's value",
  "callToAction": "Clear next step for interested sellers to take"
}`;

    let userPrompt = `Generate a Seller Demand & Equity Report for: ${region}`;
    if (priceRange) userPrompt += `\nTypical Price Range: ${priceRange}`;
    if (propertyType) userPrompt += `\nProperty Type Focus: ${propertyType}`;
    userPrompt += `\n\nCurrent Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    userPrompt += `\n\nGenerate 4-5 demand indicators and make the content feel data-driven but accessible.`;

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
        temperature: 0.7,
        max_tokens: 2000,
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
      // Return a default structure
      report = {
        title: `Seller Market Report: ${region}`,
        demandIndicators: [
          {
            indicator: 'Buyer Activity',
            value: 'Strong',
            trend: 'up',
            insight: 'Active buyers are searching in this area'
          },
          {
            indicator: 'Average Days on Market',
            value: 'Below average',
            trend: 'down',
            insight: 'Well-priced homes are selling quickly'
          }
        ],
        equityEstimate: 'Homeowners in this area have seen equity growth. Contact me for a personalized estimate.',
        timingAdvice: 'Market conditions are favorable for sellers. The spring market typically brings increased buyer activity.',
        sellerTips: ['Price strategically from day one', 'Prepare your home for showings', 'Work with a local market expert'],
        socialPost: `🏡 Thinking of selling in ${region}? The market data might surprise you. DM for a free home value report!`,
        emailTeaser: `${region} homeowners: Do you know what your home is worth in today's market? Get your free equity report.`,
        callToAction: 'Request a free, no-obligation home value analysis and market timing consultation.'
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
