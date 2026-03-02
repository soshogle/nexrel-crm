
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiTaskService } from '@/lib/ai-task-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/ai-patterns - Get AI-analyzed task patterns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const patterns = await aiTaskService.analyzeTaskPatterns(session.user.id);
    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';

    // Return mock patterns when empty for demo purposes
    if (isOrthoDemo && (!patterns || (Array.isArray(patterns.patterns) && patterns.patterns.length === 0))) {
      return NextResponse.json({
        patterns: [
          { type: 'peak_hours', description: 'Most tasks completed between 10-11 AM', confidence: 78 },
          { type: 'category_focus', description: 'Sales tasks have highest completion rate', confidence: 82 },
          { type: 'overdue_trend', description: '1 overdue task - review and reschedule', confidence: 95 },
        ],
        recommendations: [
          'Schedule follow-up calls in the morning for best response rates',
          'Break down complex tasks into smaller subtasks',
        ],
      });
    }

    if (!patterns || (Array.isArray((patterns as any).patterns) && (patterns as any).patterns.length === 0)) {
      return NextResponse.json({ patterns: [], recommendations: [] });
    }

    return NextResponse.json(patterns);
  } catch (error: any) {
    console.error('Error analyzing task patterns:', error);
    return apiErrors.internal('Failed to analyze task patterns');
  }
}
