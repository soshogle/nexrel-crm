export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { executeREEmployee } from '@/lib/ai-employees/run-re-employee';
import { shouldRunEmployee } from '@/lib/ai-employees/task-config-helper';
import type { REAIEmployeeType } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ data: [], message: 'RE feature initializing...' });
  }
  try {
    const { searchParams } = new URL(request.url);
    const employeeType = searchParams.get('employeeType');
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
    const executions = await prisma.rEAIEmployeeExecution.findMany({
      where: {
        userId: session.user.id,
        ...(employeeType ? { employeeType: employeeType as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return NextResponse.json({ data: executions });
  } catch (error) {
    console.error('RE AI execute GET error:', error);
    return apiErrors.internal('Failed to fetch execution history');
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  try {
    const body = await request.json();
    const employeeType = body.employeeType as REAIEmployeeType | undefined;
    if (!employeeType) {
      return apiErrors.badRequest('employeeType required');
    }
    const okToRun = await shouldRunEmployee(session.user.id, 're', null, employeeType);
    if (!okToRun) {
      return apiErrors.badRequest('All tasks are disabled for this employee');
    }
    const result = await executeREEmployee(session.user.id, employeeType, { storeHistory: true });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('RE AI execute POST error:', error);
    return apiErrors.internal('Execution failed');
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Use POST to execute and GET for history', message: 'Use POST to execute and GET for history' },
    { status: 405 }
  );
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'Execution history cannot be deleted here', message: 'Execution history cannot be deleted here' },
    { status: 405 }
  );
}
