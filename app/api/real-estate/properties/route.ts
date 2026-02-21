export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REPropertyType, REListingStatus } from '@prisma/client';
import { syncListingToWebsite, syncStatusToWebsite } from '@/lib/website-builder/listings-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as REListingStatus | null;
    const propertyType = searchParams.get('propertyType') as REPropertyType | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    const properties = await prisma.rEProperty.findMany({
      where: {
        userId: session.user.id,
        ...(status && { listingStatus: status }),
        ...(propertyType && { propertyType }),
      },
      include: {
        sellerLead: {
          select: { id: true, contactPerson: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ properties });
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
        propertyType: (propertyType as REPropertyType) || 'SINGLE_FAMILY',
        listingStatus: (listingStatus as REListingStatus) || 'ACTIVE',
        listPrice: listPrice ? parseFloat(listPrice) : null,
        mlsNumber,
        photos: photos || [],
        virtualTourUrl,
        description,
        features: features || [],
        sellerLeadId,
        listingDate: listingDate ? new Date(listingDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
    });

    // Sync listing to owner's SERVICE website (fire-and-forget)
    syncListingToWebsite(session.user.id, {
      address, city, state, zip, country,
      beds: beds ? parseInt(beds) : null,
      baths: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft) : null,
      propertyType, listingStatus,
      listPrice: listPrice ? parseFloat(listPrice) : null,
      mlsNumber, photos, description, features,
      lat: body.lat, lng: body.lng, virtualTourUrl,
    }).then((r) => {
      if (r.success) console.log(`[Properties POST] Synced to website ${r.websiteId}`);
      else if (r.error) console.warn('[Properties POST] Website sync skipped:', r.error);
    }).catch((e) => console.warn('[Properties POST] Website sync error:', e.message));

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

    const existing = await prisma.rEProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = await prisma.rEProperty.update({
      where: { id },
      data: {
        ...(updateData.address && { address: updateData.address }),
        ...(updateData.unit !== undefined && { unit: updateData.unit || null }),
        ...(updateData.city && { city: updateData.city }),
        ...(updateData.state && { state: updateData.state }),
        ...(updateData.zip && { zip: updateData.zip }),
        ...(updateData.country && { country: updateData.country }),
        ...(updateData.beds !== undefined && { beds: updateData.beds ? parseInt(updateData.beds) : null }),
        ...(updateData.baths !== undefined && { baths: updateData.baths ? parseFloat(updateData.baths) : null }),
        ...(updateData.sqft !== undefined && { sqft: updateData.sqft ? parseInt(updateData.sqft) : null }),
        ...(updateData.lotSize !== undefined && { lotSize: updateData.lotSize ? parseInt(updateData.lotSize) : null }),
        ...(updateData.yearBuilt !== undefined && { yearBuilt: updateData.yearBuilt ? parseInt(updateData.yearBuilt) : null }),
        ...(updateData.propertyType && { propertyType: updateData.propertyType as REPropertyType }),
        ...(updateData.listPrice !== undefined && { listPrice: updateData.listPrice ? parseFloat(updateData.listPrice) : null }),
        ...(updateData.listingStatus && { listingStatus: updateData.listingStatus as REListingStatus }),
        ...(updateData.mlsNumber !== undefined && { mlsNumber: updateData.mlsNumber || null }),
        ...(updateData.description !== undefined && { description: updateData.description || null }),
        ...(updateData.features !== undefined && { features: updateData.features || [] }),
        ...(updateData.photos !== undefined && { photos: updateData.photos || [] }),
        ...(updateData.virtualTourUrl !== undefined && { virtualTourUrl: updateData.virtualTourUrl || null }),
        ...(updateData.daysOnMarket !== undefined && { daysOnMarket: parseInt(updateData.daysOnMarket) }),
      },
    });

    // Re-sync full data to owner's website after update
    syncListingToWebsite(session.user.id, {
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip,
      country: property.country,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      propertyType: property.propertyType,
      listingStatus: property.listingStatus,
      listPrice: property.listPrice,
      mlsNumber: property.mlsNumber,
      photos: property.photos as string[] | null,
      description: property.description,
      features: property.features,
      virtualTourUrl: property.virtualTourUrl,
    }).then((r) => {
      if (r.success) console.log(`[Properties PUT] Re-synced to website ${r.websiteId}`);
    }).catch((e) => console.warn('[Properties PUT] Website sync error:', e.message));

    // Also explicitly sync status to website DB for all matching listings
    if (updateData.listingStatus) {
      syncStatusToWebsite(
        session.user.id,
        property.mlsNumber,
        property.address,
        property.listingStatus
      ).catch((e) => console.warn('[Properties PUT] Status sync error:', e.message));
    }

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