/**
 * Automated Task Creation System
 * 
 * Creates tasks automatically based on lead activity and triggers
 * Ensures no lead falls through the cracks with perfect follow-up timing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TaskTrigger {
  type: 'manual_followup' | 'send_proposal' | 're_engagement' | 'meeting_prep' | 'competitor_alert' | 'objection_response';
  leadId: string;
  userId: string;
  assignedToId?: string;
  dueDate?: Date;
  metadata?: any;
}

/**
 * Create task based on trigger
 */
export async function createTaskFromTrigger(trigger: TaskTrigger) {
  const taskConfig = getTaskConfig(trigger.type);
  
  // Get lead data for context
  const lead = await prisma.lead.findUnique({
    where: { id: trigger.leadId },
    select: {
      businessName: true,
      contactPerson: true,
      leadScore: true,
      enrichedData: true
    }
  });
  
  if (!lead) {
    throw new Error(`Lead not found: ${trigger.leadId}`);
  }
  
  // Determine assignee (default to lowest workload)
  let assignedToId = trigger.assignedToId;
  if (!assignedToId) {
    assignedToId = await findBestAssignee(trigger.userId);
  }
  
  // Calculate due date
  const dueDate = trigger.dueDate || calculateDueDate(trigger.type);
  
  // Create task
  const task = await prisma.task.create({
    data: {
      title: taskConfig.title.replace('{leadName}', lead.businessName),
      description: taskConfig.description.replace('{leadName}', lead.businessName),
      priority: determinePriority(lead.leadScore) as any,
      status: 'TODO',
      dueDate,
      userId: trigger.userId,
      assignedToId,
      leadId: trigger.leadId,
      autoCreated: true,
      automationRule: 'lead_generation',
      aiContext: {
        ...trigger.metadata,
        automatedTrigger: trigger.type,
        createdAt: new Date().toISOString()
      }
    }
  });
  
  return task;
}

/**
 * Task configurations for different trigger types
 */
function getTaskConfig(type: TaskTrigger['type']) {
  const configs = {
    manual_followup: {
      title: 'Follow up with {leadName}',
      description: 'Lead has not responded to 2 emails. Time for a manual follow-up call.',
      taskType: 'CALL'
    },
    send_proposal: {
      title: 'Send proposal to {leadName}',
      description: 'Lead mentioned pricing in call. Prepare and send custom proposal.',
      taskType: 'EMAIL'
    },
    re_engagement: {
      title: 'Re-engage {leadName}',
      description: 'Lead has not been contacted in 30 days. Time to reach out again.',
      taskType: 'EMAIL'
    },
    meeting_prep: {
      title: 'Prepare for meeting with {leadName}',
      description: 'Research company, review recent news, prepare talking points.',
      taskType: 'MEETING'
    },
    competitor_alert: {
      title: 'Competitive response for {leadName}',
      description: 'Lead mentioned competitor. Prepare competitive positioning.',
      taskType: 'OTHER'
    },
    objection_response: {
      title: 'Address objection from {leadName}',
      description: 'Lead raised objection. Send appropriate objection-handling email.',
      taskType: 'EMAIL'
    }
  };
  
  return configs[type];
}

/**
 * Calculate due date based on trigger type
 */
function calculateDueDate(type: TaskTrigger['type']): Date {
  const now = new Date();
  
  const durations = {
    manual_followup: 24, // 1 day
    send_proposal: 4, // 4 hours
    re_engagement: 0, // Immediate
    meeting_prep: 24, // 1 day before meeting
    competitor_alert: 2, // 2 hours
    objection_response: 2 // 2 hours
  };
  
  const hours = durations[type] || 24;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Determine task priority based on lead score
 */
function determinePriority(leadScore?: number | null): string {
  if (!leadScore) return 'MEDIUM';
  
  if (leadScore >= 80) return 'HIGH';
  if (leadScore >= 60) return 'MEDIUM';
  return 'LOW';
}

/**
 * Find best assignee based on current workload
 */
async function findBestAssignee(userId: string): Promise<string | undefined> {
  try {
    // Get all team members with task counts
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        userId
      }
    });
    
    if (teamMembers.length === 0) {
      return undefined; // No team members, assign to user
    }
    
    // Get task counts for each team member
    const memberTaskCounts = await Promise.all(
      teamMembers.map(async (member) => {
        const taskCount = await prisma.task.count({
          where: {
            assignedToId: member.id,
            status: {
              in: ['TODO', 'IN_PROGRESS']
            }
          }
        });
        return { member, taskCount };
      })
    );
    
    // Find member with lowest task count
    const bestMember = memberTaskCounts.reduce((prev, current) => {
      return current.taskCount < prev.taskCount ? current : prev;
    });
    
    return bestMember.member.id;
  } catch (error) {
    console.error('Error finding best assignee:', error);
    return undefined;
  }
}

