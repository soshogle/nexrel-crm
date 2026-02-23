import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { relationshipService } from '@/lib/relationship-service';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/relationships/search
 * Unified search across all entities
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
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query) {
      return apiErrors.badRequest('Search query is required');
    }

    const results = await relationshipService.unifiedSearch(
      session.user.id,
      query,
      limit
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    return apiErrors.internal('Failed to perform search');
  }
}
