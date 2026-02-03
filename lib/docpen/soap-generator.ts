/**
 * AI Docpen - SOAP Note Generator
 * 
 * Uses GPT-4o to generate professional SOAP notes from clinical transcriptions
 * with profession-specific formatting and terminology.
 */

import { getSOAPPrompt, DocpenProfessionType } from './prompts';
import { formatTranscriptionForSOAP, TranscriptionSegment } from './transcription-service';
import { chatCompletion } from '@/lib/openai-client';

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  additionalNotes?: string;
  processingTime: number;
  model: string;
  promptVersion: string;
}

/**
 * Generate a SOAP note from transcription segments
 */
export async function generateSOAPNote(params: {
  segments: TranscriptionSegment[];
  profession: DocpenProfessionType;
  customProfession?: string;
  patientName?: string;
  chiefComplaint?: string;
  patientHistory?: string;
}): Promise<SOAPNote> {
  const startTime = Date.now();

  // Format transcription for the prompt
  const transcription = formatTranscriptionForSOAP(params.segments);

  // Get profession-specific prompt
  const prompt = getSOAPPrompt({
    profession: params.profession,
    customProfession: params.customProfession,
    patientName: params.patientName,
    chiefComplaint: params.chiefComplaint,
    patientHistory: params.patientHistory,
    transcription,
  });

  // Call GPT-4o via OpenAI
  const result = await chatCompletion({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert medical documentation AI. Generate accurate, professional SOAP notes based on clinical conversation transcripts.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3, // Lower temperature for consistent, accurate output
    max_tokens: 4000,
  });

  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in API response');
  }

  // Parse the structured SOAP note from the response
  const soapNote = parseSOAPResponse(content);

  return {
    ...soapNote,
    processingTime: Date.now() - startTime,
    model: 'gpt-4o',
    promptVersion: 'v1.0',
  };
}

/**
 * Parse the LLM response into structured SOAP sections
 */
function parseSOAPResponse(content: string): Omit<SOAPNote, 'processingTime' | 'model' | 'promptVersion'> {
  const sections: Record<string, string> = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    additionalNotes: '',
  };

  // Try to find each section using common patterns
  const patterns = [
    { key: 'subjective', pattern: /\*\*SUBJECTIVE:\*\*\s*([\s\S]*?)(?=\*\*OBJECTIVE:|$)/i },
    { key: 'objective', pattern: /\*\*OBJECTIVE:\*\*\s*([\s\S]*?)(?=\*\*ASSESSMENT:|$)/i },
    { key: 'assessment', pattern: /\*\*ASSESSMENT:\*\*\s*([\s\S]*?)(?=\*\*PLAN:|$)/i },
    { key: 'plan', pattern: /\*\*PLAN:\*\*\s*([\s\S]*?)(?=\*\*ADDITIONAL|$)/i },
    { key: 'additionalNotes', pattern: /\*\*ADDITIONAL NOTES:\*\*\s*([\s\S]*?)$/i },
  ];

  for (const { key, pattern } of patterns) {
    const match = content.match(pattern);
    if (match) {
      sections[key] = match[1].trim();
    }
  }

  // Fallback: try simpler patterns without markdown
  if (!sections.subjective) {
    const altPatterns = [
      { key: 'subjective', pattern: /SUBJECTIVE:?\s*([\s\S]*?)(?=OBJECTIVE:|$)/i },
      { key: 'objective', pattern: /OBJECTIVE:?\s*([\s\S]*?)(?=ASSESSMENT:|$)/i },
      { key: 'assessment', pattern: /ASSESSMENT:?\s*([\s\S]*?)(?=PLAN:|$)/i },
      { key: 'plan', pattern: /PLAN:?\s*([\s\S]*?)(?=ADDITIONAL|$)/i },
    ];

    for (const { key, pattern } of altPatterns) {
      if (!sections[key]) {
        const match = content.match(pattern);
        if (match) {
          sections[key] = match[1].trim();
        }
      }
    }
  }

  return sections as Omit<SOAPNote, 'processingTime' | 'model' | 'promptVersion'>;
}

/**
 * Regenerate a specific section of the SOAP note
 */
export async function regenerateSection(
  section: 'subjective' | 'objective' | 'assessment' | 'plan',
  context: {
    transcription: string;
    profession: DocpenProfessionType;
    existingNote: SOAPNote;
    feedback?: string;
  }
): Promise<string> {
  const sectionNames: Record<string, string> = {
    subjective: 'SUBJECTIVE',
    objective: 'OBJECTIVE',
    assessment: 'ASSESSMENT',
    plan: 'PLAN',
  };

  const prompt = `You are regenerating the ${sectionNames[section]} section of a SOAP note.

Profession: ${context.profession}

Original Transcription:
${context.transcription}

Current ${sectionNames[section]} section:
${context.existingNote[section]}

${context.feedback ? `User Feedback: ${context.feedback}` : ''}

Please regenerate ONLY the ${sectionNames[section]} section with improvements. Return just the content for this section, without the header.`;

  const result = await chatCompletion({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return result.choices?.[0]?.message?.content?.trim() || '';
}
