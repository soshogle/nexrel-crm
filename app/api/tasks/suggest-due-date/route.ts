
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/tasks/suggest-due-date - Suggest optimal due date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { priority, category } = body;

    if (!priority) {
      return apiErrors.badRequest('Priority is required');
    }

    // Suggest due date
    const dueDate = aiTaskService.suggestDueDate(priority, category);

    return NextResponse.json({ 
      dueDate: dueDate.toISOString(),
      reasoning: `Based on ${priority} priority, due date set to ${dueDate.toLocaleDateString()}`,
    });
  } catch (error: any) {
    console.error('Error suggesting due date:', error);
    return apiErrors.internal(error.message || 'Failed to suggest due date');
  }
}
