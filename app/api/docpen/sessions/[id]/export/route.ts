/**
 * POST /api/docpen/sessions/[id]/export
 * Export session note for EHR (webhook, formatted text)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatNoteForEHR, buildWebhookPayload } from '@/lib/docpen/ehr-export';
import { logDocpenAudit, DOCPEN_AUDIT_EVENTS } from '@/lib/docpen/audit-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { format = 'text', webhookUrl, logExport, method } = body;

    const docpenSession = await prisma.docpenSession.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        soapNotes: { where: { isCurrentVersion: true } },
        lead: true,
      },
    });

    if (!docpenSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const soapNote = docpenSession.soapNotes[0];

    // Log-only request (client copy/PDF - no server-side export)
    if (logExport && method) {
      await logDocpenAudit(params.id, DOCPEN_AUDIT_EVENTS.EXPORTED, { method });
      return NextResponse.json({ success: true, logged: true });
    }

    if (!soapNote) {
      return NextResponse.json({ error: 'No SOAP note to export' }, { status: 400 });
    }

    const context = {
      sessionId: docpenSession.id,
      patientName: docpenSession.patientName || docpenSession.lead?.contactPerson || undefined,
      sessionDate: docpenSession.sessionDate?.toISOString?.() || new Date().toISOString(),
      chiefComplaint: docpenSession.chiefComplaint || undefined,
      consultantName: docpenSession.consultantName || undefined,
    };

    const noteData = {
      subjective: soapNote.subjective,
      objective: soapNote.objective,
      assessment: soapNote.assessment,
      plan: soapNote.plan,
      additionalNotes: soapNote.additionalNotes,
    };

    if (format === 'webhook' && webhookUrl) {
      const payload = buildWebhookPayload(noteData, context);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Webhook failed: ${res.status}` },
          { status: 502 }
        );
      }
      await logDocpenAudit(params.id, DOCPEN_AUDIT_EVENTS.EXPORTED, { method: 'webhook' });
      return NextResponse.json({ success: true, message: 'Exported to webhook' });
    }

    const formattedText = formatNoteForEHR(noteData, {
      ...context,
      sessionDate: new Date(context.sessionDate).toLocaleDateString(),
    });

    await logDocpenAudit(params.id, DOCPEN_AUDIT_EVENTS.EXPORTED, { method: 'text' });

    return NextResponse.json({
      formattedText,
      sessionId: docpenSession.id,
      patientName: context.patientName,
      sessionDate: context.sessionDate,
    });
  } catch (error: any) {
    console.error('[Docpen Export]', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
