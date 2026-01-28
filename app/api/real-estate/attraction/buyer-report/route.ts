export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface BuyerReportRequest {
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

    const body: BuyerReportRequest = await request.json();
    const { region, priceRange, propertyType } = body;

    if (!region) {
      return NextResponse.json({ error: 'Region is required' }, { status: 400 });
    }

    const systemPrompt = `You are a real estate market analyst creating a "Hidden Buyer Opportunities" report. Your goal is to help real estate agents attract buyer leads by creating valuable, shareable content that positions them as market insiders.

Create content that:
- Highlights overlooked opportunities buyers might miss
- Provides genuine value and insights
- Is shareable on social media
- Drives leads to contact the agent
- Sounds confident and expert, but not salesy

Respond with raw JSON only (no markdown, no code blocks):
{
  "title": "Compelling report title with region name",
  "opportunities": [
    {
      "type": "Opportunity category (e.g., 'Price Drop Alert', 'Hidden Gem Neighborhood', 'Motivated Seller')",
      "description": "Specific, actionable insight about this opportunity",
      "potentialSavings": "e.g., 'Save $15-25K' or null if not applicable",
      "urgency": "high" | "medium" | "low"
    }
  ],
  "marketInsight": "2-3 sentences about current market conditions that buyers should know",
  "buyerTips": ["Tip 1", "Tip 2", "Tip 3"],
  "socialPost": "Ready-to-post social media content (under 280 chars) with emoji, engaging hook, and soft CTA",
  "emailTeaser": "2-3 sentence email teaser that creates curiosity and drives clicks",
  "callToAction": "Clear next step for interested buyers to take"
}`;

    let userPrompt = `Generate a Hidden Buyer Opportunities Report for: ${region}`;
    if (priceRange) userPrompt += `\nPrice Range: ${priceRange}`;
    if (propertyType) userPrompt += `\nProperty Type: ${propertyType}`;
    userPrompt += `\n\nCurrent Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    userPrompt += `\n\nGenerate 4-5 specific opportunities and make the content feel like insider knowledge.`;

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
        title: `Buyer Opportunities in ${region}`,
        opportunities: [
          {
            type: 'Market Analysis',
            description: 'Contact me for a detailed market analysis of this area.',
            urgency: 'medium'
          }
        ],
        marketInsight: 'The market is showing interesting trends. Contact me for details.',
        buyerTips: ['Work with a local expert', 'Get pre-approved', 'Act quickly on good deals'],
        socialPost: `🏠 Looking to buy in ${region}? I have insider insights on hidden opportunities. DM me!`,
        emailTeaser: `Discover the buying opportunities most people miss in ${region}. Get my free report.`,
        callToAction: 'Contact me for a free buyer consultation and personalized opportunity list.'
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
