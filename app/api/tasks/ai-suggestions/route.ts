
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';

export const dynamic = 'force-dynamic';

// POST /api/tasks/ai-suggestions - Get AI task suggestions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
