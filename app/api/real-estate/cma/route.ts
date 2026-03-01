export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal('Failed to fetch CMA reports');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const subject = body?.subjectProperty ?? body;
    const {
      propertyId,
      address,
      beds,
      baths,
      sqft,
      yearBuilt,
      propertyType,
      comparables,
      adjustments,
      suggestedPriceMin,
      suggestedPriceMax,
      suggestedPrice,
      pricePerSqft,
    } = subject;

    if (!address) {
      return apiErrors.badRequest('Property address required');
    }

    // Generate a full CMA report when subject property is provided from CMA panel.
    // This supports payloads like { subjectProperty, searchRadius, maxComps, lookbackMonths }.
    if (beds && baths && sqft) {
      const { generateCMA } = await import('@/lib/real-estate/cma');
      const cityStateZip = (address as string).split(',').map((s) => s.trim());
      const generated = await generateCMA(
        {
          address: address as string,
          city: (subject.city as string) || cityStateZip[1] || '',
          state: (subject.state as string) || cityStateZip[2]?.split(' ')[0] || '',
          zip: (subject.zip as string) || cityStateZip[2]?.split(' ')[1] || '',
          propertyType: (propertyType as string) || 'single_family',
          beds: Number(beds),
          baths: Number(baths),
          sqft: Number(sqft),
          yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
          condition: (subject.condition as any) || 'good',
          features: Array.isArray(subject.features) ? subject.features : [],
          lotSize: subject.lotSize ? Number(subject.lotSize) : undefined,
        },
        session.user.id
      );

      return NextResponse.json({ success: true, cma: generated });
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
    return apiErrors.internal('Failed to create CMA report');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return apiErrors.badRequest('Report ID required');
    }

    const existing = await prisma.rECMAReport.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound('CMA report not found');
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
    return apiErrors.internal('Failed to update CMA report');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return apiErrors.badRequest('Report ID required');
    }
    
    const existing = await prisma.rECMAReport.findFirst({
      where: { id, userId: session.user.id },
    });
    
    if (!existing) {
      return apiErrors.notFound('CMA report not found');
    }
    
    await prisma.rECMAReport.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMA DELETE error:', error);
    return apiErrors.internal('Failed to delete CMA report');
  }
}
