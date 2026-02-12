/**
 * GET /api/ehr-bridge/desktop/actions
 * Returns pending RPA-style actions for the desktop bridge (UiPath, Automation Anywhere, or built-in executor).
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

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'nexrel';

    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        userId: auth.userId,
        status: 'SCHEDULED',
        syncStatus: 'PENDING',
      },
      orderBy: { appointmentDate: 'asc' },
      take: 20,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        appointmentDate: true,
        duration: true,
        notes: true,
      },
    });

    const actions = appointments.map((apt) => ({
      id: apt.id,
      type: 'inject_appointment',
      payload: { ...apt, appointmentDate: apt.appointmentDate.toISOString() },
      rpa: {
        uipath: {
          activity: 'TypeInto',
          selector: { type: 'selector', value: 'input[name*="patient" i], input[data-field="patient"]' },
          text: apt.customerName || '',
        },
        automationAnywhere: {
          command: 'Type',
          parameters: { field: 'patient', value: apt.customerName || '' },
        },
        exec: {
          command: `osascript -e 'tell application "System Events" to keystroke "${(apt.customerName || '').replace(/"/g, '\\"')}"'`,
        },
      },
    }));

    if (format === 'uipath') {
      return NextResponse.json({ workflow: actions.map((a) => a.rpa.uipath) });
    }
    if (format === 'automationanywhere') {
      return NextResponse.json({ tasks: actions.map((a) => a.rpa.automationAnywhere) });
    }

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('[EHR Bridge] Desktop actions failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
