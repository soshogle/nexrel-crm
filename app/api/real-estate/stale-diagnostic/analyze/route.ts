export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Address, list price, and days on market are required' },
        { status: 400 }
      );
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

Note: Average days on market for comparable properties in this area is typically 30-45 days. This listing at ${daysOnMarket} days is significantly above average.

Provide a detailed stale listing diagnostic.`;

    // Call the LLM API
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
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
      return NextResponse.json({ error: 'Failed to analyze listing' }, { status: 500 });
    }

    const data = await response.json();
    const analysisContent = data.choices?.[0]?.message?.content;

    if (!analysisContent) {
      return NextResponse.json({ error: 'No analysis generated' }, { status: 500 });
    }

    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (e) {
      console.error('Failed to parse LLM response:', analysisContent);
      return NextResponse.json({ error: 'Invalid analysis format' }, { status: 500 });
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
    return NextResponse.json({ error: 'Failed to analyze listing' }, { status: 500 });
  }
}
