import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiBrainService } from '@/lib/ai-brain-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/ai-brain/workflows
 * Get workflow automation recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const workflows = await aiBrainService.generateWorkflowRecommendations(session.user.id);

    return NextResponse.json({
      success: true,
      workflows,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating workflow recommendations:', error);
    return apiErrors.internal(error.message || 'Failed to generate recommendations');
  }
}
