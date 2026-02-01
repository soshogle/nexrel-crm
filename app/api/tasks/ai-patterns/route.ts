
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/ai-patterns - Get AI-analyzed task patterns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patterns = await aiTaskService.analyzeTaskPatterns(session.user.id);

    return NextResponse.json(patterns);
  } catch (error: any) {
    console.error('Error analyzing task patterns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze patterns' },
      { status: 500 }
    );
  }
}
