/**
 * POST /api/workflows/draft
 * Create a minimal workflow draft for live voice/chat creation (Phase 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { workflowTemplateService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const user = await getCrmDb(ctx).user.findUnique({
      where: { id: ctx.userId },
      select: { industry: true },
    });

    // Draft creation only for industries using WorkflowTemplate (not REAL_ESTATE)
    if (!user?.industry || user.industry === 'REAL_ESTATE') {
      return apiErrors.forbidden('Draft creation not available for this industry');
    }

    const workflow = await workflowTemplateService.create(ctx, {
      industry: user.industry as any,
      name: 'New from conversation',
      type: 'CUSTOM',
      description: 'Workflow being created via voice or chat',
      isDefault: false,
      isActive: true,
      executionMode: 'WORKFLOW',
    });

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        createdAt: workflow.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[workflows/draft] Error:', error);
    return apiErrors.internal(error?.message || 'Failed to create draft');
  }
}
