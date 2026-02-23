/**
 * Industry AI Employee Run API
 * Triggers industry-specific AI employee tasks (e.g. appointment follow-up, recall)
 * Same pattern as RE run - executes workflow logic per employee type
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';
import { executeIndustryEmployee } from '@/lib/ai-employees/run-industry-employee';
import { shouldRunEmployee } from '@/lib/ai-employees/task-config-helper';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json().catch(() => ({}));
    const { industry, employeeType } = body as {
      industry?: string;
      employeeType?: string;
    };

    if (!industry || !employeeType) {
      return apiErrors.badRequest('Industry and employeeType required');
    }

    const okToRun = await shouldRunEmployee(
      session.user.id,
      'industry',
      industry as any,
      employeeType
    );
    if (!okToRun) {
      return NextResponse.json(
        { error: 'All tasks are disabled for this employee. Enable at least one task in Manage Tasks.' },
        { status: 400 }
      );
    }

    const result = await executeIndustryEmployee(
      session.user.id,
      industry as any,
      employeeType,
      { storeHistory: true }
    );

    if (!result.success && result.summary?.includes('does not have')) {
      return NextResponse.json(
        { error: result.summary },
        { status: 404 }
      );
    }

    if (!result.success && result.summary?.includes('Unknown')) {
      return NextResponse.json(
        { error: result.summary },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Industry AI Employee execution error:', error);
    return apiErrors.internal('Execution failed');
  }
}
