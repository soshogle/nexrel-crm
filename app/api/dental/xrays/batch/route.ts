/**
 * Batch X-Ray Upload API
 * Handles multiple DICOM file uploads in a single request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DicomBatchProcessor } from '@/lib/dental/dicom-batch-processor';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/xrays/batch - Upload multiple X-rays
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const leadId = formData.get('leadId') as string;
    const userId = formData.get('userId') as string;
    const xrayType = formData.get('xrayType') as string;
    const dateTaken = formData.get('dateTaken') as string;
    const notes = formData.get('notes') as string;

    if (!files || files.length === 0) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    if (!leadId || !userId || !xrayType || !dateTaken) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    // Verify user owns the userId
    if (userId !== session.user.id) {
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    // Create batch job
    const batchFiles = files.map((file) => ({
      file,
      filename: file.name,
      mimeType: file.type,
      metadata: {
        leadId,
        userId,
        xrayType,
        dateTaken,
        notes: notes || undefined,
      },
    }));

    const jobId = DicomBatchProcessor.createJob(batchFiles);

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: `Processing ${files.length} file(s)...`,
      },
      { status: 202 } // Accepted
    );
  } catch (error) {
    console.error('Error creating batch job:', error);
    return apiErrors.internal(await t('api.uploadXrayFailed'));
  }
}

// GET /api/dental/xrays/batch/[jobId] - Get batch job status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    const job = DicomBatchProcessor.getJob(jobId);

    if (!job) {
      return apiErrors.notFound(await t('api.notFound'));
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching batch job:', error);
    return apiErrors.internal(await t('api.fetchXraysFailed'));
  }
}
