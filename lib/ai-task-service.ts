
/**
 * AI Task Service
 * Provides intelligent task suggestions and automation
 */

import { prisma } from '@/lib/db';

interface TaskSuggestion {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
  confidence: number; // 0-100
  reasoning: string;
}

interface SuggestionContext {
  userId: string;
  leadId?: string;
  dealId?: string;
  contactId?: string;
  eventType?: 'lead_created' | 'deal_stage_changed' | 'email_received' | 'appointment_scheduled' | 'payment_received';
  eventData?: any;
}

export class AITaskService {
  /**
   * Generate task suggestions based on context
   */
  async generateTaskSuggestions(context: SuggestionContext): Promise<TaskSuggestion[]> {
    const suggestions: TaskSuggestion[] = [];

    // Lead-based suggestions
    if (context.leadId) {
      const leadSuggestions = await this.getLeadBasedSuggestions(context.leadId, context.userId);
      suggestions.push(...leadSuggestions);
    }

    // Deal-based suggestions
    if (context.dealId) {
      const dealSuggestions = await this.getDealBasedSuggestions(context.dealId, context.userId);
      suggestions.push(...dealSuggestions);
    }

    // Event-based suggestions
    if (context.eventType) {
      const eventSuggestions = await this.getEventBasedSuggestions(context);
      suggestions.push(...eventSuggestions);
    }

    // Sort by confidence and priority
    return suggestions.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  /**
   * Get suggestions for a new lead
   */
  private async getLeadBasedSuggestions(leadId: string, userId: string): Promise<TaskSuggestion[]> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!lead) return [];

    const suggestions: TaskSuggestion[] = [];
    const now = new Date();

    // Check if lead is new (created in last 24 hours)
    const isNewLead = (now.getTime() - new Date(lead.createdAt).getTime()) < (24 * 60 * 60 * 1000);

    if (isNewLead) {
      // Initial contact task
      suggestions.push({
        title: `Initial contact with ${lead.businessName}`,
        description: `Reach out to ${lead.contactPerson || 'contact person'} at ${lead.businessName} to introduce services and understand their needs.\n\nContact: ${lead.email}${lead.phone ? `\nPhone: ${lead.phone}` : ''}`,
        priority: 'HIGH',
        category: 'SALES',
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        estimatedHours: 0.5,
        tags: ['outreach', 'initial-contact'],
        confidence: 95,
        reasoning: 'New lead created - immediate outreach recommended',
      });

      // Research task
      suggestions.push({
        title: `Research ${lead.businessName} company background`,
        description: `Gather information about ${lead.businessName} to personalize approach:\n- Company size and industry\n- Key decision makers\n- Current solutions/competitors\n- Pain points and challenges`,
        priority: 'MEDIUM',
        category: 'SALES',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days
        estimatedHours: 1,
        tags: ['research', 'preparation'],
        confidence: 85,
        reasoning: 'Research helps personalize sales approach',
      });
    }

