/**
 * GET /api/docpen/pre-chart?leadId=xxx
 * Returns prior notes, X-rays, and upcoming procedures for pre-charting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = request.nextUrl.searchParams.get('leadId');
    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId: session.user.id },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const [priorSessions, xrays, procedures, appointments] = await Promise.all([
      prisma.docpenSession.findMany({
        where: { leadId, userId: session.user.id },
        orderBy: { sessionDate: 'desc' },
        take: 5,
        include: {
          soapNotes: {
            where: { isCurrentVersion: true },
            take: 1,
          },
        },
      }),
      prisma.dentalXRay.findMany({
        where: { leadId, userId: session.user.id },
        orderBy: { dateTaken: 'desc' },
        take: 10,
        select: {
          id: true,
          xrayType: true,
          dateTaken: true,
          teethIncluded: true,
          thumbnailUrl: true,
        },
      }).catch(() => []),
      prisma.dentalProcedure.findMany({
        where: {
          leadId,
          userId: session.user.id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 10,
        select: {
          id: true,
          procedureCode: true,
          procedureName: true,
          scheduledDate: true,
          status: true,
        },
      }).catch(() => []),
      prisma.bookingAppointment.findMany({
        where: {
          leadId,
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
          appointmentDate: { gte: new Date() },
        },
        orderBy: { appointmentDate: 'asc' },
        take: 5,
        select: {
          id: true,
          appointmentDate: true,
          duration: true,
          status: true,
        },
      }).catch(() => []),
    ]);

    const priorNotes = priorSessions.map((s) => {
      const note = s.soapNotes[0];
      return {
        sessionId: s.id,
        sessionDate: s.sessionDate,
        chiefComplaint: s.chiefComplaint,
        summary: note
          ? [note.subjective, note.assessment, note.plan]
              .filter(Boolean)
              .map((t) => (t || '').substring(0, 150))
              .join(' | ')
          : null,
      };
    });

    return NextResponse.json({
      priorNotes,
      xrays: xrays.map((x) => ({
        id: x.id,
        xrayType: x.xrayType,
        dateTaken: x.dateTaken,
        teethIncluded: x.teethIncluded,
        thumbnailUrl: x.thumbnailUrl,
      })),
      procedures: procedures.map((p) => ({
        id: p.id,
        procedureCode: p.procedureCode,
        procedureName: p.procedureName,
        scheduledDate: p.scheduledDate,
        status: p.status,
      })),
      upcomingAppointments: appointments.map((a) => ({
        id: a.id,
        appointmentDate: a.appointmentDate,
        duration: a.duration,
        status: a.status,
      })),
    });
  } catch (error: any) {
    console.error('[Docpen Pre-chart]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load pre-chart' },
      { status: 500 }
    );
  }
}
