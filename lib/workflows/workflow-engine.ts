/**
 * Generic Multi-Industry Workflow Execution Engine
 * Handles workflow instance creation, task scheduling, and execution
 */

import { prisma } from '@/lib/db';
import { TaskExecutionStatus, WorkflowInstanceStatus } from '@prisma/client';
import { executeTask } from './workflow-task-executor';
import { createHITLNotification } from './hitl-notification-service';

interface WorkflowTrigger {
  leadId?: string;
  dealId?: string;
  contactId?: string;
  triggerType: 'NEW_LEAD' | 'DEAL_STAGE_CHANGE' | 'MANUAL' | 'SCHEDULED';
  metadata?: Record<string, any>;
}

/**
 * Start a workflow instance for a lead/deal
 */
export async function startWorkflowInstance(
  userId: string,
  templateId: string,
  trigger: WorkflowTrigger
): Promise<string> {
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
    include: { tasks: { orderBy: { displayOrder: 'asc' } } },
  });

  if (!template) {
    throw new Error('Workflow template not found');
  }

  // Create workflow instance
  const instance = await prisma.workflowInstance.create({
    data: {
      templateId,
      userId,
      industry: template.industry,
      leadId: trigger.leadId,
      dealId: trigger.dealId,
      status: WorkflowInstanceStatus.ACTIVE,
      metadata: trigger.metadata || {},
    },
  });

  // Create task executions for all tasks
  const executions = await Promise.all(
    template.tasks.map((task, index) =>
      prisma.taskExecution.create({
        data: {
          instanceId: instance.id,
          taskId: task.id,
          status: index === 0 ? TaskExecutionStatus.PENDING : TaskExecutionStatus.PENDING,
          scheduledFor: index === 0 
            ? new Date() 
            : calculateScheduledTime(task.delayValue, task.delayUnit),
        },
      })
    )
  );

  // Start executing the first task
  if (executions[0]) {
    await processTaskExecution(executions[0].id);
  }

  return instance.id;
}

/**
 * Process a task execution
 */
export async function processTaskExecution(executionId: string): Promise<void> {
  const execution = await prisma.taskExecution.findUnique({
    where: { id: executionId },
    include: {
      task: {
        include: { template: true },
      },
      instance: {
        include: {
          lead: true,
          deal: true,
        },
      },
    },
  });

  if (!execution) {
    throw new Error('Task execution not found');
  }

  // Check if task is scheduled for future
  if (execution.scheduledFor && execution.scheduledFor > new Date()) {
    return; // Not time yet
  }

  // Check if task has a parent (branching)
  if (execution.task.parentTaskId) {
    const parentExecution = await prisma.taskExecution.findFirst({
      where: {
        instanceId: execution.instanceId,
        taskId: execution.task.parentTaskId,
      },
    });

    if (!parentExecution || parentExecution.status !== TaskExecutionStatus.COMPLETED) {
      // Parent not completed yet, skip
      return;
    }

    // Check branch condition
    if (execution.task.branchCondition) {
      const branchCondition = execution.task.branchCondition as { field: string; operator: string; value: string } | null;
      if (!branchCondition || !branchCondition.field || !branchCondition.operator || !branchCondition.value) {
        // Invalid branch condition, skip
        await prisma.taskExecution.update({
          where: { id: executionId },
          data: { status: TaskExecutionStatus.SKIPPED },
        });
        await processNextTask(execution.instanceId);
        return;
      }
      const resultData = (parentExecution.result as Record<string, any>) || {};
      const conditionMet = evaluateBranchCondition(
        branchCondition,
        resultData
      );

      if (!conditionMet) {
        // Condition not met, skip this task
        await prisma.taskExecution.update({
          where: { id: executionId },
          data: { status: TaskExecutionStatus.SKIPPED },
        });
        await processNextTask(execution.instanceId);
        return;
      }
    }
  }

  // Update status to IN_PROGRESS
  await prisma.taskExecution.update({
    where: { id: executionId },
    data: {
      status: TaskExecutionStatus.IN_PROGRESS,
      startedAt: new Date(),
    },
  });

  // Check if HITL gate
  if (execution.task.isHITL) {
    await prisma.taskExecution.update({
      where: { id: executionId },
      data: { status: TaskExecutionStatus.AWAITING_HITL },
    });

    // Get contact name based on industry
    const contactName = execution.instance.lead?.contactPerson 
      || execution.instance.deal?.title 
      || 'Unknown';

    // Create HITL notification
    await createHITLNotification({
      userId: execution.instance.userId,
      executionId: executionId,
      taskName: execution.task.name,
      contactName,
      industry: execution.instance.industry,
      message: `Task "${execution.task.name}" requires your approval to proceed.`,
      urgency: 'HIGH',
    });

    return; // Wait for human approval
  }

  // Execute the task
  try {
    const result = await executeTask(execution.task, execution.instance);

    await prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: TaskExecutionStatus.COMPLETED,
        completedAt: new Date(),
        result: result as any,
      },
    });

    // Process next task
    await processNextTask(execution.instanceId);
  } catch (error: any) {
    await prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: TaskExecutionStatus.FAILED,
        errorMessage: error.message,
      },
    });
  }
}

