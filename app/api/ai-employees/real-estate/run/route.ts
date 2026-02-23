export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { executeREEmployee } from '@/lib/ai-employees/run-re-employee';
import type { REAIEmployeeType } from '@prisma/client';

// Main execution handler
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { employeeType } = body as { employeeType: REAIEmployeeType };

    if (!employeeType) {
      return apiErrors.badRequest('Employee type required');
    }

    const result = await executeREEmployee(session.user.id, employeeType, {
      storeHistory: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Employee execution error:', error);
    return apiErrors.internal('Execution failed');
  }
}

// GET - Fetch execution history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const employeeType = searchParams.get('employeeType');
    const limit = parseInt(searchParams.get('limit') || '20');

    const executions = await prisma.rEAIEmployeeExecution.findMany({
      where: {
        userId: session.user.id,
        ...(employeeType && { employeeType: employeeType as any })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('AI Employee history error:', error);
    return apiErrors.internal('Failed to fetch history');
  }
}
