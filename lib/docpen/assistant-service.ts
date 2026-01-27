/**
 * AI Docpen - Active Assistant Service
 * 
 * Handles real-time queries during clinical sessions:
 * - Patient history lookup from CRM
 * - Drug interaction checks
 * - Medical reference lookups
 * - Session feedback
 */

import { getAssistantPrompt, DocpenProfessionType } from './prompts';
import { prisma } from '@/lib/db';

export interface AssistantQuery {
  queryType: 'patient_history' | 'drug_interaction' | 'medical_lookup' | 'feedback';
  queryText: string;
  sessionId?: string;
  currentTranscript?: string;
}

export interface AssistantResponse {
  responseText: string;
  sources?: Array<{
    type: string;
    title: string;
    url?: string;
  }>;
  confidence?: number;
}

/**
 * Process an active assistant query
 */
export async function processAssistantQuery(
  query: AssistantQuery,
  context: {
    leadId?: string;
    profession?: DocpenProfessionType;
    userId: string;
  }
): Promise<AssistantResponse> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY not configured');
  }

  // Get patient history if available and relevant
  let patientHistory = '';
  if (query.queryType === 'patient_history' && context.leadId) {
    patientHistory = await getPatientHistory(context.leadId, context.userId);
  }

  // Build the prompt
  const prompt = getAssistantPrompt(query.queryType, {
    queryText: query.queryText,
    currentTranscript: query.currentTranscript,
    patientHistory,
    profession: context.profession,
  });

  // Call GPT-4o
  const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Assistant API error: ${response.status}`);
  }

  const result = await response.json();
  const responseText = result.choices?.[0]?.message?.content || 'Unable to process query.';

  return {
    responseText,
    sources: extractSources(responseText),
  };
}

/**
 * Get patient history from CRM Lead record
 */
async function getPatientHistory(leadId: string, userId: string): Promise<string> {
  try {
    // Fetch lead with notes and previous sessions
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        userId: userId,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        docpenSessions: {
          where: {
            status: 'SIGNED',
          },
          orderBy: { sessionDate: 'desc' },
          take: 5,
          include: {
            soapNotes: {
              where: { isCurrentVersion: true },
            },
          },
        },
      },
    });

    if (!lead) {
      return 'No patient record found in CRM.';
    }

    const history: string[] = [];

    // Basic patient info
    history.push(`Patient: ${lead.businessName || lead.contactPerson || 'Unknown'}`);
    if (lead.email) history.push(`Email: ${lead.email}`);
    if (lead.phone) history.push(`Phone: ${lead.phone}`);

    // Previous notes
    if (lead.notes.length > 0) {
      history.push('\n## Previous Notes:');
      for (const note of lead.notes.slice(0, 5)) {
        history.push(`- [${note.createdAt.toLocaleDateString()}]: ${note.content.slice(0, 200)}...`);
      }
    }

    // Previous signed sessions
    if (lead.docpenSessions.length > 0) {
      history.push('\n## Previous Consultations:');
      for (const session of lead.docpenSessions) {
        const soapNote = session.soapNotes[0];
        if (soapNote) {
          history.push(`\n### Session: ${session.sessionDate.toLocaleDateString()}`);
          if (soapNote.assessment) {
            history.push(`Assessment: ${soapNote.assessment.slice(0, 300)}...`);
          }
          if (soapNote.plan) {
            history.push(`Plan: ${soapNote.plan.slice(0, 300)}...`);
          }
        }
      }
    }

    return history.join('\n');
  } catch (error) {
    console.error('Error fetching patient history:', error);
    return 'Error accessing patient records.';
  }
}

/**
 * Extract source citations from response
 */
function extractSources(text: string): Array<{ type: string; title: string; url?: string }> {
  const sources: Array<{ type: string; title: string; url?: string }> = [];

  // Check for FDA mentions
  if (/FDA|drug interaction/i.test(text)) {
    sources.push({
      type: 'reference',
      title: 'FDA Drug Safety Information',
      url: 'https://www.fda.gov/drugs/drug-safety-and-availability',
    });
  }

  // Check for clinical guideline mentions
  if (/guideline|recommendation|standard of care/i.test(text)) {
    sources.push({
      type: 'guideline',
      title: 'Clinical Practice Guidelines',
    });
  }

  // Check for patient record references
  if (/previous (visit|consultation|session)|patient record/i.test(text)) {
    sources.push({
      type: 'crm',
      title: 'Patient Record (CRM)',
    });
  }

  return sources;
}

/**
 * Wake word detection patterns for "Docpen"
 */
export const WAKE_WORD_PATTERNS = [
  /\bdoc\s*pen\b/i,
  /\bdock\s*pen\b/i,
  /\bhey\s*doc\s*pen\b/i,
  /\bokay?\s*doc\s*pen\b/i,
];

/**
 * Check if text contains the wake word
 */
export function containsWakeWord(text: string): boolean {
  return WAKE_WORD_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extract query after wake word
 */
export function extractQueryAfterWakeWord(text: string): string | null {
  for (const pattern of WAKE_WORD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return text.slice(match.index! + match[0].length).trim();
    }
  }
  return null;
}
