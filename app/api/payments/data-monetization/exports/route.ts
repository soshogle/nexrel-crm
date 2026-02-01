
/**
 * Data Export API
 * Handles data export requests and downloads
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';
import { DataExportFormat, DataExportStatus } from '@prisma/client';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as DataExportStatus | null;
    const exportType = searchParams.get('exportType');

    const filters: any = {};
    if (status) filters.status = status;
    if (exportType) filters.exportType = exportType;

    const exports = await dataMonetizationService.getExports(
      session.user.id,
      filters
    );

    return NextResponse.json({ exports });
  } catch (error: any) {
    console.error('Error fetching exports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exports', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      exportType,
      format,
      startDate,
      endDate,
      includeFields,
      excludeFields,
      filters,
      anonymized,
    } = body;

    if (!exportType || !format || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const exportRecord = await dataMonetizationService.requestExport({
      userId: session.user.id,
      exportType,
      format,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeFields,
      excludeFields,
      filters,
      anonymized,
    });

    return NextResponse.json({ export: exportRecord });
  } catch (error: any) {
    console.error('Error requesting export:', error);
    return NextResponse.json(
      { error: 'Failed to request export', details: error.message },
      { status: 500 }
    );
  }
}
