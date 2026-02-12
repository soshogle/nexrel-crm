/**
 * POST /api/ehr-bridge/schedule/pull-dom
 * Receive DOM-extracted schedule (slots + booked) from extension
 * Real-time alternative to screenshot - no Vision API cost
 * Requires: Authorization: Bearer <extension_token>
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

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { ehrType = 'generic', date, slots = [], booked = [] } = body;

    const dateStr = date || new Date().toISOString().slice(0, 10);
    const captureDate = new Date(dateStr + 'T12:00:00');

    await prisma.ehrScheduleSnapshot.create({
      data: {
        userId: auth.userId,
        ehrType,
        captureDate,
        availability: { date: dateStr, slots, booked },
        source: 'dom',
      },
    });

    return NextResponse.json({
      success: true,
      date: dateStr,
      slots: slots.length,
      bookedCount: booked.length,
      message: `Synced ${slots.length} available slots, ${booked.length} booked`,
    });
  } catch (error) {
    console.error('[EHR Bridge] Schedule pull-dom failed:', error);
    return NextResponse.json(
      { error: 'Failed to sync schedule' },
      { status: 500 }
    );
  }
}
