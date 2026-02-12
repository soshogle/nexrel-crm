/**
 * POST /api/workflows/draft
 * Create a minimal workflow draft for live voice/chat creation (Phase 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true },
    });

    // Draft creation only for industries using WorkflowTemplate (not REAL_ESTATE)
    if (!user?.industry || user.industry === 'REAL_ESTATE') {
      return NextResponse.json(
        { error: 'Draft creation not available for this industry' },
        { status: 403 }
      );
    }

    const workflow = await prisma.workflowTemplate.create({
      data: {
        userId: session.user.id,
        industry: user.industry,
        name: 'New from conversation',
        type: 'CUSTOM',
        description: 'Workflow being created via voice or chat',
        isDefault: false,
        isActive: true,
        executionMode: 'WORKFLOW',
      },
      include: {
        tasks: true,
      },
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
    return NextResponse.json(
      { error: error?.message || 'Failed to create draft' },
      { status: 500 }
    );
  }
}
