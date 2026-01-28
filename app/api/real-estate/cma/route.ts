export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const cmaReports = await prisma.rECMAReport.findMany({
      where: {
        userId: session.user.id,
        ...(propertyId && { propertyId }),
      },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            listPrice: true,
          },
        },
        comparables: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ reports: cmaReports });
  } catch (error) {
    console.error('CMA GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch CMA reports' }, { status: 500 });
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
      leadId,
      subjectAddress,
      subjectCity,
      subjectState,
      subjectZip,
      suggestedListPrice,
      priceRangeLow,
      priceRangeHigh,
      adjustedAvgPrice,
      marketConditions,
      analysis,
      comparables,
    } = body;

    if (!subjectAddress || !subjectCity) {
      return NextResponse.json(
        { error: 'Subject address and city required' },
        { status: 400 }
      );
    }

    // Create CMA report with comparables
    const cmaReport = await prisma.rECMAReport.create({
      data: {
        userId: session.user.id,
        propertyId,
        leadId,
        subjectAddress,
        subjectCity,
        subjectState: subjectState || '',
        subjectZip: subjectZip || '',
        suggestedListPrice: suggestedListPrice ? parseFloat(suggestedListPrice) : null,
        priceRangeLow: priceRangeLow ? parseFloat(priceRangeLow) : null,
        priceRangeHigh: priceRangeHigh ? parseFloat(priceRangeHigh) : null,
        adjustedAvgPrice: adjustedAvgPrice ? parseFloat(adjustedAvgPrice) : null,
        marketConditions,
        analysis,
        comparables: comparables && comparables.length > 0 ? {
          create: comparables.map((comp: any) => ({
            address: comp.address,
            city: comp.city,
            state: comp.state || '',
            zip: comp.zip || '',
            status: comp.status || 'SOLD',
            salePrice: comp.salePrice ? parseFloat(comp.salePrice) : null,
            listPrice: comp.listPrice ? parseFloat(comp.listPrice) : null,
            closeDate: comp.closeDate ? new Date(comp.closeDate) : null,
            dom: comp.dom ? parseInt(comp.dom) : null,
            beds: comp.beds ? parseInt(comp.beds) : null,
            baths: comp.baths ? parseFloat(comp.baths) : null,
            sqft: comp.sqft ? parseInt(comp.sqft) : null,
            yearBuilt: comp.yearBuilt ? parseInt(comp.yearBuilt) : null,
            distanceMiles: comp.distanceMiles ? parseFloat(comp.distanceMiles) : null,
            pricePerSqft: comp.pricePerSqft ? parseFloat(comp.pricePerSqft) : null,
            adjustments: comp.adjustments || {},
            adjustedPrice: comp.adjustedPrice ? parseFloat(comp.adjustedPrice) : null,
          })),
        } : undefined,
      },
      include: {
        comparables: true,
      },
    });

    return NextResponse.json({ report: cmaReport, success: true });
  } catch (error) {
    console.error('CMA POST error:', error);
    return NextResponse.json({ error: 'Failed to create CMA report' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    const existing = await prisma.rECMAReport.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'CMA report not found' }, { status: 404 });
    }

    const report = await prisma.rECMAReport.update({
      where: { id },
      data: {
        ...(updateData.suggestedListPrice && { suggestedListPrice: parseFloat(updateData.suggestedListPrice) }),
        ...(updateData.priceRangeLow && { priceRangeLow: parseFloat(updateData.priceRangeLow) }),
        ...(updateData.priceRangeHigh && { priceRangeHigh: parseFloat(updateData.priceRangeHigh) }),
        ...(updateData.marketConditions && { marketConditions: updateData.marketConditions }),
        ...(updateData.analysis && { analysis: updateData.analysis }),
      },
    });

    return NextResponse.json({ report, success: true });
  } catch (error) {
    console.error('CMA PUT error:', error);
    return NextResponse.json({ error: 'Failed to update CMA report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, message: 'RE feature initializing...' });
}
