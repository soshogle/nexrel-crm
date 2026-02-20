export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface SlideContent {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  stats?: { label: string; value: string }[];
  enabled: boolean;
}

function buildSlides(
  type: string,
  propertyData: any,
  agentInfo: any,
  areaResearch: any
): SlideContent[] {
  const price = propertyData.price
    ? `$${Number(propertyData.price).toLocaleString()}`
    : 'TBD';
  const slides: SlideContent[] = [];

  slides.push({
    id: 'cover',
    type: 'cover',
    title: type === 'buyer' ? 'Buyer Consultation' : type === 'market' ? 'Market Analysis Report' : 'Listing Presentation',
    subtitle: propertyData.address ? `${propertyData.address}, ${propertyData.city || ''}` : 'Property Presentation',
    content: agentInfo?.company ? `Presented by ${agentInfo.name || 'Agent'} · ${agentInfo.company}` : `Presented by ${agentInfo?.name || 'Agent'}`,
    enabled: true,
  });

  slides.push({
    id: 'property',
    type: 'property',
    title: 'Property Overview',
    subtitle: propertyData.address,
    stats: [
      { label: 'Price', value: price },
      { label: 'Bedrooms', value: `${propertyData.beds || '—'}` },
      { label: 'Bathrooms', value: `${propertyData.baths || '—'}` },
      { label: 'Square Feet', value: propertyData.sqft ? propertyData.sqft.toLocaleString() : '—' },
      { label: 'Year Built', value: `${propertyData.yearBuilt || '—'}` },
      { label: 'Property Type', value: propertyData.propertyType || 'Residential' },
    ],
    enabled: true,
  });

  if (propertyData.features?.length > 0) {
    slides.push({
      id: 'features',
      type: 'features',
      title: 'Property Features & Highlights',
      bulletPoints: propertyData.features,
      enabled: true,
    });
  }

  if (propertyData.description) {
    slides.push({
      id: 'description',
      type: 'custom',
      title: 'About This Property',
      content: propertyData.description,
      enabled: true,
    });
  }

  if (areaResearch) {
    slides.push({
      id: 'area',
      type: 'area',
      title: 'Neighborhood & Community',
      content: areaResearch.summary || '',
      stats: [
        { label: 'Walk Score', value: `${areaResearch.walkScore || '—'}` },
        { label: 'Transit Score', value: `${areaResearch.transitScore || '—'}` },
        { label: 'Bike Score', value: `${areaResearch.bikeScore || '—'}` },
      ],
      bulletPoints: [
        ...(areaResearch.schools?.slice(0, 3).map((s: any) => `${s.name} (${s.rating || s.type}) - ${s.distance}`) || []),
        ...(areaResearch.shopping?.slice(0, 2).map((s: any) => `${s.name} - ${s.distance}`) || []),
        ...(areaResearch.parks?.slice(0, 2).map((p: any) => `${p.name} - ${p.distance}`) || []),
      ],
      enabled: true,
    });
  }

  slides.push({
    id: 'market',
    type: 'market',
    title: 'Market Analysis',
    subtitle: `${propertyData.city || 'Local'} Market Conditions`,
    bulletPoints: [
      'Active inventory levels are balanced for the current market',
      'Average days on market aligns with seasonal patterns',
      'Price-per-square-foot trending upward in comparable neighborhoods',
      'Strong buyer demand supports competitive pricing strategy',
    ],
    enabled: true,
  });

  if (type === 'listing' || type === 'luxury') {
    slides.push({
      id: 'marketing',
      type: 'custom',
      title: 'Marketing Plan',
      subtitle: 'Comprehensive Strategy to Sell Your Home',
      bulletPoints: [
        'Professional photography and virtual tour',
        'Featured listing on MLS and top real estate portals',
        'Targeted social media advertising campaign',
        'Email marketing to qualified buyer network',
        'Open house events and private showings',
        'Print marketing and neighborhood outreach',
      ],
      enabled: true,
    });
  }

  if (type === 'buyer') {
    slides.push({
      id: 'process',
      type: 'custom',
      title: 'Buying Process Timeline',
      subtitle: 'Your Path to Homeownership',
      bulletPoints: [
        'Pre-approval & budget planning',
        'Property search & showings',
        'Offer preparation & negotiation',
        'Home inspection & due diligence',
        'Appraisal & financing finalization',
        'Closing & key handover',
      ],
      enabled: true,
    });
  }

  slides.push({
    id: 'contact',
    type: 'contact',
    title: 'Let\'s Get Started',
    subtitle: 'Your Trusted Real Estate Partner',
    stats: [
      { label: 'Agent', value: agentInfo?.name || 'Your Agent' },
      { label: 'Phone', value: agentInfo?.phone || '' },
      { label: 'Email', value: agentInfo?.email || '' },
    ],
    content: agentInfo?.company || '',
    enabled: true,
  });

  return slides;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { presentationType, propertyData, areaResearch, agentInfo } = body;

    if (!propertyData?.address) {
      return NextResponse.json({ error: 'Property address is required' }, { status: 400 });
    }

    const slides = buildSlides(presentationType || 'listing', propertyData, agentInfo, areaResearch);

    const title = presentationType === 'buyer'
      ? `Buyer Consultation - ${propertyData.address}`
      : presentationType === 'market'
      ? `Market Analysis - ${propertyData.address}`
      : `Listing Presentation - ${propertyData.address}`;

    const dbRecord = await prisma.rEListingPresentation.create({
      data: {
        userId: session.user.id,
        address: propertyData.address,
        sellerName: agentInfo?.name || null,
        pricingStrategy: { suggestedPrice: propertyData.price },
        marketingPlan: slides.find((s) => s.id === 'marketing')?.bulletPoints || [],
        compsAnalysis: areaResearch || null,
        timelinePhases: slides.find((s) => s.id === 'process')?.bulletPoints || [],
        status: 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      presentation: {
        id: dbRecord.id,
        title,
        subtitle: `${propertyData.city || ''}, ${propertyData.state || ''}`.trim(),
        slides,
      },
    });
  } catch (error) {
    console.error('Presentation generate error:', error);
    return NextResponse.json({ error: 'Failed to generate presentation' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const presentations = await prisma.rEListingPresentation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ presentations });
  } catch (error) {
    console.error('Presentation list error:', error);
    return NextResponse.json({ error: 'Failed to fetch presentations' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Presentation ID required' }, { status: 400 });
    }

    const existing = await prisma.rEListingPresentation.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.rEListingPresentation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presentation delete error:', error);
    return NextResponse.json({ error: 'Failed to delete presentation' }, { status: 500 });
  }
}
