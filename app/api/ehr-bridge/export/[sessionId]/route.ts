/**
 * GET /api/ehr-bridge/export/[sessionId]
 * Get formatted note for DOM injection
 * Requires: Authorization: Bearer <extension_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { formatNoteForEHR } from '@/lib/docpen/ehr-export';
import { logDocpenAudit, DOCPEN_AUDIT_EVENTS } from '@/lib/docpen/audit-log';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await verifyToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { sessionId } = await params;

    const session = await prisma.docpenSession.findFirst({
      where: { id: sessionId, userId: auth.userId },
      include: {
        soapNotes: { where: { isCurrentVersion: true } },
        lead: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const soapNote = session.soapNotes[0];
    if (!soapNote) {
      return NextResponse.json({ error: 'No SOAP note found' }, { status: 400 });
    }

    const context = {
      patientName: session.patientName || session.lead?.contactPerson || undefined,
      sessionDate: new Date(session.sessionDate).toLocaleDateString(),
      chiefComplaint: session.chiefComplaint || undefined,
      consultantName: session.consultantName || undefined,
    };

    const noteData = {
      subjective: soapNote.subjective,
      objective: soapNote.objective,
      assessment: soapNote.assessment,
      plan: soapNote.plan,
      additionalNotes: soapNote.additionalNotes,
    };

    const formattedText = formatNoteForEHR(noteData, context);

    await logDocpenAudit(sessionId, DOCPEN_AUDIT_EVENTS.EXPORTED, {
      method: 'ehr_bridge_extension',
    });

    return NextResponse.json({
      formattedText,
      note: noteData,
      context,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('[EHR Bridge] Export failed:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