    // Follow-up based on last interaction
    const lastNote = lead.notes[0];
    const daysSinceLastNote = lastNote 
      ? Math.floor((now.getTime() - new Date(lastNote.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    if (daysSinceLastNote > 7) {
      suggestions.push({
        title: `Follow up with ${lead.businessName}`,
        description: `It's been ${daysSinceLastNote} days since last contact. Schedule follow-up to:\n- Check in on their needs\n- Share updates or new information\n- Move conversation forward`,
        priority: daysSinceLastNote > 14 ? 'HIGH' : 'MEDIUM',
        category: 'SALES',
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        estimatedHours: 0.5,
        tags: ['follow-up', 'nurture'],
        confidence: 80,
        reasoning: `${daysSinceLastNote} days since last contact - follow-up needed`,
      });
    }

    // Qualification task for new leads
    suggestions.push({
      title: `Qualify lead: ${lead.businessName}`,
      description: `Assess lead quality and fit:\n- Budget availability\n- Timeline for decision\n- Authority level of contact\n- Need urgency\n- Fit with our services`,
      priority: 'MEDIUM',
      category: 'SALES',
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      estimatedHours: 0.5,
      tags: ['qualification', 'discovery'],
      confidence: 75,
      reasoning: 'Lead qualification needed for prioritization',
    });

    return suggestions;
  }

  /**
   * Get suggestions for a deal
   */
  private async getDealBasedSuggestions(dealId: string, userId: string): Promise<TaskSuggestion[]> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        stage: true,
        lead: true,
      },
    });

    if (!deal) return [];

    const suggestions: TaskSuggestion[] = [];
    const now = new Date();

    // Stage-specific suggestions
    const stageName = deal.stage?.name?.toLowerCase() || '';

    if (stageName.includes('proposal') || stageName.includes('quote')) {
      suggestions.push({
        title: `Prepare proposal for ${deal.title}`,
        description: `Create detailed proposal including:\n- Service scope and deliverables\n- Pricing and payment terms\n- Timeline and milestones\n- Terms and conditions\n\nDeal Value: $${deal.value}`,
        priority: 'HIGH',
        category: 'SALES',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        estimatedHours: 3,
        tags: ['proposal', 'documentation'],
        confidence: 90,
        reasoning: 'Deal in proposal stage - document preparation critical',
      });

      suggestions.push({
        title: `Schedule proposal review with ${deal.lead?.businessName || 'client'}`,
        description: `Book meeting to present and discuss proposal for ${deal.title}. Prepare to:\n- Walk through proposal details\n- Address questions and concerns\n- Discuss next steps`,
        priority: 'HIGH',
        category: 'SALES',
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        estimatedHours: 1,
        tags: ['meeting', 'presentation'],
        confidence: 85,
        reasoning: 'Proposal review meeting accelerates deal progression',
      });
    }

    if (stageName.includes('negotiation')) {
      suggestions.push({
        title: `Negotiate terms for ${deal.title}`,
        description: `Address negotiation points:\n- Pricing adjustments\n- Service scope modifications\n- Timeline flexibility\n- Payment terms\n\nTarget close: Within 1 week`,
        priority: 'URGENT',
        category: 'SALES',
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        estimatedHours: 2,
        tags: ['negotiation', 'closing'],
        confidence: 95,
        reasoning: 'Deal in negotiation - prompt action required',
      });
    }

    if (stageName.includes('closing') || stageName.includes('contract')) {
      suggestions.push({
        title: `Finalize contract for ${deal.title}`,
        description: `Complete contract finalization:\n- Review all terms\n- Obtain necessary signatures\n- Set up payment processing\n- Schedule kickoff meeting\n\nDeal Value: $${deal.value}`,
        priority: 'URGENT',
        category: 'SALES',
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        estimatedHours: 2,
        tags: ['contract', 'closing'],
        confidence: 98,
        reasoning: 'Deal ready to close - immediate action needed',
      });

      suggestions.push({
        title: `Prepare onboarding for ${deal.lead?.businessName || 'client'}`,
        description: `Set up client onboarding process:\n- Welcome email and materials\n- Account setup\n- Project kickoff scheduling\n- Team introductions`,
        priority: 'HIGH',
        category: 'ADMIN',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        estimatedHours: 1.5,
        tags: ['onboarding', 'setup'],
        confidence: 85,
        reasoning: 'Smooth onboarding ensures client success',
      });
    }

    // Close date approaching
    if (deal.expectedCloseDate) {
      const daysUntilClose = Math.floor(
        (new Date(deal.expectedCloseDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysUntilClose > 0 && daysUntilClose <= 7) {
        suggestions.push({
          title: `Accelerate ${deal.title} - ${daysUntilClose} days until expected close`,
          description: `Deal approaching expected close date. Priority actions:\n- Remove any blockers\n- Address outstanding questions\n- Confirm decision timeline\n- Prepare closing documents`,
          priority: daysUntilClose <= 3 ? 'URGENT' : 'HIGH',
          category: 'SALES',
          dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          estimatedHours: 1,
          tags: ['urgent', 'closing'],
          confidence: 90,
          reasoning: `Expected close date in ${daysUntilClose} days`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Get suggestions based on events
   */
  private async getEventBasedSuggestions(context: SuggestionContext): Promise<TaskSuggestion[]> {
    const suggestions: TaskSuggestion[] = [];
    const now = new Date();

    switch (context.eventType) {
      case 'email_received':
        suggestions.push({
          title: 'Respond to incoming email',
          description: context.eventData?.subject 
            ? `Reply to email: "${context.eventData.subject}"`
            : 'Respond to new email inquiry',
          priority: 'MEDIUM',
          category: 'SUPPORT',
          dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          estimatedHours: 0.5,
          tags: ['email', 'response'],
          confidence: 80,
          reasoning: 'Timely email responses improve customer satisfaction',
        });
        break;

      case 'appointment_scheduled':
        if (context.eventData?.appointmentDate) {
          const appointmentDate = new Date(context.eventData.appointmentDate);
          const prepTime = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before

          suggestions.push({
            title: 'Prepare for upcoming appointment',
            description: `Appointment preparation:\n- Review client background\n- Prepare agenda and materials\n- Test meeting technology\n- Send reminder to attendees`,
            priority: 'HIGH',
            category: 'SALES',
            dueDate: prepTime,
            estimatedHours: 1,
            tags: ['meeting', 'preparation'],
            confidence: 90,
            reasoning: 'Preparation ensures productive meetings',
          });

          // Follow-up task after appointment
          const followUpTime = new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000);
          suggestions.push({
            title: 'Follow up after appointment',
            description: 'Send follow-up email:\n- Thank attendees\n- Recap key points\n- Share action items\n- Schedule next steps',
            priority: 'HIGH',
            category: 'SALES',
            dueDate: followUpTime,
            estimatedHours: 0.5,
            tags: ['follow-up', 'communication'],
            confidence: 85,
            reasoning: 'Prompt follow-up maintains momentum',
          });
        }
        break;

      case 'payment_received':
        suggestions.push({
          title: 'Send payment confirmation and receipt',
          description: `Payment received - complete:\n- Generate invoice/receipt\n- Send confirmation email\n- Update accounting records\n- Thank customer`,
          priority: 'MEDIUM',
          category: 'ADMIN',
          dueDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours
          estimatedHours: 0.25,
          tags: ['payment', 'admin'],
          confidence: 95,
          reasoning: 'Immediate payment acknowledgment builds trust',
        });
        break;
    }

    return suggestions;
  }

  /**
   * Suggest optimal assignee for a task
   */
  async suggestAssignee(taskData: { title: string; category?: string; leadId?: string; dealId?: string }, userId: string): Promise<{
    suggestedUserId: string;
    confidence: number;
    reasoning: string;
  } | null> {
    try {
      // Get team members
      const teamMembers = await prisma.teamMember.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (teamMembers.length === 0) {
        // No team members, suggest owner
        return {
          suggestedUserId: userId,
          confidence: 100,
          reasoning: 'You are the only team member',
        };
      }

      // Get workload for each team member
      const workloads = await Promise.all(
        teamMembers.map(async (member) => {
          const openTasks = await prisma.task.count({
            where: {
              assignedToId: member.user.id,
              status: { in: ['TODO', 'IN_PROGRESS'] },
            },
          });

          return {
            userId: member.user.id,
            name: member.user.name || member.user.email,
            openTasks,
          };
        })
      );

      // Find member with least open tasks
      const leastBusy = workloads.reduce((min, curr) => 
        curr.openTasks < min.openTasks ? curr : min
      );

      return {
        suggestedUserId: leastBusy.userId,
        confidence: 75,
        reasoning: `${leastBusy.name} has the least open tasks (${leastBusy.openTasks})`,
      };
    } catch (error) {
      console.error('Error suggesting assignee:', error);
      return null;
    }
  }

  /**
   * Suggest due date based on priority and task type
   */
  suggestDueDate(priority: string, category?: string): Date {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Set time to 5 PM (17:00) for all due dates
    const setTo5PM = (date: Date) => {
      date.setHours(17, 0, 0, 0);
      return date;
    };

    switch (priority) {
      case 'URGENT':
        // Due today at 5 PM if before 5 PM, otherwise tomorrow at 5 PM
        if (hours < 17) {
          return setTo5PM(new Date());
        } else {
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          return setTo5PM(tomorrow);
        }
      
      case 'HIGH':
        // Due tomorrow at 5 PM
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return setTo5PM(tomorrow);
      
      case 'MEDIUM':
        // Due in 3 days at 5 PM
        const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return setTo5PM(threeDays);
      
      case 'LOW':
        // Due in 7 days at 5 PM
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return setTo5PM(sevenDays);
      
      default:
        // Default: 3 days at 5 PM
        const defaultDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return setTo5PM(defaultDate);
    }
  }

  /**
   * Auto-categorize task based on title and description
   */
  autoCategorize(title: string, description?: string): {
    category: string;
    confidence: number;
    tags: string[];
  } {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // Sales keywords
    const salesKeywords = ['proposal', 'quote', 'demo', 'call', 'meeting', 'client', 'customer', 'lead', 'deal', 'close', 'follow-up', 'pitch', 'negotiate'];
    const salesMatches = salesKeywords.filter(kw => text.includes(kw)).length;

    // Support keywords
    const supportKeywords = ['issue', 'bug', 'fix', 'help', 'support', 'ticket', 'problem', 'resolve', 'troubleshoot', 'assist'];
    const supportMatches = supportKeywords.filter(kw => text.includes(kw)).length;

    // Marketing keywords
    const marketingKeywords = ['campaign', 'content', 'social', 'email', 'newsletter', 'blog', 'seo', 'ads', 'marketing', 'promotion'];
    const marketingMatches = marketingKeywords.filter(kw => text.includes(kw)).length;

    // Admin keywords
    const adminKeywords = ['invoice', 'payment', 'contract', 'document', 'file', 'setup', 'configure', 'admin', 'onboarding', 'billing'];
    const adminMatches = adminKeywords.filter(kw => text.includes(kw)).length;

    // Development keywords
    const devKeywords = ['code', 'develop', 'build', 'implement', 'api', 'feature', 'bug', 'deploy', 'test', 'integration'];
    const devMatches = devKeywords.filter(kw => text.includes(kw)).length;

    // Find category with most matches
    const scores = {
      SALES: salesMatches,
      SUPPORT: supportMatches,
      MARKETING: marketingMatches,
      ADMIN: adminMatches,
      DEVELOPMENT: devMatches,
    };

    const maxScore = Math.max(...Object.values(scores));
    const category = maxScore > 0 
      ? Object.keys(scores).find(k => scores[k as keyof typeof scores] === maxScore) || ''
      : '';

    // Generate tags
    const tags: string[] = [];
    if (salesMatches > 0) tags.push('sales');
    if (supportMatches > 0) tags.push('support');
    if (marketingMatches > 0) tags.push('marketing');
    if (text.includes('urgent') || text.includes('asap')) tags.push('urgent');
    if (text.includes('follow') && text.includes('up')) tags.push('follow-up');
    if (text.includes('meeting') || text.includes('call')) tags.push('communication');

    return {
      category,
      confidence: maxScore > 0 ? Math.min(60 + (maxScore * 10), 95) : 0,
      tags: tags.slice(0, 5), // Limit to 5 tags
    };
  }

  /**
   * Analyze task patterns and generate insights
   */
  async analyzeTaskPatterns(userId: string): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ userId }, { assignedToId: userId }],
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        assignedTo: true,
        lead: true,
        deal: true,
      },
    });

    // Pattern 1: Peak productivity times
    const tasksByHour: Record<number, number> = {};
    tasks.forEach((task) => {
      const hour = task.createdAt.getHours();
      tasksByHour[hour] = (tasksByHour[hour] || 0) + 1;
    });

    const peakHours = Object.entries(tasksByHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Pattern 2: Success rate by priority
    const prioritySuccess: Record<string, { total: number; completed: number }> = {};
    tasks.forEach((task) => {
      const priority = task.priority;
      if (!prioritySuccess[priority]) {
        prioritySuccess[priority] = { total: 0, completed: 0 };
      }
      prioritySuccess[priority].total++;
      if (task.status === 'COMPLETED') {
        prioritySuccess[priority].completed++;
      }
    });

    // Pattern 3: Category trends
    const categoryTrends: Record<string, number> = {};
    tasks.forEach((task) => {
      if (task.category) {
        categoryTrends[task.category] = (categoryTrends[task.category] || 0) + 1;
      }
    });

    // Pattern 4: Predict bottlenecks
    const bottlenecks = [];
    const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');
    if (blockedTasks.length > 3) {
      bottlenecks.push({
        type: 'blocked_tasks',
        count: blockedTasks.length,
        message: `High number of blocked tasks detected. Review dependencies.`,
        confidence: 85,
      });
    }

    // Pattern 5: Team workload imbalance
    const teamWorkload: Record<string, number> = {};
    tasks.forEach((task) => {
      if (task.assignedToId) {
        teamWorkload[task.assignedToId] = (teamWorkload[task.assignedToId] || 0) + 1;
      }
    });

    const workloadValues = Object.values(teamWorkload);
    if (workloadValues.length > 1) {
      const maxWorkload = Math.max(...workloadValues);
      const minWorkload = Math.min(...workloadValues);
      if (maxWorkload / minWorkload > 2) {
        bottlenecks.push({
          type: 'workload_imbalance',
          message: `Workload is unevenly distributed across team members.`,
          confidence: 75,
        });
      }
    }

    return {
      peakProductivityHours: peakHours,
      prioritySuccessRates: Object.entries(prioritySuccess).map(([priority, data]) => ({
        priority,
        total: data.total,
        completed: data.completed,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      })),
      categoryTrends: Object.entries(categoryTrends)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
      bottlenecks,
      insights: [
        ...bottlenecks,
        {
          type: 'productivity_tip',
          message: `You're most productive at ${peakHours.map(h => `${h}:00`).join(', ')}. Schedule important tasks during these hours.`,
          confidence: 90,
        },
      ],
    };
  }
}

export const aiTaskService = new AITaskService();
