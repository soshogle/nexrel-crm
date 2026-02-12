/**
 * AI Docpen - Single Session API
 * 
 * Endpoints:
 * - GET: Get session details with transcriptions and SOAP notes
 * - PATCH: Update session (status, sign, etc.)
 * - DELETE: Cancel/archive session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateSignatureHash, sanitizeForLogging, createAuditLogEntry } from '@/lib/docpen/security';
import { logDocpenAudit, DOCPEN_AUDIT_EVENTS } from '@/lib/docpen/audit-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const docpenSession = await prisma.docpenSession.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        transcriptions: {
          orderBy: { startTime: 'asc' },
        },
        soapNotes: {
          orderBy: { version: 'desc' },
        },
        assistantQueries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!docpenSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Log audit entry
    console.log('[Docpen Audit]', sanitizeForLogging(
      createAuditLogEntry('read', 'session', id, session.user.id, request)
    ));

    return NextResponse.json({ session: docpenSession });
  } catch (error) {
    console.error('[Docpen Session GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, signedBy, attestation, status, chiefComplaint, patientName } = body;

    // Verify session belongs to user
    const existingSession = await prisma.docpenSession.findFirst({
      where: { id, userId: session.user.id },
      include: {
        soapNotes: {
          where: { isCurrentVersion: true },
        },
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let updateData: Record<string, any> = {};

    // Handle sign action
    if (action === 'sign') {
      if (!signedBy || !attestation) {
        return NextResponse.json(
          { error: 'signedBy and attestation are required for signing' },
          { status: 400 }
        );
      }

      if (existingSession.status === 'SIGNED') {
        return NextResponse.json(
          { error: 'Session is already signed' },
          { status: 400 }
        );
      }

      // Generate signature hash
      const soapContent = existingSession.soapNotes[0]
        ? JSON.stringify(existingSession.soapNotes[0])
        : '';
      const signedAt = new Date();
      const signatureHash = generateSignatureHash(id, signedBy, signedAt, soapContent);

      updateData = {
        status: 'SIGNED',
        signedAt,
        signedBy,
        signatureHash,
        reviewedAt: existingSession.reviewedAt || signedAt,
      };

      // Log sign audit entry
      console.log('[Docpen Audit - SIGN]', sanitizeForLogging(
        createAuditLogEntry('sign', 'session', id, session.user.id, request)
      ));
      await logDocpenAudit(id, DOCPEN_AUDIT_EVENTS.SIGNED, { signedBy });
    }
    // Handle status update
    else if (status) {
      const validStatuses = ['RECORDING', 'PROCESSING', 'REVIEW_PENDING', 'ARCHIVED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      // Can't change status if already signed (except to archive)
      if (existingSession.status === 'SIGNED' && status !== 'ARCHIVED') {
        return NextResponse.json(
          { error: 'Cannot change status of a signed session' },
          { status: 400 }
        );
      }

      updateData.status = status;
      if (status === 'REVIEW_PENDING') {
        updateData.reviewedAt = new Date();
      }
    }

    // Allow updating basic info if not signed
    if (existingSession.status !== 'SIGNED') {
      if (chiefComplaint !== undefined) updateData.chiefComplaint = chiefComplaint;
      if (patientName !== undefined) updateData.patientName = patientName;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const updatedSession = await prisma.docpenSession.update({
      where: { id },
      data: updateData,
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
        },
      },
    });

    // Log update audit entry
    console.log('[Docpen Audit]', sanitizeForLogging(
      createAuditLogEntry('update', 'session', id, session.user.id, request)
    ));

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error('[Docpen Session PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify session belongs to user
    const existingSession = await prisma.docpenSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Don't allow deleting signed sessions - archive instead
    if (existingSession.status === 'SIGNED') {
      return NextResponse.json(
        { error: 'Cannot delete signed sessions. Archive instead.' },
        { status: 400 }
      );
    }

    // Cancel the session instead of hard delete for audit trail
    await prisma.docpenSession.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Log delete audit entry
    console.log('[Docpen Audit]', sanitizeForLogging(
      createAuditLogEntry('delete', 'session', id, session.user.id, request)
    ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Docpen Session DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel session' },
      { status: 500 }
    );
  }
}
