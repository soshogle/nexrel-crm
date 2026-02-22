export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { REFSBOStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as REFSBOStatus | null;
    const city = searchParams.get('city');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      OR: [
        { assignedUserId: ctx.userId },
        { assignedUserId: null },
      ],
    };
    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const [listings, total, stats] = await Promise.all([
      getCrmDb(ctx).rEFSBOListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          convertedLead: { select: { id: true, contactPerson: true } },
        },
      }),
      getCrmDb(ctx).rEFSBOListing.count({ where }),
      Promise.all([
        getCrmDb(ctx).rEFSBOListing.count({
          where: {
            ...where,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        getCrmDb(ctx).rEFSBOListing.count({
          where: {
            ...where,
            OR: [
              { sellerPhone: { not: null } },
              { sellerEmail: { not: null } },
            ],
          },
        }),
        getCrmDb(ctx).rEFSBOListing.count({
          where: { ...where, daysOnMarket: { gte: 60 } },
        }),
      ]),
    ]);

    return NextResponse.json({
      listings,
      total,
      stats: {
        newToday: stats[0],
        withContact: stats[1],
        stale: stats[2],
      },
    });
  } catch (error) {
    console.error('[FSBO] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch FSBO listings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status, notes, assignedUserId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status as REFSBOStatus;
    if (notes !== undefined) data.notes = notes;
    if (assignedUserId !== undefined) data.assignedUserId = assignedUserId;

    if (status === 'CONTACTED') {
      data.lastContactedAt = new Date();
      data.contactAttempts = { increment: 1 };
    }

    const listing = await getCrmDb(ctx).rEFSBOListing.update({
      where: { id },
      data,
    });

    // If converting to lead, create a CRM lead
    if (status === 'CONVERTED' && !listing.convertedLeadId) {
      const lead = await leadService.create(ctx, {
        businessName: listing.sellerName || listing.address,
        contactPerson: listing.sellerName || null,
        email: listing.sellerEmail || null,
        phone: listing.sellerPhone || null,
        source: `FSBO - ${listing.source}`,
        status: 'NEW',
        address: listing.address,
        city: listing.city || undefined,
        state: listing.state || undefined,
        enrichedData: {
          source: 'fsbo_conversion',
          fsboListingId: listing.id,
          listPrice: listing.listPrice,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          daysOnMarket: listing.daysOnMarket,
        },
      } as any);

      await getCrmDb(ctx).rEFSBOListing.update({
        where: { id },
        data: { convertedLeadId: lead.id },
      });

      return NextResponse.json({ success: true, listing, leadId: lead.id });
    }

    return NextResponse.json({ success: true, listing });
  } catch (error) {
    console.error('[FSBO] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    await getCrmDb(ctx).rEFSBOListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FSBO] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