/**
 * Process the next task in the workflow
 */
async function processNextTask(instanceId: string): Promise<void> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: {
        include: { tasks: { orderBy: { displayOrder: 'asc' } } },
      },
      executions: true,
    },
  });

  if (!instance) return;

  // Find next pending task
  const completedTaskIds = new Set(
    instance.executions
      .filter(e => e.status === TaskExecutionStatus.COMPLETED)
      .map(e => e.taskId)
  );

  const nextTask = instance.template.tasks.find(
    task => !completedTaskIds.has(task.id) && 
    (!task.parentTaskId || completedTaskIds.has(task.parentTaskId))
  );

  if (!nextTask) {
    // All tasks completed
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowInstanceStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    return;
  }

  // Find or create execution for next task
  let nextExecution = instance.executions.find(e => e.taskId === nextTask.id);

  if (!nextExecution) {
    nextExecution = await prisma.taskExecution.create({
      data: {
        instanceId,
        taskId: nextTask.id,
        status: TaskExecutionStatus.PENDING,
        scheduledFor: calculateScheduledTime(nextTask.delayValue, nextTask.delayUnit),
      },
    });
  }

  // Process if scheduled time has passed
  if (!nextExecution.scheduledFor || nextExecution.scheduledFor <= new Date()) {
    await processTaskExecution(nextExecution.id);
  }
}

/**
 * Approve HITL gate
 */
export async function approveHITLGate(
  executionId: string,
  userId: string,
  notes?: string
): Promise<void> {
  const execution = await prisma.taskExecution.findUnique({
    where: { id: executionId },
    include: { task: true, instance: true },
  });

  if (!execution || execution.status !== TaskExecutionStatus.AWAITING_HITL) {
    throw new Error('Invalid HITL gate or already processed');
  }

  // Update execution
  await prisma.taskExecution.update({
    where: { id: executionId },
    data: {
      status: TaskExecutionStatus.APPROVED,
      hitlApprovedBy: userId,
      hitlApprovedAt: new Date(),
      hitlNotes: notes,
    },
  });

  // Mark HITL notification as actioned
  await prisma.hITLNotification.updateMany({
    where: { executionId },
    data: { isActioned: true },
  });

  // Execute the task
  try {
    const result = await executeTask(execution.task, execution.instance);

    await prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: TaskExecutionStatus.COMPLETED,
        completedAt: new Date(),
        result: result as any,
      },
    });

    // Process next task
    await processNextTask(execution.instanceId);
  } catch (error: any) {
    await prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: TaskExecutionStatus.FAILED,
        errorMessage: error.message,
      },
    });
  }
}

/**
 * Reject HITL gate
 */
export async function rejectHITLGate(
  executionId: string,
  userId: string,
  notes?: string
): Promise<void> {
  const execution = await prisma.taskExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution || execution.status !== TaskExecutionStatus.AWAITING_HITL) {
    throw new Error('Invalid HITL gate or already processed');
  }

  await prisma.taskExecution.update({
    where: { id: executionId },
    data: {
      status: TaskExecutionStatus.REJECTED,
      hitlApprovedBy: userId,
      hitlApprovedAt: new Date(),
      hitlNotes: notes,
    },
  });

  // Mark HITL notification as actioned
  await prisma.hITLNotification.updateMany({
    where: { executionId },
    data: { isActioned: true },
  });
}

/**
 * Calculate scheduled time based on delay
 */
function calculateScheduledTime(delayValue: number, delayUnit: string): Date {
  const now = new Date();
  const delayMs = delayValue * (
    delayUnit === 'HOURS' ? 60 * 60 * 1000 :
    delayUnit === 'DAYS' ? 24 * 60 * 60 * 1000 :
    60 * 1000 // MINUTES
  );
  return new Date(now.getTime() + delayMs);
}

/**
 * Evaluate branch condition
 */
function evaluateBranchCondition(
  condition: { field: string; operator: string; value: string },
  data: Record<string, any>
): boolean {
  const fieldValue = data[condition.field];
  const expectedValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(fieldValue) === String(expectedValue);
    case 'not_equals':
      return String(fieldValue) !== String(expectedValue);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue);
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue);
    case 'is_empty':
      return !fieldValue || String(fieldValue).trim() === '';
    case 'is_not_empty':
      return !!fieldValue && String(fieldValue).trim() !== '';
    default:
      return false;
  }
}