/**
 * Monitor leads and create tasks automatically
 */
export async function monitorLeadsForTasks(userId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Find leads that need re-engagement (not contacted in 30 days, score > 50)
  const reEngagementLeads = await prisma.lead.findMany({
    where: {
      userId,
      leadScore: { gte: 50 },
      lastContactedAt: { lt: thirtyDaysAgo },
      status: { not: 'CONVERTED' }
    },
    select: { id: true }
  });
  
  // Create re-engagement tasks
  for (const lead of reEngagementLeads) {
    try {
      // Check if task already exists
      const existingTask = await prisma.task.findFirst({
        where: {
          leadId: lead.id,
          autoCreated: true,
          status: { in: ['TODO', 'IN_PROGRESS'] }
        }
      });
      
      // Check aiContext manually
      const isReengagementTask = existingTask && 
        (existingTask.aiContext as any)?.automatedTrigger === 're_engagement';
      
      if (!existingTask || !isReengagementTask) {
        await createTaskFromTrigger({
          type: 're_engagement',
          leadId: lead.id,
          userId
        });
      }
    } catch (error) {
      console.error(`Error creating re-engagement task for lead ${lead.id}:`, error);
    }
  }
  
  // Find leads with no response to 2+ emails
  const noResponseLeads = await prisma.lead.findMany({
    where: {
      userId,
      leadScore: { gte: 60, lt: 80 },
      status: { not: 'CONVERTED' }
    },
    select: {
      id: true,
      engagementHistory: true
    }
  });
  
  for (const lead of noResponseLeads) {
    const engagement = lead.engagementHistory as any;
    const emailsSent = engagement?.emailsSent || 0;
    const emailReplies = engagement?.emailReplies || 0;
    
    if (emailsSent >= 2 && emailReplies === 0) {
      try {
        // Check if task already exists
        const existingTask = await prisma.task.findFirst({
          where: {
            leadId: lead.id,
            autoCreated: true,
            status: { in: ['TODO', 'IN_PROGRESS'] }
          }
        });
        
        // Check aiContext manually
        const isManualFollowupTask = existingTask && 
          (existingTask.aiContext as any)?.automatedTrigger === 'manual_followup';
        
        if (!existingTask || !isManualFollowupTask) {
          await createTaskFromTrigger({
            type: 'manual_followup',
            leadId: lead.id,
            userId
          });
        }
      } catch (error) {
        console.error(`Error creating manual followup task for lead ${lead.id}:`, error);
      }
    }
  }
  
  return {
    reEngagementTasks: reEngagementLeads.length,
    manualFollowupTasks: noResponseLeads.length
  };
}

/**
 * Create task based on call transcript analysis
 */
export async function createTaskFromCallTranscript(
  leadId: string,
  userId: string,
  transcript: string
) {
  const lowerTranscript = transcript.toLowerCase();
  
  // Check for pricing/proposal mentions
  if (lowerTranscript.includes('pricing') || lowerTranscript.includes('proposal') || lowerTranscript.includes('quote')) {
    await createTaskFromTrigger({
      type: 'send_proposal',
      leadId,
      userId,
      metadata: { transcriptTrigger: 'pricing_mentioned' }
    });
  }
  
  // Check for competitor mentions
  const competitors = ['competitor', 'alternative', 'other option', 'currently using'];
  if (competitors.some(comp => lowerTranscript.includes(comp))) {
    await createTaskFromTrigger({
      type: 'competitor_alert',
      leadId,
      userId,
      metadata: { transcriptTrigger: 'competitor_mentioned' }
    });
  }
  
  // Check for objections
  const objections = ['too expensive', 'not sure', 'need to think', 'talk to my team'];
  if (objections.some(obj => lowerTranscript.includes(obj))) {
    await createTaskFromTrigger({
      type: 'objection_response',
      leadId,
      userId,
      metadata: {
        transcriptTrigger: 'objection_raised',
        objection: objections.find(obj => lowerTranscript.includes(obj))
      }
    });
  }
}

/**
 * Get task automation stats
 */
export async function getTaskAutomationStats(userId: string) {
  const totalTasks = await prisma.task.count({
    where: {
      userId
    }
  });
  
  const completedTasks = await prisma.task.count({
    where: {
      userId,
      status: 'COMPLETED'
    }
  });
  
  const pendingTasks = await prisma.task.count({
    where: {
      userId,
      status: { in: ['TODO', 'IN_PROGRESS'] }
    }
  });
  
  return {
    total: totalTasks,
    completed: completedTasks,
    pending: pendingTasks,
    completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  };
}
