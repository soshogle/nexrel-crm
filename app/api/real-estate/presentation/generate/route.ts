export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface PresentationSlide {
  id: string;
  type: 'cover' | 'property' | 'features' | 'gallery' | 'area' | 'market' | 'financials' | 'contact' | 'custom';
  title: string;
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  stats?: { label: string; value: string }[];
}

interface PresentationData {
  id: string;
  title: string;
  subtitle: string;
  propertyAddress: string;
  slides: PresentationSlide[];
  theme: 'dark' | 'light';
  brandColor: string;
  agentInfo: {
    name: string;
    title: string;
    phone: string;
    email: string;
    company: string;
    photo?: string;
  };
  generatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      presentationType,
      propertyData,
      areaResearch,
      agentInfo,
      customSlides,
    } = body;

    // Generate AI content for the presentation
    const prompt = `Create compelling presentation content for a ${presentationType} real estate presentation.

Property Details:
- Address: ${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zipCode || ''}
- Price: $${propertyData.price?.toLocaleString() || 'TBD'}
- Bedrooms: ${propertyData.beds || 'N/A'}
- Bathrooms: ${propertyData.baths || 'N/A'}
- Square Feet: ${propertyData.sqft?.toLocaleString() || 'N/A'}
- Year Built: ${propertyData.yearBuilt || 'N/A'}
- Property Type: ${propertyData.propertyType || 'Residential'}
- Description: ${propertyData.description || ''}
- Key Features: ${propertyData.features?.join(', ') || 'N/A'}

Area Information:
${areaResearch ? JSON.stringify(areaResearch, null, 2) : 'Not provided'}

Generate professional, engaging content for each slide. Include:
1. A compelling headline and tagline for the cover
2. Property highlights that emphasize value
3. Neighborhood benefits tailored to buyers
4. Market positioning (if listing presentation)
5. Call-to-action content

Respond in JSON format:
{
  "coverHeadline": "...",
  "coverTagline": "...",
  "propertyHighlights": ["...", "..."],
  "featureDescriptions": {"kitchen": "...", "master": "...", "outdoor": "..."},
  "neighborhoodPitch": "...",
  "marketAnalysis": "...",
  "whyNow": "...",
  "closingStatement": "..."
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert real estate marketing copywriter. Create compelling, professional content that sells properties. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiContent = completion.choices[0]?.message?.content || '{}';
    let parsedContent: any;
    try {
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      parsedContent = JSON.parse(jsonStr.trim());
    } catch {
      parsedContent = {
        coverHeadline: `${propertyData.address}`,
        coverTagline: 'Your Dream Home Awaits',
        propertyHighlights: ['Prime location', 'Move-in ready', 'Great investment'],
        neighborhoodPitch: 'A wonderful community to call home.',
        closingStatement: 'Contact us today for a private showing.'
      };
    }

    // Build the presentation slides
    const slides: PresentationSlide[] = [];
    const presentationId = `pres_${Date.now()}`;

    // Cover Slide
    slides.push({
      id: `${presentationId}_cover`,
      type: 'cover',
      title: parsedContent.coverHeadline || propertyData.address,
      subtitle: parsedContent.coverTagline || `$${propertyData.price?.toLocaleString() || 'Price Upon Request'}`,
      imageUrl: propertyData.photos?.[0] || undefined,
    });

    // Property Overview Slide
    slides.push({
      id: `${presentationId}_property`,
      type: 'property',
      title: 'Property Overview',
      subtitle: `${propertyData.address}, ${propertyData.city}`,
      stats: [
        { label: 'Bedrooms', value: String(propertyData.beds || 'N/A') },
        { label: 'Bathrooms', value: String(propertyData.baths || 'N/A') },
        { label: 'Square Feet', value: propertyData.sqft?.toLocaleString() || 'N/A' },
        { label: 'Year Built', value: String(propertyData.yearBuilt || 'N/A') },
        { label: 'Lot Size', value: propertyData.lotSize || 'N/A' },
        { label: 'Price', value: `$${propertyData.price?.toLocaleString() || 'TBD'}` },
      ],
      content: propertyData.description || '',
    });

    // Features Slide
    if (propertyData.features?.length > 0 || parsedContent.propertyHighlights) {
      slides.push({
        id: `${presentationId}_features`,
        type: 'features',
        title: 'Property Features',
        subtitle: 'What Makes This Home Special',
        bulletPoints: parsedContent.propertyHighlights || propertyData.features || [],
      });
    }

    // Photo Gallery Slide
    if (propertyData.photos?.length > 0) {
      slides.push({
        id: `${presentationId}_gallery`,
        type: 'gallery',
        title: 'Photo Gallery',
        imageUrl: propertyData.photos[0],
      });
    }

    // Area/Neighborhood Slide
    if (areaResearch) {
      const areaPoints = [];
      if (areaResearch.schools?.length > 0) {
        areaPoints.push(`🎓 Top-rated schools nearby: ${areaResearch.schools.slice(0, 2).map((s: any) => s.name).join(', ')}`);
      }
      if (areaResearch.shopping?.length > 0) {
        areaPoints.push(`🛒 Shopping: ${areaResearch.shopping.slice(0, 2).map((s: any) => s.name).join(', ')}`);
      }
      if (areaResearch.parks?.length > 0) {
        areaPoints.push(`🌳 Parks & Recreation: ${areaResearch.parks.slice(0, 2).map((p: any) => p.name).join(', ')}`);
      }
      if (areaResearch.transportation?.length > 0) {
        areaPoints.push(`🚇 Transportation: ${areaResearch.transportation.slice(0, 2).map((t: any) => t.name).join(', ')}`);
      }
      if (areaResearch.dining?.length > 0) {
        areaPoints.push(`🍽️ Dining: ${areaResearch.dining.slice(0, 2).map((d: any) => d.name).join(', ')}`);
      }
      if (areaResearch.healthcare?.length > 0) {
        areaPoints.push(`🏥 Healthcare: ${areaResearch.healthcare.slice(0, 2).map((h: any) => h.name).join(', ')}`);
      }

      slides.push({
        id: `${presentationId}_area`,
        type: 'area',
        title: 'Neighborhood & Community',
        subtitle: parsedContent.neighborhoodPitch || areaResearch.summary || 'A Great Place to Call Home',
        bulletPoints: areaPoints,
        stats: [
          { label: 'Walk Score', value: String(areaResearch.walkScore || '—') },
          { label: 'Transit Score', value: String(areaResearch.transitScore || '—') },
          { label: 'Bike Score', value: String(areaResearch.bikeScore || '—') },
        ],
      });
    }

    // Market Analysis Slide (for listing presentations)
    if (presentationType === 'listing' || presentationType === 'cma') {
      slides.push({
        id: `${presentationId}_market`,
        type: 'market',
        title: 'Market Analysis',
        subtitle: 'Why Now Is The Right Time',
        content: parsedContent.marketAnalysis || parsedContent.whyNow || 'The current market conditions favor sellers with low inventory and strong buyer demand.',
      });
    }

    // Contact/CTA Slide
    slides.push({
      id: `${presentationId}_contact`,
      type: 'contact',
      title: 'Ready to Take the Next Step?',
      subtitle: parsedContent.closingStatement || 'Contact me today for a private showing',
      content: agentInfo ? `${agentInfo.name}\n${agentInfo.title || 'Real Estate Professional'}\n${agentInfo.company || ''}\n📞 ${agentInfo.phone || ''}\n✉️ ${agentInfo.email || ''}` : '',
    });

    // Add custom slides if provided
    if (customSlides?.length > 0) {
      for (const custom of customSlides) {
        slides.push({
          id: `${presentationId}_custom_${slides.length}`,
          type: 'custom',
          title: custom.title || 'Additional Information',
          content: custom.content || '',
          bulletPoints: custom.bulletPoints || [],
        });
      }
    }

    const presentation: PresentationData = {
      id: presentationId,
      title: parsedContent.coverHeadline || `${propertyData.address} Presentation`,
      subtitle: parsedContent.coverTagline || '',
      propertyAddress: `${propertyData.address}, ${propertyData.city}, ${propertyData.state || ''}`,
      slides,
      theme: 'dark',
      brandColor: '#8b5cf6', // Violet to match existing design
      agentInfo: agentInfo || {
        name: session.user.name || 'Agent',
        title: 'Real Estate Professional',
        phone: '',
        email: session.user.email || '',
        company: '',
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ presentation });
  } catch (error) {
    console.error('Presentation generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presentation' },
      { status: 500 }
    );
  }
}
