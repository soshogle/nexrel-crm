/**
 * GET /api/ehr-bridge/mappings
 * Return EHR field mappings for extension (no auth required - public config)
 */

import { NextResponse } from 'next/server';
import { EHR_MAPPINGS } from '@/lib/ehr-bridge/mappings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    mappings: EHR_MAPPINGS.map((m) => ({
      ehrType: m.ehrType,
      displayName: m.displayName,
      urlPatterns: m.urlPatterns,
      fields: m.fields,
      read: m.read,
    })),
  });
}
