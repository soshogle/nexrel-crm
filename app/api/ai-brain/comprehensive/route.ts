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

    console.log('[AI Brain API] Fetching comprehensive data for user:', session.user.id);
    
    const brainData = await aiBrainEnhancedService.getComprehensiveBrainData(session.user.id);

    console.log('[AI Brain API] Data fetched successfully:', {
      coreHealth: brainData.core.overallHealth,
      leftDataPoints: brainData.leftHemisphere.dataPoints.length,
      rightDataPoints: brainData.rightHemisphere.dataPoints.length,
      connections: brainData.connections.length,
      alerts: brainData.core.criticalAlerts.length,
    });

    return NextResponse.json({
      success: true,
      data: brainData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[AI Brain API] Error generating comprehensive brain data:', error);
    console.error('[AI Brain API] Error stack:', error?.stack);
    console.error('[AI Brain API] Error name:', error?.name);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate brain data',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
