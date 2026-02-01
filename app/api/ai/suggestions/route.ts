import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiSuggestionEngine } from '@/lib/ai-suggestion-engine';
import { EntityType } from '@prisma/client';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        return NextResponse.json(
          { error: 'Unsupported entity type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
