
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/tasks/ai-suggestions - Get AI task suggestions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { leadId, dealId, contactId, eventType, eventData } = body;

    // Generate suggestions
    const suggestions = await aiTaskService.generateTaskSuggestions({
      userId: session.user.id,
      leadId,
      dealId,
      contactId,
      eventType,
      eventData,
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error generating AI suggestions:', error);
    return apiErrors.internal(error.message || 'Failed to generate suggestions');
  }
}
