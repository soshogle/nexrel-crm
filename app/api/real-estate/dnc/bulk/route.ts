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
  return NextResponse.json({ message: 'Use POST for bulk DNC operations' });
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
    const action = String(body.action || 'add').toLowerCase();
    const country = String(body.country || 'CA').toUpperCase();
    const source = ((body.source as REDNCSource) || 'MANUAL_ADD') as REDNCSource;
    const reason = body.reason ? String(body.reason) : null;
    const numbersRaw = Array.isArray(body.phoneNumbers) ? body.phoneNumbers : [];
    const phoneNumbers = numbersRaw
      .map((n: any) => String(n || '').replace(/[^\d+]/g, ''))
      .filter((n: string) => n.length > 0);

    if (phoneNumbers.length === 0) {
      return apiErrors.badRequest('phoneNumbers is required');
    }

    if (action === 'remove') {
      const result = await getCrmDb(ctx).rEDNCEntry.deleteMany({
        where: { phoneNumber: { in: phoneNumbers } },
      });
      return NextResponse.json({ success: true, removed: result.count });
    }

    const operations = phoneNumbers.map((phoneNumber: string) =>
      getCrmDb(ctx).rEDNCEntry.upsert({
        where: { phoneNumber },
        update: {
          country,
          source,
          reason,
        },
        create: {
          phoneNumber,
          country,
          source,
          reason,
        },
      })
    );

    const created = await getCrmDb(ctx).$transaction(operations);
    return NextResponse.json({ success: true, added: created.length });
  } catch (error) {
    console.error('DNC bulk POST error:', error);
    return apiErrors.internal('Failed to process bulk DNC operation');
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
  return apiErrors.badRequest('Use POST for bulk DNC operations');
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
  return apiErrors.badRequest('Use POST with action=remove for bulk deletes');
}
