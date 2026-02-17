/**
 * Default Speed to Lead workflow for Auto-Run
 * Creates a minimal workflow when user enables Auto-Run for RE_SPEED_TO_LEAD
 */

import { prisma } from '@/lib/db';
import { REAIEmployeeType, RETaskType, REWorkflowType } from '@prisma/client';

const SPEED_TO_LEAD_TASK = {
  name: 'Contact New Lead',
  description: 'Instant AI voice call and SMS to capture lead within 60 seconds',
  taskType: 'QUALIFICATION' as RETaskType,
  assignedAgentType: 'RE_SPEED_TO_LEAD' as REAIEmployeeType,
  delayValue: 0,
  delayUnit: 'MINUTES',
  isHITL: false,
  isOptional: false,
  position: { angle: 0, radius: 1 },
  displayOrder: 1,
  branchCondition: undefined,
  actionConfig: {
    actions: ['voice_call', 'sms'],
    script: 'qualification_buyer',
    fields: ['budget', 'areas', 'beds', 'baths', 'timeline', 'preapproved', 'needs_to_sell', 'must_haves', 'nice_to_haves'],
  },
};

/**
 * Create default Speed to Lead workflow for a user
 */
export async function createDefaultSpeedToLeadWorkflow(
  userId: string
): Promise<{ id: string; name: string }> {
  const workflow = await prisma.rEWorkflowTemplate.create({
    data: {
      userId,
      name: 'Speed to Lead',
      type: REWorkflowType.BUYER,
      description: 'Instant response to new leads - AI voice call and SMS within 60 seconds. Customize this workflow to add more steps.',
      isDefault: false,
      isActive: true,
      tasks: {
        create: [
          {
            name: SPEED_TO_LEAD_TASK.name,
            description: SPEED_TO_LEAD_TASK.description,
            taskType: SPEED_TO_LEAD_TASK.taskType,
            assignedAgentType: SPEED_TO_LEAD_TASK.assignedAgentType,
            delayValue: SPEED_TO_LEAD_TASK.delayValue,
            delayUnit: SPEED_TO_LEAD_TASK.delayUnit,
            isHITL: SPEED_TO_LEAD_TASK.isHITL,
            isOptional: SPEED_TO_LEAD_TASK.isOptional,
            position: SPEED_TO_LEAD_TASK.position as object,
            displayOrder: SPEED_TO_LEAD_TASK.displayOrder,
            branchCondition: undefined,
            actionConfig: SPEED_TO_LEAD_TASK.actionConfig as object,
          },
        ],
      },
    },
    include: {
      tasks: { orderBy: { displayOrder: 'asc' } },
    },
  });

  return { id: workflow.id, name: workflow.name };
}

/**
 * Check if user has any workflow with RE_SPEED_TO_LEAD assigned
 */
export async function hasSpeedToLeadWorkflow(userId: string): Promise<boolean> {
  const count = await prisma.rEWorkflowTask.count({
    where: {
      template: {
        userId,
        isActive: true,
      },
      assignedAgentType: 'RE_SPEED_TO_LEAD',
    },
  });
  return count > 0;
}
