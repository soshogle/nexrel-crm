/**
 * AI Docpen - Active Assistant API
 * 
 * Endpoints:
 * - POST: Process assistant queries (patient history, drug lookup, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processAssistantQuery, containsWakeWord, extractQueryAfterWakeWord } from '@/lib/docpen/assistant-service';
import { sanitizeForLogging, createAuditLogEntry } from '@/lib/docpen/security';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,
      queryType = 'medical_lookup',
      queryText,
      triggerMethod = 'text',
      timestamp,
    } = body;

    if (!queryText) {
      return NextResponse.json({ error: 'Query text is required' }, { status: 400 });
    }

    // Extract actual query if wake word is present
    let processedQueryText = queryText;
    let detectedTrigger = triggerMethod;

    if (containsWakeWord(queryText)) {
      const extracted = extractQueryAfterWakeWord(queryText);
      if (extracted) {
        processedQueryText = extracted;
        detectedTrigger = 'wake_word';
      }
    }

    // Validate query type
    const validQueryTypes = ['patient_history', 'drug_interaction', 'medical_lookup', 'feedback'];
    if (!validQueryTypes.includes(queryType)) {
      return NextResponse.json({ error: 'Invalid query type' }, { status: 400 });
    }

    // Get session context if provided
    let docpenSession = null;
    let currentTranscript = '';
    let leadId: string | undefined;
    let profession: any;

    if (sessionId) {
      docpenSession = await prisma.docpenSession.findFirst({
        where: {
          id: sessionId,
          userId: session.user.id,
        },
        include: {
          transcriptions: {
            orderBy: { startTime: 'asc' },
          },
        },
      });

      if (docpenSession) {
        leadId = docpenSession.leadId || undefined;
        profession = docpenSession.profession;
        currentTranscript = docpenSession.transcriptions
          .map((t: { speakerLabel: string | null; content: string }) => `[${t.speakerLabel}]: ${t.content}`)
          .join('\n');
      }
    }

    // Process the query
    const response = await processAssistantQuery(
      {
        queryType: queryType as any,
        queryText: processedQueryText,
        sessionId: sessionId || undefined,
        currentTranscript: currentTranscript || undefined,
      },
      {
        leadId,
        profession,
        userId: session.user.id,
      }
    );

    // Save query to database if session exists
    let savedQuery = null;
    if (sessionId && docpenSession) {
      savedQuery = await prisma.docpenAssistantQuery.create({
        data: {
          sessionId,
          queryType,
          queryText: processedQueryText,
          responseText: response.responseText,
          triggerMethod: detectedTrigger,
          timestamp: timestamp || null,
          sourcesCited: response.sources ? JSON.parse(JSON.stringify(response.sources)) : null,
        },
      });

      // Log audit entry
      console.log('[Docpen Audit]', sanitizeForLogging(
        createAuditLogEntry('create', 'session', savedQuery.id, session.user.id, request)
      ));
    }

    return NextResponse.json({
      success: true,
      response: response.responseText,
      sources: response.sources,
      queryId: savedQuery?.id,
    });
  } catch (error) {
    console.error('[Docpen Assistant] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
