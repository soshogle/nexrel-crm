import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiSuggestionEngine } from '@/lib/ai-suggestion-engine';
import { EntityType } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/ai/suggestions
 * Get AI suggestions for an entity or dashboard
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as EntityType | null;
    const entityId = searchParams.get('entityId');

    // Dashboard-level suggestions
    if (!entityType || !entityId) {
      const suggestions = await aiSuggestionEngine.generateDashboardSuggestions(
        session.user.id
      );
      return NextResponse.json({ suggestions });
    }

    // Entity-specific suggestions
    let suggestions;
    switch (entityType) {
      case 'LEAD':
        suggestions = await aiSuggestionEngine.generateLeadSuggestions(
          session.user.id,
          entityId
        );
        break;
      case 'DEAL':
        suggestions = await aiSuggestionEngine.generateDealSuggestions(
          session.user.id,
          entityId
        );
        break;
      case 'TASK':
        suggestions = await aiSuggestionEngine.generateTaskSuggestions(
          session.user.id,
          entityId
        );
        break;
      default:
        return apiErrors.badRequest('Unsupported entity type');
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      return apiErrors.notFound(message);
    }
    // Return empty suggestions instead of 500 to prevent lead/dashboard crashes
    return NextResponse.json({ suggestions: [] });
  }
}
