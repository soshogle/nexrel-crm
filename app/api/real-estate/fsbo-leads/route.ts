export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { REFSBOSource, REFSBOStatus } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as REFSBOSource | null;
    const status = searchParams.get('status') as REFSBOStatus | null;
    const city = searchParams.get('city');
    const assignedOnly = searchParams.get('assignedOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const fsboListings = await db.rEFSBOListing.findMany({
      where: {
        ...(assignedOnly && { assignedUserId: session.user.id }),
        ...(source && { source }),
        ...(status && { status }),
        ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
      },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        convertedLead: {
          select: { id: true, contactPerson: true, status: true },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
      take: limit,
    });

    const stats = {
      total: fsboListings.length,
      new: fsboListings.filter(l => l.status === 'NEW').length,
      contacted: fsboListings.filter(l => l.status === 'CONTACTED').length,
      converted: fsboListings.filter(l => l.status === 'CONVERTED').length,
      notInterested: fsboListings.filter(l => l.status === 'NOT_INTERESTED').length,
    };

    return NextResponse.json({ listings: fsboListings, stats });
  } catch (error) {
    console.error('FSBO Leads GET error:', error);
    return apiErrors.internal('Failed to fetch FSBO leads');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const {
      source,
      sourceUrl,
      sourceListingId,
      address,
      city,
      state,
      zip,
      country,
      listPrice,
      beds,
      baths,
      sqft,
      lotSize,
      yearBuilt,
      propertyType,
      photos,
      description,
      sellerName,
      sellerPhone,
      sellerEmail,
    } = body;

    if (!source || !sourceUrl || !address || !city) {
      return apiErrors.badRequest('Source, sourceUrl, address, and city are required');
    }

    const existing = await db.rEFSBOListing.findUnique({
      where: { sourceUrl },
    });

    if (existing) {
      const updated = await db.rEFSBOListing.update({
        where: { sourceUrl },
        data: {
          lastSeenAt: new Date(),
          listPrice: listPrice ? parseFloat(listPrice) : existing.listPrice,
        },
      });
      return NextResponse.json({ listing: updated, isUpdate: true });
    }

    const listing = await db.rEFSBOListing.create({
      data: {
        source: source as REFSBOSource,
        sourceUrl,
        sourceListingId,
        address,
        city,
        state: state || '',
        zip,
        country: country || 'CA',
        listPrice: listPrice ? parseFloat(listPrice) : null,
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        lotSize: lotSize ? parseInt(lotSize) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        propertyType,
        photos: photos || [],
        description,
        sellerName,
        sellerPhone,
        sellerEmail,
        status: 'NEW',
        assignedUserId: session.user.id,
      },
    });

    return NextResponse.json({ listing, success: true });
  } catch (error) {
    console.error('FSBO Leads POST error:', error);
    return apiErrors.internal('Failed to create FSBO lead');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { id, status, notes, sellerPhone, sellerEmail, sellerName, convertedLeadId, assignedUserId } = body;

    if (!id) {
      return apiErrors.badRequest('Listing ID required');
    }

    const existing = await db.rEFSBOListing.findFirst({
      where: { id },
    });

    if (!existing) {
      return apiErrors.notFound('FSBO listing not found');
    }

    const listing = await db.rEFSBOListing.update({
      where: { id },
      data: {
        ...(status && { status: status as REFSBOStatus }),
        ...(notes !== undefined && { notes }),
        ...(sellerPhone && { sellerPhone }),
        ...(sellerEmail && { sellerEmail }),
        ...(sellerName && { sellerName }),
        ...(convertedLeadId && { convertedLeadId }),
        ...(assignedUserId !== undefined && { assignedUserId }),
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ listing, success: true });
  } catch (error) {
    console.error('FSBO Leads PUT error:', error);
    return apiErrors.internal('Failed to update FSBO lead');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiErrors.badRequest('Listing ID required');
    }

    const existing = await db.rEFSBOListing.findFirst({
      where: { id },
    });

    if (!existing) {
      return apiErrors.notFound('FSBO listing not found');
    }

    await db.rEFSBOListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FSBO Leads DELETE error:', error);
    return apiErrors.internal('Failed to delete FSBO lead');
  }
}
