/**
 * Periodontal Probe Import API
 * Probe software (Florida Probe, PerioPal, etc.) pushes measurements here.
 * Auth: Bearer token (PERIODONTAL_PROBE_API_KEY)
 * Patient matching: leadId, patientId, or patientName + userId
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validate measurements shape: { "1": { mesial: { pd, bop? }, buccal, distal, lingual }, ... }
function validateMeasurements(m: unknown): m is Record<string, Record<string, { pd?: number; bop?: boolean; recession?: number; mobility?: number }>> {
  if (!m || typeof m !== 'object') return false;
  for (const [tooth, sites] of Object.entries(m)) {
    const toothNum = parseInt(tooth, 10);
    if (isNaN(toothNum) || toothNum < 1 || toothNum > 32) return false;
    if (!sites || typeof sites !== 'object') return false;
    for (const [site, data] of Object.entries(sites as Record<string, unknown>)) {
      if (!['mesial', 'buccal', 'distal', 'lingual'].includes(site)) return false;
      if (data && typeof data === 'object' && 'pd' in data && typeof (data as any).pd !== 'number') return false;
    }
  }
  return true;
}

// Find lead by various identifiers
async function findLead(userId: string, body: {
  leadId?: string;
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
}) {
  const { leadId, patientId, patientName, patientEmail } = body;

  // 1. Direct leadId (our CRM id)
  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    });
    if (lead) return lead;
  }

  // 2. patientId - probe software may use our leadId or their chart number
  if (patientId) {
    const lead = await prisma.lead.findFirst({
      where: { id: patientId, userId },
    });
    if (lead) return lead;
  }

  // 3. patientName - match contactPerson or businessName (case-insensitive, trimmed)
  if (patientName && patientName.trim()) {
    const name = patientName.trim();
    const lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { equals: name, mode: 'insensitive' } },
          { businessName: { equals: name, mode: 'insensitive' } },
          { contactPerson: { contains: name, mode: 'insensitive' } },
          { businessName: { contains: name, mode: 'insensitive' } },
        ],
      },
    });
    if (lead) return lead;
  }

  // 4. patientEmail
  if (patientEmail && patientEmail.trim()) {
    const lead = await prisma.lead.findFirst({
      where: {
        userId,
        email: { equals: patientEmail.trim(), mode: 'insensitive' },
      },
    });
    if (lead) return lead;
  }

  return null;
}

// POST /api/dental/periodontal/import - Probe software pushes data here
export async function POST(request: NextRequest) {
  try {
    // Auth: Bearer token (same pattern as DICOM webhook)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.PERIODONTAL_PROBE_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return apiErrors.unauthorized('Invalid or missing API key');
    }

    const body = await request.json();
    const {
      userId,
      leadId,
      patientId,
      patientName,
      patientEmail,
      measurements,
      notes,
      chartDate,
      clinicId,
      source = 'probe',
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required (practice owner)' },
        { status: 400 }
      );
    }

    if (!measurements || !validateMeasurements(measurements)) {
      return NextResponse.json(
        { success: false, error: 'measurements required: { "1": { mesial: { pd, bop? }, buccal, distal, lingual }, ... } for teeth 1-32' },
        { status: 400 }
      );
    }

    const lead = await findLead(userId, {
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
          hint: 'Provide leadId, patientId, patientName, or patientEmail that matches a patient in your practice',
        },
        { status: 404 }
      );
    }

    const createData: any = {
      leadId: lead.id,
      userId,
      measurements,
      notes: notes || null,
      chartDate: chartDate ? new Date(chartDate) : new Date(),
      chartedBy: userId,
    };
    if (clinicId) {
      createData.clinicId = clinicId;
    }

    const chart = await prisma.dentalPeriodontalChart.create({
      data: createData,
    });

    return NextResponse.json({
      success: true,
      chart: {
        id: chart.id,
        leadId: chart.leadId,
        chartDate: chart.chartDate,
        source,
      },
    });
  } catch (error: any) {
    console.error('[Periodontal Import] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
