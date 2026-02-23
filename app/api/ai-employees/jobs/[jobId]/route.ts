/**
 * API endpoint for individual job status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiOrchestrator } from '@/lib/ai-employee-orchestrator';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const job = await aiOrchestrator.getJobStatus(params.jobId);

    if (!job) {
      return apiErrors.notFound('Job not found');
    }

    if (job.userId !== session.user.id) {
      return apiErrors.forbidden('Unauthorized');
    }

    return NextResponse.json({
      success: true,
      data: job
    });

  } catch (error: any) {
    console.error('Job status API error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch job status');
  }
}
