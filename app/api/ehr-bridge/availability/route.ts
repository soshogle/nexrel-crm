/**
 * GET /api/ehr-bridge/availability
 * Return available slots for Voice AI (from latest screenshot snapshot)
 * Auth: Bearer token (extension) or session (Nexrel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token && token.startsWith('ehr_')) {
    const apiKeys = await prisma.apiKey.findMany({
      where: { service: 'ehr_bridge', keyName: 'extension_token', isActive: true },
    });
    for (const key of apiKeys) {
      try {
        const parsed = JSON.parse(key.keyValue) as { token: string; expiresAt: string };
        if (parsed.token === token && new Date(parsed.expiresAt) >= new Date()) {
          return key.userId;
        }
      } catch {
        continue;
      }
    }
  }

  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const dateStr = date || new Date().toISOString().slice(0, 10);

    const snapshot = await prisma.ehrScheduleSnapshot.findFirst({
      where: {
        userId,
        captureDate: {
          gte: new Date(dateStr + 'T00:00:00'),
          lt: new Date(new Date(dateStr).getTime() + 86400000),
        },
      },
      orderBy: { snapshotAt: 'desc' },
    });

    if (!snapshot) {
      const anyRecent = await prisma.ehrScheduleSnapshot.findFirst({
        where: { userId },
        orderBy: { snapshotAt: 'desc' },
      });
      if (anyRecent) {
        const av = anyRecent.availability as { date?: string; slots?: string[] };
        if (av?.date === dateStr && Array.isArray(av?.slots)) {
          return NextResponse.json({
            date: dateStr,
            slots: av.slots,
            source: 'screenshot',
            capturedAt: anyRecent.snapshotAt.toISOString(),
          });
        }
      }
      return NextResponse.json({
        date: dateStr,
        slots: [],
        message: 'No schedule captured for this date. Open EHR schedule tab and click "Capture Schedule" in extension.',
      });
    }

    const av = snapshot.availability as { slots?: string[]; booked?: { time: string; patient: string }[] };
    return NextResponse.json({
      date: dateStr,
      slots: av?.slots || [],
      bookedCount: av?.booked?.length || 0,
      source: 'screenshot',
      capturedAt: snapshot.snapshotAt.toISOString(),
    });
  } catch (error) {
    console.error('[EHR Bridge] Availability failed:', error);
    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    );
  }
}
