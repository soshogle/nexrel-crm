import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { subDays, format } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/analytics - Get comprehensive task analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case '1y':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 30);
    }

    const userId = ctx.userId;

    // Fetch all tasks within period
    const tasks = await getCrmDb(ctx).task.findMany({
      where: {
        OR: [{ userId }, { assignedToId: userId }],
        createdAt: { gte: startDate },
      },
      include: {
        assignedTo: true,
        lead: true,
        deal: true,
      },
    });

    // Completion trend (tasks completed over time)
    const completionTrend = await generateCompletionTrend(ctx, userId, startDate, period);

    // Productivity metrics
    const avgCompletionTime = await calculateAvgCompletionTime(ctx, userId, startDate);
    const tasksCreatedVsCompleted = await getTasksCreatedVsCompleted(ctx, userId, startDate);

    // Priority distribution
    const priorityDistribution = {
      URGENT: tasks.filter((t) => t.priority === 'URGENT').length,
      HIGH: tasks.filter((t) => t.priority === 'HIGH').length,
      MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM').length,
      LOW: tasks.filter((t) => t.priority === 'LOW').length,
    };

    // Status breakdown
    const statusBreakdown = {
      TODO: tasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      BLOCKED: tasks.filter((t) => t.status === 'BLOCKED').length,
      REVIEW: tasks.filter((t) => t.status === 'REVIEW').length,
      COMPLETED: tasks.filter((t) => t.status === 'COMPLETED').length,
      CANCELLED: tasks.filter((t) => t.status === 'CANCELLED').length,
    };

    // Category performance
    const categories = [...new Set(tasks.map((t) => t.category).filter(Boolean))];
    const categoryPerformance = categories.map((category) => {
      const categoryTasks = tasks.filter((t) => t.category === category);
      const completed = categoryTasks.filter((t) => t.status === 'COMPLETED').length;
      return {
        category,
        total: categoryTasks.length,
        completed,
        completionRate: categoryTasks.length > 0 ? (completed / categoryTasks.length) * 100 : 0,
      };
    });

    // Team performance
    const teamPerformance = await getTeamPerformance(ctx, userId, startDate);

    // Overdue analysis
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED'
    );

    // Predictive insights
    const predictions = await generatePredictions(ctx, userId, tasks);

    return NextResponse.json({
      period,
      summary: {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'COMPLETED').length,
        inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        overdue: overdueTasks.length,
        completionRate:
          tasks.length > 0
            ? (tasks.filter((t) => t.status === 'COMPLETED').length / tasks.length) * 100
            : 0,
      },
      completionTrend,
      productivityMetrics: {
        avgCompletionTime,
        tasksCreatedVsCompleted,
      },
      priorityDistribution,
      statusBreakdown,
      categoryPerformance,
      teamPerformance,
      overdueAnalysis: {
        count: overdueTasks.length,
        byPriority: {
          URGENT: overdueTasks.filter((t) => t.priority === 'URGENT').length,
          HIGH: overdueTasks.filter((t) => t.priority === 'HIGH').length,
          MEDIUM: overdueTasks.filter((t) => t.priority === 'MEDIUM').length,
          LOW: overdueTasks.filter((t) => t.priority === 'LOW').length,
        },
      },
      predictions,
    });
  } catch (error: any) {
    console.error('Error fetching task analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Helper functions
async function generateCompletionTrend(ctx: { userId: string }, userId: string, startDate: Date, period: string) {
  const completedTasks = await getCrmDb(ctx).task.findMany({
    where: {
      OR: [{ userId }, { assignedToId: userId }],
      status: 'COMPLETED',
      completedAt: { gte: startDate },
    },
    select: {
      completedAt: true,
    },
  });

  // Group by date
  const groupedByDate: Record<string, number> = {};
  completedTasks.forEach((task) => {
    if (task.completedAt) {
      const dateKey = format(task.completedAt, 'yyyy-MM-dd');
      groupedByDate[dateKey] = (groupedByDate[dateKey] || 0) + 1;
    }
  });

  return Object.entries(groupedByDate).map(([date, count]) => ({ date, count }));
}

async function calculateAvgCompletionTime(ctx: { userId: string }, userId: string, startDate: Date) {
  const completedTasks = await getCrmDb(ctx).task.findMany({
    where: {
      OR: [{ userId }, { assignedToId: userId }],
      status: 'COMPLETED',
      completedAt: { gte: startDate },
    },
    select: {
      createdAt: true,
      completedAt: true,
    },
  });

  if (completedTasks.length === 0) return 0;

  const totalTime = completedTasks.reduce((sum, task) => {
    if (task.completedAt) {
      const diff = task.completedAt.getTime() - task.createdAt.getTime();
      return sum + diff;
    }
    return sum;
  }, 0);

  // Return average in hours
  return totalTime / completedTasks.length / (1000 * 60 * 60);
}

async function getTasksCreatedVsCompleted(ctx: { userId: string }, userId: string, startDate: Date) {
  const created = await getCrmDb(ctx).task.count({
    where: {
      OR: [{ userId }, { assignedToId: userId }],
      createdAt: { gte: startDate },
    },
  });

  const completed = await getCrmDb(ctx).task.count({
    where: {
      OR: [{ userId }, { assignedToId: userId }],
      status: 'COMPLETED',
      completedAt: { gte: startDate },
    },
  });

  return { created, completed };
}

async function getTeamPerformance(ctx: { userId: string }, userId: string, startDate: Date) {
  const tasks = await getCrmDb(ctx).task.findMany({
    where: {
      userId,
      assignedToId: { not: null },
      createdAt: { gte: startDate },
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by assignee
  const performanceMap: Record<string, any> = {};

  tasks.forEach((task) => {
    if (task.assignedTo) {
      const assigneeId = task.assignedTo.id;
      if (!performanceMap[assigneeId]) {
        performanceMap[assigneeId] = {
          id: assigneeId,
          name: task.assignedTo.name,
          totalAssigned: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
        };
      }

      performanceMap[assigneeId].totalAssigned++;
      if (task.status === 'COMPLETED') {
        performanceMap[assigneeId].completed++;
      } else if (task.status === 'IN_PROGRESS') {
        performanceMap[assigneeId].inProgress++;
      }

      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED') {
        performanceMap[assigneeId].overdue++;
      }
    }
  });

  return Object.values(performanceMap).map((member: any) => ({
    ...member,
    completionRate:
      member.totalAssigned > 0 ? (member.completed / member.totalAssigned) * 100 : 0,
  }));
}

async function generatePredictions(ctx: { userId: string }, userId: string, recentTasks: any[]) {
  // Analyze patterns to generate predictions
  const predictions = [];

  // Predict completion likelihood based on historical data
  const completedTasks = recentTasks.filter((t) => t.status === 'COMPLETED');
  const avgCompletionRate = recentTasks.length > 0 ? (completedTasks.length / recentTasks.length) * 100 : 0;

  if (avgCompletionRate < 50) {
    predictions.push({
      type: 'warning',
      message: 'Task completion rate is below 50%. Consider reviewing task priorities and workload.',
      confidence: 85,
    });
  }

  // Predict overdue risks
  const upcomingTasks = recentTasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) > new Date() &&
      new Date(t.dueDate) < subDays(new Date(), -7) &&
      t.status !== 'COMPLETED'
  );

  if (upcomingTasks.length > 5) {
    predictions.push({
      type: 'alert',
      message: `${upcomingTasks.length} tasks are due within the next week. Plan ahead to avoid bottlenecks.`,
      confidence: 90,
    });
  }

  // Category-based predictions
  const categoryWithLowCompletion = recentTasks.reduce((acc: any, task: any) => {
    if (task.category) {
      if (!acc[task.category]) {
        acc[task.category] = { total: 0, completed: 0 };
      }
      acc[task.category].total++;
      if (task.status === 'COMPLETED') {
        acc[task.category].completed++;
      }
    }
    return acc;
  }, {});

  Object.entries(categoryWithLowCompletion).forEach(([category, data]: [string, any]) => {
    const rate = (data.completed / data.total) * 100;
    if (rate < 40 && data.total >= 3) {
      predictions.push({
        type: 'insight',
        message: `"${category}" tasks have a low completion rate (${rate.toFixed(0)}%). Consider delegating or breaking them down.`,
        confidence: 75,
      });
    }
  });

  return predictions;
}
