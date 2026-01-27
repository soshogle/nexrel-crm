export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface AreaResearch {
  schools: { name: string; type: string; rating?: string; distance?: string }[];
  transportation: { type: string; name: string; distance?: string }[];
  shopping: { name: string; type: string; distance?: string }[];
  dining: { name: string; type: string; distance?: string }[];
  parks: { name: string; features?: string; distance?: string }[];
  healthcare: { name: string; type: string; distance?: string }[];
  entertainment: { name: string; type: string; distance?: string }[];
  demographics: {
    population?: string;
    medianIncome?: string;
    medianAge?: string;
    crimeRate?: string;
  };
  walkScore?: number;
  bikeScore?: number;
  transitScore?: number;
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, city, state, propertyType } = await request.json();

    if (!address || !city) {
      return NextResponse.json({ error: 'Address and city are required' }, { status: 400 });
    }

    const fullAddress = `${address}, ${city}, ${state || ''}`;
    
    // Use GPT-4o to research the area
    const prompt = `You are a real estate research assistant. Research and provide detailed information about the neighborhood and surrounding area for a property at: ${fullAddress}

Property Type: ${propertyType || 'Residential'}

Provide comprehensive information that would be valuable to potential buyers. Include:

1. **Schools** (nearby elementary, middle, high schools, private schools) - include estimated ratings if known
2. **Transportation** (subway/metro stations, bus routes, highways, airports)
3. **Shopping** (supermarkets, malls, retail centers)
4. **Dining** (popular restaurants, cafes, food options)
5. **Parks & Recreation** (parks, trails, gyms, community centers)
6. **Healthcare** (hospitals, medical centers, pharmacies)
7. **Entertainment** (theaters, museums, attractions)
8. **Demographics** (estimated population, median income, community vibe)
9. **Walkability/Transit** scores (estimate 0-100)
10. **Area Summary** - A compelling 2-3 sentence description of why this is a great location

Respond in JSON format:
{
  "schools": [{"name": "...", "type": "elementary/middle/high/private", "rating": "8/10", "distance": "0.5 mi"}],
  "transportation": [{"type": "metro/bus/highway", "name": "...", "distance": "0.3 mi"}],
  "shopping": [{"name": "...", "type": "supermarket/mall/retail", "distance": "0.4 mi"}],
  "dining": [{"name": "...", "type": "restaurant/cafe", "distance": "0.2 mi"}],
  "parks": [{"name": "...", "features": "playground, trails", "distance": "0.3 mi"}],
  "healthcare": [{"name": "...", "type": "hospital/clinic/pharmacy", "distance": "1.2 mi"}],
  "entertainment": [{"name": "...", "type": "theater/museum/attraction", "distance": "2 mi"}],
  "demographics": {"population": "...", "medianIncome": "$...", "medianAge": "...", "crimeRate": "low/moderate/high"},
  "walkScore": 75,
  "bikeScore": 68,
  "transitScore": 82,
  "summary": "..."
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a real estate research expert. Provide realistic, helpful neighborhood information. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    let research: AreaResearch;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      research = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse area research:', parseError);
      research = {
        schools: [],
        transportation: [],
        shopping: [],
        dining: [],
        parks: [],
        healthcare: [],
        entertainment: [],
        demographics: {},
        summary: 'Area research data is being compiled.'
      };
    }

    return NextResponse.json({ research });
  } catch (error) {
    console.error('Area research error:', error);
    return NextResponse.json(
      { error: 'Failed to research area' },
      { status: 500 }
    );
  }
}
