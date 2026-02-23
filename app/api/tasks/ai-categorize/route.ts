
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/tasks/ai-categorize - Auto-categorize a task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return apiErrors.badRequest('Title is required');
    }

    // Auto-categorize
    const result = await aiTaskService.autoCategorize(title, description);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error categorizing task:', error);
    return apiErrors.internal(error.message || 'Failed to categorize');
  }
}
