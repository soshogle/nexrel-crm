import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiBrainEnhancedService } from '@/lib/ai-brain-enhanced-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/ai-brain/comprehensive
 * Get comprehensive brain data from all sources
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brainData = await aiBrainEnhancedService.getComprehensiveBrainData(session.user.id);

    return NextResponse.json({
      success: true,
      data: brainData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating comprehensive brain data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate brain data' },
      { status: 500 }
    );
  }
}
