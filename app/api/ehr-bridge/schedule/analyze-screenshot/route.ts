/**
 * POST /api/ehr-bridge/schedule/analyze-screenshot
 * Receive screenshot from extension, extract availability via Vision API
 * Requires: Authorization: Bearer <extension_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyToken(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !token.startsWith('ehr_')) return null;

  const apiKeys = await prisma.apiKey.findMany({
    where: { service: 'ehr_bridge', keyName: 'extension_token', isActive: true },
  });
  for (const key of apiKeys) {
    try {
      const parsed = JSON.parse(key.keyValue) as { token: string; expiresAt: string };
      if (parsed.token === token && new Date(parsed.expiresAt) >= new Date()) {
        return { userId: key.userId };
      }
    } catch {
      continue;
    }
  }
  return null;
}

const VISION_PROMPT = `You are analyzing a screenshot of a dental/medical EHR schedule or calendar view.
Extract the following and return ONLY valid JSON (no markdown, no extra text):

{
  "date": "YYYY-MM-DD" (the date this schedule shows, or today if unclear),
  "slots": ["09:00", "09:30", "10:00", ...] (available/open time slots - empty or minimal text),
  "booked": [{ "time": "10:30", "patient": "John Doe" }, ...] (booked appointments with time and patient name)
}

Rules:
- Only include times that appear to be OPEN/available (empty slots, no patient name)
- For booked, include times that have a patient name or appointment
- Use 24h or 12h format consistently (e.g. "09:00" or "9:00 AM")
- If you cannot determine availability, return empty slots array
- date must be a valid date string`;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { imageBase64, ehrType = 'generic', captureDate } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
    }

    const openai = new OpenAI({ apiKey });
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: VISION_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
    });

    const raw = visionResponse.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: 'No response from Vision API' }, { status: 502 });
    }

    let parsed: { date?: string; slots?: string[]; booked?: { time: string; patient: string }[] };
    try {
      const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      return NextResponse.json({ error: 'Failed to parse Vision API response' }, { status: 502 });
    }

    const dateStr = parsed.date || new Date().toISOString().slice(0, 10);
    const captureDateObj = captureDate ? new Date(captureDate) : new Date(dateStr);
    const availability = {
      slots: Array.isArray(parsed.slots) ? parsed.slots : [],
      booked: Array.isArray(parsed.booked) ? parsed.booked : [],
      date: dateStr,
    };

    await prisma.ehrScheduleSnapshot.create({
      data: {
        userId: auth.userId,
        ehrType,
        captureDate: captureDateObj,
        availability,
        source: 'screenshot',
      },
    });

    return NextResponse.json({
      success: true,
      date: dateStr,
      slots: availability.slots,
      bookedCount: availability.booked.length,
      message: `Captured ${availability.slots.length} available slots`,
    });
  } catch (error) {
    console.error('[EHR Bridge] Analyze screenshot failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analyze failed' },
      { status: 500 }
    );
  }
}
