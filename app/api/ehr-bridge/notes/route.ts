/**
 * GET /api/ehr-bridge/notes
 * List pushable Docpen sessions for the extension
 * Requires: Authorization: Bearer <extension_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PUSHABLE_STATUSES = ['SIGNED', 'REVIEW_PENDING'];

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token || !token.startsWith('ehr_')) {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        service: 'ehr_bridge',
        keyName: 'extension_token',
        isActive: true,
      },
      include: { user: true },
    });

    let apiKey: (typeof apiKeys)[0] | null = null;
    for (const key of apiKeys) {
      try {
        const parsed = JSON.parse(key.keyValue) as { token: string; expiresAt: string };
        if (parsed.token === token && new Date(parsed.expiresAt) >= new Date()) {
          apiKey = key;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const sessions = await prisma.docpenSession.findMany({
      where: {
        userId: apiKey.userId,
        status: { in: PUSHABLE_STATUSES },
      },
      orderBy: { sessionDate: 'desc' },
      take: 20,
      include: {
        lead: {
          select: {
            id: true,
            contactPerson: true,
            businessName: true,
          },
        },
        soapNotes: {
          where: { isCurrentVersion: true },
          take: 1,
        },
      },
    });

    const notes = sessions
      .filter((s) => s.soapNotes.length > 0)
      .map((s) => {
        const note = s.soapNotes[0];
        return {
          id: s.id,
          patientName: s.patientName || s.lead?.contactPerson || s.lead?.businessName || 'Unknown',
          sessionDate: s.sessionDate.toISOString(),
          chiefComplaint: s.chiefComplaint,
          consultantName: s.consultantName,
          hasNote: !!(note?.subjective || note?.objective || note?.assessment || note?.plan),
        };
      });

    return NextResponse.json({
      notes,
      userEmail: apiKey.user.email,
    });
  } catch (error) {
    console.error('[EHR Bridge] Notes fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
