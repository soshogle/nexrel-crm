/**
 * Relationship Hooks
 * Automatically track relationships when entities are created or linked
 */

import { relationshipService } from './relationship-service';
import { EntityType, RelationshipType } from '@prisma/client';

export class RelationshipHooks {
  /**
   * Track relationship when a task is created with a lead or deal
   */
  static async onTaskCreated(params: {
    userId: string;
    taskId: string;
    leadId?: string;
    dealId?: string;
  }) {
    const { userId, taskId, leadId, dealId } = params;

    const relationships = [];

    if (leadId) {
      relationships.push({
        type: EntityType.LEAD,
        id: leadId,
        relationshipType: RelationshipType.CREATED_FROM,
      });
    }

    if (dealId) {
      relationships.push({
        type: EntityType.DEAL,
        id: dealId,
        relationshipType: RelationshipType.ASSIGNED_TO,
      });
    }

    if (relationships.length > 0) {
      await relationshipService.autoCreateRelationships(
        userId,
        EntityType.TASK,
        taskId,
        relationships
      );

      // Update metrics
      for (const rel of relationships) {
        await relationshipService.updateEntityMetrics(userId, rel.type, rel.id);
      }
      await relationshipService.updateEntityMetrics(userId, EntityType.TASK, taskId);
    }
  }

  /**
   * Track relationship when a deal is created with a lead
   */
  static async onDealCreated(params: {
    userId: string;
    dealId: string;
    leadId?: string;
  }) {
    const { userId, dealId, leadId } = params;

    if (leadId) {
      await relationshipService.autoCreateRelationships(
        userId,
        EntityType.DEAL,
        dealId,
        [
          {
            type: EntityType.LEAD,
            id: leadId,
            relationshipType: RelationshipType.ORIGINATED_FROM,
          },
        ]
      );

      // Also create the reverse relationship (Lead converted to Deal)
      await relationshipService.createOrUpdateRelationship({
        userId,
        sourceType: EntityType.LEAD,
        sourceId: leadId,
        targetType: EntityType.DEAL,
        targetId: dealId,
        relationshipType: RelationshipType.CONVERTED_TO,
        context: { timestamp: new Date() },
        isAutomatic: true,
      });

      // Update metrics
      await relationshipService.updateEntityMetrics(userId, EntityType.LEAD, leadId);
      await relationshipService.updateEntityMetrics(userId, EntityType.DEAL, dealId);
    }
  }

  /**
   * Track relationship when a conversation is created with a lead
   */
  static async onConversationCreated(params: {
    userId: string;
    conversationId: string;
    leadId?: string;
  }) {
    const { userId, conversationId, leadId } = params;

    if (leadId) {
      await relationshipService.autoCreateRelationships(
        userId,
        EntityType.CONVERSATION,
        conversationId,
        [
          {
            type: EntityType.LEAD,
            id: leadId,
            relationshipType: RelationshipType.RELATED_TO,
          },
        ]
      );

      // Update metrics
      await relationshipService.updateEntityMetrics(userId, EntityType.LEAD, leadId);
      await relationshipService.updateEntityMetrics(
        userId,
        EntityType.CONVERSATION,
        conversationId
      );
    }
  }

  /**
   * Track relationship when an appointment is created with a lead
   */
  static async onAppointmentCreated(params: {
    userId: string;
    appointmentId: string;
    leadId?: string;
  }) {
    const { userId, appointmentId, leadId } = params;

    if (leadId) {
      await relationshipService.autoCreateRelationships(
        userId,
        EntityType.APPOINTMENT,
        appointmentId,
        [
          {
            type: EntityType.LEAD,
            id: leadId,
            relationshipType: RelationshipType.SCHEDULED_FOR,
          },
        ]
      );

      // Update metrics
      await relationshipService.updateEntityMetrics(userId, EntityType.LEAD, leadId);
      await relationshipService.updateEntityMetrics(
        userId,
        EntityType.APPOINTMENT,
        appointmentId
      );
    }
  }

  /**
   * Track relationship when a payment is created for a deal
   */
  static async onPaymentCreated(params: {
    userId: string;
    paymentId: string;
    dealId?: string;
    leadId?: string;
  }) {
    const { userId, paymentId, dealId, leadId } = params;

    const relationships = [];

    if (dealId) {
      relationships.push({
        type: EntityType.DEAL,
        id: dealId,
        relationshipType: RelationshipType.PAYMENT_FOR,
      });
    }

    if (leadId) {
      relationships.push({
        type: EntityType.LEAD,
        id: leadId,
        relationshipType: RelationshipType.PAYMENT_FOR,
      });
    }

    if (relationships.length > 0) {
      await relationshipService.autoCreateRelationships(
        userId,
        EntityType.PAYMENT,
        paymentId,
        relationships
      );

      // Update metrics
      for (const rel of relationships) {
        await relationshipService.updateEntityMetrics(userId, rel.type, rel.id);
      }
      await relationshipService.updateEntityMetrics(userId, EntityType.PAYMENT, paymentId);
    }
  }

  /**
   * Track relationship when a task is updated (e.g., status changed)
   */
  static async onTaskUpdated(params: {
    userId: string;
    taskId: string;
    leadId?: string;
    dealId?: string;
  }) {
    const { userId, taskId, leadId, dealId } = params;

    // Increment interaction count by updating the relationship
    if (leadId) {
      try {
        await relationshipService.updateRelationshipStrength({
          userId,
          sourceType: EntityType.TASK,
          sourceId: taskId,
          targetType: EntityType.LEAD,
          targetId: leadId,
          relationshipType: RelationshipType.CREATED_FROM,
        });
      } catch (error) {
        // Relationship might not exist yet, create it
        await this.onTaskCreated({ userId, taskId, leadId });
      }
    }

    if (dealId) {
      try {
        await relationshipService.updateRelationshipStrength({
          userId,
          sourceType: EntityType.TASK,
          sourceId: taskId,
          targetType: EntityType.DEAL,
          targetId: dealId,
          relationshipType: RelationshipType.ASSIGNED_TO,
        });
      } catch (error) {
        // Relationship might not exist yet, create it
        await this.onTaskCreated({ userId, taskId, dealId });
      }
    }
  }

  /**
   * Track relationship when entities are manually linked
   */
  static async onManualLink(params: {
    userId: string;
    sourceType: EntityType;
    sourceId: string;
    targetType: EntityType;
    targetId: string;
    relationshipType?: RelationshipType;
  }) {
    const {
      userId,
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType = RelationshipType.RELATED_TO,
    } = params;

    await relationshipService.createOrUpdateRelationship({
      userId,
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType,
      context: { manual: true, timestamp: new Date() },
      isAutomatic: false,
    });

    // Update metrics
    await relationshipService.updateEntityMetrics(userId, sourceType, sourceId);
    await relationshipService.updateEntityMetrics(userId, targetType, targetId);
  }
}
