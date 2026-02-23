/**
 * DICOM Import API (C-MOVE)
 * Import studies from remote DICOM systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DicomServerService } from '@/lib/dental/dicom-server';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/dicom/import - Import study from remote DICOM system
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const body = await request.json();
    const { studyInstanceUid, leadId } = body;

    if (!studyInstanceUid || !leadId) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    // Import study
    await DicomServerService.importStudy(
      studyInstanceUid,
      leadId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Study imported successfully',
    });
  } catch (error) {
    console.error('Error importing study:', error);
    return apiErrors.internal(await t('api.uploadXrayFailed'));
  }
}
