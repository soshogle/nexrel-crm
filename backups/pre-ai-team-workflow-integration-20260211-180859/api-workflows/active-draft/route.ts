/**
 * GET /api/workflows/active-draft - Get current active draft
 * POST /api/workflows/active-draft - Set or clear the user's active workflow draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeWorkflowDraftId: true },
    });
    return NextResponse.json({ success: true, draftId: user?.activeWorkflowDraftId || null });
  } catch (error: any) {
    console.error('[workflows/active-draft] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get active draft' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { draftId } = body;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeWorkflowDraftId: draftId || null },
    });

    return NextResponse.json({ success: true, draftId: draftId || null });
  } catch (error: any) {
    console.error('[workflows/active-draft] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to set active draft' },
      { status: 500 }
    );
  }
}
