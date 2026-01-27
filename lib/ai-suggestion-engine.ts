/**
 * AI Suggestion Engine
 * Generates intelligent next-best-action suggestions using AI and relationship context
 */

import { aiContextBuilder } from './ai-context-builder';
import { EntityType } from '@prisma/client';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'task' | 'follow_up' | 'deal' | 'insight' | 'warning';
  actionable: boolean;
  action?: {
    type: 'create_task' | 'create_deal' | 'send_message' | 'update_status';
    data?: any;
  };
}

export class AISuggestionEngine {
  /**
   * Generate suggestions for a lead
   */
  async generateLeadSuggestions(
    userId: string,
    leadId: string
  ): Promise<Suggestion[]> {
    const context = await aiContextBuilder.buildLeadContext(userId, leadId);
    const suggestions: Suggestion[] = [];

    // Convert insights to suggestions
    context.insights.forEach((insight, idx) => {
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let category: Suggestion['category'] = 'insight';

      if (insight.includes('overdue')) {
        priority = 'high';
        category = 'warning';
      } else if (insight.includes('new lead')) {
        priority = 'high';
        category = 'follow_up';
      } else if (insight.includes('No contact')) {
        priority = 'high';
        category = 'follow_up';
      }

      suggestions.push({
        id: `insight-${idx}`,
        title: insight,
        description: this.expandInsightToDescription(insight),
        priority,
        category,
        actionable: this.isActionableInsight(insight),
      });
    });

    // Generate AI-powered suggestions based on context
    const lead = context.entity;

    // Suggest creating a deal if lead is qualified
    if (lead.status === 'QUALIFIED' && !lead.deals?.length) {
      suggestions.push({
        id: 'suggest-deal',
        title: 'Create Deal',
        description: `This lead is qualified but has no deals. Consider creating a deal to track the sales opportunity.`,
        priority: 'high',
        category: 'deal',
        actionable: true,
        action: {
          type: 'create_deal',
          data: { leadId },
        },
      });
    }

    // Suggest follow-up task if no recent contact
    const daysSinceLastContact = lead.lastContactedAt
      ? Math.floor(
          (new Date().getTime() - new Date(lead.lastContactedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    if (daysSinceLastContact && daysSinceLastContact > 7) {
      suggestions.push({
        id: 'suggest-follow-up',
        title: 'Schedule Follow-Up',
        description: `It's been ${daysSinceLastContact} days since last contact. Schedule a follow-up call or email.`,
        priority: 'high',
        category: 'follow_up',
        actionable: true,
        action: {
          type: 'create_task',
          data: {
            title: `Follow up with ${lead.businessName}`,
            leadId,
            category: 'SALES',
          },
        },
      });
    }

    // Suggest sending message if no messages sent yet
    if (lead.messages?.length === 0 && lead.email) {
      suggestions.push({
        id: 'suggest-message',
        title: 'Send Introduction Email',
        description: 'No messages sent yet. Consider sending an introduction email to establish contact.',
        priority: 'medium',
        category: 'follow_up',
        actionable: true,
        action: {
          type: 'send_message',
          data: { leadId },
        },
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate suggestions for a deal
   */
  async generateDealSuggestions(
    userId: string,
    dealId: string
  ): Promise<Suggestion[]> {
    const context = await aiContextBuilder.buildDealContext(userId, dealId);
    const suggestions: Suggestion[] = [];

    // Convert insights to suggestions
    context.insights.forEach((insight, idx) => {
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let category: Suggestion['category'] = 'insight';

      if (insight.includes('past expected close')) {
        priority = 'high';
        category = 'warning';
      } else if (insight.includes('High probability')) {
        priority = 'high';
        category = 'deal';
      }

      suggestions.push({
        id: `insight-${idx}`,
        title: insight,
        description: this.expandInsightToDescription(insight),
        priority,
        category,
        actionable: false,
      });
    });

    const deal = context.entity;

    // Suggest creating tasks if none exist
    if (deal.tasks?.length === 0) {
      suggestions.push({
        id: 'suggest-tasks',
        title: 'Create Action Items',
        description:
          'This deal has no tasks. Create action items to track progress and ensure nothing falls through the cracks.',
        priority: 'high',
        category: 'task',
        actionable: true,
        action: {
          type: 'create_task',
          data: {
            dealId,
            title: `Action item for ${deal.title}`,
          },
        },
      });
    }

    // Suggest next steps based on stage
    if (deal.stage?.probability < 50) {
      suggestions.push({
        id: 'suggest-move-stage',
        title: 'Advance Deal Stage',
        description:
          'Consider what actions are needed to move this deal forward in the pipeline.',
        priority: 'medium',
        category: 'deal',
        actionable: false,
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate suggestions for a task
   */
  async generateTaskSuggestions(
    userId: string,
    taskId: string
  ): Promise<Suggestion[]> {
    const context = await aiContextBuilder.buildTaskContext(userId, taskId);
    const suggestions: Suggestion[] = [];

    // Convert insights to suggestions
    context.insights.forEach((insight, idx) => {
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let category: Suggestion['category'] = 'insight';

      if (insight.includes('overdue')) {
        priority = 'high';
        category = 'warning';
      } else if (insight.includes('due today')) {
        priority = 'high';
        category = 'task';
      } else if (insight.includes('blocked')) {
        priority = 'high';
        category = 'warning';
      }

      suggestions.push({
        id: `insight-${idx}`,
        title: insight,
        description: this.expandInsightToDescription(insight),
        priority,
        category,
        actionable: false,
      });
    });

    const task = context.entity;

    // Suggest breaking down large tasks
    if (!task.subtasks?.length && task.estimatedHours && task.estimatedHours > 8) {
      suggestions.push({
        id: 'suggest-subtasks',
        title: 'Break Down Task',
        description:
          'This is a large task. Consider breaking it down into smaller, manageable subtasks.',
        priority: 'medium',
        category: 'task',
        actionable: true,
      });
    }

    // Suggest assigning task if unassigned
    if (!task.assignedToId) {
      suggestions.push({
        id: 'suggest-assign',
        title: 'Assign Task',
        description: 'This task is not assigned to anyone. Assign it to ensure accountability.',
        priority: 'medium',
        category: 'task',
        actionable: true,
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate dashboard-level suggestions across all entities
   */
  async generateDashboardSuggestions(userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // This would query for high-priority items across the system
    // For now, return placeholder suggestions
    suggestions.push({
      id: 'dashboard-overview',
      title: 'Review Today\'s Tasks',
      description: 'You have tasks due today. Review and prioritize them.',
      priority: 'high',
      category: 'task',
      actionable: true,
    });

    return suggestions;
  }

  /**
   * Helper methods
   */
  private expandInsightToDescription(insight: string): string {
    // Simple expansion for now - in production, this could use AI
    return insight;
  }

  private isActionableInsight(insight: string): boolean {
    const actionKeywords = [
      'consider',
      'schedule',
      'create',
      'update',
      'follow up',
      'reach out',
    ];
    return actionKeywords.some((keyword) =>
      insight.toLowerCase().includes(keyword)
    );
  }
}

export const aiSuggestionEngine = new AISuggestionEngine();
