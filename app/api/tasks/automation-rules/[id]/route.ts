import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// PUT /api/tasks/automation-rules/[id] - Update automation rule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json();

    // Verify ownership
    const existingRule = await getCrmDb(ctx).taskAutomation.findUnique({
      where: { id: params.id },
    });

    if (!existingRule || existingRule.userId !== ctx.userId) {
      return apiErrors.notFound('Rule not found');
    }

    const rule = await getCrmDb(ctx).taskAutomation.update({
      where: { id: params.id },
      data: {
        ...body,
        triggerConditions: body.triggerConditions || existingRule.triggerConditions,
        actionConfig: body.actionConfig || existingRule.actionConfig,
      },
    });

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error('Error updating automation rule:', error);
    return apiErrors.internal(error.message || 'Failed to update rule');
  }
}

// DELETE /api/tasks/automation-rules/[id] - Delete automation rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Verify ownership
    const existingRule = await getCrmDb(ctx).taskAutomation.findUnique({
      where: { id: params.id },
    });

    if (!existingRule || existingRule.userId !== ctx.userId) {
      return apiErrors.notFound('Rule not found');
    }

    await getCrmDb(ctx).taskAutomation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting automation rule:', error);
    return apiErrors.internal(error.message || 'Failed to delete rule');
  }
}
