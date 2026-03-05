export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ data: [], message: 'RE feature initializing...' });
  }

  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || undefined;
    const status = searchParams.get('status') || undefined;
    const take = Math.min(Number(searchParams.get('limit') || 100), 500);

    const properties = await prisma.rEProperty.findMany({
      where: {
        userId: session.user.id,
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        ...(status ? { listingStatus: status } : {}),
      } as any,
      select: {
        id: true,
        mlsNumber: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        listingStatus: true,
        listPrice: true,
        listedAt: true,
        updatedAt: true,
      } as any,
      orderBy: { updatedAt: 'desc' },
      take,
    });

    return NextResponse.json({ data: properties, count: properties.length });
  } catch (error) {
    console.error('MLS GET error:', error);
    return apiErrors.internal('Failed to fetch MLS listings');
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Use existing property import/sync endpoints', message: 'Use existing property import/sync endpoints' },
    { status: 405 }
  );
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Use /api/real-estate/properties for updates', message: 'Use /api/real-estate/properties for updates' },
    { status: 405 }
  );
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Use /api/real-estate/properties for deletion', message: 'Use /api/real-estate/properties for deletion' },
    { status: 405 }
  );
}
