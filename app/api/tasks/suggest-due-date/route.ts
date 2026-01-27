
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';

export const dynamic = 'force-dynamic';

// POST /api/tasks/suggest-due-date - Suggest optimal due date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priority, category } = body;

    if (!priority) {
      return NextResponse.json(
        { error: 'Priority is required' },
        { status: 400 }
      );
    }

    // Suggest due date
    const dueDate = aiTaskService.suggestDueDate(priority, category);

    return NextResponse.json({ 
      dueDate: dueDate.toISOString(),
      reasoning: `Based on ${priority} priority, due date set to ${dueDate.toLocaleDateString()}`,
    });
  } catch (error: any) {
    console.error('Error suggesting due date:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest due date' },
      { status: 500 }
    );
  }
}
