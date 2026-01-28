export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REFSBOSource, REFSBOStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as REFSBOSource | null;
    const status = searchParams.get('status') as REFSBOStatus | null;
    const city = searchParams.get('city');
    const assignedOnly = searchParams.get('assignedOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const fsboListings = await prisma.rEFSBOListing.findMany({
      where: {
        ...(assignedOnly && { assignedUserId: session.user.id }),
        ...(source && { source }),
        ...(status && { status }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
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

    // Get summary stats
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
    return NextResponse.json({ error: 'Failed to fetch FSBO leads' }, { status: 500 });
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
      return NextResponse.json(
        { error: 'Source, sourceUrl, address, and city are required' },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await prisma.rEFSBOListing.findUnique({
      where: { sourceUrl },
    });

    if (existing) {
      const updated = await prisma.rEFSBOListing.update({
        where: { sourceUrl },
        data: {
          lastSeenAt: new Date(),
          listPrice: listPrice ? parseFloat(listPrice) : existing.listPrice,
        },
      });
      return NextResponse.json({ listing: updated, isUpdate: true });
    }

    const listing = await prisma.rEFSBOListing.create({
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
    return NextResponse.json({ error: 'Failed to create FSBO lead' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes, sellerPhone, sellerEmail, sellerName, convertedLeadId, assignedUserId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    const existing = await prisma.rEFSBOListing.findFirst({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'FSBO listing not found' }, { status: 404 });
    }

    const listing = await prisma.rEFSBOListing.update({
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
    return NextResponse.json({ error: 'Failed to update FSBO lead' }, { status: 500 });
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
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    const existing = await prisma.rEFSBOListing.findFirst({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'FSBO listing not found' }, { status: 404 });
    }

    await prisma.rEFSBOListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FSBO Leads DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete FSBO lead' }, { status: 500 });
  }
}
