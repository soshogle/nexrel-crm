/**
 * AI Context Builder
 * Gathers comprehensive context about entities using the relationship graph
 */

import { prisma } from './db';
import { relationshipService } from './relationship-service';
import { EntityType } from '@prisma/client';

interface EntityContext {
  entity: any;
  entityType: EntityType;
  relationships: {
    outgoing: any[];
    incoming: any[];
  };
  relatedEntities: {
    leads?: any[];
    deals?: any[];
    tasks?: any[];
    conversations?: any[];
    payments?: any[];
  };
  metrics: {
    totalRelations: number;
    avgStrength: number;
    recentActivity: any[];
  };
  insights: string[];
}

export class AIContextBuilder {
  /**
   * Build comprehensive context for a lead
   */
  async buildLeadContext(userId: string, leadId: string): Promise<EntityContext> {
    // Get the lead with all related data
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        notes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        conversations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        deals: {
          include: {
            stage: true,
          },
        },
        tasks: {
          where: {
            status: { not: 'COMPLETED' },
          },
          take: 10,
          orderBy: { dueDate: 'asc' },
        },
        callLogs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get relationships
    const relationships = await relationshipService.getEntityRelationships(
      userId,
      EntityType.LEAD,
      leadId
    );

    // Get metrics
    const metrics = await prisma.relationshipMetrics.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: EntityType.LEAD,
          entityId: leadId,
        },
      },
    });

    // Build insights
    const insights = this.generateLeadInsights(lead, relationships, metrics);

    return {
      entity: lead,
      entityType: EntityType.LEAD,
      relationships,
      relatedEntities: {
        deals: lead.deals,
        tasks: lead.tasks,
        conversations: lead.conversations,
      },
      metrics: {
        totalRelations: metrics?.totalRelations || 0,
        avgStrength: metrics?.avgStrength || 0,
        recentActivity: [
          ...lead.notes.map((n) => ({ type: 'note', ...n })),
          ...lead.messages.map((m) => ({ type: 'message', ...m })),
          ...lead.callLogs.map((c) => ({ type: 'call', ...c })),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      },
      insights,
    };
  }

  /**
   * Build comprehensive context for a deal
   */
  async buildDealContext(userId: string, dealId: string): Promise<EntityContext> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        lead: true,
        stage: true,
        pipeline: true,
        tasks: {
          where: {
            status: { not: 'COMPLETED' },
          },
          take: 10,
          orderBy: { dueDate: 'asc' },
        },
        activities: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    const relationships = await relationshipService.getEntityRelationships(
      userId,
      EntityType.DEAL,
      dealId
    );

    const metrics = await prisma.relationshipMetrics.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: EntityType.DEAL,
          entityId: dealId,
        },
      },
    });

    const insights = this.generateDealInsights(deal, relationships, metrics);

    return {
      entity: deal,
      entityType: EntityType.DEAL,
      relationships,
      relatedEntities: {
        leads: deal.lead ? [deal.lead] : [],
        tasks: deal.tasks,
      },
      metrics: {
        totalRelations: metrics?.totalRelations || 0,
        avgStrength: metrics?.avgStrength || 0,
        recentActivity: deal.activities,
      },
      insights,
    };
  }

  /**
   * Build comprehensive context for a task
   */
  async buildTaskContext(userId: string, taskId: string): Promise<EntityContext> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        lead: true,
        deal: {
          include: {
            stage: true,
          },
        },
        assignedTo: true,
        dependsOn: true,
        blockedTasks: true,
        subtasks: true,
        comments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const relationships = await relationshipService.getEntityRelationships(
      userId,
      EntityType.TASK,
      taskId
    );

    const metrics = await prisma.relationshipMetrics.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: EntityType.TASK,
          entityId: taskId,
        },
      },
    });

    const insights = this.generateTaskInsights(task, relationships, metrics);

    return {
      entity: task,
      entityType: EntityType.TASK,
      relationships,
      relatedEntities: {
        leads: task.lead ? [task.lead] : [],
        deals: task.deal ? [task.deal] : [],
        tasks: [...task.blockedTasks, ...task.subtasks],
      },
      metrics: {
        totalRelations: metrics?.totalRelations || 0,
        avgStrength: metrics?.avgStrength || 0,
        recentActivity: task.activityLogs,
      },
      insights,
    };
  }

  /**
   * Generate insights for a lead
   */
  private generateLeadInsights(lead: any, relationships: any, metrics: any): string[] {
    const insights: string[] = [];

    // Status-based insights
    if (lead.status === 'NEW') {
      insights.push('This is a new lead. Consider reaching out within 24 hours.');
    } else if (lead.status === 'CONTACTED' && !lead.lastContactedAt) {
      insights.push('Lead marked as contacted but no contact date recorded.');
    }

    // Deal insights
    if (lead.deals && lead.deals.length > 0) {
      const activeDealals = lead.deals.filter((d: any) => !d.actualCloseDate);
      if (activeDealals.length > 0) {
        insights.push(
          `${activeDealals.length} active deal(s) associated with this lead.`
        );
      }
    } else {
      if (lead.status === 'QUALIFIED') {
        insights.push(
          'Lead is qualified but no deals created yet. Consider creating a deal.'
        );
      }
    }

    // Task insights
    if (lead.tasks && lead.tasks.length > 0) {
      const overdueTasks = lead.tasks.filter(
        (t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
      );
      if (overdueTasks.length > 0) {
        insights.push(`${overdueTasks.length} overdue task(s) for this lead.`);
      }
    }

    // Relationship insights
    if (metrics) {
      if (metrics.totalRelations === 0) {
        insights.push('No relationships established yet. Start by creating tasks or deals.');
      } else if (metrics.avgStrength < 3) {
        insights.push('Weak relationships. Increase engagement to strengthen connections.');
      }
    }

    // Communication insights
    const daysSinceLastContact = lead.lastContactedAt
      ? Math.floor(
          (new Date().getTime() - new Date(lead.lastContactedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    if (daysSinceLastContact && daysSinceLastContact > 14) {
      insights.push(
        `No contact in ${daysSinceLastContact} days. Consider following up.`
      );
    }

    return insights;
  }

  /**
   * Generate insights for a deal
   */
  private generateDealInsights(deal: any, relationships: any, metrics: any): string[] {
    const insights: string[] = [];

    // Stage insights
    if (deal.stage) {
      if (deal.stage.probability >= 80) {
        insights.push('High probability deal. Focus on closing quickly.');
      } else if (deal.stage.probability < 30) {
        insights.push('Low probability. Consider what actions can increase likelihood.');
      }
    }

    // Timeline insights
    if (deal.expectedCloseDate) {
      const daysUntilClose = Math.floor(
        (new Date(deal.expectedCloseDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysUntilClose < 7 && daysUntilClose > 0) {
        insights.push(`Deal expected to close in ${daysUntilClose} days.`);
      } else if (daysUntilClose < 0) {
        insights.push('Deal past expected close date. Update timeline or close status.');
      }
    }

    // Task insights
    if (deal.tasks && deal.tasks.length > 0) {
      const pendingTasks = deal.tasks.filter((t: any) => t.status === 'TODO');
      if (pendingTasks.length > 0) {
        insights.push(`${pendingTasks.length} pending task(s) for this deal.`);
      }
    } else {
      insights.push('No tasks associated with this deal. Consider creating action items.');
    }

    // Payment insights
    if (deal.payments && deal.payments.length > 0) {
      const totalPaid = deal.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const percentPaid = (totalPaid / deal.value) * 100;
      if (percentPaid < 100) {
        insights.push(
          `${percentPaid.toFixed(0)}% of deal value paid ($${totalPaid.toFixed(2)} of $${deal.value})`
        );
      }
    }

    return insights;
  }

  /**
   * Generate insights for a task
   */
  private generateTaskInsights(task: any, relationships: any, metrics: any): string[] {
    const insights: string[] = [];

    // Due date insights
    if (task.dueDate) {
      const daysUntilDue = Math.floor(
        (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDue < 0) {
        insights.push(`Task is ${Math.abs(daysUntilDue)} days overdue.`);
      } else if (daysUntilDue === 0) {
        insights.push('Task is due today!');
      } else if (daysUntilDue <= 2) {
        insights.push(`Task due in ${daysUntilDue} day(s).`);
      }
    }

    // Dependency insights
    if (task.dependsOn) {
      if (task.dependsOn.status !== 'DONE') {
        insights.push(
          `This task is blocked by "${task.dependsOn.title}" which is not yet completed.`
        );
      }
    }

    if (task.blockedTasks && task.blockedTasks.length > 0) {
      insights.push(
        `${task.blockedTasks.length} other task(s) are waiting for this to be completed.`
      );
    }

    // Subtask insights
    if (task.subtasks && task.subtasks.length > 0) {
      const completedSubtasks = task.subtasks.filter((st: any) => st.status === 'DONE');
      const progress = (completedSubtasks.length / task.subtasks.length) * 100;
      insights.push(
        `Subtasks: ${completedSubtasks.length}/${task.subtasks.length} completed (${progress.toFixed(0)}%)`
      );
    }

    // Assignment insights
    if (!task.assignedToId) {
      insights.push('Task is not assigned to anyone.');
    }

    // Related entity insights
    if (task.lead) {
      insights.push(`Related to lead: ${task.lead.businessName}`);
    }
    if (task.deal) {
      insights.push(`Related to deal: ${task.deal.title}`);
    }

    return insights;
  }
}

export const aiContextBuilder = new AIContextBuilder();
