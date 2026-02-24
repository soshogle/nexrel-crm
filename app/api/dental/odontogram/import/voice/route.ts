/**
 * Odontogram Voice Import API
 * Fallback when direct import is down. Parses clinician dictation into toothData.
 * Auth: Bearer token (ODONTOGRAM_IMPORT_API_KEY) or session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import {
  validateToothData,
  findLeadForImport,
  upsertOdontogram,
  type ToothData,
} from '@/lib/dental/odontogram-import';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY required for voice import');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

const TOOTH_DATA_SCHEMA = `JSON object: { "1": { "condition": "caries|crown|filling|implant|missing|extraction|root_canal", "treatment": "string", "completed": boolean }, ... }
Keys are tooth numbers 1-32. Only include teeth mentioned. Use Universal Numbering System.`;

async function parseTranscriptToToothData(transcript: string): Promise<ToothData> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a dental charting assistant. Parse the clinician's dictation into structured tooth data.
Output ONLY valid JSON, no markdown or explanation. Format: ${TOOTH_DATA_SCHEMA}
Conditions: caries, crown, filling, implant, missing, extraction, root_canal.
Examples: "tooth 14 crown" -> {"14":{"condition":"crown","treatment":"Crown","completed":false}}
"teeth 29 and 30 implants" -> {"29":{"condition":"implant","treatment":"Implant","completed":true},"30":{"condition":"implant","treatment":"Implant","completed":true}}`,
      },
      {
        role: 'user',
        content: transcript,
      },
    ],
    max_tokens: 1000,
  });

  const text = completion.choices[0]?.message?.content?.trim() || '{}';
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned) as ToothData;
  return parsed;
}

// POST /api/dental/odontogram/import/voice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get('authorization');
    const apiKey =
      process.env.ODONTOGRAM_IMPORT_API_KEY || process.env.PERIODONTAL_PROBE_API_KEY;

    const body = await request.json();
    const {
      userId: bodyUserId,
      transcript,
      leadId,
      patientId,
      patientName,
      patientEmail,
      merge = true,
      clinicId,
    } = body;

    const isSessionAuth = !!session?.user?.id;
    const isApiKeyAuth = apiKey && authHeader === `Bearer ${apiKey}`;

    if (!isSessionAuth && !isApiKeyAuth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: session or API key required' },
        { status: 401 }
      );
    }

    const effectiveUserId = session?.user?.id || bodyUserId;
    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: 'userId required in body when using API key (no session)' },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'transcript required (e.g. "tooth 14 crown, tooth 3 filling")' },
        { status: 400 }
      );
    }

    const toothData = await parseTranscriptToToothData(transcript.trim());
    if (!validateToothData(toothData) || Object.keys(toothData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not parse tooth data from transcript' },
        { status: 400 }
      );
    }

    const lead = await findLeadForImport(effectiveUserId, {
      leadId,
      patientId,
      patientName,
      patientEmail,
    });

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
          hint: 'Provide leadId, patientId, patientName, or patientEmail',
        },
        { status: 404 }
      );
    }

    let finalToothData: ToothData = toothData;
    if (merge) {
      const existing = await prisma.dentalOdontogram.findFirst({
        where: { leadId: lead.id, userId: effectiveUserId },
        orderBy: { chartDate: 'desc' },
      });
      const existingData = (existing?.toothData as ToothData) || {};
      finalToothData = { ...existingData, ...toothData };
    }

    const odontogram = await upsertOdontogram({
      leadId: lead.id,
      userId: effectiveUserId,
      toothData: finalToothData,
      notes: `Voice import: "${transcript.slice(0, 80)}..."`,
      clinicId,
      chartedBy: effectiveUserId,
    });

    return NextResponse.json({
      success: true,
      odontogram: {
        id: odontogram.id,
        leadId: odontogram.leadId,
        chartDate: odontogram.chartDate,
        source: 'voice',
        parsedTeeth: Object.keys(toothData),
      },
    });
  } catch (error: any) {
    console.error('[Odontogram Voice Import] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
