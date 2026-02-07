/**
 * DICOM Modality Worklist API
 * Returns scheduled studies for X-ray machines
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DicomWorklistService } from '@/lib/dental/dicom-worklist';
import { t } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/dicom/worklist - Get worklist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || startDate;
    const modality = searchParams.get('modality') || undefined;

    const worklist = await DicomWorklistService.queryWorklist(
      session.user.id,
      startDate,
      endDate,
      modality
    );

    return NextResponse.json({
      success: true,
      worklist,
      count: worklist.length,
    });
  } catch (error) {
    console.error('Error fetching worklist:', error);
    return NextResponse.json(
      { error: await t('api.fetchXraysFailed') },
      { status: 500 }
    );
  }
}
