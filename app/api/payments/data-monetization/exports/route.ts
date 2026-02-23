
/**
 * Data Export API
 * Handles data export requests and downloads
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';
import { DataExportFormat, DataExportStatus } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal('Failed to fetch exports', error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Missing required fields');
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
    return apiErrors.internal('Failed to request export', error.message);
  }
}
