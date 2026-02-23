/**
 * DICOM Performance Metrics API
 * Returns performance statistics for DICOM operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DicomPerformanceMonitor } from '@/lib/dental/dicom-performance';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/xrays/performance - Get performance metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation') || undefined;

    const stats = DicomPerformanceMonitor.getStats(operation);
    const metrics = DicomPerformanceMonitor.getMetrics();

    return NextResponse.json({
      stats,
      metrics,
      operation,
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return apiErrors.internal(await t('api.fetchXraysFailed'));
  }
}
