import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { taskService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/stats - Get task statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const now = new Date();

    // Get counts
    const [total, completed, inProgress, overdue] = await Promise.all([
      taskService.count(ctx),
      taskService.count(ctx, { status: 'COMPLETED' as any }),
      taskService.count(ctx, { status: 'IN_PROGRESS' as any }),
      taskService.count(ctx, { status: { not: 'COMPLETED' } as any, dueDate: { lt: now } }),
    ]);

    // Calculate completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({
      summary: {
        total,
        completed,
        inProgress,
        overdue,
        completionRate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching task stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
