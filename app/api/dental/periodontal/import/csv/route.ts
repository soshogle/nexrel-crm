/**
 * Periodontal Probe CSV Import API
 *
 * Accepts CSV file uploads from periodontal probe systems (Florida Probe,
 * ParoStatus, etc.) and converts them to our 4-site JSON format.
 *
 * Supports:
 *   - multipart/form-data with a "file" field (CSV)
 *   - 6-site format (MB, B, DB, ML, L, DL) → collapsed to 4 sites (M, B, D, L)
 *   - Patient matching by leadId, patientName, or patientEmail
 *
 * Auth: Bearer token (PERIODONTAL_PROBE_API_KEY) or session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { getCrmDb } from '@/lib/dal';
import { resolveDalContext } from '@/lib/context/industry-context';
import {
  parseFloridaProbeCSV,
  collapseTo4Sites,
} from '@/lib/dental/florida-probe-parser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Auth: session OR Bearer token
    let userId: string | null = null;

    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.PERIODONTAL_PROBE_API_KEY;

    if (authHeader?.startsWith('Bearer ') && apiKey) {
      if (authHeader !== `Bearer ${apiKey}`) {
        return NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401 });
      }
      // API key auth — userId must come from the form/body
    } else {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    const contentType = request.headers.get('content-type') || '';

    let csvContent: string;
    let leadId: string | undefined;
    let patientName: string | undefined;
    let patientEmail: string | undefined;
    let bodyUserId: string | undefined;
    let clinicId: string | undefined;
    let notes: string | undefined;
    let chartDate: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Missing "file" field — upload a CSV file from your probe system' },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
        return NextResponse.json(
          { success: false, error: `Unsupported file type: ${file.name}. Upload a .csv or .txt export from your probe system.` },
          { status: 400 }
        );
      }

      csvContent = await file.text();
      leadId = (formData.get('leadId') as string) || undefined;
      patientName = (formData.get('patientName') as string) || undefined;
      patientEmail = (formData.get('patientEmail') as string) || undefined;
      bodyUserId = (formData.get('userId') as string) || undefined;
      clinicId = (formData.get('clinicId') as string) || undefined;
      notes = (formData.get('notes') as string) || undefined;
      chartDate = (formData.get('chartDate') as string) || undefined;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      csvContent = body.csvContent;
      leadId = body.leadId;
      patientName = body.patientName;
      patientEmail = body.patientEmail;
      bodyUserId = body.userId;
      clinicId = body.clinicId;
      notes = body.notes;
      chartDate = body.chartDate;

      if (!csvContent) {
        return NextResponse.json(
          { success: false, error: 'Missing "csvContent" field in JSON body' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be multipart/form-data (file upload) or application/json' },
        { status: 400 }
      );
    }

    // Resolve userId and DB (industry-aware)
    const resolvedUserId = userId || bodyUserId;
    if (!resolvedUserId) {
      return NextResponse.json(
        { success: false, error: 'userId is required (from session or request body)' },
        { status: 400 }
      );
    }
    const session = await getServerSession(authOptions);
    const db = session?.user?.id
      ? getRouteDb(session)
      : getCrmDb(await resolveDalContext(resolvedUserId));

    // Parse CSV
    const rows = parseFloridaProbeCSV(csvContent);
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid measurements found in CSV. Expected columns: ToothNumber, Surface, ProbingDepth, etc.' },
        { status: 400 }
      );
    }

    // Collapse 6-site → 4-site
    const measurements = collapseTo4Sites(rows);
    const teethCount = Object.keys(measurements).length;

    // Try to extract patient info from CSV if not provided
    if (!patientName && rows.length > 0) {
      const firstRow = rows[0];
      const csvLines = csvContent.trim().split('\n');
      if (csvLines.length > 1) {
        const header = csvLines[0].split(',').map(h => h.trim());
        const firstDataCols = csvLines[1].split(',').map(c => c.trim());
        const lastNameIdx = header.indexOf('PatientLastName');
        const firstNameIdx = header.indexOf('PatientFirstName');
        if (lastNameIdx >= 0 && firstNameIdx >= 0) {
          patientName = `${firstDataCols[firstNameIdx]} ${firstDataCols[lastNameIdx]}`.trim();
        }
      }
    }

    // Find patient lead
    let lead: any = null;

    if (leadId) {
      lead = await db.lead.findFirst({ where: { id: leadId, userId: resolvedUserId } });
    }
    if (!lead && patientName?.trim()) {
      const name = patientName.trim();
      lead = await db.lead.findFirst({
        where: {
          userId: resolvedUserId,
          OR: [
            { contactPerson: { equals: name, mode: 'insensitive' } },
            { businessName: { equals: name, mode: 'insensitive' } },
            { contactPerson: { contains: name, mode: 'insensitive' } },
            { businessName: { contains: name, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (!lead && patientEmail?.trim()) {
      lead = await db.lead.findFirst({
        where: { userId: resolvedUserId, email: { equals: patientEmail.trim(), mode: 'insensitive' } },
      });
    }

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
          hint: 'Provide leadId, patientName, or patientEmail. The CSV PatientFirstName/PatientLastName columns are also used.',
          parsedPatientName: patientName,
          measurementsSummary: { teeth: teethCount, sites: rows.length },
        },
        { status: 404 }
      );
    }

    // Extract chart date from CSV if not provided
    let resolvedChartDate = chartDate ? new Date(chartDate) : new Date();
    if (!chartDate && rows.length > 0) {
      const csvLines = csvContent.trim().split('\n');
      if (csvLines.length > 1) {
        const header = csvLines[0].split(',').map(h => h.trim());
        const firstDataCols = csvLines[1].split(',').map(c => c.trim());
        const dateIdx = header.indexOf('ExamDate');
        if (dateIdx >= 0 && firstDataCols[dateIdx]) {
          const parsed = new Date(firstDataCols[dateIdx]);
          if (!isNaN(parsed.getTime())) {
            resolvedChartDate = parsed;
          }
        }
      }
    }

    // Store in database
    const createData: any = {
      leadId: lead.id,
      userId: resolvedUserId,
      measurements,
      notes: notes || `Imported from probe CSV — ${rows.length} site measurements across ${teethCount} teeth`,
      chartDate: resolvedChartDate,
      chartedBy: resolvedUserId,
    };
    if (clinicId) createData.clinicId = clinicId;

    const chart = await db.dentalPeriodontalChart.create({ data: createData });

    return NextResponse.json({
      success: true,
      chart: {
        id: chart.id,
        leadId: chart.leadId,
        chartDate: chart.chartDate,
        source: 'probe_csv',
      },
      summary: {
        teethMeasured: teethCount,
        siteMeasurements: rows.length,
        patientMatched: lead.contactPerson || lead.businessName,
      },
    });
  } catch (error: any) {
    console.error('[Periodontal CSV Import] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
