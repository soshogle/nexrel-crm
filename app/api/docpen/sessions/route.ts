/**
 * AI Docpen - Sessions API
 * 
 * Endpoints:
 * - GET: List all sessions for the user
 * - POST: Create a new clinical session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sanitizeForLogging, createAuditLogEntry } from '@/lib/docpen/security';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const sessions = await prisma.docpenSession.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status: status as any }),
        ...(leadId && { leadId }),
      },
      orderBy: { sessionDate: 'desc' },
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
        soapNotes: {
          where: { isCurrentVersion: true },
          select: {
            id: true,
            subjective: true,
            assessment: true,
          },
        },
        _count: {
          select: {
            transcriptions: true,
            assistantQueries: true,
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Docpen Sessions GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      leadId,
      patientName,
      profession = 'GENERAL_PRACTICE',
      customProfession,
      chiefComplaint,
    } = body;

    // Validate profession
    const validProfessions = [
      'GENERAL_PRACTICE', 'DENTIST', 'OPTOMETRIST', 'DERMATOLOGIST',
      'CARDIOLOGIST', 'PSYCHIATRIST', 'PEDIATRICIAN', 'ORTHOPEDIC',
      'PHYSIOTHERAPIST', 'CHIROPRACTOR', 'CUSTOM',
    ];

    if (!validProfessions.includes(profession)) {
      return NextResponse.json(
        { error: 'Invalid profession type' },
        { status: 400 }
      );
    }

    // Verify lead belongs to user if provided
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, userId: session.user.id },
      });
      if (!lead) {
        return NextResponse.json(
          { error: 'Client record not found' },
          { status: 404 }
        );
      }
    }

    // Create the session
    const docpenSession = await prisma.docpenSession.create({
      data: {
        userId: session.user.id,
        leadId: leadId || null,
        patientName: patientName || null,
        profession: profession as any,
        customProfession: customProfession || null,
        chiefComplaint: chiefComplaint || null,
        status: 'RECORDING',
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
      },
    });

    // Log audit entry
    console.log('[Docpen Audit]', sanitizeForLogging(
      createAuditLogEntry('create', 'session', docpenSession.id, session.user.id, request)
    ));

    return NextResponse.json({ session: docpenSession }, { status: 201 });
  } catch (error) {
    console.error('[Docpen Sessions POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
