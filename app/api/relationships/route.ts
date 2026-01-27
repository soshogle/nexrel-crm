import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { relationshipService } from '@/lib/relationship-service';
import { EntityType, RelationshipType } from '@prisma/client';

/**
 * GET /api/relationships
 * Get relationships for an entity
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as EntityType;
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const relationships = await relationshipService.getEntityRelationships(
      session.user.id,
      entityType,
      entityId
    );

    return NextResponse.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationships' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/relationships
 * Create or update a relationship
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType,
      context,
      isAutomatic = true,
    } = body;

    if (!sourceType || !sourceId || !targetType || !targetId || !relationshipType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const relationship = await relationshipService.createOrUpdateRelationship({
      userId: session.user.id,
      sourceType: sourceType as EntityType,
      sourceId,
      targetType: targetType as EntityType,
      targetId,
      relationshipType: relationshipType as RelationshipType,
      context,
      isAutomatic,
    });

    // Update metrics for both entities
    await Promise.all([
      relationshipService.updateEntityMetrics(
        session.user.id,
        sourceType as EntityType,
        sourceId
      ),
      relationshipService.updateEntityMetrics(
        session.user.id,
        targetType as EntityType,
        targetId
      ),
    ]);

    return NextResponse.json(relationship);
  } catch (error) {
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}
