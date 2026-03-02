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
    const [agents, recentExecutions] = await Promise.all([
      prisma.rEAIEmployeeAgent.findMany({
        where: { userId: session.user.id },
        orderBy: [{ callCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.rEAIEmployeeExecution.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return NextResponse.json({ data: agents, recentExecutions });
  } catch (error) {
    console.error('RE AI employees GET error:', error);
    return apiErrors.internal('Failed to fetch AI employees');
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
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('RE AI employees POST error:', error);
    return apiErrors.internal('Failed to execute AI employee');
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
  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) {
      return apiErrors.badRequest('id required');
    }
    const existing = await prisma.rEAIEmployeeAgent.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      return apiErrors.notFound('AI employee not found');
    }
    const updated = await prisma.rEAIEmployeeAgent.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name || '') } : {}),
        ...(body.status !== undefined ? { status: String(body.status || '') } : {}),
        ...(body.twilioPhoneNumber !== undefined ? { twilioPhoneNumber: body.twilioPhoneNumber ? String(body.twilioPhoneNumber) : null } : {}),
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('RE AI employees PUT error:', error);
    return apiErrors.internal('Failed to update AI employee');
  }
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return apiErrors.badRequest('id required');
    }
    const existing = await prisma.rEAIEmployeeAgent.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      return apiErrors.notFound('AI employee not found');
    }
    await prisma.rEAIEmployeeAgent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RE AI employees DELETE error:', error);
    return apiErrors.internal('Failed to delete AI employee');
  }
}
