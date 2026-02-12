/**
 * POST /api/ehr-bridge/schedule/pending/[id]/sync
 * Mark appointment as synced after extension pushes to EHR
 * Requires: Bearer token
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyToken(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !token.startsWith('ehr_')) return null;

  const apiKeys = await prisma.apiKey.findMany({
    where: { service: 'ehr_bridge', keyName: 'extension_token', isActive: true },
  });
  for (const key of apiKeys) {
    try {
      const parsed = JSON.parse(key.keyValue) as { token: string; expiresAt: string };
      if (parsed.token === token && new Date(parsed.expiresAt) >= new Date()) {
        return { userId: key.userId };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = await params;

    const appointment = await prisma.bookingAppointment.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    await prisma.bookingAppointment.update({
      where: { id },
      data: { syncStatus: 'SYNCED', lastSyncAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EHR Bridge] Mark sync failed:', error);
    return NextResponse.json(
      { error: 'Failed to mark sync' },
      { status: 500 }
    );
  }
}
