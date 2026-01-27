import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { batchAnalyzeUnanalyzedCalls } from '@/lib/auto-analyze-calls';

/**
 * POST /api/conversations/batch-analyze
 * Batch analyze unanalyzed calls
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { limit = 10 } = await req.json().catch(() => ({}));

    // Start batch analysis
    const results = await batchAnalyzeUnanalyzedCalls(session.user.id, limit);

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Analyzed ${successCount} of ${results.length} calls`,
      results,
    });
  } catch (error) {
    console.error('Error in batch analysis:', error);
    return NextResponse.json(
      { error: 'Failed to batch analyze calls' },
      { status: 500 }
    );
  }
}
