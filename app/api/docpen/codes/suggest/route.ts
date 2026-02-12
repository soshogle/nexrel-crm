/**
 * POST /api/docpen/codes/suggest
 * Suggests ICD-10 and CDT codes from SOAP note text
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chatCompletion } from '@/lib/openai-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { noteText, profession = 'GENERAL_PRACTICE' } = body;

    if (!noteText || typeof noteText !== 'string') {
      return NextResponse.json({ error: 'noteText required' }, { status: 400 });
    }

    const isDental = ['DENTIST', 'ORTHODONTIC'].includes(profession);

    const prompt = isDental
      ? `Analyze this clinical note and suggest relevant CDT (dental) codes. Return a JSON array of objects with: code, description, section (e.g., diagnostic, preventive, restorative).
Common CDT codes: D0120 (periodic exam), D0150 (comprehensive), D0330 (Pano), D1110 (prophy adult), D2391 (resin 1-surf), D2740 (crown), D7240 (extraction), D8080 (comprehensive ortho), D8090 (limited ortho), D8690 (retention).

Note text:
${noteText.substring(0, 4000)}

Return ONLY valid JSON array, no other text. Example: [{"code":"D0120","description":"Periodic oral evaluation","section":"diagnostic"}]`
      : `Analyze this clinical note and suggest relevant ICD-10 diagnosis codes. Return a JSON array of objects with: code, description.
Note text:
${noteText.substring(0, 4000)}

Return ONLY valid JSON array, no other text. Example: [{"code":"K02.51","description":"Dental caries on smooth surface"}]`;

    const result = await chatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a medical coding assistant. Return only valid JSON arrays.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const content = result.content?.trim() || '[]';
    let codes: { code: string; description: string; section?: string }[] = [];
    try {
      const parsed = JSON.parse(content.replace(/^```json?\s*|\s*```$/g, ''));
      codes = Array.isArray(parsed) ? parsed : [];
    } catch {
      codes = [];
    }

    return NextResponse.json({
      codes,
      type: isDental ? 'cdt' : 'icd10',
    });
  } catch (error: any) {
    console.error('[Docpen Code Suggest]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest codes' },
      { status: 500 }
    );
  }
}
