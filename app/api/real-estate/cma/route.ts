export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

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
        property: true,
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
      address,
      beds,
      baths,
      sqft,
      yearBuilt,
      comparables,
      adjustments,
      suggestedPriceMin,
      suggestedPriceMax,
      suggestedPrice,
      pricePerSqft,
    } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Property address required' },
        { status: 400 }
      );
    }

    // Create CMA report - comparables stored as JSON
    const cmaReport = await prisma.rECMAReport.create({
      data: {
        userId: session.user.id,
        propertyId: propertyId || null,
        address,
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        comparables: comparables || [],
        adjustments: adjustments || {},
        suggestedPriceMin: suggestedPriceMin ? parseFloat(suggestedPriceMin) : null,
        suggestedPriceMax: suggestedPriceMax ? parseFloat(suggestedPriceMax) : null,
        suggestedPrice: suggestedPrice ? parseFloat(suggestedPrice) : null,
        pricePerSqft: pricePerSqft ? parseFloat(pricePerSqft) : null,
      },
      include: {
        property: true,
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
        ...(updateData.address && { address: updateData.address }),
        ...(updateData.beds !== undefined && { beds: parseInt(updateData.beds) }),
        ...(updateData.baths !== undefined && { baths: parseFloat(updateData.baths) }),
        ...(updateData.sqft !== undefined && { sqft: parseInt(updateData.sqft) }),
        ...(updateData.comparables && { comparables: updateData.comparables }),
        ...(updateData.adjustments && { adjustments: updateData.adjustments }),
        ...(updateData.suggestedPrice !== undefined && { suggestedPrice: parseFloat(updateData.suggestedPrice) }),
        ...(updateData.suggestedPriceMin !== undefined && { suggestedPriceMin: parseFloat(updateData.suggestedPriceMin) }),
        ...(updateData.suggestedPriceMax !== undefined && { suggestedPriceMax: parseFloat(updateData.suggestedPriceMax) }),
      },
    });

    return NextResponse.json({ report, success: true });
  } catch (error) {
    console.error('CMA PUT error:', error);
    return NextResponse.json({ error: 'Failed to update CMA report' }, { status: 500 });
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
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }
    
    const existing = await prisma.rECMAReport.findFirst({
      where: { id, userId: session.user.id },
    });
    
    if (!existing) {
      return NextResponse.json({ error: 'CMA report not found' }, { status: 404 });
    }
    
    await prisma.rECMAReport.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMA DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete CMA report' }, { status: 500 });
  }
}
