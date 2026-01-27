/**
 * AI Docpen - Transcription Service with Speaker Diarization
 * 
 * Uses OpenAI Whisper for STT with post-processing for speaker identification.
 * Designed for HIPAA-compliant, zero-retention audio processing.
 */

import { DocpenSpeakerRole } from './types';

export interface TranscriptionSegment {
  speakerRole: DocpenSpeakerRole;
  speakerLabel?: string;
  content: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  fullText: string;
  duration: number;
  language?: string;
}

// Simple speaker detection patterns for medical conversations
const PRACTITIONER_PATTERNS = [
  /\b(doctor|physician|dr\.|nurse|therapist|dentist|optometrist)\b/i,
  /\b(let me|I'll|I'm going to|we'll|we need to)\b/i,
  /\b(examination|diagnosis|prescribe|treatment|medication|referral)\b/i,
  /\b(look at|check|assess|evaluate|measure|test)\b/i,
  /\b(your (blood pressure|heart rate|temperature|vision|teeth))\b/i,
];

const PATIENT_PATTERNS = [
  /\b(I feel|I have|I've been|my (pain|problem|issue))\b/i,
  /\b(hurts|aches|bothers|worries me)\b/i,
  /\b(started (yesterday|last week|recently))\b/i,
  /\b(is it serious|what does that mean|should I)\b/i,
];

/**
 * Classify speaker role based on content analysis
 */
function classifySpeakerRole(text: string, previousRole?: DocpenSpeakerRole): DocpenSpeakerRole {
  let practitionerScore = 0;
  let patientScore = 0;

  for (const pattern of PRACTITIONER_PATTERNS) {
    if (pattern.test(text)) practitionerScore++;
  }

  for (const pattern of PATIENT_PATTERNS) {
    if (pattern.test(text)) patientScore++;
  }

  // If clear winner, return that role
  if (practitionerScore > patientScore + 1) return 'PRACTITIONER';
  if (patientScore > practitionerScore + 1) return 'PATIENT';

  // If scores are close, alternate from previous or default to practitioner
  if (previousRole === 'PRACTITIONER') return 'PATIENT';
  if (previousRole === 'PATIENT') return 'PRACTITIONER';

  // Question patterns often indicate practitioner
  if (/^(how|what|when|where|do you|are you|have you|can you)\b/i.test(text.trim())) {
    return 'PRACTITIONER';
  }

  return 'PRACTITIONER'; // Default for first segment
}

/**
 * Process Whisper transcription output into speaker-segmented format
 * Whisper provides word-level timestamps which we use for segmentation
 */
export function processWhisperOutput(
  whisperResponse: any,
  practitionerName?: string
): TranscriptionResult {
  const segments: TranscriptionSegment[] = [];
  let currentSegment: Partial<TranscriptionSegment> = {};
  let previousRole: DocpenSpeakerRole | undefined;

  // Handle both verbose_json format with segments and simple text format
  if (whisperResponse.segments) {
    // Verbose JSON format with segments
    for (const seg of whisperResponse.segments) {
      const role = classifySpeakerRole(seg.text, previousRole);
      
      segments.push({
        speakerRole: role,
        speakerLabel: role === 'PRACTITIONER' ? (practitionerName || 'Practitioner') : 'Patient',
        content: seg.text.trim(),
        startTime: seg.start,
        endTime: seg.end,
        confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : undefined,
      });

      previousRole = role;
    }
  } else if (whisperResponse.text) {
    // Simple text format - split by sentences and classify
    const sentences = whisperResponse.text.split(/(?<=[.!?])\s+/);
    let currentTime = 0;
    const avgDuration = (whisperResponse.duration || 60) / sentences.length;

    for (const sentence of sentences) {
      if (!sentence.trim()) continue;

      const role = classifySpeakerRole(sentence, previousRole);
      
      segments.push({
        speakerRole: role,
        speakerLabel: role === 'PRACTITIONER' ? (practitionerName || 'Practitioner') : 'Patient',
        content: sentence.trim(),
        startTime: currentTime,
        endTime: currentTime + avgDuration,
      });

      currentTime += avgDuration;
      previousRole = role;
    }
  }

  // Merge consecutive segments from same speaker
  const mergedSegments = mergeConsecutiveSegments(segments);

  return {
    segments: mergedSegments,
    fullText: mergedSegments.map(s => `${s.speakerLabel}: ${s.content}`).join('\n\n'),
    duration: whisperResponse.duration || 0,
    language: whisperResponse.language,
  };
}

/**
 * Merge consecutive segments from the same speaker
 */
function mergeConsecutiveSegments(segments: TranscriptionSegment[]): TranscriptionSegment[] {
  if (segments.length === 0) return [];

  const merged: TranscriptionSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    
    if (seg.speakerRole === current.speakerRole) {
      // Merge with current
      current.content += ' ' + seg.content;
      current.endTime = seg.endTime;
    } else {
      // Push current and start new
      merged.push(current as TranscriptionSegment);
      current = { ...seg };
    }
  }

  // Don't forget the last segment
  merged.push(current as TranscriptionSegment);

  return merged;
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer | Blob,
  options: {
    practitionerName?: string;
    language?: string;
  } = {}
): Promise<TranscriptionResult> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Abacus AI API key not configured. Please initialize LLM APIs.');
  }

  // Create form data for file upload
  const formData = new FormData();
  
  // Handle both Buffer and Blob
  if (Buffer.isBuffer(audioBuffer)) {
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'recording.webm');
  } else {
    formData.append('file', audioBuffer, 'recording.webm');
  }
  
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  
  if (options.language) {
    formData.append('language', options.language);
  }

  // Use Abacus AI RouteLLM API endpoint
  const response = await fetch('https://routellm.abacus.ai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Docpen Transcription] API error:', error);
    throw new Error(`Transcription API error: ${response.status} - ${error}`);
  }

  const whisperResult = await response.json();
  
  return processWhisperOutput(whisperResult, options.practitionerName);
}

/**
 * Format transcription for SOAP note generation
 */
export function formatTranscriptionForSOAP(segments: TranscriptionSegment[]): string {
  return segments
    .map(seg => `[${seg.speakerLabel}]: ${seg.content}`)
    .join('\n\n');
}
