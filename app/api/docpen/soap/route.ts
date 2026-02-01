/**
 * AI Docpen - SOAP Note Generation API
 * 
 * Endpoints:
 * - POST: Generate SOAP note from transcription
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateSOAPNote, regenerateSection } from '@/lib/docpen/soap-generator';
import { sanitizeForLogging, createAuditLogEntry } from '@/lib/docpen/security';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, regenerate = false, section, feedback } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session belongs to user and get full data
    const docpenSession = await prisma.docpenSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
      include: {
        transcriptions: {
          orderBy: { startTime: 'asc' },
        },
        soapNotes: {
          where: { isCurrentVersion: true },
        },
        lead: {
          include: {
            notes: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!docpenSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (docpenSession.transcriptions.length === 0) {
      return NextResponse.json(
        { error: 'No transcriptions found. Please transcribe audio first.' },
        { status: 400 }
      );
    }

    // Handle section regeneration
    if (section && ['subjective', 'objective', 'assessment', 'plan'].includes(section)) {
      const existingNote = docpenSession.soapNotes[0];
      if (!existingNote) {
        return NextResponse.json(
          { error: 'No existing SOAP note to regenerate section from' },
          { status: 400 }
        );
      }

      const transcription = docpenSession.transcriptions
        .map((t: { speakerLabel: string | null; content: string }) => `[${t.speakerLabel}]: ${t.content}`)
        .join('\n\n');

      const newSectionContent = await regenerateSection(
        section as 'subjective' | 'objective' | 'assessment' | 'plan',
        {
          transcription,
          profession: docpenSession.profession as any,
          existingNote: {
            subjective: existingNote.subjective || '',
            objective: existingNote.objective || '',
            assessment: existingNote.assessment || '',
            plan: existingNote.plan || '',
            additionalNotes: existingNote.additionalNotes || undefined,
            processingTime: existingNote.processingTime || 0,
            model: existingNote.aiModel || 'gpt-4o',
            promptVersion: existingNote.promptVersion || 'v1.0',
          },
          feedback,
        }
      );

      // Create new version with updated section
      await prisma.docpenSOAPNote.updateMany({
        where: { sessionId, isCurrentVersion: true },
        data: { isCurrentVersion: false },
      });

      const newNote = await prisma.docpenSOAPNote.create({
        data: {
          sessionId,
          version: existingNote.version + 1,
          subjective: section === 'subjective' ? newSectionContent : existingNote.subjective,
          objective: section === 'objective' ? newSectionContent : existingNote.objective,
          assessment: section === 'assessment' ? newSectionContent : existingNote.assessment,
          plan: section === 'plan' ? newSectionContent : existingNote.plan,
          additionalNotes: existingNote.additionalNotes,
          aiModel: existingNote.aiModel,
          promptVersion: existingNote.promptVersion,
          editedByUser: true,
          isCurrentVersion: true,
        },
      });

      return NextResponse.json({ soapNote: newNote });
    }

    // Don't regenerate if already exists and not forcing
    if (docpenSession.soapNotes.length > 0 && !regenerate) {
      return NextResponse.json({ 
        soapNote: docpenSession.soapNotes[0],
        message: 'SOAP note already exists. Set regenerate=true to create a new version.',
      });
    }

    // Build patient history from lead notes
    const patientHistory = docpenSession.lead?.notes
      ?.map((note: { createdAt: Date; content: string }) => `[${note.createdAt.toLocaleDateString()}]: ${note.content}`)
      .join('\n') || undefined;

    // Generate SOAP note
    const soapNote = await generateSOAPNote({
      segments: docpenSession.transcriptions.map((t: { speakerRole: string; speakerLabel: string | null; content: string; startTime: number; endTime: number; confidence: number | null }) => ({
        speakerRole: t.speakerRole as any,
        speakerLabel: t.speakerLabel || undefined,
        content: t.content,
        startTime: t.startTime,
        endTime: t.endTime,
        confidence: t.confidence || undefined,
      })),
      profession: docpenSession.profession as any,
      customProfession: docpenSession.customProfession || undefined,
      patientName: docpenSession.patientName || docpenSession.lead?.contactPerson || undefined,
      chiefComplaint: docpenSession.chiefComplaint || undefined,
      patientHistory,
    });

    // Mark previous versions as not current
    if (docpenSession.soapNotes.length > 0) {
      await prisma.docpenSOAPNote.updateMany({
        where: { sessionId, isCurrentVersion: true },
        data: { isCurrentVersion: false },
      });
    }

    // Save new SOAP note
    const savedNote = await prisma.docpenSOAPNote.create({
      data: {
        sessionId,
        version: (docpenSession.soapNotes[0]?.version || 0) + 1,
        subjective: soapNote.subjective,
        objective: soapNote.objective,
        assessment: soapNote.assessment,
        plan: soapNote.plan,
        additionalNotes: soapNote.additionalNotes,
        aiModel: soapNote.model,
        processingTime: soapNote.processingTime,
        promptVersion: soapNote.promptVersion,
        isCurrentVersion: true,
      },
    });

    // Update session status
    await prisma.docpenSession.update({
      where: { id: sessionId },
      data: {
        soapNoteGenerated: true,
        status: 'REVIEW_PENDING',
      },
    });

    // Log audit entry
    console.log('[Docpen Audit]', sanitizeForLogging(
      createAuditLogEntry('create', 'soap_note', savedNote.id, session.user.id, request)
    ));

    return NextResponse.json({ soapNote: savedNote });
  } catch (error) {
    console.error('[Docpen SOAP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SOAP note' },
      { status: 500 }
    );
  }
}
