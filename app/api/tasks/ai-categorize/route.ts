
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/tasks/ai-categorize - Auto-categorize a task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Auto-categorize
    const result = await aiTaskService.autoCategorize(title, description);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error categorizing task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to categorize' },
      { status: 500 }
    );
  }
}
