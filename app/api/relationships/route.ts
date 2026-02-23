import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { relationshipService } from '@/lib/relationship-service';
import { EntityType, RelationshipType } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/relationships
 * Get relationships for an entity
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
    const entityType = searchParams.get('entityType') as EntityType;
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return apiErrors.badRequest('entityType and entityId are required');
    }

    const relationships = await relationshipService.getEntityRelationships(
      session.user.id,
      entityType,
      entityId
    );

    return NextResponse.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return apiErrors.internal('Failed to fetch relationships');
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
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Missing required fields');
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
    return apiErrors.internal('Failed to create relationship');
  }
}
