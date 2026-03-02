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

    const userId = session.user.id;
    const [properties, fsbo, cmaReports, staleDiagnostics, priceChanges] = await Promise.all([
      // Only show broker's own listings (not bulk MLS imports) or listings with real date data
      prisma.rEProperty.findMany({
        where: {
          userId,
          OR: [
            { isBrokerListing: true },
            { soldDate: { not: null } },
            { listingDate: { not: null } },
          ],
        },
        select: {
          id: true,
          address: true,
          listingStatus: true,
          listPrice: true,
          isBrokerListing: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.rEFSBOListing.findMany({
        where: { assignedUserId: userId },
        select: {
          id: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      prisma.rECMAReport.findMany({
        where: { userId },
        select: {
          id: true,
          address: true,
          suggestedPrice: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.rEStaleDiagnostic.findMany({
        where: { userId },
        select: {
          id: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      prisma.rEPriceChange.findMany({
        where: { userId },
        select: {
          id: true,
          address: true,
          changeType: true,
          oldPrice: true,
          newPrice: true,
          detectedAt: true,
        },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      }),
    ]);

    const activities: Array<{
      id: string;
      type: 'listing' | 'price' | 'cma' | 'fsbo' | 'diagnostic';
      message: string;
      createdAt: string;
    }> = [];

    for (const p of properties) {
      const status = p.listingStatus?.toLowerCase?.() || 'updated';
      const prefix = p.isBrokerListing ? '' : 'MLS listing ';
      activities.push({
        id: `listing-${p.id}`,
        type: 'listing',
        message: `${prefix}Listing ${status}: ${p.address}`,
        createdAt: p.updatedAt.toISOString(),
      });
    }

    for (const c of priceChanges) {
      let message: string;
      if (c.changeType === 'sold') message = `Listing sold: ${c.address}`;
      else if (c.changeType === 'rented') message = `Listing rented: ${c.address}`;
      else if (c.changeType === 'delisted') message = `Listing removed/off-market: ${c.address}`;
      else {
        const direction = c.changeType === 'decrease' ? 'reduced' : c.changeType === 'increase' ? 'increased' : c.changeType;
        message = `Price ${direction} for ${c.address}`;
      }
      activities.push({
        id: `price-${c.id}`,
        type: c.changeType === 'sold' || c.changeType === 'rented' || c.changeType === 'delisted' ? 'listing' : 'price',
        message,
        createdAt: c.detectedAt.toISOString(),
      });
    }

    for (const cma of cmaReports) {
      activities.push({
        id: `cma-${cma.id}`,
        type: 'cma',
        message: `CMA generated for ${cma.address}`,
        createdAt: cma.createdAt.toISOString(),
      });
    }

    for (const f of fsbo) {
      activities.push({
        id: `fsbo-${f.id}`,
        type: 'fsbo',
        message: `FSBO lead ${f.status?.toLowerCase?.() || 'updated'}: ${f.address}`,
        createdAt: f.updatedAt.toISOString(),
      });
    }

    for (const d of staleDiagnostics) {
      activities.push({
        id: `diag-${d.id}`,
        type: 'diagnostic',
        message: `Stale listing diagnostic ${d.status.toLowerCase()}: ${d.address}`,
        createdAt: d.updatedAt.toISOString(),
      });
    }

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      activities: activities.slice(0, 20),
      count: activities.length,
    });
  } catch (error) {
    console.error('Real estate activity GET error:', error);
    return apiErrors.internal('Failed to fetch activity');
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Activity is read-only', message: 'Activity is read-only' },
    { status: 405 }
  );
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Activity is read-only', message: 'Activity is read-only' },
    { status: 405 }
  );
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Activity is read-only', message: 'Activity is read-only' },
    { status: 405 }
  );
}
