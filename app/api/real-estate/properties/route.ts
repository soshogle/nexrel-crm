export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REPropertyType, REListingStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as REListingStatus | null;
    const city = searchParams.get('city');
    const limit = parseInt(searchParams.get('limit') || '50');

    const properties = await prisma.rEProperty.findMany({
      where: {
        userId: session.user.id,
        ...(status && { listingStatus: status }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
      },
      include: {
        sellerLead: {
          select: {
            id: true,
            contactPerson: true,
            phone: true,
            email: true,
          },
        },
        _count: {
          select: {
            cmaReports: true,
            diagnostics: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      properties,
      total: properties.length,
    });
  } catch (error) {
    console.error('Properties GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
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
      address,
      unit,
      city,
      state,
      zip,
      country,
      beds,
      baths,
      sqft,
      lotSize,
      yearBuilt,
      propertyType,
      listingStatus,
      listPrice,
      mlsNumber,
      photos,
      virtualTourUrl,
      description,
      features,
      sellerLeadId,
      listingDate,
      expirationDate,
    } = body;

    if (!address || !city || !state || !zip) {
      return NextResponse.json(
        { error: 'Address, city, state, and zip are required' },
        { status: 400 }
      );
    }

    const property = await prisma.rEProperty.create({
      data: {
        userId: session.user.id,
        address,
        unit,
        city,
        state,
        zip,
        country: country || 'US',
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        lotSize: lotSize ? parseInt(lotSize) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        propertyType: propertyType || 'SINGLE_FAMILY',
        listingStatus: listingStatus || 'ACTIVE',
        listPrice: listPrice ? parseFloat(listPrice) : null,
        mlsNumber,
        photos: photos || [],
        virtualTourUrl,
        description,
        features: features || [],
        sellerLeadId,
        listingDate: listingDate ? new Date(listingDate) : new Date(),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
    });

    return NextResponse.json({ property, success: true });
  } catch (error) {
    console.error('Properties POST error:', error);
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
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
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.rEProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Calculate days on market if status changed to ACTIVE
    let daysOnMarket = existing.daysOnMarket;
    if (updateData.listingStatus === 'ACTIVE' && existing.listingDate) {
      daysOnMarket = Math.floor(
        (Date.now() - new Date(existing.listingDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const property = await prisma.rEProperty.update({
      where: { id },
      data: {
        ...updateData,
        daysOnMarket,
        ...(updateData.listPrice && { listPrice: parseFloat(updateData.listPrice) }),
        ...(updateData.soldPrice && { soldPrice: parseFloat(updateData.soldPrice) }),
        ...(updateData.beds && { beds: parseInt(updateData.beds) }),
        ...(updateData.baths && { baths: parseFloat(updateData.baths) }),
        ...(updateData.sqft && { sqft: parseInt(updateData.sqft) }),
      },
    });

    return NextResponse.json({ property, success: true });
  } catch (error) {
    console.error('Properties PUT error:', error);
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
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
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.rEProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    await prisma.rEProperty.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Properties DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}
