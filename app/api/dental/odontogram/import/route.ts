/**
 * Odontogram Import API
 * Charting software, scanners, etc. push toothData here.
 * Auth: Bearer token (ODONTOGRAM_IMPORT_API_KEY or PERIODONTAL_PROBE_API_KEY)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateToothData,
  findLeadForImport,
  upsertOdontogram,
} from '@/lib/dental/odontogram-import';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/odontogram/import
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey =
      process.env.ODONTOGRAM_IMPORT_API_KEY || process.env.PERIODONTAL_PROBE_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ success: false, error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      leadId,
      patientId,
      patientName,
      patientEmail,
      toothData,
      notes,
      chartDate,
      clinicId,
      source = 'import',
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required (practice owner)' },
        { status: 400 }
      );
    }

    if (!toothData || !validateToothData(toothData)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'toothData required: { "1": { condition?, treatment?, completed?, date?, notes? }, ... } for teeth 1-32',
        },
        { status: 400 }
      );
    }

    const lead = await findLeadForImport(userId, {
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

    const odontogram = await upsertOdontogram({
      leadId: lead.id,
      userId,
      toothData,
      notes,
      clinicId,
      chartedBy: userId,
    });

    return NextResponse.json({
      success: true,
      odontogram: {
        id: odontogram.id,
        leadId: odontogram.leadId,
        chartDate: odontogram.chartDate,
        source,
      },
    });
  } catch (error: any) {
    console.error('[Odontogram Import] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
