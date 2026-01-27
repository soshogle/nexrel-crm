export const dynamic = "force-dynamic";

/**
 * FSBO Listings API - List, filter, and manage FSBO leads
 */

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
    const source = searchParams.get('source');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const status = searchParams.get('status');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minDays = searchParams.get('minDays');
    const maxDays = searchParams.get('maxDays');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Admins can see all FSBO listings, regular users only see their own
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    const isAdmin = ['SUPER_ADMIN', 'AGENCY_ADMIN', 'ADMIN'].includes(user?.role || '');
    const where: any = isAdmin ? {} : { assignedUserId: session.user.id };

    // Get user's real estate settings for stale threshold
    const reSettings = await prisma.realEstateSettings.findUnique({
      where: { userId: session.user.id }
    });
    const staleDaysThreshold = reSettings?.staleDaysThreshold || 21; // Default 21 days

    if (source) where.source = source.toUpperCase().replace('.', '_').replace('_fsbo', '_FSBO');
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = state;
    if (status) where.status = status;
    if (minPrice) where.listPrice = { ...where.listPrice, gte: parseInt(minPrice) };
    if (maxPrice) where.listPrice = { ...where.listPrice, lte: parseInt(maxPrice) };
    if (minDays) where.daysOnMarket = { ...where.daysOnMarket, gte: parseInt(minDays) };
    if (maxDays) where.daysOnMarket = { ...where.daysOnMarket, lte: parseInt(maxDays) };

    const [listings, total] = await Promise.all([
      prisma.rEFSBOListing.findMany({
        where,
        orderBy: { firstSeenAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.rEFSBOListing.count({ where })
    ]);

    // Get stats
    const statsWhere = isAdmin ? {} : { assignedUserId: session.user.id };
    const stats = await prisma.rEFSBOListing.groupBy({
      by: ['source', 'status'],
      where: statsWhere,
      _count: true
    });

    // Calculate days on market if not set
    const now = new Date();
    
    // Map to frontend format with proper date handling
    const leads = listings.map(listing => {
      // Calculate actual days on market from firstSeenAt if daysOnMarket is 0
      let daysOnMarket = listing.daysOnMarket || 0;
      if (daysOnMarket === 0 && listing.firstSeenAt) {
        daysOnMarket = Math.floor((now.getTime() - new Date(listing.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Determine if listing is stale based on user settings (default 21 days)
      const isStale = daysOnMarket >= staleDaysThreshold;
      
      return {
        id: listing.id,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        price: listing.listPrice || 0,
        beds: listing.beds || 0,
        baths: listing.baths || 0,
        sqft: listing.sqft || 0,
        yearBuilt: listing.yearBuilt,
        propertyType: listing.propertyType,
        daysOnMarket,
        isStale,
        firstSeenAt: listing.firstSeenAt,
        lastSeenAt: listing.lastSeenAt,
        source: listing.source,
        sellerName: listing.sellerName || null,
        phone: listing.sellerPhone || null,
        email: listing.sellerEmail || null,
        dncStatus: 'unknown' as const,
        status: (listing.status || 'NEW').toLowerCase() as 'new' | 'contacted' | 'qualified' | 'converted',
        photos: (listing.photos as string[]) || [],
        listingUrl: listing.sourceUrl,
        description: listing.description,
        notes: listing.notes,
        contactAttempts: listing.contactAttempts,
        lastContactedAt: listing.lastContactedAt,
      };
    });

    // Count stale listings based on user's threshold (default 21 days)
    const staleWhere = isAdmin ? { daysOnMarket: { gte: staleDaysThreshold } } : { assignedUserId: session.user.id, daysOnMarket: { gte: staleDaysThreshold } };
    const staleCount = await prisma.rEFSBOListing.count({ where: staleWhere });
    
    // Count listings with contact info
    const withContactWhere = isAdmin 
      ? { OR: [{ sellerPhone: { not: null } }, { sellerEmail: { not: null } }] }
      : { assignedUserId: session.user.id, OR: [{ sellerPhone: { not: null } }, { sellerEmail: { not: null } }] };
    const withContactCount = await prisma.rEFSBOListing.count({ where: withContactWhere });

    return NextResponse.json({
      leads,
      listings, // Keep for backward compatibility
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats,
      summary: {
        total,
        stale: staleCount,
        withContact: withContactCount,
        newToday: await prisma.rEFSBOListing.count({
          where: {
            ...statsWhere,
            firstSeenAt: { gte: new Date(now.setHours(0, 0, 0, 0)) }
          }
        })
      },
      settings: {
        staleDaysThreshold
      }
    });
  } catch (error) {
    console.error('FSBO GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FSBO listings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes, convertToLead } = body;

    if (!id) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    // Verify ownership
    const listing = await prisma.rEFSBOListing.findFirst({
      where: { id, assignedUserId: session.user.id }
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Update listing
    const updated = await prisma.rEFSBOListing.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      }
    });

    // Convert to CRM lead if requested
    let leadId: string | null = null;
    if (convertToLead && listing.sellerPhone) {
      const lead = await prisma.lead.create({
        data: {
          userId: session.user.id,
          businessName: listing.sellerName || 'FSBO Seller',
          contactPerson: listing.sellerName,
          email: listing.sellerEmail,
          phone: listing.sellerPhone,
          address: listing.address,
          city: listing.city,
          state: listing.state,
          source: `FSBO - ${listing.source}`,
          status: 'NEW',
          tags: ['FSBO', 'Potential Seller', listing.source]
        }
      });
      leadId = lead.id;

      // Add note with FSBO details
      await prisma.note.create({
        data: {
          leadId: lead.id,
          userId: session.user.id,
          content: `FSBO Lead from ${listing.source}\nProperty: ${listing.address}, ${listing.city}, ${listing.state}\nPrice: $${listing.listPrice?.toLocaleString()}\nDays on Market: ${listing.daysOnMarket}\nListing URL: ${listing.sourceUrl}`
        }
      });

      // Mark FSBO as contacted
      await prisma.rEFSBOListing.update({
        where: { id },
        data: { status: 'CONTACTED', convertedLeadId: leadId }
      });
    }

    return NextResponse.json({
      success: true,
      listing: updated,
      leadId
    });
  } catch (error) {
    console.error('FSBO PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    );
  }
}
