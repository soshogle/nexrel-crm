export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { REDNCSource } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ data: [], message: 'RE feature initializing...' });
  }

  try {
    const { searchParams } = new URL(request.url);
    const phone = (searchParams.get('phone') || '').trim();
    const country = (searchParams.get('country') || 'CA').trim().toUpperCase();
    const limit = Number(searchParams.get('limit') || 100);

    if (phone) {
      const normalizedPhone = phone.replace(/[^\d+]/g, '');
      const entry = await getCrmDb(ctx).rEDNCEntry.findFirst({
        where: { phoneNumber: normalizedPhone, country },
      });
      return NextResponse.json({ exists: !!entry, entry: entry || null });
    }

    const data = await getCrmDb(ctx).rEDNCEntry.findMany({
      where: { country },
      orderBy: { addedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('DNC GET error:', error);
    return apiErrors.internal('Failed to fetch DNC entries');
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }

  try {
    const body = await request.json();
    const phoneNumber = String(body.phoneNumber || '').replace(/[^\d+]/g, '');
    const country = String(body.country || 'CA').toUpperCase();
    const reason = body.reason ? String(body.reason) : null;
    const source = (body.source as REDNCSource) || 'MANUAL_ADD';
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (!phoneNumber) {
      return apiErrors.badRequest('phoneNumber is required');
    }

    const entry = await getCrmDb(ctx).rEDNCEntry.upsert({
      where: { phoneNumber },
      update: {
        country,
        reason,
        source,
        expiresAt,
      },
      create: {
        phoneNumber,
        country,
        reason,
        source,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('DNC POST error:', error);
    return apiErrors.internal('Failed to create DNC entry');
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return apiErrors.badRequest('id is required');
    }
    const entry = await getCrmDb(ctx).rEDNCEntry.update({
      where: { id },
      data: {
        reason: body.reason !== undefined ? String(body.reason || '') || null : undefined,
        source: body.source ? (String(body.source).toUpperCase() as REDNCSource) : undefined,
        country: body.country ? String(body.country).toUpperCase() : undefined,
        expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : undefined,
      },
    });
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('DNC PUT error:', error);
    return apiErrors.internal('Failed to update DNC entry');
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    const phone = (searchParams.get('phoneNumber') || '').replace(/[^\d+]/g, '');
    if (!id && !phone) {
      return apiErrors.badRequest('id or phoneNumber is required');
    }
    if (id) {
      await getCrmDb(ctx).rEDNCEntry.delete({ where: { id } });
    } else {
      await getCrmDb(ctx).rEDNCEntry.delete({ where: { phoneNumber: phone } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DNC DELETE error:', error);
    return apiErrors.internal('Failed to delete DNC entry');
  }
}
