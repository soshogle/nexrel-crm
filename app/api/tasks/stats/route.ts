import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { taskService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/stats - Get task statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
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

    // Return mock task stats when database is empty for demo purposes
    if (total === 0) {
      const { MOCK_TASK_STATS } = await import('@/lib/mock-data');
      return NextResponse.json(MOCK_TASK_STATS);
    }

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
    return apiErrors.internal(error.message || 'Failed to fetch stats');
  }
}
