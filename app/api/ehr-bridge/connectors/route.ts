/**
 * GET /api/ehr-bridge/connectors
 * List available EHR API connectors (REST, FHIR) for direct integration
 * Requires auth when used from CRM
 */

import { NextResponse } from 'next/server';
import { EHR_API_CONNECTORS } from '@/lib/ehr-bridge/connectors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const connectors = EHR_API_CONNECTORS.map((c) => ({
    id: c.id,
    ehrType: c.ehrType,
    displayName: c.displayName,
    type: c.type,
    auth: c.auth,
    hasEndpoints: !!c.endpoints?.appointments || !!c.endpoints?.schedule,
    docs: c.docs,
  }));
  return NextResponse.json({ connectors });
}
