import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { relationshipService } from '@/lib/relationship-service';
import { EntityType } from '@prisma/client';

/**
 * GET /api/relationships/connected
 * Find all connected entities (graph traversal)
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
    const entityType = searchParams.get('entityType') as EntityType;
    const entityId = searchParams.get('entityId');
    const maxDepth = parseInt(searchParams.get('maxDepth') || '2', 10);

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const connections = await relationshipService.findConnectedEntities(
      session.user.id,
      entityType,
      entityId,
      maxDepth
    );

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error finding connected entities:', error);
    return NextResponse.json(
      { error: 'Failed to find connected entities' },
      { status: 500 }
    );
  }
}
