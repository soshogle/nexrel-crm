
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/tasks/suggest-assignee - Suggest optimal assignee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { title, category, leadId, dealId } = body;

    if (!title) {
      return apiErrors.badRequest('Title is required');
    }

    // Suggest assignee
    const suggestion = await aiTaskService.suggestAssignee(
      { title, category, leadId, dealId },
      session.user.id
    );

    return NextResponse.json(suggestion || { 
      suggestedUserId: session.user.id,
      confidence: 100,
      reasoning: 'Default assignee'
    });
  } catch (error: any) {
    console.error('Error suggesting assignee:', error);
    return apiErrors.internal(error.message || 'Failed to suggest assignee');
  }
}
