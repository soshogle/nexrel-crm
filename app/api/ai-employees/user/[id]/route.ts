/**
 * User AI Team Employee API - Update and Delete single employee
 * PATCH: Update employee
 * DELETE: Remove employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const body = await request.json();
    const { customName, voiceAgentId, voiceConfig, isActive } = body;

    const existing = await prisma.userAIEmployee.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (customName !== undefined) updateData.customName = String(customName);
    if (voiceAgentId !== undefined) updateData.voiceAgentId = voiceAgentId || null;
    if (voiceConfig !== undefined) updateData.voiceConfig = voiceConfig && typeof voiceConfig === 'object' ? voiceConfig : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const employee = await prisma.userAIEmployee.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        profession: employee.profession,
        customName: employee.customName,
        voiceAgentId: employee.voiceAgentId,
        voiceConfig: employee.voiceConfig,
        isActive: employee.isActive,
        capabilities: employee.capabilities,
        createdAt: employee.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API] PATCH /api/ai-employees/user/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update AI Team employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;

    const existing = await prisma.userAIEmployee.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await prisma.userAIEmployee.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] DELETE /api/ai-employees/user/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete AI Team employee' },
      { status: 500 }
    );
  }
}
