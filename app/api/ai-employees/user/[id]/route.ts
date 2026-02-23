/**
 * User AI Team Employee API - Update and Delete single employee
 * PATCH: Update employee
 * DELETE: Remove employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const id = params.id;
    const body = await request.json();
    const { customName, voiceAgentId, voiceConfig, isActive } = body;

    const existing = await prisma.userAIEmployee.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound('Employee not found');
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
    return apiErrors.internal(error.message || 'Failed to update AI Team employee');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const id = params.id;

    const existing = await prisma.userAIEmployee.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound('Employee not found');
    }

    await prisma.userAIEmployee.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] DELETE /api/ai-employees/user/[id]:', error);
    return apiErrors.internal(error.message || 'Failed to delete AI Team employee');
  }
}
