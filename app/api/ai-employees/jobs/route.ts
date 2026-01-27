/**
 * API endpoint for managing AI employee jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiOrchestrator } from '@/lib/ai-employee-orchestrator';
import { AIJobStatus } from '@prisma/client';

// GET - List all jobs for user

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AIJobStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const workflowId = searchParams.get('workflowId') || undefined;

    const jobs = await aiOrchestrator.getUserJobs(session.user.id, {
      status: status || undefined,
      limit,
      workflowId
    });

    return NextResponse.json({
      success: true,
      data: jobs
    });

  } catch (error: any) {
    console.error('Jobs list API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
