/**
 * Run Professional AI Employee (Phase 4)
 * Creates daily check-in task for conversational employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeProfessionalEmployee } from '@/lib/ai-employees/run-professional-employee';
import { apiErrors } from '@/lib/api-error';
import type { ProfessionalAIEmployeeType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const { employeeType } = body as { employeeType?: string };

    if (!employeeType) return apiErrors.badRequest('employeeType required');

    const result = await executeProfessionalEmployee(
      session.user.id,
      employeeType as ProfessionalAIEmployeeType,
      { storeHistory: false }
    );

    return NextResponse.json({
      success: result.success,
      summary: result.summary,
      tasksCompleted: result.tasksCompleted,
      details: result.details,
    });
  } catch (e: any) {
    console.error('[professional run]', e);
    return apiErrors.internal(e?.message || 'Run failed');
  }
}
