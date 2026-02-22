/**
 * Relationship Graph Service
 * Manages connections and relationships between CRM entities
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService } from '@/lib/dal';
import { EntityType, RelationshipType } from '@prisma/client';

interface CreateRelationshipParams {
  userId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationshipType: RelationshipType;
  context?: any;
  isAutomatic?: boolean;
}

interface UpdateStrengthParams {
  userId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationshipType: RelationshipType;
}

export class RelationshipService {
  /**
   * Create or update a relationship between two entities
   */
  async createOrUpdateRelationship(params: CreateRelationshipParams) {
    const {
      userId,
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType,
      context,
      isAutomatic = true,
    } = params;

    // Check if relationship already exists
    const existing = await prisma.relationshipGraph.findUnique({
      where: {
        userId_sourceType_sourceId_targetType_targetId_relationshipType: {
          userId,
          sourceType,
          sourceId,
          targetType,
          targetId,
          relationshipType,
        },
      },
    });

    if (existing) {
      // Update existing relationship
      return await this.updateRelationshipStrength({
        userId,
        sourceType,
        sourceId,
        targetType,
        targetId,
        relationshipType,
      });
    }

    // Create new relationship
    return await prisma.relationshipGraph.create({
      data: {
        userId,
        sourceType,
        sourceId,
        targetType,
        targetId,
        relationshipType,
        context,
        isAutomatic,
        strength: 1.0,
        interactionCount: 1,
      },
    });
  }

  /**
   * Update relationship strength based on interaction
   */
  async updateRelationshipStrength(params: UpdateStrengthParams) {
    const { userId, sourceType, sourceId, targetType, targetId, relationshipType } = params;

    const relationship = await prisma.relationshipGraph.findUnique({
      where: {
        userId_sourceType_sourceId_targetType_targetId_relationshipType: {
          userId,
          sourceType,
          sourceId,
          targetType,
          targetId,
          relationshipType,
        },
      },
    });

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    // Calculate new strength based on interaction count and recency
    const now = new Date();
    const daysSinceFirst = Math.max(
      1,
      (now.getTime() - relationship.firstCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLast = Math.max(
      1,
      (now.getTime() - relationship.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Strength formula:
    // - Base: interaction count
    // - Recency boost: more recent = higher score
    // - Decay: older = lower score
    const newInteractionCount = relationship.interactionCount + 1;
    const recencyFactor = Math.max(0.1, 1 / (1 + daysSinceLast / 7)); // Decay over weeks
    const frequencyFactor = Math.log10(newInteractionCount + 1) * 2; // Logarithmic growth
    const newStrength = Math.min(10, frequencyFactor * recencyFactor * 1.5);

    return await prisma.relationshipGraph.update({
      where: {
        userId_sourceType_sourceId_targetType_targetId_relationshipType: {
          userId,
          sourceType,
          sourceId,
          targetType,
          targetId,
          relationshipType,
        },
      },
      data: {
        interactionCount: newInteractionCount,
        lastInteractionAt: now,
        strength: newStrength,
      },
    });
  }

  /**
   * Get all relationships for an entity
   */
  async getEntityRelationships(
    userId: string,
    entityType: EntityType,
    entityId: string
  ) {
    const [outgoing, incoming] = await Promise.all([
      // Outgoing relationships (this entity is the source)
      prisma.relationshipGraph.findMany({
        where: {
          userId,
          sourceType: entityType,
          sourceId: entityId,
        },
        orderBy: { strength: 'desc' },
      }),
      // Incoming relationships (this entity is the target)
      prisma.relationshipGraph.findMany({
        where: {
          userId,
          targetType: entityType,
          targetId: entityId,
        },
        orderBy: { strength: 'desc' },
      }),
    ]);

    return { outgoing, incoming };
  }

  /**
   * Find connected entities (traversal)
   */
  async findConnectedEntities(
    userId: string,
    entityType: EntityType,
    entityId: string,
    maxDepth: number = 2
  ) {
    const visited = new Set<string>();
    const connections: any[] = [];

    const traverse = async (type: EntityType, id: string, depth: number) => {
      const key = `${type}-${id}`;
      if (visited.has(key) || depth > maxDepth) return;
      visited.add(key);

      const { outgoing, incoming } = await this.getEntityRelationships(userId, type, id);

      for (const rel of [...outgoing, ...incoming]) {
        const isOutgoing = rel.sourceType === type && rel.sourceId === id;
        const connectedType = isOutgoing ? rel.targetType : rel.sourceType;
        const connectedId = isOutgoing ? rel.targetId : rel.sourceId;

        connections.push({
          relationship: rel,
          depth,
          direction: isOutgoing ? 'outgoing' : 'incoming',
          connectedType,
          connectedId,
        });

        if (depth < maxDepth) {
          await traverse(connectedType, connectedId, depth + 1);
        }
      }
    };

    await traverse(entityType, entityId, 0);
    return connections;
  }

  /**
   * Update aggregated metrics for an entity
   */
  async updateEntityMetrics(
    userId: string,
    entityType: EntityType,
    entityId: string
  ) {
    const { outgoing, incoming } = await this.getEntityRelationships(
      userId,
      entityType,
      entityId
    );

    const allRelations = [...outgoing, ...incoming];
    const totalRelations = allRelations.length;

    if (totalRelations === 0) {
      await prisma.relationshipMetrics.deleteMany({
        where: { userId, entityType, entityId },
      });
      return null;
    }

    const avgStrength =
      allRelations.reduce((sum, r) => sum + r.strength, 0) / totalRelations;

    // Find strongest relationship type
    const typeCounts: Record<string, number> = {};
    allRelations.forEach((r) => {
      typeCounts[r.relationshipType] = (typeCounts[r.relationshipType] || 0) + 1;
    });
    const strongestType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return await prisma.relationshipMetrics.upsert({
      where: {
        userId_entityType_entityId: { userId, entityType, entityId },
      },
      create: {
        userId,
        entityType,
        entityId,
        totalRelations,
        avgStrength,
        strongestType,
      },
      update: {
        totalRelations,
        avgStrength,
        strongestType,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Auto-create relationships when entities are linked
   */
  async autoCreateRelationships(
    userId: string,
    entityType: EntityType,
    entityId: string,
    linkedEntities: Array<{ type: EntityType; id: string; relationshipType: RelationshipType }>
  ) {
    for (const linked of linkedEntities) {
      await this.createOrUpdateRelationship({
        userId,
        sourceType: entityType,
        sourceId: entityId,
        targetType: linked.type,
        targetId: linked.id,
        relationshipType: linked.relationshipType,
        context: { autoCreated: true, timestamp: new Date() },
        isAutomatic: true,
      });
    }
  }

  /**
   * Get unified search across all entities
   */
  async unifiedSearch(userId: string, query: string, limit: number = 20) {
    const results = {
      leads: [] as any[],
      deals: [] as any[],
      tasks: [] as any[],
      conversations: [] as any[],
      appointments: [] as any[],
    };

    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);
    // Search leads
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { businessName: { contains: query, mode: 'insensitive' } },
          { contactPerson: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    // Get relationship metrics for each lead
    for (const lead of leads) {
      const metrics = await db.relationshipMetrics.findUnique({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType: 'LEAD',
            entityId: lead.id,
          },
        },
      });
      results.leads.push({ ...lead, metrics });
    }

    // Search deals
    const deals = await db.deal.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        title: true,
        value: true,
        stage: { select: { name: true } },
      },
    });

    for (const deal of deals) {
      const metrics = await db.relationshipMetrics.findUnique({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType: 'DEAL',
            entityId: deal.id,
          },
        },
      });
      results.deals.push({ ...deal, metrics });
    }

    // Search tasks
    const tasks = await db.task.findMany({
      where: {
        OR: [{ userId }, { assignedToId: userId }],
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
    });

    for (const task of tasks) {
      const metrics = await db.relationshipMetrics.findUnique({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType: 'TASK',
            entityId: task.id,
          },
        },
      });
      results.tasks.push({ ...task, metrics });
    }

    return results;
  }
}

export const relationshipService = new RelationshipService();
