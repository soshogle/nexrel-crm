export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REDiagnosticStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status') as REDiagnosticStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    const diagnostics = await prisma.rEStaleDiagnostic.findMany({
      where: {
        userId: session.user.id,
        ...(propertyId && { propertyId }),
        ...(status && { status }),
      },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            listPrice: true,
            daysOnMarket: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ diagnostics });
  } catch (error) {
    console.error('Stale Diagnostic GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch diagnostics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      propertyId,
      daysOnMarket,
      marketAvgDom,
      priceVsComps,
      showingCount,
      feedbackSummary,
      competitionAnalysis,
    } = body;

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    // Fetch property
    const property = await prisma.rEProperty.findFirst({
      where: { id: propertyId, userId: session.user.id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Generate AI analysis using basic rules (LLM can be added later)
    const issues: string[] = [];
    const recommendations: string[] = [];
    let pricingRecommendation = '';
    let marketingRecommendation = '';

    const dom = daysOnMarket || property.daysOnMarket || 0;
    const avgDom = marketAvgDom || 30;

    // Price analysis
    if (priceVsComps) {
      if (priceVsComps > 5) {
        issues.push(`Listing is ${priceVsComps}% above comparable sales`);
        recommendations.push('Consider price reduction to align with market');
        pricingRecommendation = `Recommend reducing price by ${Math.min(priceVsComps, 10)}% based on comparable analysis`;
      }
    }

    // DOM analysis
    if (dom > avgDom * 1.5) {
      issues.push(`Days on market (${dom}) exceeds market average (${avgDom}) by ${Math.round((dom/avgDom - 1) * 100)}%`);
      recommendations.push('Property needs immediate attention - review pricing and marketing strategy');
    } else if (dom > avgDom) {
      issues.push(`Days on market (${dom}) is above market average (${avgDom})`);
      recommendations.push('Monitor closely and prepare for potential strategy adjustment');
    }

    // Showing analysis
    if (showingCount !== undefined && showingCount < dom / 7) {
      issues.push(`Low showing activity: ${showingCount} showings in ${dom} days`);
      recommendations.push('Improve online presentation - consider new photos, virtual tour, or staging');
      marketingRecommendation = 'Refresh listing photos, add video walkthrough, and boost online marketing spend';
    }

    // Generate summary
    const summary = issues.length > 0
      ? `Property has ${issues.length} identified issues requiring attention. Primary concern: ${issues[0]}`
      : 'Property is performing within expected parameters.';

    const riskScore = Math.min(100, Math.round(
      (dom > avgDom ? 30 : 0) +
      (priceVsComps > 5 ? Math.min(priceVsComps * 3, 40) : 0) +
      (showingCount !== undefined && showingCount < dom / 7 ? 30 : 0)
    ));

    // Create diagnostic
    const diagnostic = await prisma.rEStaleDiagnostic.create({
      data: {
        userId: session.user.id,
        propertyId,
        daysOnMarket: dom,
        marketAvgDom: avgDom,
        priceVsComps,
        showingCount,
        feedbackSummary,
        competitionAnalysis,
        issues,
        recommendations,
        pricingRecommendation,
        marketingRecommendation,
        summary,
        riskScore,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ diagnostic, success: true });
  } catch (error) {
    console.error('Stale Diagnostic POST error:', error);
    return NextResponse.json({ error: 'Failed to create diagnostic' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, actionsTaken, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Diagnostic ID required' }, { status: 400 });
    }

    const existing = await prisma.rEStaleDiagnostic.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Diagnostic not found' }, { status: 404 });
    }

    const diagnostic = await prisma.rEStaleDiagnostic.update({
      where: { id },
      data: {
        ...(status && { status: status as REDiagnosticStatus }),
        ...(actionsTaken && { actionsTaken }),
        ...(notes && { notes }),
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
    });

    return NextResponse.json({ diagnostic, success: true });
  } catch (error) {
    console.error('Stale Diagnostic PUT error:', error);
    return NextResponse.json({ error: 'Failed to update diagnostic' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, message: 'RE feature initializing...' });
}
