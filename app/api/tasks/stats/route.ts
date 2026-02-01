
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/stats - Get task statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    // Get counts
    const [total, completed, inProgress, overdue] = await Promise.all([
      prisma.task.count({
        where: {
          OR: [
            { userId },
            { assignedToId: userId },
          ],
        },
      }),
      prisma.task.count({
        where: {
          OR: [
            { userId },
            { assignedToId: userId },
          ],
          status: 'COMPLETED',
        },
      }),
      prisma.task.count({
        where: {
          OR: [
            { userId },
            { assignedToId: userId },
          ],
          status: 'IN_PROGRESS',
        },
      }),
      prisma.task.count({
        where: {
          OR: [
            { userId },
            { assignedToId: userId },
          ],
          status: { not: 'COMPLETED' },
          dueDate: { lt: now },
        },
      }),
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
